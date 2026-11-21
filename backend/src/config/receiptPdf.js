// Builds the payment receipt as a PDF (A4) with pdf-lib. Same information and look as the on-screen bill.
// Used for: the download, the email attachment and the link sent over WhatsApp.
const fs = require('fs'), path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { ROOT } = require('./upload');

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex('#1F3A33'), TEAL = hex('#6C7952'), DARK = hex('#566240'), MUTED = hex('#5d6f69'), LINE = hex('#dfe5dd'), MIST = hex('#F2F8F3'), RED = hex('#b42318'), GREEN = hex('#18794e'), WHITE = rgb(1, 1, 1);
const MODES = { cash: 'Cash', upi: 'UPI', card: 'Card', bank: 'Bank transfer', other: 'Other' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(d || '')); return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ''; };
const rupee = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; // the built-in PDF fonts have no rupee sign
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const three = (n) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : '', two(n % 100)].filter(Boolean).join(' ');
const inWords = (amount) => {
  const r = Math.floor(Number(amount) || 0), p = Math.round(((Number(amount) || 0) - r) * 100);
  const parts = [[Math.floor(r / 10000000), 'Crore'], [Math.floor(r / 100000) % 100, 'Lakh'], [Math.floor(r / 1000) % 100, 'Thousand'], [r % 1000, '']].filter(([n]) => n).map(([n, u]) => `${u ? two(n) : three(n)}${u ? ` ${u}` : ''}`);
  return `${parts.join(' ') || 'Zero'} Rupees${p ? ` and ${two(p)} Paise` : ''} Only`;
};
const ageOf = (p) => { if (p.dob) { const b = new Date(`${String(p.dob).slice(0, 10)}T00:00:00`), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a -= 1; return a >= 0 ? `${a}y` : ''; } return p.age != null ? `${p.age}y` : ''; };

// PNG or JPEG only (what a PDF can embed). Local uploads are read from disk, http(s) logos are fetched with a short timeout. Any failure -> no logo.
async function loadLogo(doc, url) {
  try {
    let buf;
    if (/^https?:\/\//i.test(url || '')) { const r = await fetch(url, { signal: AbortSignal.timeout(4000) }); if (!r.ok) return null; buf = Buffer.from(await r.arrayBuffer()); }
    else if (/^\/?uploads\//i.test(url || '')) buf = fs.readFileSync(path.join(ROOT, path.normalize(url.replace(/^\/?uploads\//i, '')).replace(/^(\.\.[/\\])+/, '')));
    if (!buf || buf.length > 3 * 1024 * 1024) return null;
    if (buf[0] === 0x89 && buf[1] === 0x50) return await doc.embedPng(buf);
    if (buf[0] === 0xff && buf[1] === 0xd8) return await doc.embedJpg(buf);
  } catch { /* fall back to the initial badge */ }
  return null;
}

exports.receiptPdf = async (y) => {
  const doc = await PDFDocument.create(), page = doc.addPage([595.28, 841.89]);
  const R = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const p = y.patient || {}, c = y.clinic || {}, it = y.item || {}, linked = it.charged != null;
  doc.setTitle(`Receipt ${y.receipt_no}`); doc.setAuthor(c.name || 'Regenerix'); doc.setSubject('Payment receipt');
  const W = 595.28, H = 841.89, M = 40, RIGHT = W - M;
  // Standard fonts only cover Latin text: swap the rupee sign and replace anything they cannot draw, so a name in another script never breaks the PDF.
  const safe = (v) => [...String(v ?? '').replace(/₹\s?/g, 'Rs. ').replace(/[\r\n\t]+/g, ' ')].map((ch) => { try { R.encodeText(ch); return ch; } catch { return '?'; } }).join('');
  const wrap = (v, font, size, max) => { const out = []; let line = ''; for (const w of safe(v).split(' ')) { const t = line ? `${line} ${w}` : w; if (line && font.widthOfTextAtSize(t, size) > max) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };
  // y is measured from the top of the page (baseline)
  const text = (v, x, top, { size = 9.5, font = R, color = INK, align = 'left' } = {}) => { const s = safe(v), w = font.widthOfTextAtSize(s, size); page.drawText(s, { x: align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y: H - top, size, font, color }); return w; };
  const rect = (x, top, w, h, o) => page.drawRectangle({ x, y: H - top - h, width: w, height: h, ...o });
  const rule = (x1, x2, top, color = LINE, thickness = 0.8) => page.drawLine({ start: { x: x1, y: H - top }, end: { x: x2, y: H - top }, color, thickness });

  // ---- header: logo + clinic name on the left, contact on the right
  const logo = await loadLogo(doc, c.logo); let nx = M;
  if (logo) { const s = Math.min(46 / logo.height, 150 / logo.width), w = logo.width * s, h = logo.height * s; page.drawImage(logo, { x: M, y: H - 40 - (46 + h) / 2, width: w, height: h }); nx = M + w + 12; }
  else { page.drawCircle({ x: M + 23, y: H - 63, size: 23, color: TEAL }); text((safe(c.name) || 'R')[0], M + 23, 71, { size: 22, font: B, color: WHITE, align: 'center' }); nx = M + 58; }
  const nameLines = wrap(c.name || 'Regenerix', B, 15, 300 - nx); nameLines.slice(0, 2).forEach((l, i) => text(l, nx, (nameLines.length > 1 ? 58 : 68) + i * 18, { size: 15, font: B }));
  let cy = 46; for (const l of wrap(c.address, R, 8.5, 230).slice(0, 3)) { text(l, RIGHT, cy, { size: 8.5, color: MUTED, align: 'right' }); cy += 11.5; }
  for (const [k, v] of [['Phone: ', c.phone], ['Email: ', c.email]]) if (v) { const w = R.widthOfTextAtSize(safe(v), 8.5); text(v, RIGHT, cy, { size: 8.5, color: MUTED, align: 'right' }); text(k, RIGHT - w, cy, { size: 8.5, font: B, align: 'right' }); cy += 11.5; }
  rule(M, RIGHT, 98, TEAL, 2.2);

  // ---- title band
  rect(M, 110, W - 2 * M, 38, { color: MIST }); rect(M, 110, 4, 38, { color: TEAL });
  text('PAYMENT RECEIPT', M + 16, 134, { size: 13, font: B, color: DARK });
  let w1 = text(y.receipt_no, RIGHT - 12, 126, { size: 10.5, font: B, align: 'right' }); text('Receipt no ', RIGHT - 12 - w1, 126, { size: 9, color: MUTED, align: 'right' });
  w1 = text(fmtDate(y.paid_on), RIGHT - 12, 140, { size: 10.5, font: B, align: 'right' }); text('Date ', RIGHT - 12 - w1, 140, { size: 9, color: MUTED, align: 'right' });

  // ---- two boxes
  const bw = (W - 2 * M - 12), lw = bw * 0.56, rw = bw - lw, rx = M + lw + 12, top = 160;
  const kv = (rows, x, startTop, valueW) => { let t = startTop; for (const [k, v] of rows.filter(([, v]) => v)) { text(k, x, t, { size: 9, color: MUTED }); for (const l of wrap(v, B, 9, valueW).slice(0, 3)) { text(l, x + 62, t, { size: 9, font: B }); t += 12.5; } } return t; };
  text('BILLED TO', M + 12, top + 17, { size: 7.5, font: B, color: TEAL }); text('PAYMENT DETAILS', rx + 12, top + 17, { size: 7.5, font: B, color: TEAL });
  const nw = text(p.name || '', M + 12, top + 34, { size: 12, font: B });
  const extra = [ageOf(p), p.gender && p.gender[0].toUpperCase() + p.gender.slice(1)].filter(Boolean).join(', '); if (extra) text(`(${extra})`, M + 12 + nw + 5, top + 34, { size: 9.5 });
  const lEnd = kv([['File no', p.file_no], ['Contact', p.phone], ['Address', [p.address, p.city].filter(Boolean).join(', ')]], M + 12, top + 50, lw - 86);
  const rEnd = kv([['Mode', MODES[y.mode] || y.mode], ['Paid on', fmtDate(y.paid_on)], ['Received by', y.received_by], ['Note', y.note]], rx + 12, top + 34, rw - 86);
  const bh = Math.max(lEnd, rEnd) - top + 2;
  page.drawRectangle({ x: M, y: H - top - bh, width: lw, height: bh, borderColor: LINE, borderWidth: 0.8 }); page.drawRectangle({ x: rx, y: H - top - bh, width: rw, height: bh, borderColor: LINE, borderWidth: 0.8 });

  // ---- item table
  let t = top + bh + 16;
  rect(M, t, W - 2 * M, 22, { color: INK });
  text('#', M + 14, t + 14.5, { size: 8.5, font: B, color: WHITE }); text('DESCRIPTION', M + 40, t + 14.5, { size: 8.5, font: B, color: WHITE }); text('AMOUNT', RIGHT - 12, t + 14.5, { size: 8.5, font: B, color: WHITE, align: 'right' });
  t += 22 + 17;
  text('1', M + 14, t, { size: 10 }); text(it.title || 'Payment', M + 40, t, { size: 10.5, font: B }); text(rupee(linked ? it.charged : y.amount), RIGHT - 12, t, { size: 10.5, align: 'right' });
  for (const l of (it.lines || []).flatMap((x) => wrap(x, R, 8.8, 330).slice(0, 3))) { t += 12.5; text(l, M + 40, t, { size: 8.8, color: MUTED }); }
  t += 11; rule(M, RIGHT, t);

  // ---- totals (right) and amount in words (left)
  const tx = RIGHT - 240; let ty = t + 18;
  const row = (k, v, o = {}) => { text(k, tx + 10, ty, { size: 9.5, font: o.bold ? B : R }); text(v, RIGHT - 12, ty, { size: 9.5, font: o.bold ? B : R, color: o.color || INK, align: 'right' }); ty += 17; };
  if (linked) row('Sub total', rupee(it.charged));
  if (linked && it.paid_before > 0) row('Paid earlier', `- ${rupee(it.paid_before)}`);
  if (y.discount > 0) row('Discount', `- ${rupee(y.discount)}`);
  rect(tx, ty - 13, 240, 22, { color: TEAL }); text('Amount received', tx + 10, ty + 2, { size: 11, font: B, color: WHITE }); text(rupee(y.amount), RIGHT - 12, ty + 2, { size: 11.5, font: B, color: WHITE, align: 'right' }); ty += 27;
  if (linked) row('Balance on this bill', it.due_after > 0 ? rupee(it.due_after) : 'Nil', { bold: true, color: it.due_after > 0 ? RED : GREEN });
  if (p.balance > 0 && (!linked || Math.abs(p.balance - it.due_after) > 0.001)) row('Total outstanding (all bills)', rupee(p.balance), { color: RED });
  else if (p.balance < 0) row('Advance held on account', rupee(-p.balance), { color: GREEN });
  let wy = t + 18; text('Amount received in words', M, wy, { size: 8.5, color: MUTED });
  for (const l of wrap(inWords(y.amount), B, 9.5, 250)) { wy += 13; text(l, M, wy, { size: 9.5, font: B }); }
  if (linked && it.due_after <= 0) { wy += 12; page.drawRectangle({ x: M, y: H - wy - 18, width: 92, height: 18, borderColor: GREEN, borderWidth: 1.4 }); text('PAID IN FULL', M + 46, wy + 12.5, { size: 8.5, font: B, color: GREEN, align: 'center' }); wy += 18; }
  if (c.note) { let ny = Math.max(ty, wy) + 16; for (const l of wrap(c.note, R, 8.8, W - 2 * M).slice(0, 4)) { text(l, M, ny, { size: 8.8, color: MUTED }); ny += 12; } }

  // ---- footer, fixed at the bottom of the page
  rule(RIGHT - 170, RIGHT, H - 112, INK, 0.8); text('Authorised signatory', RIGHT - 85, H - 100, { size: 8.5, color: MUTED, align: 'center' }); text(wrap(c.name || '', B, 8.5, 170)[0] || '', RIGHT - 85, H - 88, { size: 8.5, font: B, align: 'center' });
  text(`Settled with this receipt: ${rupee(y.amount + (y.discount || 0))}${y.discount > 0 ? ` (${rupee(y.amount)} received + ${rupee(y.discount)} discount)` : ''}`, M, H - 88, { size: 8, color: MUTED });
  rule(M, RIGHT, H - 72); text(`Thank you for choosing ${c.name || 'us'}.`, W / 2, H - 55, { size: 10, font: B, color: DARK, align: 'center' }); text('This is a computer-generated receipt.', W / 2, H - 42, { size: 8, color: MUTED, align: 'center' });
  return Buffer.from(await doc.save());
};
exports.rupee = rupee; exports.fmtDate = fmtDate;

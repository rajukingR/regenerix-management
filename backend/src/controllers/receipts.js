// Sending a payment receipt to the patient: PDF download, email with the PDF attached, and a WhatsApp message carrying a private link to the PDF.
const crypto = require('crypto');
const clinic = require('./clinic');
const mail = require('../config/mail');
const { receiptPdf, rupee, fmtDate } = require('../config/receiptPdf');
const { wrap } = require('./crud');
const { clean, isEmail } = require('../config/util');
const bad = (res, msg, code = 400) => res.status(code).json({ success: false, message: msg });
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The public link is /api/public/receipts/<id>/<token>. The token is an HMAC of the receipt, so it cannot be guessed and one link opens exactly one receipt.
const token = (y) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(`receipt:${y.id}:${y.receipt_no}`).digest('hex').slice(0, 32);
const linkFor = (req, y) => `${(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '').replace(/\/api$/i, '')}/api/public/receipts/${y.id}/${token(y)}`;
const sendPdf = async (res, y) => { const pdf = await receiptPdf(y); res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Receipt-${y.receipt_no}.pdf"`, 'Cache-Control': 'private, no-store' }).send(pdf); };
// 9845012301 -> 919845012301 (country code from the whatsapp_country_code setting, default 91). Numbers already carrying a country code are kept.
const waNumber = (phone, cc) => { let d = String(phone || '').replace(/\D/g, '').replace(/^0+/, ''); if (d.length === 10) d = `${cc}${d}`; return d.length >= 11 && d.length <= 15 ? d : null; };
const summary = (y) => `payment receipt ${y.receipt_no} for ${rupee(y.amount)} dated ${fmtDate(y.paid_on)}`;

// Admin: the PDF itself (opened / downloaded from the dashboard)
exports.pdf = wrap(async (req, res) => { const y = await clinic.receiptData(req.params.id); y ? await sendPdf(res, y) : bad(res, 'Receipt not found', 404); });
// Anyone holding the private link (what the patient receives on WhatsApp)
exports.publicPdf = wrap(async (req, res) => {
  const y = /^\d+$/.test(req.params.id) ? await clinic.receiptData(req.params.id) : null, given = Buffer.from(String(req.params.token || ''));
  if (!y) return res.status(404).json({ message: 'Not found' });
  const want = Buffer.from(token(y));
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return res.status(404).json({ message: 'Not found' });
  await sendPdf(res, y);
});
// Admin: what the WhatsApp button needs. { wa: 'https://wa.me/…?text=…' | null, url, phone }
exports.share = wrap(async (req, res) => {
  const y = await clinic.receiptData(req.params.id); if (!y) return bad(res, 'Receipt not found', 404);
  const p = y.patient || {}, url = linkFor(req, y), num = waNumber(p.phone, String(y.clinic.country_code).replace(/\D/g, '') || '91');
  const message = `Hello ${p.name || ''}, thank you for visiting ${y.clinic.name}. Here is your ${summary(y)}:\n${url}`;
  res.json({ success: true, url, phone: p.phone || null, message, wa: num ? `https://wa.me/${num}?text=${encodeURIComponent(message)}` : null, local: /\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(url) });
});
// Admin: email the PDF. body { email? } overrides the address on the patient's file.
exports.email = wrap(async (req, res) => {
  const y = await clinic.receiptData(req.params.id); if (!y) return bad(res, 'Receipt not found', 404);
  const p = y.patient || {}, to = clean(req.body?.email, 190).toLowerCase() || p.email;
  if (!isEmail(to)) return bad(res, p.email ? 'The email address is not valid' : 'This patient has no email address on file. Add one to their file first.');
  const name = y.clinic.name, lines = [`Receipt no: ${y.receipt_no}`, `Date: ${fmtDate(y.paid_on)}`, `Amount received: ${rupee(y.amount)}`, y.item?.title && `For: ${y.item.title}`].filter(Boolean);
  await mail.send({ to, fromName: name, subject: `Payment receipt ${y.receipt_no} - ${name}`,
    text: `Dear ${p.name || 'Patient'},\n\nThank you for visiting ${name}. Your ${summary(y)} is attached to this email as a PDF.\n\n${lines.join('\n')}\n\nIf you have any questions about this receipt, please contact us${y.clinic.phone ? ` on ${y.clinic.phone}` : ''}.\n\nRegards,\n${name}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1F3A33;line-height:1.6;max-width:560px"><p>Dear ${esc(p.name || 'Patient')},</p><p>Thank you for visiting <b>${esc(name)}</b>. Your payment receipt is attached to this email as a PDF.</p>
<table style="border-collapse:collapse;margin:14px 0">${lines.map((l) => { const [k, ...v] = l.split(': '); return `<tr><td style="padding:4px 16px 4px 0;color:#5d6f69">${esc(k)}</td><td style="padding:4px 0;font-weight:bold">${esc(v.join(': '))}</td></tr>`; }).join('')}</table>
<p>If you have any questions about this receipt, please contact us${y.clinic.phone ? ` on ${esc(y.clinic.phone)}` : ''}.</p><p>Regards,<br><b>${esc(name)}</b></p></div>`,
    attachments: [{ filename: `Receipt-${y.receipt_no}.pdf`, content: await receiptPdf(y), contentType: 'application/pdf' }] });
  res.json({ success: true, to });
});

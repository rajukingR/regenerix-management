const pad = (n) => String(n).padStart(2, '0');
exports.pad = pad;
exports.clean = (v, n = 255) => String(v ?? '').trim().slice(0, n);
exports.isEmail = (v) => /^\S+@\S+\.\S+$/.test(v || '');
exports.phoneOk = (v) => /^[+\d][\d\s-]{7,14}$/.test(v || '');
exports.dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // local date, never UTC-shifted
exports.today = () => exports.dateStr(new Date());
exports.nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
exports.validDate = (s) => /^\d{4}-\d\d-\d\d$/.test(s || '') && !Number.isNaN(new Date(`${s}T00:00:00`).getTime());

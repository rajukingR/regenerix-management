// Outgoing email through Gmail with nodemailer. Needs EMAIL_USER and EMAIL_PASS (a Google "app password") in backend/.env.
// Optional: EMAIL_FROM_NAME (defaults to the clinic name passed in). Without the settings, sending fails with a clear message and nothing else is affected.
let transporter;
exports.configured = () => !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
exports.send = async ({ to, subject, text, html, attachments, fromName }) => {
  if (!exports.configured()) { const e = new Error('Email is not set up on the server. Add EMAIL_USER and EMAIL_PASS to backend/.env and restart.'); e.status = 503; throw e; }
  let nodemailer; try { nodemailer = require('nodemailer'); } catch { const e = new Error('The email package is missing. Run "npm install" in the backend folder and restart.'); e.status = 503; throw e; }
  transporter ||= nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: String(process.env.EMAIL_PASS).replace(/\s+/g, '') } });
  try { return await transporter.sendMail({ from: { name: process.env.EMAIL_FROM_NAME || fromName || 'Regenerix', address: process.env.EMAIL_USER }, to, subject, text, html, attachments }); }
  catch (err) {
    console.error('Email failed:', err.message);
    const e = new Error(err.code === 'EAUTH' ? 'Gmail rejected the login. Check EMAIL_USER and the app password in backend/.env.' : `The email could not be sent (${err.code || 'error'}). Please try again.`); e.status = 502; throw e;
  }
};

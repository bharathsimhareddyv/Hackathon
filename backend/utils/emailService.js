const nodemailer = require('nodemailer');

const DEFAULT_WELCOME_EMAIL_SUBJECT = 'Welcome to {{hackathonName}}';
const DEFAULT_WELCOME_EMAIL_BODY = `Welcome to {{hackathonName}}!

Your team credentials:
Team login: {{loginId}}
Password: {{password}}
Team name: {{teamName}}

Log in on the hackathon portal to download your project or clone the repository.

Good luck — Learn • Debug • Build • Innovate`;

const getTransporter = () => {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: { user, pass }
  });
};

const isEmailConfigured = () => !!getTransporter();

async function verifyEmailTransport() {
  const transporter = getTransporter();
  if (!transporter) return false;
  await transporter.verify();
  return true;
}

function interpolateEmailTemplate(template, values) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (placeholder, key) => (
    values[key] === undefined ? placeholder : String(values[key])
  ));
}

function welcomeEmailHtml({ message, values }) {
  const resolved = interpolateEmailTemplate(message, values);
  const escaped = resolved.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;line-height:1.6;">${escaped.replace(/\r?\n/g, '<br>')}</div>`;
}

async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Email] SMTP not configured — skipped:', subject, '→', to);
    return { skipped: true, message: 'Email not configured' };
  }

  const from = process.env.SMTP_USER || process.env.GMAIL_USER;
  const fromName = process.env.MAIL_FROM_NAME || 'AAROHAN Hackathon';
  const info = await transporter.sendMail({
    from: `"${fromName}" <${from}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, '')
  });
  return { skipped: false, messageId: info.messageId };
}

function welcomeHackathonHtml({ teamCode, loginId, password, hackathonName }) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #2D6A4F;border-radius:12px;">
      <h1 style="color:#1B4332;">Welcome to ${hackathonName || 'AAROHAN Hackathon'}!</h1>
      <p>Your team credentials:</p>
      <ul>
        <li><strong>Team login:</strong> ${loginId}</li>
        <li><strong>Password:</strong> ${password}</li>
        <li><strong>Team name:</strong> ${teamCode}</li>
      </ul>
      <p>Log in on the hackathon portal to download your project or clone the repository.</p>
      <p style="color:#F97316;font-weight:bold;">Good luck — Learn • Debug • Build • Innovate</p>
    </div>`;
}

function qualifiedNextRoundHtml({ teamCode, nextRound, hackathonName }) {
  return `
    <div style="font-family:sans-serif;max-width:560px;padding:24px;">
      <h1 style="color:#1B4332;">Congratulations ${teamCode}!</h1>
      <p>You are approved to proceed to <strong>Round ${nextRound}</strong> in ${hackathonName || 'AAROHAN Hackathon'}.</p>
      <p>Check the portal for your next project and deadlines.</p>
    </div>`;
}

function eliminatedHtml({ teamCode, roundNumber }) {
  return `
    <div style="font-family:sans-serif;max-width:560px;padding:24px;">
      <h1 style="color:#1B4332;">Update for ${teamCode}</h1>
      <p>Your progress for Round ${roundNumber} was not approved before the deadline, or did not meet the required criteria.</p>
      <p>Contact organizers if you have questions.</p>
    </div>`;
}

module.exports = {
  DEFAULT_WELCOME_EMAIL_SUBJECT,
  DEFAULT_WELCOME_EMAIL_BODY,
  isEmailConfigured,
  verifyEmailTransport,
  interpolateEmailTemplate,
  welcomeEmailHtml,
  sendMail,
  welcomeHackathonHtml,
  qualifiedNextRoundHtml,
  eliminatedHtml
};

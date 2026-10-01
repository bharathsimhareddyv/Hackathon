const nodemailer = require('nodemailer');

const DEFAULT_WELCOME_EMAIL_SUBJECT = 'Welcome to {{hackathonName}}';
const DEFAULT_WELCOME_EMAIL_BODY = `Welcome to {{hackathonName}}!

Your team credentials:
Team login: {{loginId}}
Password: {{password}}
Team name: {{teamName}}

Log in on the hackathon portal to download your project or clone the repository.

Good luck — Learn • Debug • Build • Innovate`;

const getSmtpConfig = () => {
  const service = process.env.SMTP_SERVICE;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!service || !user || !pass) return null;
  return {
    service,
    user,
    pass: service.toLowerCase() === 'gmail' ? pass.replace(/\s/g, '') : pass,
    fromName: process.env.MAIL_FROM_NAME || 'AAROHAN Hackathon',
    replyTo: process.env.MAIL_REPLY_TO || ''
  };
};

const isEmailConfigured = () => !!getSmtpConfig();

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
  const config = getSmtpConfig();
  if (!config) {
    const error = new Error('SMTP_SERVICE, SMTP_USER, and SMTP_PASS are required');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: config.service,
      auth: { user: config.user, pass: config.pass }
    });
    const result = await transporter.sendMail({
      from: { name: config.fromName, address: config.user },
      to,
      replyTo: config.replyTo || undefined,
      subject,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : undefined),
      html
    });
    return { skipped: false, messageId: result.messageId };
  } catch (cause) {
    const error = new Error('SMTP delivery failed');
    error.code = 'SMTP_DELIVERY_ERROR';
    error.cause = cause;
    throw error;
  }
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
  interpolateEmailTemplate,
  welcomeEmailHtml,
  sendMail,
  welcomeHackathonHtml,
  qualifiedNextRoundHtml,
  eliminatedHtml
};

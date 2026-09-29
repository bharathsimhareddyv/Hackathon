const nodemailer = require('nodemailer');

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

async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Email] SMTP not configured — skipped:', subject, '→', to);
    return { skipped: true, message: 'Email not configured' };
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'AAROHAN Hackathon';
  const info = await transporter.sendMail({
    from: `"AAROHAN Hackathon" <${from}>`,
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
  isEmailConfigured,
  sendMail,
  welcomeHackathonHtml,
  qualifiedNextRoundHtml,
  eliminatedHtml
};

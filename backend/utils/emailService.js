const DEFAULT_WELCOME_EMAIL_SUBJECT = 'Welcome to {{hackathonName}}';
const DEFAULT_WELCOME_EMAIL_BODY = `Welcome to {{hackathonName}}!

Your team credentials:
Team login: {{loginId}}
Password: {{password}}
Team name: {{teamName}}

Log in on the hackathon portal to download your project or clone the repository.

Good luck — Learn • Debug • Build • Innovate`;

const getResendConfig = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return null;
  return {
    apiKey,
    from: `${process.env.MAIL_FROM_NAME || 'AAROHAN Hackathon'} <${fromEmail}>`
  };
};

const isEmailConfigured = () => !!getResendConfig();

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
  const config = getResendConfig();
  if (!config) {
    const error = new Error('RESEND_API_KEY and RESEND_FROM_EMAIL are required');
    error.code = 'RESEND_NOT_CONFIGURED';
    throw error;
  }

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.from,
        ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, '')
      })
    });
  } catch (cause) {
    const error = new Error('Could not connect to the Resend email API');
    error.code = 'RESEND_NETWORK_ERROR';
    error.cause = cause;
    throw error;
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || 'Resend rejected the email request');
    error.code = result.name || 'RESEND_API_ERROR';
    error.statusCode = response.status;
    throw error;
  }
  return { skipped: false, messageId: result.id };
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

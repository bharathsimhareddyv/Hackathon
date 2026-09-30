const DEFAULT_WELCOME_EMAIL_SUBJECT = 'Welcome to {{hackathonName}}';
const DEFAULT_WELCOME_EMAIL_BODY = `Welcome to {{hackathonName}}!

Your team credentials:
Team login: {{loginId}}
Password: {{password}}
Team name: {{teamName}}

Log in on the hackathon portal to download your project or clone the repository.

Good luck — Learn • Debug • Build • Innovate`;

const getGmailConfig = () => {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const senderEmail = process.env.GMAIL_SENDER_EMAIL;
  if (!clientId || !clientSecret || !refreshToken || !senderEmail) return null;
  return {
    clientId,
    clientSecret,
    refreshToken,
    senderEmail,
    fromName: process.env.MAIL_FROM_NAME || 'AAROHAN Hackathon',
    replyTo: process.env.MAIL_REPLY_TO || ''
  };
};

const isEmailConfigured = () => !!getGmailConfig();

let cachedAccessToken = '';
let accessTokenExpiresAt = 0;

async function getGoogleAccessToken(config) {
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt - 60000) return cachedAccessToken;

  let response;
  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token'
      })
    });
  } catch (cause) {
    const error = new Error('Could not connect to Google OAuth');
    error.code = 'GOOGLE_OAUTH_NETWORK_ERROR';
    error.cause = cause;
    throw error;
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    const error = new Error('Google OAuth rejected the refresh token');
    error.code = 'GOOGLE_OAUTH_ERROR';
    error.statusCode = response.status;
    throw error;
  }

  cachedAccessToken = result.access_token;
  accessTokenExpiresAt = Date.now() + Math.max((result.expires_in || 3600) - 60, 30) * 1000;
  return cachedAccessToken;
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
  const config = getGmailConfig();
  if (!config) {
    const error = new Error('Gmail API OAuth credentials and sender email are required');
    error.code = 'GMAIL_NOT_CONFIGURED';
    throw error;
  }

  const accessToken = await getGoogleAccessToken(config);
  const boundary = `aarohan_${require('crypto').randomBytes(18).toString('hex')}`;
  const senderName = String(config.fromName).replace(/[\r\n]/g, ' ').replace(/"/g, '\\"');
  const safeSubject = String(subject).replace(/[\r\n]/g, ' ');
  const recipients = (Array.isArray(to) ? to : [to]).map(value => String(value).replace(/[\r\n]/g, ' ')).join(', ');
  const textBody = text || html.replace(/<[^>]+>/g, '');
  const encodeBody = value => Buffer.from(value, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
  const rawMessage = [
    `From: "${senderName}" <${config.senderEmail}>`,
    `To: ${recipients}`,
    ...(config.replyTo ? [`Reply-To: ${config.replyTo.replace(/[\r\n]/g, ' ')}`] : []),
    `Subject: =?UTF-8?B?${Buffer.from(safeSubject, 'utf8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBody(textBody),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBody(html),
    `--${boundary}--`,
    ''
  ].join('\r\n');

  let response;
  try {
    response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: Buffer.from(rawMessage, 'utf8').toString('base64url') })
    });
  } catch (cause) {
    const error = new Error('Could not connect to the Gmail API');
    error.code = 'GMAIL_API_NETWORK_ERROR';
    error.cause = cause;
    throw error;
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.message || 'Gmail API rejected the email request');
    error.code = 'GMAIL_API_ERROR';
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

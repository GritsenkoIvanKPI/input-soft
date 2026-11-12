// Sends contact form submissions by email through Resend (https://resend.com).
// Needs RESEND_API_KEY and a sender on a domain verified in Resend (MAIL_FROM).
// Locally, without a key, emails are printed in the terminal instead of being sent.

const DEFAULT_FROM = 'INPUT SOFT website <website@inputsoft.net>';
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;
export const isEmail = (s) => EMAIL.test(String(s || '').trim()) && String(s).length <= 254;

const fail = (status, message) => Object.assign(new Error(message), { status });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const oneLine = (s) => s.replace(/\s+/g, ' ');

export function mailStatus(env) {
  return { configured: Boolean(env.RESEND_API_KEY), from: env.MAIL_FROM || DEFAULT_FROM };
}

/* ----------------------------------------------------------- spam guards */
// Per server instance: a visitor can send a few requests per 10 minutes.
const recent = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 10 * 60e3);
  if (list.length >= 5) throw fail(429, 'Too many requests. Please try again in a few minutes.');
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear();
}

/* ----------------------------------------------------------------- email */
const FIELDS = [
  ['name', 'Full name'],
  ['email', 'Business email'],
  ['phone', 'Phone'],
  ['company', 'Company'],
  ['solution', 'Solution'],
  ['question', 'Question'],
];

function leadEmail(lead, subjectPrefix) {
  const subject = oneLine(`${subjectPrefix}: ${lead.company || lead.name}${lead.solution ? ` — ${lead.solution}` : ''}`).slice(0, 180);
  const rows = FIELDS.filter(([k]) => lead[k]).map(([k, label]) => {
    const value = k === 'email' ? `<a href="mailto:${esc(lead.email)}" style="color:#1a1e3c">${esc(lead.email)}</a>`
      : k === 'phone' ? `<a href="tel:${esc(lead.phone.replace(/[^\d+]/g, ''))}" style="color:#1a1e3c">${esc(lead.phone)}</a>`
      : esc(lead[k]).replace(/\n/g, '<br>');
    return `<tr><td style="padding:10px 16px 10px 0;color:#6b7080;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:10px 0;color:#0b0d16">${value}</td></tr>`;
  }).join('');
  const meta = [
    lead.form && `Form: ${esc(lead.form)}`,
    lead.page && `Page: <a href="${esc(lead.page)}" style="color:#6b7080">${esc(lead.page)}</a>`,
    `Sent: ${new Date().toUTCString()}`,
  ].filter(Boolean).join('<br>');
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5">
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="padding:20px 24px;background:#0b0d16;color:#fff;font-size:16px"><strong style="color:#fab822">INPUT SOFT</strong>&nbsp; New request from the website</td></tr>
<tr><td style="padding:20px 24px"><table role="presentation" style="border-collapse:collapse">${rows}</table>
<p style="margin:20px 0 0;color:#6b7080;font-size:13px">Reply to this email to answer ${esc(lead.name)} directly.</p></td></tr>
<tr><td style="padding:14px 24px;background:#f4f5f8;color:#6b7080;font-size:12px">${meta}</td></tr>
</table></body></html>`;
  const text = [
    'New request from the INPUT SOFT website',
    '',
    ...FIELDS.filter(([k]) => lead[k]).map(([k, label]) => `${label}: ${lead[k]}`),
    '',
    lead.form ? `Form: ${lead.form}` : '',
    lead.page ? `Page: ${lead.page}` : '',
  ].filter((l, i, a) => l || a[i - 1]).join('\n');
  return { subject, html, text };
}

async function send(env, { to, subject, html, text, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM || DEFAULT_FROM, to, subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error('Resend error', res.status, detail.slice(0, 500));
    let reason = '';
    try { reason = JSON.parse(detail).message || ''; } catch { reason = detail.slice(0, 160); }
    throw fail(502, res.status === 401 ? 'The email service key (RESEND_API_KEY) is invalid.'
      : res.status === 403 || res.status === 422 ? `The email service refused the message: ${reason} Check that the sender domain is verified in Resend.`
      : 'The email could not be sent. Please try again later.');
  }
  return res.json();
}

/* --------------------------------------------------------------- handlers */
export async function sendLeadEmail({ env, forms, data, request, local }) {
  // Hidden "website" field: people never fill it in, spam bots usually do. Pretend success.
  if (clean(data.website, 200)) return { skipped: true };
  // Sent faster than a person can type: most likely a bot.
  if (Number(data.elapsed) > 0 && Number(data.elapsed) < 2500) return { skipped: true };

  const lead = {
    name: clean(data.name, 200),
    email: clean(data.email, 254),
    phone: clean(data.phone, 60),
    company: clean(data.company, 200),
    solution: clean(data.solution, 120),
    question: clean(data.question, 5000),
    form: clean(data.form, 60),
    page: /^https?:\/\//.test(String(data.page || '')) ? clean(data.page, 500) : '',
  };
  if (!lead.name || !lead.company || !lead.solution) throw fail(400, 'Please fill in all required fields.');
  if (!isEmail(lead.email)) throw fail(400, 'Please enter a valid email address.');
  if (data.consent !== true && data.consent !== 'on') throw fail(400, 'Please accept the privacy terms.');

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  rateLimit(ip);

  const email = leadEmail(lead, forms.subject);
  if (!env.RESEND_API_KEY) {
    if (local) {
      console.log(`\n[form] Email not sent (no RESEND_API_KEY). It would go to ${forms.recipients.join(', ')}:\n${email.subject}\n${email.text}\n`);
      return { simulated: true };
    }
    console.error('[form] RESEND_API_KEY is not set: a website request could not be emailed', JSON.stringify(lead));
    throw fail(503, 'Sending is not set up yet.');
  }
  await send(env, { to: forms.recipients, replyTo: lead.email, ...email });
  return {};
}

export async function sendTestEmail({ env, forms, local }) {
  const lead = {
    name: 'Test Person', email: 'test@example.com', phone: '+1 555 0100', company: 'Test company',
    solution: 'Resource Management', question: 'This is a test email from the INPUT SOFT admin panel. Requests from the website forms will look like this.',
    form: 'Test from the admin panel', page: '',
  };
  const email = leadEmail(lead, forms.subject);
  if (!env.RESEND_API_KEY) {
    if (local) {
      console.log(`\n[form] Test email (not sent, no RESEND_API_KEY) to ${forms.recipients.join(', ')}:\n${email.subject}\n${email.text}\n`);
      return { simulated: true };
    }
    throw fail(503, 'Email sending is not set up yet: RESEND_API_KEY is missing on the server.');
  }
  await send(env, { to: forms.recipients, ...email });
  return {};
}

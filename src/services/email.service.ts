import nodemailer from 'nodemailer';
import { env } from '../config/env';

const NAVY = '#0B2440';
const BLUE = '#2D82C4';
const GREEN = '#3A8F36';
const MINT = '#EAF6E7';
const SKY = '#EAF4FB';
const INK = '#12345F';
const MUTED = '#5B6B7C';
const LINE = '#E2E8F0';
const PAGE = '#F4F7FB';

const LOGO_URL = 'https://admin.leanbloom.health/uploads/logo.png';

function transport() {
  if (!env.smtpUser || !env.smtpPass) {
    throw new Error('SMTP is not configured');
  }
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(input: {
  eyebrow: string;
  title: string;
  bodyHtml: string;
}) {
  const logo = `<img src="${LOGO_URL}" alt="LeanBloom" width="168" style="display:block;margin:0 auto 8px;border:0;height:auto;" />`;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${PAGE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="height:6px;background:${BLUE};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="height:6px;background:${GREEN};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
              ${logo}
              <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${BLUE};font-weight:700;">${escapeHtml(input.eyebrow)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;">${escapeHtml(input.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;font-family:Arial,Helvetica,sans-serif;color:${INK};font-size:15px;line-height:1.6;">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 22px;background:${PAGE};border-top:1px solid ${LINE};font-family:Arial,Helvetica,sans-serif;text-align:center;">
              <p style="margin:0;font-size:12px;color:${MUTED};">LeanBloom partner portal</p>
              <p style="margin:6px 0 0;font-size:12px;"><a href="mailto:${env.smtpFrom}" style="color:${BLUE};text-decoration:none;">${env.smtpFrom}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function send(to: string, subject: string, html: string, text: string) {
  await transport().sendMail({
    from: `LeanBloom <${env.smtpFrom}>`,
    to,
    subject,
    html,
    text,
  });
}

export const EmailService = {
  async sendOtp(to: string, code: string, purpose: 'signup' | 'password_reset') {
    const title =
      purpose === 'signup'
        ? 'Confirm your partner account'
        : 'Reset your password';
    const intro =
      purpose === 'signup'
        ? 'Enter this code to verify your email and finish creating your LeanBloom partner account.'
        : 'Enter this code to verify your email, then choose a new password.';
    const html = layout({
      eyebrow: purpose === 'signup' ? 'Partner signup' : 'Password reset',
      title,
      bodyHtml: `
        <p style="margin:0 0 18px;color:${MUTED};">${intro}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="background:${SKY};border:1px solid #C9DFF0;border-radius:12px;padding:18px 12px;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${BLUE};font-weight:700;">Your code</p>
              <p style="margin:0;font-size:32px;letter-spacing:8px;font-weight:700;color:${NAVY};">${escapeHtml(code)}</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:13px;color:${MUTED};">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
      `,
    });
    await send(
      to,
      `${code} is your LeanBloom code`,
      html,
      `${title}\n\n${intro}\n\nCode: ${code}\n\nThis code expires in 10 minutes.`
    );
  },

  async sendPlanPurchase(input: {
    to: string;
    name: string;
    planName: string;
    amount: number;
    months: number;
    endsAt: string | null;
  }) {
    const ends = input.endsAt
      ? new Date(input.endsAt).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : 'your current period';
    const amount = input.amount.toFixed(2);
    const coverage = `${input.months} month${input.months === 1 ? '' : 's'}`;
    const row = (label: string, value: string) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};color:${MUTED};font-size:13px;">${label}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};text-align:right;color:${NAVY};font-weight:700;font-size:14px;">${value}</td>
      </tr>`;
    const html = layout({
      eyebrow: 'Plan payment',
      title: 'Your plan is active',
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${escapeHtml(input.name)},</p>
        <p style="margin:0 0 16px;color:${MUTED};">Payment received. Your LeanBloom partner portal is unlocked.</p>
        <p style="display:inline-block;margin:0 0 16px;padding:6px 10px;border-radius:999px;background:${MINT};color:${GREEN};font-size:12px;font-weight:700;">Payment successful</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('Plan', escapeHtml(input.planName))}
          ${row('Paid', `$${amount}`)}
          ${row('Coverage', coverage)}
          ${row('Access through', escapeHtml(ends))}
        </table>
        <p style="margin:16px 0 0;font-size:13px;color:${MUTED};">Billing is manual through PayPal. The next month is not charged automatically.</p>
      `,
    });
    await send(
      input.to,
      `Your ${input.planName} plan is active`,
      html,
      `Hi ${input.name},\n\nYour LeanBloom partner plan is active.\nPlan: ${input.planName}\nPaid: $${amount}\nCoverage: ${coverage}\nAccess through: ${ends}`
    );
  },
};

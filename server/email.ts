import crypto from 'crypto';
import nodemailer from 'nodemailer';

export interface EmailServiceResult {
  sent: boolean;
  smtpConfigured: boolean;
  message: string;
  error?: string;
}

// Generates a cryptographically secure 6-digit numeric verification code
export function generateVerificationCode(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

/**
 * Checks if real SMTP or Gmail service credentials are configured in the environment
 */
export function isSmtpConfigured(): boolean {
  const hasGmail = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return hasGmail || hasSmtp;
}

/**
 * Initializes nodemailer transporter based on environment configuration
 */
function createTransporter() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return null;
}

/**
 * Sends a real verification email via nodemailer when SMTP is configured.
 * When SMTP is not configured in preview/development mode, returns smtpConfigured: false
 * so the frontend can provide fallback testing assistance without trapping the user.
 */
export async function sendVerificationEmail(
  toEmail: string,
  code: string,
  fullName: string,
  role: 'doctor' | 'patient'
): Promise<EmailServiceResult> {
  const roleLabel = role === 'doctor' ? 'Healthcare Provider (Doctor)' : 'Patient';

  const transporter = createTransporter();

  if (transporter) {
    try {
      const fromAddress =
        process.env.SMTP_FROM ||
        process.env.GMAIL_USER ||
        process.env.SMTP_USER ||
        'MedTrack AI <no-reply@medtrack.ai>';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .subhead { font-size: 13px; opacity: 0.9; margin-top: 4px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .code-box { background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #0f766e; margin-bottom: 8px; }
    .code-number { font-size: 36px; font-family: 'Courier New', Courier, monospace; font-weight: 800; letter-spacing: 8px; color: #0d9488; margin: 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #e0f2fe; color: #0369a1; margin-bottom: 16px; }
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-text">MEDTRACK AI</div>
      <div class="subhead">Intelligent Clinical Healthcare Portal</div>
    </div>
    <div class="content">
      <span class="badge">${roleLabel} Account</span>
      <div class="greeting">Hello ${fullName || 'there'},</div>
      <p class="text">
        Thank you for registering with MedTrack AI. Please use the 6-digit verification code below to confirm your email address and activate your account.
      </p>
      <div class="code-box">
        <div class="code-label">Your Verification Code</div>
        <div class="code-number">${code}</div>
      </div>
      <p class="text" style="font-size: 12px; color: #64748b;">
        ⏱️ This security code is valid for <strong>15 minutes</strong>. If you did not request this registration, please disregard this email.
      </p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} MedTrack AI. HIPAA & GDPR Compliant Medical Intelligence Platform.
    </div>
  </div>
</body>
</html>
      `.trim();

      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `Your MedTrack AI Verification Code: ${code}`,
        text: `Your MedTrack AI 6-digit verification code is: ${code}. It expires in 15 minutes.`,
        html,
      });

      console.log(`[MedTrack AI Mailer] Verification email dispatched to ${toEmail}: ${info.messageId}`);
      return {
        sent: true,
        smtpConfigured: true,
        message: 'Verification code sent to your email address. Please check your inbox or spam folder.',
      };
    } catch (err: any) {
      console.error('[MedTrack AI Mailer] SMTP delivery failed:', err);
      return {
        sent: false,
        smtpConfigured: true,
        error: err?.message || 'SMTP delivery failed',
        message: `Failed to deliver email: ${err?.message || 'Check SMTP credentials or host connectivity'}`,
      };
    }
  }

  // When SMTP is not configured in this container/dev environment
  console.log(`[MedTrack AI Mailer] [DEMO/PREVIEW] SMTP credentials not set. Code generated for ${toEmail}: ${code}`);
  return {
    sent: false,
    smtpConfigured: false,
    message: 'Outbound SMTP mail server is not configured in this preview environment.',
  };
}

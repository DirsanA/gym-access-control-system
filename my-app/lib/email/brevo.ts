import nodemailer from "nodemailer";

const host = process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
const port = Number(process.env.BREVO_SMTP_PORT) || 587;
const user = process.env.BREVO_SMTP_USER || "";
const pass = process.env.BREVO_SMTP_PASS || "";
const fromEmail = process.env.BREVO_FROM_EMAIL || "no-reply@elitefitness.et";
const fromName = process.env.BREVO_FROM_NAME || "Elite Fitness Club";

// Reusable nodemailer transporter instance
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

export async function sendOtpEmail(to: string, otp: string, username: string): Promise<boolean> {
  // If SMTP credentials aren't configured yet in production, log safely for dev environment
  if (!user || !pass) {
    console.warn(`[BREVO SMTP WARNING] SMTP credentials not set. Dev OTP for ${to}: [${otp}]`);
    return true;
  }

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: `Your Elite Fitness Verification Code: ${otp}`,
    text: `Hello ${username},\n\nYour Elite Fitness account verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this code, please ignore this email.\n\nElite Fitness Athletic Club - Addis Ababa, Ethiopia`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080808; color: #f4f7f5; margin: 0; padding: 30px; }
            .card { max-width: 500px; margin: 0 auto; background: #121216; border: 1px solid rgba(255, 51, 30, 0.3); border-radius: 20px; padding: 36px 32px; box-shadow: 0 16px 40px rgba(0,0,0,0.8); }
            .brand { color: #ff331e; font-size: 14px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px; }
            .title { font-size: 26px; font-weight: 800; margin: 0 0 16px; color: #ffffff; }
            .desc { font-size: 14px; line-height: 1.6; color: #9da39f; margin-bottom: 28px; }
            .otp-box { text-align: center; background: rgba(255, 51, 30, 0.08); border: 1.5px dashed rgba(255, 51, 30, 0.5); border-radius: 14px; padding: 18px 24px; margin-bottom: 28px; }
            .otp-code { font-size: 38px; font-family: monospace; font-weight: 900; letter-spacing: 0.25em; color: #ffffff; }
            .footer { font-size: 12px; color: #6d7570; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">ELITE FITNESS CLUB</div>
            <h1 class="title">Verify Your Email</h1>
            <p class="desc">Hello <b>${username}</b>,<br>Welcome to Elite Fitness. Enter the 6-digit verification code below to activate your account and access your member dashboard.</p>
            <div class="otp-box">
              <span class="otp-code">${otp}</span>
            </div>
            <p class="desc" style="font-size: 12px; margin-bottom: 0;">This code will expire in <b>10 minutes</b>. For security reasons, never share this code with anyone.</p>
            <div class="footer">
              ADDIS ABABA, ETHIOPIA • 24/7 ENTRANCE & ACCESS
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const client = getTransporter();
    await client.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("[BREVO SMTP ERROR]", error);
    // Allow graceful fallback in local dev without breaking registration flow
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[DEV FALLBACK] Proceeding despite SMTP failure. Code: ${otp}`);
      return true;
    }
    return false;
  }
}

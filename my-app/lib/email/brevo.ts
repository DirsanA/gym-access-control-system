import nodemailer from "nodemailer";

function cleanEnv(val: string | undefined, defaultVal = ""): string {
  if (!val) return defaultVal;
  let clean = val.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function getSmtpConfig() {
  const host = cleanEnv(process.env.BREVO_SMTP_HOST, "smtp-relay.brevo.com");
  const port = Number(cleanEnv(process.env.BREVO_SMTP_PORT, "2525")) || 2525;
  const user = cleanEnv(process.env.BREVO_SMTP_USER);
  const pass = cleanEnv(process.env.BREVO_SMTP_PASS);
  const fromEmail = cleanEnv(process.env.BREVO_FROM_EMAIL) || user || "no-reply@elitefitness.et";
  const fromName = cleanEnv(process.env.BREVO_FROM_NAME, "Elite Fitness Club");

  return { host, port, user, pass, fromEmail, fromName };
}

function createTransporter(host: string, port: number, user: string, pass: string) {
  return nodemailer.createTransport({
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
    connectionTimeout: 25000,
    greetingTimeout: 20000,
    socketTimeout: 25000,
  });
}

export interface SendOtpResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

export async function sendOtpEmail(to: string, otp: string, username: string): Promise<SendOtpResult> {
  const config = getSmtpConfig();

  console.log("\n==================== [BREVO SMTP DISPATCH START] ====================");
  console.log("[BREVO SMTP] Recipient Email :", to);
  console.log("[BREVO SMTP] Athlete Name    :", username);
  console.log("[BREVO SMTP] OTP Code        :", otp);
  console.log("[BREVO SMTP] Target Host     :", config.host);
  console.log("[BREVO SMTP] Target Port     :", config.port);
  console.log("[BREVO SMTP] Sender Identity :", `"${config.fromName}" <${config.fromEmail}>`);
  console.log("[BREVO SMTP] SMTP User       :", config.user || "(MISSING)");
  console.log("[BREVO SMTP] SMTP Pass Status:", config.pass ? `Configured (${config.pass.length} chars)` : "(MISSING)");

  if (!config.user || !config.pass) {
    const errorMsg = "Brevo SMTP credentials (BREVO_SMTP_USER or BREVO_SMTP_PASS) are missing in environment.";
    console.warn("[BREVO SMTP WARNING]", errorMsg);
    console.warn(`[DEV FALLBACK] Verification code for ${to} is: [${otp}]`);
    console.log("==================== [BREVO SMTP DISPATCH END] ====================\n");
    return {
      success: true, // Allow dev fallback so flow is not blocked
      error: errorMsg,
    };
  }

  const mailOptions = {
    from: `"${config.fromName}" <${config.fromEmail}>`,
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

  // Primary attempt on configured port (2525)
  try {
    console.log(`[BREVO SMTP] Connecting to ${config.host}:${config.port}...`);
    const client = createTransporter(config.host, config.port, config.user, config.pass);
    const info = await client.sendMail(mailOptions);

    console.log("[BREVO SMTP SUCCESS] >>> EMAIL DISPATCHED & ACCEPTED BY BREVO! <<<");
    console.log("[BREVO SMTP SUCCESS] Message ID:", info.messageId);
    console.log("[BREVO SMTP SUCCESS] Accepted  :", JSON.stringify(info.accepted));
    console.log("[BREVO SMTP SUCCESS] Response  :", info.response);
    console.log("==================== [BREVO SMTP DISPATCH END] ====================\n");

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error: any) {
    console.error(`[BREVO SMTP ERROR] Primary delivery on port ${config.port} failed:`);
    console.error("[BREVO SMTP ERROR] Code   :", error.code);
    console.error("[BREVO SMTP ERROR] Command:", error.command);
    console.error("[BREVO SMTP ERROR] Message:", error.message);
    if (error.response) console.error("[BREVO SMTP ERROR] Response:", error.response);

    // If port 2525 failed and fallback port 587 is available, attempt fallback once
    const fallbackPort = config.port === 2525 ? 587 : 2525;
    try {
      console.log(`[BREVO SMTP] Retrying transmission on alternate port ${fallbackPort}...`);
      const fallbackClient = createTransporter(config.host, fallbackPort, config.user, config.pass);
      const fallbackInfo = await fallbackClient.sendMail(mailOptions);

      console.log(`[BREVO SMTP SUCCESS] >>> EMAIL DELIVERED ON ALTERNATE PORT ${fallbackPort}! <<<`);
      console.log("[BREVO SMTP SUCCESS] Message ID:", fallbackInfo.messageId);
      console.log("[BREVO SMTP SUCCESS] Accepted  :", JSON.stringify(fallbackInfo.accepted));
      console.log("==================== [BREVO SMTP DISPATCH END] ====================\n");

      return {
        success: true,
        messageId: fallbackInfo.messageId,
        response: fallbackInfo.response,
      };
    } catch (fallbackError: any) {
      console.error(`[BREVO SMTP ERROR] Alternate port ${fallbackPort} also failed:`, fallbackError.message);
      console.warn(`[DEV FALLBACK] Verification code for ${to}: [${otp}]`);
      console.log("==================== [BREVO SMTP DISPATCH END] ====================\n");

      return {
        success: process.env.NODE_ENV !== "production",
        error: error.message || fallbackError.message || "Failed to deliver email",
      };
    }
  }
}

export async function sendPasswordResetOtpEmail(to: string, otp: string, username: string): Promise<SendOtpResult> {
  const config = getSmtpConfig();

  console.log("\n==================== [BREVO RESET OTP DISPATCH START] ====================");
  console.log("[BREVO SMTP] Recipient Email :", to);
  console.log("[BREVO SMTP] Athlete Name    :", username);
  console.log("[BREVO SMTP] Reset OTP Code  :", otp);

  if (!config.user || !config.pass) {
    const errorMsg = "Brevo SMTP credentials are not configured in environment.";
    console.warn("[BREVO SMTP WARNING]", errorMsg);
    console.warn(`[DEV FALLBACK] Password reset code for ${to} is: [${otp}]`);
    console.log("==================== [BREVO RESET OTP DISPATCH END] ====================\n");
    return {
      success: true,
      error: errorMsg,
    };
  }

  const mailOptions = {
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject: `Reset Your Elite Fitness Password: ${otp}`,
    text: `Hello ${username},\n\nWe received a request to reset your Elite Fitness account password.\n\nYour 6-digit password reset code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request a password reset, please secure your account immediately.\n\nElite Fitness Athletic Club - Addis Ababa, Ethiopia`,
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
            <div class="brand">ELITE FITNESS SECURITY</div>
            <h1 class="title">Reset Your Password</h1>
            <p class="desc">Hello <b>${username}</b>,<br>We received a request to reset your Elite Fitness account password. Enter the 6-digit verification code below to set a new password.</p>
            <div class="otp-box">
              <span class="otp-code">${otp}</span>
            </div>
            <p class="desc" style="font-size: 12px; margin-bottom: 0;">This code will expire in <b>10 minutes</b>. If you did not request this, please disregard this email.</p>
            <div class="footer">
              ADDIS ABABA, ETHIOPIA • 24/7 ACCOUNT SECURITY
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const transporter = createTransporter(config.host, config.port, config.user, config.pass);
    const info = await transporter.sendMail(mailOptions);
    console.log("[BREVO SMTP SUCCESS] Reset OTP delivered:", info.messageId);
    console.log("==================== [BREVO RESET OTP DISPATCH END] ====================\n");
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error: any) {
    const fallbackPort = config.port === 2525 ? 587 : 2525;
    try {
      const fallbackClient = createTransporter(config.host, fallbackPort, config.user, config.pass);
      const fallbackInfo = await fallbackClient.sendMail(mailOptions);
      console.log(`[BREVO SMTP SUCCESS] Reset OTP delivered on port ${fallbackPort}:`, fallbackInfo.messageId);
      console.log("==================== [BREVO RESET OTP DISPATCH END] ====================\n");
      return {
        success: true,
        messageId: fallbackInfo.messageId,
        response: fallbackInfo.response,
      };
    } catch (fallbackError: any) {
      console.error("[BREVO SMTP ERROR] Reset email failed:", error.message || fallbackError.message);
      console.warn(`[DEV FALLBACK] Password reset code for ${to}: [${otp}]`);
      console.log("==================== [BREVO RESET OTP DISPATCH END] ====================\n");
      return {
        success: process.env.NODE_ENV !== "production",
        error: error.message || fallbackError.message || "Failed to deliver email",
      };
    }
  }
}


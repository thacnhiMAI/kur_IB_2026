import nodemailer from "nodemailer";

function getTransport() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) {
    return null;
  }

  const service = process.env.SMTP_SERVICE?.trim();
  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass }
    });
  }

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);

  if (!host) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

export async function sendVerificationEmail(input: {
  to: string;
  code: string;
  purpose: "SIGN_UP" | "PASSWORD_RESET";
}) {
  const transport = getTransport();
  const fromAddress = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
  const appName = "Умная библиотека";
  const title = input.purpose === "SIGN_UP" ? "Подтверждение регистрации" : "Подтверждение смены пароля";

  if (!transport || !fromAddress) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[auth-email:${input.purpose}] ${input.to} -> ${input.code}`);
      return { delivery: "console" as const };
    }

    throw new Error("SMTP is not configured");
  }

  await transport.sendMail({
    from: `${appName} <${fromAddress}>`,
    to: input.to,
    subject: `${title} — ${input.code}`,
    text: `${appName}\n\nВаш код: ${input.code}\nКод действует 10 минут. Никому не сообщайте этот код.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#070a11;color:#e9efff;padding:32px">
        <div style="max-width:520px;margin:auto;border:1px solid #26344f;background:#0c1729;border-radius:16px;padding:28px">
          <div style="font-size:12px;letter-spacing:1.8px;color:#82afff">${appName.toUpperCase()}</div>
          <h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;margin:18px 0 10px">${title}</h1>
          <p style="color:#aab9d1;line-height:1.7">${input.purpose === "SIGN_UP" ? "Введите этот код в окне регистрации." : "Введите этот код в профиле, чтобы подтвердить смену пароля."} Он действует 10 минут.</p>
          <div style="font-size:36px;letter-spacing:8px;font-weight:700;color:#ffffff;background:#101a2c;border:1px solid #345182;border-radius:12px;padding:18px;text-align:center;margin:24px 0">${input.code}</div>
          <p style="font-size:13px;color:#8d9fbc">Если вы не запрашивали этот код, просто проигнорируйте письмо.</p>
        </div>
      </div>`
  });

  return { delivery: "smtp" as const };
}

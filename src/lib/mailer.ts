import nodemailer from "nodemailer";

export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Melto App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Melto - Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px;
           border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
        <h2 style="color: #3b82f6; text-align: center;">🔐 Melto Password Reset</h2>
        <p style="text-align: center; color: #6b7280; margin-bottom: 28px;">
          Your one-time OTP is valid for <strong>10 minutes</strong>.
        </p>
        <div style="background: #1f2937; color: #60a5fa; font-size: 36px; font-weight: bold;
             text-align: center; letter-spacing: 12px; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          ${otp}
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 13px;">
          If you did not request this, please ignore this email.
        </p>
      </div>
    `,
  });
}

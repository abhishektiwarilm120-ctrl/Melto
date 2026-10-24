import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/mailer";
import { sendSmSOtp } from "@/lib/sms";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email, via } = await req.json(); // via = "email" | "sms"

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "No account found with this email address" }, { status: 404 });
    }

    if (via === "sms" && !user.phone) {
      return NextResponse.json({
        message: "No mobile number linked to this account. Please use Email OTP instead.",
      }, { status: 400 });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate old OTPs for this user
    await prisma.otpVerification.updateMany({
      where: {
        OR: [
          { email: user.email, used: false },
          { phone: user.phone ?? undefined, used: false },
        ]
      },
      data: { used: true }
    });

    if (via === "sms") {
      // Save OTP linked to phone
      await prisma.otpVerification.create({
        data: { phone: user.phone, otp, expiresAt }
      });
      await sendSmSOtp(user.phone!, otp);

      const maskedPhone = user.phone!.slice(0, -4).replace(/./g, "*") + user.phone!.slice(-4);
      return NextResponse.json({
        message: `OTP sent to your mobile number ${maskedPhone}`,
        maskedPhone,
        sentVia: "sms"
      });
    } else {
      // Save OTP linked to email
      await prisma.otpVerification.create({
        data: { email: user.email, otp, expiresAt }
      });
      await sendOtpEmail(user.email, otp);

      const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
      return NextResponse.json({
        message: `OTP sent to ${maskedEmail}`,
        maskedEmail,
        sentVia: "email"
      });
    }
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ message: "Failed to send OTP. Please check your configuration." }, { status: 500 });
  }
}

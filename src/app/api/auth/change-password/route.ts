import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword, sentVia } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ message: "Email, OTP and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find valid OTP — check by email or phone depending on how it was sent
    let otpRecord;
    if (sentVia === "sms" && user.phone) {
      otpRecord = await prisma.otpVerification.findFirst({
        where: { phone: user.phone, otp, used: false },
        orderBy: { createdAt: "desc" }
      });
    } else {
      otpRecord = await prisma.otpVerification.findFirst({
        where: { email: user.email, otp, used: false },
        orderBy: { createdAt: "desc" }
      });
    }

    if (!otpRecord) {
      return NextResponse.json({ message: "Invalid OTP. Please check and try again." }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.otpVerification.update({ where: { id: otpRecord.id }, data: { used: true } });
      return NextResponse.json({ message: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    // Mark OTP used
    await prisma.otpVerification.update({ where: { id: otpRecord.id }, data: { used: true } });

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

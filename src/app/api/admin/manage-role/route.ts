import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only Main Admin (Primary Superadmin) can add/remove other admins
    const isMainAdmin = session.user.email === process.env.ADMIN_EMAIL;
    if (!isMainAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only the primary Main Admin can manage administrator access." },
        { status: 403 }
      );
    }

    const { email, role, action } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "User email is required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      return NextResponse.json({ message: "No account found with this email" }, { status: 404 });
    }

    // Cannot demote or alter the Primary Main Admin
    if (targetUser.email === process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { message: "Cannot modify primary Super Admin account" },
        { status: 400 }
      );
    }

    const targetRole = action === "remove" ? "user" : (role || "admin");

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: targetRole },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({
      message:
        targetRole === "admin"
          ? `Successfully granted Admin access to ${updatedUser.name || updatedUser.email}!`
          : `Admin access removed for ${updatedUser.name || updatedUser.email}.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Manage Admin error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  try {
    const { id, newName } = await req.json();
    if (!id || !newName) return NextResponse.json({ message: "ID and new name required" }, { status: 400 });

    const file = await prisma.file.updateMany({
      where: { id, userId: user.id },
      data: { name: newName }
    });

    if (file.count === 0) return NextResponse.json({ message: "File not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rename file error:", error);
    return NextResponse.json({ message: "Error renaming file" }, { status: 500 });
  }
}

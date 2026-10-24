import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

  try {
    const file = await prisma.file.findUnique({ where: { id, userId: user.id } });
    if (!file) return NextResponse.json({ message: "File not found" }, { status: 404 });

    // Remove from physical disk
    if (existsSync(file.path)) {
      await unlink(file.path);
    }

    // Delete from DB
    await prisma.file.delete({ where: { id } });

    // Update storage
    await prisma.user.update({
      where: { id: user.id },
      data: { storageUsed: { decrement: file.size } }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json({ message: "Error deleting file" }, { status: 500 });
  }
}

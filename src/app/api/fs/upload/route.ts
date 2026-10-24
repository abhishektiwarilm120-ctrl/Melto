import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const fileSize = file.size;

    // Check storage limit
    if (user.storageUsed + fileSize > user.storageLimit) {
      return NextResponse.json({ message: "Storage limit exceeded" }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure storage directory exists
    const storageDir = path.join(process.cwd(), "storage", user.id);
    if (!existsSync(storageDir)) {
      await mkdir(storageDir, { recursive: true });
    }

    const uniqueFilename = `${Date.now()}-${file.name}`;
    const filePath = path.join(storageDir, uniqueFilename);
    
    await writeFile(filePath, buffer);

    const dbFile = await prisma.file.create({
      data: {
        name: file.name,
        size: fileSize,
        type: file.type || "application/octet-stream",
        path: filePath,
        userId: user.id,
        folderId: folderId || null,
      }
    });

    // Update user storage
    await prisma.user.update({
      where: { id: user.id },
      data: { storageUsed: { increment: fileSize } }
    });

    return NextResponse.json(dbFile);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Error uploading file" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

// Helper: recursively delete all files inside a folder and its subfolders
async function deleteFolderContents(folderId: string, userId: string): Promise<number> {
  let freedSpace = 0;

  // Get all files in this folder
  const files = await prisma.file.findMany({
    where: { folderId, userId }
  });

  for (const file of files) {
    if (existsSync(file.path)) {
      try { await unlink(file.path); } catch (_) {}
    }
    freedSpace += file.size;
  }

  // Delete all files in DB
  await prisma.file.deleteMany({ where: { folderId, userId } });

  // Get all subfolders
  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId, userId }
  });

  for (const subfolder of subfolders) {
    freedSpace += await deleteFolderContents(subfolder.id, userId);
    await prisma.folder.delete({ where: { id: subfolder.id } });
  }

  return freedSpace;
}

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
    const { name, parentId } = await req.json();

    if (!name) {
      return NextResponse.json({ message: "Folder name required" }, { status: 400 });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        userId: user.id,
        parentId: parentId || null
      }
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Create folder error:", error);
    return NextResponse.json({ message: "Error creating folder" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

  try {
    const folder = await prisma.folder.findUnique({ where: { id, userId: user.id } });
    if (!folder) return NextResponse.json({ message: "Folder not found" }, { status: 404 });

    // Recursively delete all files and subfolders, and calculate freed space
    const freedSpace = await deleteFolderContents(id, user.id);

    // Delete the folder itself
    await prisma.folder.delete({ where: { id } });

    // Update user storage
    if (freedSpace > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { storageUsed: { decrement: freedSpace } }
      });
    }

    return NextResponse.json({ success: true, freedSpace });
  } catch (error) {
    console.error("Delete folder error:", error);
    return NextResponse.json({ message: "Error deleting folder" }, { status: 500 });
  }
}

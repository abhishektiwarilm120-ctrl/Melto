import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const url = new URL(req.url);
  const folderId = url.searchParams.get("folderId");
  const parsedFolderId = folderId ? folderId : null;

  const folders = await prisma.folder.findMany({
    where: { userId: user.id, parentId: parsedFolderId },
    select: { id: true, name: true }
  });

  const files = await prisma.file.findMany({
    where: { userId: user.id, folderId: parsedFolderId },
    select: { id: true, name: true, size: true }
  });

  const items = [
    ...folders.map(f => ({ ...f, type: "folder" })),
    ...files.map(f => ({ ...f, type: "file" }))
  ];

  return NextResponse.json({ items, storageUsed: user.storageUsed });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import mime from "mime";

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
  const id = url.searchParams.get("id");
  const action = url.searchParams.get("action") || "download";

  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

  try {
    const file = await prisma.file.findUnique({
      where: { id, userId: user.id }
    });

    if (!file) return NextResponse.json({ message: "File not found" }, { status: 404 });

    if (!existsSync(file.path)) {
      return NextResponse.json({ message: "Physical file not found on disk" }, { status: 404 });
    }

    const fileBuffer = await readFile(file.path);
    const mimeType = file.type || mime.getType(file.name) || 'application/octet-stream';

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    
    if (action === "view") {
      headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);
    } else {
      headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
    }
    
    headers.set("Content-Length", file.size.toString());

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ message: "Error downloading file" }, { status: 500 });
  }
}

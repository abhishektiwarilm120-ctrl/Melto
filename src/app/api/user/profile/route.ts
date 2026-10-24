import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateUsernameFromName(name: string | null, email: string): string {
  const base = (name || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15) || "user";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}${randomSuffix}`;
}

// GET — fetch current user profile (with auto-generated username if missing)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      avatar: true,
      storageUsed: true,
      storageLimit: true,
      createdAt: true
    }
  });

  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  // If user doesn't have a unique username yet, auto assign one
  if (!user.username) {
    let uniqueUser = generateUsernameFromName(user.name, user.email);
    // ensure uniqueness
    let exists = await prisma.user.findUnique({ where: { username: uniqueUser } });
    while (exists) {
      uniqueUser = generateUsernameFromName(user.name, user.email);
      exists = await prisma.user.findUnique({ where: { username: uniqueUser } });
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: { username: uniqueUser },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        avatar: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true
      }
    });
  }

  return NextResponse.json(user);
}

// PUT — update name, phone, avatar, username
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { name, phone, avatar, username } = await req.json();

  // If username is being changed, ensure it's unique
  if (username) {
    const existing = await prisma.user.findFirst({
      where: {
        username,
        NOT: { email: session.user.email }
      }
    });
    if (existing) {
      return NextResponse.json({ message: "Username already taken! Choose another one." }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(avatar !== undefined && { avatar }),
      ...(username !== undefined && { username: username.toLowerCase().replace(/[^a-z0-9_]/g, "") }),
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      avatar: true,
      storageUsed: true,
      storageLimit: true,
      createdAt: true
    }
  });

  return NextResponse.json(updated);
}

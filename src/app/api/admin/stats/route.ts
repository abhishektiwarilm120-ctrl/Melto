import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getCategory(type: string, name: string): string {
  const t = (type || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (t.includes("image") || /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic)$/.test(n)) return "Photos";
  if (t.includes("video") || /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/.test(n)) return "Videos";
  if (t.includes("audio") || /\.(mp3|wav|aac|flac|ogg|m4a)$/.test(n)) return "Audio";
  if (t.includes("pdf") || n.endsWith(".pdf")) return "PDF";
  if (t.includes("word") || /\.(doc|docx)$/.test(n)) return "Word Docs";
  if (t.includes("excel") || t.includes("sheet") || /\.(xls|xlsx|csv)$/.test(n)) return "Excel/CSV";
  if (t.includes("zip") || t.includes("rar") || /\.(zip|rar|7z|tar|gz)$/.test(n)) return "Archives";
  if (t.includes("text") || /\.(txt|md|log)$/.test(n)) return "Text Files";
  return "Other";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, username: true, role: true, avatar: true }
  });

  if (!currentUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const isMainAdmin = currentUser.email === process.env.ADMIN_EMAIL;
  const isAdmin = isMainAdmin || currentUser.role === "admin" || currentUser.role === "superadmin";

  if (!isAdmin) {
    return NextResponse.json({ message: "Forbidden: Admins only" }, { status: 403 });
  }

  try {
    // Fetch Admin's own profile info
    const adminUser = currentUser;

    // All users with full details
    const allUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        password: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { files: true, folders: true } },
      }
    });

    // All files with user info
    const allFiles = await prisma.file.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        createdAt: true,
        user: { select: { name: true, email: true } }
      }
    });

    const totalUsers = allUsers.length;
    const totalAdmins = allUsers.filter(u => u.email === process.env.ADMIN_EMAIL || u.role === "admin" || u.role === "superadmin").length;
    const totalFiles = allFiles.length;
    const totalFolders = await prisma.folder.count();
    const totalStorageUsed = allUsers.reduce((sum, u) => sum + u.storageUsed, 0);

    // Website-wide file category breakdown
    const categoryBreakdown: Record<string, { count: number; size: number }> = {};
    for (const file of allFiles) {
      const cat = getCategory(file.type, file.name);
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, size: 0 };
      categoryBreakdown[cat].count += 1;
      categoryBreakdown[cat].size += file.size;
    }

    // Per-user file category breakdown
    const userFilesMap: Record<string, { category: string; count: number; size: number }[]> = {};
    for (const file of allFiles) {
      const email = file.user?.email || "unknown";
      if (!userFilesMap[email]) userFilesMap[email] = [];
      const cat = getCategory(file.type, file.name);
      const existing = userFilesMap[email].find(x => x.category === cat);
      if (existing) { existing.count++; existing.size += file.size; }
      else userFilesMap[email].push({ category: cat, count: 1, size: file.size });
    }

    // Ensure all users have a fallback username if null
    const enrichedUsers = await Promise.all(allUsers.map(async (u) => {
      let finalUsername = u.username;
      if (!finalUsername) {
        const base = (u.name || u.email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "user";
        finalUsername = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
        try {
          await prisma.user.update({
            where: { id: u.id },
            data: { username: finalUsername }
          });
        } catch (_) {}
      }

      return {
        ...u,
        username: finalUsername,
        fileBreakdown: userFilesMap[u.email] || []
      };
    }));

    return NextResponse.json({
      adminProfile: {
        ...adminUser,
        isMainAdmin,
      },
      isMainAdmin,
      totalAdmins,
      totalUsers,
      totalFiles,
      totalFolders,
      totalStorageUsed,
      categoryBreakdown,
      allUsers: enrichedUsers.map(u => ({
        ...u,
        isMainAdmin: u.email === process.env.ADMIN_EMAIL,
        isAdmin: u.email === process.env.ADMIN_EMAIL || u.role === "admin" || u.role === "superadmin",
      })),
      recentFiles: allFiles.slice(0, 20),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

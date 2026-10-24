"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/* ─── Types ─────────────────────────────────────────── */
type FileCat = { category: string; count: number; size: number };
type UserRow = {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone: string | null;
  role?: string;
  isMainAdmin?: boolean;
  isAdmin?: boolean;
  avatar: string | null;
  password: string;
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
  updatedAt: string;
  _count: { files: number; folders: number };
  fileBreakdown: FileCat[];
};
type FileRow = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  user: { name: string; email: string };
};
type Stats = {
  adminProfile?: {
    name?: string | null;
    email?: string | null;
    username?: string | null;
    avatar?: string | null;
    isMainAdmin?: boolean;
    role?: string;
  };
  isMainAdmin: boolean;
  totalAdmins: number;
  totalUsers: number;
  totalFiles: number;
  totalFolders: number;
  totalStorageUsed: number;
  categoryBreakdown: Record<string, { count: number; size: number }>;
  allUsers: UserRow[];
  recentFiles: FileRow[];
};

/* ─── Helpers ────────────────────────────────────────── */
function fmtSize(b: number) {
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(2) + " GB";
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(2) + " MB";
  if (b >= 1024) return (b / 1024).toFixed(1) + " KB";
  return b + " B";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function getAvatarUrl(avatarStr: string | null | undefined): string {
  if (!avatarStr) {
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4`;
  }
  const parts = avatarStr.split(":");
  const style = parts[0] || "adventurer";
  const seed = parts[1] || "Felix";
  return `https://api.dicebear.com/9.x/${encodeURIComponent(style)}/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

const CAT_EMOJI: Record<string, string> = {
  Photos: "🖼️",
  Videos: "🎬",
  Audio: "🎵",
  PDF: "📄",
  "Word Docs": "📝",
  "Excel/CSV": "📊",
  Archives: "🗜️",
  "Text Files": "📃",
  Other: "📦",
};

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
];

/* ─── Main Component ─────────────────────────────────── */
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "users" | "files" | "admins">("overview");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  /* Add Admin Modal State */
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchStats();
  }, [status]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setError("🚫 Access Denied — Administrator access required.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Error loading system metrics.");
        setLoading(false);
        return;
      }
      setStats(await res.json());
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  /* Promote or Demote Admin */
  const handleRoleChange = async (email: string, action: "add" | "remove") => {
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch("/api/admin/manage-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action, role: action === "add" ? "admin" : "user" }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✅ ${data.message}`);
        await fetchStats();
        setTimeout(() => {
          setIsAddAdminOpen(false);
          setTargetEmail("");
          setActionMessage("");
        }, 1500);
      } else {
        setActionMessage(`❌ ${data.message || "Failed to update role"}`);
      }
    } catch {
      setActionMessage("❌ Network error");
    }
    setActionLoading(false);
  };

  /* Loading */
  if (status === "loading" || loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>⚙️</div>
        <p style={{ opacity: 0.7, fontSize: 16 }}>Loading Admin Panel...</p>
      </div>
    );

  /* Access Denied */
  if (error)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 16,
          textAlign: "center",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 64 }}>🚫</div>
        <h2 style={{ color: "#ef4444" }}>{error}</h2>
        <button onClick={() => router.push("/dashboard")} className="btn-secondary">
          ← Back to Dashboard
        </button>
      </div>
    );

  if (!stats) return null;

  const isMainAdmin = stats.isMainAdmin || stats.adminProfile?.isMainAdmin;
  const adminUsersList = stats.allUsers.filter((u) => u.isAdmin || u.isMainAdmin);

  const catEntries = Object.entries(stats.categoryBreakdown).sort(
    (a, b) => b[1].count - a[1].count
  );
  const maxCount = Math.max(...catEntries.map(([, v]) => v.count), 1);
  const filteredUsers = stats.allUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
  );

  return (
    <div style={{ minHeight: "100vh", padding: "20px 24px", maxWidth: 1300, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div
        className="admin-header-card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 16,
          padding: "20px 24px",
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border-color)",
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <img
              src={getAvatarUrl(stats.adminProfile?.avatar)}
              alt="Admin Avatar"
              width={58}
              height={58}
              style={{
                borderRadius: "50%",
                border: isMainAdmin ? "3px solid #f59e0b" : "3px solid #8b5cf6",
                background: "#fff",
                boxShadow: isMainAdmin
                  ? "0 4px 20px rgba(245, 158, 11, 0.45)"
                  : "0 4px 15px rgba(139, 92, 246, 0.4)",
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                background: isMainAdmin
                  ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                  : "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 900,
                padding: "2px 7px",
                borderRadius: 8,
                border: "1px solid #fff",
                letterSpacing: 0.5,
              }}
            >
              {isMainAdmin ? "MAIN SUPERADMIN" : "ADMIN"}
            </span>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>
                {stats.adminProfile?.name || session?.user?.name || "Admin"}
              </h1>
              {stats.adminProfile?.username && (
                <span
                  style={{
                    fontSize: 12,
                    background: "rgba(139,92,246,0.15)",
                    color: "#8b5cf6",
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontWeight: 700,
                    border: "1px solid rgba(139,92,246,0.3)",
                  }}
                >
                  @{stats.adminProfile.username}
                </span>
              )}
            </div>
            <p style={{ margin: "3px 0 0", opacity: 0.75, fontSize: 13 }}>
              📧 <strong>{stats.adminProfile?.email || session?.user?.email}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Main Admin Only "Add Admin" Action Button */}
          {isMainAdmin && (
            <button
              onClick={() => {
                setActionMessage("");
                setIsAddAdminOpen(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.35)",
              }}
            >
              ➕ Add Admin Access
            </button>
          )}

          <button onClick={fetchStats} className="btn-secondary" style={{ fontSize: 13, borderRadius: 10 }}>
            🔄 Refresh
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-secondary"
            style={{ fontSize: 13, borderRadius: 10 }}
          >
            📁 My Files
          </button>
          <button
            onClick={() => signOut()}
            className="btn-secondary"
            style={{ fontSize: 13, color: "#ef4444", borderRadius: 10 }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Stat Cards (Including Total Admins) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          {
            label: "Total Admins",
            value: stats.totalAdmins,
            icon: "🛡️",
            color: "#f59e0b",
            subtitle: isMainAdmin ? "1 SuperAdmin + Delegated" : "System Administrators",
          },
          { label: "Total Users", value: stats.totalUsers, icon: "👥", color: "#3b82f6", subtitle: "Active accounts" },
          { label: "Total Files", value: stats.totalFiles, icon: "📄", color: "#10b981", subtitle: "Cloud files stored" },
          { label: "Total Folders", value: stats.totalFolders, icon: "📁", color: "#06b6d4", subtitle: "Directory trees" },
          {
            label: "Total Storage Used",
            value: fmtSize(stats.totalStorageUsed),
            icon: "💾",
            color: "#8b5cf6",
            subtitle: "Global quota taken",
          },
          {
            label: "Photos Stored",
            value: stats.categoryBreakdown["Photos"]?.count ?? 0,
            icon: "🖼️",
            color: "#ec4899",
            subtitle: fmtSize(stats.categoryBreakdown["Photos"]?.size ?? 0),
          },
        ].map((c) => (
          <div
            key={c.label}
            className="admin-stat-card"
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--border-color)",
              borderRadius: 18,
              padding: "20px",
              borderLeft: `5px solid ${c.color}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 28 }}>{c.icon}</div>
              <span
                style={{
                  fontSize: 10,
                  color: c.color,
                  fontWeight: 800,
                  background: `${c.color}15`,
                  padding: "2px 8px",
                  borderRadius: 8,
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.color, marginTop: 10 }}>{c.value}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{c.label}</div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{c.subtitle}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["overview", "admins", "users", "files"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: `1px solid ${tab === t ? "var(--primary-color)" : "var(--border-color)"}`,
              background: tab === t ? "var(--primary-color)" : "var(--glass-bg)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: tab === t ? 700 : 400,
              fontSize: 13,
            }}
          >
            {t === "overview"
              ? "📊 Overview"
              : t === "admins"
              ? `🛡️ Admins List (${stats.totalAdmins})`
              : t === "users"
              ? `👥 All Users Info (${stats.totalUsers})`
              : "📄 Recent Files"}
          </button>
        ))}
      </div>

      {/* ══════════════ OVERVIEW TAB ══════════════ */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* File Type Breakdown */}
          <div
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 18px", fontSize: 16 }}>📊 File Type Breakdown (Website-wide)</h3>
            {catEntries.length === 0 ? (
              <p style={{ opacity: 0.5, textAlign: "center" }}>No files uploaded yet</p>
            ) : (
              catEntries.map(([cat, data], i) => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                      fontSize: 13,
                    }}
                  >
                    <span>
                      {CAT_EMOJI[cat] || "📦"} {cat}
                    </span>
                    <span style={{ opacity: 0.65 }}>
                      {data.count} files · {fmtSize(data.size)}
                    </span>
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      height: 9,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(data.count / maxCount) * 100}%`,
                        height: "100%",
                        background: COLORS[i % COLORS.length],
                        borderRadius: 8,
                        transition: "width .5s",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Top Storage Users */}
          <div
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 18px", fontSize: 16 }}>💾 Storage Usage Per User</h3>
            {stats.allUsers.slice(0, 8).map((u, i) => {
              const pct = Math.min((u.storageUsed / u.storageLimit) * 100, 100);
              return (
                <div key={u.id} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      #{i + 1} {u.name || u.email.split("@")[0]}
                      {u.isMainAdmin ? " (Main Admin)" : u.isAdmin ? " (Admin)" : ""}
                    </span>
                    <span style={{ opacity: 0.65, fontSize: 12 }}>
                      {fmtSize(u.storageUsed)} / {fmtSize(u.storageLimit)}
                    </span>
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      height: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 8,
                        background: pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#10b981",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ ADMINS MANAGEMENT TAB ══════════════ */}
      {tab === "admins" && (
        <div
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 18,
            overflow: "hidden",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>🛡️ Designated Administrators ({adminUsersList.length})</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.65 }}>
                {isMainAdmin
                  ? "As the Primary Superadmin, you can grant or revoke admin access for any registered user."
                  : "Listing of users holding administrative dashboard clearance."}
              </p>
            </div>
            {isMainAdmin && (
              <button
                onClick={() => {
                  setActionMessage("");
                  setIsAddAdminOpen(true);
                }}
                className="btn-primary"
                style={{ width: "auto", fontSize: 13, padding: "8px 16px" }}
              >
                + Add Another Admin
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {adminUsersList.map((adm) => (
              <div
                key={adm.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.03)",
                  border: adm.isMainAdmin ? "1px solid rgba(245,158,11,0.5)" : "1px solid var(--border-color)",
                  borderRadius: 14,
                  padding: "16px 20px",
                  flexWrap: "wrap",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <img
                    src={getAvatarUrl(adm.avatar)}
                    alt="avatar"
                    width={48}
                    height={48}
                    style={{ borderRadius: "50%", background: "#fff", objectFit: "cover" }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                      {adm.name || "Administrator"}
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 800,
                          background: adm.isMainAdmin ? "#f59e0b" : "#8b5cf6",
                          color: "#fff",
                        }}
                      >
                        {adm.isMainAdmin ? "SUPERADMIN (PRIMARY)" : "DELEGATED ADMIN"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                      ✉️ {adm.email} {adm.phone ? `• 📱 +91 ${adm.phone}` : ""}
                    </div>
                  </div>
                </div>

                {/* Revoke Option (Only Main Admin can revoke delegated admins) */}
                {isMainAdmin && !adm.isMainAdmin && (
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to remove Admin privileges for ${adm.name || adm.email}?`)) {
                        handleRoleChange(adm.email, "remove");
                      }
                    }}
                    disabled={actionLoading}
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Revoke Admin Rights
                  </button>
                )}
                {adm.isMainAdmin && (
                  <span style={{ fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
                    Primary Account (Owner)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ USERS TAB ══════════════ */}
      {tab === "users" && (
        <div>
          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <input
              className="input-field"
              placeholder="🔍 Search by Name, Email, Phone, Username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 420, fontSize: 14 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredUsers.map((u) => {
              const isExpanded = expandedUser === u.id;
              const pct = Math.min((u.storageUsed / u.storageLimit) * 100, 100);
              const userAvatarUrl = getAvatarUrl(u.avatar);

              return (
                <div
                  key={u.id}
                  style={{
                    background: "var(--glass-bg)",
                    border: u.isMainAdmin
                      ? "1px solid rgba(245, 158, 11, 0.6)"
                      : u.isAdmin
                      ? "1px solid rgba(139, 92, 246, 0.5)"
                      : "1px solid var(--border-color)",
                    borderRadius: 18,
                    overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  }}
                >
                  {/* User Summary Header Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1.3fr 1fr 1fr 1fr auto",
                      gap: 16,
                      padding: "16px 20px",
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                  >
                    {/* 1. Cartoon/Superhero Avatar */}
                    <div style={{ position: "relative" }}>
                      <img
                        src={userAvatarUrl}
                        alt="avatar"
                        width={48}
                        height={48}
                        style={{
                          borderRadius: "50%",
                          border: u.isMainAdmin
                            ? "2.5px solid #f59e0b"
                            : u.isAdmin
                            ? "2.5px solid #8b5cf6"
                            : "2px solid var(--primary-color)",
                          background: "#fff",
                          objectFit: "cover",
                        }}
                      />
                    </div>

                    {/* 2. Personal Info (Name, Username, Email, Admin Badge) */}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {u.name || "Unnamed User"}
                        {u.isMainAdmin ? (
                          <span
                            style={{
                              fontSize: 10,
                              background: "rgba(245,158,11,0.2)",
                              color: "#f59e0b",
                              padding: "2px 7px",
                              borderRadius: 6,
                              fontWeight: 800,
                              border: "1px solid rgba(245,158,11,0.4)",
                            }}
                          >
                            MAIN ADMIN
                          </span>
                        ) : u.isAdmin ? (
                          <span
                            style={{
                              fontSize: 10,
                              background: "rgba(139,92,246,0.2)",
                              color: "#8b5cf6",
                              padding: "2px 7px",
                              borderRadius: 6,
                              fontWeight: 800,
                              border: "1px solid rgba(139,92,246,0.4)",
                            }}
                          >
                            ADMIN
                          </span>
                        ) : null}
                      </div>
                      <div style={{ marginTop: 2 }}>
                        <span
                          style={{
                            fontSize: 12,
                            background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))",
                            color: "var(--primary-color)",
                            padding: "2px 8px",
                            borderRadius: 8,
                            fontWeight: 700,
                            border: "1px solid rgba(59,130,246,0.3)",
                            display: "inline-block",
                          }}
                        >
                          @{u.username || "username"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                        ✉️ {u.email}
                      </div>
                    </div>

                    {/* 3. Mobile Number */}
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.55, textTransform: "uppercase", fontWeight: 700 }}>
                        Mobile Phone
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                        {u.phone ? `📱 +91 ${u.phone}` : <span style={{ opacity: 0.4 }}>Not provided</span>}
                      </div>
                    </div>

                    {/* 4. Files & Folders */}
                    <div style={{ fontSize: 13 }}>
                      <div>📄 {u._count.files} Files</div>
                      <div style={{ opacity: 0.75, marginTop: 2 }}>📁 {u._count.folders} Folders</div>
                    </div>

                    {/* 5. Storage Percentage */}
                    <div>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>
                        {fmtSize(u.storageUsed)} / {fmtSize(u.storageLimit)}
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, height: 7 }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: 7,
                            borderRadius: 8,
                            background: pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#10b981",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 3 }}>{pct.toFixed(1)}% used</div>
                    </div>

                    {/* Expand Arrow */}
                    <div style={{ fontSize: 18, opacity: 0.7 }}>{isExpanded ? "🔼" : "🔽"}</div>
                  </div>

                  {/* ── Expanded Full Personal Details & Uploads ── */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: "1px solid var(--border-color)",
                        padding: "20px",
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr",
                        gap: 24,
                        background: "rgba(0,0,0,0.15)",
                      }}
                    >
                      {/* Left: Complete Personal Info */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <h4 style={{ margin: 0, fontSize: 14 }}>👤 Personal & Security Details</h4>
                          {/* Quick Admin Action from inside card */}
                          {isMainAdmin && !u.isMainAdmin && (
                            <button
                              onClick={() => handleRoleChange(u.email, u.isAdmin ? "remove" : "add")}
                              disabled={actionLoading}
                              style={{
                                background: u.isAdmin ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                                color: u.isAdmin ? "#ef4444" : "#10b981",
                                border: u.isAdmin ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(16,185,129,0.4)",
                                borderRadius: 8,
                                padding: "4px 12px",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {u.isAdmin ? "Revoke Admin Rights" : "+ Make this user Admin"}
                            </button>
                          )}
                        </div>

                        <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
                          <tbody>
                            {[
                              [
                                "Avatar Preview",
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <img
                                    src={userAvatarUrl}
                                    alt="avatar"
                                    width={44}
                                    height={44}
                                    style={{ borderRadius: "50%", background: "#fff" }}
                                  />
                                  <span style={{ fontSize: 12, opacity: 0.8, fontFamily: "monospace" }}>
                                    {u.avatar || "adventurer:Felix (Default)"}
                                  </span>
                                </div>,
                              ],
                              ["Role", u.isMainAdmin ? "Primary Superadmin" : u.isAdmin ? "Administrator" : "Standard User"],
                              ["Full Name", u.name || "—"],
                              ["Unique Username", u.username ? `@${u.username}` : "—"],
                              ["Login Email", u.email],
                              ["Mobile Number", u.phone ? `+91 ${u.phone}` : "No mobile linked"],
                              ["User ID", <span style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.7 }}>{u.id}</span>],
                              ["Joined Date", fmtDate(u.createdAt)],
                              ["Last Updated", fmtDate(u.updatedAt)],
                            ].map(([label, val]) => (
                              <tr key={String(label)} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td
                                  style={{
                                    padding: "8px 0",
                                    opacity: 0.65,
                                    width: 140,
                                    verticalAlign: "middle",
                                    fontWeight: 500,
                                  }}
                                >
                                  {label}
                                </td>
                                <td style={{ padding: "8px 0", fontWeight: 600 }}>{val as any}</td>
                              </tr>
                            ))}
                            {/* Password Row */}
                            <tr>
                              <td style={{ padding: "8px 0", opacity: 0.65, verticalAlign: "middle" }}>
                                Password (Hash)
                              </td>
                              <td style={{ padding: "8px 0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: 11,
                                      wordBreak: "break-all",
                                      opacity: 0.85,
                                    }}
                                  >
                                    {showPass[u.id] ? u.password : "••••••••••••••••••••••••••••••••"}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setShowPass((p) => ({ ...p, [u.id]: !p[u.id] }))
                                    }
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: 14,
                                      opacity: 0.7,
                                    }}
                                  >
                                    {showPass[u.id] ? "🙈" : "👁️"}
                                  </button>
                                </div>
                                <div style={{ fontSize: 10, opacity: 0.45, marginTop: 3 }}>
                                  Bcrypt secured hash (Original password is cryptographically protected)
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Right: User's Storage & Uploads Breakdown */}
                      <div>
                        <h4 style={{ margin: "0 0 14px", fontSize: 14 }}>
                          📂 File Storage Breakdown for this User
                        </h4>
                        {u.fileBreakdown.length === 0 ? (
                          <p style={{ opacity: 0.5, fontSize: 13 }}>
                            This user has not uploaded any files yet.
                          </p>
                        ) : (
                          u.fileBreakdown
                            .sort((a, b) => b.count - a.count)
                            .map((cat, i) => (
                              <div key={cat.category} style={{ marginBottom: 12 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: 13,
                                    marginBottom: 4,
                                  }}
                                >
                                  <span>
                                    {CAT_EMOJI[cat.category] || "📦"} {cat.category}
                                  </span>
                                  <span style={{ opacity: 0.75 }}>
                                    {cat.count} files · {fmtSize(cat.size)}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    background: "rgba(255,255,255,0.08)",
                                    borderRadius: 6,
                                    height: 7,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${
                                        (cat.count /
                                          Math.max(...u.fileBreakdown.map((x) => x.count), 1)) *
                                        100
                                      }%`,
                                      height: 7,
                                      borderRadius: 6,
                                      background: COLORS[i % COLORS.length],
                                    }}
                                  />
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <p style={{ textAlign: "center", opacity: 0.5, padding: 32 }}>No users found matching your search</p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ FILES TAB ══════════════ */}
      {tab === "files" && (
        <div
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              📄 Recent Uploads ({stats.totalFiles} total)
            </h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                  {["#", "File Name", "Type", "Size", "Uploaded By", "Date"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "11px 16px",
                        textAlign: "left",
                        opacity: 0.6,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentFiles.map((f, i) => (
                  <tr
                    key={f.id}
                    style={{
                      borderTop: "1px solid var(--border-color)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <td style={{ padding: "11px 16px", opacity: 0.4 }}>{i + 1}</td>
                    <td
                      style={{
                        padding: "11px 16px",
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: 600,
                      }}
                    >
                      {f.name}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                      >
                        {f.type?.split("/")[1]?.toUpperCase() || "FILE"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", opacity: 0.7 }}>{fmtSize(f.size)}</td>
                    <td style={{ padding: "11px 16px", opacity: 0.7 }}>
                      {f.user?.name || f.user?.email}
                    </td>
                    <td style={{ padding: "11px 16px", opacity: 0.55, whiteSpace: "nowrap" }}>
                      {fmtDate(f.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: ADD ADMIN ══════════════ */}
      {isAddAdminOpen && (
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal" style={{ maxWidth: 440, width: "95%" }}>
            <h2 style={{ marginBottom: 6 }}>➕ Grant Administrator Access</h2>
            <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
              Enter the email address of a registered user. They will immediately receive access to the Melto Admin Panel.
            </p>

            {actionMessage && (
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: actionMessage.startsWith("✅") ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  color: actionMessage.startsWith("✅") ? "#10b981" : "#ef4444",
                }}
              >
                {actionMessage}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (targetEmail) handleRoleChange(targetEmail, "add");
              }}
            >
              <div className="input-group" style={{ marginBottom: 18 }}>
                <label className="input-label">User Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="e.g. colleague@example.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIsAddAdminOpen(false);
                    setTargetEmail("");
                    setActionMessage("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: "auto" }}
                  disabled={actionLoading || !targetEmail}
                >
                  {actionLoading ? "Granting Access..." : "Grant Admin Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

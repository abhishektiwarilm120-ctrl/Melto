"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/* ─── Types ─────────────────────────────────────────── */
type Item = { id: string; name: string; type: "folder" | "file"; size?: number };
type UserProfile = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
};

/* ─── Avatar Config ──────────────────────────────────── */
const AVATAR_STYLES = [
  { id: "adventurer",         label: "🧑 Cartoon",     emoji: "🧑" },
  { id: "adventurer-neutral", label: "😊 Cute",        emoji: "😊" },
  { id: "avataaars",          label: "👦 Avataaars",    emoji: "👦" },
  { id: "big-ears",           label: "🐰 Big Ears",     emoji: "🐰" },
  { id: "bottts",             label: "🤖 Robot",        emoji: "🤖" },
  { id: "croodles",           label: "🎨 Doodle",       emoji: "🎨" },
  { id: "fun-emoji",          label: "😎 Fun Emoji",    emoji: "😎" },
  { id: "lorelei",            label: "👸 Princess",     emoji: "👸" },
  { id: "micah",              label: "🦸 Superhero",    emoji: "🦸" },
  { id: "miniavs",            label: "🎮 Pixel",        emoji: "🎮" },
  { id: "open-peeps",         label: "🧍 Peeps",        emoji: "🧍" },
  { id: "pixel-art",          label: "👾 8-Bit Art",    emoji: "👾" },
];

const AVATAR_SEEDS = [
  "Batman", "Spiderman", "Superman", "Ironman", "Thor", "Hulk", "Loki", "Flash", 
  "Felix", "Max", "Leo", "Sam", "Alex", "Jordan", "Riley", "Casey", "Morgan", "Sky", "River", "Ace"
];

function getAvatarUrl(avatarStr: string | null | undefined): string {
  if (!avatarStr) {
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4`;
  }
  const parts = avatarStr.split(":");
  const style = parts[0] || "adventurer";
  const seed = parts[1] || "Felix";
  return `https://api.dicebear.com/9.x/${encodeURIComponent(style)}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

function fmtSize(b: number) {
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(2) + " GB";
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(2) + " MB";
  if (b >= 1024) return (b / 1024).toFixed(1) + " KB";
  return b + " B";
}

/* ════════════════════════════════════════════════════════
   Main Dashboard
════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  /* File system state */
  const [items, setItems] = useState<Item[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const STORAGE_LIMIT = 419430400;

  /* Modals */
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameItemId, setRenameItemId] = useState("");
  const [renameItemType, setRenameItemType] = useState<"folder" | "file">("folder");
  const [renameItemName, setRenameItemName] = useState("");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<Item | null>(null);

  /* Profile */
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  /* Avatar picker */
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [pickerStyle, setPickerStyle] = useState("adventurer");
  const [pickerSeed, setPickerSeed] = useState("Felix");
  const [customSeedInput, setCustomSeedInput] = useState("");

  const profilePanelRef = useRef<HTMLDivElement>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      loadData();
      fetchProfile();
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [currentFolderId]);

  /* ── Close profile on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profilePanelRef.current && !profilePanelRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isProfileOpen]);

  /* ── API Calls ── */
  const loadData = async () => {
    try {
      const res = await fetch(`/api/fs?folderId=${currentFolderId || ""}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
        setStorageUsed(data.storageUsed);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditName(data.name || "");
        setEditUsername(data.username || "");
        setEditPhone(data.phone || "");
        if (data.avatar) {
          const [s, sd] = data.avatar.split(":");
          if (s) setPickerStyle(s);
          if (sd) setPickerSeed(sd);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          username: editUsername,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setProfileMsg("✅ Changes Saved Successfully!");
      } else {
        setProfileMsg(data.message || "❌ Error saving changes");
      }
    } catch {
      setProfileMsg("❌ Network error");
    }
    setProfileSaving(false);
    setTimeout(() => setProfileMsg(""), 4000);
  };

  const saveAvatar = async () => {
    const currentSeed = customSeedInput.trim() || pickerSeed;
    const avatarStr = `${pickerStyle}:${currentSeed}`;
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarStr }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setIsAvatarPickerOpen(false);
        setProfileMsg("✅ Avatar updated!");
        setTimeout(() => setProfileMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* ── File System Handlers ── */
  const handleStepBack = () => {
    if (!folderHistory.length) return;
    const h = [...folderHistory];
    const prev = h.pop();
    setFolderHistory(h);
    setCurrentFolderId(prev === "root" ? null : prev || null);
  };

  const handleHome = () => {
    setFolderHistory([]);
    setCurrentFolderId(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    await fetch("/api/fs/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName, parentId: currentFolderId }),
    });
    setIsFolderModalOpen(false);
    setNewFolderName("");
    loadData();
  };

  const handleUploadFile = async () => {
    if (!uploadFile) return;
    const fd = new FormData();
    fd.append("file", uploadFile);
    if (currentFolderId) fd.append("folderId", currentFolderId);
    const res = await fetch("/api/fs/upload", { method: "POST", body: fd });
    if (res.status === 413) alert("Storage limit exceeded! Upgrade your plan.");
    setIsUploadModalOpen(false);
    setUploadFile(null);
    loadData();
  };

  const handleDelete = async (id: string, type: "folder" | "file") => {
    await fetch(`/api/fs/${type}?id=${id}`, { method: "DELETE" });
    loadData();
    if (isPreviewModalOpen && previewFile?.id === id) setIsPreviewModalOpen(false);
  };

  const handleRename = async () => {
    if (!renameItemName) return;
    await fetch(`/api/fs/${renameItemType}/rename`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: renameItemId, newName: renameItemName }),
    });
    setIsRenameModalOpen(false);
    loadData();
  };

  const openRenameModal = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameItemId(item.id);
    setRenameItemType(item.type);
    setRenameItemName(item.name);
    setIsRenameModalOpen(true);
  };

  if (status === "loading") return <div className="dashboard-container">Loading...</div>;

  const storagePercentage = Math.min((storageUsed / STORAGE_LIMIT) * 100, 100);
  const avatarUrl = getAvatarUrl(profile?.avatar);
  const currentPreviewSeed = customSeedInput.trim() || pickerSeed;

  return (
    <div className="dashboard-container">
      {/* ══════════ HEADER ══════════ */}
      <div className="header">
        <div>
          <h2>Welcome, {profile?.name || session?.user?.name || "User"}</h2>
          <div className="storage-bar-container">
            <div className="storage-bar" style={{ width: `${storagePercentage}%` }} />
          </div>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            {fmtSize(storageUsed)} / 400 MB used
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Admin button */}
          {(session?.user as any)?.isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                border: "none",
                fontSize: 13,
                padding: "9px 16px",
                borderRadius: 10,
                cursor: "pointer",
                color: "#fff",
                fontWeight: 700,
                boxShadow: "0 0 18px rgba(139,92,246,0.4)",
              }}
            >
              ⚙️ Admin
            </button>
          )}

          {/* Profile Avatar Button */}
          <div style={{ position: "relative" }} ref={profilePanelRef}>
            <button
              onClick={() => setIsProfileOpen((p) => !p)}
              style={{
                background: "var(--glass-bg)",
                border: "2px solid var(--primary-color)",
                borderRadius: "50%",
                padding: 2,
                cursor: "pointer",
                width: 48,
                height: 48,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
                transition: "transform 0.2s",
              }}
              title="My Account Details"
            >
              <img
                src={avatarUrl}
                alt="avatar"
                width={42}
                height={42}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
            </button>

            {/* ── Profile Dropdown Panel ── */}
            {isProfileOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 58,
                  width: 350,
                  zIndex: 200,
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(25px)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 22,
                  boxShadow: "0 25px 70px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                }}
              >
                {/* Profile Header Card */}
                <div
                  style={{
                    background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                    padding: "24px 20px 20px",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      width={84}
                      height={84}
                      style={{
                        borderRadius: "50%",
                        border: "3px solid #fff",
                        background: "#fff",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                      }}
                    />
                    <button
                      onClick={() => {
                        setIsAvatarPickerOpen(true);
                        setIsProfileOpen(false);
                      }}
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        background: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: 28,
                        height: 28,
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      }}
                      title="Change Avatar (Cartoon / Superhero / Mood)"
                    >
                      ✏️
                    </button>
                  </div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginTop: 10 }}>
                    {profile?.name || "User"}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      background: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      fontSize: 12,
                      padding: "2px 10px",
                      borderRadius: 12,
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    @{profile?.username || "username"}
                  </div>
                </div>

                {/* Account Details & Edit Form */}
                <div style={{ padding: "18px 20px" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      opacity: 0.55,
                      marginBottom: 12,
                      textTransform: "uppercase",
                      letterSpacing: 1.2,
                    }}
                  >
                    Personal Information
                  </div>

                  {/* Full Name */}
                  <div className="input-group" style={{ marginBottom: 12 }}>
                    <label className="input-label" style={{ fontSize: 12 }}>Full Name</label>
                    <input
                      className="input-field"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter full name"
                      style={{ fontSize: 13, padding: "8px 12px" }}
                    />
                  </div>

                  {/* Unique Username */}
                  <div className="input-group" style={{ marginBottom: 12 }}>
                    <label className="input-label" style={{ fontSize: 12 }}>
                      Unique Username (@)
                    </label>
                    <input
                      className="input-field"
                      value={editUsername}
                      onChange={(e) =>
                        setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      }
                      placeholder="unique_username"
                      style={{ fontSize: 13, padding: "8px 12px" }}
                    />
                  </div>

                  {/* Registered Email */}
                  <div className="input-group" style={{ marginBottom: 12 }}>
                    <label className="input-label" style={{ fontSize: 12 }}>
                      Email Address (Login ID)
                    </label>
                    <input
                      className="input-field"
                      value={profile?.email || session?.user?.email || ""}
                      disabled
                      style={{
                        fontSize: 13,
                        padding: "8px 12px",
                        opacity: 0.75,
                        cursor: "not-allowed",
                        background: "rgba(0,0,0,0.15)",
                      }}
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="input-group" style={{ marginBottom: 14 }}>
                    <label className="input-label" style={{ fontSize: 12 }}>Mobile Number</label>
                    <input
                      className="input-field"
                      value={editPhone}
                      onChange={(e) =>
                        setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      placeholder="10-digit mobile number"
                      style={{ fontSize: 13, padding: "8px 12px" }}
                      maxLength={10}
                    />
                  </div>

                  {/* Storage Bar */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span>💾 Storage Usage</span>
                      <span style={{ fontWeight: 600 }}>
                        {fmtSize(storageUsed)} / {fmtSize(STORAGE_LIMIT)}
                      </span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 6, height: 6 }}>
                      <div
                        style={{
                          width: `${storagePercentage}%`,
                          height: 6,
                          borderRadius: 6,
                          background:
                            storagePercentage > 80
                              ? "#ef4444"
                              : storagePercentage > 50
                              ? "#f59e0b"
                              : "#10b981",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 14 }}>
                    🗓 Member Since: {profile?.createdAt ? fmtDate(profile.createdAt) : "—"}
                  </div>

                  {profileMsg && (
                    <p
                      style={{
                        fontSize: 12,
                        color: profileMsg.startsWith("✅") ? "#10b981" : "#ef4444",
                        marginBottom: 10,
                        fontWeight: 600,
                      }}
                    >
                      {profileMsg}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={saveProfile}
                      disabled={profileSaving}
                      className="btn-primary"
                      style={{ flex: 1, fontSize: 13, padding: "10px" }}
                    >
                      {profileSaving ? "Saving..." : "💾 Save Changes"}
                    </button>
                    <button
                      onClick={() => signOut()}
                      className="btn-secondary"
                      style={{ fontSize: 13, padding: "10px 14px", color: "#ef4444" }}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════ ACTIONS BAR ══════════ */}
      <div className="actions-bar">
        {currentFolderId && (
          <>
            <button className="btn-secondary" onClick={handleHome}>
              🏠 Home
            </button>
            <button className="btn-secondary" onClick={handleStepBack}>
              ⬅ Back
            </button>
          </>
        )}
        <button className="btn-secondary" onClick={() => setIsFolderModalOpen(true)}>
          + New Folder
        </button>
        <button className="btn-secondary" onClick={() => setIsUploadModalOpen(true)}>
          ↑ Upload File
        </button>
      </div>

      {/* ══════════ FILES GRID ══════════ */}
      <div className="grid-view">
        {items.map((item) => (
          <div
            key={item.id}
            className="item-card"
            onClick={() => {
              if (item.type === "folder") {
                setFolderHistory((p) => [...p, currentFolderId || "root"]);
                setCurrentFolderId(item.id);
              } else {
                setPreviewFile(item);
                setIsPreviewModalOpen(true);
              }
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                display: "flex",
                gap: 8,
                opacity: 0,
              }}
              className="card-actions"
            >
              <button
                title="Rename"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                }}
                onClick={(e) => openRenameModal(item, e)}
              >
                ✏️
              </button>
              <button
                title="Delete"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--error-color)",
                  cursor: "pointer",
                  fontSize: 18,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id, item.type);
                }}
              >
                ×
              </button>
            </div>
            <div className="item-icon">{item.type === "folder" ? "📁" : "📄"}</div>
            <div className="item-name" title={item.name}>
              {item.name}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .item-card:hover .card-actions {
          opacity: 1 !important;
        }
      `}</style>

      {/* ══════════ AVATAR PICKER MODAL ══════════ */}
      {isAvatarPickerOpen && (
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div
            className="modal"
            style={{ maxWidth: 720, width: "95%", maxHeight: "88vh", overflow: "auto" }}
          >
            <h2 style={{ marginBottom: 4 }}>🎭 Customize Your Avatar</h2>
            <p style={{ opacity: 0.65, fontSize: 13, marginBottom: 18 }}>
              Choose an avatar based on your mood, superhero, or cartoon character:
            </p>

            {/* Live Preview Display */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 22,
              }}
            >
              <div style={{ position: "relative" }}>
                <img
                  src={`https://api.dicebear.com/9.x/${encodeURIComponent(
                    pickerStyle
                  )}/svg?seed=${encodeURIComponent(
                    currentPreviewSeed
                  )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                  alt="preview"
                  width={120}
                  height={120}
                  style={{
                    borderRadius: "50%",
                    border: "4px solid var(--primary-color)",
                    background: "#fff",
                    boxShadow: "0 10px 30px rgba(59,130,246,0.35)",
                  }}
                />
              </div>
              <div
                style={{
                  background: "var(--primary-color)",
                  color: "#fff",
                  fontSize: 12,
                  padding: "3px 12px",
                  borderRadius: 14,
                  marginTop: 10,
                  fontWeight: 700,
                }}
              >
                {AVATAR_STYLES.find((s) => s.id === pickerStyle)?.label} — {currentPreviewSeed}
              </div>
            </div>

            {/* Custom Seed/Name input */}
            <div style={{ marginBottom: 20 }}>
              <label
                className="input-label"
                style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}
              >
                ✨ Enter Custom Superhero / Name / Character:
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input-field"
                  placeholder="e.g. IronMan, Joker, Captain, Anime, Ninja..."
                  value={customSeedInput}
                  onChange={(e) => setCustomSeedInput(e.target.value)}
                  style={{ fontSize: 13 }}
                />
                {customSeedInput && (
                  <button
                    className="btn-secondary"
                    onClick={() => setCustomSeedInput("")}
                    style={{ fontSize: 12 }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Style Selector */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.8 }}>
                1. Select Avatar Style:
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(105px,1fr))",
                  gap: 8,
                }}
              >
                {AVATAR_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setPickerStyle(style.id)}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 12,
                      border: `2px solid ${
                        pickerStyle === style.id ? "var(--primary-color)" : "var(--border-color)"
                      }`,
                      background:
                        pickerStyle === style.id ? "rgba(59,130,246,0.18)" : "var(--glass-bg)",
                      cursor: "pointer",
                      fontSize: 11,
                      color: "var(--text-color)",
                      fontWeight: pickerStyle === style.id ? 700 : 400,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.2s",
                    }}
                  >
                    <img
                      src={`https://api.dicebear.com/9.x/${style.id}/svg?seed=${encodeURIComponent(
                        currentPreviewSeed
                      )}`}
                      width={40}
                      height={40}
                      style={{ borderRadius: "50%", background: "#f0f0f0" }}
                      alt={style.label}
                    />
                    <span>{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Seeds / Superhero Selector */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.8 }}>
                2. Popular Superhero & Mood Characters:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {AVATAR_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    onClick={() => {
                      setPickerSeed(seed);
                      setCustomSeedInput("");
                    }}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 20,
                      fontSize: 12,
                      border: `2px solid ${
                        pickerSeed === seed && !customSeedInput
                          ? "var(--primary-color)"
                          : "var(--border-color)"
                      }`,
                      background:
                        pickerSeed === seed && !customSeedInput
                          ? "var(--primary-color)"
                          : "var(--glass-bg)",
                      color:
                        pickerSeed === seed && !customSeedInput ? "#fff" : "var(--text-color)",
                      cursor: "pointer",
                      fontWeight: pickerSeed === seed && !customSeedInput ? 700 : 500,
                      transition: "all 0.15s",
                    }}
                  >
                    {seed}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsAvatarPickerOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ width: "auto", padding: "10px 24px" }}
                onClick={saveAvatar}
              >
                ✅ Set as My Avatar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ RENAME MODAL ══════════ */}
      {isRenameModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Rename {renameItemType === "folder" ? "Folder" : "File"}</h2>
            <input
              className="input-field"
              placeholder="New Name"
              value={renameItemName}
              onChange={(e) => setRenameItemName(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsRenameModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ width: "auto" }} onClick={handleRename}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ PREVIEW MODAL ══════════ */}
      {isPreviewModalOpen && previewFile && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "800px", width: "90%" }}>
            <h2>Preview: {previewFile.name}</h2>
            <div
              style={{
                marginTop: 20,
                marginBottom: 20,
                height: 400,
                background: "var(--bg-color)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <iframe
                src={`/api/fs/download?id=${previewFile.id}&action=view`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Preview"
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                style={{ color: "var(--error-color)", borderColor: "var(--error-color)" }}
                onClick={() => handleDelete(previewFile.id, previewFile.type)}
              >
                🗑️ Delete
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setRenameItemId(previewFile.id);
                  setRenameItemType(previewFile.type);
                  setRenameItemName(previewFile.name);
                  setIsRenameModalOpen(true);
                }}
              >
                ✏️ Rename
              </button>
              <button className="btn-secondary" onClick={() => setIsPreviewModalOpen(false)}>
                Close
              </button>
              <button
                className="btn-primary"
                style={{ width: "auto" }}
                onClick={() =>
                  window.open(
                    `/api/fs/download?id=${previewFile.id}&action=download`,
                    "_blank"
                  )
                }
              >
                ⬇️ Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ CREATE FOLDER MODAL ══════════ */}
      {isFolderModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create Folder</h2>
            <input
              className="input-field"
              placeholder="Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsFolderModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ width: "auto" }}
                onClick={handleCreateFolder}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ UPLOAD MODAL ══════════ */}
      {isUploadModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Upload File</h2>
            <input
              type="file"
              className="input-field"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsUploadModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ width: "auto" }}
                onClick={handleUploadFile}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ STORAGE FULL MODAL ══════════ */}
      {storageUsed >= STORAGE_LIMIT && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Storage Full ⚠️</h2>
            <p style={{ marginBottom: 16 }}>Upgrade your plan to get more space:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn-primary" style={{ background: "#10b981" }}>
                1 GB Plan - ₹150 / month
              </button>
              <button className="btn-primary" style={{ background: "#3b82f6" }}>
                10 GB Plan - ₹250 / month
              </button>
              <button className="btn-primary" style={{ background: "#8b5cf6" }}>
                25 GB Plan - ₹350 / month
              </button>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => alert("Contacting payment gateway...")}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

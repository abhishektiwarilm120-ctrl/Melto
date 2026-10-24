"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "email" | "choose" | "otp" | "password" | "success";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [sentVia, setSentVia] = useState<"email" | "sms">("email");
  const [sentTo, setSentTo] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const progressSteps = ["email", "choose", "otp", "password"];
  const progressIndex = progressSteps.indexOf(step);

  const sendOtp = async (via: "email" | "sms") => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, via }),
      });
      const data = await res.json();
      if (res.ok) {
        setSentVia(via);
        setSentTo(data.maskedPhone || data.maskedEmail || "");
        setStep("otp");
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Failed to send verification code. Please check your network.");
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword, sentVia }),
      });
      const data = await res.json();
      if (res.ok) setStep("success");
      else setError(data.message || "Something went wrong.");
    } catch {
      setError("Failed to change password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        {/* Progress indicators */}
        {step !== "success" && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, marginBottom: 24 }}>
            {["Email", "Method", "OTP", "Password"].map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      background: progressIndex >= i ? "var(--primary-color)" : "rgba(255,255,255,0.1)",
                      color: "#fff",
                      margin: "0 auto",
                      transition: "all 0.3s",
                    }}
                  >
                    {progressIndex > i ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: 9, marginTop: 3, opacity: 0.6 }}>{label}</div>
                </div>
                {i < 3 && (
                  <div
                    style={{
                      width: 20,
                      height: 2,
                      marginBottom: 14,
                      background: progressIndex > i ? "var(--primary-color)" : "rgba(255,255,255,0.15)",
                      transition: "all 0.3s",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <h1 className="auth-title">
          {step === "email" && "Forgot Password"}
          {step === "choose" && "Verification Method"}
          {step === "otp" && "Enter Security Code"}
          {step === "password" && "Reset Password"}
          {step === "success" && "Password Reset Successful"}
        </h1>

        {error && (
          <p className="error-message" style={{ color: error.startsWith("✅") ? "#10b981" : undefined }}>
            {error}
          </p>
        )}

        {/* Step 1: Enter Email */}
        {step === "email" && (
          <form onSubmit={(e) => { e.preventDefault(); setError(""); setStep("choose"); }}>
            <p style={{ fontSize: 14, marginBottom: 20, opacity: 0.7, textAlign: "center", lineHeight: 1.6 }}>
              Enter your registered email address to receive a one-time verification code.
            </p>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary">Continue →</button>
          </form>
        )}

        {/* Step 2: Choose OTP Method */}
        {step === "choose" && (
          <div>
            <p style={{ fontSize: 14, marginBottom: 24, opacity: 0.7, textAlign: "center", lineHeight: 1.6 }}>
              Where should we send your verification code?
            </p>

            {/* Email OTP Button */}
            <button
              className="btn-secondary"
              disabled={loading}
              onClick={() => sendOtp("email")}
              style={{
                width: "100%",
                marginBottom: 12,
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 15,
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 24 }}>📧</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 600 }}>Verify via Email</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>A one-time code will be sent to your email</div>
              </div>
            </button>

            {/* SMS OTP Button */}
            <button
              className="btn-secondary"
              disabled={loading}
              onClick={() => sendOtp("sms")}
              style={{
                width: "100%",
                marginBottom: 16,
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 15,
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 24 }}>📱</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 600 }}>Verify via Mobile SMS</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>A verification code will be sent via SMS</div>
              </div>
            </button>

            {loading && (
              <p style={{ textAlign: "center", opacity: 0.7, fontSize: 14 }}>📤 Sending verification code...</p>
            )}

            <button
              type="button"
              className="btn-secondary"
              style={{ width: "100%", marginTop: 4 }}
              onClick={() => { setStep("email"); setError(""); }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 3: Enter OTP */}
        {step === "otp" && (
          <form onSubmit={(e) => { e.preventDefault(); if (otp.length === 6) setStep("password"); }}>
            <div
              style={{
                background: sentVia === "email" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)",
                border: `1px solid ${sentVia === "email" ? "rgba(59,130,246,0.3)" : "rgba(16,185,129,0.3)"}`,
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.7 }}>
                {sentVia === "email" ? "📧 Code sent to your email address:" : "📱 Code sent to your phone number:"}<br />
                <strong style={{ fontSize: 15 }}>{sentTo}</strong>
              </p>
            </div>
            <div className="input-group">
              <label className="input-label">6-Digit Verification Code</label>
              <input
                type="text"
                className="input-field"
                placeholder="- - - - - -"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                style={{ fontSize: 28, letterSpacing: 10, textAlign: "center", fontWeight: "bold" }}
                autoComplete="one-time-code"
              />
            </div>
            <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", marginBottom: 16 }}>
              Code expires in 10 minutes
            </p>
            <button type="submit" className="btn-primary" disabled={otp.length < 6}>
              ✅ Verify Code
            </button>
            <button
              type="button"
              onClick={async () => {
                setError("");
                setLoading(true);
                await sendOtp(sentVia);
              }}
              className="btn-secondary"
              disabled={loading}
              style={{ width: "100%", marginTop: 10 }}
            >
              {loading ? "Sending..." : "🔄 Resend Code"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => { setStep("choose"); setOtp(""); setError(""); }}
            >
              ← Change Method
            </button>
          </form>
        )}

        {/* Step 4: New Password */}
        {step === "password" && (
          <form onSubmit={handleChangePassword}>
            <div
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 10,
                padding: "10px 16px",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 13, margin: 0 }}>✅ Verification successful! Set your new password.</p>
            </div>
            <div className="input-group">
              <label className="input-label">New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-field"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    opacity: 0.7,
                    color: "var(--text-color)",
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Updating..." : "🔐 Save New Password"}
            </button>
          </form>
        )}

        {/* Success */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <p style={{ fontSize: 56, margin: "10px 0" }}>🎉</p>
            <p style={{ marginBottom: 24, opacity: 0.8, lineHeight: 1.7 }}>
              Your password has been changed successfully.<br />
              You can now log in with your new password.
            </p>
            <Link
              href="/login"
              className="btn-primary"
              style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "13px" }}
            >
              Go to Login Page →
            </Link>
          </div>
        )}

        {step !== "success" && (
          <Link href="/login" className="auth-link" style={{ marginTop: 18 }}>
            ← Back to Login
          </Link>
        )}
      </div>
    </div>
  );
}

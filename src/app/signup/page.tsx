"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });

      if (res.ok) {
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.message || "Something went wrong");
      }
    } catch (err) {
      setError("Failed to sign up");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        <h1 className="auth-title">Create Account</h1>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Mobile Number <span style={{ fontSize: 12, opacity: 0.6 }}>(for OTP recovery)</span></label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="input-field" style={{ width: "auto", padding: "0 12px", display: "flex", alignItems: "center", flexShrink: 0 }}>🇮🇳 +91</span>
              <input
                type="tel"
                className="input-field"
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                required
                maxLength={10}
              />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--text-color)', opacity: 0.7
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>
        <Link href="/login" className="auth-link">
          Already have an account? Login
        </Link>
      </div>
    </div>
  );
}

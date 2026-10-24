"use client";

import React, { useEffect, useState, useRef } from "react";

interface InteractiveShape {
  id: string;
  type: "triangle" | "cube" | "gyro" | "hex" | "ring" | "orb";
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rot: number;
  rotSpeed: number;
  color: string;
}

export default function FuturisticBackground() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic interactive floating physics objects
  const [shapes, setShapes] = useState<InteractiveShape[]>([
    { id: "tri-1", type: "triangle", x: 12, y: 18, size: 100, speedX: 0.03, speedY: 0.04, rot: 15, rotSpeed: 0.3, color: "#3b82f6" },
    { id: "tri-2", type: "triangle", x: 80, y: 72, size: 130, speedX: -0.025, speedY: -0.03, rot: -20, rotSpeed: -0.25, color: "#8b5cf6" },
    { id: "tri-3", type: "triangle", x: 86, y: 22, size: 85, speedX: -0.035, speedY: 0.025, rot: 45, rotSpeed: 0.4, color: "#06b6d4" },
    { id: "cube-1", type: "cube", x: 68, y: 35, size: 65, speedX: 0.02, speedY: -0.03, rot: 0, rotSpeed: 0.5, color: "#60a5fa" },
    { id: "cube-2", type: "cube", x: 18, y: 75, size: 55, speedX: -0.02, speedY: 0.02, rot: 30, rotSpeed: -0.4, color: "#a855f7" },
    { id: "gyro-1", type: "gyro", x: 42, y: 82, size: 90, speedX: 0.025, speedY: -0.02, rot: 0, rotSpeed: 0.8, color: "#ec4899" },
    { id: "hex-1", type: "hex", x: 8, y: 46, size: 80, speedX: 0.03, speedY: -0.035, rot: 10, rotSpeed: 0.2, color: "#3b82f6" },
    { id: "hex-2", type: "hex", x: 55, y: 15, size: 75, speedX: -0.03, speedY: 0.03, rot: 25, rotSpeed: -0.3, color: "#8b5cf6" },
  ]);

  // Drag state
  const draggingId = useRef<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const updateTheme = () => {
      const current = document.documentElement.getAttribute("data-theme");
      setTheme(current === "dark" ? "dark" : "light");
    };
    updateTheme();

    const observer = new MutationObserver(() => updateTheme());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  // Smooth continuous floating physics loop
  useEffect(() => {
    let animId: number;

    const animate = () => {
      setShapes((prev) =>
        prev.map((s) => {
          if (draggingId.current === s.id) return s; // Paused while user is dragging

          let newX = s.x + s.speedX;
          let newY = s.y + s.speedY;
          let newSpeedX = s.speedX;
          let newSpeedY = s.speedY;

          // Bounce gently from screen boundaries (in %)
          if (newX < 2 || newX > 94) newSpeedX = -newSpeedX;
          if (newY < 4 || newY > 90) newSpeedY = -newSpeedY;

          return {
            ...s,
            x: newX,
            y: newY,
            speedX: newSpeedX,
            speedY: newSpeedY,
            rot: (s.rot + s.rotSpeed) % 360,
          };
        })
      );
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Pointer drag events for interactive shapes
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    draggingId.current = id;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragOffset.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId.current) return;
    const currentId = draggingId.current;
    const deltaX = (e.clientX - dragOffset.current.x) / window.innerWidth * 100;
    const deltaY = (e.clientY - dragOffset.current.y) / window.innerHeight * 100;

    dragOffset.current = { x: e.clientX, y: e.clientY };

    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== currentId) return s;
        return {
          ...s,
          x: Math.max(1, Math.min(95, s.x + deltaX)),
          y: Math.max(2, Math.min(92, s.y + deltaY)),
        };
      })
    );
  };

  const handlePointerUp = () => {
    draggingId.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`futuristic-bg-wrapper theme-${theme}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ pointerEvents: "auto" }} // Allows drag interaction on shapes
      aria-hidden="true"
    >
      {/* ── Background Grids & Orbs ── */}
      {theme === "dark" ? (
        <>
          <div className="dark-cyber-grid" />
          <div className="dark-plasma plasma-neon-blue" />
          <div className="dark-plasma plasma-cyber-purple" />
          <div className="dark-plasma plasma-electric-cyan" />
          <div className="dark-plasma plasma-hot-pink" />
        </>
      ) : (
        <>
          <div className="light-aurora-bg" />
          <div className="light-tech-grid" />
          <div className="light-sphere sphere-blue" />
          <div className="light-sphere sphere-purple" />
          <div className="light-sphere sphere-cyan" />
          <div className="light-sphere sphere-indigo" />
        </>
      )}

      {/* ── INTERACTIVE DRAGGABLE & FLOATING SHAPES ── */}
      {shapes.map((s) => {
        const isDark = theme === "dark";

        return (
          <div
            key={s.id}
            onPointerDown={(e) => handlePointerDown(s.id, e)}
            className="interactive-floating-shape"
            style={{
              position: "absolute",
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              transform: `translate(-50%, -50%) rotate(${s.rot}deg)`,
              cursor: "grab",
              zIndex: 0,
              userSelect: "none",
              touchAction: "none",
            }}
            title="Drag me anywhere!"
          >
            {/* 🔺 Signature Melto Triangle */}
            {s.type === "triangle" && (
              <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <defs>
                  <linearGradient id={`triGrad-${s.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isDark ? "#60a5fa" : "#2563eb"} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={isDark ? "#c084fc" : "#7c3aed"} stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <polygon
                  points="50,15 90,85 10,85"
                  fill={isDark ? "rgba(96,165,250,0.12)" : "rgba(37,99,235,0.14)"}
                  stroke={`url(#triGrad-${s.id})`}
                  strokeWidth={isDark ? 3.5 : 4.5}
                />
                <polygon
                  points="50,32 73,73 27,73"
                  fill={`url(#triGrad-${s.id})`}
                  opacity={isDark ? 0.35 : 0.45}
                />
              </svg>
            )}

            {/* 📦 3D Cyber Cloud Storage Cube */}
            {s.type === "cube" && (
              <div className="interactive-cube">
                <div className={`cube-inner ${isDark ? "" : "light-cube-style"}`}>
                  <div className="cube-face front">☁️</div>
                  <div className="cube-face back">⚡</div>
                  <div className="cube-face right" />
                  <div className="cube-face left" />
                  <div className="cube-face top" />
                  <div className="cube-face bottom" />
                </div>
              </div>
            )}

            {/* 🪐 Gyroscope Ring */}
            {s.type === "gyro" && (
              <div className={`gyro-ring-box ${isDark ? "" : "light-gyro"}`}>
                <div className="ring ring-a" />
                <div className="ring ring-b" />
              </div>
            )}

            {/* ⬡ Cyber Tech Hexagon */}
            {s.type === "hex" && (
              <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
                <polygon
                  points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                  fill={isDark ? "rgba(96,165,250,0.12)" : "rgba(37,99,235,0.12)"}
                  stroke={isDark ? "#38bdf8" : "#2563eb"}
                  strokeWidth={isDark ? 3 : 4}
                />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

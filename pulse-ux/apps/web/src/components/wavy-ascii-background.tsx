"use client";

import { useEffect, useRef } from "react";

export function WavyAsciiBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const mouse = { x: -10000, y: -10000 };
    let time = 0;
    let animationFrameId: number;

    // Physics State using TypedArrays for performance
    let x: Float32Array;
    let y: Float32Array;
    let ox: Float32Array;
    let oy: Float32Array;
    let vx: Float32Array;
    let vy: Float32Array;
    let count = 0;

    const fontSize = 16;
    const chars = "PULSExy<>10";

    const startColor = { r: 162, g: 234, b: 52 };
    const endColor = { r: 198, g: 115, b: 255 };

    const initParticles = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const cols = Math.ceil(width / fontSize);
      const rows = Math.ceil(height / fontSize);
      count = cols * rows;

      x = new Float32Array(count);
      y = new Float32Array(count);
      ox = new Float32Array(count);
      oy = new Float32Array(count);
      vx = new Float32Array(count);
      vy = new Float32Array(count);

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const idx = i * cols + j;
          const px = j * fontSize;
          const py = i * fontSize;

          x[idx] = px;
          y[idx] = py;
          ox[idx] = px;
          oy[idx] = py;
          vx[idx] = 0;
          vy[idx] = 0;
        }
      }
    };

    const handleResize = () => {
      initParticles();
    };
    window.addEventListener("resize", handleResize);
    initParticles();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      ctx.font = `bold ${fontSize}px "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace`;
      ctx.textAlign = "center";

      time += 0.03;

      // Physics Parameters
      // Low stiffness + High friction = viscous fluid
      // Lower friction = volatile water
      const spring = 0.08;
      const friction = 0.92;
      const repulseRadius = 250;
      const repulseStrength = 0.8;

      // Calculate columns for coloring
      const cols = Math.ceil(width / fontSize);

      for (let i = 0; i < count; i++) {
        // 1. Calculate "Target" position (where the particle wants to be)
        // Includes the wave animation
        const waveY = Math.sin((ox[i] / fontSize) * 0.08 + time) * 12;
        const targetX = ox[i];
        const targetY = oy[i] + waveY;

        // 2. Interaction
        const dx = mouse.x - x[i];
        const dy = mouse.y - y[i];
        const distSq = dx * dx + dy * dy;

        if (distSq < repulseRadius * repulseRadius) {
          const dist = Math.sqrt(distSq);
          const force = 1 - dist / repulseRadius;
          const angle = Math.atan2(dy, dx);

          // Apply impulse away from mouse
          vx[i] -= Math.cos(angle) * force * repulseStrength;
          vy[i] -= Math.sin(angle) * force * repulseStrength;
        }

        // 3. Spring back to target
        vx[i] += (targetX - x[i]) * spring;
        vy[i] += (targetY - y[i]) * spring;

        // 4. Apply Physics
        vx[i] *= friction;
        vy[i] *= friction;
        x[i] += vx[i];
        y[i] += vy[i];

        // 5. Render
        if (x[i] > -50 && x[i] < width + 50 && y[i] > -50 && y[i] < height + 50) {
          const colIndex = Math.floor(ox[i] / fontSize);
          const ratio = colIndex / cols;

          const r = Math.floor(startColor.r + (endColor.r - startColor.r) * ratio);
          const g = Math.floor(startColor.g + (endColor.g - startColor.g) * ratio);
          const b = Math.floor(startColor.b + (endColor.b - startColor.b) * ratio);

          const noise = Math.sin(ox[i] * 0.1 + oy[i] * 0.1 + time) * 0.5 + 0.5;
          const opacity = 0.3 + noise * 0.4;

          ctx.fillStyle = `rgba(${r},${g},${b}, ${opacity})`;

          // Stable character selection
          const char =
            chars[(Math.floor(ox[i] / fontSize) + Math.floor(oy[i] / fontSize) + Math.floor(time * 2)) % chars.length];

          ctx.fillText(char, x[i], y[i]);
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 bg-black" />;
}

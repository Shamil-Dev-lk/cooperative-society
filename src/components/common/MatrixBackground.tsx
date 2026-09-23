import React, { useEffect, useRef } from 'react';

const CHARACTERS = '010101<>{}[]/\\#$%&ABCDEFGHJKLMNPQRSTUVWXYZ';
const STREAM_TEXTS = [
  'SYSTEM_INITIALIZING',
  'RED_SECURITY_LAYER_v4.2',
  'AUTH_GATEWAY_ACTIVE',
  'ENCRYPTED_CONNECTION_TLS1.3',
  'ACCESS_CONTROL_ENFORCED',
  'FIREWALL_STATUS_SECURE',
  'AUTH_CHECK_READY',
  'SECURE_CHANNEL_ESTABLISHED',
];

export const MatrixBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const fontSize = 14;
    let columns = Math.floor(width / fontSize);
    let drops: number[] = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));
    let speeds: number[] = Array.from({ length: columns }, () => 1 + Math.random() * 2);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));
      speeds = Array.from({ length: columns }, () => 1 + Math.random() * 2);
    };

    window.addEventListener('resize', handleResize);

    // Particles
    const particleCount = Math.min(40, Math.floor(width / 30));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1,
    }));

    let laserY = 0;
    const laserSpeed = 1.5;

    const render = () => {
      // Dark trail background fill
      ctx.fillStyle = 'rgba(15, 5, 8, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // 1. Red Matrix Code Rain
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Head character is intense white-red, trailing characters are neon crimson red
        if (Math.random() > 0.9) {
          ctx.fillStyle = '#ff3366';
        } else {
          ctx.fillStyle = '#ef4444';
        }

        ctx.fillText(char, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += speeds[i];
      }

      // 2. Red Laser Scan Line
      laserY = (laserY + laserSpeed) % height;
      const gradient = ctx.createLinearGradient(0, laserY - 10, 0, laserY + 10);
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
      gradient.addColorStop(0.5, 'rgba(255, 51, 102, 0.5)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, laserY - 10, width, 20);

      // 3. Floating Digital Crimson Particles
      ctx.fillStyle = 'rgba(255, 51, 102, 0.6)';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.2 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Canvas Matrix */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Cyber Grid Overlay (Red) */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(239, 68, 68, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 51, 102, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Ambient Red Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-[130px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/15 rounded-full blur-[130px]" />

      {/* Decorative Stream Text (HUD Corners) */}
      <div className="hidden lg:block absolute top-6 left-6 font-mono text-[10px] text-red-400/60 space-y-1 select-none">
        {STREAM_TEXTS.slice(0, 4).map((text, i) => (
          <p key={i} className="animate-pulse">
            &gt; {text} [...]
          </p>
        ))}
      </div>
      <div className="hidden lg:block absolute bottom-6 right-6 font-mono text-[10px] text-rose-400/60 space-y-1 text-right select-none">
        {STREAM_TEXTS.slice(4, 8).map((text, i) => (
          <p key={i} className="animate-pulse">
            [{text}] &lt; OK
          </p>
        ))}
      </div>
    </div>
  );
};


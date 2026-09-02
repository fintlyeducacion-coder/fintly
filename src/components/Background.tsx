import { useEffect, useRef } from 'react';

interface BackgroundProps { theme: 'light' | 'dark'; }

export default function Background({ theme }: BackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    interface Particle { x: number; y: number; r: number; dx: number; dy: number; hue: number; a: number; }
    let particles: Particle[] = [];

    const ORBS = [
      { hue: 262, baseX: 0.14, baseY: 0.18, sx: 0.38, sy: 0.28, ax: 0.07, ay: 0.05, size: 0.40 }, // violet
      { hue: 199, baseX: 0.88, baseY: 0.12, sx: 0.31, sy: 0.43, ax: 0.05, ay: 0.04, size: 0.36 }, // cyan/sky
      { hue: 280, baseX: 0.50, baseY: 0.82, sx: 0.22, sy: 0.27, ax: 0.09, ay: 0.06, size: 0.42 }, // deep violet
      { hue: 210, baseX: 0.75, baseY: 0.55, sx: 0.19, sy: 0.33, ax: 0.06, ay: 0.07, size: 0.28 }, // blue-cyan
    ];

    const HUES = [262, 199, 278, 210];

    const init = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      const count = Math.min(45, Math.floor((W * H) / 22000));
      particles = Array.from({ length: count }, () => ({
        x:   Math.random() * W,
        y:   Math.random() * H,
        r:   theme === 'light' ? Math.random() * 2.2 + 1 : Math.random() * 1.3 + 0.4,
        dx:  (Math.random() - 0.5) * 0.08,
        dy:  (Math.random() - 0.5) * 0.08,
        hue: HUES[Math.floor(Math.random() * HUES.length)],
        a:   theme === 'light' ? Math.random() * 0.18 + 0.08 : Math.random() * 0.22 + 0.06,
      }));
    };

    const draw = () => {
      const t = Date.now() * 0.00038;
      ctx.clearRect(0, 0, W, H);

      // Orbs
      const alpha = theme === 'dark' ? 0.13 : 0.055;
      const scale = Math.min(W, H);
      for (const o of ORBS) {
        const cx = (o.baseX + Math.sin(t * o.sx) * o.ax) * W;
        const cy = (o.baseY + Math.cos(t * o.sy) * o.ay) * H;
        const r  = scale * o.size;
        const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const col = `hsla(${o.hue},72%,64%,`;
        g.addColorStop(0,   col + alpha + ')');
        g.addColorStop(0.5, col + alpha * 0.35 + ')');
        g.addColorStop(1,   col + '0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Particles
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = W;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'light'
          ? `hsla(${p.hue},60%,55%,${p.a})`
          : `hsla(${p.hue},70%,75%,${p.a})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', init);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', init); };
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%', background: theme === 'dark' ? '#050508' : '#f8f8fc', transition: 'background 0.45s ease' }}
      />
      {/* Aurora superior — luz de escenario */}
      <div
        className="absolute inset-0"
        style={{
          background: theme === 'dark'
            ? 'radial-gradient(ellipse 90% 55% at 50% -12%, rgba(124,58,237,0.14), rgba(56,189,248,0.04) 45%, transparent 68%)'
            : 'radial-gradient(ellipse 90% 55% at 50% -12%, rgba(124,58,237,0.07), transparent 60%)',
        }}
      />
      {/* Viñeta — enfoca el contenido al centro */}
      {theme === 'dark' && (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 110% 90% at 50% 45%, transparent 55%, rgba(5,5,8,0.5) 100%)' }}
        />
      )}
    </div>
  );
}

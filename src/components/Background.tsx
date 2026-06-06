import { useEffect, useRef } from 'react';

interface BackgroundProps {
  theme: 'light' | 'dark';
}

export default function Background({ theme }: BackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    interface Point {
      x: number;
      y: number;
      r: number;
      dx: number;
      dy: number;
      hue: number;
      a: number;
    }

    let pts: Point[] = [];

    const initPts = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      pts = Array.from({ length: 45 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: theme === 'light' ? Math.random() * 2.8 + 1.2 : Math.random() * 1.5 + 0.4,
        dx: (Math.random() - 0.5) * 0.12,
        dy: (Math.random() - 0.5) * 0.12,
        hue: Math.random() > 0.5 ? 260 : 205,
        a: theme === 'light' ? Math.random() * 0.25 + 0.15 : Math.random() * 0.3 + 0.1,
      }));
    };

    const drawBg = () => {
      const t = Date.now() * 0.0008;
      ctx.clearRect(0, 0, W, H);

      // Orbes difuminados grandes (gradientes radiales)
      const gradients = [
        {
          rx: 0.15 + Math.sin(t * 0.4) * 0.05,
          ry: 0.25 + Math.cos(t * 0.3) * 0.04,
          r: theme === 'light' ? 380 : 260,
          color: theme === 'light' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.12)', // Púrpura de Fintly
        },
        {
          rx: 0.82 + Math.cos(t * 0.35) * 0.05,
          ry: 0.2 + Math.sin(t * 0.45) * 0.04,
          r: theme === 'light' ? 340 : 220,
          color: theme === 'light' ? 'rgba(56, 189, 248, 0.10)' : 'rgba(56, 189, 248, 0.08)', // Cian
        },
        {
          rx: 0.5 + Math.sin(t * 0.25) * 0.07,
          ry: 0.75 + Math.cos(t * 0.3) * 0.05,
          r: theme === 'light' ? 420 : 300,
          color: theme === 'light' ? 'rgba(99, 102, 241, 0.10)' : 'rgba(99, 102, 241, 0.08)', // Indigo
        },
      ];

      gradients.forEach(({ rx, ry, r, color }) => {
        const xCoord = rx * W;
        const yCoord = ry * H;
        const g = ctx.createRadialGradient(xCoord, yCoord, 0, xCoord, yCoord, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(xCoord, yCoord, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Partículas pequeñas que flotan lentamente
      pts.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;

        // Rebotes continuos/reaparición en bordes
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'light' 
          ? `hsla(${p.hue}, 70%, 60%, ${p.a})`
          : `hsla(${p.hue}, 80%, 75%, ${p.a})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(drawBg);
    };

    initPts();
    drawBg();

    const handleResize = () => {
      initPts();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 transition-all duration-500"
      style={{ background: theme === 'light' ? '#FAF9F6' : '#070712' }}
    />
  );
}

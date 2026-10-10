import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { AmbientKind } from '../gameData';

/*
 * СЛОЙ ЧАСТИЦ — маленький свой «движок» на <canvas>.
 * Сцена боя вызывает emit('crit', x, y) — а здесь уже летят искры, монеты, кольца.
 * Координаты — в пикселях внутри слоя. Без библиотек: так игра остаётся лёгкой.
 */

export type BurstKind =
  | 'hit' | 'crit' | 'strike' | 'hurt' | 'block' | 'heal' | 'poison' | 'coins' | 'smoke'
  | 'levelup' | 'loot' | 'boss' | 'shield' | 'rebirth' | 'dodge';

export interface ParticleHandle {
  emit: (kind: BurstKind, x: number, y: number, opts?: { color?: string; big?: boolean }) => void;
}

type Shape = 'spark' | 'coin' | 'plus' | 'ring' | 'smoke' | 'star' | 'dot' | 'streak';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; grow: number;
  color: string; shape: Shape; gravity: number; drag: number;
  rot: number; vr: number; additive: boolean;
}

const MAX_PARTICLES = 450;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Props {
  ambient: AmbientKind;
  lightColor: string; // "251,146,60" — цвет искр/огоньков в тон биому
  ref?: Ref<ParticleHandle>;
}

export default function ParticleLayer({ ambient, lightColor, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parts = useRef<Particle[]>([]);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const ambientRef = useRef({ ambient, lightColor });
  ambientRef.current = { ambient, lightColor };

  const reduced = useRef(false);

  const add = (p: Partial<Particle> & Pick<Particle, 'x' | 'y' | 'shape' | 'color'>) => {
    if (parts.current.length >= MAX_PARTICLES) parts.current.shift();
    parts.current.push({
      vx: 0, vy: 0, life: 0, max: 0.8, size: 4, grow: 0, gravity: 0, drag: 0.98,
      rot: 0, vr: 0, additive: true, ...p,
    });
  };

  useImperativeHandle(ref, () => ({
    emit(kind, x, y, opts = {}) {
      const k = reduced.current ? 0.4 : 1;
      const n = (count: number) => Math.max(1, Math.round(count * k));

      switch (kind) {
        case 'hit':
          for (let i = 0; i < n(10); i++) {
            const a = rand(-Math.PI * 0.9, Math.PI * 0.2) + Math.PI; // разлетаются назад от удара
            const v = rand(80, 260);
            add({ x, y, shape: 'spark', color: i % 2 ? '#fde68a' : '#fb923c', vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, max: rand(0.25, 0.5), size: rand(2, 4), gravity: 500 });
          }
          add({ x, y, shape: 'ring', color: '#ffffff', max: 0.25, size: 6, grow: 90 });
          break;
        case 'crit':
          for (let i = 0; i < n(26); i++) {
            const a = rand(0, Math.PI * 2), v = rand(120, 420);
            add({ x, y, shape: i % 3 === 0 ? 'star' : 'spark', color: i % 2 ? '#fde047' : '#ffffff', vx: Math.cos(a) * v, vy: Math.sin(a) * v, max: rand(0.35, 0.7), size: rand(3, 6), gravity: 300, rot: rand(0, 6), vr: rand(-8, 8) });
          }
          add({ x, y, shape: 'ring', color: '#fde047', max: 0.4, size: 8, grow: 220 });
          add({ x, y, shape: 'ring', color: '#ffffff', max: 0.3, size: 4, grow: 150 });
          break;
        case 'strike':
          for (let i = 0; i < n(34); i++) {
            const a = rand(0, Math.PI * 2), v = rand(150, 520);
            add({ x, y, shape: i % 4 === 0 ? 'star' : 'spark', color: ['#f97316', '#fde047', '#ffffff', '#ef4444'][i % 4], vx: Math.cos(a) * v, vy: Math.sin(a) * v, max: rand(0.4, 0.8), size: rand(3, 7), gravity: 350, rot: rand(0, 6), vr: rand(-10, 10) });
          }
          add({ x, y, shape: 'ring', color: '#f97316', max: 0.5, size: 10, grow: 300 });
          for (let i = 0; i < n(6); i++) add({ x: x + rand(-20, 20), y: y + rand(-10, 20), shape: 'smoke', color: 'rgba(120,100,100,', vx: rand(-40, 40), vy: rand(-60, -10), max: rand(0.5, 0.9), size: rand(14, 24), grow: 30, additive: false });
          break;
        case 'hurt':
          for (let i = 0; i < n(14); i++) {
            const a = rand(Math.PI * 0.6, Math.PI * 1.7), v = rand(80, 260);
            add({ x, y, shape: 'dot', color: i % 3 ? '#dc2626' : '#f87171', vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, max: rand(0.4, 0.8), size: rand(2, 4.5), gravity: 700, additive: false });
          }
          break;
        case 'block':
          for (let i = 0; i < n(12); i++) {
            const a = rand(0, Math.PI * 2), v = rand(100, 280);
            add({ x, y, shape: 'spark', color: '#7dd3fc', vx: Math.cos(a) * v, vy: Math.sin(a) * v, max: rand(0.2, 0.4), size: rand(2, 4), gravity: 200 });
          }
          add({ x, y, shape: 'ring', color: '#38bdf8', max: 0.35, size: 14, grow: 120 });
          break;
        case 'dodge':
          for (let i = 0; i < n(8); i++) add({ x: x + rand(-14, 14), y: y + rand(-30, 30), shape: 'streak', color: '#bae6fd', vx: rand(-260, -140), max: rand(0.15, 0.3), size: rand(14, 30), additive: true });
          break;
        case 'heal':
          for (let i = 0; i < n(9); i++) add({ x: x + rand(-30, 30), y: y + rand(-10, 30), shape: 'plus', color: i % 2 ? '#86efac' : '#4ade80', vx: rand(-14, 14), vy: rand(-70, -30), max: rand(0.7, 1.1), size: rand(6, 11), drag: 0.99 });
          break;
        case 'poison':
          for (let i = 0; i < n(7); i++) add({ x: x + rand(-26, 26), y: y + rand(0, 40), shape: 'dot', color: i % 2 ? '#a3e635' : '#84cc16', vx: rand(-10, 10), vy: rand(-60, -25), max: rand(0.6, 1), size: rand(3, 6), drag: 0.99 });
          break;
        case 'coins':
          for (let i = 0; i < n(opts.big ? 16 : 9); i++) {
            const a = rand(-Math.PI * 0.85, -Math.PI * 0.15), v = rand(160, 380);
            add({ x, y, shape: 'coin', color: '#fbbf24', vx: Math.cos(a) * v, vy: Math.sin(a) * v, max: rand(0.9, 1.3), size: rand(4, 7), gravity: 900, rot: rand(0, 6), vr: rand(-12, 12), additive: false });
          }
          break;
        case 'smoke':
          for (let i = 0; i < n(12); i++) add({ x: x + rand(-24, 24), y: y + rand(-10, 30), shape: 'smoke', color: 'rgba(160,150,170,', vx: rand(-30, 30), vy: rand(-70, -20), max: rand(0.6, 1.1), size: rand(14, 28), grow: 40, additive: false });
          break;
        case 'levelup':
          for (let i = 0; i < 3; i++) add({ x, y, shape: 'ring', color: '#fde047', max: 0.9 + i * 0.15, size: 10, grow: 150 + i * 60 });
          for (let i = 0; i < n(26); i++) add({ x: x + rand(-40, 40), y: y + rand(10, 50), shape: i % 3 === 0 ? 'star' : 'spark', color: i % 2 ? '#fde047' : '#fff7ae', vx: rand(-30, 30), vy: rand(-220, -80), max: rand(0.8, 1.4), size: rand(3, 6), drag: 0.97, rot: rand(0, 6), vr: rand(-4, 4) });
          break;
        case 'loot': {
          const c = opts.color ?? '#fde047';
          for (let i = 0; i < n(opts.big ? 28 : 12); i++) {
            const a = rand(0, Math.PI * 2), v = rand(60, opts.big ? 320 : 200);
            add({ x, y, shape: i % 2 ? 'star' : 'spark', color: c, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, max: rand(0.6, 1.1), size: rand(3, 6), gravity: 120, rot: rand(0, 6), vr: rand(-6, 6) });
          }
          add({ x, y, shape: 'ring', color: c, max: 0.6, size: 8, grow: opts.big ? 220 : 130 });
          break;
        }
        case 'boss':
          for (let i = 0; i < n(30); i++) add({ x: x + rand(-90, 90), y: y + rand(-20, 60), shape: 'smoke', color: 'rgba(239,68,68,', vx: rand(-60, 60), vy: rand(-90, -20), max: rand(0.8, 1.4), size: rand(18, 34), grow: 40, additive: true });
          add({ x, y, shape: 'ring', color: '#ef4444', max: 0.8, size: 20, grow: 340 });
          break;
        case 'shield':
          add({ x, y, shape: 'ring', color: '#38bdf8', max: 0.55, size: 20, grow: 160 });
          for (let i = 0; i < n(14); i++) {
            const a = (i / 14) * Math.PI * 2;
            add({ x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40, shape: 'spark', color: '#bae6fd', vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, max: 0.5, size: 3 });
          }
          break;
        case 'rebirth':
          for (let i = 0; i < 5; i++) add({ x, y, shape: 'ring', color: i % 2 ? '#c084fc' : '#e9d5ff', max: 1.1 + i * 0.12, size: 10, grow: 200 + i * 70 });
          for (let i = 0; i < n(60); i++) add({ x: x + rand(-120, 120), y: y + rand(0, 120), shape: i % 3 === 0 ? 'star' : 'spark', color: i % 2 ? '#d8b4fe' : '#ffffff', vx: rand(-20, 20), vy: rand(-260, -90), max: rand(1, 1.8), size: rand(3, 7), drag: 0.97, rot: rand(0, 6), vr: rand(-4, 4) });
          break;
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let spawnAcc = 0;

    const ambientSpawn = (dt: number) => {
      const { w, h } = size.current;
      const { ambient: kind, lightColor: light } = ambientRef.current;
      const rate = (reduced.current ? 3 : 9) * (w / 380); // частиц в секунду
      spawnAcc += dt * rate;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        switch (kind) {
          case 'ember':
            add({ x: rand(0, w), y: h * rand(0.6, 1), shape: 'dot', color: `rgba(${light},`, vx: rand(-8, 8), vy: rand(-45, -18), max: rand(2, 4), size: rand(1.2, 2.6), drag: 1 });
            break;
          case 'lava':
            add({ x: rand(0, w), y: h * rand(0.7, 1), shape: 'dot', color: `rgba(${rand(0, 1) > 0.5 ? '255,160,60' : light},`, vx: rand(-14, 14), vy: rand(-80, -30), max: rand(1.5, 3), size: rand(1.5, 3), drag: 1 });
            break;
          case 'soul':
            add({ x: rand(0, w), y: h * rand(0.5, 0.95), shape: 'dot', color: `rgba(${light},`, vx: rand(-14, 14), vy: rand(-30, -12), max: rand(3, 5), size: rand(2, 4), drag: 1 });
            break;
          case 'snow':
            add({ x: rand(0, w), y: -6, shape: 'dot', color: 'rgba(235,248,255,', vx: rand(-20, 6), vy: rand(24, 55), max: rand(5, 8), size: rand(1.2, 3), drag: 1 });
            break;
          case 'void':
            add({ x: rand(0, w), y: rand(0, h), shape: 'dot', color: `rgba(${light},`, vx: rand(-6, 6), vy: rand(-12, 12), max: rand(2, 4), size: rand(1, 2.6), drag: 1 });
            break;
        }
      }
    };

    const draw = (p: Particle, t: number) => {
      // «Мягкие» частицы хранят цвет как "rgba(r,g,b," — альфу дописываем по времени жизни
      const alpha = Math.max(0, 1 - t);
      const soft = p.color.startsWith('rgba');
      ctx.globalAlpha = soft ? 1 : p.shape === 'ring' ? alpha : Math.min(1, alpha * 1.6);
      const col = soft ? `${p.color}${(p.shape === 'smoke' ? 0.35 : 0.9) * Math.min(1, alpha * 1.4)})` : p.color;
      ctx.fillStyle = col;
      ctx.strokeStyle = col;

      switch (p.shape) {
        case 'spark':
        case 'dot':
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.shape === 'spark' ? 0.6 + alpha * 0.6 : 1), 0, Math.PI * 2); ctx.fill();
          break;
        case 'ring':
          ctx.lineWidth = 2 + 3 * alpha;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
          break;
        case 'smoke': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'star': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 ? p.size * 0.4 : p.size * 1.5;
            const a = (i / 8) * Math.PI * 2;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fill(); ctx.restore();
          break;
        }
        case 'plus': {
          ctx.save(); ctx.translate(p.x, p.y);
          const s = p.size;
          ctx.fillRect(-s / 2, -s / 6, s, s / 3);
          ctx.fillRect(-s / 6, -s / 2, s / 3, s);
          ctx.restore();
          break;
        }
        case 'coin': {
          ctx.save(); ctx.translate(p.x, p.y);
          ctx.scale(Math.abs(Math.cos(p.rot)) * 0.8 + 0.2, 1); // «вращение» монеты
          ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.restore();
          break;
        }
        case 'streak':
          ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.size, p.y); ctx.stroke();
          break;
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { w, h, dpr } = size.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ambientSpawn(dt);

      const list = parts.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life += dt;
        if (p.life >= p.max || p.y > h + 40 || p.x < -60 || p.x > w + 60) { list.splice(i, 1); continue; }
        p.vy += p.gravity * dt;
        const d = Math.pow(p.drag, dt * 60);
        p.vx *= d; p.vy *= d;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.size += p.grow * dt * (p.shape === 'ring' ? 1 : 0.4);
        // огоньки и снег «мерцают» плавно: появляются и гаснут
        const t = p.life / p.max;
        ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
        draw(p, p.shape === 'dot' && p.color.startsWith('rgba') ? Math.abs(t * 2 - 1) : t);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-30" />;
}

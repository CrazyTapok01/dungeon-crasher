import { useEffect, useRef, useState } from 'react';
import type { GameEvent, HeroStats } from '../types';
import type { GameState } from '../game/reducer';
import { RARITY_COLORS, biomeForFloor } from '../gameData';
import ParticleLayer, { type ParticleHandle } from './ParticleLayer';
import HeroSprite from './HeroSprite';
import HeroPanel from './HeroPanel';
import MonsterPanel from './MonsterPanel';

/*
 * СЦЕНА БОЯ.
 * Правила игры ничего не знают про картинку: они лишь кладут в state.events,
 * что произошло. Здесь эти события превращаются в анимации — выпады, отдачу,
 * тряску экрана, частицы и всплывающие числа.
 * Все разовые анимации сделаны через Web Animations API (element.animate):
 * их можно запускать повторно, не пересоздавая элементы.
 */

interface Props {
  state: GameState;
  stats: HeroStats;
}

interface Float { id: number; x: number; y: number; text: string; cls: string }
interface Ghost { id: number; emoji: string; boss: boolean }

// Какие события уже показаны (чтобы при возврате на вкладку «Бой» не повторять последнее)
let lastHandledId = 0;
let floatId = 0;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function Torch({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`torch torch-${side}`}>
      <div className="torch-glow" />
      <div className="torch-bracket" />
      <div className="flame"><i className="f1" /><i className="f2" /><i className="f3" /></div>
    </div>
  );
}

export default function BattleScene({ state, stats }: Props) {
  const { hero, monster, monsterHp, monsterAi, heroStatus, equipped, isDead, events, showFloorBanner } = state;
  const biome = biomeForFloor(hero.floor);

  const sceneRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const monsterRef = useRef<HTMLDivElement>(null);
  const heroLayer = useRef<HTMLDivElement>(null);
  const monsterLayer = useRef<HTMLDivElement>(null);
  const particles = useRef<ParticleHandle>(null);
  const timers = useRef<number[]>([]);

  const [floats, setFloats] = useState<Float[]>([]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [swing, setSwing] = useState({ key: 0, heavy: false });
  const [bossBannerId, setBossBannerId] = useState(0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

    const pos = (who: 'hero' | 'monster') => {
      const s = sceneRef.current!.getBoundingClientRect();
      const a = (who === 'hero' ? heroRef : monsterRef).current!.getBoundingClientRect();
      return { x: a.left - s.left + a.width / 2, y: a.top - s.top + a.height * 0.45 };
    };
    const anim = (el: HTMLElement | null, frames: Keyframe[], duration: number, delay = 0) => {
      if (el && !reduced) el.animate(frames, { duration, delay, easing: 'ease-out' });
    };
    const shake = (px: number, ms = 300) => {
      const j = (n: number) => `translate(${(Math.random() * 2 - 1) * n}px, ${(Math.random() * 2 - 1) * n * 0.6}px)`;
      anim(innerRef.current, [
        { transform: 'translate(0,0)' }, { transform: j(px) }, { transform: j(px) },
        { transform: j(px * 0.6) }, { transform: 'translate(0,0)' },
      ], ms);
    };
    const flash = (color: string, strength = 0.4, ms = 280) => {
      anim(flashRef.current, [{ opacity: strength, background: color }, { opacity: 0, background: color }], ms);
    };
    const addFloat = (who: 'hero' | 'monster', text: string, cls: string, dyOff = 0) => {
      const p = pos(who);
      const f: Float = { id: ++floatId, x: p.x + (Math.random() * 2 - 1) * 22, y: p.y - 24 + dyOff, text, cls };
      setFloats(list => [...list.slice(-12), f]);
      later(() => setFloats(list => list.filter(x => x.id !== f.id)), 1100);
    };
    const burst = (kind: Parameters<ParticleHandle['emit']>[0], who: 'hero' | 'monster', delay = 0, opts?: { color?: string; big?: boolean }) => {
      const run = () => { const p = pos(who); particles.current?.emit(kind, p.x, p.y, opts); };
      if (delay) later(run, delay); else run();
    };

    const handle = (e: GameEvent) => {
      switch (e.type) {
        case 'hero_attack': {
          setSwing(s => ({ key: s.key + 1, heavy: e.heavy }));
          const far = e.heavy ? '78%' : '58%';
          anim(heroLayer.current, [
            { transform: 'translateX(0) scale(1)' },
            { transform: `translateX(${far}) scale(1.08)`, offset: 0.35 },
            { transform: 'translateX(0) scale(1)' },
          ], e.heavy ? 520 : 380);
          anim(monsterLayer.current, [
            { transform: 'translateX(0) rotate(0)', filter: 'brightness(2.6) saturate(0.2)' },
            { transform: 'translateX(14%) rotate(5deg)', filter: 'brightness(1.6)', offset: 0.3 },
            { transform: 'translateX(0) rotate(0)', filter: 'brightness(1)' },
          ], 340, 130);
          burst(e.heavy ? 'strike' : e.crit ? 'crit' : 'hit', 'monster', 130);
          addFloat('monster', e.crit ? `${e.dmg}!` : `${e.dmg}`, e.heavy ? 'f-heavy' : e.crit ? 'f-crit' : 'f-dmg');
          if (e.heavy) { later(() => shake(9, 320), 130); flash('#ffffff', 0.45); }
          else if (e.crit) later(() => shake(5, 260), 130);
          break;
        }
        case 'monster_dodge':
          addFloat('monster', 'МИМО', 'f-dodge');
          burst('dodge', 'monster');
          break;
        case 'monster_attack': {
          const far = e.heavy ? '-85%' : '-55%';
          anim(monsterLayer.current, [
            { transform: 'translateX(0) scale(1)' },
            { transform: `translateX(${far}) scale(${e.heavy ? 1.18 : 1.08})`, offset: 0.35 },
            { transform: 'translateX(0) scale(1)' },
          ], e.heavy ? 520 : 400);
          if (e.dodged) {
            anim(heroLayer.current, [{ transform: 'translateX(0)' }, { transform: 'translateX(-22%)', offset: 0.4 }, { transform: 'translateX(0)' }], 360, 120);
            addFloat('hero', 'УКЛОН', 'f-dodge');
            burst('dodge', 'hero', 120);
          } else {
            anim(heroLayer.current, [
              { transform: 'translateX(0) rotate(0)', filter: 'brightness(2.4) saturate(0.3)' },
              { transform: 'translateX(-14%) rotate(-5deg)', filter: 'brightness(1.5)', offset: 0.3 },
              { transform: 'translateX(0) rotate(0)', filter: 'brightness(1)' },
            ], 340, 130);
            burst(e.blocked ? 'block' : 'hurt', 'hero', 130);
            addFloat('hero', e.blocked ? `🛡️${e.dmg}` : `-${e.dmg}`, e.heavy ? 'f-heavy-hurt' : 'f-hurt');
            later(() => shake(e.heavy ? 11 : 4, e.heavy ? 380 : 220), 130);
            if (e.heavy) flash('#ef4444', 0.4, 380);
          }
          break;
        }
        case 'thorns':
          addFloat('hero', `-${e.dmg}🌵`, 'f-hurt', -14);
          burst('hurt', 'hero');
          break;
        case 'poison_tick':
          addFloat('hero', `-${e.dmg}`, 'f-poison', -10);
          burst('poison', 'hero');
          break;
        case 'poisoned':
          burst('poison', 'hero');
          break;
        case 'heal':
          if (e.source !== 'regen') {
            addFloat('hero', `+${e.amount}`, 'f-heal', -8);
            burst('heal', 'hero');
          }
          break;
        case 'ability':
          if (e.ability === 'shield') { burst('shield', 'hero'); flash('#38bdf8', 0.25, 400); }
          break;
        case 'boss_spawn':
          burst('boss', 'monster');
          shake(8, 420);
          setBossBannerId(e.id);
          later(() => setBossBannerId(0), 1900);
          break;
        case 'boss_charge':
          addFloat('monster', 'ЗАМАХ!', 'f-hurt', -30);
          flash('#ef4444', 0.22, 500);
          shake(3, 300);
          break;
        case 'enrage':
          addFloat('monster', 'ЯРОСТЬ!', 'f-hurt', -30);
          burst('boss', 'monster');
          break;
        case 'monster_regen':
          addFloat('monster', `+${e.amount}`, 'f-heal', -8);
          break;
        case 'monster_killed': {
          const g: Ghost = { id: e.id, emoji: e.emoji, boss: e.boss };
          setGhosts(list => [...list, g]);
          later(() => setGhosts(list => list.filter(x => x.id !== g.id)), 800);
          burst('smoke', 'monster');
          burst('coins', 'monster', 0, { big: e.boss || e.elite });
          addFloat('monster', `+${e.gold} 💰`, 'f-gold', -34);
          break;
        }
        case 'level_up':
          burst('levelup', 'hero');
          addFloat('hero', 'УРОВЕНЬ!', 'f-info', -40);
          flash('#fde047', 0.2, 500);
          break;
        case 'loot': {
          const hex = RARITY_COLORS[e.rarity].hex;
          const big = e.rarity === 'epic' || e.rarity === 'legendary';
          burst('loot', 'monster', 200, { color: hex, big });
          if (e.rarity === 'legendary') flash('#fcd34d', 0.3, 700);
          break;
        }
        case 'hero_died':
          burst('smoke', 'hero');
          shake(10, 420);
          break;
        case 'respawn':
          burst('levelup', 'hero');
          break;
        case 'rebirth': {
          const s = sceneRef.current!.getBoundingClientRect();
          particles.current?.emit('rebirth', s.width / 2, s.height * 0.55);
          flash('#e9d5ff', 0.7, 900);
          break;
        }
      }
    };

    for (const e of events) {
      if (e.id <= lastHandledId) continue;
      lastHandledId = e.id;
      handle(e);
    }
  }, [events]);

  const vars = {
    '--wall': biome.wall, '--wall-dark': biome.wallDark,
    '--floor-top': biome.floorTop, '--floor-bottom': biome.floorBottom,
    '--flame-core': biome.flameCore, '--flame-edge': biome.flameEdge,
    '--light': biome.light, '--mist': biome.mist,
  } as React.CSSProperties;

  return (
    <div ref={sceneRef} className="scene" style={vars}>
      <div ref={innerRef} className="scene-inner">
        {/* ── фон ── */}
        <div className="scene-wall" />
        <div className="scene-pillar scene-pillar-l" />
        <div className="scene-pillar scene-pillar-r" />
        <div className="scene-lintel" />
        <div className="scene-portal" />
        <Torch side="left" />
        <Torch side="right" />
        <div className="scene-fog fog-a" />
        <div className="scene-fog fog-b" />
        <div className="scene-floor" />

        {/* ── герой ── */}
        <div ref={heroRef} className="actor actor-hero">
          <div ref={heroLayer} className="actor-layer">
            <div className={`idle-hero ${isDead ? 'is-dead' : ''}`}>
              {heroStatus.shieldCharges > 0 && <div className="shield-bubble" />}
              <HeroSprite equipped={equipped} swingKey={swing.key} heavy={swing.heavy} dead={isDead} />
            </div>
          </div>
          <div className="actor-shadow" />
        </div>

        {/* ── монстр ── */}
        <div
          ref={monsterRef}
          className={`actor actor-monster ${monster.isBoss ? 'is-boss' : ''} ${monster.isElite ? 'is-elite' : ''} ${monsterAi.charging ? 'is-charging' : ''}`}
        >
          {(monster.isBoss || monster.isElite) && <div className="monster-aura" />}
          <div ref={monsterLayer} className="actor-layer">
            <div key={state.monsterId} className="spawn-in">
              <div className="idle-monster">
                <span className="monster-emoji">{monster.emoji}</span>
              </div>
            </div>
          </div>
          <div className="actor-shadow" />
        </div>

        {/* уходящие в небытие побеждённые враги */}
        {ghosts.map(g => (
          <div key={g.id} className={`actor actor-monster actor-ghost ${g.boss ? 'is-boss' : ''}`}>
            <div className="actor-layer"><div className="ghost-die"><span className="monster-emoji">{g.emoji}</span></div></div>
          </div>
        ))}

        <ParticleLayer ref={particles} ambient={biome.ambient} lightColor={biome.light} />

        {/* всплывающие числа */}
        <div className="float-layer">
          {floats.map(f => (
            <div key={f.id} className={`float-text ${f.cls}`} style={{ left: f.x, top: f.y }}>{f.text}</div>
          ))}
        </div>

        <div className="scene-vignette" />
        <div ref={flashRef} className="scene-flash" />

        {/* ── плашки здоровья ── */}
        <div className="hud-row">
          <HeroPanel hero={hero} stats={stats} status={heroStatus} />
          <MonsterPanel monster={monster} hp={monsterHp} ai={monsterAi} />
        </div>

        {/* ── баннеры ── */}
        {bossBannerId !== 0 && !showFloorBanner && (
          <div className="banner banner-boss">
            <div className="banner-small">⚠️ БОСС ⚠️</div>
            <div className="banner-title">{monster.name}</div>
          </div>
        )}
        {showFloorBanner && (
          <div className="banner banner-floor">
            <div className="banner-small">🏆 Этаж пройден!</div>
            <div className="banner-title">Этаж {hero.floor}</div>
            <div className="banner-small">{biome.emoji} {biome.name}</div>
          </div>
        )}
        {isDead && (
          <div className="banner banner-death">
            <div className="text-5xl mb-1">💀</div>
            <div className="banner-title text-red-400">Ты пал в бою</div>
            <div className="banner-small">Возрождение...</div>
          </div>
        )}
      </div>
    </div>
  );
}

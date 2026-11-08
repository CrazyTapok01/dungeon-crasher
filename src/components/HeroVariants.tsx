import type { Equipment, Rarity } from '../types';

/*
 * Облики героя (всё в SVG): маг, вор и «Охотник на демонов» из Преисподней.
 * Рыцарь-воин лежит в HeroSprite.tsx. У всех одинаковые размеры (140×170) и точка вращения оружия (104, 86),
 * поэтому общая анимация взмаха из index.css работает для всех.
 */

const GLOW: Record<Rarity | 'none', [string, string]> = {
  none: ['#e9d5ff', '#a855f7'], common: ['#e5e7eb', '#9ca3af'],
  uncommon: ['#d9f99d', '#22c55e'], rare: ['#bfdbfe', '#3b82f6'],
  epic: ['#f0abfc', '#9333ea'], legendary: ['#fef9c3', '#f59e0b'], divine: ['#ecfeff', '#22d3ee'], secret: ['#fdf4ff', '#d946ef'],
};
const ROBE: Record<Rarity | 'none', [string, string]> = {
  none: ['#6d28d9', '#2e1065'], common: ['#6d28d9', '#2e1065'],
  uncommon: ['#15803d', '#052e16'], rare: ['#1d4ed8', '#172554'],
  epic: ['#a21caf', '#4a044e'], legendary: ['#d97706', '#451a03'], divine: ['#0891b2', '#083344'], secret: ['#a21caf', '#2e1065'],
};
const AURA: Record<Rarity, string> = {
  common: '#cbd5e1', uncommon: '#4ade80', rare: '#60a5fa', epic: '#c084fc', legendary: '#fcd34d', divine: '#67e8f9', secret: '#f0abfc',
};

interface P { equipped: Equipment; swingKey: number; heavy: boolean; dead: boolean; }

const swingClass = (k: number, heavy: boolean) => (k ? (heavy ? 'sword-swing-heavy' : 'sword-swing') : 'sword-idle');

function Aura({ amulet }: { amulet?: Rarity }) {
  if (!amulet) return null;
  return (
    <>
      <defs>
        <radialGradient id="hv-aura" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={AURA[amulet]} stopOpacity=".7" /><stop offset="1" stopColor={AURA[amulet]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="hero-aura" cx="66" cy="92" r="64" fill="url(#hv-aura)" />
    </>
  );
}

/** 🔮 Маг: мантия, остроконечная шляпа, посох с шаром. */
export function MageSprite({ equipped, swingKey, heavy, dead }: P) {
  const [o1, o2] = GLOW[equipped.weapon?.rarity ?? 'none'];
  const [r1, r2] = ROBE[equipped.armor?.rarity ?? 'none'];
  const amulet = equipped.amulet?.rarity;
  return (
    <svg viewBox="0 0 140 170" className={`hero-svg hero-mage ${dead ? 'hero-dead' : ''}`} aria-label="Маг">
      <defs>
        <linearGradient id="hm-robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={r1} /><stop offset="1" stopColor={r2} /></linearGradient>
        <radialGradient id="hm-orb" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#fff" /><stop offset=".4" stopColor={o1} /><stop offset="1" stopColor={o2} /></radialGradient>
        <linearGradient id="hm-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#92400e" /><stop offset="1" stopColor="#451a03" /></linearGradient>
      </defs>
      <Aura amulet={amulet} />
      {/* мантия: колышется как плащ */}
      <g className="hero-cape">
        <path d="M44 66 Q68 56 92 66 L104 150 Q68 160 32 150 Z" fill="url(#hm-robe)" stroke="#00000066" strokeWidth="1.2" />
        <path d="M68 70 V152" stroke="#ffffff22" strokeWidth="2" />
        <path d="M34 146 Q68 156 102 146" stroke="#fde68a" strokeOpacity=".6" strokeWidth="2.5" fill="none" />
      </g>
      <path d="M46 100 h44 v7 h-44z" fill="#78350f" stroke="#1c1209" strokeWidth="1" />
      <rect x="64" y="99" width="9" height="9" rx="1.5" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
      {/* плечи и рука */}
      <ellipse cx="50" cy="70" rx="9" ry="7" fill="url(#hm-robe)" stroke="#00000066" strokeWidth="1" />
      <ellipse cx="88" cy="70" rx="9" ry="7" fill="url(#hm-robe)" stroke="#00000066" strokeWidth="1" />
      {/* голова и шляпа */}
      <circle cx="68" cy="50" r="15" fill="#f1c9a5" stroke="#7c4a2a" strokeWidth="1.2" />
      <path d="M54 50 q14 -4 28 0 v6 q-14 12 -28 0z" fill="#e2e8f0" opacity=".9" />
      <circle cx="62" cy="49" r="2.1" fill="#312e81" /><circle cx="74" cy="49" r="2.1" fill="#312e81" />
      <g className="hero-plume">
        <ellipse cx="68" cy="40" rx="30" ry="7" fill="url(#hm-robe)" stroke="#00000066" strokeWidth="1.2" />
        <path d="M52 40 Q60 12 80 2 Q76 18 84 40Z" fill="url(#hm-robe)" stroke="#00000066" strokeWidth="1.2" />
        <path d="M54 37 H82" stroke="#fde68a" strokeWidth="3" />
        <circle cx="86" cy="4" r="3" fill="#fde68a" />
      </g>
      {/* посох */}
      <g key={swingKey} className={swingClass(swingKey, heavy)}>
        <path d="M90 74 L104 86" stroke="url(#hm-robe)" strokeWidth="9" strokeLinecap="round" />
        <rect x="102" y="26" width="5" height="110" rx="2.5" fill="url(#hm-wood)" stroke="#1c1209" strokeWidth="1" />
        <path d="M96 30 Q104.5 16 113 30" stroke="url(#hm-wood)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="104.5" cy="22" r="13" fill={o1} opacity=".25" />
        <circle cx="104.5" cy="22" r="8" fill="url(#hm-orb)" stroke={o2} strokeWidth="1" />
        <circle cx="104.5" cy="86" r="5.5" fill="#f1c9a5" stroke="#7c4a2a" strokeWidth="1" />
      </g>
    </svg>
  );
}

/** 🗡️ Вор: капюшон, шарф, два кинжала. */
export function ThiefSprite({ equipped, swingKey, heavy, dead }: P) {
  const [b1, b2] = GLOW[equipped.weapon?.rarity ?? 'none'];
  const [c1, c2] = ROBE[equipped.armor?.rarity ?? 'none'];
  const amulet = equipped.amulet?.rarity;
  return (
    <svg viewBox="0 0 140 170" className={`hero-svg hero-thief ${dead ? 'hero-dead' : ''}`} aria-label="Вор">
      <defs>
        <linearGradient id="ht-cloak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#334155" /><stop offset="1" stopColor="#0f172a" /></linearGradient>
        <linearGradient id="ht-trim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient>
        <linearGradient id="ht-blade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={b2} /><stop offset=".5" stopColor={b1} /><stop offset="1" stopColor={b2} /></linearGradient>
      </defs>
      <Aura amulet={amulet} />
      <g className="hero-cape">
        <path d="M56 62 C30 72 20 112 26 150 L38 140 L48 152 L60 138 L70 70 Z" fill="url(#ht-cloak)" stroke="#00000077" strokeWidth="1" />
        <path d="M30 120 L40 112 M36 140 L46 130" stroke="#ffffff1a" strokeWidth="2" />
      </g>
      {/* ноги */}
      <path d="M50 108 h16 v36 h-16z" fill="#1e293b" /><path d="M46 142 h24 q4 0 4 5 v5 h-30 v-5 q0 -5 2 -5z" fill="#27272a" stroke="#09090b" strokeWidth="1" />
      <path d="M68 108 h16 v36 h-16z" fill="#334155" /><path d="M64 142 h26 q4 0 4 5 v5 h-32 v-5 q0 -5 2 -5z" fill="#3f3f46" stroke="#09090b" strokeWidth="1" />
      {/* туловище */}
      <path d="M48 64 Q68 56 88 64 L86 108 Q68 114 50 108 Z" fill="url(#ht-cloak)" stroke="#00000077" strokeWidth="1.3" />
      <path d="M52 72 L84 100 M84 72 L52 100" stroke="#78350f" strokeWidth="3" opacity=".85" />
      <rect x="48" y="102" width="40" height="7" fill="url(#ht-trim)" stroke="#09090b" strokeWidth="1" />
      <rect x="64" y="101" width="8" height="9" rx="1.5" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
      {/* второй кинжал в задней руке */}
      <g>
        <path d="M44 74 L32 92" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
        <path d="M30 94 L27 62 L33 94Z" fill="url(#ht-blade)" stroke="#0f172a" strokeWidth="1" />
        <rect x="26" y="92" width="10" height="3.5" rx="1.5" fill="#fde68a" stroke="#78350f" strokeWidth=".8" />
      </g>
      {/* капюшон, шарф, глаза */}
      <g className="hero-plume">
        <path d="M44 56 C42 24 60 14 74 16 C92 18 96 40 92 58 C84 50 52 50 44 56Z" fill="url(#ht-cloak)" stroke="#00000088" strokeWidth="1.4" />
        <path d="M46 56 q22 -10 46 2" stroke="url(#ht-trim)" strokeWidth="3" fill="none" />
      </g>
      <path d="M52 48 q16 -6 32 0 v10 q-16 8 -32 0z" fill="#0b1220" />
      <path d="M52 56 q16 8 32 0 v9 q-16 8 -32 0z" fill="url(#ht-trim)" stroke="#00000066" strokeWidth="1" />
      <rect x="58" y="48" width="6" height="2.6" rx="1" fill="#4ade80" stroke="#4ade80" strokeOpacity=".4" strokeWidth="3" />
      <rect x="72" y="48" width="6" height="2.6" rx="1" fill="#4ade80" stroke="#4ade80" strokeOpacity=".4" strokeWidth="3" />
      <ellipse cx="50" cy="68" rx="9" ry="7" fill="url(#ht-cloak)" stroke="#00000077" strokeWidth="1.2" />
      <ellipse cx="88" cy="68" rx="9" ry="7" fill="url(#ht-cloak)" stroke="#00000077" strokeWidth="1.2" />
      {/* основной кинжал */}
      <g key={swingKey} className={swingClass(swingKey, heavy)}>
        <path d="M88 72 L104 86" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
        <path d="M101 80 L108 80 L106 40 L104.5 30 L103 40Z" fill="url(#ht-blade)" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
        <path d="M104.5 34 V78" stroke="#ffffff88" strokeWidth="1" />
        <rect x="97" y="79" width="15" height="4.5" rx="2" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
        <rect x="102" y="83" width="5" height="11" rx="1.5" fill="#44403c" stroke="#09090b" strokeWidth="1" />
        <circle cx="104.5" cy="87" r="5.5" fill="#475569" stroke="#09090b" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/** 😈 Охотник на демонов: рогатый шлем, пылающий клинок, рваный плащ. Герой Преисподней. */
export function HellSprite({ equipped, swingKey, heavy, dead }: P) {
  const [b1] = GLOW[equipped.weapon?.rarity ?? 'none'];
  const amulet = equipped.amulet?.rarity;
  const rare = equipped.armor?.rarity;
  const plate = rare === 'secret' ? '#f0abfc' : rare === 'divine' ? '#67e8f9' : rare === 'legendary' ? '#fbbf24' : rare === 'epic' ? '#f0abfc' : rare === 'rare' ? '#93c5fd' : '#f87171';
  return (
    <svg viewBox="0 0 140 170" className={`hero-svg hero-hell ${dead ? 'hero-dead' : ''}`} aria-label="Охотник на демонов">
      <defs>
        <linearGradient id="hh-armor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#57534e" /><stop offset=".5" stopColor="#292524" /><stop offset="1" stopColor="#0c0a09" /></linearGradient>
        <linearGradient id="hh-cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#991b1b" /><stop offset="1" stopColor="#1c0505" /></linearGradient>
        <linearGradient id="hh-blade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#7f1d1d" /><stop offset=".5" stopColor="#f97316" /><stop offset="1" stopColor={b1} /></linearGradient>
        <linearGradient id="hh-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ef4444" /><stop offset="1" stopColor="#fde047" /></linearGradient>
      </defs>
      <Aura amulet={amulet} />
      <g className="hero-cape">
        <path d="M54 62 C26 72 12 112 18 154 L30 142 L38 156 L50 140 L58 152 L68 70Z" fill="url(#hh-cape)" stroke="#00000088" strokeWidth="1" />
      </g>
      <path d="M50 108 h17 v36 h-17z" fill="#1c1917" /><path d="M46 142 h25 q5 0 5 5 v5 h-32 v-5 q0 -5 2 -5z" fill="#292524" stroke="#000" strokeWidth="1" />
      <path d="M69 108 h17 v36 h-17z" fill="url(#hh-armor)" /><path d="M65 142 h27 q5 0 5 5 v5 h-34 v-5 q0 -5 2 -5z" fill="#44403c" stroke="#000" strokeWidth="1" />
      <path d="M46 64 Q68 54 91 64 L90 108 Q68 114 46 108Z" fill="url(#hh-armor)" stroke="#000" strokeWidth="1.4" />
      <path d="M68 70 V104 M54 78 Q68 84 82 78 M54 92 Q68 98 82 92" stroke={plate} strokeOpacity=".75" strokeWidth="2" fill="none" />
      <circle cx="68" cy="86" r="5" fill="#f97316" stroke="#fde047" strokeWidth="1.2" />
      <rect x="46" y="102" width="44" height="7" fill="#1c1917" stroke="#000" strokeWidth="1" />
      {/* наплечники с шипами */}
      <path d="M38 70 L40 52 L50 64 Z" fill="url(#hh-armor)" stroke="#000" strokeWidth="1" />
      <path d="M98 70 L96 52 L86 64 Z" fill="url(#hh-armor)" stroke="#000" strokeWidth="1" />
      <ellipse cx="49" cy="68" rx="10" ry="8" fill="url(#hh-armor)" stroke={plate} strokeOpacity=".7" strokeWidth="1.4" />
      <ellipse cx="90" cy="68" rx="10" ry="8" fill="url(#hh-armor)" stroke={plate} strokeOpacity=".7" strokeWidth="1.4" />
      {/* шлем с рогами */}
      <g className="hero-plume">
        <path d="M52 34 C40 28 34 12 38 2 C44 14 54 20 62 26Z" fill="#d6d3d1" stroke="#000" strokeWidth="1" />
        <path d="M84 34 C96 28 102 12 98 2 C92 14 82 20 74 26Z" fill="#d6d3d1" stroke="#000" strokeWidth="1" />
      </g>
      <circle cx="68" cy="46" r="19" fill="url(#hh-armor)" stroke="#000" strokeWidth="1.6" />
      <path d="M54 46 h28 v8 q0 9 -14 9 q-14 0 -14 -9z" fill="#0b0504" />
      <path d="M57 47 l8 3 -1 -5z M79 47 l-8 3 1 -5z" fill="#f97316" stroke="#fb923c" strokeWidth="2.5" strokeOpacity=".5" />
      <path d="M68 28 v14" stroke={plate} strokeOpacity=".8" strokeWidth="2.5" />
      {/* пылающий клинок */}
      <g key={swingKey} className={swingClass(swingKey, heavy)}>
        <path d="M90 72 L104 86" stroke="#292524" strokeWidth="9" strokeLinecap="round" />
        <path d="M100 76 L109 76 L110 22 L105 4 L100 22 Z" fill="none" stroke="#f97316" strokeOpacity=".35" strokeWidth="7" strokeLinejoin="round" />
        <path d="M101 76 L108 76 L107 22 L104.5 6 L102 22Z" fill="url(#hh-blade)" stroke="#000" strokeWidth="1" strokeLinejoin="round" />
        <path d="M108 40 q8 -6 3 -16 q-1 8 -6 10z M101 30 q-8 -4 -4 -14 q2 6 6 8z" fill="url(#hh-flame)" opacity=".9" />
        <rect x="95" y="75" width="19" height="5" rx="2" fill="#b91c1c" stroke="#000" strokeWidth="1" />
        <rect x="102" y="80" width="5" height="14" rx="1.5" fill="#1c1917" stroke="#000" strokeWidth="1" />
        <circle cx="104.5" cy="96" r="3.2" fill="#f97316" stroke="#000" strokeWidth="1" />
        <circle cx="104.5" cy="86" r="6" fill="url(#hh-armor)" stroke="#000" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

import type { Equipment, Rarity } from '../types';

/*
 * ГЕРОЙ — рыцарь, нарисованный в SVG (никаких картинок).
 * Внешний вид зависит от экипировки: цвет клинка — по редкости оружия,
 * плащ — по редкости доспеха, а за спиной светится аура, если надет амулет.
 */

const BLADE: Record<Rarity | 'none', [string, string]> = {
  none: ['#e5e7eb', '#9ca3af'], common: ['#e5e7eb', '#9ca3af'],
  uncommon: ['#d9f99d', '#22c55e'], rare: ['#bfdbfe', '#3b82f6'],
  epic: ['#f0abfc', '#9333ea'], legendary: ['#fef9c3', '#f59e0b'],
};
const CAPE: Record<Rarity | 'none', [string, string]> = {
  none: ['#b91c1c', '#450a0a'], common: ['#b91c1c', '#450a0a'],
  uncommon: ['#16a34a', '#052e16'], rare: ['#2563eb', '#172554'],
  epic: ['#9333ea', '#3b0764'], legendary: ['#d97706', '#451a03'],
};
const AURA: Record<Rarity, string> = {
  common: '#cbd5e1', uncommon: '#4ade80', rare: '#60a5fa', epic: '#c084fc', legendary: '#fcd34d',
};

interface Props {
  equipped: Equipment;
  swingKey: number;   // меняется при каждом ударе — перезапускает взмах меча
  heavy: boolean;     // сильный удар: взмах шире
  dead: boolean;
}

export default function HeroSprite({ equipped, swingKey, heavy, dead }: Props) {
  const weapon = equipped.weapon?.rarity ?? 'none';
  const armor = equipped.armor?.rarity ?? 'none';
  const amulet = equipped.amulet?.rarity;
  const [b1, b2] = BLADE[weapon];
  const [c1, c2] = CAPE[armor];
  const legendaryBlade = weapon === 'legendary' || weapon === 'epic';

  return (
    <svg viewBox="0 0 140 170" className={`hero-svg ${dead ? 'hero-dead' : ''}`} aria-label="Герой">
      <defs>
        <linearGradient id="hs-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f5f9" /><stop offset=".45" stopColor="#94a3b8" /><stop offset="1" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="hs-steel2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#64748b" /><stop offset="1" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="hs-cape" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} />
        </linearGradient>
        <linearGradient id="hs-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={b2} /><stop offset=".5" stopColor={b1} /><stop offset="1" stopColor={b2} />
        </linearGradient>
        <linearGradient id="hs-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef08a" /><stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <radialGradient id="hs-aura" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={amulet ? AURA[amulet] : '#000'} stopOpacity=".7" />
          <stop offset="1" stopColor={amulet ? AURA[amulet] : '#000'} stopOpacity="0" />
        </radialGradient>
        <filter id="hs-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {amulet && <circle className="hero-aura" cx="66" cy="92" r="64" fill="url(#hs-aura)" />}

      {/* плащ (колышется) */}
      <g className="hero-cape">
        <path d="M54 62 C30 70 16 110 22 152 L36 144 L44 152 L56 140 L68 70 Z" fill="url(#hs-cape)" stroke="#00000055" strokeWidth="1" />
        <path d="M40 80 C34 100 32 120 34 140" stroke="#ffffff22" strokeWidth="2" fill="none" />
      </g>

      {/* задняя нога */}
      <path d="M50 110 h17 v34 h-17z" fill="url(#hs-steel2)" />
      <path d="M46 142 h25 q5 0 5 5 v5 h-32 v-5 q0 -5 2 -5z" fill="#3b2a1d" stroke="#1c1209" strokeWidth="1" />
      {/* передняя нога */}
      <path d="M69 110 h17 v34 h-17z" fill="url(#hs-steel)" />
      <path d="M65 142 h27 q5 0 5 5 v5 h-34 v-5 q0 -5 2 -5z" fill="#4a3424" stroke="#1c1209" strokeWidth="1" />
      <rect x="69" y="122" width="17" height="3" fill="#00000030" />

      {/* туловище */}
      <path d="M46 64 Q68 54 91 64 L90 108 Q68 114 46 108 Z" fill="url(#hs-steel)" stroke="#1e293b" strokeWidth="1.4" />
      <path d="M52 70 Q68 64 84 70 L82 96 Q68 100 54 96Z" fill="#ffffff22" />
      <rect x="46" y="100" width="44" height="8" fill="#5b3a1e" stroke="#1c1209" strokeWidth="1" />
      <rect x="64" y="99" width="9" height="10" rx="1.5" fill="url(#hs-gold)" stroke="#78350f" strokeWidth="1" />
      <path d="M68 74 l3 6 6 1 -4.5 4 1.2 6 -5.7 -3 -5.7 3 1.2 -6 -4.5 -4 6 -1z" fill="url(#hs-gold)" opacity=".95" />
      <path d="M46 108 h44 l-5 17 h-34z" fill="url(#hs-steel2)" stroke="#1e293b" strokeWidth="1.2" />

      {/* щит на левой руке */}
      <g>
        <path d="M24 76 h30 v26 q0 20 -15 30 q-15 -10 -15 -30z" fill="url(#hs-steel2)" stroke="url(#hs-gold)" strokeWidth="3" />
        <path d="M39 82 v42 M27 98 h24" stroke="url(#hs-gold)" strokeWidth="3.5" />
        <circle cx="39" cy="98" r="5" fill={AURA[amulet ?? 'common']} stroke="#78350f" strokeWidth="1" />
      </g>

      {/* голова: шлем с плюмажем */}
      <g className="hero-plume">
        <path d="M66 28 C58 4 30 4 18 24 C36 20 48 28 60 38Z" fill="url(#hs-cape)" stroke="#00000055" strokeWidth="1" />
      </g>
      <circle cx="68" cy="45" r="19" fill="url(#hs-steel)" stroke="#1e293b" strokeWidth="1.6" />
      <path d="M54 45 h30 v7 q0 9 -15 9 q-15 0 -15 -9z" fill="#0b1220" />
      <rect x="60" y="46" width="5" height="2.6" rx="1" fill="#fde047" filter="url(#hs-glow)" />
      <rect x="72" y="46" width="5" height="2.6" rx="1" fill="#fde047" filter="url(#hs-glow)" />
      <path d="M68 28 v16" stroke="#ffffff55" strokeWidth="2" />
      <path d="M52 40 Q68 32 84 40" stroke="#ffffff44" strokeWidth="2" fill="none" />

      {/* наплечники */}
      <ellipse cx="49" cy="68" rx="10" ry="8" fill="url(#hs-steel)" stroke="#1e293b" strokeWidth="1.3" />
      <ellipse cx="90" cy="68" rx="10" ry="8" fill="url(#hs-steel)" stroke="#1e293b" strokeWidth="1.3" />

      {/* рука с мечом: ключ перезапускает анимацию взмаха */}
      <g key={swingKey} className={swingKey ? (heavy ? 'sword-swing-heavy' : 'sword-swing') : 'sword-idle'}>
        <path d="M90 72 L104 84" stroke="url(#hs-steel2)" strokeWidth="9" strokeLinecap="round" />
        <g filter={legendaryBlade ? 'url(#hs-glow)' : undefined}>
          <path d="M101 76 L108 76 L106.5 18 L104.5 6 L102.5 18 Z" fill="url(#hs-blade)" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
          <path d="M104.5 12 V74" stroke="#ffffff88" strokeWidth="1" />
        </g>
        <rect x="95" y="75" width="19" height="5" rx="2" fill="url(#hs-gold)" stroke="#78350f" strokeWidth="1" />
        <rect x="102" y="80" width="5" height="14" rx="1.5" fill="#5b3a1e" stroke="#1c1209" strokeWidth="1" />
        <circle cx="104.5" cy="96" r="3.2" fill="url(#hs-gold)" stroke="#78350f" strokeWidth="1" />
        <circle cx="104.5" cy="86" r="6" fill="url(#hs-steel)" stroke="#1e293b" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

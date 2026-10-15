import type { ClassId, Equipment, Item, ItemSlot } from '../types';
import { ENHANCE, RARITY_COLORS, classDef, heroVariant, enhanceCost, enhanced } from '../gameData';
import HeroSprite from './HeroSprite';
import { useWorld } from './coin';

interface Props {
  equipped: Equipment;
  gold: number;
  heroClass: ClassId | null;
  onEnhance: (slot: ItemSlot) => void;
}

const LABEL: Record<ItemSlot, string> = { weapon: 'Оружие', armor: 'Доспех', amulet: 'Амулет' };
const EMPTY: Record<ItemSlot, string> = { weapon: '⚔️', armor: '🛡️', amulet: '📿' };

function mainStats(i: Item): string {
  const e = enhanced(i);
  return [e.atk && `⚔️${e.atk}`, e.def && `🛡️${e.def}`, e.hp && `❤️${e.hp}`].filter(Boolean).join(' ');
}

function Tile({ slot, item, gold, onEnhance }: { slot: ItemSlot; item?: Item; gold: number; onEnhance: () => void }) {
  if (!item) {
    return (
      <div className="rounded-xl border border-dashed border-purple-800/60 bg-black/30 p-2 text-center text-purple-400/60 min-h-[92px] flex flex-col items-center justify-center">
        <div className="text-2xl opacity-60">{EMPTY[slot]}</div>
        <div className="text-[10px]">{LABEL[slot]}: пусто</div>
      </div>
    );
  }
  const c = RARITY_COLORS[item.rarity];
  const plus = item.plus ?? 0;
  const maxed = plus >= ENHANCE.max;
  const cost = enhanceCost(item);
  return (
    <div className={`rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} p-1.5 text-center shadow-md ${c.glow}`}>
      <div className="text-[10px] text-purple-300 leading-none">{LABEL[slot]}</div>
      <div className="text-2xl leading-tight">{item.emoji}</div>
      <div className={`text-[11px] font-bold ${c.text} leading-tight truncate`}>{item.name.replace(/\s*\+\d+$/, '')}{plus > 0 && <span className="text-amber-300"> +{plus}</span>}</div>
      <div className="text-[10px] text-purple-100 leading-tight my-0.5">{mainStats(item)}</div>
      {maxed
        ? <div className="text-[10px] font-bold text-amber-300">⚒️ макс.</div>
        : <button onClick={onEnhance} disabled={gold < cost} className="btn-fantasy w-full rounded-md py-1 text-[10px] font-bold disabled:opacity-50">⚒️ +{plus + 1} · {cost}</button>}
    </div>
  );
}

/** «Кукла» героя: надетые вещи вокруг персонажа. */
export default function PaperDoll({ equipped, gold, heroClass, onEnhance }: Props) {
  const world = useWorld();
  return (
    <div className="rounded-xl bg-gradient-to-b from-purple-950/70 to-black/50 border border-purple-800/50 p-2 mb-4">
      <div className="text-center text-xs font-bold text-amber-200 mb-1">
        {world === 'hell' ? '😈 Охотник на демонов' : heroClass ? `${classDef(heroClass).emoji} ${classDef(heroClass).name}` : 'Крушитель'}
      </div>
      <div className="grid grid-cols-[1fr_1.1fr_1fr] gap-2 items-center">
        <Tile slot="weapon" item={equipped.weapon} gold={gold} onEnhance={() => onEnhance('weapon')} />
        <div className="relative h-[170px] overflow-hidden flex items-end justify-center">
          <div className="absolute inset-x-2 bottom-1 h-5 rounded-full bg-black/60 blur-[2px]" />
          <div className="w-[120px] origin-bottom scale-[0.82]">
            <HeroSprite equipped={equipped} swingKey={0} heavy={false} dead={false} variant={heroVariant(world, heroClass)} />
          </div>
        </div>
        <Tile slot="armor" item={equipped.armor} gold={gold} onEnhance={() => onEnhance('armor')} />
      </div>
      <div className="mt-2 max-w-[48%] mx-auto">
        <Tile slot="amulet" item={equipped.amulet} gold={gold} onEnhance={() => onEnhance('amulet')} />
      </div>
    </div>
  );
}

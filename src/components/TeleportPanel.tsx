import { useEffect, useState } from 'react';
import type { Meta, WorldId } from '../types';
import { TELEPORT, teleportCost, teleportInfo, teleportLoot } from '../gameData';
import { useFmt } from '../game/num';

interface Props {
  meta: Meta;
  world: WorldId;
  floor: number;
  goldBonus: number;
  xpBonus: number;
  isDead: boolean;
  inRaid: boolean;
  onTeleport: (floor: number, full: boolean) => void;
}

/** Телепорт вперёд за кристаллы: «быстрый» (без наград пути) и «полный» (с наградами, в 3 раза дороже). */
export default function TeleportPanel({ meta, world, floor, goldBonus, xpBonus, isDead, inRaid, onTeleport }: Props) {
  const f = useFmt();
  const info = teleportInfo(meta, world);
  const minTo = floor + TELEPORT.step;
  const canJump = info.available && info.max >= minTo;
  const [to, setTo] = useState(info.max);
  // если рекорд или этаж изменились — держим выбор внутри допустимого диапазона
  useEffect(() => { setTo(t => Math.min(Math.max(t, minTo), Math.max(minTo, info.max))); }, [minTo, info.max]);
  const target = Math.min(Math.max(to, minTo), Math.max(minTo, info.max));
  const skip = target - floor;
  const cheap = teleportCost(skip, false);
  const full = teleportCost(skip, true);
  const loot = canJump ? teleportLoot(floor, target, world, goldBonus, xpBonus) : { gold: 0, xp: 0 };
  const coin = world === 'hell' ? '🔥' : '💰';
  const blocked = isDead || inRaid;
  const go = (isFull: boolean) => {
    const cost = isFull ? full : cheap;
    if (!window.confirm(`Телепорт с этажа ${floor} на этаж ${target} (${isFull ? 'полный' : 'быстрый'}) за ${cost} 💎?\nГерой на новом этаже может оказаться слабее монстров: при смерти ты вернёшься на этаж ниже.`)) return;
    onTeleport(target, isFull);
  };
  return (
    <div className="rounded-xl p-3 bg-gradient-to-br from-cyan-900/50 to-indigo-950/80 border border-cyan-500/50">
      <h2 className="text-xl font-black text-cyan-200 text-center text-stroke mb-1">🌀 Телепорт</h2>
      <p className="text-xs text-cyan-100/85 text-center leading-snug mb-2">
        Перенесись сразу вперёд — вплоть до своего рекорда в этом мире (рекорд: {info.record}). Оплата кристаллами; чем дальше прыжок, тем дороже каждый этаж.
      </p>
      {!info.available && <p className="text-center text-xs text-amber-300 font-bold">🔒 {info.reason}</p>}
      {info.available && !canJump && (
        <p className="text-center text-xs text-amber-300 font-bold">Ты уже на этаже {floor}: дальше {info.max} прыгнуть нельзя (это твой рекорд).</p>
      )}
      {canJump && (
        <>
          <div className="text-center text-sm text-cyan-100 mb-1">Этаж {floor} → <b className="text-amber-300">{target}</b> <span className="text-cyan-300/80">(+{skip})</span></div>
          <input type="range" min={minTo} max={info.max} step={TELEPORT.step} value={target} onChange={e => setTo(Number(e.target.value))}
            className="w-full accent-cyan-400" aria-label="Этаж назначения" />
          <div className="flex justify-between text-[10px] text-cyan-300/80 mb-2"><span>{minTo}</span><span>{info.max}</span></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-black/35 border border-cyan-800/60 p-2 text-center">
              <div className="text-sm font-black text-cyan-100">⚡ Быстрый</div>
              <div className="text-[10px] text-cyan-200/80 leading-tight my-1">Только переход. Награды за пропущенные этажи не выдаются.</div>
              <button disabled={blocked || meta.gems < cheap} onClick={() => go(false)} className="btn-fantasy w-full py-2 rounded-lg text-xs font-black disabled:opacity-50">💎 {cheap}</button>
            </div>
            <div className="rounded-lg bg-black/35 border border-amber-700/60 p-2 text-center">
              <div className="text-sm font-black text-amber-200">🎁 Полный</div>
              <div className="text-[10px] text-amber-100/80 leading-tight my-1">Как будто прошёл всё сам: {coin} ≈{f(loot.gold)}, опыт ≈{f(loot.xp)}, шанс на кристаллы, реликвии, камни и вещи с боссов.</div>
              <button disabled={blocked || meta.gems < full} onClick={() => go(true)} className="btn-purple w-full py-2 rounded-lg text-xs font-black disabled:opacity-50">💎 {full}</button>
            </div>
          </div>
          <p className="text-[11px] text-cyan-200/80 text-center mt-2">У тебя 💎 {meta.gems}{blocked ? ' · сейчас недоступно (герой погиб или идёт рейд)' : ''}</p>
        </>
      )}
    </div>
  );
}

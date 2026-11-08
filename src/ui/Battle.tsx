import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { Battle as B, Card, Enemy, Fx, Run, Meta } from '../game/types';
import type { Action } from '../game/engine';
import { ENEMIES } from '../game/data/enemies';
import { ELEM_EMOJI, ELEM_NAME, STATUS_EMOJI, cardDef, cardEff, cardText } from '../game/data/cards';
import { POTION } from '../game/data/items';
import { play } from '../game/audio';
import { CardView, DeckModal, Modal, StatusChips } from './common';

interface Float { key: number; to: 'hero' | number; text: string; color: string; at: number }

const fxToFloat = (f: Fx): { text: string; color: string } | null => {
  switch (f.kind) {
    case 'dmg': return { text: `${f.crit ? '💥' : ''}-${f.n}`, color: f.crit ? '#ffd25e' : '#ff8a8a' };
    case 'hurt': return { text: `-${f.n}`, color: '#ff5a5a' };
    case 'heal': return { text: `+${f.n}`, color: '#6dff9a' };
    case 'block': return (f.n ?? 0) < 0 ? { text: `🛡️${f.n}`, color: '#9ec9ff' } : { text: `+${f.n}🛡️`, color: '#9ec9ff' };
    case 'poison': return { text: `☠️-${f.n}`, color: '#9be86d' };
    case 'break': return { text: '💥 СЛОМ!', color: '#ffd25e' };
    case 'text': return { text: f.text ?? '', color: '#fff' };
    case 'buff': return { text: `${STATUS_EMOJI[f.text as keyof typeof STATUS_EMOJI] ?? '✨'}${(f.n ?? 0) > 0 ? '+' : ''}${f.n}`, color: '#d6c2ff' };
    default: return null;
  }
};

const heroDmgOf = (e: Enemy, b: B, base: number): number => {
  let n = base * e.dmgMult + (e.st.strength ?? 0);
  if (e.st.weak) n *= 0.75;
  if (b.st.vuln) n *= 1.5;
  return Math.max(0, Math.floor(n));
};

function Intent({ e, b }: { e: Enemy; b: B }) {
  if (e.broken) return <div className="intent chip !text-sm" style={{ borderColor: '#ffd25e', color: '#ffd25e' }}>😵 Оглушён</div>;
  const m = e.move;
  const parts: string[] = [];
  if (m.dmg) { const n = heroDmgOf(e, b, m.dmg); parts.push(`⚔️${n}${(m.hits ?? 1) > 1 ? `×${m.hits}` : ''}`); }
  if (m.block) parts.push('🛡️');
  if (m.self) parts.push('⬆️');
  if (m.hero) parts.push('⬇️');
  if (m.heal) parts.push('💚');
  if (m.summon) parts.push('🪦');
  if (m.give) parts.push('🃏');
  const atk = !!m.dmg;
  return (
    <div className="intent chip !text-sm !px-2 !py-0.5" style={{ borderColor: atk ? '#ff6a6a' : '#9ec9ff', color: atk ? '#ffb3b3' : '#cfe3ff' }} title={m.name}>
      {parts.length ? parts.join(' ') : m.emoji}
    </div>
  );
}

function EnemyView({ e, b, floats, hitKey, targetable, onTap }: {
  e: Enemy; b: B; floats: Float[]; hitKey: number; targetable: boolean; onTap: () => void;
}) {
  const def = ENEMIES[e.id];
  const alive = e.hp > 0;
  const big = def.kind === 'boss';
  const count = b.enemies.length;
  const size = big ? 'text-9xl' : count >= 3 ? 'text-6xl' : 'text-8xl';
  const pct = Math.max(0, (e.hp / e.maxHp) * 100);
  return (
    <div role={targetable && alive ? 'button' : undefined} aria-label={targetable && alive ? `Цель: ${def.name}` : undefined} className={`relative flex-1 min-w-0 flex flex-col items-center gap-1 ${targetable && alive ? 'cursor-pointer' : ''}`} onClick={onTap}>
      <div className="h-7 flex items-end">{alive && <Intent e={e} b={b} />}</div>
      <div key={hitKey} className={`relative ${hitKey ? 'shake' : ''}`}>
        <div className={`${alive ? (e.broken ? 'stunned' : 'enemy-wrap') : 'dead'} ${size} leading-none select-none`}
          style={{ filter: `drop-shadow(0 6px 10px rgba(0,0,0,.6))${targetable && alive ? ' drop-shadow(0 0 10px #ffd25e)' : ''}` }}>
          {def.emoji}
        </div>
        {floats.map(f => <span key={f.key} className="floaty" style={{ color: f.color }}>{f.text}</span>)}
      </div>
      {alive && (
        <div className="w-full px-1">
          <div className="text-[11px] font-bold text-center truncate">{def.name}{def.kind === 'elite' ? ' ⭐' : def.kind === 'boss' ? ' 👑' : ''}</div>
          <div className="bar mt-0.5 relative">
            <i style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#c0293d,#ff6b6b)' }} />
          </div>
          <div className="flex items-center justify-center gap-1 text-[11px] font-bold mt-0.5">
            <span>{e.hp}/{e.maxHp}</span>
            {e.block > 0 && <span className="text-sky-300">🛡️{e.block}</span>}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap" title="Гард">
            <span className="chip !px-1" title={`Слабость: ${ELEM_NAME[def.weak]}`}>{ELEM_EMOJI[def.weak]}</span>
            {e.broken
              ? <span className="text-[11px] font-black text-[var(--gold)]">ЦЕЛЬ ОТКРЫТА ×1.5</span>
              : Array.from({ length: e.maxGuard }, (_, i) => <span key={i} className={`guard-pip ${i < e.guard ? '' : 'off'}`} />)}
          </div>
          <StatusChips st={e.st} small />
        </div>
      )}
    </div>
  );
}

export default function Battle({ run, meta, fx, dispatch }: { run: Run; meta: Meta; fx: Fx[]; dispatch: Dispatch<Action> }) {
  const b = run.battle!;
  const [sel, setSel] = useState<number | null>(null);
  const [piles, setPiles] = useState<'draw' | 'discard' | 'exhaust' | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const [hits, setHits] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState(0);
  const seen = useRef(0);

  // новые события: числа над целями, тряска и звук
  useEffect(() => {
    const fresh = fx.filter(f => f.id > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(...fresh.map(f => f.id));
    const now = Date.now();
    const add: Float[] = [];
    const hit: Record<string, number> = {};
    fresh.forEach((f, i) => {
      const fl = fxToFloat(f);
      if (fl && fl.text) add.push({ key: f.id, to: f.to, text: fl.text, color: fl.color, at: now + i });
      if (f.kind === 'dmg' || f.kind === 'hurt') hit[String(f.to)] = f.id;
      if (f.kind === 'hurt') setFlash(f.id);
    });
    setFloats(x => [...x, ...add].slice(-14));
    setHits(h => ({ ...h, ...hit }));
    const kinds = new Set(fresh.map(f => f.kind));
    const bigHit = fresh.some(f => (f.kind === 'dmg' || f.kind === 'hurt') && (f.n ?? 0) >= 15);
    if (kinds.has('break')) play('break');
    else if (kinds.has('hurt')) play(bigHit ? 'big' : 'hurt');
    else if (kinds.has('dmg')) play(bigHit ? 'big' : 'hit');
    else if (kinds.has('block')) play('block');
    else if (kinds.has('heal')) play('heal');
    else if (kinds.has('buff')) play('buff');
    else if (kinds.has('poison')) play('poison');
    else if (kinds.has('play')) play('card');
    const t = setTimeout(() => setFloats(x => x.filter(f => Date.now() - f.at < 950)), 1000);
    return () => clearTimeout(t);
  }, [fx]);

  // ход врагов и победа идут сами, с паузами между шагами
  useEffect(() => {
    if (b.phase === 'enemy') {
      const t = setTimeout(() => dispatch({ type: 'ENEMY_STEP' }), 620);
      return () => clearTimeout(t);
    }
    if (b.phase === 'won') {
      play('win');
      const t = setTimeout(() => dispatch({ type: 'VICTORY' }), 1000);
      return () => clearTimeout(t);
    }
    if (b.phase === 'lost') play('lose');
  }, [b.phase, b.eIdx, b.turn, b.enemies.length, run.hp, dispatch]);

  useEffect(() => { if (b.phase === 'player' && b.turn > 1) play('turn'); }, [b.turn, b.phase]);
  useEffect(() => { if (sel !== null && !b.hand.some(c => c.uid === sel)) setSel(null); }, [b.hand, sel]);

  const alive = b.enemies.filter(e => e.hp > 0);
  const selCard: Card | undefined = b.hand.find(c => c.uid === sel);
  const selDef = selCard ? cardDef(selCard) : null;
  const needsTarget = selDef?.target === 'enemy' && alive.length > 1;
  const playerTurn = b.phase === 'player';

  const tapCard = (c: Card) => {
    const e = cardEff(c);
    if (!playerTurn) return;
    if (e.cost < 0 || e.cost > b.energy) { setSel(c.uid); play('click'); return; }
    if (sel !== c.uid) { setSel(c.uid); play('click'); return; }
    const d = cardDef(c);
    if (d.target === 'enemy' && alive.length > 1) return; // нужно выбрать цель
    dispatch({ type: 'PLAY', uid: c.uid });
  };
  const tapEnemy = (i: number) => {
    if (!playerTurn || !selCard || !needsTarget || b.enemies[i].hp <= 0) return;
    const e = cardEff(selCard);
    if (e.cost > b.energy) return;
    dispatch({ type: 'PLAY', uid: selCard.uid, target: i });
  };

  const usePot = (slot: number) => {
    const id = run.potions[slot];
    if (!id || !playerTurn) return;
    const def = POTION[id];
    if (def.target === 'enemy' && alive.length > 1) { setSel(null); setPotTarget(slot); return; }
    dispatch({ type: 'POTION', slot });
  };
  const [potTarget, setPotTarget] = useState<number | null>(null);
  const hasPot = run.potions.some(Boolean);
  const overlap = b.hand.length < 2 ? 0 : Math.max(-42, Math.min(6, Math.floor((352 - 74 * b.hand.length) / (b.hand.length - 1))));

  const incoming = useMemo(() => alive.filter(e => !e.broken).reduce((t, e) => t + (e.move.dmg ? heroDmgOf(e, b, e.move.dmg) * (e.move.hits ?? 1) : 0), 0), [alive, b]);
  const net = Math.max(0, incoming - b.block);

  return (
    <div className={`flex-1 min-h-0 flex flex-col relative ${flash ? 'flash-red' : ''}`} key={flash ? `f${flash}` : 'f0'}>
      {/* враги */}
      <div className="flex-1 min-h-0 flex items-center justify-center gap-1 px-2 pt-1">
        {b.enemies.map((e, i) => (
          <EnemyView key={e.uid} e={e} b={b} floats={floats.filter(f => f.to === e.uid)} hitKey={hits[String(e.uid)] ?? 0}
            targetable={playerTurn && needsTarget} onTap={() => tapEnemy(i)} />
        ))}
      </div>

      {/* герой */}
      <div className="shrink-0 px-3 py-1.5 flex items-center gap-2">
        <div className="relative">
          <div className={`text-5xl leading-none ${hits.hero ? 'shake' : ''}`} key={hits.hero ?? 0}>{run.cls === 'warrior' ? '🤺' : run.cls === 'mage' ? '🧙' : '🥷'}</div>
          {floats.filter(f => f.to === 'hero').map(f => <span key={f.key} className="floaty" style={{ color: f.color, top: 0 }}>{f.text}</span>)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-black">
            <span>❤️ {run.hp}</span>
            {b.block > 0 && <span className="text-sky-300">🛡️ {b.block}</span>}
            {net > 0 && playerTurn && <span className="text-[11px] font-bold text-red-300">ждёт −{net}</span>}
          </div>
          <StatusChips st={b.st} small />
        </div>
        <div className="grid place-items-center w-14 h-14 rounded-full font-black text-xl" style={{ background: 'radial-gradient(circle at 35% 30%, #7de3ff, #2563eb)', border: '3px solid #0b1a4a', boxShadow: '0 0 14px #3b82f6aa' }}>
          ⚡{b.energy}<span className="text-[9px] -mt-1 opacity-80">/{b.maxEnergy}</span>
        </div>
      </div>

      {/* описание выбранной карты */}
      <div className="shrink-0 px-3 h-12 flex items-center justify-center text-center text-[13px] leading-tight">
        {selCard && selDef
          ? <span className="fade"><b>{selDef.name}</b>: {cardText(selCard)} {cardEff(selCard).cost > b.energy ? <i className="text-red-300">Не хватает энергии.</i> : needsTarget ? <i className="text-[var(--gold)]">Выбери врага.</i> : <i className="text-[var(--gold)]">Нажми ещё раз.</i>}</span>
          : <span className="text-[var(--dim)]">{playerTurn ? 'Выбери карту. Бей по слабости, чтобы сломать Гард.' : b.phase === 'enemy' ? 'Ход врагов…' : ''}</span>}
      </div>

      {/* рука */}
      <div className="shrink-0 px-2 pt-4 pb-1 overflow-x-auto overflow-y-visible scroll" style={{ minHeight: 150 }}>
        <div className="flex w-max mx-auto px-3 pt-6">
          {b.hand.map((c, i) => {
            const e = cardEff(c);
            return <CardView key={c.uid} card={c} selected={sel === c.uid} cant={e.cost < 0 || e.cost > b.energy || !playerTurn}
              className="hand-card deal" onClick={() => tapCard(c)} style={{ animationDelay: `${i * 40}ms`, marginLeft: i === 0 ? 0 : overlap }} />;
          })}
        </div>
      </div>

      {/* низ */}
      <div className="shrink-0 px-3 pb-2 flex items-center gap-2" style={{ paddingBottom: 'max(var(--sab), 10px)' }}>
        <button className="btn-ghost !px-2.5 !py-2 text-sm font-black" onClick={() => setPiles('draw')} aria-label="Колода добора">📚 {b.draw.length}</button>
        <button className="btn-ghost !px-2.5 !py-2 text-sm font-black" onClick={() => setPiles('discard')} aria-label="Сброс">🗑️ {b.discard.length}</button>
        {b.exhaust.length > 0 && <button className="btn-ghost !px-2.5 !py-2 text-sm font-black" onClick={() => setPiles('exhaust')}>🔥 {b.exhaust.length}</button>}
        {hasPot && (
          <div className="flex gap-1">
            {run.potions.map((p, i) => p ? (
              <button key={i} className="btn-ghost !px-2 !py-1.5 text-lg" disabled={!playerTurn} onClick={() => usePot(i)} aria-label={POTION[p].name} title={POTION[p].desc}>{POTION[p].emoji}</button>
            ) : null)}
          </div>
        )}
        <button className="btn ml-auto" disabled={!playerTurn} onClick={() => { setSel(null); dispatch({ type: 'END_TURN' }); }}>
          {playerTurn ? 'Конец хода' : '…'}
        </button>
      </div>

      {piles && <DeckModal title={piles === 'draw' ? 'Добор (порядок скрыт)' : piles === 'discard' ? 'Сброс' : 'Исчезли'} cards={b[piles]} onClose={() => setPiles(null)} />}

      {potTarget !== null && (
        <Modal onClose={() => setPotTarget(null)}>
          <h3 className="font-black text-center mb-3">На кого применить {POTION[run.potions[potTarget] ?? 'heal'].emoji}?</h3>
          <div className="flex flex-col gap-2">
            {b.enemies.map((e, i) => e.hp > 0 && (
              <button key={e.uid} className="btn-ghost text-left" onClick={() => { dispatch({ type: 'POTION', slot: potTarget, target: i }); setPotTarget(null); }}>
                {ENEMIES[e.id].emoji} {ENEMIES[e.id].name} · {e.hp} HP
              </button>
            ))}
          </div>
        </Modal>
      )}

      {b.phase === 'lost' && (
        <div className="absolute inset-0 z-[70] bg-black/75 grid place-items-center fade">
          <div className="text-center px-6">
            <div className="text-7xl">💀</div>
            <h2 className="title-glow font-black text-3xl mt-2">Ты пал</h2>
            <p className="text-[var(--dim)] mt-1">Забег окончен, но души остаются с тобой.</p>
            <button className="btn mt-5" onClick={() => dispatch({ type: 'END_RUN' })}>Продолжить</button>
          </div>
        </div>
      )}

      {!meta.tut && run.stats.rooms <= 1 && b.turn <= 1 && b.phase === 'player' && (
        <Modal>
          <h3 className="font-black text-xl text-center">⚔️ Как драться</h3>
          <ul className="mt-3 flex flex-col gap-2.5 text-[15px] leading-snug">
            <li>🃏 <b>Нажми карту</b>, прочитай её, <b>нажми ещё раз</b> (или на врага), чтобы сыграть. Карты стоят ⚡ энергию.</li>
            <li>👁️ Над врагом видно, <b>что он сделает</b>: ⚔️ — атака (число — урон), 🛡️ — защита, ⬇️ — ослабит тебя.</li>
            <li>◆ <b>Гард</b>: пока ромбики целы, враг получает на 40% меньше урона. Бей его <b>стихией-слабостью</b> (значок рядом: 🔥 ❄️ 🌿): каждый такой удар ломает один ромбик.</li>
            <li>💥 <b>Слом</b>: когда Гард рухнул, враг оглушён: пропускает ход и получает ×1.5 урона. Лови момент!</li>
            <li>🛏️ На кострах можно <b>перековать стихию</b> карты, а в лавке и на картах найти новые.</li>
          </ul>
          <button className="btn w-full mt-4" onClick={() => dispatch({ type: 'SET_TUT' })}>В бой!</button>
        </Modal>
      )}
    </div>
  );
}

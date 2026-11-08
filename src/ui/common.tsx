import { memo, useState, type ReactNode } from 'react';
import type { Card, Elem, Run, Statuses } from '../game/types';
import { ELEM_EMOJI, STATUS_EMOJI, STATUS_HINT, STATUS_NAME, cardDef, cardEff, cardText } from '../game/data/cards';
import { POTION, RELIC } from '../game/data/items';

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 fade" onClick={onClose}>
      <div className={`glass pop w-full ${wide ? 'max-w-xl' : 'max-w-md'} max-h-[88%] overflow-y-auto scroll rounded-t-3xl sm:rounded-3xl p-4`}
        style={{ background: 'linear-gradient(180deg,#1d1540,#0f0b20)', paddingBottom: 'max(var(--sab), 16px)' }}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export const CardView = memo(function CardView({ card, size = 'sm', selected, cant, onClick, className = '', style }: {
  card: Card; size?: 'sm' | 'mid' | 'big'; selected?: boolean; cant?: boolean; onClick?: () => void; className?: string; style?: React.CSSProperties;
}) {
  const d = cardDef(card);
  const e = cardEff(card);
  const curse = d.type === 'curse';
  const el: Elem = curse ? 'none' : e.el;
  return (
    <div role={onClick ? 'button' : undefined} aria-label={d.name} onClick={onClick} style={style}
      className={`card ${el} ${curse ? 'curse' : ''} ${card.up ? 'up' : ''} ${size === 'big' ? 'big' : size === 'mid' ? 'mid' : ''} ${selected ? 'sel' : ''} ${cant ? 'cant' : ''} ${className}`}>
      {!curse && <span className={`cost ${cant ? 'dim' : ''}`}>{e.cost}</span>}
      {el !== 'none' && <span className="elem">{ELEM_EMOJI[el]}</span>}
      <div className="name">{d.name}{card.up ? '+' : ''}</div>
      <div className="art">{d.art}</div>
      {size === 'sm' ? <div className="txt">{shortText(card)}</div> : <div className="txt">{cardText(card)}</div>}
    </div>
  );
});

/** Короткий текст для маленьких карт в руке (полный виден у выбранной карты). */
function shortText(c: Card): string {
  const d = cardDef(c);
  if (d.type === 'curse') return 'Нельзя сыграть';
  return cardText(c).replace(/\. /g, '·').replace(/\.$/, '');
}

export function StatusChips({ st, small }: { st: Statuses; small?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const keys = (Object.keys(st) as (keyof Statuses)[]).filter(k => (st[k] ?? 0) !== 0);
  if (!keys.length) return null;
  return (
    <div className="flex flex-wrap gap-1 justify-center relative">
      {keys.map(k => (
        <button key={k} className="chip" style={small ? { fontSize: 10 } : undefined} onClick={e => { e.stopPropagation(); setOpen(open === k ? null : k); }}>
          {STATUS_EMOJI[k]}{st[k]}
        </button>
      ))}
      {open && (
        <div className="fixed left-3 right-3 bottom-24 z-[70] glass rounded-xl p-3 text-sm fade" style={{ background: '#1d1540' }} onClick={() => setOpen(null)}>
          <b>{STATUS_EMOJI[open as keyof Statuses]} {STATUS_NAME[open as keyof Statuses]}</b>: {STATUS_HINT[open as keyof Statuses]}
        </div>
      )}
    </div>
  );
}

export function DeckModal({ title, cards, onClose, onPick, filter, hint }: {
  title: string; cards: Card[]; onClose: () => void; onPick?: (c: Card) => void; filter?: (c: Card) => boolean; hint?: string;
}) {
  const sorted = cards.slice().sort((a, b) => cardDef(a).name.localeCompare(cardDef(b).name));
  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-black text-lg">{title} <span className="text-[var(--dim)] text-sm">({cards.length})</span></h3>
        <button className="btn-ghost" onClick={onClose}>Закрыть</button>
      </div>
      {hint && <p className="text-sm text-[var(--dim)] mb-2">{hint}</p>}
      {sorted.length === 0 && <p className="text-[var(--dim)] py-6 text-center">Пусто</p>}
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 justify-items-center pt-2">
        {sorted.map(c => {
          const ok = !onPick || !filter || filter(c);
          return <CardView key={c.uid} card={c} size="mid" cant={!ok} onClick={onPick && ok ? () => onPick(c) : undefined} />;
        })}
      </div>
    </Modal>
  );
}

export function TopBar({ run, onDeck, onMenu, dim }: { run: Run; onDeck: () => void; onMenu: () => void; dim?: boolean }) {
  const [info, setInfo] = useState<string | null>(null);
  const pct = Math.max(0, Math.min(100, (run.hp / run.maxHp) * 100));
  const rel = info ? RELIC[info] : null;
  const pot = info ? POTION[info] : null;
  return (
    <header className="shrink-0 px-3 pt-2 pb-1 relative z-[60]" style={{ paddingTop: 'max(var(--sat), 8px)' }}>
      <div className="glass rounded-2xl px-3 py-2">
        <div className="flex items-center gap-2">
          <button className="btn-ghost !px-2 !py-1 text-lg" aria-label="Меню" onClick={onMenu}>☰</button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>❤️ {run.hp}/{run.maxHp}</span>
              <span className="text-[var(--gold)]">🪙 {run.gold}</span>
            </div>
            <div className="bar mt-1"><i style={{ width: `${pct}%`, background: pct < 30 ? 'linear-gradient(90deg,#ff3b3b,#ff7a5c)' : 'linear-gradient(90deg,#e0364f,#ff7a8a)' }} /></div>
          </div>
          <button className="btn-ghost !px-2.5 !py-1 text-sm font-black" aria-label="Колода" onClick={onDeck}>🃏 {run.deck.length}</button>
        </div>
        {!dim && (
          <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scroll">
            {run.potions.map((p, i) => (
              <button key={i} className="chip !px-1.5 !py-0.5 text-base" style={{ minWidth: 30, justifyContent: 'center', opacity: p ? 1 : .35 }} onClick={() => p && setInfo(p)}>{p ? POTION[p].emoji : '·'}</button>
            ))}
            <span className="w-px h-5 bg-white/15 mx-1 shrink-0" />
            {run.relics.map(id => (
              <button key={id} className="chip !px-1.5 !py-0.5 text-base shrink-0" onClick={() => setInfo(id)} aria-label={RELIC[id].name}>{RELIC[id].emoji}</button>
            ))}
            {run.relics.length === 0 && <span className="text-[11px] text-[var(--dim)]">Реликвий пока нет</span>}
          </div>
        )}
      </div>
      {(rel || pot) && (
        <Modal onClose={() => setInfo(null)}>
          <div className="text-center">
            <div className="text-5xl">{(rel ?? pot)!.emoji}</div>
            <h3 className="font-black text-lg mt-1">{(rel ?? pot)!.name}</h3>
            <p className="text-[var(--dim)] mt-1">{(rel ?? pot)!.desc}</p>
            <button className="btn mt-4" onClick={() => setInfo(null)}>Понятно</button>
          </div>
        </Modal>
      )}
    </header>
  );
}

export const Section = ({ children, title }: { children: ReactNode; title?: string }) => (
  <section className="fade">{title && <h2 className="font-black text-xl text-center mb-2">{title}</h2>}{children}</section>
);

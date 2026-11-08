import { useState } from 'react';
import type { Dispatch } from 'react';
import type { Card, Elem, Meta, Run } from '../game/types';
import { removePrice, restHealPct, type Action } from '../game/engine';
import { CARDS, ELEM_EMOJI, ELEM_NAME, canUpgrade, cardDef, cardEff } from '../game/data/cards';
import { EVENT } from '../game/data/events';
import { POTION, RELIC } from '../game/data/items';
import { play } from '../game/audio';
import { CardView, DeckModal, Modal } from './common';

const fakeCard = (id: string, uid: number): Card => ({ uid, id, up: false });

// ───────────────────────── награда ─────────────────────────

export function RewardView({ run, dispatch }: { run: Run; dispatch: Dispatch<Action> }) {
  const rw = run.reward!;
  const hasSlot = run.potions.some(p => p === null);
  const last = rw.final ? 'Завершить забег 🏆' : rw.bossDone ? 'К следующему акту →' : 'Дальше →';
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll px-4 pb-4 fade" style={{ paddingBottom: 'max(var(--sab), 16px)' }}>
      <h2 className="font-black text-2xl text-center mt-2">{rw.title}</h2>
      {rw.gold > 0 && <div className="text-center text-[var(--gold)] font-black text-lg mt-1">+{rw.gold} 🪙</div>}

      {rw.relics.length > 0 && (
        <>
          <h3 className="text-center text-sm font-bold text-[var(--dim)] mt-4 mb-2">{rw.bossDone ? 'Выбери реликвию босса' : 'Реликвия'}</h3>
          <div className="flex flex-col gap-2">
            {rw.relics.map((id, i) => (
              <button key={id} className="glass rounded-2xl p-3 flex items-center gap-3 text-left pulse" onClick={() => { play('relic'); dispatch({ type: 'TAKE_RELIC', i }); }}>
                <span className="text-4xl">{RELIC[id].emoji}</span>
                <span><b>{RELIC[id].name}</b><br /><span className="text-sm text-[var(--dim)]">{RELIC[id].desc}</span></span>
              </button>
            ))}
          </div>
        </>
      )}

      {rw.potion && (
        <button className="glass rounded-2xl p-3 flex items-center gap-3 text-left w-full mt-3" disabled={!hasSlot} onClick={() => dispatch({ type: 'TAKE_POTION' })}>
          <span className="text-3xl">{POTION[rw.potion].emoji}</span>
          <span className="flex-1"><b>{POTION[rw.potion].name}</b><br /><span className="text-sm text-[var(--dim)]">{POTION[rw.potion].desc}</span></span>
          <span className="btn !py-1 !px-3 text-sm">{hasSlot ? 'Взять' : 'Нет места'}</span>
        </button>
      )}

      {rw.cards && (
        <>
          <h3 className="text-center text-sm font-bold text-[var(--dim)] mt-4 mb-3">Добавь карту в колоду</h3>
          <div className="flex justify-center gap-2.5 flex-wrap">
            {rw.cards.map((id, i) => <CardView key={id} card={fakeCard(id, -i - 1)} size="mid" onClick={() => { play('card'); dispatch({ type: 'TAKE_CARD', i }); }} />)}
          </div>
          <div className="text-center mt-3"><button className="btn-ghost" onClick={() => dispatch({ type: 'SKIP_CARD' })}>Пропустить карту</button></div>
        </>
      )}

      <button className="btn w-full mt-6" onClick={() => { play('click'); dispatch({ type: 'LEAVE_REWARD' }); }}>{last}</button>
    </div>
  );
}

// ───────────────────────── лавка ─────────────────────────

export function ShopView({ run, meta, dispatch }: { run: Run; meta: Meta; dispatch: Dispatch<Action> }) {
  const sh = run.shop!;
  const [rm, setRm] = useState(false);
  const price = removePrice(run, meta);
  const cards = sh.items.map((it, i) => ({ it, i })).filter(x => x.it.kind === 'card');
  const rest = sh.items.map((it, i) => ({ it, i })).filter(x => x.it.kind !== 'card');
  const buy = (i: number) => { play('coin'); dispatch({ type: 'SHOP_BUY', i }); };
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll px-4 fade" style={{ paddingBottom: 'max(var(--sab), 16px)' }}>
      <h2 className="font-black text-2xl text-center mt-2">🛒 Лавка торговца</h2>
      <p className="text-center text-sm text-[var(--dim)]">Товар с 🏷️ — скидка дня.</p>
      <div className="flex justify-center gap-x-2.5 gap-y-5 flex-wrap mt-4">
        {cards.map(({ it, i }) => (
          <div key={i} className={`flex flex-col items-center gap-1.5 ${it.sold ? 'opacity-25' : ''}`}>
            <CardView card={fakeCard(it.id, -i - 1)} size="mid" />
            <button className="btn !py-1 !px-3 text-sm" disabled={it.sold || run.gold < it.price} onClick={() => buy(i)}>🪙 {it.price}{it.sale && ' 🏷️'}</button>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 mt-5">
        {rest.map(({ it, i }) => {
          const def = it.kind === 'relic' ? RELIC[it.id] : POTION[it.id];
          return (
            <div key={i} className={`glass rounded-2xl p-3 flex items-center gap-3 ${it.sold ? 'opacity-25' : ''}`}>
              <span className="text-3xl">{def.emoji}</span>
              <span className="flex-1 min-w-0"><b>{def.name}</b><br /><span className="text-sm text-[var(--dim)]">{def.desc}</span></span>
              <button className="btn !py-1 !px-3 text-sm" disabled={it.sold || run.gold < it.price || (it.kind === 'potion' && !run.potions.includes(null))} onClick={() => buy(i)}>🪙 {it.price}{it.sale && ' 🏷️'}</button>
            </div>
          );
        })}
        <div className="glass rounded-2xl p-3 flex items-center gap-3">
          <span className="text-3xl">🗑️</span>
          <span className="flex-1"><b>Убрать карту</b><br /><span className="text-sm text-[var(--dim)]">Чем меньше мусора, тем чаще приходят лучшие карты.</span></span>
          <button className="btn !py-1 !px-3 text-sm" disabled={sh.removeUsed || run.gold < price} onClick={() => setRm(true)}>{sh.removeUsed ? 'Уже' : `🪙 ${price}`}</button>
        </div>
      </div>
      <button className="btn w-full mt-5" onClick={() => dispatch({ type: 'SHOP_LEAVE' })}>Уйти</button>
      {rm && <DeckModal title="Какую карту убрать?" cards={run.deck} onClose={() => setRm(false)} onPick={c => { play('coin'); dispatch({ type: 'SHOP_REMOVE', uid: c.uid }); setRm(false); }} />}
    </div>
  );
}

// ───────────────────────── костёр ─────────────────────────

const ELEMS: Elem[] = ['fire', 'ice', 'nature', 'none'];

export function RestView({ run, meta, dispatch }: { run: Run; meta: Meta; dispatch: Dispatch<Action> }) {
  const [forge, setForge] = useState<Card | null>(null);
  const heal = Math.min(run.maxHp - run.hp, Math.ceil(run.maxHp * restHealPct(run, meta)));
  const canUp = run.deck.some(canUpgrade);
  const canForge = run.deck.some(c => cardDef(c).type === 'attack');
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll px-4 fade" style={{ paddingBottom: 'max(var(--sab), 16px)' }}>
      <div className="text-center text-8xl mt-4" style={{ filter: 'drop-shadow(0 0 24px #ff8a3d)' }}>🔥</div>
      <h2 className="font-black text-2xl text-center mt-2">Костёр</h2>
      <p className="text-center text-sm text-[var(--dim)] mb-4">{run.restUsed ? 'Ты отдохнул. Пора идти дальше.' : 'У огня можно сделать одно дело.'}</p>
      <div className="flex flex-col gap-2.5">
        <button className="glass rounded-2xl p-3 flex items-center gap-3 text-left" disabled={run.restUsed} onClick={() => { play('heal'); dispatch({ type: 'REST_HEAL' }); }}>
          <span className="text-3xl">🛏️</span><span><b>Отдохнуть</b><br /><span className="text-sm text-[var(--dim)]">Восстановить {heal} HP ({Math.round(restHealPct(run, meta) * 100)}% максимума)</span></span>
        </button>
        <button className="glass rounded-2xl p-3 flex items-center gap-3 text-left" disabled={run.restUsed || !canUp} onClick={() => dispatch({ type: 'REST_MODE', mode: 'upgrade' })}>
          <span className="text-3xl">⚒️</span><span><b>Закалить карту</b><br /><span className="text-sm text-[var(--dim)]">Улучшить числа на карте (или снизить цену)</span></span>
        </button>
        <button className="glass rounded-2xl p-3 flex items-center gap-3 text-left" disabled={run.restUsed || !canForge} onClick={() => dispatch({ type: 'REST_MODE', mode: 'forge' })}>
          <span className="text-3xl">🌈</span><span><b>Перековать стихию</b><br /><span className="text-sm text-[var(--dim)]">Сменить стихию атакующей карты: 🔥 ❄️ 🌿 или ⚔️. Так колода подстраивается под врагов.</span></span>
        </button>
      </div>
      <button className="btn w-full mt-5" onClick={() => dispatch({ type: 'REST_LEAVE' })}>Уйти от костра</button>

      {run.restPick === 'upgrade' && (
        <DeckModal title="Что закалить?" cards={run.deck} filter={canUpgrade} hint="Выбери карту, которую можно улучшить."
          onClose={() => dispatch({ type: 'REST_MODE', mode: null })} onPick={c => { play('buff'); dispatch({ type: 'REST_UPGRADE', uid: c.uid }); }} />
      )}
      {run.restPick === 'forge' && !forge && (
        <DeckModal title="Какую карту перековать?" cards={run.deck} filter={c => cardDef(c).type === 'attack'} hint="Только атакующие карты."
          onClose={() => dispatch({ type: 'REST_MODE', mode: null })} onPick={c => setForge(c)} />
      )}
      {forge && (
        <Modal onClose={() => setForge(null)}>
          <h3 className="font-black text-center mb-3">Новая стихия для «{CARDS[forge.id].name}»</h3>
          <div className="flex justify-center mb-4"><CardView card={forge} size="mid" /></div>
          <div className="grid grid-cols-2 gap-2">
            {ELEMS.map(el => (
              <button key={el} className="btn-ghost" disabled={cardEff(forge).el === el} onClick={() => { play('buff'); dispatch({ type: 'REST_FORGE', uid: forge.uid, el }); setForge(null); }}>
                {ELEM_EMOJI[el]} {ELEM_NAME[el]}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────── события ─────────────────────────

export function EventView({ run, dispatch }: { run: Run; dispatch: Dispatch<Action> }) {
  const ev = run.event!;
  const def = EVENT[ev.id];
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll px-4 fade" style={{ paddingBottom: 'max(var(--sab), 16px)' }}>
      <div className="text-center text-8xl mt-3">{def.emoji}</div>
      <h2 className="font-black text-2xl text-center mt-1">{def.title}</h2>
      <p className="text-center text-[15px] text-[var(--dim)] mt-2 leading-snug">{def.text}</p>
      {ev.stage === 'choose' ? (
        <div className="flex flex-col gap-2.5 mt-5">
          {def.choices.map((c, i) => (
            <button key={i} className="glass rounded-2xl p-3 text-left font-bold" disabled={!!c.needGold && run.gold < c.needGold} onClick={() => { play('click'); dispatch({ type: 'EVENT_CHOOSE', i }); }}>{c.text}</button>
          ))}
        </div>
      ) : (
        <>
          <p className="text-center font-bold mt-5 text-[var(--gold)]">{ev.result}</p>
          <button className="btn w-full mt-5" onClick={() => dispatch({ type: 'EVENT_LEAVE' })}>Дальше →</button>
        </>
      )}
      {ev.pick && (
        <DeckModal title={ev.pick === 'upgrade' ? 'Что улучшить?' : 'Какую карту убрать?'} cards={run.deck} filter={ev.pick === 'upgrade' ? canUpgrade : undefined}
          onClose={() => { /* выбор обязателен */ }} onPick={c => dispatch({ type: 'EVENT_PICK', uid: c.uid })} hint="Выбор обязателен." />
      )}
    </div>
  );
}

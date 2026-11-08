import { useState } from 'react';
import type { Dispatch } from 'react';
import type { ClassId, Meta, OverInfo, Run } from '../game/types';
import type { Action } from '../game/engine';
import { ascText, CLASSES, CLASS, MAX_ASC, PERKS } from '../game/data/items';
import { ACTS } from '../game/data/enemies';
import { STARTER_DECK, CARDS } from '../game/data/cards';
import { play } from '../game/audio';
import { Modal } from './common';

export const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ───────────────────────── главное меню ─────────────────────────

export function Menu({ meta, run, dispatch, onNew, onDaily, onSanct, onHelp, onSound }: {
  meta: Meta; run: Run | null; dispatch: Dispatch<Action>; onNew: () => void; onDaily: () => void; onSanct: () => void; onHelp: () => void; onSound: () => void;
}) {
  const doneToday = meta.daily.date === todayKey();
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll px-5 flex flex-col items-center justify-center text-center fade" style={{ paddingTop: 'var(--sat)', paddingBottom: 'max(var(--sab), 16px)' }}>
      <div className="text-7xl" style={{ filter: 'drop-shadow(0 0 22px #ff8a3d)' }}>⚔️</div>
      <h1 className="title-glow font-black text-5xl leading-none mt-2" style={{ letterSpacing: '.01em' }}>Крушители<br />подземелий</h1>
      <div className="text-sm font-bold tracking-[.3em] text-[var(--dim)] mt-2 uppercase">Бездна</div>
      <p className="text-[var(--dim)] text-sm mt-3 max-w-xs">Карточный рогалик: собери колоду, ломай Гард врагов нужной стихией и дойди до Владыки Бездны.</p>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-6">
        {run && <button className="btn" onClick={() => { play('click'); dispatch({ type: 'RESUME' }); }}>▶ Продолжить забег</button>}
        <button className={run ? 'btn-ghost' : 'btn'} onClick={onNew} disabled={!!run} title={run ? 'Сначала заверши текущий забег' : ''}>⚔️ Новый забег</button>
        <button className="btn-ghost" onClick={onDaily} disabled={!!run}>📅 Ежедневный забег{doneToday ? ` · рекорд ${meta.daily.best}` : ''}</button>
        <button className="btn-ghost" onClick={onSanct}>👻 Святилище <span className="chip ml-1">{meta.souls} душ</span></button>
        <div className="flex gap-3">
          <button className="btn-ghost flex-1" onClick={onHelp}>❓ Правила</button>
          <button className="btn-ghost flex-1" onClick={onSound}>{meta.muted ? '🔇 Звук выкл' : '🔊 Звук вкл'}</button>
        </div>
        {run && <button className="text-sm text-[var(--dim)] underline" onClick={() => dispatch({ type: 'END_RUN' })}>Сдаться и закончить забег</button>}
      </div>
      <div className="text-xs text-[var(--dim)] mt-6">Забегов: {meta.runs} · Побед: {meta.wins} · Лучшее: {meta.bestRooms} комнат</div>
    </div>
  );
}

// ───────────────────────── выбор героя ─────────────────────────

export function NewRun({ meta, daily, dispatch, onClose }: { meta: Meta; daily: boolean; dispatch: Dispatch<Action>; onClose: () => void }) {
  const [cls, setCls] = useState<ClassId>('warrior');
  const [asc, setAsc] = useState(Math.min(meta.asc, MAX_ASC));
  const info = CLASS[cls];
  const a = daily ? 2 : asc;
  const deck = STARTER_DECK[cls].reduce<Record<string, number>>((m, id) => { m[id] = (m[id] ?? 0) + 1; return m; }, {});
  return (
    <Modal onClose={onClose} wide>
      <h2 className="font-black text-xl text-center">{daily ? '📅 Ежедневный забег' : 'Выбери героя'}</h2>
      {daily && <p className="text-center text-sm text-[var(--dim)]">Одна и та же карта и враги для всех на сегодня. Сложность 2.</p>}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {CLASSES.map(c => (
          <button key={c.id} onClick={() => { play('click'); setCls(c.id); }}
            className={`rounded-2xl p-2 text-center border-2 transition ${cls === c.id ? 'border-[var(--gold)] bg-white/10 scale-[1.03]' : 'border-white/10 bg-white/5'}`}>
            <div className="text-4xl">{c.emoji}</div>
            <div className="font-black text-sm">{c.name}</div>
            <div className="text-[10px] text-[var(--dim)]">{c.style}</div>
          </button>
        ))}
      </div>
      <div className="glass rounded-2xl p-3 mt-3 text-sm leading-snug">
        <p>{info.pitch}</p>
        <p className="mt-1.5"><b>❤️ {info.hp + (meta.perks.hp ?? 0) * 4} HP.</b> <span className="text-[var(--gold)]">{info.passive}</span></p>
        <p className="mt-1.5 text-[var(--dim)] text-xs">Колода: {Object.entries(deck).map(([id, n]) => `${CARDS[id].art}${CARDS[id].name}${n > 1 ? ` ×${n}` : ''}`).join(', ')}</p>
      </div>
      {!daily && (
        <div className="glass rounded-2xl p-3 mt-3">
          <div className="flex items-center justify-between">
            <b>Сложность {asc}</b>
            <div className="flex gap-2">
              <button className="btn-ghost !px-3 !py-1" disabled={asc <= 0} onClick={() => setAsc(asc - 1)}>−</button>
              <button className="btn-ghost !px-3 !py-1" disabled={asc >= meta.asc} onClick={() => setAsc(asc + 1)}>+</button>
            </div>
          </div>
          <p className="text-xs text-[var(--dim)] mt-1">{ascText(asc)}{asc < meta.asc ? '' : meta.asc < MAX_ASC ? ' Победа откроет следующий уровень.' : ''}</p>
        </div>
      )}
      <button className="btn w-full mt-4" onClick={() => { play('click'); dispatch({ type: 'NEW_RUN', cls, asc: a, daily: daily ? todayKey() : undefined }); onClose(); }}>В подземелье!</button>
    </Modal>
  );
}

// ───────────────────────── святилище ─────────────────────────

export function Sanctuary({ meta, dispatch, onClose }: { meta: Meta; dispatch: Dispatch<Action>; onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center justify-between">
        <h2 className="font-black text-xl">👻 Святилище душ</h2>
        <span className="chip !text-base !px-3">{meta.souls} 👻</span>
      </div>
      <p className="text-sm text-[var(--dim)] mt-1">Души приходят после каждого забега, даже неудачного. Эти улучшения навсегда.</p>
      <div className="flex flex-col gap-2 mt-3">
        {PERKS.map(p => {
          const lvl = meta.perks[p.id] ?? 0;
          const maxed = lvl >= p.max;
          const cost = p.cost(lvl);
          return (
            <div key={p.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <span className="text-3xl">{p.emoji}</span>
              <span className="flex-1 min-w-0"><b>{p.name}</b> <span className="text-xs text-[var(--dim)]">{lvl}/{p.max}</span><br /><span className="text-sm text-[var(--dim)]">{p.desc}</span></span>
              <button className="btn !py-1 !px-3 text-sm" disabled={maxed || meta.souls < cost} onClick={() => { play('relic'); dispatch({ type: 'BUY_PERK', id: p.id }); }}>{maxed ? 'Макс' : `${cost} 👻`}</button>
            </div>
          );
        })}
      </div>
      <button className="btn-ghost w-full mt-4" onClick={onClose}>Закрыть</button>
    </Modal>
  );
}

// ───────────────────────── правила ─────────────────────────

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide>
      <h2 className="font-black text-xl text-center">❓ Как играть</h2>
      <div className="flex flex-col gap-3 mt-3 text-[15px] leading-snug">
        <p><b>Цель.</b> Пройди три акта, выбирая путь по карте, и победи Владыку Бездны. Умрёшь — забег кончится, но души останутся и усилят следующих героев.</p>
        <p><b>Ход.</b> У тебя ⚡ энергия и рука карт. Нажми карту, затем ещё раз (или на врага), чтобы сыграть. Над врагами видно, что они сделают на своём ходу: ⚔️ атака, 🛡️ защита, ⬇️ ослабление.</p>
        <p><b>Гард и Слом.</b> У каждого врага есть ромбики Гарда и стихия-слабость. Пока Гард цел, враг получает на 40% меньше урона. Каждый удар его стихией ломает один ромбик, а карты «Гард −N» ломают напрямую. Когда Гард разбит, враг <b>оглушён</b>: пропускает ход и получает ×1.5 урона.</p>
        <p><b>Стихии.</b> 🔥 огонь, ❄️ лёд, 🌿 природа, ⚔️ сталь. Слабости врагов разные: смотри значок под здоровьем.</p>
        <p><b>Костры.</b> Можно отдохнуть, <b>закалить</b> карту или <b>перековать её стихию</b>: так колода подстраивается под врагов следующего акта.</p>
        <p><b>Колода.</b> Лишние карты мешают: выбирай награды вдумчиво (пропуск — тоже выбор), убирай слабые карты в лавке.</p>
        <p><b>Статусы.</b> 💪 Сила, 🌀 Ловкость, 🥀 Слабость, 💢 Уязвимость, ☠️ Яд, 🦔 Шипы, 💚 Регенерация, 🔮 Ритуал. Нажми на значок статуса в бою, чтобы прочитать.</p>
        <p><b>Сложность.</b> Победи, чтобы открыть следующий уровень сложности. Ежедневный забег один на всех в этот день.</p>
      </div>
      <button className="btn w-full mt-4" onClick={onClose}>Понятно</button>
    </Modal>
  );
}

// ───────────────────────── итог забега ─────────────────────────

export function Over({ info, meta, dispatch }: { info: OverInfo; meta: Meta; dispatch: Dispatch<Action> }) {
  const s = info.stats;
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll px-5 flex flex-col items-center justify-center text-center fade" style={{ paddingBottom: 'max(var(--sab), 16px)' }}>
      <div className="text-7xl">{info.win ? '🏆' : '💀'}</div>
      <h1 className="title-glow font-black text-4xl mt-2">{info.win ? 'Бездна сокрушена!' : 'Забег окончен'}</h1>
      <p className="text-[var(--dim)] mt-1">{CLASS[info.cls].emoji} {CLASS[info.cls].name} · {ACTS[info.act as 1 | 2 | 3].name} · сложность {info.asc}{info.daily ? ' · ежедневный' : ''}</p>
      <div className="glass rounded-2xl p-4 mt-5 w-full max-w-xs text-left text-sm grid grid-cols-2 gap-y-1.5">
        <span>Комнат пройдено</span><b className="text-right">{s.rooms}</b>
        <span>Врагов повержено</span><b className="text-right">{s.kills}</b>
        <span>Элитных / боссов</span><b className="text-right">{s.elites} / {s.bosses}</b>
        <span>Сломов Гарда</span><b className="text-right">{s.breaks}</b>
        <span>Сильнейший удар</span><b className="text-right">{s.bestHit}</b>
        <span>Золота собрано</span><b className="text-right">{s.gold}</b>
        <span className="text-[var(--gold)] font-black">Счёт</span><b className="text-right text-[var(--gold)]">{info.score}</b>
      </div>
      <div className="mt-4 text-lg font-black text-purple-200">+{info.souls} 👻 душ <span className="text-xs text-[var(--dim)] font-bold">(всего {meta.souls})</span></div>
      {info.newAsc && <div className="mt-2 chip !text-sm !px-3 !py-1 pulse" style={{ borderColor: '#ffd25e', color: '#ffd25e' }}>🔓 Открыта сложность {meta.asc}!</div>}
      <button className="btn mt-6 w-full max-w-xs" onClick={() => dispatch({ type: 'TO_MENU' })}>В меню</button>
    </div>
  );
}

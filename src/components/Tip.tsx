import { useState } from 'react';

const KEY = 'dcTipsSeen';
const read = (): string[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

/** Короткая подсказка при первом открытии системы. Закрывается кнопкой и больше не появляется. */
export default function Tip({ id, text }: { id: string; text: string }) {
  const [seen, setSeen] = useState(() => read().includes(id));
  if (seen) return null;
  const close = () => {
    setSeen(true);
    try { localStorage.setItem(KEY, JSON.stringify([...read(), id])); } catch { /* без сохранения */ }
  };
  return (
    <div className="rounded-lg p-2 mb-2 bg-sky-950/70 border border-sky-500/50 flex items-start gap-2 fade-in">
      <span className="text-lg leading-none">💡</span>
      <p className="flex-1 text-[11px] text-sky-100 leading-snug">{text}</p>
      <button onClick={close} className="shrink-0 text-[11px] font-bold text-sky-300 border border-sky-500/60 rounded px-1.5 py-0.5">Понятно</button>
    </div>
  );
}

import { memo } from 'react';
import type { LogEntry, LogType } from '../types';

const TYPE_STYLES: Record<LogType, string> = {
  dmg: 'text-red-300',
  crit: 'text-yellow-300 font-bold',
  heal: 'text-green-300',
  loot: 'text-amber-400',
  dodge: 'text-sky-300 italic',
  info: 'text-purple-200',
  boss: 'text-orange-400 font-bold',
  death: 'text-red-500 font-black',
  ability: 'text-cyan-300 font-bold',
};

const Row = memo(function Row({ text, type }: { text: string; type: LogType }) {
  return <div className={`fade-in ${TYPE_STYLES[type]}`}>{text}</div>;
});

export default function CombatLog({ log }: { log: LogEntry[] }) {
  return (
    <div className="panel rounded-xl p-2.5 flex flex-col min-h-[110px] flex-1">
      <h3 className="font-black text-amber-300/90 mb-1 text-xs uppercase tracking-widest">📜 Журнал боя</h3>
      <div className="scroll-log overflow-y-auto flex-1 space-y-0.5 pr-1 text-[13px]">
        {log.slice(0, 40).map(e => <Row key={e.id} text={e.text} type={e.type} />)}
      </div>
    </div>
  );
}

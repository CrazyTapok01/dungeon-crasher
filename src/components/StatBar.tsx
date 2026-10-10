interface Props {
  value: number;
  max: number;
  fill: string;       // CSS-градиент заливки
  trail?: string;     // цвет «шлейфа» потерянного здоровья
  height?: number;
  label?: string;     // текст на полосе
}

/**
 * Полоса здоровья/опыта. Основная заливка реагирует мгновенно, а светлый «шлейф»
 * за ней догоняет с задержкой — сразу видно, сколько здоровья только что потеряно.
 */
export default function StatBar({ value, max, fill, trail = 'rgba(255,255,255,0.55)', height = 14, label }: Props) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className="bar" style={{ height }}>
      <div className="bar-trail" style={{ width: `${pct}%`, background: trail }} />
      <div className="bar-fill" style={{ width: `${pct}%`, background: fill }} />
      <div className="bar-shine" />
      {label && <div className="bar-label">{label}</div>}
    </div>
  );
}

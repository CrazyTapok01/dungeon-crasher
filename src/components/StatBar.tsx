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
 *
 * Заливка двигается через transform (translateX), а не через width: изменение width
 * заставляет браузер пересчитывать раскладку на каждом кадре анимации, а transform
 * выполняет видеокарта — на слабых телефонах это заметно легче.
 */
export default function StatBar({ value, max, fill, trail = 'rgba(255,255,255,0.55)', height = 14, label }: Props) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  const shift = { transform: `translateX(${pct - 100}%)` };
  return (
    <div className="bar" style={{ height }}>
      <div className="bar-trail" style={{ ...shift, background: trail }} />
      <div className="bar-fill" style={{ ...shift, background: fill }} />
      <div className="bar-shine" />
      {label && <div className="bar-label">{label}</div>}
    </div>
  );
}

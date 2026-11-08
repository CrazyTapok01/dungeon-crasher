import HeroSprite from './HeroSprite';

/** Заставка: красиво и заодно «будит» звук (браузеры разрешают его только после касания). */
export default function SplashScreen({ onStart }: { onStart: () => void }) {
  return (
    <button onClick={onStart} className="splash fixed inset-0 z-[200] flex flex-col items-center justify-center text-center p-6 w-full">
      <div className="splash-glow" />
      <div className="splash-hero w-40 mb-4 relative">
        <HeroSprite equipped={{}} swingKey={0} heavy={false} dead={false} />
      </div>
      <h1 className="gold-text text-4xl font-black tracking-wider leading-tight relative">КРУШИТЕЛИ<br />ПОДЗЕМЕЛИЙ</h1>
      <p className="text-purple-300/80 italic mt-2 relative">Dungeon Crasher — руби, круши, качайся!</p>
      <div className="splash-hint mt-10 px-6 py-2 rounded-full border border-amber-500/60 text-amber-200 font-bold relative">
        Нажми, чтобы войти
      </div>
    </button>
  );
}

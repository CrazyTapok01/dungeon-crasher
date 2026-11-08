import { useEffect, useReducer, useState } from 'react';
import { gameReducer } from './game/engine';
import { loadGame, saveGame } from './game/save';
import { ACTS } from './game/data/enemies';
import { setMuted, unlockAudio } from './game/audio';
import { DeckModal, TopBar } from './ui/common';
import Battle from './ui/Battle';
import MapView from './ui/MapView';
import { EventView, RestView, RewardView, ShopView } from './ui/Panels';
import { Help, Menu, NewRun, Over, Sanctuary } from './ui/Screens';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGame);
  const { meta, run, screen } = state;
  const [modal, setModal] = useState<'new' | 'daily' | 'sanct' | 'help' | null>(null);
  const [deck, setDeck] = useState(false);

  useEffect(() => { saveGame(state); }, [state]);
  useEffect(() => { setMuted(meta.muted); }, [meta.muted]);
  useEffect(() => {
    const h = () => unlockAudio();
    window.addEventListener('pointerdown', h, { once: true });
    return () => window.removeEventListener('pointerdown', h);
  }, []);

  const hue = run && screen === 'run' ? ACTS[run.act].hue : '#7c5cff';

  return (
    <div className="stage h-full relative overflow-hidden" style={{ ['--hue' as string]: hue }}>
      <div className="relative h-full flex flex-col max-w-xl mx-auto" style={{ paddingLeft: 'var(--sal)', paddingRight: 'var(--sar)' }}>
        {screen === 'menu' && (
          <Menu meta={meta} run={run} dispatch={dispatch}
            onNew={() => setModal('new')} onDaily={() => setModal('daily')} onSanct={() => setModal('sanct')} onHelp={() => setModal('help')}
            onSound={() => dispatch({ type: 'SET_MUTED', value: !meta.muted })} />
        )}
        {screen === 'over' && state.over && <Over info={state.over} meta={meta} dispatch={dispatch} />}
        {screen === 'run' && run && (
          <>
            <TopBar run={run} dim={run.pane === 'battle' && run.battle?.phase === 'lost'} onDeck={() => setDeck(true)} onMenu={() => dispatch({ type: 'TO_MENU' })} />
            {run.pane === 'map' && <MapView run={run} dispatch={dispatch} />}
            {run.pane === 'battle' && run.battle && <Battle run={run} meta={meta} fx={state.fx} dispatch={dispatch} />}
            {run.pane === 'reward' && run.reward && <RewardView run={run} dispatch={dispatch} />}
            {run.pane === 'shop' && run.shop && <ShopView run={run} meta={meta} dispatch={dispatch} />}
            {run.pane === 'rest' && <RestView run={run} meta={meta} dispatch={dispatch} />}
            {run.pane === 'event' && run.event && <EventView run={run} dispatch={dispatch} />}
            {deck && <DeckModal title="Твоя колода" cards={run.deck} onClose={() => setDeck(false)} />}
          </>
        )}
      </div>
      {modal === 'new' && <NewRun meta={meta} daily={false} dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal === 'daily' && <NewRun meta={meta} daily dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal === 'sanct' && <Sanctuary meta={meta} dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal === 'help' && <Help onClose={() => setModal(null)} />}
    </div>
  );
}

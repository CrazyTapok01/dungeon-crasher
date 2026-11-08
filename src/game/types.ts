// Здесь только типы: никакого рабочего кода.

/** Стихии. Огонь, лёд и природа бьют по слабостям врагов; «none» — чистая физика. */
export type Elem = 'fire' | 'ice' | 'nature' | 'none';
export type ClassId = 'warrior' | 'mage' | 'thief';

export type StatusId = 'strength' | 'dex' | 'weak' | 'vuln' | 'poison' | 'thorns' | 'regen' | 'ritual';
export type Statuses = Partial<Record<StatusId, number>>;

export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare';
export type CardType = 'attack' | 'skill' | 'power' | 'curse';
export type Target = 'enemy' | 'all' | 'self' | 'random';

/** Эффекты карт — данные, из которых и считается игра, и строится текст на карте. */
export type Eff =
  | { k: 'dmg'; n: number; hits?: number }          // урон (с учётом Силы, Слабости, Гарда…)
  | { k: 'block'; n: number }
  | { k: 'draw'; n: number }
  | { k: 'energy'; n: number }
  | { k: 'heal'; n: number }
  | { k: 'hurt'; n: number }                        // потерять HP
  | { k: 'slam' }                                   // урон = текущему блоку
  | { k: 'crush'; n: number }                       // снять n Гарда
  | { k: 'st'; s: StatusId; n: number; on?: 'self' | 'target' };

export interface CardDef {
  id: string;
  name: string;
  art: string;
  cls: ClassId | 'any' | 'curse';
  rarity: Rarity;
  type: CardType;
  cost: number;           // -1 — сыграть нельзя
  target: Target;
  el: Elem;
  fx: Eff[];
  exhaust?: boolean;      // исчезает до конца боя
  retain?: boolean;       // остаётся в руке
  ucost?: number;         // цена после улучшения
  burn?: number;          // «Ожог»: урон, если карта в руке в конце хода
}

/** Карта в колоде. el — стихия, выкованная на костре. */
export interface Card { uid: number; id: string; up: boolean; el?: Elem; temp?: boolean }

export interface Move {
  name: string;
  emoji: string;
  dmg?: number;
  hits?: number;
  block?: number;
  self?: Statuses;
  hero?: Statuses;
  heal?: number;
  summon?: string;
  give?: { id: string; n: number };
}

export interface EnemyDef {
  id: string;
  name: string;
  emoji: string;
  act: 1 | 2 | 3;
  kind: 'normal' | 'elite' | 'boss' | 'minion';
  hp: [number, number];
  guard: number;
  weak: Exclude<Elem, 'none'>;
  pattern: Move[];
  mode?: 'cycle' | 'rand';
  start?: Statuses;
  rage?: { at: number; pattern: Move[]; text: string };
}

export interface Enemy {
  uid: number;
  id: string;
  hp: number;
  maxHp: number;
  block: number;
  guard: number;
  maxGuard: number;
  broken: boolean;
  st: Statuses;
  mi: number;           // номер хода в схеме
  move: Move;           // что враг сделает на своём ходу
  raged: boolean;
  dmgMult: number;
}

export interface Battle {
  enemies: Enemy[];
  hand: Card[];
  draw: Card[];
  discard: Card[];
  exhaust: Card[];
  block: number;
  energy: number;
  maxEnergy: number;
  st: Statuses;
  turn: number;
  phase: 'player' | 'enemy' | 'won' | 'lost';
  eIdx: number;
  kind: 'normal' | 'elite' | 'boss';
  flags: { firstHit: boolean; shred: boolean };
  taken: number;        // получено урона за бой (для статистики)
}

export interface Reward {
  title: string;
  gold: number;
  cards: string[] | null;     // варианты карт (null — карт нет или выбор сделан)
  relics: string[];           // выбор одной реликвии
  potion: string | null;
  final: boolean;             // победа над последним боссом
  bossDone: boolean;          // после этого ухода начинается следующий акт
  note?: string;
}

export interface ShopItem { kind: 'card' | 'relic' | 'potion'; id: string; price: number; sold: boolean; sale: boolean }
export interface Shop { items: ShopItem[]; removeUsed: boolean }

export interface EvState {
  id: string;
  stage: 'choose' | 'result';
  result: string;
  pick: 'upgrade' | 'remove' | null;   // ждём выбор карты
}

export type NodeKind = 'fight' | 'elite' | 'event' | 'shop' | 'rest' | 'treasure' | 'boss';
export interface MapNode { kind: NodeKind; col: number; next: number[] }

export type Pane = 'map' | 'battle' | 'reward' | 'shop' | 'rest' | 'event';

export interface RunStats {
  kills: number;
  elites: number;
  bosses: number;
  rooms: number;
  gold: number;
  bestHit: number;
  breaks: number;
  taken: number;
}

export interface Run {
  v: 1;
  seed: number;
  rng: number;
  daily: string | null;
  cls: ClassId;
  asc: number;
  hp: number;
  maxHp: number;
  gold: number;
  deck: Card[];
  relics: string[];
  potions: (string | null)[];
  act: 1 | 2 | 3;
  map: MapNode[][];
  row: number;            // -1 — акт только начался
  col: number;
  pane: Pane;
  battle: Battle | null;
  reward: Reward | null;
  shop: Shop | null;
  restUsed: boolean;
  restPick: 'upgrade' | 'forge' | null;
  event: EvState | null;
  uid: number;
  removals: number;
  fights: number;         // боёв в акте (для сложности)
  stats: RunStats;
  eventFight: 'normal' | 'elite' | null;
  seenEvents: string[];
}

export interface Meta {
  souls: number;
  perks: Record<string, number>;
  asc: number;            // открытая сложность (макс.)
  wins: number;
  runs: number;
  bestRooms: number;
  kills: number;
  classWins: Record<ClassId, number>;
  daily: { date: string; best: number };
  tut: boolean;           // обучение показано
  muted: boolean;
}

export interface OverInfo {
  win: boolean;
  cls: ClassId;
  asc: number;
  souls: number;
  stats: RunStats;
  act: number;
  score: number;
  daily: boolean;
  newAsc: boolean;
}

export type FxKind = 'dmg' | 'block' | 'heal' | 'break' | 'die' | 'guard' | 'text' | 'hurt' | 'play' | 'poison' | 'buff';
export interface Fx { id: number; kind: FxKind; to: 'hero' | number; n?: number; text?: string; crit?: boolean }

export interface GameState {
  meta: Meta;
  run: Run | null;
  screen: 'menu' | 'run' | 'over';
  over: OverInfo | null;
  fx: Fx[];
}

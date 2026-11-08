import type { EnemyDef, Move } from '../types';

const A = (name: string, dmg: number, hits = 1, extra: Partial<Move> = {}): Move => ({ name, emoji: '⚔️', dmg, hits, ...extra });
const B = (name: string, block: number, extra: Partial<Move> = {}): Move => ({ name, emoji: '🛡️', block, ...extra });
const S = (name: string, emoji: string, extra: Partial<Move>): Move => ({ name, emoji, ...extra });

type D = Omit<EnemyDef, 'id'>;
const LIST: Record<string, D> = {
  // ───────── Акт 1: Катакомбы ─────────
  rat:      { name: 'Крыса', emoji: '🐀', act: 1, kind: 'normal', hp: [9, 12], guard: 1, weak: 'fire', pattern: [A('Укус', 4), A('Укус', 5)] },
  bat:      { name: 'Летучая мышь', emoji: '🦇', act: 1, kind: 'normal', hp: [13, 16], guard: 1, weak: 'ice', pattern: [A('Двойной укус', 3, 2), S('Визг', '📢', { hero: { weak: 1 } })] },
  skeleton: { name: 'Скелет', emoji: '💀', act: 1, kind: 'normal', hp: [21, 25], guard: 2, weak: 'fire', pattern: [A('Удар', 6), A('Удар', 7), B('Кости', 8)] },
  slime:    { name: 'Слизень', emoji: '🟢', act: 1, kind: 'normal', hp: [26, 30], guard: 2, weak: 'fire', pattern: [A('Плевок', 5, 1, { hero: { weak: 1 } }), A('Тяжёлый шлепок', 9), B('Слизь', 6)] },
  mushroom: { name: 'Гриб-споровик', emoji: '🍄', act: 1, kind: 'normal', hp: [22, 26], guard: 2, weak: 'fire', pattern: [S('Споры', '🌫️', { hero: { vuln: 2 } }), A('Удар шляпкой', 7), A('Удар шляпкой', 7)] },
  ghoul:    { name: 'Упырь', emoji: '🧟', act: 1, kind: 'normal', hp: [30, 34], guard: 2, weak: 'fire', pattern: [A('Когти', 8), S('Гниль', '🤢', { give: { id: 'wound', n: 1 } }), A('Когти', 9)] },
  bone_knight: { name: 'Костяной рыцарь', emoji: '🤺', act: 1, kind: 'elite', hp: [54, 58], guard: 4, weak: 'fire', pattern: [A('Рубящий удар', 10), B('Щит из костей', 14, { self: { strength: 2 } }), A('Рубящий удар', 12)] },
  necro:    { name: 'Некромант', emoji: '🧙', act: 1, kind: 'elite', hp: [42, 46], guard: 3, weak: 'nature', pattern: [S('Призыв', '🪦', { summon: 'bonelet' }), A('Тёмная стрела', 9, 1, { hero: { weak: 1 } }), A('Тёмная стрела', 11)], },
  bonelet:  { name: 'Костяшка', emoji: '☠️', act: 1, kind: 'minion', hp: [7, 9], guard: 1, weak: 'fire', pattern: [A('Тычок', 4)] },
  colossus: { name: 'Костяной Колосс', emoji: '☠️', act: 1, kind: 'boss', hp: [115, 115], guard: 5, weak: 'fire',
    pattern: [A('Сокрушение', 12), B('Стена из костей', 14, { self: { strength: 1 } }), A('Тройной удар', 5, 3), S('Рёв', '📢', { hero: { vuln: 2 }, give: { id: 'wound', n: 1 } })],
    rage: { at: 0.5, text: 'Колосс трещит по швам и впадает в ярость!', pattern: [A('Каменный кулак', 15), A('Град костей', 4, 4), S('Вой мертвецов', '📢', { self: { strength: 2 }, hero: { weak: 1 } })] } },

  // ───────── Акт 2: Ржавые глубины ─────────
  goblin:   { name: 'Гоблин-подрывник', emoji: '👺', act: 2, kind: 'normal', hp: [26, 30], guard: 2, weak: 'nature', pattern: [A('Бомба', 10), B('Хихиканье', 7), S('Горящая бомба', '💣', { dmg: 7, hits: 1, give: { id: 'burn', n: 1 } })] },
  spider:   { name: 'Паук-отравитель', emoji: '🕷️', act: 2, kind: 'normal', hp: [32, 36], guard: 2, weak: 'fire', pattern: [A('Ядовитый укус', 6, 1, { hero: { poison: 3 } }), S('Паутина', '🕸️', { give: { id: 'wound', n: 2 } }), A('Укус', 9)] },
  cultist:  { name: 'Фанатик', emoji: '🧝', act: 2, kind: 'normal', hp: [38, 42], guard: 2, weak: 'nature', pattern: [S('Молитва', '🙏', { self: { ritual: 2 } }), A('Тёмный удар', 6)], mode: 'cycle' },
  golem:    { name: 'Ржавый голем', emoji: '🤖', act: 2, kind: 'normal', hp: [44, 50], guard: 3, weak: 'ice', pattern: [A('Таран', 12), B('Закалка', 12), A('Таран', 12)] },
  mimic:    { name: 'Мимик', emoji: '📦', act: 2, kind: 'normal', hp: [48, 52], guard: 3, weak: 'ice', pattern: [A('Клац', 13), B('Копилка', 10), A('Клац', 15)] },
  warden:   { name: 'Железный страж', emoji: '🗿', act: 2, kind: 'elite', hp: [84, 90], guard: 5, weak: 'ice', pattern: [A('Удар молотом', 14), B('Укрепление', 20), A('Рассечение', 9, 2), S('Приказ', '📯', { self: { strength: 2 }, hero: { weak: 1 } })] },
  gargoyle: { name: 'Горгулья', emoji: '🐉', act: 2, kind: 'elite', hp: [74, 78], guard: 4, weak: 'nature', pattern: [A('Каменный кулак', 12), S('Окаменение', '🪨', { hero: { weak: 2, vuln: 2 } }), A('Пике', 18), B('Каменная кожа', 14)] },
  forgeling:{ name: 'Искорка', emoji: '🔸', act: 2, kind: 'minion', hp: [8, 10], guard: 1, weak: 'ice', pattern: [A('Ожог', 5)] },
  smith:    { name: 'Кузнец Бездны', emoji: '⚒️', act: 2, kind: 'boss', hp: [150, 150], guard: 6, weak: 'ice',
    pattern: [A('Удар молота', 15), B('Горн', 20, { self: { strength: 2 } }), A('Искры', 4, 4), S('Расплав', '🌋', { give: { id: 'burn', n: 2 }, hero: { weak: 1 } })],
    rage: { at: 0.5, text: 'Кузнец раскаляется добела!', pattern: [A('Раскалённый молот', 19), S('Призыв искр', '🔸', { summon: 'forgeling' }), A('Ливень искр', 5, 4)] } },

  // ───────── Акт 3: Преисподняя ─────────
  imp:      { name: 'Бес', emoji: '😈', act: 3, kind: 'normal', hp: [36, 40], guard: 2, weak: 'ice', pattern: [A('Огненный шар', 8, 1, { give: { id: 'burn', n: 1 } }), A('Порхание', 6, 2)] },
  hound:    { name: 'Адская гончая', emoji: '🐕', act: 3, kind: 'normal', hp: [50, 56], guard: 3, weak: 'ice', pattern: [A('Укус', 11), S('Вой', '🐺', { self: { strength: 2 } }), A('Растерзание', 6, 3)] },
  succubus: { name: 'Суккуб', emoji: '🧛‍♀️', act: 3, kind: 'normal', hp: [46, 50], guard: 3, weak: 'nature', pattern: [S('Чары', '💜', { hero: { weak: 2, vuln: 1 } }), A('Поцелуй смерти', 10, 1, { heal: 8 }), A('Когти', 9)] },
  demon:    { name: 'Демон', emoji: '👹', act: 3, kind: 'normal', hp: [62, 68], guard: 4, weak: 'ice', pattern: [A('Взрыв', 14), B('Адская броня', 14, { self: { strength: 1 } }), A('Расплата', 8, 2)] },
  prince:   { name: 'Князь пепла', emoji: '🔥', act: 3, kind: 'elite', hp: [108, 114], guard: 5, weak: 'ice', pattern: [A('Огненный столп', 16), S('Пепел', '🌫️', { hero: { vuln: 2 }, give: { id: 'burn', n: 2 } }), A('Бичи', 8, 3), B('Пепельный покров', 18, { self: { strength: 2 } })] },
  lavagolem:{ name: 'Лавовый голем', emoji: '🌋', act: 3, kind: 'elite', hp: [118, 124], guard: 6, weak: 'nature', pattern: [A('Лавовый кулак', 20), B('Остывание', 25), A('Извержение', 7, 4), S('Жар', '♨️', { give: { id: 'burn', n: 2 }, self: { strength: 1 } })] },
  eye:      { name: 'Владыка Бездны', emoji: '👁️', act: 3, kind: 'boss', hp: [215, 215], guard: 7, weak: 'nature',
    pattern: [A('Взгляд бездны', 18), S('Тьма', '🌑', { hero: { weak: 2, vuln: 2 }, give: { id: 'wound', n: 2 } }), A('Лучи', 7, 4), B('Покров бездны', 25, { self: { strength: 2 } })],
    rage: { at: 0.5, text: 'Бездна разверзается! Владыка принимает истинный облик.', pattern: [A('Падение звёзд', 26), A('Град', 8, 5), S('Пожирание', '🕳️', { heal: 25, self: { strength: 3 }, give: { id: 'burn', n: 2 } })] } },
};

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(Object.entries(LIST).map(([id, d]) => [id, { ...d, id }]));

/** Группы обычных врагов по актам: «лёгкие» — для первых боёв акта, «трудные» — дальше. */
export const ENCOUNTERS: Record<1 | 2 | 3, { easy: string[][]; hard: string[][]; elite: string[][]; boss: string }> = {
  1: {
    easy: [['rat', 'rat'], ['bat', 'rat'], ['skeleton'], ['rat', 'rat', 'bat'], ['slime']],
    hard: [['ghoul'], ['mushroom', 'rat'], ['slime', 'bat'], ['skeleton', 'skeleton'], ['mushroom', 'bat', 'bat'], ['ghoul', 'rat']],
    elite: [['bone_knight'], ['necro']],
    boss: 'colossus',
  },
  2: {
    easy: [['goblin'], ['spider'], ['cultist'], ['goblin', 'goblin']],
    hard: [['golem'], ['mimic'], ['spider', 'goblin'], ['cultist', 'spider'], ['golem', 'goblin'], ['cultist', 'goblin', 'goblin']],
    elite: [['warden'], ['gargoyle']],
    boss: 'smith',
  },
  3: {
    easy: [['imp', 'imp'], ['hound'], ['succubus'], ['imp', 'succubus']],
    hard: [['demon'], ['hound', 'imp'], ['succubus', 'hound'], ['demon', 'imp'], ['succubus', 'succubus'], ['hound', 'hound']],
    elite: [['prince'], ['lavagolem']],
    boss: 'eye',
  },
};

export const ACTS: Record<1 | 2 | 3, { name: string; emoji: string; hue: string; tag: string }> = {
  1: { name: 'Катакомбы', emoji: '💀', hue: '#7c5cff', tag: 'Кости, плесень и древние склепы' },
  2: { name: 'Ржавые глубины', emoji: '⚙️', hue: '#e0902f', tag: 'Заброшенные кузни и механизмы' },
  3: { name: 'Преисподняя', emoji: '🔥', hue: '#ff4d4d', tag: 'Жар, пепел и сама Бездна' },
};

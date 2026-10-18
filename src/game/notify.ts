import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Meta } from '../types';
import { FARM, PETS, RAID, TOWER, towerKeysNow } from '../gameData';

/*
 * Уведомления в Android-приложении (плагин @capacitor/local-notifications).
 * В браузере ничего не делают. Плагин подключается через registerPlugin,
 * поэтому веб-сборка не требует его установки.
 */
interface LocalNotificationsPlugin {
  requestPermissions(): Promise<{ display: string }>;
  schedule(o: { notifications: { id: number; title: string; body: string; schedule: { at: Date } }[] }): Promise<unknown>;
  cancel(o: { notifications: { id: number }[] }): Promise<unknown>;
}
const plugin = registerPlugin<LocalNotificationsPlugin>('LocalNotifications');
const native = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };
const IDS = [1, 2, 20, ...PETS.map((_, i) => 10 + i)];

export async function enableNotifications(): Promise<boolean> {
  if (!native()) return false;
  try { return (await plugin.requestPermissions()).display === 'granted'; } catch { return false; }
}

export async function cancelAllNotifications(): Promise<void> {
  if (!native()) return;
  try { await plugin.cancel({ notifications: IDS.map(id => ({ id })) }); } catch { /* плагин недоступен */ }
}

export async function scheduleNotifications(m: Meta): Promise<void> {
  if (!native()) return;
  const now = Date.now();
  const list: { id: number; title: string; body: string; schedule: { at: Date } }[] = [];
  const add = (id: number, at: number, title: string, body: string) => { if (at > now + 5000) list.push({ id, title, body, schedule: { at: new Date(at) } }); };

  const { keys, nextMs } = towerKeysNow(m, now);
  if (keys < TOWER.maxKeys) add(1, now + nextMs + (TOWER.maxKeys - keys - 1) * TOWER.keyMs, '🗼 Башня ждёт', 'Все ключи Башни испытаний восстановлены.');
  add(2, m.raid.at + RAID.cooldownMs, '⚠️ Рейд-босс готов', 'Можно вызвать нового рейд-босса.');
  PETS.forEach((p, i) => { if (m.petReborn[p.id] > now) add(10 + i, m.petReborn[p.id], `${p.emoji} ${p.name} вернулся`, 'Питомец завершил перерождение.'); });
  if (m.farmAt > 0 && Object.keys(m.farms).length > 0) add(20, m.farmAt + FARM.capHours * 3600000, '💎 Фермы заполнены', 'Кристаллы накоплены — забери их.');
  if (list.length === 0) return;
  try { await plugin.schedule({ notifications: list }); } catch { /* плагин недоступен */ }
}

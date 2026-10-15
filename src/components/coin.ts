import { createContext, useContext } from 'react';
import type { WorldId } from '../types';

/** Значок валюты текущего мира: 💰 в подземелье, 🔥 в Преисподней. */
export const CoinContext = createContext('💰');
export const useCoin = () => useContext(CoinContext);
/** Текущий мир (для оформления дочерних панелей). */
export const WorldContext = createContext<WorldId>('dungeon');
export const useWorld = () => useContext(WorldContext);

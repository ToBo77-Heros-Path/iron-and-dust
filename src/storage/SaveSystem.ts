import { FactionId } from '../data/factions';
import { SerializedGameWorld } from '../engine/GameWorld';
import { SerializedGridMap } from '../engine/GridMap';

export interface CampaignProgressData {
  selectedFaction: FactionId;
  unlockedSector: Record<FactionId, number>; // 1..9
  completedMissions: string[];
}

const PROGRESS_KEY = 'red_sector_campaign_progress_v1';
const QUICKSAVE_KEY = 'red_sector_quicksave_battle_v1';
const CUSTOM_MAPS_KEY = 'red_sector_custom_maps_v1';

export interface CustomSavedMap {
  id: string;
  name: string;
  createdAt: string;
  grid: SerializedGridMap;
}

export class SaveSystem {
  private static memoryFallback: Record<string, string> = {};

  private static setItem(key: string, val: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, val);
        return;
      }
    } catch {
      // Fallback
    }
    this.memoryFallback[key] = val;
  }

  private static getItem(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch {
      // Fallback
    }
    return this.memoryFallback[key] ?? null;
  }

  public static loadCampaignProgress(): CampaignProgressData {
    const raw = this.getItem(PROGRESS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as CampaignProgressData;
      } catch {
        // Ignore parse error
      }
    }
    return {
      selectedFaction: 'vanguard',
      unlockedSector: {
        vanguard: 1,
        directorate: 1,
        nexus: 1
      },
      completedMissions: []
    };
  }

  public static saveCampaignProgress(progress: CampaignProgressData): void {
    this.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  public static markMissionCompleted(faction: FactionId, sectorIndex: number, missionId: string): CampaignProgressData {
    const prog = this.loadCampaignProgress();
    if (!prog.completedMissions.includes(missionId)) {
      prog.completedMissions.push(missionId);
    }
    const nextSector = Math.min(9, sectorIndex + 1);
    if (nextSector > (prog.unlockedSector[faction] || 1)) {
      prog.unlockedSector[faction] = nextSector;
    }
    this.saveCampaignProgress(prog);
    return prog;
  }

  public static saveBattleSnapshot(worldData: SerializedGameWorld): void {
    this.setItem(QUICKSAVE_KEY, JSON.stringify(worldData));
  }

  public static loadBattleSnapshot(): SerializedGameWorld | null {
    const raw = this.getItem(QUICKSAVE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SerializedGameWorld;
    } catch {
      return null;
    }
  }

  public static hasBattleSnapshot(): boolean {
    return this.getItem(QUICKSAVE_KEY) !== null;
  }

  public static saveCustomMap(name: string, grid: SerializedGridMap): CustomSavedMap {
    const maps = this.loadCustomMaps();
    const entry: CustomSavedMap = {
      id: `custom_${Date.now()}`,
      name,
      createdAt: new Date().toISOString().slice(0, 10),
      grid
    };
    const existingIdx = maps.findIndex((m) => m.name.toLowerCase() === name.toLowerCase());
    if (existingIdx >= 0) {
      maps[existingIdx] = entry;
    } else {
      maps.push(entry);
    }
    this.setItem(CUSTOM_MAPS_KEY, JSON.stringify(maps));
    return entry;
  }

  public static loadCustomMaps(): CustomSavedMap[] {
    const raw = this.getItem(CUSTOM_MAPS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as CustomSavedMap[];
    } catch {
      return [];
    }
  }
}

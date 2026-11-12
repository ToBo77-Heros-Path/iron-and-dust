import { describe, expect, it } from 'vitest';
import { CAMPAIGNS } from '../src/data/campaigns';
import { GameWorld } from '../src/engine/GameWorld';
import { GridMap } from '../src/engine/GridMap';
import { Pathfinder } from '../src/engine/Pathfinder';
import { SaveSystem } from '../src/storage/SaveSystem';

describe('RED SECTOR: DUNE PROTOCOL - RTS Engine Verification', () => {
  it('generates all 27 campaign missions (9 sectors x 3 factions) with escalating Tech Levels 1..9', () => {
    expect(CAMPAIGNS.vanguard.length).toBe(9);
    expect(CAMPAIGNS.directorate.length).toBe(9);
    expect(CAMPAIGNS.nexus.length).toBe(9);

    for (let i = 0; i < 9; i++) {
      expect(CAMPAIGNS.vanguard[i].techLevel).toBe(i + 1);
      expect(CAMPAIGNS.directorate[i].techLevel).toBe(i + 1);
      expect(CAMPAIGNS.nexus[i].techLevel).toBe(i + 1);
    }
  });

  it('enforces Dune II Concrete Slab foundation mechanics (100% HP on slab vs 65% HP without slab)', () => {
    const mission = CAMPAIGNS.vanguard[0];
    const world = new GameWorld(mission);

    // Lay a 2x2 concrete slab at (11, 43) on the player rock plateau
    world.grid.placeConcreteSlabs(11, 43, 2, 2, 1);
    const plantWithSlab = world.spawnBuilding('power_plant', 1, 'vanguard', 11, 43, false, true)!;
    expect(plantWithSlab.slabRatio).toBe(1);
    expect(plantWithSlab.hp).toBe(plantWithSlab.maxHp);

    // Place a building on bare rock without slabs at (14, 43)
    const plantBare = world.spawnBuilding('power_plant', 1, 'vanguard', 14, 43, false, true)!;
    expect(plantBare.slabRatio).toBe(0);
    expect(plantBare.hp).toBeLessThan(plantBare.maxHp);
    expect(plantBare.hp).toBe(Math.round(plantBare.maxHp * 0.65));
  });

  it('computes A* paths around mountains and structures', () => {
    const grid = new GridMap(32, 'desert', 42);
    const path = Pathfinder.findPath(grid, 6, 20, 12, 20);
    expect(path.length).toBeGreaterThan(0);
    const last = path[path.length - 1];
    expect(Math.round(last.x - 0.5)).toBe(12);
    expect(Math.round(last.y - 0.5)).toBe(20);
  });

  it('calculates power balance, radar status, and harvester ore unloading', () => {
    const mission = CAMPAIGNS.directorate[3]; // Tech Level 4
    const world = new GameWorld(mission);

    world.spawnBuilding('power_plant', 1, 'directorate', 11, 40, true, true);
    world.spawnBuilding('refinery', 1, 'directorate', 7, 44, true, false);
    world.spawnBuilding('radar_outpost', 1, 'directorate', 11, 43, true, true);

    expect(world.players[1].powerProduced).toBeGreaterThan(world.players[1].powerConsumed);
    expect(world.players[1].radarOnline).toBe(true);

    const harvesters = world.units.filter((u) => u.owner === 1 && u.unitId === 'harvester');
    expect(harvesters.length).toBeGreaterThanOrEqual(1);

    // Simulate world ticks and verify harvester starts moving to ore
    for (let i = 0; i < 10; i++) {
      world.update(0.2);
    }
    expect(harvesters[0].harvesterState).not.toBe('unloading');
  });

  it('supports vehicle infantry crushing and superweapon strikes', () => {
    const mission = CAMPAIGNS.nexus[7]; // Tech Level 8
    const world = new GameWorld(mission);

    const enemyInf = world.spawnUnit('light_infantry', 2, 'vanguard', 15.5, 38.5);
    const heavyTank = world.spawnUnit('heavy_siege_tank', 1, 'directorate', 14.5, 38.5);
    world.issueMoveOrder([heavyTank], 16.5, 38.5);

    for (let i = 0; i < 15; i++) {
      world.update(0.1);
    }

    const stillAlive = world.units.some((u) => u.id === enemyInf.id);
    expect(stillAlive).toBe(false);

    // Superweapon test
    world.players[1].superweaponReady = true;
    const fired = world.fireSuperweapon(1, 20, 20);
    expect(fired).toBe(true);
    expect(world.players[1].superweaponReady).toBe(false);
  });

  it('serializes and deserializes battle state for Save/Load accurately', () => {
    const mission = CAMPAIGNS.vanguard[2];
    const world = new GameWorld(mission);
    world.players[1].credits = 4321;

    const snapshot = world.serialize();
    SaveSystem.saveBattleSnapshot(snapshot);
    const loaded = SaveSystem.loadBattleSnapshot();

    expect(loaded).not.toBeNull();
    const world2 = new GameWorld(mission);
    world2.loadSerialized(loaded!);
    expect(world2.players[1].credits).toBe(4321);
    expect(world2.missionId).toBe(mission.id);
  });

  it('does not trigger instant win in Sector 1 and tracks harvested credits towards quota', () => {
    const mission = CAMPAIGNS.vanguard[0]; // Sector 1: harvest_quota
    const world = new GameWorld(mission, { difficulty: 'recruit' });

    // Tick the world
    world.update(0.1);
    expect(world.status).toBe('playing');
    expect(world.players[1].harvestedCredits).toBe(0);

    // Simulate harvester unloading 1500 ore
    world.players[1].harvestedCredits = 1500;
    world.update(0.1);
    expect(world.status).toBe('victory');
  });
});

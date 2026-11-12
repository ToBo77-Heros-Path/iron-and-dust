import { BuildingDef, BuildingId, BUILDINGS } from '../data/buildings';
import { BiomeType, MissionDef } from '../data/campaigns';
import { FactionId, FACTIONS } from '../data/factions';
import { UnitDef, UnitId, UNITS, WeaponKind } from '../data/units';
import { GridMap, SerializedGridMap } from './GridMap';
import { GridPoint as Point, Pathfinder } from './Pathfinder';

export interface BuildingEntity {
  id: number;
  kind: 'building';
  buildingId: BuildingId;
  owner: number; // 1 = human player, 2 = primary AI, 3 = secondary AI
  faction: FactionId;
  tileX: number;
  tileY: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  slabRatio: number; // 0..1 coverage by concrete slabs
  isRepairing: boolean;
  attackCooldown: number;
  turretAngle: number;
  constructAnimProgress: number; // 0..1
}

export type HarvesterState = 'idle' | 'moving_to_ore' | 'harvesting' | 'returning' | 'unloading';

export interface UnitEntity {
  id: number;
  kind: 'unit';
  unitId: UnitId;
  owner: number;
  originalOwner: number;
  faction: FactionId;
  x: number; // float tile coordinate
  y: number;
  hp: number;
  maxHp: number;
  selected: boolean;
  controlGroup: number | null;
  hullAngle: number;
  turretAngle: number;
  path: Point[];
  targetEntityId: number | null;
  attackMoveGoal: Point | null;
  attackCooldown: number;
  // Harvester specific
  harvesterState: HarvesterState;
  oreCarried: number;
  maxOreCapacity: number;
  harvestTimer: number;
  targetOreTile: Point | null;
  // Status effects
  deviatedTimer: number; // > 0 when mind-controlled by Nexus Deviator
  slowedTimer: number; // > 0 when hit by Vanguard Cryo-Turret
  empTimer: number; // > 0 when stunned by EMP
  cloakShimmerTimer: number; // > 0 when revealed after firing
}

export interface ProjectileEffect {
  id: number;
  weaponKind: WeaponKind | 'tesla' | 'cryo' | 'laser' | 'superweapon';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number; // 0..1
  speed: number;
  colorHex: number;
}

export interface ExplosionEvent {
  x: number;
  y: number;
  radius: number;
  colorHex: number;
  isSuperweapon?: boolean;
}

export interface ProductionJob {
  itemId: BuildingId | UnitId;
  isBuilding: boolean;
  cost: number;
  paidSoFar: number;
  progressSec: number;
  totalSec: number;
  readyToPlace: boolean;
}

export interface PlayerState {
  owner: number;
  faction: FactionId;
  credits: number;
  harvestedCredits: number;
  powerProduced: number;
  powerConsumed: number;
  radarOnline: boolean;
  structureJob: ProductionJob | null;
  unitJob: ProductionJob | null;
  superweaponCooldownSec: number;
  superweaponMaxSec: number;
  superweaponReady: boolean;
  aiAttackTimer: number;
  aiBuildTimer: number;
}

export interface SandwormEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  surfaceTimer: number;
  hungerCooldown: number;
  targetUnitId: number | null;
}

export interface GameWorldEvents {
  onEvaSpeech?: (phrase: string) => void;
  onUnitSpeech?: (phrase: string) => void;
  onSfx?: (sfx: 'shot' | 'rocket' | 'tesla' | 'flame' | 'explosion' | 'build' | 'cash' | 'worm' | 'nuke' | 'crush') => void;
  onToast?: (msgSv: string, msgEn: string, kind?: 'info' | 'warn' | 'danger') => void;
}

export interface GameWorldOptions extends GameWorldEvents {
  difficulty?: 'recruit' | 'veteran' | 'general';
}

export interface SerializedGameWorld {
  nextEntityId: number;
  elapsedSec: number;
  techLevel: number;
  difficulty?: 'recruit' | 'veteran' | 'general';
  peaceTimerRemaining?: number;
  missionId: string;
  missionType: string;
  targetCreditsQuota?: number;
  wormActivity: number;
  ionStormActivity: number;
  ionStormActiveTimer: number;
  ionStormNextTimer: number;
  sandworm: SandwormEntity;
  grid: SerializedGridMap;
  players: Record<number, PlayerState>;
  buildings: BuildingEntity[];
  units: UnitEntity[];
}

export class GameWorld {
  public nextEntityId = 1;
  public elapsedSec = 0;
  public techLevel = 9;
  public difficulty: 'recruit' | 'veteran' | 'general' = 'recruit';
  public peaceTimerRemaining = 180;
  public totalPeaceTimer = 180;
  public aiWaveCount = 0;
  private peaceAlertTriggered = false;

  public missionId = 'skirmish';
  public missionType: string = 'annihilate';
  public targetCreditsQuota?: number;
  public wormActivity = 1;
  public ionStormActivity = 0;
  public ionStormActiveTimer = 0;
  public ionStormNextTimer = 75;

  public grid: GridMap;
  public players: Record<number, PlayerState> = {};
  public buildings: BuildingEntity[] = [];
  public units: UnitEntity[] = [];
  public projectiles: ProjectileEffect[] = [];
  public recentExplosions: ExplosionEvent[] = [];
  public sandworm: SandwormEntity;
  public status: 'playing' | 'victory' | 'defeat' = 'playing';
  public events: GameWorldEvents = {};

  private oreRegrowTimer = 0;
  private slabDecayTimer = 0;
  private repairTickTimer = 0;

  constructor(mission: MissionDef, options: GameWorldOptions = {}) {
    this.events = options;
    this.difficulty = options.difficulty || 'recruit';
    this.techLevel = mission.techLevel;
    this.missionId = mission.id;
    this.missionType = mission.missionType;
    this.targetCreditsQuota = mission.targetCreditsQuota;
    this.wormActivity = mission.wormActivity;
    this.ionStormActivity = mission.ionStormActivity;

    // Calculate base-building grace period (peace period) based on difficulty & tech
    if (this.difficulty === 'recruit') {
      this.totalPeaceTimer = Math.max(90, 180 - (this.techLevel - 1) * 10);
    } else if (this.difficulty === 'veteran') {
      this.totalPeaceTimer = Math.max(45, 110 - (this.techLevel - 1) * 8);
    } else {
      this.totalPeaceTimer = Math.max(25, 60 - (this.techLevel - 1) * 5);
    }
    this.peaceTimerRemaining = this.totalPeaceTimer;

    this.grid = new GridMap(mission.mapSize, mission.biome, mission.mapSeed);

    this.sandworm = {
      active: mission.biome === 'desert' && mission.wormActivity > 0,
      x: Math.floor(mission.mapSize / 2) + 0.5,
      y: Math.floor(mission.mapSize / 2) + 0.5,
      vx: 0,
      vy: 0,
      hp: 900,
      surfaceTimer: 0,
      hungerCooldown: 12,
      targetUnitId: null
    };

    const bonusCredits =
      this.difficulty === 'recruit' ? 1200 : this.difficulty === 'veteran' ? 400 : 0;

    // Initialize Human Player (owner = 1)
    this.players[1] = {
      owner: 1,
      faction: mission.faction,
      credits: mission.startingCredits + bonusCredits,
      harvestedCredits: 0,
      powerProduced: 0,
      powerConsumed: 0,
      radarOnline: false,
      structureJob: null,
      unitJob: null,
      superweaponCooldownSec: 120,
      superweaponMaxSec: 120,
      superweaponReady: false,
      aiAttackTimer: 0,
      aiBuildTimer: 0
    };

    // Initialize Enemy AI (owner = 2)
    this.players[2] = {
      owner: 2,
      faction: mission.enemyFaction,
      credits: mission.enemyStartingCredits,
      harvestedCredits: 0,
      powerProduced: 0,
      powerConsumed: 0,
      radarOnline: false,
      structureJob: null,
      unitJob: null,
      superweaponCooldownSec: 150,
      superweaponMaxSec: 150,
      superweaponReady: false,
      aiAttackTimer: this.peaceTimerRemaining,
      aiBuildTimer: this.difficulty === 'recruit' ? 10 : 6
    };

    // Spawn Player Base (South-West plateau origin: 7, size - 16)
    const pBaseX = 7;
    const pBaseY = this.grid.size - 16;
    for (const bSpec of mission.playerStartBuildings) {
      this.spawnBuilding(
        bSpec.buildingId,
        1,
        mission.faction,
        pBaseX + bSpec.dx,
        pBaseY + bSpec.dy,
        Boolean(bSpec.withSlab),
        true
      );
    }
    for (const uSpec of mission.playerStartUnits) {
      this.spawnUnit(
        uSpec.unitId,
        1,
        mission.faction,
        pBaseX + uSpec.dx + 1.5,
        pBaseY + uSpec.dy + 1.5
      );
    }

    // Spawn Enemy Base (North-East plateau origin: size - 12, 11)
    const eBaseX = this.grid.size - 12;
    const eBaseY = 11;
    for (const bSpec of mission.enemyStartBuildings) {
      this.spawnBuilding(
        bSpec.buildingId,
        2,
        mission.enemyFaction,
        eBaseX + bSpec.dx,
        eBaseY + bSpec.dy,
        Boolean(bSpec.withSlab),
        true
      );
    }
    for (const uSpec of mission.enemyStartUnits) {
      this.spawnUnit(
        uSpec.unitId,
        2,
        mission.enemyFaction,
        eBaseX + uSpec.dx + 0.5,
        eBaseY + uSpec.dy + 0.5
      );
    }

    // Secondary rival outpost in Mission 9 (South-East plateau)
    if (mission.secondaryEnemyFaction) {
      const secBaseX = this.grid.size - 14;
      const secBaseY = this.grid.size - 14;
      this.spawnBuilding('power_plant', 2, mission.secondaryEnemyFaction, secBaseX, secBaseY, true, true);
      this.spawnBuilding('barracks', 2, mission.secondaryEnemyFaction, secBaseX + 3, secBaseY, true, true);
      this.spawnBuilding('war_factory', 2, mission.secondaryEnemyFaction, secBaseX, secBaseY + 3, true, true);
      this.spawnBuilding('pillbox', 2, mission.secondaryEnemyFaction, secBaseX - 2, secBaseY + 1, true, true);
      this.spawnUnit('heavy_siege_tank', 2, mission.secondaryEnemyFaction, secBaseX - 1.5, secBaseY + 2.5);
      this.spawnUnit('rocket_trooper', 2, mission.secondaryEnemyFaction, secBaseX - 1.5, secBaseY + 4.5);
    }

    this.recalculatePower(1);
    this.recalculatePower(2);
    this.updateVision();
  }

  public spawnBuilding(
    buildingId: BuildingId,
    owner: number,
    faction: FactionId,
    tileX: number,
    tileY: number,
    withAutoSlab = false,
    skipSpawns = false
  ): BuildingEntity | null {
    const def = BUILDINGS[buildingId];
    if (!def) return null;

    if (def.isSlab) {
      this.grid.placeConcreteSlabs(tileX, tileY, def.footprintW, def.footprintH, owner);
      return null;
    }

    const id = this.nextEntityId++;
    const slabRatio = this.grid.occupyBuilding(
      tileX,
      tileY,
      def.footprintW,
      def.footprintH,
      id,
      owner,
      withAutoSlab
    );

    const fDef = FACTIONS[faction];
    const maxHp = Math.round(def.hp * fDef.armorBonus);
    // Concrete slab foundation mechanic: placing a building without concrete slabs causes structural penalty (65% starting HP)
    const initialHpRatio = def.isWall ? 1.0 : 0.65 + 0.35 * slabRatio;

    const entity: BuildingEntity = {
      id,
      kind: 'building',
      buildingId,
      owner,
      faction,
      tileX,
      tileY,
      w: def.footprintW,
      h: def.footprintH,
      hp: Math.round(maxHp * initialHpRatio),
      maxHp,
      slabRatio,
      isRepairing: false,
      attackCooldown: 0,
      turretAngle: owner === 1 ? -Math.PI / 4 : (3 * Math.PI) / 4,
      constructAnimProgress: skipSpawns ? 1 : 0
    };

    this.buildings.push(entity);
    this.recalculatePower(owner);

    if (def.spawnsHarvester && !skipSpawns) {
      const spawnSpot = this.findFreeAdjacentTile(tileX, tileY, def.footprintW, def.footprintH);
      this.spawnUnit('harvester', owner, faction, spawnSpot.x, spawnSpot.y);
    }

    return entity;
  }

  public spawnUnit(
    unitId: UnitId,
    owner: number,
    faction: FactionId,
    x: number,
    y: number
  ): UnitEntity {
    const def = UNITS[unitId];
    const fDef = FACTIONS[faction];
    const maxHp = Math.round(def.hp * fDef.armorBonus);

    const unit: UnitEntity = {
      id: this.nextEntityId++,
      kind: 'unit',
      unitId,
      owner,
      originalOwner: owner,
      faction,
      x: Math.max(1.5, Math.min(this.grid.size - 1.5, x)),
      y: Math.max(1.5, Math.min(this.grid.size - 1.5, y)),
      hp: maxHp,
      maxHp,
      selected: false,
      controlGroup: null,
      hullAngle: owner === 1 ? -Math.PI / 4 : (3 * Math.PI) / 4,
      turretAngle: owner === 1 ? -Math.PI / 4 : (3 * Math.PI) / 4,
      path: [],
      targetEntityId: null,
      attackMoveGoal: null,
      attackCooldown: 0,
      harvesterState: def.isHarvester ? 'idle' : 'idle',
      oreCarried: 0,
      maxOreCapacity: def.isHarvester ? (owner === 1 && this.difficulty === 'recruit' ? 900 : 700) : 0,
      harvestTimer: 0,
      targetOreTile: null,
      deviatedTimer: 0,
      slowedTimer: 0,
      empTimer: 0,
      cloakShimmerTimer: 0
    };

    this.units.push(unit);
    return unit;
  }

  public findFreeAdjacentTile(tx: number, ty: number, w: number, h: number): Point {
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy < h + r; dy++) {
        for (let dx = -r; dx < w + r; dx++) {
          const cx = tx + dx;
          const cy = ty + dy;
          if (this.grid.isPassableForUnit(cx, cy)) {
            return { x: cx + 0.5, y: cy + 0.5 };
          }
        }
      }
    }
    return { x: tx + w + 0.5, y: ty + h + 0.5 };
  }

  public recalculatePower(owner: number): void {
    const player = this.players[owner];
    if (!player) return;

    let produced = 0;
    let consumed = 0;
    let hasRadarBuilding = false;

    for (const b of this.buildings) {
      if (b.owner !== owner) continue;
      const def = BUILDINGS[b.buildingId];
      if (def.powerDiff > 0) {
        // Damaged power plants produce proportionally less power (classic Red Alert mechanic)
        const healthFactor = 0.4 + 0.6 * (b.hp / b.maxHp);
        produced += Math.round(def.powerDiff * healthFactor);
      } else if (def.powerDiff < 0) {
        consumed += Math.abs(def.powerDiff);
      }
      if (b.buildingId === 'radar_outpost') {
        hasRadarBuilding = true;
      }
    }

    const wasLowPower = player.powerProduced < player.powerConsumed;
    player.powerProduced = produced;
    player.powerConsumed = consumed;
    const isLowPower = produced < consumed;

    player.radarOnline = hasRadarBuilding && !isLowPower && this.ionStormActiveTimer <= 0;

    if (owner === 1 && !wasLowPower && isLowPower && this.elapsedSec > 2) {
      this.events.onEvaSpeech?.('Low Power');
      this.events.onToast?.(
        'VARNING: Låg energi! Bygg fler Kraftverk.',
        'WARNING: Low Power! Construct additional Power Plants.',
        'warn'
      );
    }
  }

  public getAvailableBuildings(owner: number): BuildingDef[] {
    const player = this.players[owner];
    if (!player) return [];
    const ownedSet = new Set<BuildingId>();
    for (const b of this.buildings) {
      if (b.owner === owner) ownedSet.add(b.buildingId);
    }

    return Object.values(BUILDINGS).filter((def) => {
      if (def.id === 'construction_yard') return false; // Built via MCV
      if (def.techLevel > this.techLevel) return false;
      if (def.factions && !def.factions.includes(player.faction)) return false;
      if (!ownedSet.has('construction_yard')) return false;
      if (def.prerequisites) {
        for (const req of def.prerequisites) {
          if (!ownedSet.has(req)) return false;
        }
      }
      return true;
    });
  }

  public getAvailableUnits(owner: number): UnitDef[] {
    const player = this.players[owner];
    if (!player) return [];
    const ownedSet = new Set<BuildingId>();
    for (const b of this.buildings) {
      if (b.owner === owner) ownedSet.add(b.buildingId);
    }

    return Object.values(UNITS).filter((def) => {
      if (def.techLevel > this.techLevel) return false;
      if (def.factions && !def.factions.includes(player.faction)) return false;
      if (!ownedSet.has(def.producedAt)) return false;
      if (def.prerequisites) {
        for (const req of def.prerequisites) {
          if (!ownedSet.has(req)) return false;
        }
      }
      return true;
    });
  }

  public startProduction(owner: number, itemId: BuildingId | UnitId, isBuilding: boolean): boolean {
    const player = this.players[owner];
    if (!player) return false;

    if (isBuilding) {
      if (player.structureJob) return false;
      const def = BUILDINGS[itemId as BuildingId];
      if (!def) return false;
      if (player.credits < 20 && def.cost > 0) {
        if (owner === 1) this.events.onEvaSpeech?.('Insufficient Funds');
        return false;
      }
      player.structureJob = {
        itemId,
        isBuilding: true,
        cost: def.cost,
        paidSoFar: 0,
        progressSec: 0,
        totalSec: def.buildTimeSec,
        readyToPlace: false
      };
      if (owner === 1) this.events.onEvaSpeech?.('Building');
      return true;
    } else {
      if (player.unitJob) return false;
      const def = UNITS[itemId as UnitId];
      if (!def) return false;
      if (player.credits < 20 && def.cost > 0) {
        if (owner === 1) this.events.onEvaSpeech?.('Insufficient Funds');
        return false;
      }
      player.unitJob = {
        itemId,
        isBuilding: false,
        cost: def.cost,
        paidSoFar: 0,
        progressSec: 0,
        totalSec: def.buildTimeSec,
        readyToPlace: false
      };
      if (owner === 1) this.events.onEvaSpeech?.('Training');
      return true;
    }
  }

  public cancelProduction(owner: number, isBuilding: boolean): void {
    const player = this.players[owner];
    if (!player) return;
    const job = isBuilding ? player.structureJob : player.unitJob;
    if (!job) return;
    player.credits += Math.round(job.paidSoFar);
    if (isBuilding) player.structureJob = null;
    else player.unitJob = null;
    if (owner === 1) this.events.onEvaSpeech?.('Canceled');
  }

  public placeReadyStructure(owner: number, tileX: number, tileY: number): boolean {
    const player = this.players[owner];
    if (!player || !player.structureJob || !player.structureJob.readyToPlace) return false;

    const bId = player.structureJob.itemId as BuildingId;
    const def = BUILDINGS[bId];
    const check = this.grid.canPlaceStructure(
      tileX,
      tileY,
      def.footprintW,
      def.footprintH,
      owner,
      Boolean(def.isSlab)
    );

    if (!check.valid) return false;

    this.spawnBuilding(bId, owner, player.faction, tileX, tileY, false, false);
    player.structureJob = null;
    if (owner === 1) {
      this.events.onSfx?.('build');
      if (!def.isSlab && !def.isWall && check.slabCoverageRatio < 0.99) {
        this.events.onToast?.(
          'Byggnad uppförd utan komplett Betongplatta (startar med lägre HP).',
          'Structure placed without full Concrete Slab (starts with reduced HP).',
          'warn'
        );
      }
    }
    return true;
  }

  public deployMCV(unitId: number): boolean {
    const u = this.units.find((x) => x.id === unitId);
    if (!u || u.unitId !== 'mcv') return false;

    const tx = Math.floor(u.x) - 1;
    const ty = Math.floor(u.y) - 1;
    const check = this.grid.canPlaceStructure(tx, ty, 3, 3, u.owner, false, true);
    if (!check.valid) {
      if (u.owner === 1) {
        this.events.onEvaSpeech?.('Cannot Deploy Here');
        this.events.onToast?.(
          'MCV kräver en 3×3 platt klipplatå (Rock) för att vecklas ut!',
          'MCV requires a clear 3×3 flat Rock plateau to deploy!',
          'warn'
        );
      }
      return false;
    }

    // Remove MCV and spawn Construction Yard with concrete slabs underneath
    this.units = this.units.filter((x) => x.id !== u.id);
    this.spawnBuilding('construction_yard', u.owner, u.faction, tx, ty, true, false);
    if (u.owner === 1) {
      this.events.onSfx?.('build');
      this.events.onEvaSpeech?.('Base Deployed');
    }
    return true;
  }

  public sellBuilding(buildingEntityId: number, owner: number): boolean {
    const idx = this.buildings.findIndex((b) => b.id === buildingEntityId && b.owner === owner);
    if (idx === -1) return false;
    const b = this.buildings[idx];
    const def = BUILDINGS[b.buildingId];
    const refund = Math.round(def.cost * 0.5 * (b.hp / b.maxHp));
    this.players[owner].credits += refund;

    this.grid.clearBuildingOccupancy(b.id);
    this.buildings.splice(idx, 1);
    this.recalculatePower(owner);
    if (owner === 1) {
      this.events.onSfx?.('cash');
      this.events.onEvaSpeech?.('Structure Sold');
    }
    return true;
  }

  public toggleRepairBuilding(buildingEntityId: number, owner: number): boolean {
    const b = this.buildings.find((x) => x.id === buildingEntityId && x.owner === owner);
    if (!b) return false;
    if (b.hp >= b.maxHp) {
      b.isRepairing = false;
      return false;
    }
    b.isRepairing = !b.isRepairing;
    if (owner === 1 && b.isRepairing) {
      this.events.onEvaSpeech?.('Repairing');
    }
    return b.isRepairing;
  }

  public fireSuperweapon(owner: number, targetX: number, targetY: number): boolean {
    const player = this.players[owner];
    if (!player || !player.superweaponReady) return false;

    player.superweaponReady = false;
    player.superweaponCooldownSec = player.superweaponMaxSec;

    const facDef = FACTIONS[player.faction];
    this.events.onSfx?.('nuke');
    if (owner === 1) {
      this.events.onEvaSpeech?.('Superweapon Launched');
    } else {
      this.events.onEvaSpeech?.('Warning Superweapon Detected');
    }

    this.projectiles.push({
      id: this.nextEntityId++,
      weaponKind: 'superweapon',
      fromX: targetX,
      fromY: Math.max(0, targetY - 12),
      toX: targetX,
      toY: targetY,
      progress: 0,
      speed: 1.5,
      colorHex: facDef.emissiveHex
    });

    const radius = facDef.superweaponId === 'nuke_silo' ? 6.5 : 5.2;
    const maxDmg = facDef.superweaponId === 'nuke_silo' ? 950 : facDef.superweaponId === 'ion_cannon' ? 850 : 480;

    this.recentExplosions.push({
      x: targetX,
      y: targetY,
      radius,
      colorHex: facDef.emissiveHex,
      isSuperweapon: true
    });

    // Apply area damage & special effects
    for (const u of [...this.units]) {
      const d = Math.hypot(u.x - targetX, u.y - targetY);
      if (d <= radius) {
        const falloff = 1 - (d / radius) * 0.55;
        if (facDef.superweaponId === 'emp_pulse' && u.owner !== owner) {
          u.empTimer = 14;
          u.deviatedTimer = 12;
          u.owner = owner;
        }
        this.applyDamageToUnit(u, Math.round(maxDmg * falloff));
      }
    }

    for (const b of [...this.buildings]) {
      const bx = b.tileX + b.w * 0.5;
      const by = b.tileY + b.h * 0.5;
      const d = Math.hypot(bx - targetX, by - targetY);
      if (d <= radius + 1.2) {
        const falloff = Math.max(0.25, 1 - (d / (radius + 1.5)) * 0.6);
        this.applyDamageToBuilding(b, Math.round(maxDmg * falloff));
      }
    }

    return true;
  }

  public issueMoveOrder(units: UnitEntity[], destX: number, destY: number, isAttackMove = false): void {
    const count = units.length;
    if (count === 0) return;

    const cols = Math.ceil(Math.sqrt(count));
    units.forEach((u, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const offsetX = (col - (cols - 1) / 2) * 1.1;
      const offsetY = (row - (cols - 1) / 2) * 1.1;
      const gx = Math.max(1, Math.min(this.grid.size - 2, destX + offsetX));
      const gy = Math.max(1, Math.min(this.grid.size - 2, destY + offsetY));

      u.targetEntityId = null;
      u.attackMoveGoal = isAttackMove ? { x: gx, y: gy } : null;
      if (UNITS[u.unitId].isHarvester) {
        const cell = this.grid.getCell(Math.floor(destX), Math.floor(destY));
        if (cell && (cell.terrain === 'ore' || cell.terrain === 'crystal_vent') && cell.oreAmount > 0) {
          u.harvesterState = 'moving_to_ore';
          u.targetOreTile = { x: cell.x, y: cell.y };
        } else {
          u.harvesterState = 'idle';
        }
      }
      u.path = Pathfinder.findPath(this.grid, u.x, u.y, gx, gy);
    });
  }

  public issueTargetOrder(units: UnitEntity[], targetId: number): void {
    const targetBuilding = this.buildings.find((b) => b.id === targetId);
    const targetUnit = this.units.find((u) => u.id === targetId);
    if (!targetBuilding && !targetUnit) return;

    const tx = targetBuilding ? targetBuilding.tileX + targetBuilding.w * 0.5 : targetUnit!.x;
    const ty = targetBuilding ? targetBuilding.tileY + targetBuilding.h * 0.5 : targetUnit!.y;

    for (const u of units) {
      if (UNITS[u.unitId].isHarvester && targetBuilding && targetBuilding.buildingId === 'refinery' && targetBuilding.owner === u.owner) {
        u.harvesterState = 'returning';
        u.path = Pathfinder.findPath(this.grid, u.x, u.y, tx, ty);
        continue;
      }
      u.targetEntityId = targetId;
      u.path = Pathfinder.findPath(this.grid, u.x, u.y, tx, ty);
    }
  }

  public update(dt: number): void {
    if (this.status !== 'playing') return;
    this.elapsedSec += dt;

    // Peace Timer countdown (base building grace period)
    if (this.peaceTimerRemaining > 0) {
      this.peaceTimerRemaining = Math.max(0, this.peaceTimerRemaining - dt);
      if (this.peaceTimerRemaining <= 0 && !this.peaceAlertTriggered) {
        this.peaceAlertTriggered = true;
        this.events.onToast?.(
          '⚠️ FREDSPERIOD SLUT: Fiendens pansardivisioner inleder offensiv!',
          '⚠️ GRACE PERIOD EXPIRED: Enemy armor divisions advancing!',
          'warn'
        );
        this.events.onEvaSpeech?.('Warning: Enemy offensive initiated');
      }
    }

    // 1. Update Building Construction animations & Slab weather decay
    this.slabDecayTimer += dt;
    const applySlabDecay = this.slabDecayTimer >= 4.0;
    if (applySlabDecay) this.slabDecayTimer = 0;

    this.repairTickTimer += dt;
    const applyRepairTick = this.repairTickTimer >= 0.5;
    if (applyRepairTick) this.repairTickTimer = 0;

    for (const b of this.buildings) {
      if (b.constructAnimProgress < 1) {
        b.constructAnimProgress = Math.min(1, b.constructAnimProgress + dt * 1.4);
      }

      // Structural weather decay if placed without concrete slabs (down to 50% HP floor)
      if (applySlabDecay && b.slabRatio < 0.99 && !BUILDINGS[b.buildingId].isWall) {
        const minFloor = Math.round(b.maxHp * 0.5);
        if (b.hp > minFloor) {
          b.hp = Math.max(minFloor, b.hp - Math.round((1 - b.slabRatio) * 6));
        }
      }

      // Active building repair
      if (applyRepairTick && b.isRepairing) {
        const p = this.players[b.owner];
        if (p && p.credits >= 8 && b.hp < b.maxHp) {
          p.credits -= 8;
          b.hp = Math.min(b.maxHp, b.hp + 28);
          if (b.hp >= b.maxHp) b.isRepairing = false;
        } else {
          b.isRepairing = false;
        }
      }

      // Repair pad heals nearby vehicles
      if (applyRepairTick && b.buildingId === 'repair_pad') {
        const cx = b.tileX + b.w * 0.5;
        const cy = b.tileY + b.h * 0.5;
        for (const u of this.units) {
          if (u.owner === b.owner && u.hp < u.maxHp && UNITS[u.unitId].category === 'vehicle') {
            if (Math.hypot(u.x - cx, u.y - cy) <= 3.8) {
              u.hp = Math.min(u.maxHp, u.hp + 22);
            }
          }
        }
      }
    }

    // 2. Update Production Queues & Superweapon charging for each player
    for (const ownerStr of Object.keys(this.players)) {
      const owner = Number(ownerStr);
      this.updatePlayerProduction(owner, dt);
    }

    // 3. Update Units (Movement, Harvesters, Combat, Engineers, Crushing)
    this.updateUnits(dt);

    // 4. Update Base Defense Turrets
    this.updateDefenseTurrets(dt);

    // 5. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += dt * p.speed;
      if (p.progress >= 1) {
        this.projectiles.splice(i, 1);
      }
    }

    // 6. Update Planetary Hazards (Sandworms & Ion Storms) & Ore regrowth
    this.updateHazards(dt);

    this.oreRegrowTimer += dt;
    if (this.oreRegrowTimer >= 14) {
      this.oreRegrowTimer = 0;
      this.grid.regrowOreNearVents();
    }

    // 7. Update AI Commander (owner = 2)
    this.updateAI(2, dt);

    // 8. Update Fog of War Vision for Human Player
    this.updateVision();

    // 9. Check Victory / Defeat conditions
    this.checkWinLossConditions();
  }

  private updatePlayerProduction(owner: number, dt: number): void {
    const p = this.players[owner];
    if (!p) return;

    const lowPowerFactor = p.powerProduced < p.powerConsumed ? 0.45 : 1.0;

    // Structure Job
    if (p.structureJob && !p.structureJob.readyToPlace) {
      const job = p.structureJob;
      const stepSec = dt * lowPowerFactor;
      const costPerSec = job.cost / Math.max(0.5, job.totalSec);
      const neededCredits = Math.min(job.cost - job.paidSoFar, costPerSec * stepSec);

      if (p.credits >= neededCredits || job.cost === 0) {
        p.credits = Math.max(0, p.credits - neededCredits);
        job.paidSoFar += neededCredits;
        job.progressSec += stepSec;
        if (job.progressSec >= job.totalSec) {
          job.progressSec = job.totalSec;
          job.readyToPlace = true;
          if (owner === 1) {
            this.events.onEvaSpeech?.('Construction Complete');
          }
        }
      }
    }

    // Unit Job
    if (p.unitJob) {
      const job = p.unitJob;
      const stepSec = dt * lowPowerFactor;
      const costPerSec = job.cost / Math.max(0.5, job.totalSec);
      const neededCredits = Math.min(job.cost - job.paidSoFar, costPerSec * stepSec);

      if (p.credits >= neededCredits || job.cost === 0) {
        p.credits = Math.max(0, p.credits - neededCredits);
        job.paidSoFar += neededCredits;
        job.progressSec += stepSec;
        if (job.progressSec >= job.totalSec) {
          const uDef = UNITS[job.itemId as UnitId];
          const producer = this.buildings.find(
            (b) => b.owner === owner && b.buildingId === uDef.producedAt
          );
          if (producer) {
            const spot = this.findFreeAdjacentTile(
              producer.tileX,
              producer.tileY,
              producer.w,
              producer.h
            );
            this.spawnUnit(uDef.id, owner, p.faction, spot.x, spot.y);
            if (owner === 1) {
              this.events.onEvaSpeech?.('Unit Ready');
            }
          }
          p.unitJob = null;
        }
      }
    }

    // Superweapon charging
    const hasPalace = this.buildings.some(
      (b) => b.owner === owner && b.buildingId === 'palace_superweapon'
    );
    if (hasPalace && !p.superweaponReady && p.powerProduced >= p.powerConsumed) {
      p.superweaponCooldownSec = Math.max(0, p.superweaponCooldownSec - dt);
      if (p.superweaponCooldownSec <= 0) {
        p.superweaponReady = true;
        if (owner === 1) {
          this.events.onEvaSpeech?.('Superweapon Ready');
          this.events.onToast?.(
            'SUPERVAPEN REDO! Klicka på Supervapen-knappen i sidopanelen.',
            'SUPERWEAPON READY! Click the Superweapon button in the sidebar.',
            'info'
          );
        }
      }
    }
  }

  private updateUnits(dt: number): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (!u) continue;
      const def = UNITS[u.unitId];
      const fDef = FACTIONS[u.faction];

      // Timers
      if (u.attackCooldown > 0) u.attackCooldown = Math.max(0, u.attackCooldown - dt);
      if (u.slowedTimer > 0) u.slowedTimer = Math.max(0, u.slowedTimer - dt);
      if (u.empTimer > 0) u.empTimer = Math.max(0, u.empTimer - dt);
      if (u.cloakShimmerTimer > 0) u.cloakShimmerTimer = Math.max(0, u.cloakShimmerTimer - dt);

      if (u.deviatedTimer > 0) {
        u.deviatedTimer -= dt;
        if (u.deviatedTimer <= 0) {
          u.owner = u.originalOwner;
          u.targetEntityId = null;
        }
      }

      if (def.selfHealPerSec && u.hp < u.maxHp) {
        u.hp = Math.min(u.maxHp, u.hp + def.selfHealPerSec * dt);
      }

      if (u.empTimer > 0) continue; // Stunned by EMP

      // Harvester State Machine
      if (def.isHarvester) {
        this.updateHarvester(u, dt);
      }

      // Engineer Building Capture / Instant Repair
      if (def.isEngineer && u.targetEntityId !== null) {
        const targetB = this.buildings.find((b) => b.id === u.targetEntityId);
        if (targetB) {
          const bx = targetB.tileX + targetB.w * 0.5;
          const by = targetB.tileY + targetB.h * 0.5;
          if (Math.hypot(u.x - bx, u.y - by) <= Math.max(targetB.w, targetB.h) * 0.75 + 1.0) {
            if (targetB.owner === u.owner) {
              targetB.hp = targetB.maxHp;
              if (u.owner === 1) this.events.onEvaSpeech?.('Building Repaired');
            } else {
              const prevOwner = targetB.owner;
              targetB.owner = u.owner;
              targetB.faction = u.faction;
              this.recalculatePower(prevOwner);
              this.recalculatePower(u.owner);
              if (u.owner === 1) {
                this.events.onEvaSpeech?.('Structure Captured');
                this.events.onToast?.(
                  'Ingenjören har tagit över fiendens byggnad!',
                  'Combat Engineer captured enemy structure!',
                  'info'
                );
              }
            }
            this.units.splice(i, 1);
            continue;
          }
        }
      }

      // Combat Target Acquisition & Firing
      if (def.attackDamage > 0) {
        this.updateUnitCombat(u, def, fDef);
      }

      // Movement along path
      if (u.path.length > 0) {
        const nextPt = u.path[0];
        const dx = nextPt.x - u.x;
        const dy = nextPt.y - u.y;
        const dist = Math.hypot(dx, dy);

        const slowMult = u.slowedTimer > 0 ? 0.55 : 1.0;
        const stormMult = this.ionStormActiveTimer > 0 ? 0.8 : 1.0;
        const diffMult = (u.owner === 1 && def.isHarvester && this.difficulty === 'recruit') ? 1.25 : 1.0;
        const moveSpeed = def.speed * fDef.speedBonus * slowMult * stormMult * diffMult;

        if (dist <= moveSpeed * dt) {
          u.x = nextPt.x;
          u.y = nextPt.y;
          u.path.shift();
        } else {
          u.hullAngle = Math.atan2(dy, dx);
          if (u.targetEntityId === null) {
            u.turretAngle = u.hullAngle;
          }
          u.x += (dx / dist) * moveSpeed * dt;
          u.y += (dy / dist) * moveSpeed * dt;
        }

        // Infantry crushing by heavy vehicles (tactical armor crush mechanic)
        if (def.canCrushInfantry) {
          for (let j = this.units.length - 1; j >= 0; j--) {
            const other = this.units[j];
            if (!other || other.owner === u.owner) continue;
            if (UNITS[other.unitId].category === 'infantry') {
              if (Math.hypot(other.x - u.x, other.y - u.y) < 0.65) {
                this.events.onSfx?.('crush');
                this.applyDamageToUnit(other, 9999);
              }
            }
          }
        }
      }
    }

    // Soft unit separation so units don't stack on top of the exact same coordinate
    for (let i = 0; i < this.units.length; i++) {
      for (let j = i + 1; j < this.units.length; j++) {
        const a = this.units[i];
        const b = this.units[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.001 && dist < 0.55) {
          const push = (0.55 - dist) * 0.25;
          const nx = dx / dist;
          const ny = dy / dist;
          if (this.grid.isPassableForUnit(Math.floor(a.x - nx * push), Math.floor(a.y - ny * push))) {
            a.x -= nx * push;
            a.y -= ny * push;
          }
          if (this.grid.isPassableForUnit(Math.floor(b.x + nx * push), Math.floor(b.y + ny * push))) {
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
    }
  }

  private updateHarvester(u: UnitEntity, dt: number): void {
    if (u.harvesterState === 'idle') {
      if (u.oreCarried >= u.maxOreCapacity) {
        u.harvesterState = 'returning';
      } else {
        // Find nearest ore tile
        let bestTile: Point | null = null;
        let bestDist = Infinity;
        for (let i = 0; i < this.grid.cells.length; i++) {
          const c = this.grid.cells[i];
          if ((c.terrain === 'ore' || c.terrain === 'crystal_vent') && c.oreAmount > 0) {
            const d = Math.hypot(c.x + 0.5 - u.x, c.y + 0.5 - u.y);
            if (d < bestDist) {
              bestDist = d;
              bestTile = { x: c.x, y: c.y };
            }
          }
        }
        if (bestTile) {
          u.targetOreTile = bestTile;
          u.harvesterState = 'moving_to_ore';
          u.path = Pathfinder.findPath(this.grid, u.x, u.y, bestTile.x + 0.5, bestTile.y + 0.5);
        }
      }
    } else if (u.harvesterState === 'moving_to_ore') {
      if (u.path.length === 0) {
        u.harvesterState = 'harvesting';
        u.harvestTimer = 0;
      }
    } else if (u.harvesterState === 'harvesting') {
      const cell = this.grid.getCell(Math.floor(u.x), Math.floor(u.y));
      if (!cell || cell.oreAmount <= 0) {
        if (u.oreCarried >= 200) {
          u.harvesterState = 'returning';
        } else {
          u.harvesterState = 'idle';
        }
        return;
      }
      u.harvestTimer += dt;
      if (u.harvestTimer >= 0.6) {
        u.harvestTimer = 0;
        const scooped = Math.min(100, cell.oreAmount, u.maxOreCapacity - u.oreCarried);
        cell.oreAmount -= scooped;
        u.oreCarried += scooped;
        if (cell.oreAmount <= 0 && cell.terrain === 'ore') {
          cell.terrain = 'sand';
        }
        if (u.oreCarried >= u.maxOreCapacity) {
          u.harvesterState = 'returning';
        }
      }
    } else if (u.harvesterState === 'returning') {
      const refineries = this.buildings.filter(
        (b) => b.owner === u.owner && b.buildingId === 'refinery'
      );
      if (refineries.length === 0) {
        u.harvesterState = 'idle';
        return;
      }
      // Find closest refinery
      let closest = refineries[0];
      let bestDist = Infinity;
      for (const r of refineries) {
        const d = Math.hypot(r.tileX + 1.5 - u.x, r.tileY + 3.2 - u.y);
        if (d < bestDist) {
          bestDist = d;
          closest = r;
        }
      }
      const dockX = closest.tileX + 1.5;
      const dockY = closest.tileY + closest.h + 0.5;
      if (Math.hypot(u.x - dockX, u.y - dockY) <= 1.6) {
        u.path = [];
        u.harvesterState = 'unloading';
        u.harvestTimer = 0;
      } else if (u.path.length === 0) {
        u.path = Pathfinder.findPath(this.grid, u.x, u.y, dockX, dockY);
      }
    } else if (u.harvesterState === 'unloading') {
      u.harvestTimer += dt;
      if (u.harvestTimer >= 0.8) {
        const p = this.players[u.owner];
        if (p) {
          p.credits += u.oreCarried;
          p.harvestedCredits = (p.harvestedCredits || 0) + u.oreCarried;
          if (u.owner === 1 && u.oreCarried > 0) {
            this.events.onSfx?.('cash');
          }
        }
        u.oreCarried = 0;
        u.harvesterState = 'idle';
      }
    }
  }

  private updateUnitCombat(u: UnitEntity, def: UnitDef, fDef: (typeof FACTIONS)[FactionId]): void {
    // Validate current target
    let targetU: UnitEntity | undefined;
    let targetB: BuildingEntity | undefined;

    if (u.targetEntityId !== null) {
      targetU = this.units.find((x) => x.id === u.targetEntityId && x.owner !== u.owner);
      targetB = this.buildings.find((x) => x.id === u.targetEntityId && x.owner !== u.owner);
      if (!targetU && !targetB) {
        u.targetEntityId = null;
      }
    }

    // Auto-acquire enemy within sight/attack range if idle or on attack-move
    if (!targetU && !targetB && (u.path.length === 0 || u.attackMoveGoal !== null)) {
      const scanRange = Math.max(def.attackRange, def.sightRange);
      let bestDist = scanRange;

      for (const other of this.units) {
        if (other.owner === u.owner) continue;
        // Cloaked stealth tanks are invisible unless shimmering or within 1.8 tiles
        if (UNITS[other.unitId].isCloaked && other.cloakShimmerTimer <= 0) {
          if (Math.hypot(other.x - u.x, other.y - u.y) > 1.8) continue;
        }
        const d = Math.hypot(other.x - u.x, other.y - u.y);
        if (d < bestDist) {
          bestDist = d;
          targetU = other;
        }
      }

      if (!targetU) {
        for (const b of this.buildings) {
          if (b.owner === u.owner) continue;
          const bx = b.tileX + b.w * 0.5;
          const by = b.tileY + b.h * 0.5;
          const d = Math.hypot(bx - u.x, by - u.y);
          if (d < bestDist) {
            bestDist = d;
            targetB = b;
          }
        }
      }
    }

    if (!targetU && !targetB) return;

    const tx = targetU ? targetU.x : targetB!.tileX + targetB!.w * 0.5;
    const ty = targetU ? targetU.y : targetB!.tileY + targetB!.h * 0.5;
    const dist = Math.hypot(tx - u.x, ty - u.y);
    const effectiveRange = def.attackRange + (targetB ? Math.max(targetB.w, targetB.h) * 0.45 : 0);

    if (dist <= effectiveRange) {
      // Stop and fire
      if (u.targetEntityId !== null || u.attackMoveGoal !== null) {
        u.path = [];
      }
      u.turretAngle = Math.atan2(ty - u.y, tx - u.x);

      if (u.attackCooldown <= 0) {
        u.attackCooldown = def.attackCooldownSec;
        if (def.isCloaked) {
          u.cloakShimmerTimer = 3.0;
        }

        const rawDmg = def.attackDamage * fDef.firepowerBonus;
        this.spawnProjectile(def.weaponKind, u.x, u.y, tx, ty, fDef.emissiveHex);

        if (targetU) {
          if (def.weaponKind === 'nerve_gas' && UNITS[targetU.unitId].category === 'vehicle') {
            targetU.owner = u.owner;
            targetU.deviatedTimer = 14;
            targetU.targetEntityId = null;
          }
          const armorMult = this.getArmorMultiplier(def.weaponKind, UNITS[targetU.unitId].armor);
          this.applyDamageToUnit(targetU, Math.round(rawDmg * armorMult));
        } else if (targetB) {
          const structMult = def.isCommando ? 3.2 : def.weaponKind === 'bullet' ? 0.55 : 1.0;
          this.applyDamageToBuilding(targetB, Math.round(rawDmg * structMult));
        }
      }
    } else if (u.targetEntityId !== null && u.path.length === 0) {
      // Chase target
      u.path = Pathfinder.findPath(this.grid, u.x, u.y, tx, ty);
    }
  }

  private updateDefenseTurrets(dt: number): void {
    for (const b of this.buildings) {
      const def = BUILDINGS[b.buildingId];
      if (!def.isDefense || !def.attackDamage || !def.attackRange) continue;

      if (b.attackCooldown > 0) {
        b.attackCooldown = Math.max(0, b.attackCooldown - dt);
      }

      const p = this.players[b.owner];
      if (def.requiresPowerToFire && p && p.powerProduced < p.powerConsumed) {
        continue; // Offline due to Low Power!
      }

      const bx = b.tileX + b.w * 0.5;
      const by = b.tileY + b.h * 0.5;

      let bestTarget: UnitEntity | null = null;
      let bestDist = def.attackRange;
      for (const u of this.units) {
        if (u.owner === b.owner) continue;
        if (UNITS[u.unitId].isCloaked && u.cloakShimmerTimer <= 0) {
          if (Math.hypot(u.x - bx, u.y - by) > 2.5) continue;
        }
        const d = Math.hypot(u.x - bx, u.y - by);
        if (d <= bestDist) {
          bestDist = d;
          bestTarget = u;
        }
      }

      if (bestTarget) {
        b.turretAngle = Math.atan2(bestTarget.y - by, bestTarget.x - bx);
        if (b.attackCooldown <= 0) {
          b.attackCooldown = def.attackCooldownSec || 1.2;
          const colorHex =
            def.weaponType === 'tesla'
              ? 0x66d9ff
              : def.weaponType === 'cryo'
              ? 0x38d9a9
              : def.weaponType === 'laser'
              ? 0xff3b3b
              : 0xffaa33;

          this.spawnProjectile(
            (def.weaponType as WeaponKind) || 'shell',
            bx,
            by,
            bestTarget.x,
            bestTarget.y,
            colorHex
          );

          if (def.weaponType === 'cryo') {
            bestTarget.slowedTimer = 4.5;
          }
          this.applyDamageToUnit(bestTarget, def.attackDamage);
        }
      }
    }
  }

  private spawnProjectile(
    weaponKind: WeaponKind | 'tesla' | 'cryo' | 'laser',
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    colorHex: number
  ): void {
    this.projectiles.push({
      id: this.nextEntityId++,
      weaponKind,
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      speed: weaponKind === 'tesla' || weaponKind === 'laser' || weaponKind === 'cryo' ? 6.5 : 4.2,
      colorHex
    });

    if (weaponKind === 'tesla') this.events.onSfx?.('tesla');
    else if (weaponKind === 'flame') this.events.onSfx?.('flame');
    else if (weaponKind === 'rocket') this.events.onSfx?.('rocket');
    else this.events.onSfx?.('shot');
  }

  private getArmorMultiplier(weapon: WeaponKind, armor: 'infantry' | 'light' | 'heavy'): number {
    if (weapon === 'bullet' || weapon === 'flame' || weapon === 'c4_laser') {
      return armor === 'infantry' ? 1.45 : armor === 'light' ? 0.85 : 0.45;
    }
    if (weapon === 'rocket' || weapon === 'shell') {
      return armor === 'heavy' ? 1.25 : armor === 'light' ? 1.1 : 0.7;
    }
    return 1.0;
  }

  public applyDamageToUnit(u: UnitEntity, dmg: number): void {
    u.hp -= dmg;
    if (u.hp <= 0) {
      const idx = this.units.findIndex((x) => x.id === u.id);
      if (idx !== -1) {
        this.units.splice(idx, 1);
      }
      this.recentExplosions.push({
        x: u.x,
        y: u.y,
        radius: UNITS[u.unitId].category === 'vehicle' ? 1.2 : 0.6,
        colorHex: 0xff7722
      });
      this.events.onSfx?.('explosion');
      if (u.owner === 1) {
        this.events.onEvaSpeech?.('Unit Lost');
      }
    }
  }

  public applyDamageToBuilding(b: BuildingEntity, dmg: number): void {
    b.hp -= dmg;
    if (b.hp <= 0) {
      const idx = this.buildings.findIndex((x) => x.id === b.id);
      if (idx !== -1) {
        this.grid.clearBuildingOccupancy(b.id);
        this.buildings.splice(idx, 1);
        this.recalculatePower(b.owner);
      }
      this.recentExplosions.push({
        x: b.tileX + b.w * 0.5,
        y: b.tileY + b.h * 0.5,
        radius: Math.max(b.w, b.h) * 0.9,
        colorHex: 0xff5511
      });
      this.events.onSfx?.('explosion');
      if (b.owner === 1) {
        this.events.onEvaSpeech?.('Structure Destroyed');
      }
    } else if (b.buildingId === 'power_plant' || b.buildingId === 'adv_power_plant') {
      this.recalculatePower(b.owner);
    }
  }

  private updateHazards(dt: number): void {
    // 1. Desert Sandworm hazard
    if (this.sandworm.active) {
      const w = this.sandworm;
      if (w.surfaceTimer > 0) {
        w.surfaceTimer = Math.max(0, w.surfaceTimer - dt);
      }
      if (w.hungerCooldown > 0) {
        w.hungerCooldown = Math.max(0, w.hungerCooldown - dt);
      }

      // Find vibrating vehicle/unit on open sand/ore (not on rock!)
      let prey: UnitEntity | null = null;
      let bestDist = Infinity;
      for (const u of this.units) {
        const cell = this.grid.getCell(Math.floor(u.x), Math.floor(u.y));
        if (!cell || cell.terrain === 'rock' || cell.terrain === 'mountain') continue;
        // Harvesters and moving vehicles attract worms strongly
        const weight = UNITS[u.unitId].isHarvester ? 0.5 : 1.0;
        const d = Math.hypot(u.x - w.x, u.y - w.y) * weight;
        if (d < bestDist) {
          bestDist = d;
          prey = u;
        }
      }

      if (prey) {
        const dx = prey.x - w.x;
        const dy = prey.y - w.y;
        const dist = Math.hypot(dx, dy);
        const wormSpeed = 1.65 + this.wormActivity * 0.35;
        if (dist > 0.2) {
          w.vx = (dx / dist) * wormSpeed;
          w.vy = (dy / dist) * wormSpeed;
          const nextX = w.x + w.vx * dt;
          const nextY = w.y + w.vy * dt;
          const nextCell = this.grid.getCell(Math.floor(nextX), Math.floor(nextY));
          if (nextCell && nextCell.terrain !== 'rock' && nextCell.terrain !== 'mountain') {
            w.x = nextX;
            w.y = nextY;
          }
        }

        if (dist < 6.0 && w.hungerCooldown <= 0 && w.surfaceTimer <= 0 && prey.owner === 1) {
          w.surfaceTimer = 4.0;
          this.events.onSfx?.('worm');
          this.events.onEvaSpeech?.('Wormsign Detected');
          this.events.onToast?.(
            'VARNING: Sandworm närmar sig! Kör upp dina fordon på fast klippmark (Rock)!',
            'WARNING: Sandworm approaching! Move vehicles onto solid Rock terrain!',
            'danger'
          );
        }

        if (dist < 0.85 && w.hungerCooldown <= 0) {
          // Devour or strike unit!
          w.hungerCooldown = 24;
          w.surfaceTimer = 3.5;
          this.events.onSfx?.('worm');
          this.recentExplosions.push({
            x: prey.x,
            y: prey.y,
            radius: 1.5,
            colorHex: 0xe6a145
          });
          this.applyDamageToUnit(prey, 650);
        }
      }
    }

    // 2. Tundra Ion Storms
    if (this.ionStormActivity > 0) {
      if (this.ionStormActiveTimer > 0) {
        this.ionStormActiveTimer -= dt;
        if (this.ionStormActiveTimer <= 0) {
          this.ionStormActiveTimer = 0;
          this.recalculatePower(1);
          this.recalculatePower(2);
        }
      } else {
        this.ionStormNextTimer -= dt;
        if (this.ionStormNextTimer <= 0) {
          this.ionStormActiveTimer = 14;
          this.ionStormNextTimer = 65 - this.ionStormActivity * 12;
          this.recalculatePower(1);
          this.recalculatePower(2);
          this.events.onSfx?.('tesla');
          this.events.onEvaSpeech?.('Ion Storm Approaching');
          this.events.onToast?.(
            'VARNING: Magnetisk Jonstorm! Radar är tillfälligt störd.',
            'WARNING: Magnetic Ion Storm! Radar telemetry disrupted.',
            'warn'
          );
        }
      }
    }
  }

  private updateAI(owner: number, dt: number): void {
    const ai = this.players[owner];
    if (!ai) return;

    // Passive AI income based on difficulty: on recruit, ZERO passive income!
    if (this.difficulty === 'general') {
      ai.credits += dt * (4 + this.techLevel * 1.2);
    } else if (this.difficulty === 'veteran') {
      ai.credits += dt * (1 + this.techLevel * 0.4);
    }

    // 1. AI Base Repair & Rebuild
    ai.aiBuildTimer -= dt;
    if (ai.aiBuildTimer <= 0) {
      ai.aiBuildTimer = this.difficulty === 'recruit' ? 9.0 : this.difficulty === 'veteran' ? 6.0 : 4.5;
      for (const b of this.buildings) {
        if (b.owner === owner && b.hp < b.maxHp * 0.75) {
          b.isRepairing = true;
        }
      }

      // Ensure AI has at least 1 harvester
      const hasRefinery = this.buildings.some((b) => b.owner === owner && b.buildingId === 'refinery');
      const hasHarvester = this.units.some((u) => u.owner === owner && UNITS[u.unitId].isHarvester);
      if (hasRefinery && !hasHarvester && !ai.unitJob) {
        this.startProduction(owner, 'harvester', false);
      }

      // Queue combat unit
      if (!ai.unitJob) {
        const availUnits = this.getAvailableUnits(owner).filter(
          (u) => !u.isHarvester && !u.isEngineer && !u.isMCV
        );
        if (availUnits.length > 0 && ai.credits >= 300) {
          availUnits.sort((a, b) => b.techLevel - a.techLevel);
          const pickPool = availUnits.slice(0, Math.min(3, availUnits.length));
          const chosen = pickPool[Math.floor(this.elapsedSec) % pickPool.length];
          this.startProduction(owner, chosen.id, false);
        }
      }
    }

    // 2. AI Attack Waves (Honors Peace Timer / Grace Period)
    if (this.peaceTimerRemaining > 0) {
      return;
    }

    ai.aiAttackTimer -= dt;
    if (ai.aiAttackTimer <= 0) {
      if (this.difficulty === 'recruit') {
        ai.aiAttackTimer = Math.max(65, 110 - this.techLevel * 5);
      } else if (this.difficulty === 'veteran') {
        ai.aiAttackTimer = Math.max(40, 75 - this.techLevel * 3.5);
      } else {
        ai.aiAttackTimer = Math.max(22, 45 - this.techLevel * 2);
      }

      this.aiWaveCount++;

      const combatUnits = this.units.filter(
        (u) => u.owner === owner && !UNITS[u.unitId].isHarvester
      );
      if (combatUnits.length === 0) return;

      // Find player target on the outer defensive perimeter (closest to AI base center)
      const aiBaseCenterX = this.grid.size - 12;
      const aiBaseCenterY = 11;

      interface TargetCandidate {
        x: number;
        y: number;
        distToAi: number;
      }
      const candidates: TargetCandidate[] = [];

      for (const b of this.buildings) {
        if (b.owner === 1) {
          const cx = b.tileX + b.w * 0.5;
          const cy = b.tileY + b.h * 0.5;
          candidates.push({ x: cx, y: cy, distToAi: Math.hypot(cx - aiBaseCenterX, cy - aiBaseCenterY) });
        }
      }
      for (const u of this.units) {
        if (u.owner === 1) {
          candidates.push({ x: u.x, y: u.y, distToAi: Math.hypot(u.x - aiBaseCenterX, u.y - aiBaseCenterY) });
        }
      }

      if (candidates.length === 0) return;

      // Sort by closest to AI base (outer perimeter / vanguard units, NOT back ConYard!)
      candidates.sort((a, b) => a.distToAi - b.distToAi);
      const chosenTarget = candidates[0];

      let wave: UnitEntity[] = [];
      if (this.aiWaveCount === 1) {
        // Wave #1: Single scout unit probing outer perimeter
        wave = combatUnits.slice(0, 1);
        this.events.onToast?.(
          '⚠️ FIENTLIG SPANING: En enskild fiendepatrull närmar sig basens ytterkant!',
          '⚠️ ENEMY SCOUT: A lone recon unit is probing your outer perimeter!',
          'warn'
        );
        this.events.onEvaSpeech?.('Warning: Enemy scout approaching perimeter');
      } else {
        const ratio = this.difficulty === 'recruit' ? 0.35 : this.difficulty === 'veteran' ? 0.5 : 0.7;
        const count = Math.max(1, Math.ceil(combatUnits.length * ratio));
        const maxUnits = this.difficulty === 'recruit' ? Math.min(count, 4) : count;
        wave = combatUnits.slice(0, maxUnits);
      }

      this.issueMoveOrder(wave, chosenTarget.x, chosenTarget.y, true);
    }

    // 3. AI Superweapon usage
    if (ai.superweaponReady) {
      const pBuildings = this.buildings.filter((b) => b.owner === 1);
      if (pBuildings.length > 0) {
        const targetB = pBuildings[0];
        this.fireSuperweapon(owner, targetB.tileX + 1.5, targetB.tileY + 1.5);
      }
    }
  }

  public updateVision(): void {
    this.grid.beginVisionPass();
    for (const b of this.buildings) {
      if (b.owner === 1) {
        const radius = b.buildingId === 'radar_outpost' ? 12 : 7.5;
        this.grid.revealAround(b.tileX + b.w * 0.5, b.tileY + b.h * 0.5, radius);
      }
    }
    for (const u of this.units) {
      if (u.owner === 1) {
        const def = UNITS[u.unitId];
        this.grid.revealAround(u.x, u.y, def.sightRange);
      }
    }
  }

  private checkWinLossConditions(): void {
    const p1Buildings = this.buildings.filter((b) => b.owner === 1).length;
    const p1Units = this.units.filter((u) => u.owner === 1).length;

    if (p1Buildings === 0 && p1Units === 0) {
      this.status = 'defeat';
      this.events.onEvaSpeech?.('Mission Failed');
      return;
    }

    // Harvest quota mission win condition: check actual Pyronite ore harvested from the field!
    if (
      this.missionType === 'harvest_quota' &&
      this.targetCreditsQuota &&
      (this.players[1].harvestedCredits || 0) >= this.targetCreditsQuota
    ) {
      this.status = 'victory';
      this.events.onEvaSpeech?.('Mission Accomplished');
      return;
    }

    const enemyBuildings = this.buildings.filter((b) => b.owner !== 1).length;
    const enemyUnits = this.units.filter((u) => u.owner !== 1).length;

    if (enemyBuildings === 0 && enemyUnits === 0) {
      this.status = 'victory';
      this.events.onEvaSpeech?.('Mission Accomplished');
    }
  }

  public serialize(): SerializedGameWorld {
    return {
      nextEntityId: this.nextEntityId,
      elapsedSec: this.elapsedSec,
      techLevel: this.techLevel,
      difficulty: this.difficulty,
      peaceTimerRemaining: this.peaceTimerRemaining,
      missionId: this.missionId,
      missionType: this.missionType,
      targetCreditsQuota: this.targetCreditsQuota,
      wormActivity: this.wormActivity,
      ionStormActivity: this.ionStormActivity,
      ionStormActiveTimer: this.ionStormActiveTimer,
      ionStormNextTimer: this.ionStormNextTimer,
      sandworm: { ...this.sandworm },
      grid: this.grid.serialize(),
      players: JSON.parse(JSON.stringify(this.players)),
      buildings: JSON.parse(JSON.stringify(this.buildings)),
      units: JSON.parse(JSON.stringify(this.units))
    };
  }

  public loadSerialized(data: SerializedGameWorld): void {
    this.nextEntityId = data.nextEntityId;
    this.elapsedSec = data.elapsedSec;
    this.techLevel = data.techLevel;
    if (data.difficulty) this.difficulty = data.difficulty;
    if (typeof data.peaceTimerRemaining === 'number') this.peaceTimerRemaining = data.peaceTimerRemaining;
    this.missionId = data.missionId;
    this.missionType = data.missionType;
    this.targetCreditsQuota = data.targetCreditsQuota;
    this.wormActivity = data.wormActivity;
    this.ionStormActivity = data.ionStormActivity;
    this.ionStormActiveTimer = data.ionStormActiveTimer;
    this.ionStormNextTimer = data.ionStormNextTimer;
    this.sandworm = { ...data.sandworm };
    this.grid = GridMap.deserialize(data.grid);
    this.players = JSON.parse(JSON.stringify(data.players));
    this.buildings = JSON.parse(JSON.stringify(data.buildings));
    this.units = JSON.parse(JSON.stringify(data.units));
    this.projectiles = [];
    this.recentExplosions = [];
    this.status = 'playing';
  }
}

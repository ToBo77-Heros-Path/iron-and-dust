import { BuildingId } from './buildings';
import { FactionId } from './factions';

export type UnitId =
  | 'light_infantry'
  | 'rocket_trooper'
  | 'flamer_squad'
  | 'engineer'
  | 'commando'
  | 'harvester'
  | 'scout_trike'
  | 'light_tank'
  | 'medium_tank'
  | 'heavy_siege_tank'
  | 'sonic_artillery'
  | 'v2_launcher'
  | 'deviator_tank'
  | 'stealth_tank'
  | 'mammoth_devastator'
  | 'mcv';

export type ArmorType = 'infantry' | 'light' | 'heavy';
export type WeaponKind = 'bullet' | 'rocket' | 'flame' | 'shell' | 'sonic' | 'tesla' | 'nerve_gas' | 'c4_laser' | 'none';

export interface UnitDef {
  id: UnitId;
  nameSv: string;
  nameEn: string;
  descSv: string;
  descEn: string;
  category: 'infantry' | 'vehicle';
  producedAt: 'barracks' | 'war_factory';
  cost: number;
  buildTimeSec: number;
  hp: number;
  speed: number; // tiles per second
  sightRange: number;
  attackRange: number;
  attackDamage: number;
  attackCooldownSec: number;
  armor: ArmorType;
  weaponKind: WeaponKind;
  techLevel: number;
  canCrushInfantry?: boolean;
  isHarvester?: boolean;
  isEngineer?: boolean;
  isCommando?: boolean;
  isCloaked?: boolean;
  isMCV?: boolean;
  selfHealPerSec?: number;
  factions?: FactionId[];
  prerequisites?: BuildingId[];
}

export const UNITS: Record<UnitId, UnitDef> = {
  light_infantry: {
    id: 'light_infantry',
    nameSv: 'Lätt Infanteri (Rifle Squad)',
    nameEn: 'Rifle Infantry Squad',
    descSv: 'Snabb skyttegrupp med automatkarbiner. Stark mot annat infanteri, sårbar mot stridsvagnar.',
    descEn: 'Fast riflemen squad. Effective against enemy infantry, vulnerable to tank treads.',
    category: 'infantry',
    producedAt: 'barracks',
    cost: 100,
    buildTimeSec: 3,
    hp: 110,
    speed: 2.1,
    sightRange: 5,
    attackRange: 4.2,
    attackDamage: 16,
    attackCooldownSec: 0.8,
    armor: 'infantry',
    weaponKind: 'bullet',
    techLevel: 1,
    prerequisites: ['barracks']
  },
  rocket_trooper: {
    id: 'rocket_trooper',
    nameSv: 'Pansarvärnssoldat (Bazooka)',
    nameEn: 'Rocket Trooper',
    descSv: 'Avfyrar pansarbrytande missiler mot stridsvagnar och byggnader.',
    descEn: 'Fires armor-piercing rockets effective against tanks and structures.',
    category: 'infantry',
    producedAt: 'barracks',
    cost: 250,
    buildTimeSec: 5,
    hp: 125,
    speed: 1.75,
    sightRange: 5.5,
    attackRange: 5.8,
    attackDamage: 42,
    attackCooldownSec: 1.4,
    armor: 'infantry',
    weaponKind: 'rocket',
    techLevel: 2,
    prerequisites: ['barracks']
  },
  flamer_squad: {
    id: 'flamer_squad',
    nameSv: 'Eldkastarsoldat (Shock/Flame)',
    nameEn: 'Flame Shock Trooper',
    descSv: 'Iron Directorates chockinfanteri med eldkastare. Bränner ut bunkrar och infanteri.',
    descEn: 'Iron Directorate shock infantry armed with heavy flamethrowers.',
    category: 'infantry',
    producedAt: 'barracks',
    cost: 280,
    buildTimeSec: 5,
    hp: 165,
    speed: 1.85,
    sightRange: 5,
    attackRange: 3.8,
    attackDamage: 48,
    attackCooldownSec: 1.0,
    armor: 'infantry',
    weaponKind: 'flame',
    techLevel: 3,
    factions: ['directorate'],
    prerequisites: ['barracks']
  },
  engineer: {
    id: 'engineer',
    nameSv: 'Stridsingenjör (Engineer)',
    nameEn: 'Combat Engineer',
    descSv: 'Obeväpnad specialist. Gå in i en skadad egen byggnad för att reparera den helt, eller ta över en fiendebyggnad!',
    descEn: 'Unarmed specialist. Captures enemy structures or instantly repairs friendly buildings.',
    category: 'infantry',
    producedAt: 'barracks',
    cost: 450,
    buildTimeSec: 7,
    hp: 100,
    speed: 1.9,
    sightRange: 5,
    attackRange: 1.4,
    attackDamage: 0,
    attackCooldownSec: 1.0,
    armor: 'infantry',
    weaponKind: 'none',
    techLevel: 5,
    isEngineer: true,
    prerequisites: ['barracks', 'radar_outpost']
  },
  commando: {
    id: 'commando',
    nameSv: 'Elitkommando (Tanya / Volkov / Ghost)',
    nameEn: 'Elite Commando Agent',
    descSv: 'Legendarisk elitsoldat. Eliminerar infanteri direkt och spränger byggnader med C4/termiska laddningar.',
    descEn: 'Legendary elite operative. Snipes infantry and demolishes structures with C4 charges.',
    category: 'infantry',
    producedAt: 'barracks',
    cost: 1200,
    buildTimeSec: 12,
    hp: 340,
    speed: 2.55,
    sightRange: 7,
    attackRange: 5.5,
    attackDamage: 125,
    attackCooldownSec: 0.9,
    armor: 'infantry',
    weaponKind: 'c4_laser',
    techLevel: 7,
    isCommando: true,
    selfHealPerSec: 4,
    prerequisites: ['barracks', 'tech_center']
  },
  harvester: {
    id: 'harvester',
    nameSv: 'Pyronite Ore Harvester',
    nameEn: 'Pyronite Ore Harvester',
    descSv: 'Tungt bepansrat skördefordon. Skördar Pyronite-malm automatiskt och kan krossa fientligt infanteri.',
    descEn: 'Heavily armored resource truck. Automatically harvests Pyronite ore and crushes enemy infantry.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 1100,
    buildTimeSec: 11,
    hp: 950,
    speed: 1.65,
    sightRange: 5,
    attackRange: 0,
    attackDamage: 0,
    attackCooldownSec: 1,
    armor: 'heavy',
    weaponKind: 'none',
    techLevel: 1,
    canCrushInfantry: true,
    isHarvester: true,
    prerequisites: ['war_factory', 'refinery']
  },
  scout_trike: {
    id: 'scout_trike',
    nameSv: 'Raider Trike / Ranger',
    nameEn: 'Raider Recon Trike',
    descSv: 'Blixtsnabbt spaningsfordon från Dune II. Perfekt för att utforska kartan och jaga infanteri.',
    descEn: 'Lightning-fast recon vehicle inspired by Dune II. Ideal for scouting and hunting infantry.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 350,
    buildTimeSec: 5,
    hp: 260,
    speed: 3.4,
    sightRange: 7.5,
    attackRange: 4.8,
    attackDamage: 24,
    attackCooldownSec: 0.75,
    armor: 'light',
    weaponKind: 'bullet',
    techLevel: 1,
    prerequisites: ['barracks']
  },
  light_tank: {
    id: 'light_tank',
    nameSv: 'Lätt Stridsvagn',
    nameEn: 'Light Combat Tank',
    descSv: 'Snabb stridsvagn med 75mm kanon. Utmärkt för flankering och eskortering av skördare.',
    descEn: 'Agile combat tank with 75mm cannon. Great for flanking maneuvers and harvester escort.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 600,
    buildTimeSec: 7,
    hp: 480,
    speed: 2.5,
    sightRange: 6,
    attackRange: 5.5,
    attackDamage: 48,
    attackCooldownSec: 1.15,
    armor: 'heavy',
    weaponKind: 'shell',
    techLevel: 3,
    canCrushInfantry: true,
    prerequisites: ['war_factory']
  },
  medium_tank: {
    id: 'medium_tank',
    nameSv: 'Medeltung Stridsvagn (Vanguard)',
    nameEn: 'Medium Battle Tank',
    descSv: 'Ryggraden i House Vanguards pansarstyrkor. Välbalanserad eldkraft, pansar och hastighet.',
    descEn: 'Backbone of House Vanguard armor. Balanced firepower, plating, and mobility.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 800,
    buildTimeSec: 9,
    hp: 680,
    speed: 2.2,
    sightRange: 6.5,
    attackRange: 6.2,
    attackDamage: 68,
    attackCooldownSec: 1.25,
    armor: 'heavy',
    weaponKind: 'shell',
    techLevel: 3,
    canCrushInfantry: true,
    factions: ['vanguard', 'nexus'],
    prerequisites: ['war_factory']
  },
  heavy_siege_tank: {
    id: 'heavy_siege_tank',
    nameSv: 'Dubbelpipig Tung Stridsvagn',
    nameEn: 'Heavy Twin-Barrel Tank',
    descSv: 'Iron Directorates fruktade stridsvagn med dubbla 105mm kanonrör.',
    descEn: 'Iron Directorate feared main battle tank with twin 105mm cannons.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 950,
    buildTimeSec: 10,
    hp: 840,
    speed: 1.9,
    sightRange: 6,
    attackRange: 6.0,
    attackDamage: 88,
    attackCooldownSec: 1.35,
    armor: 'heavy',
    weaponKind: 'shell',
    techLevel: 3,
    canCrushInfantry: true,
    factions: ['directorate'],
    prerequisites: ['war_factory']
  },
  sonic_artillery: {
    id: 'sonic_artillery',
    nameSv: 'Sonic Tank / Prisma-Artilleri',
    nameEn: 'Sonic Prism Tank',
    descSv: 'House Vanguards högteknologiska vågkanon (hyllning till Dune II Sonic Tank). Lång räckvidd och chockvågsskada.',
    descEn: 'House Vanguard high-tech wave artillery (homage to Dune II Sonic Tank). Long range shockwave damage.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 1150,
    buildTimeSec: 12,
    hp: 460,
    speed: 1.85,
    sightRange: 7.5,
    attackRange: 9.2,
    attackDamage: 96,
    attackCooldownSec: 2.1,
    armor: 'light',
    weaponKind: 'sonic',
    techLevel: 6,
    factions: ['vanguard'],
    prerequisites: ['war_factory', 'radar_outpost']
  },
  v2_launcher: {
    id: 'v2_launcher',
    nameSv: 'V2 Ballistisk Raketkastare',
    nameEn: 'V2 Rocket Launcher',
    descSv: 'Långdistans belägringsraket från Red Alert. Krossar fiendens basförsvar på säkert avstånd.',
    descEn: 'Long-range ballistic siege launcher from Red Alert. Destroys base defenses from afar.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 900,
    buildTimeSec: 10,
    hp: 360,
    speed: 1.8,
    sightRange: 7,
    attackRange: 9.8,
    attackDamage: 115,
    attackCooldownSec: 2.8,
    armor: 'light',
    weaponKind: 'rocket',
    techLevel: 4,
    factions: ['directorate', 'vanguard'],
    prerequisites: ['war_factory', 'radar_outpost']
  },
  deviator_tank: {
    id: 'deviator_tank',
    nameSv: 'Deviator Kemisk Raketvagn',
    nameEn: 'Deviator Nerve-Gas Tank',
    descSv: 'Syndicate Nexus specialvapen från Dune II. Avfyrar syntetisk nervgas som tillfälligt tar kontroll över fiendens fordon!',
    descEn: 'Syndicate Nexus signature weapon from Dune II. Fires nerve gas that temporarily mind-controls enemy vehicles!',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 1100,
    buildTimeSec: 11,
    hp: 430,
    speed: 2.15,
    sightRange: 7,
    attackRange: 8.0,
    attackDamage: 45,
    attackCooldownSec: 3.2,
    armor: 'light',
    weaponKind: 'nerve_gas',
    techLevel: 5,
    factions: ['nexus'],
    prerequisites: ['war_factory', 'radar_outpost']
  },
  stealth_tank: {
    id: 'stealth_tank',
    nameSv: 'Lazarus Stealth Tank',
    nameEn: 'Lazarus Stealth Tank',
    descSv: 'Optiskt kamouflerad raketvagn. Osynlig för fienden tills den avfyrar sina pansarvärnsmissiler.',
    descEn: 'Optically cloaked missile tank. Invisible to enemies until it fires its twin armor-piercing missiles.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 1050,
    buildTimeSec: 11,
    hp: 420,
    speed: 2.65,
    sightRange: 7,
    attackRange: 6.8,
    attackDamage: 92,
    attackCooldownSec: 1.8,
    armor: 'light',
    weaponKind: 'rocket',
    techLevel: 6,
    isCloaked: true,
    factions: ['nexus'],
    prerequisites: ['war_factory', 'tech_center']
  },
  mammoth_devastator: {
    id: 'mammoth_devastator',
    nameSv: 'Mammoth / Devastator Tank',
    nameEn: 'Mammoth Devastator Tank',
    descSv: 'Supertung fästningsvagn med dubbla 120mm kanoner, luftvärns-/infanterirobotar och självreparerande pansar.',
    descEn: 'Super-heavy fortress tank with twin 120mm cannons, auxiliary missiles, and self-repairing armor.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 1700,
    buildTimeSec: 16,
    hp: 1450,
    speed: 1.45,
    sightRange: 6.5,
    attackRange: 6.8,
    attackDamage: 140,
    attackCooldownSec: 1.5,
    armor: 'heavy',
    weaponKind: 'shell',
    techLevel: 6,
    canCrushInfantry: true,
    selfHealPerSec: 6,
    factions: ['directorate', 'vanguard'],
    prerequisites: ['war_factory', 'tech_center']
  },
  mcv: {
    id: 'mcv',
    nameSv: 'Mobilt Byggfordon (MCV)',
    nameEn: 'Mobile Construction Vehicle (MCV)',
    descSv: 'Kan köras till en ny klipplatå och vecklas ut till en ny Construction Yard (dubbelklicka eller klicka Deploy).',
    descEn: 'Deploys into a new Construction Yard on flat rock terrain.',
    category: 'vehicle',
    producedAt: 'war_factory',
    cost: 1800,
    buildTimeSec: 16,
    hp: 1200,
    speed: 1.4,
    sightRange: 5,
    attackRange: 0,
    attackDamage: 0,
    attackCooldownSec: 1,
    armor: 'heavy',
    weaponKind: 'none',
    techLevel: 7,
    canCrushInfantry: true,
    isMCV: true,
    prerequisites: ['war_factory', 'tech_center']
  }
};

export const UNIT_LIST: UnitDef[] = Object.values(UNITS);

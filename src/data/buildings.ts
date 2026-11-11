import { FactionId } from './factions';

export type BuildingId =
  | 'concrete_slab_2x2'
  | 'concrete_slab_3x3'
  | 'construction_yard'
  | 'power_plant'
  | 'refinery'
  | 'silo'
  | 'barracks'
  | 'sandbag_wall'
  | 'pillbox'
  | 'war_factory'
  | 'repair_pad'
  | 'radar_outpost'
  | 'tesla_coil'
  | 'flame_tower'
  | 'cryo_turret'
  | 'laser_turret'
  | 'tech_center'
  | 'adv_power_plant'
  | 'palace_superweapon';

export interface BuildingDef {
  id: BuildingId;
  nameSv: string;
  nameEn: string;
  descSv: string;
  descEn: string;
  cost: number;
  buildTimeSec: number;
  hp: number;
  powerDiff: number; // positive produces power, negative consumes power
  footprintW: number;
  footprintH: number;
  techLevel: number;
  isSlab?: boolean;
  isWall?: boolean;
  isDefense?: boolean;
  requiresPowerToFire?: boolean;
  attackDamage?: number;
  attackRange?: number;
  attackCooldownSec?: number;
  weaponType?: 'bullet' | 'shell' | 'tesla' | 'flame' | 'cryo' | 'laser';
  storageCapacity?: number;
  spawnsHarvester?: boolean;
  factions?: FactionId[]; // undefined = all factions
  prerequisites?: BuildingId[];
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  concrete_slab_2x2: {
    id: 'concrete_slab_2x2',
    nameSv: 'Betongplatta (2×2)',
    nameEn: 'Concrete Slab (2×2)',
    descSv: 'Dune II-fundament. Förhindrar strukturell vittring på byggnader i det karga klimatet.',
    descEn: 'Dune II foundation. Prevents structural weather decay on buildings placed atop.',
    cost: 40,
    buildTimeSec: 2,
    hp: 400,
    powerDiff: 0,
    footprintW: 2,
    footprintH: 2,
    techLevel: 1,
    isSlab: true
  },
  concrete_slab_3x3: {
    id: 'concrete_slab_3x3',
    nameSv: 'Betongplatta (3×3)',
    nameEn: 'Concrete Slab (3×3)',
    descSv: 'Stort armerat betongfundament för fabriker, raffinaderier och högkvarter.',
    descEn: 'Large reinforced concrete foundation for factories, refineries, and headquarters.',
    cost: 80,
    buildTimeSec: 3,
    hp: 600,
    powerDiff: 0,
    footprintW: 3,
    footprintH: 3,
    techLevel: 1,
    isSlab: true
  },
  construction_yard: {
    id: 'construction_yard',
    nameSv: 'Byggcentral (ConYard)',
    nameEn: 'Construction Yard',
    descSv: 'Basens hjärta. Konstruerar betongplattor, basbyggnader och försvarsverk.',
    descEn: 'Heart of the base. Manufactures concrete slabs, structures, and base defenses.',
    cost: 2000,
    buildTimeSec: 18,
    hp: 2200,
    powerDiff: 25,
    footprintW: 3,
    footprintH: 3,
    techLevel: 1
  },
  power_plant: {
    id: 'power_plant',
    nameSv: 'Kraftverk (Wind/Turbine)',
    nameEn: 'Power Plant',
    descSv: 'Alstrar +100 energi till basens fabriker, radar och energitorn.',
    descEn: 'Generates +100 power for base factories, radar, and energy turrets.',
    cost: 300,
    buildTimeSec: 6,
    hp: 750,
    powerDiff: 100,
    footprintW: 2,
    footprintH: 2,
    techLevel: 1,
    prerequisites: ['construction_yard']
  },
  refinery: {
    id: 'refinery',
    nameSv: 'Pyronite-Raffinaderi',
    nameEn: 'Pyronite Ore Refinery',
    descSv: 'Bearbetar skördad malm till krediter. Levereras med 1 gratis Ore Harvester.',
    descEn: 'Processes harvested ore into credits. Includes 1 free Ore Harvester.',
    cost: 1400,
    buildTimeSec: 14,
    hp: 1300,
    powerDiff: -35,
    footprintW: 3,
    footprintH: 3,
    techLevel: 1,
    storageCapacity: 2000,
    spawnsHarvester: true,
    prerequisites: ['power_plant']
  },
  silo: {
    id: 'silo',
    nameSv: 'Malmsilo',
    nameEn: 'Ore Silo',
    descSv: 'Lagrar +1500 extra Pyronite-krediter och genererar ränta på lagrad malm.',
    descEn: 'Stores +1500 additional Pyronite credits and yields passive storage efficiency.',
    cost: 200,
    buildTimeSec: 4,
    hp: 450,
    powerDiff: -10,
    footprintW: 2,
    footprintH: 2,
    techLevel: 2,
    storageCapacity: 1500,
    prerequisites: ['refinery']
  },
  barracks: {
    id: 'barracks',
    nameSv: 'Infanterikasern',
    nameEn: 'Barracks',
    descSv: 'Utbildar infanteri, raketsoldater, ingenjörer och kommandosoldater.',
    descEn: 'Trains infantry, rocket troopers, combat engineers, and commandos.',
    cost: 400,
    buildTimeSec: 7,
    hp: 850,
    powerDiff: -20,
    footprintW: 2,
    footprintH: 2,
    techLevel: 1,
    prerequisites: ['power_plant']
  },
  sandbag_wall: {
    id: 'sandbag_wall',
    nameSv: 'Pansarbarriär',
    nameEn: 'Fortified Barrier',
    descSv: 'Billig försvarsmur som stoppar fientliga markfordon och skyddar mot Sandworms.',
    descEn: 'Low-cost fortification wall that blocks enemy ground vehicles and deters Sandworms.',
    cost: 50,
    buildTimeSec: 1.5,
    hp: 350,
    powerDiff: 0,
    footprintW: 1,
    footprintH: 1,
    techLevel: 2,
    isWall: true,
    prerequisites: ['barracks']
  },
  pillbox: {
    id: 'pillbox',
    nameSv: 'ulsprutebunker (Pillbox)',
    nameEn: 'Autocannon Pillbox',
    descSv: 'Pansrad bunker med automatkanon. Kräver ingen el och mejar ner infanteri och lätta fordon.',
    descEn: 'Armored bunker with twin autocannons. Operates offline without grid power.',
    cost: 450,
    buildTimeSec: 7,
    hp: 900,
    powerDiff: -10,
    footprintW: 1,
    footprintH: 1,
    techLevel: 2,
    isDefense: true,
    requiresPowerToFire: false,
    attackDamage: 26,
    attackRange: 6.5,
    attackCooldownSec: 0.75,
    weaponType: 'bullet',
    prerequisites: ['barracks']
  },
  war_factory: {
    id: 'war_factory',
    nameSv: 'Pansarfabrik (War Factory)',
    nameEn: 'War Factory',
    descSv: 'Bygger stridsvagnar, artilleri, Ore Harvesters och tunga belägringsfordon.',
    descEn: 'Manufactures battle tanks, artillery, Ore Harvesters, and heavy siege vehicles.',
    cost: 1600,
    buildTimeSec: 15,
    hp: 1600,
    powerDiff: -45,
    footprintW: 3,
    footprintH: 3,
    techLevel: 3,
    prerequisites: ['refinery']
  },
  repair_pad: {
    id: 'repair_pad',
    nameSv: 'Reparationsplatta',
    nameEn: 'Service & Repair Depot',
    descSv: 'Reparerar automatiskt skadade stridsvagnar och skördare i närheten.',
    descEn: 'Automatically repairs damaged allied vehicles and harvesters in proximity.',
    cost: 700,
    buildTimeSec: 10,
    hp: 1000,
    powerDiff: -25,
    footprintW: 2,
    footprintH: 2,
    techLevel: 3,
    prerequisites: ['war_factory']
  },
  radar_outpost: {
    id: 'radar_outpost',
    nameSv: 'Radarstation',
    nameEn: 'Radar Outpost',
    descSv: 'Aktiverar den taktiska minikartan (kräver tillräckligt med el) och låser upp avancerade enheter.',
    descEn: 'Activates tactical minimap (requires positive power) and unlocks mid-tier units.',
    cost: 900,
    buildTimeSec: 11,
    hp: 1050,
    powerDiff: -50,
    footprintW: 2,
    footprintH: 2,
    techLevel: 4,
    prerequisites: ['refinery']
  },
  cryo_turret: {
    id: 'cryo_turret',
    nameSv: 'Kryo-Prisma Torn',
    nameEn: 'Cryo-Prism Tower',
    descSv: 'House Vanguards energitorn. Skjuter fokuserad kryo-/prismastråle som saktar ner fiender.',
    descEn: 'House Vanguard energy turret. Fires a focused cryo-prism beam that slows targets.',
    cost: 950,
    buildTimeSec: 10,
    hp: 1050,
    powerDiff: -55,
    footprintW: 1,
    footprintH: 1,
    techLevel: 5,
    isDefense: true,
    requiresPowerToFire: true,
    attackDamage: 75,
    attackRange: 8.5,
    attackCooldownSec: 1.5,
    weaponType: 'cryo',
    factions: ['vanguard'],
    prerequisites: ['radar_outpost']
  },
  flame_tower: {
    id: 'flame_tower',
    nameSv: 'Eldkastartorn',
    nameEn: 'Heavy Flame Tower',
    descSv: 'Iron Directorates närstridsförsvar. Bränner ner infanteri och lätta fordon i en eldkvast.',
    descEn: 'Iron Directorate defense turret. Incinerates infantry and light armor with napalm.',
    cost: 700,
    buildTimeSec: 8,
    hp: 1100,
    powerDiff: -25,
    footprintW: 1,
    footprintH: 1,
    techLevel: 4,
    isDefense: true,
    requiresPowerToFire: false,
    attackDamage: 62,
    attackRange: 5.8,
    attackCooldownSec: 1.1,
    weaponType: 'flame',
    factions: ['directorate'],
    prerequisites: ['radar_outpost']
  },
  tesla_coil: {
    id: 'tesla_coil',
    nameSv: 'Tesla-Spole (Tesla Coil)',
    nameEn: 'Tesla Coil',
    descSv: 'Ikoniskt högspänningstorn från Red Alert. Förintar pansar med blixturladdningar (kräver el).',
    descEn: 'Iconic high-voltage turret. Obliterates heavy armor with lightning arcs (requires power).',
    cost: 1200,
    buildTimeSec: 12,
    hp: 1150,
    powerDiff: -75,
    footprintW: 1,
    footprintH: 1,
    techLevel: 5,
    isDefense: true,
    requiresPowerToFire: true,
    attackDamage: 145,
    attackRange: 8.2,
    attackCooldownSec: 2.1,
    weaponType: 'tesla',
    factions: ['directorate'],
    prerequisites: ['radar_outpost']
  },
  laser_turret: {
    id: 'laser_turret',
    nameSv: 'Obelisk Laser Turret',
    nameEn: 'Nexus Laser Turret',
    descSv: 'Syndicate Nexus precisionslaser. Skär genom pansar med omedelbar ljusstråle (kräver el).',
    descEn: 'Syndicate Nexus precision laser turret. Slices through armor with instant beams (requires power).',
    cost: 1050,
    buildTimeSec: 10,
    hp: 980,
    powerDiff: -65,
    footprintW: 1,
    footprintH: 1,
    techLevel: 5,
    isDefense: true,
    requiresPowerToFire: true,
    attackDamage: 110,
    attackRange: 8.8,
    attackCooldownSec: 1.7,
    weaponType: 'laser',
    factions: ['nexus'],
    prerequisites: ['radar_outpost']
  },
  tech_center: {
    id: 'tech_center',
    nameSv: 'Högteknologiskt Labb',
    nameEn: 'High-Tech Research Center',
    descSv: 'Låser upp fraktionens tyngsta stridsvagnar, elitkommandosoldater och supervapen.',
    descEn: 'Unlocks top-tier battle tanks, elite commandos, and orbital/nuclear superweapons.',
    cost: 1500,
    buildTimeSec: 15,
    hp: 1300,
    powerDiff: -70,
    footprintW: 2,
    footprintH: 2,
    techLevel: 6,
    prerequisites: ['radar_outpost', 'war_factory']
  },
  adv_power_plant: {
    id: 'adv_power_plant',
    nameSv: 'Fusionskraftverk',
    nameEn: 'Advanced Fusion Plant',
    descSv: 'Högkapacitetsreaktor som levererar +250 energi till Tesla-spolar och supervapen.',
    descEn: 'High-output fusion reactor providing +250 power for energy defenses and superweapons.',
    cost: 650,
    buildTimeSec: 9,
    hp: 1100,
    powerDiff: 250,
    footprintW: 2,
    footprintH: 2,
    techLevel: 6,
    prerequisites: ['tech_center']
  },
  palace_superweapon: {
    id: 'palace_superweapon',
    nameSv: 'Högkvarter & Supervapen-Uplink',
    nameEn: 'Command Palace & Superweapon',
    descSv: 'Laddar husets strategiska Supervapen (Ion Cannon / Tactical Nuke / EMP Chaos Pulse).',
    descEn: 'Charges the faction strategic Superweapon (Ion Cannon / Tactical Nuke / EMP Chaos Pulse).',
    cost: 2400,
    buildTimeSec: 20,
    hp: 2000,
    powerDiff: -100,
    footprintW: 3,
    footprintH: 3,
    techLevel: 8,
    prerequisites: ['tech_center']
  }
};

export const BUILDING_LIST: BuildingDef[] = Object.values(BUILDINGS);

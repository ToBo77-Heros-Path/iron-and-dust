import { FactionId, FACTIONS } from './factions';
import { UnitId } from './units';
import { BuildingId } from './buildings';

export type BiomeType = 'desert' | 'tundra';
export type MissionType = 'harvest_quota' | 'annihilate' | 'commando_raid' | 'hold_out' | 'final_conquest';

export interface StartingUnitSpec {
  unitId: UnitId;
  dx: number;
  dy: number;
}

export interface StartingBuildingSpec {
  buildingId: BuildingId;
  dx: number;
  dy: number;
  withSlab?: boolean;
}

export interface MissionDef {
  id: string;
  faction: FactionId;
  sectorIndex: number; // 1..9
  sectorCode: string;
  techLevel: number; // 1..9
  biome: BiomeType;
  missionType: MissionType;
  enemyFaction: FactionId;
  secondaryEnemyFaction?: FactionId;
  titleSv: string;
  titleEn: string;
  regionNameSv: string;
  regionNameEn: string;
  briefingSv: string;
  briefingEn: string;
  objectiveSv: string;
  objectiveEn: string;
  cutsceneIntroSv: string;
  cutsceneIntroEn: string;
  mapSeed: number;
  mapSize: number;
  startingCredits: number;
  enemyStartingCredits: number;
  targetCreditsQuota?: number;
  holdOutSeconds?: number;
  wormActivity: number; // 0 = none, 1 = normal, 2 = intense
  ionStormActivity: number; // 0 = none, 1 = normal, 2 = intense
  playerStartBuildings: StartingBuildingSpec[];
  playerStartUnits: StartingUnitSpec[];
  enemyStartBuildings: StartingBuildingSpec[];
  enemyStartUnits: StartingUnitSpec[];
  sectorPolygon: { x: number; y: number }[]; // Normalized 0..100 coords on planet map
}

const SECTOR_POLYGONS: { x: number; y: number }[][] = [
  // Sector 1: South-West Landing Rim
  [{ x: 8, y: 65 }, { x: 28, y: 60 }, { x: 30, y: 84 }, { x: 10, y: 88 }],
  // Sector 2: Southern Pyronite Basin
  [{ x: 28, y: 60 }, { x: 52, y: 62 }, { x: 50, y: 88 }, { x: 30, y: 84 }],
  // Sector 3: South-East Cryo Pass
  [{ x: 52, y: 62 }, { x: 78, y: 58 }, { x: 86, y: 84 }, { x: 50, y: 88 }],
  // Sector 4: Western Dune Escarpment
  [{ x: 10, y: 36 }, { x: 35, y: 35 }, { x: 28, y: 60 }, { x: 8, y: 65 }],
  // Sector 5: Central Meridian Ridge
  [{ x: 35, y: 35 }, { x: 64, y: 36 }, { x: 52, y: 62 }, { x: 28, y: 60 }],
  // Sector 6: Eastern Glacier Outpost
  [{ x: 64, y: 36 }, { x: 90, y: 34 }, { x: 78, y: 58 }, { x: 52, y: 62 }],
  // Sector 7: North-West Deep Erg (Worm Territory)
  [{ x: 14, y: 12 }, { x: 42, y: 12 }, { x: 35, y: 35 }, { x: 10, y: 36 }],
  // Sector 8: Northern Polar Fortress
  [{ x: 42, y: 12 }, { x: 68, y: 12 }, { x: 64, y: 36 }, { x: 35, y: 35 }],
  // Sector 9: Imperial Core Citadel
  [{ x: 68, y: 12 }, { x: 92, y: 14 }, { x: 90, y: 34 }, { x: 64, y: 36 }]
];

interface SectorBlueprint {
  sectorIndex: number;
  sectorCode: string;
  techLevel: number;
  biome: BiomeType;
  missionType: MissionType;
  regionNameSv: string;
  regionNameEn: string;
  titleTemplateSv: string;
  titleTemplateEn: string;
  briefingTemplateSv: string;
  briefingTemplateEn: string;
  objectiveSv: string;
  objectiveEn: string;
  cutsceneSv: string;
  cutsceneEn: string;
  startingCredits: number;
  enemyCredits: number;
  targetCreditsQuota?: number;
  wormActivity: number;
  ionStormActivity: number;
}

const SECTOR_BLUEPRINTS: SectorBlueprint[] = [
  {
    sectorIndex: 1,
    sectorCode: 'SEC-01 // ARRAK-RIM',
    techLevel: 1,
    biome: 'desert',
    missionType: 'harvest_quota',
    regionNameSv: 'Sektor 1: Södra Ökenranden',
    regionNameEn: 'Sector 1: Southern Desert Rim',
    titleTemplateSv: 'Operation Röd Gryning',
    titleTemplateEn: 'Operation Crimson Dawn',
    briefingTemplateSv:
      'Befälhavare! {FACTION} har etablerat vårt första brohuvud på Kryos-IV. Lägg ut betongplattor på klipplatån, bygg ett Pyronite-Raffinaderi för att få ut vår första skördare, och skörda minst 1 500 krediter i malm (eller slå ut {ENEMY}s patrullstyrka).',
    briefingTemplateEn:
      'Commander! {FACTION} has established our beachhead on Kryos-IV. Lay Concrete Slabs on the rock plateau, build an Ore Refinery to deploy our first Harvester, and harvest 1,500 credits of Pyronite ore (or wipe out the {ENEMY} patrol).',
    objectiveSv: 'Skörda 1 500 krediter Pyronite-malm ELLER slå ut samtliga fientliga styrkor.',
    objectiveEn: 'Harvest 1,500 credits of Pyronite ore OR destroy all enemy forces in the sector.',
    cutsceneSv: 'Landsättningsfarkosterna fäller ut byggkranarna i den glödande öknen medan malmfälten glittrar vid horisonten...',
    cutsceneEn: 'Drop-ships deploy construction cranes across the scorching dunes as Pyronite veins shimmer on the horizon...',
    startingCredits: 2000,
    enemyCredits: 1000,
    targetCreditsQuota: 1500,
    wormActivity: 1,
    ionStormActivity: 0
  },
  {
    sectorIndex: 2,
    sectorCode: 'SEC-02 // PYRO-BASIN',
    techLevel: 2,
    biome: 'desert',
    missionType: 'annihilate',
    regionNameSv: 'Sektor 2: Pyronite-Sänkan',
    regionNameEn: 'Sector 2: Pyronite Basin',
    titleTemplateSv: 'Pansar & Bunkrar',
    titleTemplateEn: 'Bunkers & Bazookas',
    briefingTemplateSv:
      '{ENEMY} försöker skära av våra skörderutter i Pyronite-sänkan. Vi har nu låst upp Raketsoldater (Bazooka), Malmsilos och Kulsprutebunkrar (Pillbox). Säkra malmfältet och jämna fiendens utpost med marken!',
    briefingTemplateEn:
      '{ENEMY} is attempting to sever our harvesting routes in the Pyronite Basin. Rocket Troopers, Ore Silos, and Autocannon Pillboxes are now unlocked. Secure the ore field and raze the enemy outpost!',
    objectiveSv: 'Förstör samtliga av {ENEMY}s byggnader och stridsenheter.',
    objectiveEn: 'Destroy all {ENEMY} structures and combat units.',
    cutsceneSv: 'Konvojer av Ore Harvesters rullar ut under beskydd av pansarbunkrar medan fiendens spaningsfordon närmar sig...',
    cutsceneEn: 'Convoys of Ore Harvesters roll out under Pillbox cover as enemy recon trikes approach through the haze...',
    startingCredits: 2500,
    enemyCredits: 1500,
    wormActivity: 1,
    ionStormActivity: 0
  },
  {
    sectorIndex: 3,
    sectorCode: 'SEC-03 // CRYO-PASS',
    techLevel: 3,
    biome: 'tundra',
    missionType: 'annihilate',
    regionNameSv: 'Sektor 3: Frusna Kryopasset',
    regionNameEn: 'Sector 3: Frozen Cryo Pass',
    titleTemplateSv: 'Stål i Kölden',
    titleTemplateEn: 'Steel in the Frost',
    briefingTemplateSv:
      'Striderna flyttar in i tundrazonen. Här kan vi nu uppföra vår Pansarfabrik (War Factory) och rulla ut stridsvagnar och Reparationsplattor. Se upp för magnetiska jonstormar i passet och krossa {ENEMY}s pansarbrigad!',
    briefingTemplateEn:
      'Combat moves into the frozen tundra. You are now cleared to construct the War Factory, Battle Tanks, and Repair Depots. Watch for magnetic ion storms in the pass and crush the {ENEMY} armored brigade!',
    objectiveSv: 'Bygg en Pansarfabrik och eliminera {ENEMY}s bas i tundrapasset.',
    objectiveEn: 'Build a War Factory and eliminate the {ENEMY} base in the tundra pass.',
    cutsceneSv: 'Strålkastarna från nybyggda stridsvagnar skär genom snöstormen när pansarfabriken öppnar sina portar...',
    cutsceneEn: 'Headlights from newly minted battle tanks pierce the blizzard as the War Factory doors rumble open...',
    startingCredits: 3000,
    enemyCredits: 2000,
    wormActivity: 0,
    ionStormActivity: 1
  },
  {
    sectorIndex: 4,
    sectorCode: 'SEC-04 // DUNE-RIDGE',
    techLevel: 4,
    biome: 'desert',
    missionType: 'annihilate',
    regionNameSv: 'Sektor 4: Västra Klippplatån',
    regionNameEn: 'Sector 4: Western Escarpment',
    titleTemplateSv: 'Radar & Belägring',
    titleTemplateEn: 'Radar & Long-Range Siege',
    briefingTemplateSv:
      'Med Radarstationen (Radar Outpost) tillgänglig får vi full taktisk översikt och tillgång till långdistansartilleri. Men var på din vakt: intensiva Sandworm-vibrationer har rapporterats i den djupa sanden mellan baserna.',
    briefingTemplateEn:
      'With the Radar Outpost available, you gain full tactical minimap telemetry and long-range siege weapons. Stay alert: heavy Sandworm vibrations have been reported in the deep sand between bases.',
    objectiveSv: 'Upprätta radarövervakning och slå ut {ENEMY}s befästa klippbas.',
    objectiveEn: 'Establish radar telemetry and destroy the fortified {ENEMY} cliff base.',
    cutsceneSv: 'Radardomen snurrar igång medan artilleripjäser tar sikte mot fiendens bas över den förrädiska sandslätten...',
    cutsceneEn: 'The radar dome spins online while siege launchers calibrate coordinates across the worm-infested dunes...',
    startingCredits: 3500,
    enemyCredits: 2400,
    wormActivity: 2,
    ionStormActivity: 0
  },
  {
    sectorIndex: 5,
    sectorCode: 'SEC-05 // MERIDIAN',
    techLevel: 5,
    biome: 'tundra',
    missionType: 'annihilate',
    regionNameSv: 'Sektor 5: Centralsektorns Meridian',
    regionNameEn: 'Sector 5: Central Meridian Ridge',
    titleTemplateSv: 'Högspänning & Ingenjörskonst',
    titleTemplateEn: 'High Voltage & Engineering',
    briefingTemplateSv:
      'Centralsektorn är nyckeln till Kryos-IV. Tech Level 5 låser upp Stridsingenjörer (som kan ta över fiendens byggnader!) samt våra tunga energiförsvarstorn (Tesla Coil / Kryo-Prisma / Obelisk Laser). Håll energibalansen positiv!',
    briefingTemplateEn:
      'The Central Meridian is the key to Kryos-IV. Tech Level 5 unlocks Combat Engineers (capable of capturing enemy structures!) and heavy energy defenses (Tesla Coil / Cryo-Prism / Laser Turret). Keep your grid power positive!',
    objectiveSv: 'Erövra eller förstör {ENEMY}s centrala kommandokomplex.',
    objectiveEn: 'Capture or destroy the {ENEMY} central command complex.',
    cutsceneSv: 'Blixtrande energitorn lyser upp polarnatten medan ingenjörstrupper infiltrerar fiendens försvarslinje...',
    cutsceneEn: 'Crackling energy turrets illuminate the polar night as combat engineers infiltrate the enemy perimeter...',
    startingCredits: 4000,
    enemyCredits: 2800,
    wormActivity: 0,
    ionStormActivity: 1
  },
  {
    sectorIndex: 6,
    sectorCode: 'SEC-06 // GLACIER-6',
    techLevel: 6,
    biome: 'tundra',
    missionType: 'annihilate',
    regionNameSv: 'Sektor 6: Östra Glaciärfästningen',
    regionNameEn: 'Sector 6: Eastern Glacier Fortress',
    titleTemplateSv: 'Högteknologiskt Genombrott',
    titleTemplateEn: 'High-Tech Breakthrough',
    briefingTemplateSv:
      'Vi har nu tillstånd att uppföra Högteknologiskt Labb (Tech Center) och Fusionskraftverk. Detta låser upp våra tyngsta vapen: Mammoth Devastator, Sonic Prism Tank och kamouflerade Stealth Tanks!',
    briefingTemplateEn:
      'You are now authorized to build the High-Tech Research Center and Fusion Power Plants, unlocking our deadliest armor: Mammoth Devastators, Sonic Prism Tanks, and cloaked Stealth Tanks!',
    objectiveSv: 'Bygg Tech Center och krossa {ENEMY}s tungt befästa glaciärfästning.',
    objectiveEn: 'Construct a Tech Center and crush the heavily fortified {ENEMY} glacier stronghold.',
    cutsceneSv: 'Supertunga stridsvagnar rullar ut på den frusna tundran medan jonstormar rasar i skyn...',
    cutsceneEn: 'Super-heavy tanks roll across the frozen tundra as magnetic ion lightning arcs across the sky...',
    startingCredits: 4500,
    enemyCredits: 3200,
    wormActivity: 0,
    ionStormActivity: 2
  },
  {
    sectorIndex: 7,
    sectorCode: 'SEC-07 // BLACK-ERG',
    techLevel: 7,
    biome: 'desert',
    missionType: 'commando_raid',
    regionNameSv: 'Sektor 7: Nordvästra Djupöknen',
    regionNameEn: 'Sector 7: North-West Deep Erg',
    titleTemplateSv: 'Operation Skuggstöt (Kommandoräd & MCV)',
    titleTemplateEn: 'Operation Shadow Strike (Commando & MCV)',
    briefingTemplateSv:
      'Specialuppdrag inspirerat av Red Alert! Du startar utan färdig bas – endast med en Elitkommando (med C4-sprängladdningar), en eskortstyrka och ett Mobilt Byggfordon (MCV). Röj fiendens förpost, veckla ut din MCV på klipplatån och ta över sektorn!',
    briefingTemplateEn:
      'Special Red Alert style operation! You begin without a deployed base—only an Elite Commando, an escort squad, and a Mobile Construction Vehicle (MCV). Clear the forward outpost, deploy your MCV on flat rock, and conquer the sector!',
    objectiveSv: 'Veckla ut din MCV till en bas och förstör {ENEMY}s samtliga strukturer.',
    objectiveEn: 'Deploy your MCV into a base and destroy all {ENEMY} structures.',
    cutsceneSv: 'En ensam Elitkommando smyger fram längs klippkanten följd av en tungt bepansrad MCV-kolonn...',
    cutsceneEn: 'A lone Elite Commando advances along the canyon rim, followed closely by an armored MCV convoy...',
    startingCredits: 5000,
    enemyCredits: 3500,
    wormActivity: 2,
    ionStormActivity: 0
  },
  {
    sectorIndex: 8,
    sectorCode: 'SEC-08 // POLAR-SILO',
    techLevel: 8,
    biome: 'tundra',
    missionType: 'annihilate',
    regionNameSv: 'Sektor 8: Nordpolens Silokomplex',
    regionNameEn: 'Sector 8: Northern Polar Silo Complex',
    titleTemplateSv: 'Domedagsklockan (Supervapen)',
    titleTemplateEn: 'Doomsday Clock (Superweapons)',
    briefingTemplateSv:
      'Tech Level 8! Både vi och {ENEMY} har nu tillgång till Högkvarter & Supervapen-Uplink (Orbital Ion Cannon, Tactical Nuke Silo eller EMP Chaos Pulse). Bygg ditt Supervapen snabbt och slå till innan fienden utplånar din bas!',
    briefingTemplateEn:
      'Tech Level 8! Both our forces and {ENEMY} now have access to Command Palace Superweapons (Ion Cannon, Tactical Nuke, or EMP Chaos Pulse). Construct your Superweapon and strike before the enemy annihilates your base!',
    objectiveSv: 'Uppför Supervapen-palatset och förinta {ENEMY}s polarbas.',
    objectiveEn: 'Construct the Command Palace Superweapon and obliterate the {ENEMY} polar base.',
    cutsceneSv: 'Siloluckorna öppnas i isen och varningssirenerna tjuter över hela den norra sektorn...',
    cutsceneEn: 'Silo hatches retract through the glacier ice as nuclear and orbital warning sirens wail across the sector...',
    startingCredits: 5500,
    enemyCredits: 4000,
    wormActivity: 0,
    ionStormActivity: 2
  },
  {
    sectorIndex: 9,
    sectorCode: 'SEC-09 // IMPERIAL-CORE',
    techLevel: 9,
    biome: 'desert',
    missionType: 'final_conquest',
    regionNameSv: 'Sektor 9: Kejsarcitadellet (Slutstrid)',
    regionNameEn: 'Sector 9: Imperial Core Citadel (Final Battle)',
    titleTemplateSv: 'Slaget om Kryos-IV',
    titleTemplateEn: 'Final Battle for Kryos-IV',
    briefingTemplateSv:
      'Det avgörande slaget! Alla 9 tekniknivåer är upplåsta. Båda våra rivaliserande hus har befäst Kejsarcitadellet i den rikaste Pyronite-kratern på planeten. Använd hela din arsenal, dina kommandosoldater och ditt Supervapen för att säkra total seger för {FACTION}!',
    briefingTemplateEn:
      'The final reckoning! All 9 Tech Levels are unlocked. Both rival houses have fortified the Imperial Citadel in the richest Pyronite crater on the planet. Unleash your full arsenal and Superweapon to claim total victory for {FACTION}!',
    objectiveSv: 'Total dominans: Förinta samtliga fientliga baser och enheter i Kejsarcitadellet.',
    objectiveEn: 'Total dominance: Obliterate all rival bases and forces in the Imperial Citadel.',
    cutsceneSv: 'Hela horisonten brinner av raketeld, jonstrålar och mullrande pansardivisioner i slutstriden om Kryos-IV!',
    cutsceneEn: 'The entire horizon blazes with rocket barrages, orbital beams, and rumbling tank divisions in the final battle for Kryos-IV!',
    startingCredits: 6500,
    enemyCredits: 4800,
    wormActivity: 2,
    ionStormActivity: 1
  }
];

function getRivals(faction: FactionId): [FactionId, FactionId] {
  if (faction === 'vanguard') return ['directorate', 'nexus'];
  if (faction === 'directorate') return ['vanguard', 'nexus'];
  return ['vanguard', 'directorate'];
}

export function buildAllCampaignMissions(): Record<FactionId, MissionDef[]> {
  const result: Record<FactionId, MissionDef[]> = {
    vanguard: [],
    directorate: [],
    nexus: []
  };

  const factions: FactionId[] = ['vanguard', 'directorate', 'nexus'];

  for (const faction of factions) {
    const facDef = FACTIONS[faction];
    const [rivalA, rivalB] = getRivals(faction);

    result[faction] = SECTOR_BLUEPRINTS.map((bp, idx) => {
      const enemyFaction = idx % 2 === 0 ? rivalA : rivalB;
      const enemyDef = FACTIONS[enemyFaction];
      const replaceVars = (str: string) =>
        str.replace(/\{FACTION\}/g, facDef.name).replace(/\{ENEMY\}/g, enemyDef.name);

      const isCommandoMission = bp.missionType === 'commando_raid';

      const playerStartBuildings: StartingBuildingSpec[] = isCommandoMission
        ? []
        : [
            { buildingId: 'construction_yard', dx: 0, dy: 0, withSlab: true },
            { buildingId: 'power_plant', dx: 4, dy: 0, withSlab: true },
            ...(bp.techLevel >= 3
              ? [{ buildingId: 'refinery' as BuildingId, dx: 0, dy: 4, withSlab: true }]
              : [])
          ];

      const playerStartUnits: StartingUnitSpec[] = isCommandoMission
        ? [
            { unitId: 'commando', dx: 0, dy: 0 },
            { unitId: 'mcv', dx: 2, dy: 1 },
            { unitId: 'medium_tank', dx: 3, dy: -1 },
            { unitId: 'light_tank', dx: 1, dy: 2 },
            { unitId: 'rocket_trooper', dx: -1, dy: 1 },
            { unitId: 'rocket_trooper', dx: -1, dy: 2 }
          ]
        : [
            { unitId: 'scout_trike', dx: 4, dy: 4 },
            { unitId: 'light_infantry', dx: 2, dy: 4 },
            { unitId: 'light_infantry', dx: 3, dy: 4 },
            { unitId: 'rocket_trooper', dx: 4, dy: 2 },
            ...(bp.techLevel >= 2 ? [{ unitId: 'light_tank' as UnitId, dx: 5, dy: 3 }] : []),
            ...(bp.techLevel >= 4 ? [{ unitId: 'medium_tank' as UnitId, dx: 6, dy: 2 }] : [])
          ];

      const enemyStartBuildings: StartingBuildingSpec[] = [
        { buildingId: 'construction_yard', dx: 0, dy: 0, withSlab: true },
        { buildingId: 'power_plant', dx: -4, dy: 0, withSlab: true },
        { buildingId: 'refinery', dx: 0, dy: -4, withSlab: true },
        { buildingId: 'barracks', dx: -4, dy: -3, withSlab: true },
        ...(bp.techLevel >= 2
          ? [
              { buildingId: 'pillbox' as BuildingId, dx: -5, dy: 2, withSlab: false },
              { buildingId: 'pillbox' as BuildingId, dx: 2, dy: -5, withSlab: false }
            ]
          : []),
        ...(bp.techLevel >= 3
          ? [{ buildingId: 'war_factory' as BuildingId, dx: -5, dy: -6, withSlab: true }]
          : []),
        ...(bp.techLevel >= 4
          ? [{ buildingId: 'radar_outpost' as BuildingId, dx: 3, dy: -3, withSlab: true }]
          : []),
        ...(bp.techLevel >= 5
          ? [
              {
                buildingId: (enemyFaction === 'directorate'
                  ? 'tesla_coil'
                  : enemyFaction === 'vanguard'
                  ? 'cryo_turret'
                  : 'laser_turret') as BuildingId,
                dx: -6,
                dy: -1,
                withSlab: false
              }
            ]
          : []),
        ...(bp.techLevel >= 6
          ? [
              { buildingId: 'tech_center' as BuildingId, dx: 3, dy: 0, withSlab: true },
              { buildingId: 'adv_power_plant' as BuildingId, dx: 3, dy: 3, withSlab: true }
            ]
          : []),
        ...(bp.techLevel >= 8
          ? [{ buildingId: 'palace_superweapon' as BuildingId, dx: -3, dy: 3, withSlab: true }]
          : [])
      ];

      const enemyStartUnits: StartingUnitSpec[] = [
        { unitId: 'harvester', dx: -2, dy: -5 },
        { unitId: 'light_infantry', dx: -3, dy: 2 },
        { unitId: 'light_infantry', dx: -2, dy: 2 },
        ...(bp.techLevel >= 2 ? [{ unitId: 'rocket_trooper' as UnitId, dx: -4, dy: 2 }] : []),
        ...(bp.techLevel >= 3 ? [{ unitId: 'light_tank' as UnitId, dx: -5, dy: -2 }] : []),
        ...(bp.techLevel >= 4
          ? [
              {
                unitId: (enemyFaction === 'directorate' ? 'heavy_siege_tank' : 'medium_tank') as UnitId,
                dx: -6,
                dy: -3
              }
            ]
          : []),
        ...(bp.techLevel >= 6
          ? [
              {
                unitId: (enemyFaction === 'nexus' ? 'stealth_tank' : 'mammoth_devastator') as UnitId,
                dx: -4,
                dy: -4
              }
            ]
          : [])
      ];

      return {
        id: `${faction}_m${bp.sectorIndex}`,
        faction,
        sectorIndex: bp.sectorIndex,
        sectorCode: bp.sectorCode,
        techLevel: bp.techLevel,
        biome: bp.biome,
        missionType: bp.missionType,
        enemyFaction,
        secondaryEnemyFaction: bp.sectorIndex === 9 ? rivalB : undefined,
        titleSv: `${bp.sectorIndex}. ${bp.titleTemplateSv}`,
        titleEn: `${bp.sectorIndex}. ${bp.titleTemplateEn}`,
        regionNameSv: bp.regionNameSv,
        regionNameEn: bp.regionNameEn,
        briefingSv: replaceVars(bp.briefingTemplateSv),
        briefingEn: replaceVars(bp.briefingTemplateEn),
        objectiveSv: replaceVars(bp.objectiveSv),
        objectiveEn: replaceVars(bp.objectiveEn),
        cutsceneIntroSv: replaceVars(bp.cutsceneSv),
        cutsceneIntroEn: replaceVars(bp.cutsceneEn),
        mapSeed: (faction.charCodeAt(0) * 100) + bp.sectorIndex * 37,
        mapSize: 56,
        startingCredits: bp.startingCredits,
        enemyStartingCredits: bp.enemyCredits,
        targetCreditsQuota: bp.targetCreditsQuota,
        wormActivity: bp.wormActivity,
        ionStormActivity: bp.ionStormActivity,
        playerStartBuildings,
        playerStartUnits,
        enemyStartBuildings,
        enemyStartUnits,
        sectorPolygon: SECTOR_POLYGONS[idx]
      };
    });
  }

  return result;
}

export const CAMPAIGNS = buildAllCampaignMissions();

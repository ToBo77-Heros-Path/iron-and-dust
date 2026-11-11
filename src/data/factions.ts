export type FactionId = 'vanguard' | 'directorate' | 'nexus';

export interface FactionDef {
  id: FactionId;
  name: string;
  shortName: string;
  mottoSv: string;
  mottoEn: string;
  descSv: string;
  descEn: string;
  mentatName: string;
  mentatTitleSv: string;
  mentatTitleEn: string;
  primaryColor: string;
  secondaryColor: string;
  accentHex: number;
  darkHex: number;
  emissiveHex: number;
  speedBonus: number;
  armorBonus: number;
  firepowerBonus: number;
  superweaponId: 'ion_cannon' | 'nuke_silo' | 'emp_pulse';
  superweaponNameSv: string;
  superweaponNameEn: string;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  vanguard: {
    id: 'vanguard',
    name: 'House Vanguard',
    shortName: 'VANGUARD',
    mottoSv: 'Precision, Optik & Orbital Dominans',
    mottoEn: 'Precision, Optics & Orbital Dominance',
    descSv:
      'Allians- och Atreides-inspirerad militärkoalition. Specialiserad på medeltungt pansar, långdistans sonisk/prisma-artilleri, kryo-försvar och orbitala jonstrålar.',
    descEn:
      'Allied and Atreides-inspired military coalition. Specialized in medium armor, long-range sonic/prism artillery, cryo defenses, and orbital ion strikes.',
    mentatName: 'Commander Valen',
    mentatTitleSv: 'Taktisk Mentat // Orbitalkommando',
    mentatTitleEn: 'Tactical Mentat // Orbital Command',
    primaryColor: '#2b7fff',
    secondaryColor: '#e6c15a',
    accentHex: 0x2b7fff,
    darkHex: 0x132b52,
    emissiveHex: 0x56a8ff,
    speedBonus: 1.05,
    armorBonus: 1.05,
    firepowerBonus: 1.0,
    superweaponId: 'ion_cannon',
    superweaponNameSv: 'Orbital Chrono-Ion Strike',
    superweaponNameEn: 'Orbital Chrono-Ion Strike'
  },
  directorate: {
    id: 'directorate',
    name: 'Iron Directorate',
    shortName: 'DIRECTORATE',
    mottoSv: 'Tungt Stål, Högspänning & Atomkraft',
    mottoEn: 'Heavy Steel, High Voltage & Atomic Power',
    descSv:
      'Sovjet- och Harkonnen-inspirerat industridirektorat. Krossar motståndet med dubbelpipiga Mammoth/Devastator-stridsvagnar, eldkastartorn, Tesla-spolar och taktik-kärnvapen.',
    descEn:
      'Soviet and Harkonnen-inspired industrial directorate. Crushes opposition with twin-barrel Mammoth/Devastator tanks, flame towers, Tesla coils, and tactical nukes.',
    mentatName: 'Commissar Voronin',
    mentatTitleSv: 'Överkommissarie // Pansardivisionen',
    mentatTitleEn: 'High Commissar // Armored Division',
    primaryColor: '#e03131',
    secondaryColor: '#ff922b',
    accentHex: 0xe03131,
    darkHex: 0x4f1111,
    emissiveHex: 0xff4d4d,
    speedBonus: 0.9,
    armorBonus: 1.2,
    firepowerBonus: 1.15,
    superweaponId: 'nuke_silo',
    superweaponNameSv: 'Tactical Atom-Silo Strike',
    superweaponNameEn: 'Tactical Atom-Silo Strike'
  },
  nexus: {
    id: 'nexus',
    name: 'Syndicate Nexus',
    shortName: 'NEXUS',
    mottoSv: 'Skuggkrig, Kemisk Kontroll & Sabotage',
    mottoEn: 'Shadow Warfare, Chemical Control & Sabotage',
    descSv:
      'Ordos- och Nod-inspirerat högteknologiskt syndikat. Använder extremt snabba Raider-fordon, kamouflerade Stealth Tanks, nervgas-Deviators som vänder fiendens vagnar och EMP/Chaos-pulser.',
    descEn:
      'Ordos and Nod-inspired high-tech syndicate. Fields ultra-fast Raider vehicles, cloaked Stealth Tanks, nerve-gas Deviators that turn enemy vehicles, and EMP/Chaos pulses.',
    mentatName: 'Prime Executive Kira',
    mentatTitleSv: 'Syntetisk Mentat // Skuggdirektoratet',
    mentatTitleEn: 'Synthetic Mentat // Shadow Directorate',
    primaryColor: '#20c997',
    secondaryColor: '#f59f00',
    accentHex: 0x20c997,
    darkHex: 0x0b4736,
    emissiveHex: 0x38f2bc,
    speedBonus: 1.2,
    armorBonus: 0.9,
    firepowerBonus: 1.05,
    superweaponId: 'emp_pulse',
    superweaponNameSv: 'Chaos & EMP Overcharge',
    superweaponNameEn: 'Chaos & EMP Overcharge'
  }
};

export const FACTION_LIST: FactionDef[] = [
  FACTIONS.vanguard,
  FACTIONS.directorate,
  FACTIONS.nexus
];

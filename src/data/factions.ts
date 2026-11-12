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
  portraitImage: string;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  vanguard: {
    id: 'vanguard',
    name: 'House Vanguard',
    shortName: 'VANGUARD',
    portraitImage: 'assets/mentats/vanguard_valen.jpg',
    mottoSv: 'I LJUSET AV VÅRA PRISMAN FALLER FIENDEN',
    mottoEn: 'IN THE PRISM LIGHT, ALL TYRANTS FALL',
    descSv:
      'KLASSIFICERAT DIREKTIV // VANGUARD COMMAND: "I skuggan av våra orbitala fästen finns ingen plats att fly." Doktrin: Blixtsnabb orbital precision, kryogenisk territoriekontroll och fokuserade prismastormar.',
    descEn:
      'CLASSIFIED DIRECTIVE // VANGUARD COMMAND: "In the shadow of our orbital batteries, there is nowhere to hide." Doctrine: Surgical orbital precision, cryogenic area denial, and focused prism beams.',
    mentatName: 'Commander Valen',
    mentatTitleSv: 'Högste Taktiske Mentat // Orbitalflottan',
    mentatTitleEn: 'Supreme Tactical Mentat // Orbital Command',
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
    portraitImage: 'assets/mentats/directorate_voronin.jpg',
    mottoSv: 'STÅL SVIKER ALDRIG. KÖTT BRINNER.',
    mottoEn: 'STEEL NEVER FAILS. FLESH BURNS.',
    descSv:
      'KLASSIFICERAT DIREKTIV // IRON CORE: "Kompromisslös eldkraft är den enda lagen på Kryos-IV." Doktrin: Brutalt dubbelpipigt reaktorpansar, förintande eldkastardivisioner, Tesla-urladdningar och atomrobotar.',
    descEn:
      'CLASSIFIED DIRECTIVE // IRON CORE: "Uncompromising firepower is the sole law on Kryos-IV." Doctrine: Brutal twin-barrel reactor armor, devastating napalm shock divisions, Tesla coils, and nuclear silos.',
    mentatName: 'Commissar Voronin',
    mentatTitleSv: 'Överkommissarie // Pansardivisionen',
    mentatTitleEn: 'High Commissar // Armored Iron Legion',
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
    portraitImage: 'assets/mentats/nexus_kira.jpg',
    mottoSv: 'DINA VAPEN TILLHÖR OSS REDAN.',
    mottoEn: 'YOUR WEAPONS BELONG TO US ALREADY.',
    descSv:
      'KLASSIFICERAT DIREKTIV // SHADOW MATRIX: "Kriget avgörs innan fienden ens har upptäckt vårt första drag." Doktrin: Syntetisk nervgas som vänder fientliga fordon, osynliga kamouflagejägare och förlamande EMP-pulser.',
    descEn:
      'CLASSIFIED DIRECTIVE // SHADOW MATRIX: "The battle is won before the enemy detects our first strike." Doctrine: Synthetic neurotoxin hijacking enemy armor, cloaked stealth hunters, and crippling EMP pulses.',
    mentatName: 'Prime Executive Kira',
    mentatTitleSv: 'Prime Executive // Cybernetiska Skuggkollektivet',
    mentatTitleEn: 'Prime Executive // Cybernetic Shadow Directorate',
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

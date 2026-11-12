import { AudioManager } from './audio/AudioManager';
import { BuildingDef, BUILDINGS } from './data/buildings';
import { BiomeType, CAMPAIGNS, MissionDef } from './data/campaigns';
import { FactionId, FACTION_LIST, FACTIONS } from './data/factions';
import { I18N, Lang } from './data/i18n';
import { UnitDef, UNITS } from './data/units';
import { GameWorld } from './engine/GameWorld';
import { GridMap, TerrainType } from './engine/GridMap';
import { SceneRenderer } from './render/SceneRenderer';
import { SpriteAtlasFactory } from './render/SpriteAtlasFactory';
import { CampaignProgressData, GameDifficulty, SaveSystem } from './storage/SaveSystem';

type ScreenMode = 'menu' | 'conquest' | 'battle' | 'editor';
type CursorActionMode = 'normal' | 'place_structure' | 'repair' | 'sell' | 'superweapon';

interface ToastItem {
  id: number;
  textSv: string;
  textEn: string;
  kind: 'info' | 'warn' | 'danger';
  expiresAt: number;
}

class RedSectorApp {
  private lang: Lang = 'sv';
  private crtEnabled = false;
  private screen: ScreenMode = 'menu';
  private difficulty: GameDifficulty = 'recruit';
  private progress: CampaignProgressData;
  private selectedFaction: FactionId = 'vanguard';
  private selectedSectorIndex = 1;
  private activeMission: MissionDef;

  private audio = new AudioManager();
  private sceneRenderer: SceneRenderer;
  private world: GameWorld;

  private uiRoot: HTMLElement;
  private crtOverlay: HTMLElement;

  // Battle UI state
  private activeSidebarTab: 'structures' | 'units' = 'structures';
  private cursorMode: CursorActionMode = 'normal';
  private hoverTooltipSv = 'Peka på en byggnad eller enhet i sidopanelen för tekniska data.';
  private hoverTooltipEn = 'Hover over any structure or unit cameo for tactical specs.';
  private hoverTile: { x: number; y: number } | null = null;
  private toasts: ToastItem[] = [];
  private nextToastId = 1;

  // Selection Lasso state
  private isDraggingLasso = false;
  private lassoStart = { x: 0, y: 0 };
  private lassoCurrent = { x: 0, y: 0 };
  private lassoEl: HTMLDivElement | null = null;

  // Camera keyboard state
  private keysPressed = new Set<string>();
  private lastClickTime = 0;
  private lastClickedUnitId: number | null = null;

  // Map Editor state
  private editorGrid: GridMap = new GridMap(56, 'desert', 777);
  private editorBrush: TerrainType | 'slab' = 'rock';
  private editorMapName = 'Kryos Custom Sector';

  private lastFrameTime = performance.now();
  private hudRefreshAccum = 0;

  constructor() {
    this.progress = SaveSystem.loadCampaignProgress();
    this.difficulty = this.progress.difficulty || 'recruit';
    this.selectedFaction = this.progress.selectedFaction || 'vanguard';
    this.selectedSectorIndex = this.progress.unlockedSector[this.selectedFaction] || 1;
    this.activeMission = CAMPAIGNS[this.selectedFaction][this.selectedSectorIndex - 1];

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.uiRoot = document.getElementById('ui-root') as HTMLElement;
    this.crtOverlay = document.getElementById('crt-overlay') as HTMLElement;

    this.sceneRenderer = new SceneRenderer(canvas);
    this.world = this.createWorldForMission(this.activeMission);
    this.sceneRenderer.rebuildTerrain(this.world);

    this.bindCanvasAndKeyboardEvents(canvas);
    this.renderUI();
    requestAnimationFrame((t) => this.loop(t));
  }

  private t<K extends keyof (typeof I18N)['sv']>(key: K): string {
    return I18N[this.lang][key];
  }

  private createWorldForMission(mission: MissionDef): GameWorld {
    return new GameWorld(mission, {
      difficulty: this.difficulty,
      onEvaSpeech: (phrase) => this.audio.speakEva(phrase),
      onUnitSpeech: (phrase) => this.audio.speakUnit(phrase),
      onSfx: (sfx) => this.audio.playSfx(sfx),
      onToast: (sv, en, kind = 'info') => this.pushToast(sv, en, kind)
    });
  }

  private pushToast(textSv: string, textEn: string, kind: 'info' | 'warn' | 'danger' = 'info'): void {
    this.toasts.push({
      id: this.nextToastId++,
      textSv,
      textEn,
      kind,
      expiresAt: performance.now() + 5500
    });
    if (this.toasts.length > 4) {
      this.toasts.shift();
    }
    this.updateBattleOverlayDOM();
  }

  private bindCanvasAndKeyboardEvents(canvas: HTMLCanvasElement): void {
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const key = e.key.toLowerCase();
      this.keysPressed.add(key);

      if (this.screen !== 'battle') return;

      if (key === 'escape') {
        this.cursorMode = 'normal';
        for (const u of this.world.units) u.selected = false;
        this.updateBattleOverlayDOM();
      }

      // Control groups 1..9
      if (/^[1-9]$/.test(key)) {
        const grp = Number(key);
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          for (const u of this.world.units) {
            if (u.owner === 1 && u.selected) {
              u.controlGroup = grp;
            }
          }
          this.pushToast(`Kontrollgrupp #${grp} sparad.`, `Control Group #${grp} assigned.`, 'info');
        } else {
          let anySelected = false;
          for (const u of this.world.units) {
            if (u.owner === 1) {
              u.selected = u.controlGroup === grp;
              if (u.selected) anySelected = true;
            }
          }
          if (anySelected) {
            this.audio.speakUnit('Unit reporting');
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.key.toLowerCase());
    });

    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.tac-btn, .faction-card, .cameo-btn, [data-pick-sector], [data-sector]')) {
        this.audio.playClick();
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('wheel', (e) => {
      if (this.screen !== 'battle') return;
      this.sceneRenderer.camDistance = Math.max(
        11,
        Math.min(38, this.sceneRenderer.camDistance + e.deltaY * 0.015)
      );
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.screen !== 'battle') return;
      const worldPt = this.sceneRenderer.screenToWorld(e.clientX, e.clientY);
      if (worldPt) {
        this.hoverTile = {
          x: Math.floor(worldPt.x),
          y: Math.floor(worldPt.z)
        };
      } else {
        this.hoverTile = null;
      }

      if (this.isDraggingLasso && this.lassoEl) {
        this.lassoCurrent = { x: e.clientX, y: e.clientY };
        const left = Math.min(this.lassoStart.x, this.lassoCurrent.x);
        const top = Math.min(this.lassoStart.y, this.lassoCurrent.y);
        const w = Math.abs(this.lassoCurrent.x - this.lassoStart.x);
        const h = Math.abs(this.lassoCurrent.y - this.lassoStart.y);
        this.lassoEl.style.left = `${left}px`;
        this.lassoEl.style.top = `${top}px`;
        this.lassoEl.style.width = `${w}px`;
        this.lassoEl.style.height = `${h}px`;
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      if (this.screen !== 'battle') return;
      this.audio.startMusic();

      if (e.button === 2) {
        if (this.cursorMode !== 'normal') {
          this.cursorMode = 'normal';
          this.updateBattleOverlayDOM();
          return;
        }
        this.handleBattlefieldOrder(e.clientX, e.clientY);
        return;
      }

      if (e.button === 0) {
        const p1 = this.world.players[1];
        // 1. Structure placement if ready
        if (
          (this.cursorMode === 'place_structure' ||
            (p1.structureJob && p1.structureJob.readyToPlace)) &&
          this.hoverTile
        ) {
          const placed = this.world.placeReadyStructure(1, this.hoverTile.x, this.hoverTile.y);
          if (placed) {
            this.cursorMode = 'normal';
            this.renderSidebarContent();
          } else {
            this.audio.speakEva('Cannot Deploy Here');
          }
          return;
        }

        // 2. Superweapon targeting
        if (this.cursorMode === 'superweapon' && this.hoverTile) {
          if (this.world.fireSuperweapon(1, this.hoverTile.x + 0.5, this.hoverTile.y + 0.5)) {
            this.cursorMode = 'normal';
            this.renderSidebarContent();
          }
          return;
        }

        // 3. Repair or Sell mode
        if ((this.cursorMode === 'repair' || this.cursorMode === 'sell') && this.hoverTile) {
          const b = this.world.buildings.find(
            (x) =>
              x.owner === 1 &&
              this.hoverTile!.x >= x.tileX &&
              this.hoverTile!.x < x.tileX + x.w &&
              this.hoverTile!.y >= x.tileY &&
              this.hoverTile!.y < x.tileY + x.h
          );
          if (b) {
            if (this.cursorMode === 'repair') {
              this.world.toggleRepairBuilding(b.id, 1);
            } else {
              this.world.sellBuilding(b.id, 1);
            }
            this.renderSidebarContent();
          }
          return;
        }

        // 4. Start rubber-band lasso selection
        this.isDraggingLasso = true;
        this.lassoStart = { x: e.clientX, y: e.clientY };
        this.lassoCurrent = { x: e.clientX, y: e.clientY };
        if (!this.lassoEl) {
          this.lassoEl = document.createElement('div');
          this.lassoEl.className = 'selection-lasso';
          document.body.appendChild(this.lassoEl);
        }
        this.lassoEl.style.display = 'block';
        this.lassoEl.style.left = `${e.clientX}px`;
        this.lassoEl.style.top = `${e.clientY}px`;
        this.lassoEl.style.width = '0px';
        this.lassoEl.style.height = '0px';
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isDraggingLasso) return;
      this.isDraggingLasso = false;
      if (this.lassoEl) {
        this.lassoEl.style.display = 'none';
      }

      const dragDist = Math.hypot(
        e.clientX - this.lassoStart.x,
        e.clientY - this.lassoStart.y
      );

      if (dragDist > 10) {
        const minX = Math.min(this.lassoStart.x, e.clientX);
        const maxX = Math.max(this.lassoStart.x, e.clientX);
        const minY = Math.min(this.lassoStart.y, e.clientY);
        const maxY = Math.max(this.lassoStart.y, e.clientY);

        let selectedCount = 0;
        for (const u of this.world.units) {
          if (u.owner !== 1) continue;
          const scr = this.sceneRenderer.worldToScreen(u.x, 0, u.y);
          const inside = scr.x >= minX && scr.x <= maxX && scr.y >= minY && scr.y <= maxY;
          u.selected = inside;
          if (inside) selectedCount++;
        }
        if (selectedCount > 0) {
          this.audio.speakUnit('Acknowledged');
        }
      } else {
        this.handleSingleLeftClick(e.clientX, e.clientY, e.shiftKey);
      }
    });
  }

  private handleSingleLeftClick(clientX: number, clientY: number, shiftKey: boolean): void {
    const worldPt = this.sceneRenderer.screenToWorld(clientX, clientY);
    if (!worldPt) return;
    const wx = worldPt.x;
    const wy = worldPt.z;

    const clickedFriendly = this.world.units.find(
      (u) => u.owner === 1 && Math.hypot(u.x - wx, u.y - wy) <= 0.85
    );

    const now = performance.now();
    if (clickedFriendly) {
      if (this.lastClickedUnitId === clickedFriendly.id && now - this.lastClickTime < 380) {
        if (clickedFriendly.unitId === 'mcv') {
          this.world.deployMCV(clickedFriendly.id);
          this.renderSidebarContent();
          return;
        }
        for (const u of this.world.units) {
          if (u.owner === 1 && u.unitId === clickedFriendly.unitId) {
            u.selected = true;
          }
        }
        this.audio.speakUnit('Squad ready');
        return;
      }

      this.lastClickTime = now;
      this.lastClickedUnitId = clickedFriendly.id;

      if (!shiftKey) {
        for (const u of this.world.units) u.selected = false;
      }
      clickedFriendly.selected = true;
      this.audio.speakUnit('Reporting');
      return;
    }

    const selectedUnits = this.world.units.filter((u) => u.owner === 1 && u.selected);
    if (selectedUnits.length > 0) {
      this.handleBattlefieldOrder(clientX, clientY);
    }
  }

  private handleBattlefieldOrder(clientX: number, clientY: number): void {
    const selectedUnits = this.world.units.filter((u) => u.owner === 1 && u.selected);
    if (selectedUnits.length === 0) return;

    const worldPt = this.sceneRenderer.screenToWorld(clientX, clientY);
    if (!worldPt) return;
    const wx = worldPt.x;
    const wy = worldPt.z;

    const enemyUnit = this.world.units.find(
      (u) => u.owner !== 1 && Math.hypot(u.x - wx, u.y - wy) <= 1.0
    );
    if (enemyUnit) {
      this.world.issueTargetOrder(selectedUnits, enemyUnit.id);
      this.sceneRenderer.addOrderMarker(enemyUnit.x, enemyUnit.y, true);
      this.audio.speakUnit('Attacking target');
      return;
    }

    const clickedBuilding = this.world.buildings.find(
      (b) => wx >= b.tileX && wx <= b.tileX + b.w && wy >= b.tileY && wy <= b.tileY + b.h
    );
    if (clickedBuilding) {
      const hasEngineer = selectedUnits.some((u) => UNITS[u.unitId].isEngineer);
      const hasHarvester = selectedUnits.some((u) => UNITS[u.unitId].isHarvester);
      if (clickedBuilding.owner !== 1 || hasEngineer || hasHarvester) {
        this.world.issueTargetOrder(selectedUnits, clickedBuilding.id);
        this.sceneRenderer.addOrderMarker(
          clickedBuilding.tileX + clickedBuilding.w * 0.5,
          clickedBuilding.tileY + clickedBuilding.h * 0.5,
          clickedBuilding.owner !== 1
        );
        this.audio.speakUnit(clickedBuilding.owner !== 1 ? 'Target locked' : 'Affirmative');
        return;
      }
    }

    this.world.issueMoveOrder(selectedUnits, wx, wy, false);
    this.sceneRenderer.addOrderMarker(wx, wy, false);
    this.audio.speakUnit('Moving out');
  }

  private renderUI(): void {
    this.crtOverlay.className = this.crtEnabled ? 'crt-on' : 'crt-off';

    if (this.screen === 'menu') {
      this.renderMainMenu();
    } else if (this.screen === 'conquest') {
      this.renderConquestMapScreen();
    } else if (this.screen === 'battle') {
      this.renderBattleHUD();
    } else if (this.screen === 'editor') {
      this.renderMapEditorScreen();
    }
  }

  private renderTopBarControls(showBackToMenu = false): string {
    return `
      <header class="topbar-controls">
        <div class="brand-block">
          <div class="brand-logo-frame">
            <img src="assets/branding/logo.jpg" alt="Iron & Dust Logo" class="brand-logo-img" />
          </div>
          <div class="brand-text-col">
            <h1>IRON &amp; DUST</h1>
            <div class="subtitle">${this.t('subtitle')}</div>
          </div>
        </div>
        <div class="toolbar-btns">
          <button id="btn-diff-toggle" class="tac-btn ${this.difficulty === 'recruit' ? 'active' : ''}" title="${this.t('difficultyLabel')}">
            ${this.difficulty === 'recruit' ? this.t('diffRecruit') : this.difficulty === 'veteran' ? this.t('diffVeteran') : this.t('diffGeneral')}
          </button>
          <button id="btn-lang-toggle" class="tac-btn">
            🌐 ${this.lang === 'sv' ? 'SVENSKA' : 'ENGLISH'}
          </button>
          <button id="btn-crt-toggle" class="tac-btn ${this.crtEnabled ? 'active' : ''}">
            📺 ${this.t('crtMode')}
          </button>
          <button id="btn-audio-toggle" class="tac-btn ${this.audio.enabled ? 'active' : ''}">
            🔊 ${this.t('audioToggle')}
          </button>
          ${
            showBackToMenu
              ? `<button id="btn-back-menu" class="tac-btn">⬅ ${this.t('backToMenu')}</button>`
              : ''
          }
        </div>
      </header>
    `;
  }

  private attachTopBarListeners(): void {
    document.getElementById('btn-diff-toggle')?.addEventListener('click', () => {
      this.difficulty =
        this.difficulty === 'recruit' ? 'veteran' : this.difficulty === 'veteran' ? 'general' : 'recruit';
      this.progress.difficulty = this.difficulty;
      SaveSystem.saveCampaignProgress(this.progress);
      if (this.screen === 'battle') {
        this.world.difficulty = this.difficulty;
      }
      this.renderUI();
    });
    document.getElementById('btn-lang-toggle')?.addEventListener('click', () => {
      this.lang = this.lang === 'sv' ? 'en' : 'sv';
      this.renderUI();
    });
    document.getElementById('btn-crt-toggle')?.addEventListener('click', () => {
      this.crtEnabled = !this.crtEnabled;
      this.renderUI();
    });
    document.getElementById('btn-audio-toggle')?.addEventListener('click', () => {
      this.audio.toggleAudio();
      this.renderUI();
    });
    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
      this.screen = 'menu';
      this.renderUI();
    });
  }

  private renderMainMenu(): void {
    const hasSave = SaveSystem.hasBattleSnapshot();

    const cardsHtml = FACTION_LIST.map((fac) => {
      const isSelected = fac.id === this.selectedFaction;
      const unlocked = this.progress.unlockedSector[fac.id] || 1;
      const motto = this.lang === 'sv' ? fac.mottoSv : fac.mottoEn;
      const desc = this.lang === 'sv' ? fac.descSv : fac.descEn;
      const swName = this.lang === 'sv' ? fac.superweaponNameSv : fac.superweaponNameEn;
      const mentatImg = SpriteAtlasFactory.getMentatPortraitUrl(fac.id);

      const sampleUnits: [string, string, boolean][] =
        fac.id === 'vanguard'
          ? [
              ['medium_tank', 'MEDIUM TANK', false],
              ['sonic_artillery', 'SONIC CANNON', false],
              ['cryo_turret', 'CRYO TURRET', true]
            ]
          : fac.id === 'directorate'
          ? [
              ['heavy_siege_tank', 'HEAVY SIEGE', false],
              ['mammoth_devastator', 'MAMMOTH TANK', false],
              ['tesla_coil', 'TESLA COIL', true]
            ]
          : [
              ['stealth_tank', 'STEALTH TANK', false],
              ['deviator_tank', 'DEVIATOR TANK', false],
              ['laser_turret', 'LASER TURRET', true]
            ];

      const showcaseHtml = sampleUnits
        .map(
          ([id, label, isB]) =>
            `<div class="signature-unit-chip">
              <img src="${SpriteAtlasFactory.getCameoUrl(id as any, fac.id, isB)}" alt="${id}" />
              <div class="signature-unit-tag">${label}</div>
            </div>`
        )
        .join('');

      return `
        <article class="faction-card ${isSelected ? 'selected' : ''}" data-faction="${fac.id}" id="faction-card-${fac.id}">
          <div>
            <div class="faction-crest">
              <div class="mentat-thumb-frame">
                <img src="${mentatImg}" alt="${fac.mentatName}" class="mentat-thumb" />
              </div>
              <div>
                <h3>${fac.name}</h3>
                <div class="faction-motto">${motto}</div>
              </div>
            </div>
            <p class="faction-desc">${desc}</p>
            <div class="unit-showcase-strip">
              ${showcaseHtml}
            </div>
          </div>
          <div>
            <div class="faction-stats">
              <div>MENTAT: <strong style="color:#fff">${fac.mentatName}</strong></div>
              <div>SUPERVAPEN: <strong style="color:${fac.secondaryColor}">${swName}</strong></div>
              <div>KAMPANJSTATUS: <strong style="color:#51cf66">SEKTOR ${unlocked} / 9</strong></div>
            </div>
            <button class="tac-btn primary" style="width:100%; justify-content:center;" data-launch-faction="${fac.id}">
              ▶ ${this.t('startCampaign')} – ${fac.shortName}
            </button>
          </div>
        </article>
      `;
    }).join('');

    this.uiRoot.innerHTML = `
      <div class="screen-overlay">
        ${this.renderTopBarControls(false)}
        <div class="section-header">
          <h2>${this.t('selectHouseTitle')}</h2>
          <p>${this.t('selectHouseSub')}</p>
        </div>

        <div class="factions-grid">
          ${cardsHtml}
        </div>

        <div class="toolbar-btns" style="justify-content:center; margin-top:4px;">
          ${
            hasSave
              ? `<button id="btn-continue-save" class="tac-btn primary">💾 ${this.t('continueCampaign')}</button>`
              : ''
          }
          <button id="btn-skirmish-quick" class="tac-btn">⚔ ${this.t('skirmishMode')} (TECH 9)</button>
          <button id="btn-open-editor" class="tac-btn">🛠 ${this.t('mapEditor')}</button>
        </div>
      </div>
    `;

    this.attachTopBarListeners();

    document.querySelectorAll<HTMLElement>('.faction-card').forEach((card) => {
      card.addEventListener('click', () => {
        const fac = card.dataset.faction as FactionId;
        this.selectedFaction = fac;
        this.progress.selectedFaction = fac;
        SaveSystem.saveCampaignProgress(this.progress);
        this.selectedSectorIndex = this.progress.unlockedSector[fac] || 1;
        this.screen = 'conquest';
        this.audio.startMusic();
        this.audio.speakEva(`${FACTIONS[fac].name} selected`);
        this.renderUI();
      });
    });

    document.getElementById('btn-continue-save')?.addEventListener('click', () => {
      const snap = SaveSystem.loadBattleSnapshot();
      if (snap) {
        this.world.loadSerialized(snap);
        this.sceneRenderer.rebuildTerrain(this.world);
        this.screen = 'battle';
        this.audio.startMusic();
        this.audio.speakEva('Battle Control Online');
        this.renderUI();
      }
    });

    document.getElementById('btn-skirmish-quick')?.addEventListener('click', () => {
      const m = CAMPAIGNS[this.selectedFaction][8];
      this.activeMission = m;
      this.world = this.createWorldForMission(m);
      this.sceneRenderer.rebuildTerrain(this.world);
      this.screen = 'battle';
      this.audio.startMusic();
      this.audio.speakEva('Battle Control Online');
      this.renderUI();
    });

    document.getElementById('btn-open-editor')?.addEventListener('click', () => {
      this.screen = 'editor';
      this.renderUI();
    });
  }

  private renderConquestMapScreen(): void {
    const fac = FACTIONS[this.selectedFaction];
    const missions = CAMPAIGNS[this.selectedFaction];
    const unlockedMax = this.progress.unlockedSector[this.selectedFaction] || 1;
    const currentMission = missions[this.selectedSectorIndex - 1] || missions[0];
    const enemyFac = FACTIONS[currentMission.enemyFaction];
    const mentatPortrait = SpriteAtlasFactory.getMentatPortraitUrl(this.selectedFaction);

    const polysSvg = missions
      .map((m) => {
        const pts = m.sectorPolygon.map((p) => `${p.x},${p.y}`).join(' ');
        const isConquered =
          m.sectorIndex < unlockedMax || this.progress.completedMissions.includes(m.id);
        const isAvailable = m.sectorIndex <= unlockedMax;
        const isSelected = m.sectorIndex === this.selectedSectorIndex;

        const fill = isConquered
          ? fac.primaryColor
          : isSelected
          ? '#f59f00'
          : isAvailable
          ? enemyFac.primaryColor
          : '#1e293b';
        const opacity = isSelected ? 0.85 : isConquered ? 0.68 : isAvailable ? 0.52 : 0.3;

        const cx =
          m.sectorPolygon.reduce((s, p) => s + p.x, 0) / m.sectorPolygon.length;
        const cy =
          m.sectorPolygon.reduce((s, p) => s + p.y, 0) / m.sectorPolygon.length;

        return `
          <g class="sector-group" data-sector="${m.sectorIndex}">
            <polygon
              points="${pts}"
              fill="${fill}"
              fill-opacity="${opacity}"
              class="sector-poly"
              stroke="${isSelected ? '#ffffff' : '#94a3b8'}"
              stroke-width="${isSelected ? '1.4' : '0.6'}"
            />
            <text x="${cx}" y="${cy}" fill="#ffffff" font-size="3.6" font-family="Share Tech Mono" text-anchor="middle" pointer-events="none">
              S-${m.sectorIndex} (T${m.techLevel})
            </text>
          </g>
        `;
      })
      .join('');

    const title = this.lang === 'sv' ? currentMission.titleSv : currentMission.titleEn;
    const region = this.lang === 'sv' ? currentMission.regionNameSv : currentMission.regionNameEn;
    const briefing = this.lang === 'sv' ? currentMission.briefingSv : currentMission.briefingEn;
    const objective = this.lang === 'sv' ? currentMission.objectiveSv : currentMission.objectiveEn;
    const cutscene =
      this.lang === 'sv' ? currentMission.cutsceneIntroSv : currentMission.cutsceneIntroEn;
    const mentatTitle = this.lang === 'sv' ? fac.mentatTitleSv : fac.mentatTitleEn;

    this.uiRoot.innerHTML = `
      <div class="screen-overlay">
        ${this.renderTopBarControls(true)}
        <div class="section-header" style="margin-bottom:14px;">
          <h2>${this.t('sectorMapTitle')} // ${fac.name.toUpperCase()}</h2>
          <p>${this.t('sectorMapSub')}</p>
        </div>

        <div class="conquest-layout">
          <div class="planet-map-box">
            <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:0.84rem;">
              <span>VALD SEKTOR: <strong style="color:var(--amber)">${region}</strong></span>
              <span>${this.t('techLevel')}: <strong style="color:#51cf66">NIVÅ ${currentMission.techLevel} / 9</strong></span>
            </div>
            <svg viewBox="0 0 100 100" class="planet-svg">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#3b5270" stroke-dasharray="1.5 1.5" stroke-width="0.5" />
              <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(255,255,255,0.08)" stroke-width="0.3" />
              <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(255,255,255,0.08)" stroke-width="0.3" />
              ${polysSvg}
            </svg>
            <div class="toolbar-btns" style="justify-content:center;">
              ${missions
                .map(
                  (m) => `
                  <button class="tac-btn ${
                    m.sectorIndex === this.selectedSectorIndex ? 'active' : ''
                  }" data-pick-sector="${m.sectorIndex}" style="padding:5px 10px; font-size:0.78rem;">
                    S${m.sectorIndex}
                  </button>
                `
                )
                .join('')}
            </div>
          </div>

          <div class="mentat-panel">
            <div>
              <div class="mentat-header">
                <div class="mentat-thumb-frame" style="width:112px; height:112px;">
                  <img src="${mentatPortrait}" alt="${fac.mentatName}" class="mentat-thumb" />
                </div>
                <div>
                  <div style="font-family:var(--font-mono); font-size:0.76rem; color:var(--amber);">
                    ${this.t('mentatBriefing')} // ${currentMission.sectorCode}
                  </div>
                  <h3 style="font-size:1.25rem;">${fac.mentatName}</h3>
                  <div style="font-size:0.82rem; color:var(--text-muted);">${mentatTitle}</div>
                </div>
              </div>

              <div class="mentat-cutscene-box" style="margin-top:12px;">
                🎬 <strong>INTRO-SEKVENS:</strong> "${cutscene}"
              </div>

              <h4 style="margin-top:12px; font-size:1.1rem; color:#fff;">${title}</h4>
              <p class="mentat-briefing-text" style="margin-top:6px;">${briefing}</p>

              <div class="objective-callout" style="margin-top:12px;">
                🎯 <strong>${this.t('objectives')}:</strong><br/>
                ${objective}
              </div>

              <div style="margin-top:10px; font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between;">
                <span>BIOM: <strong style="color:#fff">${
                  currentMission.biome === 'desert' ? this.t('biomeDesert') : this.t('biomeTundra')
                }</strong></span>
                <span>FIENDE: <strong style="color:${enemyFac.primaryColor}">${enemyFac.name}</strong></span>
              </div>
            </div>

            <button id="btn-launch-mission" class="tac-btn primary" style="width:100%; justify-content:center; padding:12px; font-size:1rem;">
              🚀 ${this.t('launchMission')}
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachTopBarListeners();

    const selectSector = (idx: number) => {
      this.selectedSectorIndex = idx;
      this.activeMission = CAMPAIGNS[this.selectedFaction][idx - 1];
      this.renderConquestMapScreen();
    };

    document.querySelectorAll<HTMLElement>('[data-sector]').forEach((el) => {
      el.addEventListener('click', () => selectSector(Number(el.dataset.sector)));
    });

    document.querySelectorAll<HTMLElement>('[data-pick-sector]').forEach((el) => {
      el.addEventListener('click', () => selectSector(Number(el.dataset.pickSector)));
    });

    document.getElementById('btn-launch-mission')?.addEventListener('click', () => {
      this.activeMission = CAMPAIGNS[this.selectedFaction][this.selectedSectorIndex - 1];
      this.world = this.createWorldForMission(this.activeMission);
      this.sceneRenderer.rebuildTerrain(this.world);
      this.cursorMode = 'normal';
      this.screen = 'battle';
      this.audio.startMusic();
      this.audio.speakEva('Battle Control Online');
      this.pushToast(
        this.lang === 'sv' ? this.activeMission.objectiveSv : this.activeMission.objectiveEn,
        this.activeMission.objectiveEn,
        'info'
      );
      this.pushToast(
        this.t('peaceActiveToast'),
        this.t('peaceActiveToast'),
        'info'
      );
      this.renderUI();
    });
  }

  private renderBattleHUD(): void {
    const mTitle = this.lang === 'sv' ? this.activeMission.titleSv : this.activeMission.titleEn;

    this.uiRoot.innerHTML = `
      <div class="hud-wrapper">
        <div class="hud-top-left">
          <div class="mission-banner">
            <span class="sector-tag">${this.activeMission.sectorCode} // TECH ${this.world.techLevel}</span>
            <span id="hud-peace-badge" class="peace-badge" style="display:none;"></span>
            <strong>${mTitle}</strong>
            <button id="hud-btn-save" class="ra-mini-btn" style="padding:4px 8px;">💾 ${this.t('saveGame')}</button>
            <button id="hud-btn-load" class="ra-mini-btn" style="padding:4px 8px;">📂 ${this.t('loadGame')}</button>
            <button id="hud-btn-map" class="ra-mini-btn" style="padding:4px 8px;">🗺 ${this.t('pauseMenu')}</button>
          </div>
          <div id="toast-container" class="toast-stack"></div>
          <div id="battle-end-banner"></div>
        </div>

        <div class="hud-bottom-hint">
          ${this.t('controlsHint')}
        </div>

        <aside class="ra-sidebar">
          <div class="ra-credits-bar">
            <span>${this.t('credits')}</span>
            <span id="sidebar-credits" class="credits-value">$0</span>
          </div>

          <div class="ra-radar-row">
            <div class="ra-minimap-box" id="minimap-box">
              <canvas id="radar-canvas" width="168" height="168"></canvas>
            </div>
            <div class="ra-power-column" title="Power Balance">
              <div id="power-bar-fill" class="power-fill" style="height:50%; background-color:#51cf66;"></div>
            </div>
          </div>

          <div id="power-readout" style="font-family:var(--font-mono); font-size:0.74rem; text-align:right; color:var(--text-muted);">
            ⚡ 0 / 0
          </div>

          <div class="ra-action-strip">
            <button id="btn-mode-repair" class="ra-mini-btn">🔧 ${this.t('repairMode')}</button>
            <button id="btn-mode-sell" class="ra-mini-btn">💲 ${this.t('sellMode')}</button>
            <button id="btn-deploy-mcv" class="ra-mini-btn">🏗 ${this.t('deployMCV')}</button>
          </div>

          <div id="superweapon-slot"></div>

          <div class="ra-tabs">
            <button id="tab-structures" class="ra-tab-btn ${
              this.activeSidebarTab === 'structures' ? 'active' : ''
            }">
              🏛 ${this.t('structuresTab')}
            </button>
            <button id="tab-units" class="ra-tab-btn ${
              this.activeSidebarTab === 'units' ? 'active' : ''
            }">
              🛡 ${this.t('unitsTab')}
            </button>
          </div>

          <div id="sidebar-cameo-grid" class="ra-build-grid"></div>

          <div id="sidebar-tooltip" class="ra-tooltip-box">
            ${this.lang === 'sv' ? this.hoverTooltipSv : this.hoverTooltipEn}
          </div>
        </aside>
      </div>
    `;

    document.getElementById('hud-btn-save')?.addEventListener('click', () => {
      SaveSystem.saveBattleSnapshot(this.world.serialize());
      this.audio.speakEva('Game Saved');
      this.pushToast('Slaget har sparats!', 'Battle state saved!', 'info');
    });

    document.getElementById('hud-btn-load')?.addEventListener('click', () => {
      const snap = SaveSystem.loadBattleSnapshot();
      if (snap) {
        this.world.loadSerialized(snap);
        this.sceneRenderer.rebuildTerrain(this.world);
        this.audio.speakEva('Game Loaded');
        this.pushToast('Sparat slag laddades!', 'Saved battle loaded!', 'info');
        this.renderSidebarContent();
      }
    });

    document.getElementById('hud-btn-map')?.addEventListener('click', () => {
      this.screen = 'conquest';
      this.renderUI();
    });

    document.getElementById('btn-mode-repair')?.addEventListener('click', () => {
      this.cursorMode = this.cursorMode === 'repair' ? 'normal' : 'repair';
      this.renderSidebarContent();
    });

    document.getElementById('btn-mode-sell')?.addEventListener('click', () => {
      this.cursorMode = this.cursorMode === 'sell' ? 'normal' : 'sell';
      this.renderSidebarContent();
    });

    document.getElementById('btn-deploy-mcv')?.addEventListener('click', () => {
      const mcv = this.world.units.find((u) => u.owner === 1 && u.unitId === 'mcv');
      if (mcv) {
        this.world.deployMCV(mcv.id);
        this.renderSidebarContent();
      } else {
        this.pushToast('Ingen MCV tillgänglig på kartan.', 'No MCV unit available on map.', 'warn');
      }
    });

    document.getElementById('tab-structures')?.addEventListener('click', () => {
      this.activeSidebarTab = 'structures';
      document.getElementById('tab-structures')?.classList.add('active');
      document.getElementById('tab-units')?.classList.remove('active');
      this.renderSidebarContent();
    });

    document.getElementById('tab-units')?.addEventListener('click', () => {
      this.activeSidebarTab = 'units';
      document.getElementById('tab-units')?.classList.add('active');
      document.getElementById('tab-structures')?.classList.remove('active');
      this.renderSidebarContent();
    });

    const minimapCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement | null;
    minimapCanvas?.addEventListener('mousedown', (e) => {
      const rect = minimapCanvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const tileX = nx * this.world.grid.size;
      const tileY = ny * this.world.grid.size;

      if (e.button === 2) {
        const selected = this.world.units.filter((u) => u.owner === 1 && u.selected);
        if (selected.length > 0) {
          this.world.issueMoveOrder(selected, tileX, tileY, false);
          this.audio.speakUnit('Moving out');
        }
      } else {
        this.sceneRenderer.camTarget.set(tileX, 0, tileY);
      }
    });

    this.renderSidebarContent();
    this.updateBattleOverlayDOM();
  }

  private renderSidebarContent(): void {
    if (this.screen !== 'battle') return;
    const p1 = this.world.players[1];
    if (!p1) return;

    const repairBtn = document.getElementById('btn-mode-repair');
    const sellBtn = document.getElementById('btn-mode-sell');
    if (repairBtn) repairBtn.className = `ra-mini-btn ${this.cursorMode === 'repair' ? 'active' : ''}`;
    if (sellBtn) sellBtn.className = `ra-mini-btn ${this.cursorMode === 'sell' ? 'active' : ''}`;

    const swSlot = document.getElementById('superweapon-slot');
    const hasPalace = this.world.buildings.some(
      (b) => b.owner === 1 && b.buildingId === 'palace_superweapon'
    );
    if (swSlot) {
      if (hasPalace) {
        const facDef = FACTIONS[p1.faction];
        const swName = this.lang === 'sv' ? facDef.superweaponNameSv : facDef.superweaponNameEn;
        if (p1.superweaponReady) {
          swSlot.innerHTML = `
            <button id="btn-fire-sw" class="tac-btn primary" style="width:100%; justify-content:center; padding:6px; font-size:0.76rem;">
              ☢ ${swName} – READY!
            </button>
          `;
          document.getElementById('btn-fire-sw')?.addEventListener('click', () => {
            this.cursorMode = 'superweapon';
            this.pushToast(this.t('superweaponReady'), this.t('superweaponReady'), 'info');
          });
        } else {
          swSlot.innerHTML = `
            <div style="background:#080b10; border:1px solid var(--border-steel); padding:5px 8px; font-family:var(--font-mono); font-size:0.74rem; color:var(--amber);">
              ☢ ${swName}: ${Math.ceil(p1.superweaponCooldownSec)}s
            </div>
          `;
        }
      } else {
        swSlot.innerHTML = '';
      }
    }

    const gridEl = document.getElementById('sidebar-cameo-grid');
    if (!gridEl) return;

    if (this.activeSidebarTab === 'structures') {
      const buildings = this.world.getAvailableBuildings(1);
      const job = p1.structureJob;

      gridEl.innerHTML = buildings
        .map((b) => {
          const isThisJob = job && job.itemId === b.id;
          const pct = isThisJob ? Math.round((job.progressSec / job.totalSec) * 100) : 0;
          const deg = Math.round((pct / 100) * 360);
          const isReady = Boolean(isThisJob && job.readyToPlace);
          const title = this.lang === 'sv' ? b.nameSv : b.nameEn;
          const cameoUrl = SpriteAtlasFactory.getCameoUrl(b.id, p1.faction, true);

          return `
            <div class="ra-cameo ${b.isSlab ? 'slab-cameo' : ''} ${isReady ? 'ready' : ''}" data-bldg-id="${b.id}">
              <img src="${cameoUrl}" alt="${title}" class="cameo-art" />
              ${
                isThisJob && !isReady
                  ? `<div class="cameo-clock-sweep" style="background: conic-gradient(rgba(245, 159, 0, 0.22) ${deg}deg, rgba(0, 0, 0, 0.72) ${deg}deg);"></div>`
                  : ''
              }
              ${
                isReady
                  ? `<span class="cameo-badge">READY</span>`
                  : isThisJob
                  ? `<span class="cameo-badge" style="background:rgba(217, 72, 15, 0.92); border-color:#ffc078;">${pct}%</span>`
                  : ''
              }
              <div class="cameo-top-bar">
                <div class="cameo-title">${title}</div>
              </div>
              <div class="cameo-bottom-bar">
                <span>$${b.cost}</span>
                <span>${b.footprintW}×${b.footprintH}</span>
              </div>
            </div>
          `;
        })
        .join('');

      gridEl.querySelectorAll<HTMLElement>('[data-bldg-id]').forEach((el) => {
        const bId = el.dataset.bldgId as BuildingDef['id'];
        const def = BUILDINGS[bId];
        el.addEventListener('mouseenter', () => {
          const tip = document.getElementById('sidebar-tooltip');
          if (tip && def) {
            tip.innerHTML = `<strong>${
              this.lang === 'sv' ? def.nameSv : def.nameEn
            }</strong> ($${def.cost} | ⚡${def.powerDiff > 0 ? '+' + def.powerDiff : def.powerDiff})<br/>${
              this.lang === 'sv' ? def.descSv : def.descEn
            }`;
          }
        });
        el.addEventListener('click', () => {
          if (p1.structureJob && p1.structureJob.itemId === bId && p1.structureJob.readyToPlace) {
            this.cursorMode = 'place_structure';
            return;
          }
          if (!p1.structureJob) {
            this.world.startProduction(1, bId, true);
            this.renderSidebarContent();
          }
        });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (p1.structureJob && p1.structureJob.itemId === bId) {
            this.world.cancelProduction(1, true);
            this.cursorMode = 'normal';
            this.renderSidebarContent();
          }
        });
      });
    } else {
      const units = this.world.getAvailableUnits(1);
      const job = p1.unitJob;

      gridEl.innerHTML = units
        .map((u) => {
          const isThisJob = job && job.itemId === u.id;
          const pct = isThisJob ? Math.round((job.progressSec / job.totalSec) * 100) : 0;
          const deg = Math.round((pct / 100) * 360);
          const title = this.lang === 'sv' ? u.nameSv : u.nameEn;
          const cameoUrl = SpriteAtlasFactory.getCameoUrl(u.id, p1.faction, false);

          return `
            <div class="ra-cameo" data-unit-id="${u.id}">
              <img src="${cameoUrl}" alt="${title}" class="cameo-art" />
              ${
                isThisJob
                  ? `<div class="cameo-clock-sweep" style="background: conic-gradient(rgba(245, 159, 0, 0.22) ${deg}deg, rgba(0, 0, 0, 0.72) ${deg}deg);"></div>
                     <span class="cameo-badge" style="background:rgba(217, 72, 15, 0.92); border-color:#ffc078;">${pct}%</span>`
                  : ''
              }
              <div class="cameo-top-bar">
                <div class="cameo-title">${title}</div>
              </div>
              <div class="cameo-bottom-bar">
                <span>$${u.cost}</span>
                <span>HP:${u.hp}</span>
              </div>
            </div>
          `;
        })
        .join('');

      gridEl.querySelectorAll<HTMLElement>('[data-unit-id]').forEach((el) => {
        const uId = el.dataset.unitId as UnitDef['id'];
        const def = UNITS[uId];
        el.addEventListener('mouseenter', () => {
          const tip = document.getElementById('sidebar-tooltip');
          if (tip && def) {
            tip.innerHTML = `<strong>${
              this.lang === 'sv' ? def.nameSv : def.nameEn
            }</strong> ($${def.cost} | DMG:${def.attackDamage})<br/>${
              this.lang === 'sv' ? def.descSv : def.descEn
            }`;
          }
        });
        el.addEventListener('click', () => {
          if (!p1.unitJob) {
            this.world.startProduction(1, uId, false);
            this.renderSidebarContent();
          }
        });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (p1.unitJob && p1.unitJob.itemId === uId) {
            this.world.cancelProduction(1, false);
            this.renderSidebarContent();
          }
        });
      });
    }
  }

  private updateBattleOverlayDOM(): void {
    if (this.screen !== 'battle') return;
    const p1 = this.world.players[1];
    if (!p1) return;

    const credEl = document.getElementById('sidebar-credits');
    if (credEl) {
      credEl.textContent = `$${Math.floor(p1.credits)}`;
    }

    const powerReadout = document.getElementById('power-readout');
    if (powerReadout) {
      const low = p1.powerProduced < p1.powerConsumed;
      powerReadout.style.color = low ? '#fa5252' : '#51cf66';
      powerReadout.textContent = `⚡ ${p1.powerProduced} / ${p1.powerConsumed}`;
    }

    const powerFill = document.getElementById('power-bar-fill');
    if (powerFill) {
      const ratio =
        p1.powerConsumed === 0
          ? 1
          : Math.min(1, p1.powerProduced / Math.max(1, p1.powerConsumed * 1.2));
      powerFill.style.height = `${Math.max(12, Math.round(ratio * 100))}%`;
      powerFill.style.backgroundColor =
        p1.powerProduced < p1.powerConsumed ? '#fa5252' : '#51cf66';
    }

    const peaceBadge = document.getElementById('hud-peace-badge');
    if (peaceBadge) {
      if (this.world.peaceTimerRemaining > 0) {
        const mins = Math.floor(this.world.peaceTimerRemaining / 60);
        const secs = Math.floor(this.world.peaceTimerRemaining % 60)
          .toString()
          .padStart(2, '0');
        peaceBadge.style.display = 'inline-block';
        peaceBadge.innerHTML = `🛡️ ${this.t('peaceTimer')}: ${mins}:${secs}`;
      } else {
        peaceBadge.style.display = 'none';
      }
    }

    const now = performance.now();
    this.toasts = this.toasts.filter((t) => t.expiresAt > now);
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
      toastContainer.innerHTML = this.toasts
        .map(
          (t) => `
          <div class="toast-msg ${t.kind === 'danger' ? 'danger' : ''}">
            ${this.lang === 'sv' ? t.textSv : t.textEn}
          </div>
        `
        )
        .join('');
    }

    const endBanner = document.getElementById('battle-end-banner');
    if (endBanner) {
      if (this.world.status === 'victory' && !endBanner.hasChildNodes()) {
        this.progress = SaveSystem.markMissionCompleted(
          this.selectedFaction,
          this.activeMission.sectorIndex,
          this.activeMission.id
        );
        endBanner.innerHTML = `
          <div class="mentat-panel" style="margin-top:12px; border-color:#51cf66;">
            <h3 style="color:#51cf66;">🏆 ${this.t('victoryTitle')}</h3>
            <button id="btn-next-sector" class="tac-btn primary" style="margin-top:8px;">
              ▶ ${this.t('nextSectorBtn')}
            </button>
          </div>
        `;
        document.getElementById('btn-next-sector')?.addEventListener('click', () => {
          this.selectedSectorIndex = Math.min(9, this.activeMission.sectorIndex + 1);
          this.screen = 'conquest';
          this.renderUI();
        });
      } else if (this.world.status === 'defeat' && !endBanner.hasChildNodes()) {
        endBanner.innerHTML = `
          <div class="mentat-panel" style="margin-top:12px; border-color:#fa5252;">
            <h3 style="color:#fa5252;">💀 ${this.t('defeatTitle')}</h3>
            <button id="btn-retry-mission" class="tac-btn primary" style="margin-top:8px;">
              🔄 ${this.t('retryMissionBtn')}
            </button>
          </div>
        `;
        document.getElementById('btn-retry-mission')?.addEventListener('click', () => {
          this.world = this.createWorldForMission(this.activeMission);
          this.sceneRenderer.rebuildTerrain(this.world);
          this.renderBattleHUD();
        });
      }
    }

    this.drawRadarMinimap();
  }

  private drawRadarMinimap(): void {
    const canvas = document.getElementById('radar-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const p1 = this.world.players[1];

    if (!p1.radarOnline) {
      ctx.fillStyle = '#06090e';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#1b2838' : '#2b3d54';
        ctx.fillRect(Math.random() * w, Math.random() * h, 6, 2);
      }
      ctx.fillStyle = FACTIONS[p1.faction].primaryColor;
      ctx.font = 'bold 12px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        this.world.ionStormActiveTimer > 0 ? 'ION STORM JAMMING' : 'RADAR OFFLINE',
        w / 2,
        h / 2 - 4
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Share Tech Mono", monospace';
      ctx.fillText('(Build Radar + Power)', w / 2, h / 2 + 12);
      return;
    }

    const size = this.world.grid.size;
    const scale = w / size;

    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const c = this.world.grid.cells[y * size + x];
        if (c.visibility === 0) continue;
        if (c.terrain === 'ore' || c.terrain === 'crystal_vent') {
          ctx.fillStyle = '#ff6b2b';
        } else if (c.terrain === 'rock') {
          ctx.fillStyle = '#5c677d';
        } else if (c.terrain === 'mountain') {
          ctx.fillStyle = '#212529';
        } else {
          ctx.fillStyle = this.world.grid.biome === 'desert' ? '#9c784c' : '#658199';
        }
        ctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
      }
    }

    for (const b of this.world.buildings) {
      const c = this.world.grid.getCell(b.tileX, b.tileY);
      if (b.owner !== 1 && (!c || c.visibility === 0)) continue;
      ctx.fillStyle = FACTIONS[b.faction].primaryColor;
      ctx.fillRect(b.tileX * scale, b.tileY * scale, b.w * scale, b.h * scale);
    }

    for (const u of this.world.units) {
      const c = this.world.grid.getCell(Math.floor(u.x), Math.floor(u.y));
      if (u.owner !== 1 && (!c || c.visibility < 2)) continue;
      ctx.fillStyle = u.owner === 1 ? '#51cf66' : FACTIONS[u.faction].primaryColor;
      ctx.fillRect(u.x * scale - 1.5, u.y * scale - 1.5, 3, 3);
    }

    if (this.world.sandworm.active) {
      ctx.strokeStyle = '#ffd43b';
      ctx.strokeRect(
        this.world.sandworm.x * scale - 3,
        this.world.sandworm.y * scale - 3,
        6,
        6
      );
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const boxSize = 16 * scale;
    ctx.strokeRect(
      this.sceneRenderer.camTarget.x * scale - boxSize * 0.5,
      this.sceneRenderer.camTarget.z * scale - boxSize * 0.5,
      boxSize,
      boxSize
    );
  }

  private renderMapEditorScreen(): void {
    const customMaps = SaveSystem.loadCustomMaps();

    this.uiRoot.innerHTML = `
      <div class="screen-overlay">
        ${this.renderTopBarControls(true)}
        <div class="section-header" style="margin-bottom:14px;">
          <h2>🛠 ${this.t('mapEditor')}</h2>
          <p>Skapa och testa egna fältslagskartor (56×56) med Pyronite-malm, Klipplatåer och Betongplattor.</p>
        </div>

        <div class="editor-layout">
          <div class="editor-tools-panel">
            <label style="font-family:var(--font-mono); font-size:0.8rem;">KARTNAMN / MAP NAME:</label>
            <input id="editor-map-name" type="text" value="${this.editorMapName}" style="padding:8px; background:#090d14; color:#fff; border:1px solid var(--border-highlight); font-family:var(--font-mono);" />

            <label style="font-family:var(--font-mono); font-size:0.8rem; margin-top:6px;">BIOM:</label>
            <div style="display:flex; gap:8px;">
              <button id="ed-biome-desert" class="tac-btn ${this.editorGrid.biome === 'desert' ? 'active' : ''}" style="flex:1;">🏜 ÖKEN</button>
              <button id="ed-biome-tundra" class="tac-btn ${this.editorGrid.biome === 'tundra' ? 'active' : ''}" style="flex:1;">❄ TUNDRA</button>
            </div>

            <label style="font-family:var(--font-mono); font-size:0.8rem; margin-top:6px;">PENSEL (TERRÄNGTYP):</label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              <button class="tac-btn ${this.editorBrush === 'sand' ? 'active' : ''}" data-brush="sand">Sand / Snö</button>
              <button class="tac-btn ${this.editorBrush === 'rock' ? 'active' : ''}" data-brush="rock">Klippa (Rock)</button>
              <button class="tac-btn ${this.editorBrush === 'mountain' ? 'active' : ''}" data-brush="mountain">Berg (Hinder)</button>
              <button class="tac-btn ${this.editorBrush === 'ore' ? 'active' : ''}" data-brush="ore">Pyronite-Malm</button>
              <button class="tac-btn ${this.editorBrush === 'crystal_vent' ? 'active' : ''}" data-brush="crystal_vent">Malmkälla (Vent)</button>
              <button class="tac-btn ${this.editorBrush === 'slab' ? 'active' : ''}" data-brush="slab">Betongplatta</button>
            </div>

            <div style="display:flex; gap:8px; margin-top:8px;">
              <button id="ed-save-map" class="tac-btn" style="flex:1;">💾 SPARA KARTA</button>
              <button id="ed-playtest-map" class="tac-btn primary" style="flex:1;">▶ PROVSPELA</button>
            </div>

            ${
              customMaps.length > 0
                ? `<div style="margin-top:10px; font-family:var(--font-mono); font-size:0.78rem;">
                    SPARADE KARTOR (${customMaps.length}):
                    ${customMaps
                      .map(
                        (m, idx) =>
                          `<button class="tac-btn" style="width:100%; margin-top:4px; font-size:0.74rem;" data-load-custom="${idx}">📂 ${m.name}</button>`
                      )
                      .join('')}
                  </div>`
                : ''
            }
          </div>

          <div class="editor-canvas-wrap">
            <canvas id="editor-canvas" width="560" height="560"></canvas>
          </div>
        </div>
      </div>
    `;

    this.attachTopBarListeners();

    const edCanvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
    const drawEditorGrid = () => {
      const ctx = edCanvas.getContext('2d')!;
      const size = this.editorGrid.size;
      const cellPx = edCanvas.width / size;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const c = this.editorGrid.cells[y * size + x];
          if (c.hasSlab) ctx.fillStyle = '#94a3b8';
          else if (c.terrain === 'crystal_vent') ctx.fillStyle = '#ff2a00';
          else if (c.terrain === 'ore') ctx.fillStyle = '#ff7b29';
          else if (c.terrain === 'rock') ctx.fillStyle = '#5c677d';
          else if (c.terrain === 'mountain') ctx.fillStyle = '#1e242b';
          else ctx.fillStyle = this.editorGrid.biome === 'desert' ? '#c99b59' : '#9bb8cd';

          ctx.fillRect(x * cellPx, y * cellPx, Math.ceil(cellPx), Math.ceil(cellPx));
        }
      }
    };

    drawEditorGrid();

    let painting = false;
    const applyBrushAt = (clientX: number, clientY: number) => {
      const rect = edCanvas.getBoundingClientRect();
      const tx = Math.floor(((clientX - rect.left) / rect.width) * this.editorGrid.size);
      const ty = Math.floor(((clientY - rect.top) / rect.height) * this.editorGrid.size);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cell = this.editorGrid.getCell(tx + dx, ty + dy);
          if (!cell) continue;
          if (this.editorBrush === 'slab') {
            cell.terrain = 'rock';
            cell.hasSlab = true;
            cell.slabOwner = 1;
          } else {
            cell.hasSlab = false;
            cell.terrain = this.editorBrush;
            cell.oreAmount =
              this.editorBrush === 'ore' || this.editorBrush === 'crystal_vent' ? 500 : 0;
          }
        }
      }
      drawEditorGrid();
    };

    edCanvas.addEventListener('mousedown', (e) => {
      painting = true;
      applyBrushAt(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => {
      painting = false;
    });
    edCanvas.addEventListener('mousemove', (e) => {
      if (painting) applyBrushAt(e.clientX, e.clientY);
    });

    document.querySelectorAll<HTMLElement>('[data-brush]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.editorBrush = btn.dataset.brush as TerrainType | 'slab';
        this.renderMapEditorScreen();
      });
    });

    document.getElementById('ed-biome-desert')?.addEventListener('click', () => {
      this.editorGrid.biome = 'desert';
      this.renderMapEditorScreen();
    });
    document.getElementById('ed-biome-tundra')?.addEventListener('click', () => {
      this.editorGrid.biome = 'tundra';
      this.renderMapEditorScreen();
    });

    document.getElementById('ed-save-map')?.addEventListener('click', () => {
      const nameInput = document.getElementById('editor-map-name') as HTMLInputElement;
      this.editorMapName = nameInput?.value || 'Custom Kryos Map';
      SaveSystem.saveCustomMap(this.editorMapName, this.editorGrid.serialize());
      this.renderMapEditorScreen();
    });

    document.querySelectorAll<HTMLElement>('[data-load-custom]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.loadCustom);
        const maps = SaveSystem.loadCustomMaps();
        if (maps[idx]) {
          this.editorMapName = maps[idx].name;
          this.editorGrid = GridMap.deserialize(maps[idx].grid);
          this.renderMapEditorScreen();
        }
      });
    });

    document.getElementById('ed-playtest-map')?.addEventListener('click', () => {
      const m = {
        ...CAMPAIGNS[this.selectedFaction][5],
        biome: this.editorGrid.biome as BiomeType,
        techLevel: 9
      };
      this.activeMission = m;
      this.world = this.createWorldForMission(m);
      this.world.grid = GridMap.deserialize(this.editorGrid.serialize());
      this.world.grid.paintRockPlateau(4, this.world.grid.size - 20, 16, 15);
      this.world.grid.paintRockPlateau(this.world.grid.size - 20, 4, 16, 15);
      this.sceneRenderer.rebuildTerrain(this.world);
      this.screen = 'battle';
      this.audio.startMusic();
      this.audio.speakEva('Battle Control Online');
      this.renderUI();
    });
  }

  private loop(now: number): void {
    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    if (this.screen === 'battle') {
      const panSpeed = 16 * dt;

      if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) {
        this.sceneRenderer.camTarget.z -= panSpeed;
      }
      if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) {
        this.sceneRenderer.camTarget.z += panSpeed;
      }
      if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) {
        this.sceneRenderer.camTarget.x -= panSpeed;
      }
      if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) {
        this.sceneRenderer.camTarget.x += panSpeed;
      }

      const maxCoord = this.world.grid.size - 2;
      this.sceneRenderer.camTarget.x = Math.max(2, Math.min(maxCoord, this.sceneRenderer.camTarget.x));
      this.sceneRenderer.camTarget.z = Math.max(2, Math.min(maxCoord, this.sceneRenderer.camTarget.z));

      this.world.update(dt);
      this.sceneRenderer.updatePlacementPreview(this.world, this.hoverTile);

      this.hudRefreshAccum += dt;
      if (this.hudRefreshAccum >= 0.2) {
        this.hudRefreshAccum = 0;
        this.updateBattleOverlayDOM();
        this.renderSidebarContent();
      }
    }

    this.sceneRenderer.syncWorld(this.world, dt);
    requestAnimationFrame((t) => this.loop(t));
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    new RedSectorApp();
  });
} else {
  new RedSectorApp();
}

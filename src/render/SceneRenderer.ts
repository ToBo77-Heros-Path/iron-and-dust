import { BUILDINGS } from '../data/buildings';
import { FACTIONS } from '../data/factions';
import { UNITS } from '../data/units';
import { GameWorld } from '../engine/GameWorld';
import { SpriteAtlasFactory } from './SpriteAtlasFactory';

interface FireballParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  age: number;
  maxAge: number;
  kind: 'fire' | 'smoke' | 'shockwave';
  color: string;
}

interface DebrisParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  vRot: number;
  size: number;
  color: string;
  age: number;
  maxAge: number;
}

interface OrderMarkerEffect {
  x: number;
  y: number;
  isAttack: boolean;
  age: number;
}

export class SceneRenderer {
  public camTarget = { x: 14, y: 0, z: 40, set(nx: number, ny: number, nz: number) { this.x = nx; this.y = ny; this.z = nz; } };
  public camDistance = 20; // Controls zoom level (smaller = zoomed in, larger = zoomed out)
  public camYaw = 0;

  private ctx: CanvasRenderingContext2D;
  private baseTilePx = 48;

  private terrainCanvas: HTMLCanvasElement;
  private terrainCtx: CanvasRenderingContext2D;
  private decalCanvas: HTMLCanvasElement;
  private decalCtx: CanvasRenderingContext2D;

  private fireballs: FireballParticle[] = [];
  private debris: DebrisParticle[] = [];
  private orderMarkers: OrderMarkerEffect[] = [];
  private hoverTile: { x: number; y: number } | null = null;
  private smokeAccum = 0;
  private trackAccum = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = this.canvas.getContext('2d')!;
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCtx = this.terrainCanvas.getContext('2d')!;
    this.decalCanvas = document.createElement('canvas');
    this.decalCtx = this.decalCanvas.getContext('2d')!;

    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public getZoomScale(): number {
    // camDistance ranges 11..44; default 20 -> zoom ~1.05
    return Math.max(0.55, Math.min(1.9, 21 / Math.max(10, this.camDistance)));
  }

  public addOrderMarker(tileX: number, tileY: number, isAttack: boolean): void {
    this.orderMarkers.push({ x: tileX, y: tileY, isAttack, age: 0 });
  }

  /**
   * Pre-renders the high-detail Autotile Terrain (Sculpted Sand Dunes / Tundra Snow,
   * 2.5D Rock Plateau Cliffs, and Jagged Mountain Peaks) onto an offscreen canvas.
   */
  public rebuildTerrain(world: GameWorld): void {
    const size = world.grid.size;
    const tPx = this.baseTilePx;
    const totalPx = size * tPx;

    this.terrainCanvas.width = totalPx;
    this.terrainCanvas.height = totalPx;
    this.decalCanvas.width = totalPx;
    this.decalCanvas.height = totalPx;
    this.decalCtx.clearRect(0, 0, totalPx, totalPx);

    this.fireballs = [];
    this.debris = [];

    const ctx = this.terrainCtx;
    const isDesert = world.grid.biome === 'desert';

    // 1. Base Sand Dunes / Tundra Snowdrifts
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = x * tPx;
        const py = y * tPx;
        const hash = ((x * 73856093) ^ (y * 19349663)) & 0xff;

        if (isDesert) {
          const baseGrad = ctx.createLinearGradient(px, py, px + tPx, py + tPx);
          baseGrad.addColorStop(0, '#d6a15c');
          baseGrad.addColorStop(0.5, '#c58d47');
          baseGrad.addColorStop(1, '#b37a36');
          ctx.fillStyle = baseGrad;
          ctx.fillRect(px, py, tPx, tPx);

          // Wavy wind-swept sand dune ripples
          ctx.strokeStyle = 'rgba(255, 232, 185, 0.22)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py + 14 + (hash % 6));
          ctx.quadraticCurveTo(px + tPx * 0.5, py + 8, px + tPx, py + 16 + (hash % 5));
          ctx.stroke();

          ctx.strokeStyle = 'rgba(110, 65, 20, 0.24)';
          ctx.beginPath();
          ctx.moveTo(px, py + 34 + (hash % 5));
          ctx.quadraticCurveTo(px + tPx * 0.5, py + 28, px + tPx, py + 36 + (hash % 4));
          ctx.stroke();
        } else {
          const baseGrad = ctx.createLinearGradient(px, py, px + tPx, py + tPx);
          baseGrad.addColorStop(0, '#b8d0e0');
          baseGrad.addColorStop(0.5, '#9cb9ce');
          baseGrad.addColorStop(1, '#84a3ba');
          ctx.fillStyle = baseGrad;
          ctx.fillRect(px, py, tPx, tPx);

          // Ice ridges
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py + 18);
          ctx.lineTo(px + tPx, py + 12 + (hash % 8));
          ctx.stroke();
        }

        // Fine texture speckles
        ctx.fillStyle = isDesert ? 'rgba(90, 50, 15, 0.16)' : 'rgba(40, 65, 90, 0.16)';
        for (let s = 0; s < 5; s++) {
          const sx = px + ((hash * (s + 3) * 17) % (tPx - 4));
          const sy = py + ((hash * (s + 7) * 29) % (tPx - 4));
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
    }

    // 2. Autotile Rock Plateaus with 2.5D Chiseled Cliff Edges
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = world.grid.getCell(x, y)!;
        if (cell.terrain !== 'rock') continue;

        const px = x * tPx;
        const py = y * tPx;
        const hash = ((x * 31) ^ (y * 57)) & 0xff;

        const topRock = isDesert ? '#6d5e53' : '#526173';
        const darkRock = isDesert ? '#483c34' : '#333e4b';

        const rGrad = ctx.createLinearGradient(px, py, px + tPx, py + tPx);
        rGrad.addColorStop(0, SpriteAtlasFactory.brightenHex(topRock, 10));
        rGrad.addColorStop(1, SpriteAtlasFactory.brightenHex(topRock, -12));
        ctx.fillStyle = rGrad;
        ctx.fillRect(px, py, tPx, tPx);

        // Cracked stone strata lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 6, py + (hash % 24) + 8);
        ctx.lineTo(px + 24, py + (hash % 18) + 14);
        ctx.lineTo(px + tPx - 6, py + (hash % 28) + 10);
        ctx.stroke();

        // Check neighbor cells to draw 2.5D cliff overhangs & shadows
        const nTop = world.grid.getCell(x, y - 1)?.terrain === 'rock';
        const nBot = world.grid.getCell(x, y + 1)?.terrain === 'rock';
        const nLeft = world.grid.getCell(x - 1, y)?.terrain === 'rock';
        const nRight = world.grid.getCell(x + 1, y)?.terrain === 'rock';

        if (!nTop) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.fillRect(px, py, tPx, 4);
        }
        if (!nLeft) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.fillRect(px, py, 4, tPx);
        }
        if (!nBot) {
          // 2.5D South Cliff Wall + Drop shadow onto sand below
          ctx.fillStyle = darkRock;
          ctx.fillRect(px, py + tPx - 9, tPx, 9);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
          ctx.fillRect(px, py + tPx, tPx, 7);
        }
        if (!nRight) {
          ctx.fillStyle = darkRock;
          ctx.fillRect(px + tPx - 7, py, 7, tPx);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
          ctx.fillRect(px + tPx, py + 4, 6, tPx);
        }
      }
    }

    // 3. Multi-tiered Jagged Mountain Ridges
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = world.grid.getCell(x, y)!;
        if (cell.terrain !== 'mountain') continue;

        const px = x * tPx;
        const py = y * tPx;

        // Cast long mountain shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(px + tPx * 0.62, py + tPx * 0.65, tPx * 0.52, tPx * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chiseled polygon peak
        const mLit = isDesert ? '#7a5c43' : '#64778d';
        const mShade = isDesert ? '#36271c' : '#26303d';

        // Left sunlit face
        ctx.fillStyle = mLit;
        ctx.beginPath();
        ctx.moveTo(px + tPx * 0.5, py + 4);
        ctx.lineTo(px + 4, py + tPx - 4);
        ctx.lineTo(px + tPx * 0.5, py + tPx - 2);
        ctx.closePath();
        ctx.fill();

        // Right shaded face
        ctx.fillStyle = mShade;
        ctx.beginPath();
        ctx.moveTo(px + tPx * 0.5, py + 4);
        ctx.lineTo(px + tPx - 4, py + tPx - 4);
        ctx.lineTo(px + tPx * 0.5, py + tPx - 2);
        ctx.closePath();
        ctx.fill();

        // Ridge line
        ctx.strokeStyle = '#14181f';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 3, py + 3, tPx - 6, tPx - 6);
      }
    }

    this.camTarget.set(11, 0, size - 13);
  }

  public updatePlacementPreview(
    _world: GameWorld,
    hoverTile: { x: number; y: number } | null
  ): void {
    this.hoverTile = hoverTile;
  }

  public syncWorld(world: GameWorld, dt: number): void {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const zoom = this.getZoomScale();
    const tPx = this.baseTilePx;

    // 1. Stamp persistent vehicle tread marks onto decalCanvas
    this.trackAccum += dt;
    if (this.trackAccum >= 0.14) {
      this.trackAccum = 0;
      for (const u of world.units) {
        if (UNITS[u.unitId].category === 'vehicle' && u.path.length > 0) {
          const cell = world.grid.getCell(Math.floor(u.x), Math.floor(u.y));
          if (cell && cell.terrain !== 'rock' && !cell.hasSlab) {
            this.stampTreadTrack(u.x * tPx, u.y * tPx, u.hullAngle);
          }
        }
      }
    }

    // 2. Emit continuous damage smoke & fire on structures < 55% HP
    this.smokeAccum += dt;
    if (this.smokeAccum >= 0.18) {
      this.smokeAccum = 0;
      for (const b of world.buildings) {
        if (b.hp < b.maxHp * 0.55) {
          const bx = (b.tileX + b.w * (0.25 + Math.random() * 0.5)) * tPx;
          const by = (b.tileY + b.h * (0.25 + Math.random() * 0.5)) * tPx;
          this.fireballs.push({
            x: bx,
            y: by,
            vx: (Math.random() - 0.5) * 10,
            vy: -18 - Math.random() * 14,
            radius: 5,
            maxRadius: 16,
            age: 0,
            maxAge: 1.1,
            kind: Math.random() > 0.45 ? 'smoke' : 'fire',
            color: Math.random() > 0.45 ? '#1e2229' : '#ff6b00'
          });
        }
      }
    }

    // 3. Process new explosions -> stamp crater + spawn multi-layer fireballs, shockwave & flying debris
    while (world.recentExplosions.length > 0) {
      const exp = world.recentExplosions.shift()!;
      this.spawnExplosionVFX(
        exp.x * tPx,
        exp.y * tPx,
        exp.radius * tPx * 0.65,
        Boolean(exp.isSuperweapon)
      );
    }

    // 4. Clear & setup camera transform
    const ctx = this.ctx;
    ctx.fillStyle = '#070a0f';
    ctx.fillRect(0, 0, viewW, viewH);

    // Reserve right 296px for sidebar when in battle
    const centerScreenX = (viewW - 148) * 0.5;
    const centerScreenY = viewH * 0.5;

    ctx.save();
    ctx.translate(centerScreenX, centerScreenY);
    ctx.scale(zoom, zoom);
    ctx.translate(-this.camTarget.x * tPx, -this.camTarget.z * tPx);

    // Visible tile bounds for culling
    const halfCols = Math.ceil((viewW / zoom) / tPx) + 3;
    const halfRows = Math.ceil((viewH / zoom) / tPx) + 3;
    const minTileX = Math.max(0, Math.floor(this.camTarget.x - halfCols));
    const maxTileX = Math.min(world.grid.size - 1, Math.ceil(this.camTarget.x + halfCols));
    const minTileY = Math.max(0, Math.floor(this.camTarget.z - halfRows));
    const maxTileY = Math.min(world.grid.size - 1, Math.ceil(this.camTarget.z + halfRows));

    // --- LAYER 0: Pre-rendered Autotile Terrain + Decals (Tread tracks & Blast craters) ---
    ctx.drawImage(this.terrainCanvas, 0, 0);
    ctx.drawImage(this.decalCanvas, 0, 0);

    // --- LAYER 1: Concrete Slabs & Glittering Pyronite Ore Crystals ---
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const cell = world.grid.getCell(tx, ty)!;
        if (cell.visibility === 0) continue;

        const px = tx * tPx;
        const py = ty * tPx;

        if (cell.hasSlab) {
          ctx.fillStyle = '#7c8899';
          ctx.fillRect(px + 1, py + 1, tPx - 2, tPx - 2);
          ctx.strokeStyle = '#333d4b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 2, py + 2, tPx - 4, tPx - 4);
          // Corner rivets
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(px + 5, py + 5, 2, 2);
          ctx.fillRect(px + tPx - 7, py + 5, 2, 2);
          ctx.fillRect(px + 5, py + tPx - 7, 2, 2);
          ctx.fillRect(px + tPx - 7, py + tPx - 7, 2, 2);
        }

        if ((cell.terrain === 'ore' || cell.terrain === 'crystal_vent') && cell.oreAmount > 0) {
          this.drawOreTile(ctx, px, py, tPx, cell.oreAmount, cell.terrain === 'crystal_vent', world.elapsedSec);
        }
      }
    }

    // --- LAYER 2: Sandworm Ripples & Jaws (if active) ---
    if (world.sandworm.active) {
      const wCell = world.grid.getCell(Math.floor(world.sandworm.x), Math.floor(world.sandworm.y));
      if (wCell && wCell.visibility === 2) {
        this.drawSandworm25D(
          ctx,
          world.sandworm.x * tPx,
          world.sandworm.y * tPx,
          Math.atan2(world.sandworm.vy, world.sandworm.vx),
          world.sandworm.surfaceTimer > 0,
          world.elapsedSec
        );
      }
    }

    // --- LAYER 3: Y-Sorted Buildings & Units ---
    type RenderItem =
      | { sortY: number; kind: 'building'; b: (typeof world.buildings)[0] }
      | { sortY: number; kind: 'unit'; u: (typeof world.units)[0] };

    const items: RenderItem[] = [];

    for (const b of world.buildings) {
      const cell = world.grid.getCell(b.tileX, b.tileY);
      if (b.owner !== 1 && (!cell || cell.visibility === 0)) continue;
      items.push({ sortY: b.tileY + b.h * 0.85, kind: 'building', b });
    }

    for (const u of world.units) {
      const cell = world.grid.getCell(Math.floor(u.x), Math.floor(u.y));
      const stealthHidden =
        u.owner !== 1 && UNITS[u.unitId].isCloaked && u.cloakShimmerTimer <= 0;
      if (u.owner !== 1 && (!cell || cell.visibility < 2 || stealthHidden)) continue;
      items.push({ sortY: u.y, kind: 'unit', u });
    }

    items.sort((a, b) => a.sortY - b.sortY);

    for (const item of items) {
      if (item.kind === 'building') {
        this.drawBuildingEntity(ctx, item.b, tPx, world.elapsedSec);
      } else {
        this.drawUnitEntity(ctx, item.u, tPx, world.elapsedSec);
      }
    }

    // --- LAYER 4: Placement Footprint Preview ---
    this.drawPlacementFootprint(ctx, world, tPx);

    // --- LAYER 5: Projectiles, Rockets, Lasers & Tesla Lightning ---
    this.drawProjectiles(ctx, world, tPx);

    // --- LAYER 6: Explosions, Smoke Plumes & Flying Debris ---
    this.updateAndDrawParticles(ctx, dt);

    // --- LAYER 7: Command Order Feedback Markers ---
    this.updateAndDrawOrderMarkers(ctx, dt, tPx);

    // --- LAYER 8: Smooth Shroud & Fog of War ---
    this.drawFogOfWar(ctx, world, minTileX, maxTileX, minTileY, maxTileY, tPx);

    ctx.restore();
  }

  private drawOreTile(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tPx: number,
    oreAmount: number,
    isVent: boolean,
    elapsed: number
  ): void {
    const density = Math.max(2, Math.min(7, Math.ceil(oreAmount / 85)));
    const seed = (px * 17 + py * 31) & 0xff;

    // Warm mineral glow on sand beneath
    const glow = ctx.createRadialGradient(
      px + tPx * 0.5,
      py + tPx * 0.5,
      2,
      px + tPx * 0.5,
      py + tPx * 0.5,
      tPx * 0.48
    );
    glow.addColorStop(0, isVent ? 'rgba(255, 60, 0, 0.55)' : 'rgba(255, 115, 0, 0.32)');
    glow.addColorStop(1, 'rgba(255, 115, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px, py, tPx, tPx);

    if (isVent) {
      // Glowing crystalline fumarole crater in center
      ctx.fillStyle = '#2b1810';
      ctx.beginPath();
      ctx.arc(px + tPx * 0.5, py + tPx * 0.5, 13, 0, Math.PI * 2);
      ctx.fill();

      const pulse = 8 + Math.sin(elapsed * 4) * 2.5;
      ctx.fillStyle = '#ff4500';
      ctx.beginPath();
      ctx.arc(px + tPx * 0.5, py + tPx * 0.5, pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw jagged Pyronite / Red Ore crystal shards
    for (let i = 0; i < density; i++) {
      const cx = px + 9 + (((seed + i * 37) * 13) % (tPx - 18));
      const cy = py + 9 + (((seed + i * 53) * 19) % (tPx - 18));
      const sz = 4.5 + (i % 3) * 1.6;

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(cx + 2, cy + 2, sz, sz);

      ctx.fillStyle = i % 2 === 0 ? '#ff5500' : '#ff922b';
      ctx.beginPath();
      ctx.moveTo(cx, cy - sz);
      ctx.lineTo(cx + sz, cy);
      ctx.lineTo(cx, cy + sz);
      ctx.lineTo(cx - sz, cy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff3bf';
      ctx.fillRect(cx - 1, cy - sz * 0.5, 2, 2);
    }
  }

  private drawBuildingEntity(
    ctx: CanvasRenderingContext2D,
    b: GameWorld['buildings'][0],
    tPx: number,
    elapsed: number
  ): void {
    const px = b.tileX * tPx;
    const py = b.tileY * tPx;
    const wPx = b.w * tPx;
    const hPx = b.h * tPx;

    const sprite = SpriteAtlasFactory.getBuildingSprite(b.buildingId, b.faction, tPx);

    // Construction scaffold reveal animation when newly placed
    if (b.constructAnimProgress < 1) {
      ctx.save();
      const revealH = hPx * b.constructAnimProgress;
      ctx.beginPath();
      ctx.rect(px, py + hPx - revealH, wPx, revealH);
      ctx.clip();
      ctx.drawImage(sprite, px, py);
      ctx.restore();

      // Yellow construction laser grid lines
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 4, py + hPx - revealH, wPx - 8, revealH);
    } else {
      ctx.drawImage(sprite, px, py);
    }

    // Dynamic rotating Turrets / Radar dishes / Tesla arcs
    const cx = px + wPx * 0.5;
    const cy = py + hPx * 0.5;
    const fDef = FACTIONS[b.faction];

    if (b.buildingId === 'radar_outpost') {
      ctx.save();
      ctx.translate(px + wPx * 0.65, py + hPx * 0.42);
      ctx.rotate(elapsed * 1.4);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fDef.secondaryColor;
      ctx.fillRect(-2, -10, 4, 10);
      ctx.restore();
    } else if (
      b.buildingId === 'pillbox' ||
      b.buildingId === 'flame_tower' ||
      b.buildingId === 'cryo_turret' ||
      b.buildingId === 'laser_turret'
    ) {
      ctx.save();
      ctx.translate(cx, cy - 4);
      ctx.rotate(b.turretAngle);
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      ctx.fillRect(2, -3, 18, 6);
      ctx.strokeRect(2, -3, 18, 6);
      ctx.restore();
    } else if (b.buildingId === 'tesla_coil') {
      // Crackling electric corona around top coil
      const pulse = 5 + Math.sin(elapsed * 12) * 2;
      ctx.strokeStyle = '#74c0fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, py + hPx * 0.24, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Repair wrench icon if repairing
    if (b.isRepairing) {
      ctx.fillStyle = '#ffd43b';
      ctx.font = 'bold 14px "Share Tech Mono", monospace';
      ctx.fillText('🔧 REPAIR', px + 6, py + 16);
    }

    // Segmented C&C Health Bar (shown when damaged or repairing)
    if (b.hp < b.maxHp || b.isRepairing) {
      this.drawSegmentedHealthBar(ctx, px + 6, py - 8, wPx - 12, 6, b.hp / b.maxHp);
    }
  }

  private drawUnitEntity(
    ctx: CanvasRenderingContext2D,
    u: GameWorld['units'][0],
    tPx: number,
    elapsed: number
  ): void {
    const sx = u.x * tPx;
    const sy = u.y * tPx;
    const isMoving = u.path.length > 0;

    SpriteAtlasFactory.drawUnit25D(
      ctx,
      u.unitId,
      u.faction,
      sx,
      sy,
      1.0,
      u.hullAngle,
      u.turretAngle,
      isMoving ? elapsed : 0,
      u.oreCarried / Math.max(1, u.maxOreCapacity),
      UNITS[u.unitId].isCloaked && u.cloakShimmerTimer <= 0
    );

    // Classic Command & Conquer White Selection Corner Brackets + Segmented Health Bar
    if (u.selected) {
      const r = UNITS[u.unitId].category === 'infantry' ? 14 : 21;
      const len = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      // Top-left
      ctx.moveTo(sx - r, sy - r + len);
      ctx.lineTo(sx - r, sy - r);
      ctx.lineTo(sx - r + len, sy - r);
      // Top-right
      ctx.moveTo(sx + r - len, sy - r);
      ctx.lineTo(sx + r, sy - r);
      ctx.lineTo(sx + r, sy - r + len);
      // Bottom-left
      ctx.moveTo(sx - r, sy + r - len);
      ctx.lineTo(sx - r, sy + r);
      ctx.lineTo(sx - r + len, sy + r);
      // Bottom-right
      ctx.moveTo(sx + r - len, sy + r);
      ctx.lineTo(sx + r, sy + r);
      ctx.lineTo(sx + r, sy + r - len);
      ctx.stroke();

      this.drawSegmentedHealthBar(ctx, sx - r, sy - r - 8, r * 2, 5, u.hp / u.maxHp);

      if (u.controlGroup !== null) {
        ctx.fillStyle = '#090d14';
        ctx.fillRect(sx - r, sy + r - 10, 12, 11);
        ctx.fillStyle = '#ffd43b';
        ctx.font = 'bold 10px "Share Tech Mono", monospace';
        ctx.fillText(String(u.controlGroup), sx - r + 3, sy + r - 1);
      }
    } else if (u.hp < u.maxHp) {
      this.drawSegmentedHealthBar(ctx, sx - 16, sy - 24, 32, 4, u.hp / u.maxHp);
    }
  }

  private drawSegmentedHealthBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number
  ): void {
    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);

    const fillW = Math.round(w * clamped);
    ctx.fillStyle = clamped > 0.5 ? '#40c057' : clamped > 0.25 ? '#fab005' : '#fa5252';
    ctx.fillRect(x, y, fillW, h);

    // Classic Westwood black segment ticks every 6px
    ctx.fillStyle = '#000000';
    for (let sx = x + 6; sx < x + w; sx += 6) {
      ctx.fillRect(sx, y, 1, h);
    }
  }

  private drawSandworm25D(
    ctx: CanvasRenderingContext2D,
    wx: number,
    wy: number,
    angle: number,
    surfaced: boolean,
    elapsed: number
  ): void {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(angle);

    // Concentric sand vibration rings
    ctx.strokeStyle = 'rgba(214, 158, 92, 0.65)';
    ctx.lineWidth = 2;
    const r = 16 + ((elapsed * 24) % 18);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Segmented armored worm ridges
    for (let i = 3; i >= 0; i--) {
      const wag = Math.sin(elapsed * 8 + i) * 4;
      ctx.fillStyle = i === 0 ? '#a85d28' : '#8a4b1f';
      ctx.beginPath();
      ctx.arc(-i * 11, wag, 13 - i * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3b1d08';
      ctx.stroke();
    }

    if (surfaced) {
      // Open three-jawed Dune II Sandworm Maw!
      ctx.fillStyle = '#ff2a00';
      ctx.beginPath();
      ctx.arc(6, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3bf';
      for (let a = 0; a < 6; a++) {
        const th = (a * Math.PI) / 3;
        ctx.fillRect(6 + Math.cos(th) * 8, Math.sin(th) * 8, 3, 3);
      }
    }

    ctx.restore();
  }

  private drawPlacementFootprint(ctx: CanvasRenderingContext2D, world: GameWorld, tPx: number): void {
    const p1 = world.players[1];
    if (!this.hoverTile || !p1 || !p1.structureJob || !p1.structureJob.readyToPlace) return;

    const def = BUILDINGS[p1.structureJob.itemId as keyof typeof BUILDINGS];
    if (!def) return;

    const check = world.grid.canPlaceStructure(
      this.hoverTile.x,
      this.hoverTile.y,
      def.footprintW,
      def.footprintH,
      1,
      Boolean(def.isSlab)
    );

    for (let dy = 0; dy < def.footprintH; dy++) {
      for (let dx = 0; dx < def.footprintW; dx++) {
        const tx = this.hoverTile.x + dx;
        const ty = this.hoverTile.y + dy;
        const cell = world.grid.getCell(tx, ty);
        const valid =
          cell && cell.terrain === 'rock' && cell.buildingEntityId === null && check.valid;

        ctx.fillStyle = valid ? 'rgba(64, 192, 87, 0.38)' : 'rgba(250, 82, 82, 0.45)';
        ctx.fillRect(tx * tPx + 2, ty * tPx + 2, tPx - 4, tPx - 4);
        ctx.strokeStyle = valid ? '#51cf66' : '#fa5252';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx * tPx + 2, ty * tPx + 2, tPx - 4, tPx - 4);
      }
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, world: GameWorld, tPx: number): void {
    for (const p of world.projectiles) {
      const fx = p.fromX * tPx;
      const fy = p.fromY * tPx;
      const tx = p.toX * tPx;
      const ty = p.toY * tPx;

      if (p.weaponKind === 'tesla') {
        // Branching jagged lightning arc
        ctx.save();
        ctx.strokeStyle = '#74c0fc';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        const segs = 6;
        for (let i = 1; i < segs; i++) {
          const t = i / segs;
          ctx.lineTo(
            fx + (tx - fx) * t + (Math.random() - 0.5) * 18,
            fy + (ty - fy) * t + (Math.random() - 0.5) * 18
          );
        }
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.restore();
      } else if (p.weaponKind === 'laser' || p.weaponKind === 'cryo' || p.weaponKind === 'superweapon') {
        ctx.save();
        ctx.strokeStyle =
          p.weaponKind === 'cryo'
            ? '#38d9a9'
            : p.weaponKind === 'superweapon'
            ? '#ffd43b'
            : '#ff2a2a';
        ctx.lineWidth = p.weaponKind === 'superweapon' ? 18 : 3.5;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.restore();
      } else {
        const cx = fx + (tx - fx) * p.progress;
        const cy = fy + (ty - fy) * p.progress;
        const arcLift = Math.sin(p.progress * Math.PI) * (p.weaponKind === 'rocket' ? 28 : 8);

        // Smoke trail for rockets
        if (p.weaponKind === 'rocket' || p.weaponKind === 'nerve_gas') {
          this.fireballs.push({
            x: cx,
            y: cy - arcLift,
            vx: 0,
            vy: -4,
            radius: 3,
            maxRadius: 9,
            age: 0,
            maxAge: 0.35,
            kind: 'smoke',
            color: p.weaponKind === 'nerve_gas' ? '#20c997' : '#cbd5e1'
          });
        }

        // Tracer / Shell / Flame orb
        ctx.fillStyle = p.weaponKind === 'flame' ? '#ff6b00' : '#fff3bf';
        ctx.beginPath();
        ctx.arc(cx, cy - arcLift, p.weaponKind === 'flame' ? 7 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private stampTreadTrack(px: number, py: number, angle: number): void {
    const ctx = this.decalCtx;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(40, 28, 16, 0.22)';
    ctx.fillRect(-4, -10, 6, 3);
    ctx.fillRect(-4, 7, 6, 3);
    ctx.restore();
  }

  private spawnExplosionVFX(px: number, py: number, radiusPx: number, isSuper: boolean): void {
    // 1. Burn permanent blast crater onto decalCanvas
    const dCtx = this.decalCtx;
    const craterR = Math.max(12, Math.min(64, radiusPx * 0.7));
    const grad = dCtx.createRadialGradient(px, py, 2, px, py, craterR);
    grad.addColorStop(0, 'rgba(12, 10, 9, 0.78)');
    grad.addColorStop(0.65, 'rgba(32, 24, 18, 0.45)');
    grad.addColorStop(1, 'rgba(32, 24, 18, 0)');
    dCtx.fillStyle = grad;
    dCtx.beginPath();
    dCtx.arc(px, py, craterR, 0, Math.PI * 2);
    dCtx.fill();

    // 2. Shockwave ring
    this.fireballs.push({
      x: px,
      y: py,
      vx: 0,
      vy: 0,
      radius: 4,
      maxRadius: radiusPx * (isSuper ? 2.2 : 1.35),
      age: 0,
      maxAge: isSuper ? 0.75 : 0.38,
      kind: 'shockwave',
      color: '#ffd8a8'
    });

    // 3. Multi-layered Fireballs & Smoke Clouds
    const count = isSuper ? 18 : 7;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * radiusPx * 0.55;
      const isCore = i < count * 0.6;
      this.fireballs.push({
        x: px + Math.cos(ang) * dist,
        y: py + Math.sin(ang) * dist,
        vx: Math.cos(ang) * (12 + Math.random() * 20),
        vy: Math.sin(ang) * (12 + Math.random() * 20) - 12,
        radius: 6 + Math.random() * 8,
        maxRadius: radiusPx * (0.45 + Math.random() * 0.45),
        age: Math.random() * 0.08,
        maxAge: isCore ? 0.48 + Math.random() * 0.25 : 0.85 + Math.random() * 0.35,
        kind: isCore ? 'fire' : 'smoke',
        color: i % 2 === 0 ? '#ff922b' : '#ff4500'
      });
    }

    // 4. Flying Metallic Debris / Shrapnel with bounce physics!
    const debrisCount = isSuper ? 24 : 9;
    for (let i = 0; i < debrisCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 45 + Math.random() * 115;
      this.debris.push({
        x: px,
        y: py,
        z: 4 + Math.random() * 8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 75 + Math.random() * 95,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 14,
        size: 3 + Math.random() * 4.5,
        color: i % 3 === 0 ? '#ff922b' : '#495057',
        age: 0,
        maxAge: 0.65 + Math.random() * 0.45
      });
    }
  }

  private updateAndDrawParticles(ctx: CanvasRenderingContext2D, dt: number): void {
    // 1. Fireballs, Smoke & Shockwaves
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const p = this.fireballs[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.fireballs.splice(i, 1);
        continue;
      }

      const t = p.age / p.maxAge;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const curR = p.radius + (p.maxRadius - p.radius) * Math.sin(t * Math.PI * 0.5);

      ctx.save();
      if (p.kind === 'shockwave') {
        ctx.strokeStyle = `rgba(255, 224, 160, ${(1 - t) * 0.75})`;
        ctx.lineWidth = 3 * (1 - t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, curR, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'fire') {
        const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, curR);
        grad.addColorStop(0, `rgba(255, 250, 205, ${1 - t})`);
        grad.addColorStop(0.45, `rgba(255, 130, 20, ${(1 - t) * 0.9})`);
        grad.addColorStop(1, 'rgba(180, 30, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, curR, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(28, 32, 38, ${(1 - t) * 0.55})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, curR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Flying Metallic Debris with 2.5D gravity & bounce
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.age += dt;
      if (d.age >= d.maxAge) {
        this.debris.splice(i, 1);
        continue;
      }

      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vz -= 260 * dt; // Gravity
      d.z += d.vz * dt;
      if (d.z < 0) {
        d.z = 0;
        d.vz = -d.vz * 0.45;
        d.vx *= 0.65;
        d.vy *= 0.65;
      }
      d.rot += d.vRot * dt;

      // Ground shadow of debris
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(d.x - d.size * 0.5, d.y - d.size * 0.5, d.size, d.size);

      // Airborne shrapnel piece
      ctx.save();
      ctx.translate(d.x, d.y - d.z);
      ctx.rotate(d.rot);
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.size * 0.5, -d.size * 0.5, d.size, d.size * 0.75);
      ctx.restore();
    }
  }

  private updateAndDrawOrderMarkers(ctx: CanvasRenderingContext2D, dt: number, tPx: number): void {
    for (let i = this.orderMarkers.length - 1; i >= 0; i--) {
      const m = this.orderMarkers[i];
      m.age += dt;
      if (m.age >= 0.55) {
        this.orderMarkers.splice(i, 1);
        continue;
      }
      const t = m.age / 0.55;
      const r = (1 - t) * 18 + 4;
      const px = m.x * tPx;
      const py = m.y * tPx;

      ctx.strokeStyle = m.isAttack ? '#fa5252' : '#51cf66';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawFogOfWar(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    tPx: number
  ): void {
    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        const cell = world.grid.getCell(tx, ty)!;
        if (cell.visibility === 2) continue;

        const px = tx * tPx;
        const py = ty * tPx;
        if (cell.visibility === 0) {
          ctx.fillStyle = 'rgba(6, 9, 14, 0.94)';
          ctx.fillRect(px, py, tPx + 0.5, tPx + 0.5);
        } else {
          ctx.fillStyle = 'rgba(8, 12, 20, 0.45)';
          ctx.fillRect(px, py, tPx + 0.5, tPx + 0.5);
        }
      }
    }
  }

  public screenToWorld(clientX: number, clientY: number): { x: number; y: number; z: number } | null {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const zoom = this.getZoomScale();
    const tPx = this.baseTilePx;

    const centerScreenX = (viewW - 148) * 0.5;
    const centerScreenY = viewH * 0.5;

    const worldX = (clientX - centerScreenX) / (zoom * tPx) + this.camTarget.x;
    const worldZ = (clientY - centerScreenY) / (zoom * tPx) + this.camTarget.z;

    return { x: worldX, y: 0, z: worldZ };
  }

  public worldToScreen(x: number, _y: number, z: number): { x: number; y: number } {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const zoom = this.getZoomScale();
    const tPx = this.baseTilePx;

    const centerScreenX = (viewW - 148) * 0.5;
    const centerScreenY = viewH * 0.5;

    return {
      x: (x - this.camTarget.x) * zoom * tPx + centerScreenX,
      y: (z - this.camTarget.z) * zoom * tPx + centerScreenY
    };
  }
}

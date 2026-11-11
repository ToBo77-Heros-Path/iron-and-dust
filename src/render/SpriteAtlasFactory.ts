import { BuildingId, BUILDINGS } from '../data/buildings';
import { FactionId, FACTIONS } from '../data/factions';
import { UnitId, UNITS } from '../data/units';

export class SpriteAtlasFactory {
  private static buildingSpriteCache = new Map<string, HTMLCanvasElement>();
  private static cameoUrlCache = new Map<string, string>();
  private static mentatUrlCache = new Map<FactionId, string>();

  /**
   * Helper: Draw black & yellow hazard stripes inside a rectangle
   */
  public static drawHazardStripes(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = '#e69900';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#14171c';
    ctx.lineWidth = 4;
    for (let i = -h; i < w + h; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Helper: Draw a 2.5D beveled metallic box with top face, front extruded depth face, panel lines & rivets
   */
  public static drawBeveledBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    topColor: string,
    frontColor: string,
    borderColor = '#141920',
    rivets = true
  ): void {
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(x + 5, y + depth + 5, w, h);

    // Front extruded 2.5D face
    const frontGrad = ctx.createLinearGradient(x, y + h - depth, x + w, y + h);
    frontGrad.addColorStop(0, frontColor);
    frontGrad.addColorStop(1, '#151a22');
    ctx.fillStyle = frontGrad;
    ctx.fillRect(x, y + h - depth, w, depth);

    // Top face
    const topGrad = ctx.createLinearGradient(x, y, x + w, y + h - depth);
    topGrad.addColorStop(0, this.brightenHex(topColor, 18));
    topGrad.addColorStop(0.5, topColor);
    topGrad.addColorStop(1, this.brightenHex(topColor, -22));
    ctx.fillStyle = topGrad;
    ctx.fillRect(x, y, w, h - depth);

    // Specular highlight along top & left edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + h - depth - 1);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + w - 1, y + 1);
    ctx.stroke();

    // Outer outline
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Seam between top and front face
    ctx.beginPath();
    ctx.moveTo(x, y + h - depth);
    ctx.lineTo(x + w, y + h - depth);
    ctx.stroke();

    // Rivets
    if (rivets && w >= 20 && h - depth >= 16) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (const [rx, ry] of [
        [x + 4, y + 4],
        [x + w - 6, y + 4],
        [x + 4, y + h - depth - 6],
        [x + w - 6, y + h - depth - 6]
      ]) {
        ctx.fillRect(rx, ry, 2, 2);
      }
    }
  }

  /**
   * Helper: Draw a 2.5D shaded metallic cylinder / dome silo
   */
  public static drawShadedCylinder(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    height: number,
    colorHex: string,
    capColorHex?: string
  ): void {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx + 5, cy + 5, radius * 1.02, radius * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cylinder body
    const bodyGrad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    bodyGrad.addColorStop(0, this.brightenHex(colorHex, -25));
    bodyGrad.addColorStop(0.32, this.brightenHex(colorHex, 30));
    bodyGrad.addColorStop(0.75, colorHex);
    bodyGrad.addColorStop(1, '#11161d');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.72, 0, 0, Math.PI);
    ctx.lineTo(cx - radius, cy - height);
    ctx.ellipse(cx, cy - height, radius, radius * 0.72, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#12161f';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Top cap
    const topC = capColorHex || this.brightenHex(colorHex, 15);
    const topGrad = ctx.createRadialGradient(
      cx - radius * 0.3,
      cy - height - radius * 0.2,
      1,
      cx,
      cy - height,
      radius
    );
    topGrad.addColorStop(0, this.brightenHex(topC, 35));
    topGrad.addColorStop(1, this.brightenHex(topC, -18));
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - height, radius, radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  public static getBuildingSprite(
    buildingId: BuildingId,
    faction: FactionId,
    tilePx = 48
  ): HTMLCanvasElement {
    const key = `${buildingId}_${faction}_${tilePx}`;
    const cached = this.buildingSpriteCache.get(key);
    if (cached) return cached;

    const def = BUILDINGS[buildingId];
    const fDef = FACTIONS[faction];
    const wPx = def.footprintW * tilePx;
    const hPx = def.footprintH * tilePx;

    const canvas = document.createElement('canvas');
    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext('2d')!;

    // Base foundation plate with beveled rim & corner bolts
    this.drawBeveledBlock(
      ctx,
      3,
      5,
      wPx - 6,
      hPx - 7,
      7,
      '#39424e',
      '#20262e',
      '#11151a',
      true
    );

    // Subtle panel grid lines on baseplate
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1;
    for (let gx = tilePx; gx < wPx; gx += tilePx) {
      ctx.beginPath();
      ctx.moveTo(gx, 6);
      ctx.lineTo(gx, hPx - 8);
      ctx.stroke();
    }
    for (let gy = tilePx; gy < hPx; gy += tilePx) {
      ctx.beginPath();
      ctx.moveTo(6, gy);
      ctx.lineTo(wPx - 6, gy);
      ctx.stroke();
    }

    const pColor = fDef.primaryColor;
    const sColor = fDef.secondaryColor;

    switch (buildingId) {
      case 'concrete_slab_2x2':
      case 'concrete_slab_3x3': {
        this.drawHazardStripes(ctx, 6, 6, wPx - 12, 6);
        this.drawHazardStripes(ctx, 6, hPx - 14, wPx - 12, 6);
        break;
      }

      case 'construction_yard': {
        // Large Industrial Assembly Hall (left/top)
        this.drawBeveledBlock(ctx, 10, 12, wPx * 0.62, hPx * 0.56, 18, '#525d6d', '#2b323c');
        // Faction colored roof bay
        this.drawBeveledBlock(ctx, 16, 16, wPx * 0.52, hPx * 0.36, 10, pColor, '#1d283a');
        // Skylight windows
        ctx.fillStyle = '#74c0fc';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(22 + i * 20, 22, 14, 8);
        }
        // Hazard loading bay at bottom-left
        this.drawHazardStripes(ctx, 14, hPx * 0.72, wPx * 0.45, 14);
        this.drawBeveledBlock(ctx, 18, hPx * 0.68, wPx * 0.38, 16, 6, '#2b313a', '#171a20');
        // Gantry Crane pedestal on right
        this.drawShadedCylinder(ctx, wPx * 0.78, hPx * 0.72, 16, 22, sColor, pColor);
        break;
      }

      case 'power_plant':
      case 'adv_power_plant': {
        const isAdv = buildingId === 'adv_power_plant';
        // Reactor housing
        this.drawBeveledBlock(ctx, 10, 18, wPx - 20, hPx - 28, 16, '#4a5568', '#252d38');
        this.drawHazardStripes(ctx, 14, hPx - 22, wPx - 28, 7);
        // Twin or Quad Plasma Cooling Turbines
        this.drawShadedCylinder(ctx, wPx * 0.34, hPx * 0.54, 17, isAdv ? 26 : 18, pColor, '#38bdf8');
        this.drawShadedCylinder(ctx, wPx * 0.7, hPx * 0.54, 15, isAdv ? 24 : 16, '#64748b', sColor);
        if (isAdv) {
          this.drawShadedCylinder(ctx, wPx * 0.52, hPx * 0.35, 16, 28, sColor, '#66d9e8');
        }
        break;
      }

      case 'refinery': {
        // Main processing structure
        this.drawBeveledBlock(ctx, 10, 10, wPx - 20, hPx * 0.54, 18, '#556070', '#2b313b');
        // Twin tall Pyronite distillation vats
        this.drawShadedCylinder(ctx, wPx * 0.26, hPx * 0.44, 18, 28, pColor, sColor);
        this.drawShadedCylinder(ctx, wPx * 0.54, hPx * 0.44, 18, 28, pColor, sColor);
        // Smokestack with glowing flare
        this.drawShadedCylinder(ctx, wPx * 0.8, hPx * 0.38, 10, 34, '#2d343e', '#ff6b35');
        // Harvester Unloading Dock Bay at bottom with hazard strips & glowing ore pit
        this.drawHazardStripes(ctx, 16, hPx * 0.64, wPx - 32, hPx * 0.26);
        ctx.fillStyle = '#161a20';
        ctx.fillRect(24, hPx * 0.68, wPx - 48, hPx * 0.18);
        ctx.fillStyle = '#ff5500';
        ctx.fillRect(30, hPx * 0.71, wPx - 60, hPx * 0.11);
        break;
      }

      case 'silo': {
        for (const [sx, sy] of [
          [wPx * 0.32, hPx * 0.42],
          [wPx * 0.68, hPx * 0.42],
          [wPx * 0.32, hPx * 0.74],
          [wPx * 0.68, hPx * 0.74]
        ]) {
          this.drawShadedCylinder(ctx, sx, sy, 13, 18, pColor, sColor);
        }
        break;
      }

      case 'barracks': {
        // Quonset / Armored military barracks roof
        this.drawBeveledBlock(ctx, 10, 14, wPx - 20, hPx * 0.58, 16, pColor, '#222933');
        // Sandbag & parade ground entrance at bottom
        this.drawHazardStripes(ctx, 20, hPx * 0.72, wPx - 40, 10);
        // Comms tower
        this.drawShadedCylinder(ctx, wPx * 0.78, hPx * 0.38, 7, 24, '#94a3b8', '#ff4d4d');
        break;
      }

      case 'sandbag_wall': {
        this.drawBeveledBlock(ctx, 5, 8, wPx - 10, hPx - 14, 12, '#717c89', '#3b424c');
        this.drawBeveledBlock(ctx, 11, 4, wPx - 22, hPx - 18, 8, pColor, '#252b33');
        break;
      }

      case 'pillbox': {
        // Octagonal armored concrete bunker
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.65, wPx * 0.36, 14, '#5a6575', pColor);
        // Dark firing slit
        ctx.fillStyle = '#090c10';
        ctx.fillRect(wPx * 0.28, hPx * 0.42, wPx * 0.44, 5);
        break;
      }

      case 'war_factory': {
        // Huge Heavy Tank Hangar with sawtooth roof bays
        this.drawBeveledBlock(ctx, 10, 10, wPx - 20, hPx * 0.65, 22, '#4e5968', '#262c36');
        this.drawBeveledBlock(ctx, 16, 14, wPx - 32, hPx * 0.22, 10, pColor, '#1f2630');
        this.drawBeveledBlock(ctx, 16, 14 + hPx * 0.25, wPx - 32, hPx * 0.22, 10, pColor, '#1f2630');
        // Roll-out ramp at bottom
        this.drawHazardStripes(ctx, 20, hPx * 0.74, wPx - 40, hPx * 0.18);
        ctx.fillStyle = '#14181f';
        ctx.fillRect(28, hPx * 0.6, wPx - 56, 14);
        break;
      }

      case 'repair_pad': {
        this.drawHazardStripes(ctx, 8, 8, wPx - 16, hPx - 16);
        this.drawBeveledBlock(ctx, 14, 14, wPx - 28, hPx - 28, 5, '#475569', '#1e293b');
        // Repair cross emblem
        ctx.fillStyle = '#51cf66';
        ctx.fillRect(wPx * 0.5 - 4, hPx * 0.32, 8, hPx * 0.36);
        ctx.fillRect(wPx * 0.32, hPx * 0.5 - 4, wPx * 0.36, 8);
        break;
      }

      case 'radar_outpost': {
        this.drawBeveledBlock(ctx, 10, 16, wPx - 20, hPx - 26, 16, '#495464', '#232931');
        this.drawBeveledBlock(ctx, 16, 20, wPx * 0.45, hPx * 0.42, 10, pColor, '#1c222b');
        // Dish pedestal
        this.drawShadedCylinder(ctx, wPx * 0.65, hPx * 0.58, 14, 16, '#94a3b8', sColor);
        break;
      }

      case 'tesla_coil': {
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.72, wPx * 0.34, 10, '#3b4554', pColor);
        // Three chrome transformer rings
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.58, wPx * 0.26, 8, '#cbd5e1', '#94a3b8');
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.42, wPx * 0.22, 8, '#cbd5e1', '#94a3b8');
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.26, wPx * 0.28, 9, '#38bdf8', '#e0f2fe');
        break;
      }

      case 'flame_tower':
      case 'cryo_turret':
      case 'laser_turret': {
        const topGlow =
          buildingId === 'flame_tower'
            ? '#ff6b00'
            : buildingId === 'cryo_turret'
            ? '#38d9a9'
            : '#ff2a2a';
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.7, wPx * 0.34, 18, pColor, topGlow);
        break;
      }

      case 'tech_center': {
        this.drawBeveledBlock(ctx, 10, 16, wPx - 20, hPx - 26, 18, '#475569', '#1e293b');
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.56, wPx * 0.32, 24, pColor, '#38bdf8');
        break;
      }

      case 'palace_superweapon': {
        // Massive fortified citadel + missile/ion launch bay
        this.drawBeveledBlock(ctx, 8, 12, wPx - 16, hPx - 20, 22, '#3b4454', '#1b2028');
        this.drawBeveledBlock(ctx, 16, 18, wPx - 32, hPx - 36, 14, pColor, '#161b22');
        this.drawHazardStripes(ctx, wPx * 0.25, hPx * 0.25, wPx * 0.5, hPx * 0.5);
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.58, wPx * 0.22, 30, '#cbd5e1', sColor);
        break;
      }
    }

    this.buildingSpriteCache.set(key, canvas);
    return canvas;
  }

  /**
   * Draws a high-detail 2.5D Westwood-style unit directly onto the battlefield canvas
   * with separate drop shadow, articulated treads/wheels, hull angle, and turret angle.
   */
  public static drawUnit25D(
    ctx: CanvasRenderingContext2D,
    unitId: UnitId,
    faction: FactionId,
    screenX: number,
    screenY: number,
    scale: number,
    hullAngle: number,
    turretAngle: number,
    animTime: number,
    oreRatio = 0,
    isCloaked = false
  ): void {
    const fDef = FACTIONS[faction];
    const pColor = fDef.primaryColor;
    const sColor = fDef.secondaryColor;

    ctx.save();
    ctx.translate(screenX, screenY);
    if (isCloaked) {
      ctx.globalAlpha = 0.42;
    }

    if (
      unitId === 'light_infantry' ||
      unitId === 'rocket_trooper' ||
      unitId === 'flamer_squad' ||
      unitId === 'engineer' ||
      unitId === 'commando'
    ) {
      const isSingle = unitId === 'commando' || unitId === 'engineer';
      const offsets = isSingle
        ? [[0, 0]]
        : [
            [-8 * scale, -5 * scale],
            [8 * scale, -5 * scale],
            [0, 6 * scale]
          ];

      for (let i = 0; i < offsets.length; i++) {
        const [ox, oy] = offsets[i];
        const bob = Math.sin(animTime * 9 + i * 2) * 1.2 * scale;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(ox + 2 * scale, oy + 4 * scale, 4.5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Boots/legs
        ctx.fillStyle = '#1e242b';
        ctx.fillRect(ox - 2.5 * scale, oy + bob, 2 * scale, 4 * scale);
        ctx.fillRect(ox + 0.5 * scale, oy - bob, 2 * scale, 4 * scale);

        // Armored Torso
        ctx.fillStyle = unitId === 'engineer' ? '#f59f00' : pColor;
        ctx.fillRect(ox - 3.8 * scale, oy - 5 * scale + bob * 0.5, 7.6 * scale, 6.5 * scale);

        // Helmet / Beret
        ctx.fillStyle = unitId === 'commando' ? '#ff2a2a' : sColor;
        ctx.beginPath();
        ctx.arc(ox, oy - 7 * scale + bob * 0.5, 3.2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Weapon pointing in turretAngle
        ctx.save();
        ctx.translate(ox, oy - 2.5 * scale);
        ctx.rotate(turretAngle);
        ctx.fillStyle = unitId === 'rocket_trooper' ? '#cbd5e1' : '#11161c';
        ctx.fillRect(0, -1.3 * scale, 8.5 * scale, 2.6 * scale);
        ctx.restore();
      }

      ctx.restore();
      return;
    }

    // --- VEHICLE SHADOW ---
    ctx.save();
    ctx.translate(4 * scale, 5 * scale);
    ctx.rotate(hullAngle);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.roundRect(-18 * scale, -12 * scale, 36 * scale, 24 * scale, 4 * scale);
    ctx.fill();
    ctx.restore();

    // --- VEHICLE HULL & TREADS ---
    ctx.save();
    ctx.rotate(hullAngle);

    const isMammoth = unitId === 'mammoth_devastator';
    const isHarvester = unitId === 'harvester';
    const isMCV = unitId === 'mcv';
    const vScale = (isMammoth || isMCV || isHarvester ? 1.22 : unitId === 'scout_trike' ? 0.82 : 1.0) * scale;

    // Articulated Heavy Tank Treads (Left & Right)
    ctx.fillStyle = '#181c22';
    ctx.strokeStyle = '#0b0d10';
    ctx.lineWidth = 1.2;
    for (const ty of [-11.5 * vScale, 6.5 * vScale]) {
      ctx.fillRect(-16 * vScale, ty, 32 * vScale, 5 * vScale);
      ctx.strokeRect(-16 * vScale, ty, 32 * vScale, 5 * vScale);
      // Tread ribs
      ctx.fillStyle = '#2d3540';
      for (let rx = -14; rx <= 12; rx += 4) {
        ctx.fillRect(rx * vScale, ty + 0.6 * vScale, 2 * vScale, 3.8 * vScale);
      }
      ctx.fillStyle = '#181c22';
    }

    // Main Armored Hull Body with metallic gradient
    const hullGrad = ctx.createLinearGradient(-15 * vScale, -9 * vScale, 15 * vScale, 9 * vScale);
    hullGrad.addColorStop(0, this.brightenHex(pColor, 24));
    hullGrad.addColorStop(0.55, pColor);
    hullGrad.addColorStop(1, this.brightenHex(pColor, -32));

    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.roundRect(-15 * vScale, -8.5 * vScale, 30 * vScale, 17 * vScale, 3 * vScale);
    ctx.fill();
    ctx.strokeStyle = '#11151c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rear Engine Grille & Exhaust vents
    ctx.fillStyle = '#1f252e';
    ctx.fillRect(-13 * vScale, -5.5 * vScale, 6 * vScale, 11 * vScale);

    if (isHarvester) {
      // Harvester Front Dozer Claw & Ore Hopper
      this.drawHazardStripes(ctx, 6 * vScale, -7.5 * vScale, 7 * vScale, 15 * vScale);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(13 * vScale, -9.5 * vScale, 4 * vScale, 19 * vScale);
      // Ore Window showing current Pyronite load
      ctx.fillStyle = '#141921';
      ctx.fillRect(-6 * vScale, -5.5 * vScale, 11 * vScale, 11 * vScale);
      if (oreRatio > 0.05) {
        ctx.fillStyle = '#ff6b00';
        ctx.fillRect(
          -5 * vScale,
          -4.5 * vScale,
          9 * vScale * Math.min(1, oreRatio),
          9 * vScale
        );
      }
    } else if (isMCV) {
      this.drawHazardStripes(ctx, -11 * vScale, -6.5 * vScale, 22 * vScale, 13 * vScale);
      ctx.fillStyle = sColor;
      ctx.fillRect(-5 * vScale, -4.5 * vScale, 14 * vScale, 9 * vScale);
    }

    ctx.restore();

    // --- ROTATING TURRET / WEAPON MOUNT ---
    if (!isHarvester && !isMCV) {
      ctx.save();
      ctx.rotate(turretAngle);

      // Turret shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.arc(2 * vScale, 2 * vScale, 7.5 * vScale, 0, Math.PI * 2);
      ctx.fill();

      if (unitId === 'sonic_artillery') {
        // Dune II Sonic Tank dish emitter
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, 0, 7 * vScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(5 * vScale, 0, 4 * vScale, 7.5 * vScale, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (unitId === 'v2_launcher' || unitId === 'deviator_tank') {
        // Ballistic missile / Nerve-gas rocket on launch rail
        ctx.fillStyle = '#334155';
        ctx.fillRect(-8 * vScale, -4 * vScale, 18 * vScale, 8 * vScale);
        ctx.fillStyle = unitId === 'deviator_tank' ? '#20c997' : '#e03131';
        ctx.beginPath();
        ctx.moveTo(14 * vScale, 0);
        ctx.lineTo(6 * vScale, -3.5 * vScale);
        ctx.lineTo(-9 * vScale, -3.5 * vScale);
        ctx.lineTo(-9 * vScale, 3.5 * vScale);
        ctx.lineTo(6 * vScale, 3.5 * vScale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Single or Twin-Barrel Battle Tank Turret
        const isTwin = isMammoth || unitId === 'heavy_siege_tank' || unitId === 'stealth_tank';
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#0f1318';
        ctx.lineWidth = 1.2;

        if (isTwin) {
          for (const by of [-3.6 * vScale, 1.4 * vScale]) {
            ctx.fillRect(4 * vScale, by, 15 * vScale, 2.4 * vScale);
            ctx.strokeRect(4 * vScale, by, 15 * vScale, 2.4 * vScale);
          }
        } else {
          ctx.fillRect(4 * vScale, -1.4 * vScale, 15 * vScale, 2.8 * vScale);
          ctx.strokeRect(4 * vScale, -1.4 * vScale, 15 * vScale, 2.8 * vScale);
        }

        // Armored Turret Cupola
        const tGrad = ctx.createRadialGradient(-2 * vScale, -2 * vScale, 1, 0, 0, 8 * vScale);
        tGrad.addColorStop(0, this.brightenHex(pColor, 32));
        tGrad.addColorStop(1, this.brightenHex(pColor, -20));
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.roundRect(-7 * vScale, -6.5 * vScale, 14 * vScale, 13 * vScale, 3 * vScale);
        ctx.fill();
        ctx.stroke();

        // Commander hatch
        ctx.fillStyle = sColor;
        ctx.beginPath();
        ctx.arc(-1.5 * vScale, 0, 2.6 * vScale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Generates a Westwood Red Alert style Cameo Thumbnail DataURL (120x84) for the right sidebar.
   */
  public static getCameoUrl(itemId: BuildingId | UnitId, faction: FactionId, isBuilding: boolean): string {
    const key = `cameo_${itemId}_${faction}`;
    const cached = this.cameoUrlCache.get(key);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 84;
    const ctx = canvas.getContext('2d')!;
    const fDef = FACTIONS[faction];

    // Dramatic C&C studio spotlight background
    const bgGrad = ctx.createRadialGradient(60, 42, 6, 60, 42, 68);
    bgGrad.addColorStop(0, '#2c3e55');
    bgGrad.addColorStop(0.6, '#141d29');
    bgGrad.addColorStop(1, '#080b10');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 120, 84);

    // Subtle horizon grid line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 56);
    ctx.lineTo(120, 56);
    ctx.stroke();

    if (isBuilding) {
      const bSprite = this.getBuildingSprite(itemId as BuildingId, faction, 36);
      const scale = Math.min(86 / bSprite.width, 62 / bSprite.height);
      const dw = bSprite.width * scale;
      const dh = bSprite.height * scale;
      ctx.drawImage(bSprite, (120 - dw) / 2, (80 - dh) / 2, dw, dh);
    } else {
      this.drawUnit25D(
        ctx,
        itemId as UnitId,
        faction,
        60,
        44,
        1.55,
        -Math.PI / 5,
        -Math.PI / 6,
        0,
        0.75,
        false
      );
    }

    // Metallic beveled cameo border with corner rivets
    ctx.strokeStyle = fDef.primaryColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 118, 82);

    const url = canvas.toDataURL();
    this.cameoUrlCache.set(key, url);
    return url;
  }

  /**
   * Generates a high-detail pixel/2.5D Commander Mentat Portrait DataURL (160x160).
   */
  public static getMentatPortraitUrl(faction: FactionId): string {
    const cached = this.mentatUrlCache.get(faction);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    const fDef = FACTIONS[faction];

    // Background tactical screen
    const bg = ctx.createRadialGradient(80, 70, 10, 80, 80, 100);
    bg.addColorStop(0, '#1e2d40');
    bg.addColorStop(1, '#070a0f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 160, 160);

    // Grid lines
    ctx.strokeStyle = 'rgba(81, 207, 102, 0.12)';
    for (let i = 0; i < 160; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 160);
      ctx.moveTo(0, i);
      ctx.lineTo(160, i);
      ctx.stroke();
    }

    // Armored Shoulders & Uniform
    this.drawBeveledBlock(ctx, 26, 104, 108, 52, 16, fDef.primaryColor, '#141a24');
    // Epaulettes
    this.drawHazardStripes(ctx, 26, 104, 22, 10);
    this.drawHazardStripes(ctx, 112, 104, 22, 10);

    // Head & Jaw
    ctx.fillStyle = faction === 'nexus' ? '#94d2bd' : '#e0b187';
    ctx.beginPath();
    ctx.roundRect(54, 42, 52, 58, 12);
    ctx.fill();
    ctx.strokeStyle = '#141920';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Helmet / Commissar Cap / Cybernetic Hood
    ctx.fillStyle = fDef.primaryColor;
    ctx.beginPath();
    ctx.roundRect(48, 24, 64, 26, 8);
    ctx.fill();
    ctx.stroke();

    // Visor / Tactical Optics
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(58, 56, 44, 12);
    ctx.fillStyle = fDef.secondaryColor;
    ctx.fillRect(62, 59, 14, 6);
    ctx.fillRect(84, 59, 14, 6);

    // Collar microphone & insignia
    ctx.fillStyle = fDef.secondaryColor;
    ctx.beginPath();
    ctx.arc(80, 36, 6, 0, Math.PI * 2);
    ctx.fill();

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < 160; y += 3) {
      ctx.fillRect(0, y, 160, 1);
    }

    const url = canvas.toDataURL();
    this.mentatUrlCache.set(faction, url);
    return url;
  }

  public static brightenHex(hex: string, delta: number): string {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + delta));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + delta));
    const b = Math.max(0, Math.min(255, (num & 0xff) + delta));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}

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

  /**
   * Helper: Draw industrial ventilation / heat-sink louver grilles
   */
  public static drawVentGrille(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    darkColor = '#10141b',
    louverColor = '#475569'
  ): void {
    ctx.fillStyle = darkColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#0a0d12';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    const step = 4;
    ctx.strokeStyle = louverColor;
    ctx.lineWidth = 1.5;
    for (let ly = y + 2; ly < y + h - 1; ly += step) {
      ctx.beginPath();
      ctx.moveTo(x + 2, ly);
      ctx.lineTo(x + w - 2, ly);
      ctx.stroke();
    }
  }

  /**
   * Helper: Draw a luminous glowing plasma/power conduit tube
   */
  public static drawGlowingConduit(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = '#38bdf8',
    glowColor = 'rgba(56, 189, 248, 0.5)'
  ): void {
    ctx.save();
    // Outer glow
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Core tube
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Hot center highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Helper: Draw diamond-tread steel safety plating
   */
  public static drawDiamondTread(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    baseColor = '#3e4754',
    treadColor = '#242a33'
  ): void {
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = treadColor;
    ctx.lineWidth = 1;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let d = -h; d < w + h; d += 6) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + h, y + h);
      ctx.moveTo(x + d + h, y);
      ctx.lineTo(x + d, y + h);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = '#151920';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, w, h);
  }

  /**
   * Helper: Draw an individual interlocking pre-cast concrete slab tile (48x48)
   */
  public static drawConcreteSlabTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size = 48
  ): void {
    // Drop shadow & dark joint
    ctx.fillStyle = '#11151a';
    ctx.fillRect(x, y, size, size);

    // Main precast concrete body with beveled edges
    const grad = ctx.createLinearGradient(x + 2, y + 2, x + size - 2, y + size - 2);
    grad.addColorStop(0, '#5a6472');
    grad.addColorStop(0.5, '#454e5b');
    grad.addColorStop(1, '#2c333e');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // Bevel highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + size - 2);
    ctx.lineTo(x + 2, y + 2);
    ctx.lineTo(x + size - 2, y + 2);
    ctx.stroke();

    // Center diamond steel plate
    this.drawDiamondTread(ctx, x + 11, y + 11, size - 22, size - 22, '#505a68', '#2d343f');

    // Corner recessed anchor bolts in cast sockets
    const corners = [
      [x + 6, y + 6],
      [x + size - 7, y + 6],
      [x + 6, y + size - 7],
      [x + size - 7, y + size - 7]
    ];
    for (const [bx, by] of corners) {
      ctx.fillStyle = '#151920';
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bx - 0.75, by - 0.75, 1.5, 1.5);
    }
  }

  /**
   * Helper: Draw glowing Pyronite crystal clusters inside hoppers/vats
   */
  public static drawPyroniteCrystals(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number
  ): void {
    ctx.save();
    // Inner molten magma glow
    const radial = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(w, h) * 0.7);
    radial.addColorStop(0, '#fff3bf');
    radial.addColorStop(0.35, '#ff6b00');
    radial.addColorStop(0.8, '#c92a2a');
    radial.addColorStop(1, 'rgba(15, 20, 28, 0.85)');
    ctx.fillStyle = radial;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

    // Shimmering crystal facets
    const crystalOffsets = [
      [-w * 0.25, -h * 0.1, 8, 14, '#ff922b'],
      [w * 0.15, -h * 0.2, 10, 16, '#ffa94d'],
      [0, h * 0.15, 7, 12, '#ffe066'],
      [-w * 0.1, h * 0.25, 9, 13, '#f76707']
    ];
    for (const [ox, oy, cw, ch, col] of crystalOffsets) {
      ctx.fillStyle = col as string;
      ctx.beginPath();
      ctx.moveTo(cx + (ox as number), cy + (oy as number) - (ch as number) / 2);
      ctx.lineTo(cx + (ox as number) + (cw as number) / 2, cy + (oy as number));
      ctx.lineTo(cx + (ox as number), cy + (oy as number) + (ch as number) / 2);
      ctx.lineTo(cx + (ox as number) - (cw as number) / 2, cy + (oy as number));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
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

    const pColor = fDef.primaryColor;
    const sColor = fDef.secondaryColor;
    const emColor = fDef.emissiveHex ? `#${fDef.emissiveHex.toString(16).padStart(6, '0')}` : '#38bdf8';

    // 1. Reinforced Foundation Plinth (for non-slab buildings)
    const isSlab = buildingId === 'concrete_slab_2x2' || buildingId === 'concrete_slab_3x3';
    if (!isSlab) {
      // Outer drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(4, 6, wPx - 8, hPx - 6);

      // Beveled titanium/concrete foundation apron
      this.drawBeveledBlock(ctx, 3, 4, wPx - 6, hPx - 6, 8, '#323944', '#1c2128', '#0f1318', true);

      // Corner anchor flanges with heavy bolts
      for (const [bx, by] of [
        [6, 7],
        [wPx - 10, 7],
        [6, hPx - 11],
        [wPx - 10, hPx - 11]
      ]) {
        ctx.fillStyle = '#10141a';
        ctx.fillRect(bx, by, 5, 5);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(bx + 1, by + 1, 3, 3);
      }

      // Recessed cable conduits with faction status LEDs
      ctx.fillStyle = '#0f1318';
      ctx.fillRect(16, hPx - 6, wPx - 32, 2);
      for (let lx = 24; lx < wPx - 24; lx += 18) {
        ctx.fillStyle = emColor;
        ctx.fillRect(lx, hPx - 7, 3, 3);
      }
    }

    switch (buildingId) {
      case 'concrete_slab_2x2':
      case 'concrete_slab_3x3': {
        const tiles = def.footprintW;
        for (let ty = 0; ty < tiles; ty++) {
          for (let tx = 0; tx < tiles; tx++) {
            this.drawConcreteSlabTile(ctx, tx * tilePx, ty * tilePx, tilePx);
          }
        }
        // Outer perimeter hazard caution borders
        this.drawHazardStripes(ctx, 4, 4, wPx - 8, 6);
        this.drawHazardStripes(ctx, 4, hPx - 10, wPx - 8, 6);
        this.drawHazardStripes(ctx, 4, 10, 6, hPx - 20);
        this.drawHazardStripes(ctx, wPx - 10, 10, 6, hPx - 20);

        // Stenciled tactical serials
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`KRYOS-SLAB // ${wPx}x${hPx}`, 14, 20);
        break;
      }

      case 'construction_yard': {
        // Massive Multi-Tier Command Citadel & Heavy Gantry Crane
        // Rear/Left Command Citadel Block
        this.drawBeveledBlock(ctx, 10, 12, wPx * 0.62, hPx * 0.58, 22, '#485362', '#222831');
        // Sloped upper ballistic armor roof in faction color
        this.drawBeveledBlock(ctx, 16, 16, wPx * 0.52, hPx * 0.38, 12, pColor, '#18202c');

        // Command bridge panoramic observation slits with glowing cyan glass & scanlines
        ctx.fillStyle = '#0b0f17';
        ctx.fillRect(22, 26, wPx * 0.44, 10);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(24, 28, wPx * 0.44 - 4, 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(26, 29, 12, 4);

        // Heat-sink radiator louvers on citadel roof
        this.drawVentGrille(ctx, 22, 42, wPx * 0.44, 12, '#141820', '#64748b');

        // Front Lower Assembly Bay Door
        this.drawBeveledBlock(ctx, 14, hPx * 0.64, wPx * 0.48, hPx * 0.28, 8, '#262d37', '#12161c');
        this.drawHazardStripes(ctx, 18, hPx * 0.72, wPx * 0.42, 14);
        // Motorized roll-up garage door slats
        ctx.strokeStyle = '#0f131a';
        ctx.lineWidth = 1.2;
        for (let sy = hPx * 0.73; sy < hPx * 0.84; sy += 3) {
          ctx.beginPath();
          ctx.moveTo(20, sy);
          ctx.lineTo(18 + wPx * 0.42 - 2, sy);
          ctx.stroke();
        }
        // Runway docking guide LEDs
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(16, hPx * 0.66, 4, 4);
        ctx.fillStyle = '#f59f00';
        ctx.fillRect(14 + wPx * 0.48 - 6, hPx * 0.66, 4, 4);

        // Heavy Telescopic Gantry Crane on the Right
        const craneBaseX = wPx * 0.78;
        const craneBaseY = hPx * 0.68;
        this.drawShadedCylinder(ctx, craneBaseX, craneBaseY, 18, 26, sColor, pColor);

        // Crane lattice mast & diagonal boom
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(craneBaseX, craneBaseY - 26);
        ctx.lineTo(craneBaseX, craneBaseY - 58);
        ctx.lineTo(craneBaseX - wPx * 0.38, craneBaseY - 48);
        ctx.stroke();

        // Crane hoist cables & forged hook
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(craneBaseX - wPx * 0.26, craneBaseY - 49);
        ctx.lineTo(craneBaseX - wPx * 0.26, craneBaseY - 22);
        ctx.stroke();

        // Heavy Crane Hook
        ctx.fillStyle = '#ffd43b';
        ctx.fillRect(craneBaseX - wPx * 0.26 - 3, craneBaseY - 22, 6, 6);
        ctx.strokeStyle = '#151920';
        ctx.strokeRect(craneBaseX - wPx * 0.26 - 3, craneBaseY - 22, 6, 6);

        // Crane apex red aviation strobe beacon
        ctx.fillStyle = '#ff2b2b';
        ctx.beginPath();
        ctx.arc(craneBaseX, craneBaseY - 60, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 43, 43, 0.45)';
        ctx.beginPath();
        ctx.arc(craneBaseX, craneBaseY - 60, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'power_plant':
      case 'adv_power_plant': {
        const isAdv = buildingId === 'adv_power_plant';
        // Heavy Sloped Transformer Generator Housing
        this.drawBeveledBlock(ctx, 10, 16, wPx - 20, hPx - 26, 18, '#434e5e', '#1f2630');

        // Radiator heat-sink fins along the flank
        this.drawVentGrille(ctx, 14, 22, wPx * 0.24, hPx - 38, '#10141a', '#525d6b');
        this.drawVentGrille(ctx, wPx - 14 - wPx * 0.24, 22, wPx * 0.24, hPx - 38, '#10141a', '#525d6b');

        // Central High-Voltage Plasma Conduits
        this.drawGlowingConduit(ctx, 14, hPx * 0.52, wPx - 14, hPx * 0.52, emColor, 'rgba(0, 240, 255, 0.4)');

        // Turbine Intakes with spiral blades & wire mesh
        const turbineCount = isAdv ? 4 : 2;
        const coords = isAdv
          ? [
              [wPx * 0.32, hPx * 0.38, 14],
              [wPx * 0.68, hPx * 0.38, 14],
              [wPx * 0.32, hPx * 0.68, 14],
              [wPx * 0.68, hPx * 0.68, 14]
            ]
          : [
              [wPx * 0.36, hPx * 0.56, 17],
              [wPx * 0.68, hPx * 0.56, 16]
            ];

        for (const [tx, ty, r] of coords) {
          this.drawShadedCylinder(ctx, tx, ty, r, isAdv ? 20 : 16, '#2d3540', pColor);
          // Wire mesh grille & blade hub
          ctx.fillStyle = '#0f141a';
          ctx.beginPath();
          ctx.arc(tx, ty - (isAdv ? 20 : 16), r * 0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = emColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(tx, ty - (isAdv ? 20 : 16), 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Advanced Power Plant: Elevated Central Magnetic Fusion Torus
        if (isAdv) {
          const fx = wPx * 0.5;
          const fy = hPx * 0.52;
          this.drawShadedCylinder(ctx, fx, fy, 16, 26, sColor, '#ffffff');
          // Magnetic confinement ring
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(fx, fy - 26, 18, 9, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Hazard caution stripe at bottom
        this.drawHazardStripes(ctx, 16, hPx - 16, wPx - 32, 6);
        break;
      }

      case 'refinery': {
        // Multi-Story Heavy Pyronite Processing Plant
        this.drawBeveledBlock(ctx, 10, 10, wPx - 20, hPx * 0.54, 20, '#4a5666', '#212832');

        // Twin Towering Pyronite Cracking Columns with Sight-Glass Level Tubes
        for (const sx of [wPx * 0.28, wPx * 0.56]) {
          this.drawShadedCylinder(ctx, sx, hPx * 0.44, 18, 30, pColor, sColor);
          // Reinforcing steel pressure rings
          ctx.strokeStyle = '#18202a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(sx, hPx * 0.44 - 10, 18, 6, 0, 0, Math.PI);
          ctx.ellipse(sx, hPx * 0.44 - 20, 18, 6, 0, 0, Math.PI);
          ctx.stroke();

          // Vertical Pyronite liquid sight-glass tube (glowing molten red-orange!)
          ctx.fillStyle = '#0f1318';
          ctx.fillRect(sx - 3, hPx * 0.44 - 26, 6, 22);
          ctx.fillStyle = '#ff5500';
          ctx.fillRect(sx - 2, hPx * 0.44 - 24, 4, 18);
          ctx.fillStyle = '#ffea79';
          ctx.fillRect(sx - 1, hPx * 0.44 - 20, 2, 8);
        }

        // Tall Industrial Flare Chimney with burn-off flame
        const chX = wPx * 0.82;
        const chY = hPx * 0.38;
        this.drawShadedCylinder(ctx, chX, chY, 11, 38, '#262d36', '#14181f');
        // Flare flame
        ctx.fillStyle = '#ffa94d';
        ctx.beginPath();
        ctx.moveTo(chX - 4, chY - 38);
        ctx.quadraticCurveTo(chX - 8, chY - 50, chX, chY - 56);
        ctx.quadraticCurveTo(chX + 8, chY - 50, chX + 4, chY - 38);
        ctx.fill();
        ctx.fillStyle = '#fff3bf';
        ctx.beginPath();
        ctx.moveTo(chX - 2, chY - 38);
        ctx.lineTo(chX, chY - 48);
        ctx.lineTo(chX + 2, chY - 38);
        ctx.fill();

        // Harvester Docking Bay with Rubber Buffers & Ore Dump Pit
        this.drawHazardStripes(ctx, 16, hPx * 0.62, wPx - 32, hPx * 0.32);
        // Recessed concrete pit
        ctx.fillStyle = '#11151a';
        ctx.fillRect(24, hPx * 0.66, wPx - 48, hPx * 0.24);

        // Glowing Ore Grate Crusher with hot Pyronite crystals
        this.drawPyroniteCrystals(ctx, wPx * 0.5, hPx * 0.78, wPx - 64, hPx * 0.16);
        // Steel crusher bars over pit
        ctx.strokeStyle = '#1b222c';
        ctx.lineWidth = 2;
        for (let bx = 32; bx < wPx - 32; bx += 8) {
          ctx.beginPath();
          ctx.moveTo(bx, hPx * 0.7);
          ctx.lineTo(bx, hPx * 0.86);
          ctx.stroke();
        }

        // Docking Runway Guide Lights
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(18, hPx * 0.64, 4, 6);
        ctx.fillRect(wPx - 22, hPx * 0.64, 4, 6);
        break;
      }

      case 'silo': {
        // Quad Cylindrical Pressurized Pyronite Silo Vats
        const centers = [
          [wPx * 0.32, hPx * 0.42],
          [wPx * 0.68, hPx * 0.42],
          [wPx * 0.32, hPx * 0.74],
          [wPx * 0.68, hPx * 0.74]
        ];
        for (const [sx, sy] of centers) {
          this.drawShadedCylinder(ctx, sx, sy, 14, 20, pColor, sColor);
          // Glowing Ore Level Sight Gauge
          ctx.fillStyle = '#0f141a';
          ctx.fillRect(sx - 2, sy - 17, 4, 14);
          ctx.fillStyle = '#ff6b00';
          ctx.fillRect(sx - 1.5, sy - 15, 3, 10);
        }
        // Interconnected chrome manifold pipes
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(wPx * 0.32, hPx * 0.42 - 20);
        ctx.lineTo(wPx * 0.68, hPx * 0.42 - 20);
        ctx.moveTo(wPx * 0.32, hPx * 0.74 - 20);
        ctx.lineTo(wPx * 0.68, hPx * 0.74 - 20);
        ctx.stroke();
        break;
      }

      case 'barracks': {
        // Hardened Military Garrison & Training Center
        this.drawBeveledBlock(ctx, 10, 14, wPx - 20, hPx * 0.58, 18, pColor, '#1d242e');

        // Armored Observation Cupola with red tactical lighting slit
        this.drawBeveledBlock(ctx, 18, 18, wPx * 0.44, 18, 6, '#28323f', '#141820');
        ctx.fillStyle = '#ff2b2b';
        ctx.fillRect(22, 22, wPx * 0.44 - 8, 4);

        // Satellite Communications Dish with antenna beacon
        const commX = wPx * 0.78;
        const commY = hPx * 0.38;
        this.drawShadedCylinder(ctx, commX, commY, 9, 26, '#cbd5e1', sColor);
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(commX, commY - 28, 3, 0, Math.PI * 2);
        ctx.fill();

        // Armored Personnel Air-Lock Door with biometric pad & hazard frame
        this.drawHazardStripes(ctx, 20, hPx * 0.72, wPx - 40, 14);
        this.drawBeveledBlock(ctx, 24, hPx * 0.68, wPx - 48, 16, 6, '#18202a', '#0d1116');
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(26, hPx * 0.7, 4, 4);
        break;
      }

      case 'sandbag_wall': {
        this.drawBeveledBlock(ctx, 4, 8, wPx - 8, hPx - 14, 12, '#8a7e6b', '#4a4336');
        this.drawBeveledBlock(ctx, 10, 4, wPx - 20, hPx - 18, 8, pColor, '#262b32');
        break;
      }

      case 'pillbox': {
        // Faceted Octagonal Concrete Bunker with Dual Machine Gun Embrasures
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.65, wPx * 0.4, 18, '#4f5968', pColor);

        // Dark Horizontal Firing Embrasure with red night-vision glow
        ctx.fillStyle = '#0a0d12';
        ctx.fillRect(wPx * 0.22, hPx * 0.42, wPx * 0.56, 7);
        ctx.fillStyle = '#e03131';
        ctx.fillRect(wPx * 0.26, hPx * 0.44, wPx * 0.48, 2);

        // Twin Machine Gun Barrels protruding
        ctx.fillStyle = '#1c222b';
        ctx.fillRect(wPx * 0.35, hPx * 0.38, 4, 10);
        ctx.fillRect(wPx * 0.55, hPx * 0.38, 4, 10);
        break;
      }

      case 'war_factory': {
        // Huge Heavy Armor Assembly Plant with Sawtooth Roofs & Overhead Gantry
        this.drawBeveledBlock(ctx, 10, 10, wPx - 20, hPx * 0.66, 24, '#475363', '#1e252f');

        // Sawtooth Bay Roofs with Factory Skylights
        for (const ry of [14, 14 + hPx * 0.26]) {
          this.drawBeveledBlock(ctx, 16, ry, wPx - 32, hPx * 0.22, 10, pColor, '#171d26');
          // Skylights casting interior industrial halogen warmth
          ctx.fillStyle = '#fef08a';
          for (let sx = 26; sx < wPx - 32; sx += 22) {
            ctx.fillRect(sx, ry + 4, 14, 6);
          }
        }

        // Twin Heavy Angled Exhaust Chimneys with soot gradient
        this.drawShadedCylinder(ctx, 22, 28, 8, 30, '#2d3540', '#14181f');
        this.drawShadedCylinder(ctx, wPx - 22, 28, 8, 30, '#2d3540', '#14181f');

        // Massive Corrugated Rollout Blast Doors with hazard apron
        this.drawHazardStripes(ctx, 18, hPx * 0.74, wPx - 36, hPx * 0.2);
        this.drawBeveledBlock(ctx, 24, hPx * 0.62, wPx - 48, 18, 6, '#18202a', '#0c1015');

        // Overhead robotic weld gantry with electric arc flash
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(wPx * 0.5, hPx * 0.68, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(wPx * 0.5, hPx * 0.68, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'repair_pad': {
        // Heavy Hydraulic Service Platform with Corner Gantries & Green Cross
        this.drawHazardStripes(ctx, 6, 6, wPx - 12, hPx - 12);
        this.drawDiamondTread(ctx, 12, 12, wPx - 24, hPx - 24, '#38414e', '#1e242c');

        // Glowing Green Repair Cross
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(wPx * 0.5 - 5, hPx * 0.28, 10, hPx * 0.44);
        ctx.fillRect(wPx * 0.28, hPx * 0.5 - 5, wPx * 0.44, 10);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(wPx * 0.5 - 2, hPx * 0.32, 4, hPx * 0.36);
        ctx.fillRect(wPx * 0.32, hPx * 0.5 - 2, wPx * 0.36, 4);

        // Articulated robotic repair gantries at left and right
        this.drawShadedCylinder(ctx, 16, hPx * 0.5, 7, 22, '#cbd5e1', sColor);
        this.drawShadedCylinder(ctx, wPx - 16, hPx * 0.5, 7, 22, '#cbd5e1', sColor);
        break;
      }

      case 'radar_outpost': {
        // Armored Telemetry Center with Server Heat Exchangers & Phased Array Pedestal
        this.drawBeveledBlock(ctx, 10, 16, wPx - 20, hPx - 26, 18, '#445060', '#1c222b');
        this.drawBeveledBlock(ctx, 16, 20, wPx * 0.45, hPx * 0.42, 10, pColor, '#151b22');

        // Server heat dissipation grills
        this.drawVentGrille(ctx, 20, 26, wPx * 0.36, 12, '#0f1318', '#64748b');

        // Circular Rotating Turntable Pedestal with shielded power conduits
        this.drawShadedCylinder(ctx, wPx * 0.65, hPx * 0.58, 16, 20, '#94a3b8', sColor);
        this.drawGlowingConduit(ctx, wPx * 0.45, hPx * 0.65, wPx * 0.65, hPx * 0.65, emColor, 'rgba(0,240,255,0.4)');
        break;
      }

      case 'tesla_coil': {
        // High-Voltage Capacitor Plinth with 3 Chrome Toroidal Transformer Rings
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.72, wPx * 0.38, 14, '#384250', pColor);
        this.drawHazardStripes(ctx, wPx * 0.32, hPx * 0.78, wPx * 0.36, 6);

        // 3 Chrome Induction Rings
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.6, wPx * 0.3, 8, '#cbd5e1', '#64748b');
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.46, wPx * 0.25, 8, '#cbd5e1', '#64748b');
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.32, wPx * 0.28, 10, '#38bdf8', '#e0f2fe');
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
        this.drawShadedCylinder(ctx, wPx * 0.5, hPx * 0.72, wPx * 0.36, 20, pColor, topGlow);
        // Armor ring with hex bolts
        ctx.strokeStyle = '#18202b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(wPx * 0.5, hPx * 0.72 - 10, wPx * 0.36, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'tech_center': {
        // Futuristic Geodesic Research Dome & Data Link Uplink
        this.drawBeveledBlock(ctx, 10, 16, wPx - 20, hPx - 26, 20, '#424e60', '#1c232c');

        // Geodesic Research Dome glowing with cyan telemetry
        const dmX = wPx * 0.5;
        const dmY = hPx * 0.56;
        this.drawShadedCylinder(ctx, dmX, dmY, wPx * 0.34, 28, pColor, '#38bdf8');

        // Hexagonal glass facets and digital circuit lines
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(dmX, dmY - 28, wPx * 0.24, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        this.drawGlowingConduit(ctx, 16, hPx * 0.82, wPx - 16, hPx * 0.82, '#38bdf8', 'rgba(56, 189, 248, 0.4)');
        break;
      }

      case 'palace_superweapon': {
        // Massive Imperial Fortress with Retracted Blast Doors & Subterranean Silo
        this.drawBeveledBlock(ctx, 8, 12, wPx - 16, hPx - 20, 24, '#343c4a', '#171b22');
        this.drawBeveledBlock(ctx, 16, 18, wPx - 32, hPx - 36, 16, pColor, '#12171e');

        // Center Subterranean Superweapon Silo Pit
        const sX = wPx * 0.5;
        const sY = hPx * 0.54;
        ctx.fillStyle = '#080b0f';
        ctx.beginPath();
        ctx.ellipse(sX, sY, wPx * 0.3, hPx * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Radiation caution hazard border around silo pit
        this.drawHazardStripes(ctx, wPx * 0.2, hPx * 0.25, wPx * 0.6, 8);
        this.drawHazardStripes(ctx, wPx * 0.2, hPx * 0.75, wPx * 0.6, 8);

        // Tactical Superweapon Warhead / Orbital Cannon Lens
        this.drawShadedCylinder(ctx, sX, sY + 6, wPx * 0.2, 34, '#cbd5e1', sColor);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(sX, sY - 28, 4, 0, Math.PI * 2);
        ctx.fill();
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
    const fDef = FACTIONS[faction];
    if (fDef?.portraitImage) {
      return fDef.portraitImage;
    }

    const cached = this.mentatUrlCache.get(faction);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

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

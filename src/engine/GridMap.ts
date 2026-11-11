import { BiomeType } from '../data/campaigns';

export type TerrainType = 'sand' | 'rock' | 'mountain' | 'ore' | 'crystal_vent';

export interface TileCell {
  x: number;
  y: number;
  terrain: TerrainType;
  elevation: number;
  oreAmount: number; // 0..600
  hasSlab: boolean;
  slabOwner: number; // 0 = neutral, 1 = player, 2 = enemy
  buildingEntityId: number | null;
  visibility: number; // 0 = shroud (unexplored), 1 = fog (explored), 2 = visible
}

export interface SerializedGridMap {
  size: number;
  biome: BiomeType;
  seed: number;
  cells: TileCell[];
}

export class GridMap {
  public readonly size: number;
  public biome: BiomeType;
  public seed: number;
  public cells: TileCell[];

  constructor(size = 56, biome: BiomeType = 'desert', seed = 101) {
    this.size = size;
    this.biome = biome;
    this.seed = seed;
    this.cells = new Array(size * size);
    this.generateFromSeed(seed);
  }

  public idx(x: number, y: number): number {
    return y * this.size + x;
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  public getCell(x: number, y: number): TileCell | undefined {
    if (!this.inBounds(x, y)) return undefined;
    return this.cells[this.idx(x, y)];
  }

  private pseudoRandom(s: number): () => number {
    let state = s || 1337;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  public generateFromSeed(seed: number): void {
    this.seed = seed;
    const rand = this.pseudoRandom(seed);

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        this.cells[this.idx(x, y)] = {
          x,
          y,
          terrain: 'sand',
          elevation: 0,
          oreAmount: 0,
          hasSlab: false,
          slabOwner: 0,
          buildingEntityId: null,
          visibility: 0
        };
      }
    }

    // 1. Create Player Base Rock Plateau (South-West: around 5..20, 36..51)
    this.paintRockPlateau(4, this.size - 20, 17, 16);

    // 2. Create Primary Enemy Base Rock Plateau (North-East: around 35..51, 4..20)
    this.paintRockPlateau(this.size - 21, 4, 17, 16);

    // 3. Create Central & Flanking Rock Outcrops
    const mid = Math.floor(this.size / 2);
    this.paintRockPlateau(mid - 5, mid - 5, 10, 10);
    this.paintRockPlateau(8, 8, 9, 9);
    this.paintRockPlateau(this.size - 17, this.size - 17, 10, 10);

    // 4. Create Mountain Ridges (Tactical Choke Points)
    for (let i = 0; i < 6; i++) {
      const mx = Math.floor(14 + rand() * (this.size - 28));
      const my = Math.floor(14 + rand() * (this.size - 28));
      // Avoid exact center
      if (Math.hypot(mx - mid, my - mid) < 7) continue;
      const len = 3 + Math.floor(rand() * 4);
      const horiz = rand() > 0.5;
      for (let k = 0; k < len; k++) {
        const cx = horiz ? mx + k : mx;
        const cy = horiz ? my : my + k;
        const cell = this.getCell(cx, cy);
        if (cell && cell.terrain === 'sand') {
          cell.terrain = 'mountain';
          cell.elevation = 1.4 + rand() * 0.8;
        }
      }
    }

    // 5. Create Rich Pyronite Ore Fields
    // Near Player Base
    this.paintOrePatch(23, this.size - 14, 4);
    // Near Enemy Base
    this.paintOrePatch(this.size - 25, 13, 4);
    // Rich Central & Flank Ore Fields
    this.paintOrePatch(mid - 9, mid + 7, 5);
    this.paintOrePatch(mid + 8, mid - 8, 5);
    this.paintOrePatch(13, 22, 4);
    this.paintOrePatch(this.size - 14, this.size - 24, 4);
  }

  public paintRockPlateau(startX: number, startY: number, w: number, h: number): void {
    for (let y = startY; y < startY + h; y++) {
      for (let x = startX; x < startX + w; x++) {
        const cell = this.getCell(x, y);
        if (!cell) continue;
        // Rounded corners
        const isCorner =
          (x === startX || x === startX + w - 1) && (y === startY || y === startY + h - 1);
        if (isCorner) continue;
        cell.terrain = 'rock';
        cell.elevation = 0.22;
        cell.oreAmount = 0;
      }
    }
  }

  public paintOrePatch(cx: number, cy: number, radius: number): void {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        const cell = this.getCell(x, y);
        if (!cell) continue;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= radius && cell.terrain === 'sand') {
          if (x === cx && y === cy) {
            cell.terrain = 'crystal_vent';
            cell.oreAmount = 600;
            cell.elevation = 0.35;
          } else {
            cell.terrain = 'ore';
            cell.oreAmount = Math.round(250 + (1 - dist / (radius + 0.5)) * 350);
          }
        }
      }
    }
  }

  public isPassableForUnit(x: number, y: number, ignoreEntityId?: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;
    if (cell.terrain === 'mountain') return false;
    if (cell.buildingEntityId !== null && cell.buildingEntityId !== ignoreEntityId) {
      return false;
    }
    return true;
  }

  /**
   * Checks if a building or concrete slab can be placed at top-left (tx, ty) with size (w, h).
   * In Dune II / Red Alert:
   * - Must be on 'rock' terrain
   * - Must not overlap mountains or existing buildings (unless placing a building onto existing slabs)
   * - Must be within build proximity (8 tiles) of a friendly structure of the same owner
   */
  public canPlaceStructure(
    tx: number,
    ty: number,
    w: number,
    h: number,
    owner: number,
    isSlab: boolean,
    ignoreProximity = false
  ): { valid: boolean; reason?: string; slabCoverageRatio: number } {
    let slabCells = 0;
    const totalCells = w * h;

    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        const cell = this.getCell(x, y);
        if (!cell) {
          return { valid: false, reason: 'Out of bounds', slabCoverageRatio: 0 };
        }
        if (cell.terrain !== 'rock') {
          return { valid: false, reason: 'Requires solid rock plateau', slabCoverageRatio: 0 };
        }
        if (cell.buildingEntityId !== null) {
          return { valid: false, reason: 'Tile occupied by structure', slabCoverageRatio: 0 };
        }
        if (cell.hasSlab) {
          slabCells++;
        }
      }
    }

    if (!ignoreProximity) {
      let nearFriendly = false;
      const searchRadius = 9;
      for (let y = ty - searchRadius; y < ty + h + searchRadius && !nearFriendly; y++) {
        for (let x = tx - searchRadius; x < tx + w + searchRadius; x++) {
          const c = this.getCell(x, y);
          if (!c) continue;
          if (c.slabOwner === owner && (c.buildingEntityId !== null || c.hasSlab)) {
            nearFriendly = true;
            break;
          }
        }
      }
      if (!nearFriendly) {
        return { valid: false, reason: 'Too far from existing base structures', slabCoverageRatio: 0 };
      }
    }

    if (isSlab && slabCells === totalCells) {
      return { valid: false, reason: 'Concrete slabs already laid here', slabCoverageRatio: 1 };
    }

    return {
      valid: true,
      slabCoverageRatio: totalCells > 0 ? slabCells / totalCells : 1
    };
  }

  public placeConcreteSlabs(tx: number, ty: number, w: number, h: number, owner: number): void {
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        const cell = this.getCell(x, y);
        if (cell && cell.terrain === 'rock') {
          cell.hasSlab = true;
          cell.slabOwner = owner;
        }
      }
    }
  }

  public occupyBuilding(
    tx: number,
    ty: number,
    w: number,
    h: number,
    entityId: number,
    owner: number,
    withAutoSlab = false
  ): number {
    let slabCells = 0;
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        const cell = this.getCell(x, y);
        if (!cell) continue;
        if (withAutoSlab) {
          cell.hasSlab = true;
        }
        if (cell.hasSlab) {
          slabCells++;
        }
        cell.slabOwner = owner;
        cell.buildingEntityId = entityId;
      }
    }
    return slabCells / (w * h);
  }

  public clearBuildingOccupancy(entityId: number): void {
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i].buildingEntityId === entityId) {
        this.cells[i].buildingEntityId = null;
      }
    }
  }

  public regrowOreNearVents(): void {
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      if (c.terrain === 'crystal_vent') {
        c.oreAmount = Math.min(600, c.oreAmount + 40);
        // Spread to random neighbor
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, -1]
        ];
        for (const [dx, dy] of dirs) {
          const n = this.getCell(c.x + dx, c.y + dy);
          if (n && (n.terrain === 'sand' || n.terrain === 'ore') && n.buildingEntityId === null) {
            n.terrain = 'ore';
            n.oreAmount = Math.min(600, n.oreAmount + 35);
          }
        }
      }
    }
  }

  public revealAround(cx: number, cy: number, radius: number): void {
    const r2 = radius * radius;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.size - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(this.size - 1, Math.ceil(cy + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          this.cells[this.idx(x, y)].visibility = 2;
        }
      }
    }
  }

  public beginVisionPass(): void {
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i].visibility === 2) {
        this.cells[i].visibility = 1; // downgrade visible to explored fog
      }
    }
  }

  public revealAll(): void {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].visibility = 2;
    }
  }

  public serialize(): SerializedGridMap {
    return {
      size: this.size,
      biome: this.biome,
      seed: this.seed,
      cells: this.cells.map((c) => ({ ...c }))
    };
  }

  public static deserialize(data: SerializedGridMap): GridMap {
    const map = new GridMap(data.size, data.biome, data.seed);
    map.cells = data.cells.map((c) => ({ ...c }));
    return map;
  }
}

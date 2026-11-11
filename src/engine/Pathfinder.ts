import { GridMap } from './GridMap';

export interface GridPoint {
  x: number;
  y: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: AStarNode | null;
}

export class Pathfinder {
  /**
   * Computes an 8-directional path on GridMap from (startX, startY) to (goalX, goalY).
   * If goal tile is occupied by a target building, finds path to closest adjacent passable tile.
   */
  public static findPath(
    grid: GridMap,
    startX: number,
    startY: number,
    goalX: number,
    goalY: number,
    maxSteps = 900
  ): GridPoint[] {
    const sx = Math.max(0, Math.min(grid.size - 1, Math.round(startX)));
    const sy = Math.max(0, Math.min(grid.size - 1, Math.round(startY)));
    let gx = Math.max(0, Math.min(grid.size - 1, Math.round(goalX)));
    let gy = Math.max(0, Math.min(grid.size - 1, Math.round(goalY)));

    if (sx === gx && sy === gy) return [];

    // If destination tile is blocked (e.g., clicking a building or mountain), pick closest passable tile around it
    if (!grid.isPassableForUnit(gx, gy)) {
      let bestDist = Infinity;
      let bestX = gx;
      let bestY = gy;
      for (let r = 1; r <= 4; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (grid.isPassableForUnit(nx, ny)) {
              const d = Math.hypot(nx - sx, ny - sy);
              if (d < bestDist) {
                bestDist = d;
                bestX = nx;
                bestY = ny;
              }
            }
          }
        }
        if (bestDist < Infinity) break;
      }
      gx = bestX;
      gy = bestY;
    }

    const open: AStarNode[] = [];
    const closed = new Uint8Array(grid.size * grid.size);
    const gScore = new Float32Array(grid.size * grid.size);
    gScore.fill(Infinity);

    const startNode: AStarNode = {
      x: sx,
      y: sy,
      g: 0,
      f: Math.hypot(gx - sx, gy - sy),
      parent: null
    };

    open.push(startNode);
    gScore[grid.idx(sx, sy)] = 0;

    let closestNode: AStarNode = startNode;
    let closestDist = Math.hypot(gx - sx, gy - sy);

    const dirs = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.414],
      [-1, 1, 1.414],
      [1, -1, 1.414],
      [-1, -1, 1.414]
    ];

    let steps = 0;
    while (open.length > 0 && steps < maxSteps) {
      steps++;
      // Pop lowest f
      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIdx].f) bestIdx = i;
      }
      const current = open[bestIdx];
      open[bestIdx] = open[open.length - 1];
      open.pop();

      if (current.x === gx && current.y === gy) {
        return this.reconstructPath(current);
      }

      const cIdx = grid.idx(current.x, current.y);
      if (closed[cIdx]) continue;
      closed[cIdx] = 1;

      const distToGoal = Math.hypot(gx - current.x, gy - current.y);
      if (distToGoal < closestDist) {
        closestDist = distToGoal;
        closestNode = current;
      }

      for (const [dx, dy, baseCost] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (!grid.isPassableForUnit(nx, ny)) continue;

        // Avoid cutting diagonal corners across buildings/mountains
        if (dx !== 0 && dy !== 0) {
          if (!grid.isPassableForUnit(current.x + dx, current.y) || !grid.isPassableForUnit(current.x, current.y + dy)) {
            continue;
          }
        }

        const nIdx = grid.idx(nx, ny);
        if (closed[nIdx]) continue;

        const cell = grid.getCell(nx, ny)!;
        // Rock and slabs are slightly faster than deep sand/ore
        const terrainPenalty = cell.hasSlab ? 0.85 : cell.terrain === 'rock' ? 0.92 : 1.08;
        const tentativeG = current.g + baseCost * terrainPenalty;

        if (tentativeG < gScore[nIdx]) {
          gScore[nIdx] = tentativeG;
          const h = Math.hypot(gx - nx, gy - ny);
          open.push({
            x: nx,
            y: ny,
            g: tentativeG,
            f: tentativeG + h,
            parent: current
          });
        }
      }
    }

    return this.reconstructPath(closestNode);
  }

  private static reconstructPath(node: AStarNode): GridPoint[] {
    const path: GridPoint[] = [];
    let curr: AStarNode | null = node;
    while (curr && curr.parent !== null) {
      path.push({ x: curr.x + 0.5, y: curr.y + 0.5 });
      curr = curr.parent;
    }
    path.reverse();
    return path;
  }
}

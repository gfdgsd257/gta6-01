// The city of Solmar Bay: a seeded grid of roads, blocks, buildings,
// parks, a beach along the sea and one bridge across it. Everything is
// generated once from the seed, so the map is identical every visit.
import {
  WORLD_W, WORLD_H, ROAD_SPACING, ROAD_W, BLOCK, SEA_Y,
  BRIDGE_X, BRIDGE_W, PALETTE,
} from './config.js';

export function roadXs() {
  const xs = [];
  for (let x = ROAD_SPACING; x < WORLD_W; x += ROAD_SPACING) xs.push(x);
  return xs;
}

export function roadYs() {
  const ys = [];
  for (let y = ROAD_SPACING; y < SEA_Y; y += ROAD_SPACING) ys.push(y);
  return ys;
}

// True when the point sits on a road (or on the bridge over the sea).
export function onRoad(x, y) {
  if (y >= SEA_Y) return Math.abs(x - BRIDGE_X) < BRIDGE_W / 2;
  for (const rx of roadXs()) if (Math.abs(x - rx) < ROAD_W / 2 + 6) return true;
  for (const ry of roadYs()) if (Math.abs(y - ry) < ROAD_W / 2 + 6) return true;
  return false;
}

// Nearest point on a road centreline, for spawning traffic and police.
export function nearestRoadPoint(x, y, rng) {
  const xs = roadXs();
  const ys = roadYs();
  let best = { x: xs[0], y: ys[0], d: Infinity };
  for (const rx of xs) {
    const d = Math.abs(x - rx);
    if (d < best.d) best = { x: rx, y, d };
  }
  for (const ry of ys) {
    const d = Math.abs(y - ry);
    if (d < best.d) best = { x, y: ry, d };
  }
  if (y > SEA_Y - 200 && Math.abs(x - BRIDGE_X) < 500) {
    return { x: BRIDGE_X, y: Math.min(y, SEA_Y + 120), d: 0 };
  }
  return best;
}

export function buildCity(rng) {
  const buildings = [];
  const parks = [];
  const trees = [];
  const xs = roadXs();
  const ys = roadYs();

  // Block corners: the gap between two roads, inset by the sidewalk.
  for (let ix = 0; ix <= xs.length; ix++) {
    for (let iy = 0; iy <= ys.length; iy++) {
      const bx = (ix === 0 ? 40 : xs[ix - 1] + ROAD_W / 2) + 14;
      const by = (iy === 0 ? 40 : ys[iy - 1] + ROAD_W / 2) + 14;
      const bw = (ix < xs.length ? xs[ix] - ROAD_W / 2 : WORLD_W - 40) - bx - 14;
      const bh = (iy < ys.length ? ys[iy] - ROAD_W / 2 : SEA_Y - 40) - by - 14;
      if (bw < 60 || bh < 60) continue;
      // The block nearest the start is the garage yard: keep it open.
      if (ix === 1 && iy === 1) {
        parks.push({ x: bx, y: by, w: bw, h: bh, kind: 'plaza' });
        continue;
      }
      if (rng.chance(0.22)) {
        parks.push({ x: bx, y: by, w: bw, h: bh, kind: 'park' });
        for (let t = 0; t < 7; t++) {
          trees.push({
            x: bx + rng.range(20, bw - 20),
            y: by + rng.range(20, bh - 20),
            r: 9 + rng.range(0, 6),
          });
        }
        continue;
      }
      // One or two buildings per block, with a yard gap between them.
      const split = rng.chance(0.55);
      const count = split ? 2 : 1;
      for (let b = 0; b < count; b++) {
        const w = split ? bw / 2 - 18 : bw - 30;
        const h = bh - 30;
        const x = bx + (split ? b * (bw / 2 + 6) : 0) + 8;
        const y = by + 8;
        buildings.push({
          x, y, w, h,
          roof: rng.pick([PALETTE.buildingRoof, PALETTE.buildingRoofAlt, '#b5764f', '#7d94a8']),
          height: rng.int(1, 4),
          windows: rng.int(2, 5),
        });
      }
    }
  }

  return { buildings, parks, trees };
}

// Push a circle out of any building it overlaps. Returns true on hit.
export function collideBuildings(city, body, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - nx;
    const dy = body.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        body.x = nx + (dx / d) * radius;
        body.y = ny + (dy / d) * radius;
      } else {
        body.y = b.y - radius;
      }
    }
  }
  return hit;
}

// True when the point is inside a building (used for spawn checks).
export function insideBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8) return true;
  }
  return false;
}

// Pedestrians: ordinary Solmar Bay locals strolling the sidewalks.
// They wander, chat in place sometimes, and run away screaming when a
// car bears down on them or a gun goes off nearby.
import { PED_COUNT, WORLD_W, SEA_Y } from './config.js';
import { onRoad, insideBuilding } from './world.js';

const SHIRTS = ['#c94f4f', '#4f7fc9', '#4fc98a', '#c9a44f', '#8a5fc9', '#e8e8e8', '#3a3a3a', '#e07b39'];
const SKINS = ['#f0c8a0', '#d9a06b', '#a06b3f', '#f5d7b0'];

export function spawnPeds(state) {
  const peds = [];
  let guard = 0;
  while (peds.length < PED_COUNT && guard++ < 500) {
    const x = state.rng.range(120, WORLD_W - 120);
    const y = state.rng.range(120, SEA_Y - 120);
    if (onRoad(x, y)) continue;
    if (insideBuilding(state.city, x, y)) continue;
    if (Math.hypot(x - state.player.x, y - state.player.y) < 260) continue;
    peds.push({
      x, y,
      angle: state.rng.range(0, Math.PI * 2),
      speed: 0,
      walkSpeed: 45 + state.rng.range(0, 35),
      shirt: state.rng.pick(SHIRTS),
      skin: state.rng.pick(SKINS),
      flee: 0,
      pauseTimer: state.rng.range(0, 4),
      stepPhase: state.rng.range(0, Math.PI * 2),
      scared: false,
    });
  }
  return peds;
}

export function updatePeds(state, dt) {
  for (const ped of state.peds) {
    ped.stepPhase += dt * (ped.speed > 1 ? 9 : 2);
    const px = state.player.x;
    const py = state.player.y;
    const dPlayer = Math.hypot(ped.x - px, ped.y - py);

    // Flee: a speeding car, the player driving at them, or a gunshot.
    let threat = null;
    if (ped.flee > 0) {
      threat = { x: px, y: py };
    } else {
      for (const car of state.cars) {
        if (Math.abs(car.speed) < 40) continue;
        const d = Math.hypot(car.x - ped.x, car.y - ped.y);
        if (d < 130) {
          threat = { x: car.x, y: car.y };
          ped.flee = 2.5;
          ped.scared = true;
          break;
        }
      }
    }
    if (dPlayer < 60 && state.player.car) {
      threat = { x: px, y: py };
      ped.flee = 2;
      ped.scared = true;
    }

    if (threat) {
      const away = Math.atan2(ped.y - threat.y, ped.x - threat.x);
      ped.angle = away;
      ped.speed = 170;
      ped.flee -= dt;
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      continue;
    }

    ped.scared = false;
    ped.pauseTimer -= dt;
    if (ped.pauseTimer > 0) {
      ped.speed = 0;
      continue;
    }
    if (ped.speed === 0) {
      ped.angle = state.rng.range(0, Math.PI * 2);
      ped.speed = ped.walkSpeed;
      ped.pauseTimer = state.rng.range(3, 9);
    }
    const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    // Stay off the road and out of buildings and the sea.
    if (onRoad(nx, ny) || insideBuilding(state.city, nx, ny) || ny > SEA_Y - 30 || nx < 50 || nx > WORLD_W - 50 || ny < 50) {
      ped.angle += Math.PI / 2 + state.rng.range(-0.5, 0.5);
      ped.pauseTimer = 0.4;
      continue;
    }
    ped.x = nx;
    ped.y = ny;
  }
}

// A pedestrian hit by a car: they tumble, the player earns a star.
export function hitPedByCar(state, ped) {
  ped.flee = 3;
  ped.scared = true;
  ped.x += (ped.x - state.player.x) * 0.2;
  ped.y += (ped.y - state.player.y) * 0.2;
  state.particles.sparks(ped.x, ped.y, 6);
  state.addWanted(1, 'hit pedestrian');
}

export function drawPed(ctx, ped) {
  const bob = Math.sin(ped.stepPhase) * 1.5;
  ctx.save();
  ctx.translate(ped.x, ped.y + bob * 0.4);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.strokeStyle = '#2c2f36';
  ctx.lineWidth = 3;
  const swing = Math.sin(ped.stepPhase) * 4;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(-swing, 10);
  ctx.moveTo(0, 2);
  ctx.lineTo(swing, 10);
  ctx.stroke();
  // Body.
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.roundRect(-6, -8, 12, 12, 4);
  ctx.fill();
  // Head.
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(0, -12, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // Scared mark.
  if (ped.scared) {
    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -22);
  }
  ctx.restore();
}

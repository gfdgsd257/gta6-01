// The wanted system: stars rise when the player commits crimes and
// fall when they lay low. Police interceptors spawn on the roads and
// chase the player down — ramming the car, or dragging the player out
// of it on foot. Get caught on foot and it is game over.
import { POLICE_MAX, WORLD_W, SEA_Y } from './config.js';
import { makeCar, drawCar } from './vehicles.js';
import { nearestRoadPoint } from './world.js';

export function createPolice() {
  return {
    cars: [],
    spawnTimer: 0,
    quietTimer: 0,
    dropTimer: 0,
  };
}

function wantedTargetCount(wanted) {
  return Math.min(POLICE_MAX, wanted * 2);
}

export function updatePolice(state, dt) {
  const police = state.police;
  const wanted = state.wanted;

  if (wanted === 0) {
    // The heat is off: cruisers drift away, and one that has gone far
    // enough rejoins ordinary traffic instead of vanishing mid-street.
    for (const car of police.cars) {
      car.speed = Math.max(0, car.speed - 60 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
    }
    police.cars = police.cars.filter((c) => {
      const d = Math.hypot(c.x - state.player.x, c.y - state.player.y);
      if (d >= 1400) {
        c.police = false;
        c.traffic = true;
        c.cruise = 90 + Math.random() * 70;
        return false;
      }
      return true;
    });
    state.audio.siren(false);
    return;
  }

  state.audio.siren(true);
  police.quietTimer += dt;
  police.spawnTimer -= dt;

  // Spawn interceptors until the street is full for this wanted level.
  if (police.cars.length < wantedTargetCount(wanted) && police.spawnTimer <= 0) {
    police.spawnTimer = 2.2;
    const angle = state.rng.range(0, Math.PI * 2);
    const dist = 650 + state.rng.range(0, 250);
    const sx = state.player.x + Math.cos(angle) * dist;
    const sy = state.player.y + Math.sin(angle) * dist;
    const p = nearestRoadPoint(Math.max(120, Math.min(WORLD_W - 120, sx)), Math.max(120, Math.min(SEA_Y - 120, sy)), state.rng);
    const car = makeCar(p.x, p.y, 0, 'police', false);
    car.police = true;
    car.sirenPhase = state.rng.range(0, 1);
    police.cars.push(car);
    state.cars.push(car);
  }

  for (const car of police.cars) {
    car.sirenPhase = (car.sirenPhase || 0) + dt;
    const dx = state.player.x - car.x;
    const dy = state.player.y - car.y;
    const dist = Math.hypot(dx, dy) || 1;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.2));
    const top = 300 + wanted * 45;
    car.speed += (top - car.speed) * Math.min(1, dt * 0.7);
    car.angle += steer * 2.6 * dt * Math.sign(car.speed || 1);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = Math.max(40, Math.min(WORLD_W - 40, car.x));
    car.y = Math.max(40, Math.min(SEA_Y + 200, car.y));

    // Ramming the player's car damages it; touching the player on foot busts them.
    if (dist < 52) {
      if (state.player.car) {
        state.player.car.speed *= 0.55;
        car.speed *= 0.7;
        state.particles.sparks(car.x, car.y, 8);
        state.audio.crash();
        state.shake = 9;
        state.player.health = Math.max(0, state.player.health - 6 * dt * 10);
        car.x -= Math.cos(car.angle) * 20;
        car.y -= Math.sin(car.angle) * 20;
      } else if (dist < 30) {
        state.busted = true;
      }
    }
  }

  // Lay low: no crime for a while and no cruiser close by, stars fade.
  const nearest = police.cars.reduce((m, c) => Math.min(m, Math.hypot(c.x - state.player.x, c.y - state.player.y)), Infinity);
  if (police.quietTimer > 18 && nearest > 420) {
    police.dropTimer += dt;
    if (police.dropTimer > 9) {
      police.dropTimer = 0;
      state.wanted = Math.max(0, state.wanted - 1);
      state.toast('The heat is cooling off…');
    }
  } else if (nearest < 420) {
    police.dropTimer = 0;
  }
}

export function clearPolice(state) {
  state.cars = state.cars.filter((c) => !c.police);
  state.police.cars = [];
  state.audio.siren(false);
}

export function drawPoliceLights(ctx, car) {
  if (!car.police) return;
  const phase = (car.sirenPhase || 0) % 1;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.globalAlpha = 0.25 + 0.2 * Math.sin(phase * Math.PI * 2);
  ctx.fillStyle = phase < 0.5 ? '#ff4040' : '#3a7bff';
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

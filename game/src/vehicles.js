// Vehicles: traffic cars that follow the road grid, and the player's
// own driving physics — acceleration, steering that bites harder at
// speed, braking and a handbrake that lets the tail slide.
import { CAR_TYPES, CAR_TYPE_KEYS, CAR_LENGTH, CAR_WIDTH, TRAFFIC_COUNT, WORLD_W, WORLD_H, SEA_Y } from './config.js';
import { onRoad, nearestRoadPoint, roadXs, roadYs, collideBuildings } from './world.js';

let nextCarId = 1;

export function makeCar(x, y, angle, typeKey, isTraffic) {
  const type = CAR_TYPES[typeKey] || CAR_TYPES.sedan;
  return {
    id: nextCarId++,
    x, y,
    angle,
    speed: 0,
    type: typeKey,
    color: type.color,
    accel: type.accel,
    top: type.top,
    grip: type.grip,
    traffic: !!isTraffic,
    // Traffic state: which road axis it follows and which way.
    axis: Math.abs(Math.cos(angle)) > 0.5 ? 'x' : 'y',
    dir: (Math.cos(angle) >= 0 && Math.abs(Math.cos(angle)) > 0.5) || (Math.sin(angle) > 0 && Math.abs(Math.cos(angle)) <= 0.5) ? 1 : -1,
    cruise: 90 + Math.random() * 70,
    stuck: 0,
    smokeTimer: 0,
  };
}

export function spawnTraffic(state) {
  const xs = roadXs();
  const ys = roadYs();
  const cars = [];
  let guard = 0;
  while (cars.length < TRAFFIC_COUNT && guard++ < 400) {
    const vertical = state.rng.chance(0.5);
    let x, y, angle;
    if (vertical) {
      x = state.rng.pick(xs) + (state.rng.chance(0.5) ? -22 : 22);
      y = state.rng.range(150, SEA_Y - 150);
      angle = state.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = state.rng.range(150, WORLD_W - 150);
      y = state.rng.pick(ys) + (state.rng.chance(0.5) ? -22 : 22);
      angle = state.rng.chance(0.5) ? 0 : Math.PI;
    }
    const px = state.player.x;
    const py = state.player.y;
    if (Math.hypot(x - px, y - py) < 320) continue;
    cars.push(makeCar(x, y, angle, state.rng.pick(CAR_TYPE_KEYS), true));
  }
  return cars;
}

// One traffic car follows its road; at a crossing it sometimes turns.
function stepTrafficCar(car, dt, state) {
  const xs = roadXs();
  const ys = roadYs();
  const target = car.cruise;
  car.speed += (target - car.speed) * Math.min(1, dt * 0.8);

  // During the pier firefight (mission 3), keep traffic off the bridge:
  // a car crossing the narrow pier would eat every bullet meant for
  // the Dock Rats.
  const pierFight =
    state.missions.index === 2 && state.missions.active && state.missions.stage === 1;
  if (pierFight && car.y > SEA_Y - 220) {
    const p = nearestRoadPoint(630 + state.rng.range(-300, 300), 630 + state.rng.range(-300, 300), state.rng);
    car.x = p.x;
    car.y = p.y;
    car.angle = state.rng.chance(0.5) ? 0 : Math.PI / 2;
    car.speed = car.cruise;
    return;
  }

  // Slow down for the car ahead on the same lane.
  for (const other of state.cars) {
    if (other === car || !other.traffic) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (ahead > 0 && ahead < 90 && side < 30) {
      car.speed = Math.min(car.speed, Math.max(0, other.speed - 20));
    }
  }

  const prevX = car.x;
  const prevY = car.y;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;

  // Reached a crossing: maybe turn onto the other road.
  const onX = xs.some((rx) => Math.abs(car.x - rx) < 14);
  const onY = ys.some((ry) => Math.abs(car.y - ry) < 14);
  if (onX && onY && state.rng.chance(dt * 0.5)) {
    const turnLeft = state.rng.chance(0.5);
    car.angle += turnLeft ? Math.PI / 2 : -Math.PI / 2;
    // Snap onto the lane of the new road.
    if (Math.abs(Math.cos(car.angle)) > 0.5) {
      car.y = ys.reduce((a, b) => (Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a), ys[0]) + 22;
    } else {
      car.x = xs.reduce((a, b) => (Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a), xs[0]) + 22;
    }
  }

  // Out of bounds or beached: respawn on a road near the player.
  if (car.x < 60 || car.x > WORLD_W - 60 || car.y < 60 || car.y > SEA_Y + 200 || !onRoad(car.x, car.y)) {
    const p = nearestRoadPoint(state.player.x + state.rng.range(-600, 600), state.player.y + state.rng.range(-500, 500), state.rng);
    car.x = p.x;
    car.y = p.y;
    car.angle = state.rng.chance(0.5) ? 0 : Math.PI / 2;
    car.speed = car.cruise;
    return;
  }

  if (collideBuildings(state.city, car, CAR_LENGTH / 2)) {
    car.speed *= 0.4;
    car.x = prevX;
    car.y = prevY;
    car.angle += Math.PI / 2;
  }
}

export function updateTraffic(state, dt) {
  for (const car of state.cars) {
    if (car.traffic) stepTrafficCar(car, dt, state);
  }
}

// Player driving: arcade physics with speed-scaled steering.
export function drivePlayerCar(state, dt, drive, steer, handbrake) {
  const car = state.player.car;
  if (!car) return;
  const prevX = car.x;
  const prevY = car.y;

  if (drive > 0) car.speed += car.accel * drive * dt;
  else if (drive < 0) car.speed += car.accel * 0.7 * drive * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 90 * dt);

  if (handbrake) {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 420 * dt);
  }

  const drag = handbrake ? 0.4 : 1.6;
  car.speed -= car.speed * drag * 0.35 * dt;
  car.speed = Math.max(-car.top * 0.45, Math.min(car.top, car.speed));

  const steerPower = car.grip * (0.35 + Math.min(1, Math.abs(car.speed) / 200));
  car.angle += steer * steerPower * dt * Math.sign(car.speed || 1) * (handbrake ? 1.5 : 1);

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;

  // World bounds: the sea swallows a car that leaves the bridge.
  if (car.y > SEA_Y + 40 && Math.abs(car.x - 1800) > 75) {
    car.x = prevX;
    car.y = prevY;
    car.speed *= -0.3;
  }
  car.x = Math.max(40, Math.min(WORLD_W - 40, car.x));
  car.y = Math.max(40, Math.min(WORLD_H - 40, car.y));

  if (collideBuildings(state.city, car, CAR_LENGTH / 2)) {
    const impact = Math.abs(car.speed);
    car.x = prevX;
    car.y = prevY;
    car.speed *= -0.25;
    if (impact > 180) {
      state.particles.sparks(car.x, car.y, 10);
      state.audio.crash();
      state.shake = Math.min(14, impact / 30);
      state.player.health = Math.max(0, state.player.health - impact / 60);
    }
  }

  // Bumping traffic and pedestrians while driving.
  for (const other of state.cars) {
    if (other === car || other.police) continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 55 && Math.abs(car.speed) > 60) {
      other.speed = car.speed * 0.5;
      other.x += (other.x - car.x) / (d || 1) * 30;
      other.y += (other.y - car.y) / (d || 1) * 30;
      state.particles.sparks(other.x, other.y, 8);
      state.audio.crash();
      state.shake = 8;
      car.speed *= 0.6;
      if (state.wanted < 2) state.addWanted(1, 'crash');
    }
  }

  // Exhaust smoke when flooring it.
  car.smokeTimer -= dt;
  if (Math.abs(car.speed) > car.top * 0.7 && car.smokeTimer <= 0) {
    const bx = car.x - Math.cos(car.angle) * 30;
    const by = car.y - Math.sin(car.angle) * 30;
    state.particles.smoke(bx, by, 1);
    car.smokeTimer = 0.12;
  }

  state.player.x = car.x;
  state.player.y = car.y;
  state.audio.engine(Math.abs(car.speed) / car.top);
}

// The nearest stealable car within reach of the player on foot.
export function nearestCar(state, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.police && car.speed > 5) continue;
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}

// Draw one car as a rounded vector body with windows, wheels and lights.
export function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const len = car.type === 'truck' ? 74 : CAR_LENGTH;
  const wid = car.type === 'truck' ? 32 : CAR_WIDTH;
  // Wheels.
  ctx.fillStyle = '#15181d';
  const wl = len / 2 - 10;
  const ww = wid / 2 + 2;
  ctx.fillRect(-wl, -ww, 12, 6);
  ctx.fillRect(wl - 4, -ww, 12, 6);
  ctx.fillRect(-wl, ww - 6, 12, 6);
  ctx.fillRect(wl - 4, ww - 6, 12, 6);
  // Body.
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-len / 2, -wid / 2, len, wid, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Cabin and windows.
  ctx.fillStyle = car.type === 'police' ? '#dfe6ee' : '#1d2733';
  ctx.beginPath();
  ctx.roundRect(-len / 2 + 12, -wid / 2 + 5, len / 2 - 8, wid - 10, 4);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(len / 2 - 3, -wid / 2 + 3, 3, 6);
  ctx.fillRect(len / 2 - 3, wid / 2 - 9, 3, 6);
  // Taxi sign / police markings.
  if (car.type === 'taxi') {
    ctx.fillStyle = '#f4f1e6';
    ctx.fillRect(-6, -5, 14, 10);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 1, 2);
  }
  if (car.type === 'police') {
    ctx.fillStyle = '#2f6fd0';
    ctx.fillRect(-len / 2 + 2, -wid / 2, 8, wid);
    ctx.fillStyle = '#c93a3a';
    ctx.fillRect(-len / 2 + 10, -wid / 2, 8, wid);
    ctx.fillStyle = '#ff4040';
    ctx.beginPath();
    ctx.arc(-4, -wid / 2 + 1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a7bff';
    ctx.beginPath();
    ctx.arc(6, -wid / 2 + 1, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

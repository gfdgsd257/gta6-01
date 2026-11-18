// The player on foot: walking and running, bumping into buildings,
// stealing a car with E and stepping out of one again. Driving itself
// lives in vehicles.js; this file owns the person.
import { PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, PLAYER_RADIUS, SEA_Y, WORLD_W, WORLD_H } from './config.js';
import { collideBuildings } from './world.js';
import { nearestCar } from './vehicles.js';

export function updatePlayerOnFoot(state, dt, move, running) {
  const p = state.player;
  const speed = running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
  p.moving = move.x !== 0 || move.y !== 0;
  if (!p.moving) return;
  p.angle = Math.atan2(move.y, move.x);
  const nx = p.x + move.x * speed * dt;
  const ny = p.y + move.y * speed * dt;
  p.x = nx;
  p.y = ny;
  // Buildings block the player; the sea stops them at the beach.
  if (collideBuildings(state.city, p, PLAYER_RADIUS)) {
    // collideBuildings already pushed the player out.
  }
  if (p.y > SEA_Y + 10 && Math.abs(p.x - 1800) > 75) {
    p.y = SEA_Y + 10;
  }
  p.x = Math.max(30, Math.min(WORLD_W - 30, p.x));
  p.y = Math.max(30, Math.min(WORLD_H - 30, p.y));
}

// Step into the nearest car. Taking a moving traffic car is a crime
// (a wanted star); a parked car by the garage is fair game.
export function toggleCar(state) {
  const p = state.player;
  if (p.car) {
    exitCar(state);
    return;
  }
  const car = nearestCar(state, 70);
  if (!car) {
    state.toast('No car close enough — walk up to one and press E.');
    return;
  }
  const wasTraffic = car.traffic;
  p.car = car;
  p.lastCar = car;
  car.traffic = false;
  car.police = false;
  car.speed = 0;
  state.audio.steal();
  if (wasTraffic) {
    state.addWanted(1, 'car stolen');
  }
  state.toast(`Driving a ${car.type} — E to get out, Space for handbrake.`);
}

export function exitCar(state) {
  const p = state.player;
  const car = p.car;
  if (!car) return;
  car.speed = 0;
  // Step out to the side of the car, clear of the road traffic.
  const side = Math.PI / 2;
  p.x = car.x + Math.cos(car.angle + side) * 34;
  p.y = car.y + Math.sin(car.angle + side) * 34;
  p.angle = car.angle;
  p.car = null;
  state.audio.engine(0);
}

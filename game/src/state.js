// The game state: one object that holds the whole world — the city,
// the player, every car and pedestrian, the wanted level, the missions
// and the clock. Modules read and change it; main.js owns the loop.
import { START_MONEY, START_HEALTH, PISTOL_AMMO_START, PLAYER_RADIUS } from './config.js';
import { createRandom } from './random.js';
import { buildCity } from './world.js';
import { spawnTraffic, makeCar } from './vehicles.js';
import { spawnPeds } from './pedestrians.js';
import { createCombat, spawnAmmoPickups } from './combat.js';
import { createMissions } from './missions.js';
import { createPolice } from './police.js';
import { createParticles } from './particles.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';

export function createState(seed) {
  const rng = createRandom(seed);
  const saved = loadSave();
  const city = buildCity(rng);

  const state = {
    seed,
    rng,
    city,
    time: 0,
    clockMinutes: 9 * 60,
    night: false,
    view: { w: 1280, h: 720 },
    camera: { x: 630, y: 700 },
    shake: 0,
    wanted: 0,
    gunfireTimer: 0,
    busted: false,
    over: false,
    objective: 'Go to the garage to start your first job.',
    toastText: '',
    toastTimer: 0,
    dialogue: null,
    missionCompleteFlash: 0,
    completedMissions: saved?.completedMissions || 0,
    totalEarned: saved?.totalEarned || 0,
    player: {
      x: 630, y: 760,
      angle: -Math.PI / 2,
      health: START_HEALTH,
      money: saved?.money ?? START_MONEY,
      ammo: PISTOL_AMMO_START,
      car: null,
      moving: false,
      radius: PLAYER_RADIUS,
    },
    cars: [],
    peds: [],
    thugs: [],
    particles: createParticles(),
    combat: createCombat(),
    missions: createMissions(),
    police: createPolice(),
    audio: createAudio(),

    toast(text) {
      this.toastText = text;
      this.toastTimer = 3.5;
    },
    addWanted(n, reason) {
      const before = this.wanted;
      this.wanted = Math.min(5, this.wanted + n);
      if (this.wanted > before) {
        this.police.quietTimer = 0;
        this.police.dropTimer = 0;
        if (reason) this.toast(`Wanted level ${this.wanted} — ${reason}`);
      }
    },
    saveProgress() {
      this.totalEarned = Math.max(this.totalEarned, this.player.money);
      writeSave({
        money: this.player.money,
        completedMissions: this.completedMissions,
        totalEarned: this.totalEarned,
      });
    },
    screenToWorld(sx, sy) {
      return {
        x: this.camera.x - this.view.w / 2 + sx,
        y: this.camera.y - this.view.h / 2 + sy,
      };
    },
  };

  // Restore mission progress: finished jobs stay finished.
  state.missions.index = Math.min(state.completedMissions, 2);
  if (state.completedMissions >= 3) state.missions.allDone = true;

  // Traffic plus a few parked cars near the garage for easy stealing.
  state.cars = spawnTraffic(state);
  const parked = [
    { x: 700, y: 620, type: 'sedan', angle: 0 },
    { x: 560, y: 700, type: 'taxi', angle: Math.PI / 2 },
    { x: 760, y: 760, type: 'sports', angle: -Math.PI / 2 },
  ];
  for (const p of parked) {
    const car = makeCar(p.x, p.y, p.angle, p.type, false);
    car.speed = 0;
    state.cars.push(car);
  }
  state.peds = spawnPeds(state);
  spawnAmmoPickups(state);
  return state;
}

// The camera eases after the player (or their car) and stays in the city.
export function updateCamera(state, dt) {
  const targetX = state.player.x;
  const targetY = state.player.y;
  const k = Math.min(1, dt * 4);
  state.camera.x += (targetX - state.camera.x) * k;
  state.camera.y += (targetY - state.camera.y) * k;
  const vw = state.view.w / 2;
  const vh = state.view.h / 2;
  state.camera.x = Math.max(vw - 200, Math.min(3600 - vw + 200, state.camera.x));
  state.camera.y = Math.max(vh - 200, Math.min(2600 - vh + 200, state.camera.y));
  state.shake = Math.max(0, state.shake - dt * 30);
}

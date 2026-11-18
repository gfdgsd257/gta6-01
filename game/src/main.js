// Boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the city. ?scene=driving|street|chase|mission stages a
// scene for a screenshot instead of the title screen, paints it until it
// settles, then sets window.__shotReady. The default load is the title
// screen of the normal game.
import { STEP } from './config.js';
import { createState, updateCamera } from './state.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER_CAR, ACTION_PUNCH, ACTION_MUTE } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { drawHud } from './hud.js';
import { updatePlayerOnFoot, toggleCar } from './player.js';
import { updateTraffic, drivePlayerCar, makeCar } from './vehicles.js';
import { updatePeds, hitPedByCar } from './pedestrians.js';
import { updatePolice, clearPolice } from './police.js';
import { updateCombat, punch, shoot } from './combat.js';
import { updateMissions, updateFollower, startMission } from './missions.js';
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const scene = params.get('scene');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const input = createInput(canvas);

let state = createState(seed);
let screen = SCREEN_TITLE;
let accumulator = 0;
let last = performance.now();
let shotFrames = 0;

window.__game = state;

function announce(message) {
  status.textContent = message;
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.resize(w, h);
  state.view = { w, h };
}
window.addEventListener('resize', resize);
resize();

function startGame() {
  screen = SCREEN_PLAY;
  state.audio.unlock();
  state.audio.click();
  announce('Playing. Go to the garage to start your first job.');
}

function endGame(busted) {
  state.busted = busted;
  state.over = true;
  screen = SCREEN_OVER;
  state.saveProgress();
  state.audio.siren(false);
  state.audio.engine(0);
  state.audio.busted();
  announce(busted ? 'Busted. Game over.' : 'Wasted. Game over.');
}

function restart() {
  const fresh = createState(Math.floor(Math.random() * 4294967296));
  state = fresh;
  window.__game = state;
  clearPolice(state);
  screen = SCREEN_PLAY;
  accumulator = 0;
  announce('Playing.');
}

// Hitting a pedestrian with the car: they tumble and the law notices.
function checkCarPedHits() {
  const car = state.player.car;
  if (!car || Math.abs(car.speed) < 70) return;
  for (const ped of state.peds) {
    const d = Math.hypot(ped.x - car.x, ped.y - car.y);
    if (d < 34) {
      hitPedByCar(state, ped);
      state.shake = 7;
      state.audio.crash();
      car.speed *= 0.7;
    }
  }
}

function handleActions() {
  const actions = input.takeActions();
  // A click queued while the game was over must not fire after a restart.
  const clicked = input.takeClick();
  if (actions & ACTION_MUTE) {
    const muted = state.audio.toggleMute();
    state.toast(muted ? 'Sound off' : 'Sound on');
  }
  if (actions & ACTION_CONFIRM) {
    if (screen === SCREEN_TITLE) startGame();
    else if (screen === SCREEN_OVER) restart();
    else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    else if (state.missions.done && !state.missions.allDone) {
      startMission(state, state.missions.index);
    }
  }
  if (actions & ACTION_PAUSE) {
    if (screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }
  if (screen === SCREEN_PLAY) {
    if (actions & ACTION_ENTER_CAR) toggleCar(state);
    if (actions & ACTION_PUNCH) punch(state);
    if (clicked) shoot(state, input.mouse().x, input.mouse().y);
  }
}

function step() {
  state.time += STEP;
  state.clockMinutes += STEP * 0.5;
  const hour = (state.clockMinutes / 60) % 24;
  state.night = hour >= 20 || hour < 6;
  state.toastTimer = Math.max(0, state.toastTimer - STEP);
  state.gunfireTimer = Math.max(0, state.gunfireTimer - STEP);
  if (state.dialogue) state.dialogue.timer -= STEP;
  state.missionCompleteFlash = Math.max(0, state.missionCompleteFlash - STEP);
  state.particles.update(STEP);

  if (screen !== SCREEN_PLAY) return;

  if (state.player.car) {
    drivePlayerCar(state, STEP, input.driveAxis(), input.steerAxis(), input.handbrake());
    checkCarPedHits();
  } else {
    updatePlayerOnFoot(state, STEP, input.moveVector(), input.running());
    state.audio.engine(0);
  }

  updateTraffic(state, STEP);
  updatePeds(state, STEP);
  updatePolice(state, STEP);
  updateCombat(state, STEP);
  updateMissions(state, STEP);
  updateFollower(state, STEP);
  updateCamera(state, STEP);

  if (state.busted) {
    endGame(true);
    return;
  }
  if (state.player.health <= 0) {
    endGame(false);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  handleActions();
  while (accumulator >= STEP && screen !== SCREEN_OVER) {
    step();
    accumulator -= STEP;
  }
  if (screen === SCREEN_OVER) accumulator = 0;
  renderer.draw(state, screen, state.view);
  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
    drawHud(renderer.ctx, state, state.view);
  }
  if (scene) {
    shotFrames += 1;
    if (shotFrames === 90) window.__shotReady = true;
  }
}

// Stage a scene for a screenshot: a real game state, already playing.
function stageScene(name) {
  screen = SCREEN_PLAY;
  state.audio.unlock();
  if (name === 'driving') {
    const car = state.cars.find((c) => c.type === 'sports' && !c.traffic);
    state.player.car = car;
    car.traffic = false;
    car.x = 1260;
    car.y = 1260;
    car.angle = 0;
    car.speed = 300;
    state.player.x = car.x;
    state.player.y = car.y;
    state.camera.x = car.x;
    state.camera.y = car.y;
    state.objective = 'Cruise Solmar Bay — steal any car, run jobs, outrun the law.';
  } else if (name === 'street') {
    state.player.x = 1345;
    state.player.y = 1170;
    state.player.angle = Math.PI;
    state.camera.x = 1260;
    state.camera.y = 1260;
    // A parked taxi and a couple of locals right by the player.
    const taxi = state.cars.find((c) => c.type === 'taxi' && !c.traffic);
    if (taxi) {
      taxi.x = 1310;
      taxi.y = 1260;
      taxi.angle = Math.PI / 2;
    }
    state.peds[0].x = 1380;
    state.peds[0].y = 1130;
    state.peds[1].x = 1300;
    state.peds[1].y = 1120;
    state.objective = 'Pick up the parcel at the market square';
  } else if (name === 'chase') {
    const car = state.cars.find((c) => c.type === 'sports' && !c.traffic);
    state.player.car = car;
    car.traffic = false;
    car.x = 1680;
    car.y = 1260;
    car.angle = Math.PI;
    car.speed = 340;
    state.player.x = car.x;
    state.player.y = car.y;
    state.camera.x = car.x;
    state.camera.y = car.y;
    state.wanted = 3;
    state.police.quietTimer = 0;
    // Three interceptors already closing in from behind.
    const spots = [
      { x: 2100, y: 1260 }, { x: 2250, y: 1260 }, { x: 1980, y: 1260 },
    ];
    for (const s of spots) {
      const cop = makeCar(s.x, s.y, Math.PI, 'police', false);
      cop.police = true;
      cop.speed = 380;
      cop.sirenPhase = state.rng.range(0, 1);
      state.police.cars.push(cop);
      state.cars.push(cop);
    }
    state.objective = 'Lose the cops — drive to the chop shop!';
  } else if (name === 'mission') {
    startMission(state, 0);
    state.player.x = 1100;
    state.player.y = 1260;
    state.player.angle = 0;
    state.camera.x = 1260;
    state.camera.y = 1260;
    state.objective = 'Pick up the parcel at the market square';
  }
  announce(`Scene ${name} staged.`);
}

if (scene) {
  stageScene(scene);
  requestAnimationFrame(frame);
} else {
  announce('Solmar Bay. Click or press Enter to start.');
  requestAnimationFrame(frame);
}

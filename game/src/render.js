// Rendering: the city, the sea, the bridge, every car, pedestrian and
// thug, the mission marker, the player — and the title, pause and
// game-over screens. All art is vector shapes drawn on the canvas.
import { WORLD_W, WORLD_H, ROAD_SPACING, ROAD_W, SEA_Y, BRIDGE_X, BRIDGE_W, PALETTE, PLAYER_RADIUS } from './config.js';
import { roadXs, roadYs } from './world.js';
import { drawCar } from './vehicles.js';
import { drawPed } from './pedestrians.js';
import { drawCombat } from './combat.js';
import { drawPoliceLights } from './police.js';
import { currentTarget } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    ctx,
    resize(w, h) {
      canvas.width = w;
      canvas.height = h;
    },
    draw(state, screen, view) {
      ctx.clearRect(0, 0, view.w, view.h);
      if (screen === SCREEN_TITLE) {
        drawTitle(ctx, state, view);
        return;
      }
      drawWorld(ctx, state, view);
      if (screen === SCREEN_PAUSED) drawPaused(ctx, view);
      if (screen === SCREEN_OVER) drawGameOver(ctx, state, view);
    },
  };
}

function drawWorld(ctx, state, view) {
  const cam = state.camera;
  const shakeX = (Math.random() - 0.5) * state.shake;
  const shakeY = (Math.random() - 0.5) * state.shake;
  ctx.save();
  ctx.translate(-cam.x + view.w / 2 + shakeX, -cam.y + view.h / 2 + shakeY);

  const vx0 = cam.x - view.w / 2 - 80;
  const vy0 = cam.y - view.h / 2 - 80;
  const vx1 = cam.x + view.w / 2 + 80;
  const vy1 = cam.y + view.h / 2 + 80;

  // Ground.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);

  // Beach and sea.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(vx0, SEA_Y - 40, vx1 - vx0, 44);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(vx0, SEA_Y + 4, vx1 - vx0, WORLD_H - SEA_Y);
  // Waves.
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  for (let x = Math.floor(vx0 / 90) * 90; x < vx1; x += 90) {
    const yy = SEA_Y + 30 + Math.sin(state.time * 1.2 + x * 0.01) * 6;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.quadraticCurveTo(x + 22, yy - 7, x + 44, yy);
    ctx.stroke();
  }

  // Parks and plaza.
  for (const p of state.city.parks) {
    if (p.x > vx1 || p.x + p.w < vx0 || p.y > vy1 || p.y + p.h < vy0) continue;
    ctx.fillStyle = p.kind === 'plaza' ? '#c9bda6' : PALETTE.parkGrass;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    if (p.kind === 'plaza') {
      ctx.fillStyle = '#8a7a5f';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MARIN GARAGE', p.x + p.w / 2, p.y + p.h / 2);
    }
  }

  // Roads.
  ctx.fillStyle = PALETTE.road;
  for (const rx of roadXs()) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, SEA_Y);
  for (const ry of roadYs()) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // Bridge over the sea.
  ctx.fillStyle = PALETTE.bridge;
  ctx.fillRect(BRIDGE_X - BRIDGE_W / 2, SEA_Y - 60, BRIDGE_W, WORLD_H - SEA_Y + 60);
  ctx.strokeStyle = '#e8d44d';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 18]);
  for (const rx of roadXs()) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, SEA_Y);
    ctx.stroke();
  }
  for (const ry of roadYs()) {
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(WORLD_W, ry);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Buildings (only those near the camera).
  for (const b of state.city.buildings) {
    if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = PALETTE.buildingWall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    // Windows.
    ctx.fillStyle = '#ffe9a8';
    const cols = Math.max(2, Math.floor(b.w / 46));
    const rows = Math.max(1, Math.floor(b.h / 46));
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        ctx.fillRect(b.x + 12 + cx * ((b.w - 24) / cols), b.y + 12 + cy * ((b.h - 24) / rows), 12, 9);
      }
    }
  }

  // Trees.
  for (const t of state.city.trees) {
    if (t.x < vx0 || t.x > vx1 || t.y < vy0 || t.y > vy1) continue;
    ctx.fillStyle = '#3f7a34';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5da244';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mission marker: a pulsing beacon on the ground.
  const target = currentTarget(state);
  if (target && target.radius > 0) {
    const pulse = 1 + Math.sin(state.time * 4) * 0.15;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.moveTo(target.x, target.y - 34);
    ctx.lineTo(target.x - 10, target.y - 14);
    ctx.lineTo(target.x + 10, target.y - 14);
    ctx.closePath();
    ctx.fill();
    // Distance from the player, so the marker is useful at a glance.
    const distM = Math.round(Math.hypot(state.player.x - target.x, state.player.y - target.y) / 10) * 10;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${distM}m`, target.x, target.y - 44);
    ctx.restore();
  }
  // Garage marker between jobs.
  if (!state.missions.active && !state.missions.allDone) {
    ctx.fillStyle = '#4fc98a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼ NEXT JOB — go to the garage', 630, 600);
  }

  // Cars, police lights, pedestrians, combat, player.
  for (const car of state.cars) {
    if (car.x < vx0 - 80 || car.x > vx1 + 80 || car.y < vy0 - 80 || car.y > vy1 + 80) continue;
    drawPoliceLights(ctx, car);
    drawCar(ctx, car);
  }
  for (const ped of state.peds) {
    if (ped.x < vx0 || ped.x > vx1 || ped.y < vy0 || ped.y > vy1) continue;
    drawPed(ctx, ped);
  }
  drawCombat(ctx, state);

  // Follower (Nico).
  const f = state.missions.follower;
  if (f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.fillStyle = '#2f6fd0';
    ctx.beginPath();
    ctx.roundRect(-6, -8, 12, 12, 4);
    ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.arc(0, -12, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NICO', 0, -22);
    ctx.restore();
  }

  drawPlayer(ctx, state);

  // Night: a dark wash plus headlight cones.
  if (state.night) {
    ctx.fillStyle = 'rgba(8, 12, 30, 0.34)';
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    for (const car of state.cars) {
      if (Math.abs(car.speed) < 5 && car !== state.player.car) continue;
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      const grad = ctx.createRadialGradient(40, 0, 4, 90, 0, 150);
      grad.addColorStop(0, 'rgba(255,233,168,0.35)');
      grad.addColorStop(1, 'rgba(255,233,168,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(28, -8);
      ctx.lineTo(170, -46);
      ctx.lineTo(170, 46);
      ctx.lineTo(28, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
  state.particles.draw(ctx);
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (p.car) return; // The car is drawn as a car.
  ctx.save();
  ctx.translate(p.x, p.y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  // Legs.
  ctx.strokeStyle = '#2c3a5e';
  ctx.lineWidth = 3.5;
  const swing = p.moving ? Math.sin(state.time * 11) * 5 : 0;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(-swing, 11);
  ctx.moveTo(0, 2);
  ctx.lineTo(swing, 11);
  ctx.stroke();
  // Jacket.
  ctx.fillStyle = '#e07b39';
  ctx.beginPath();
  ctx.roundRect(-7, -9, 14, 14, 5);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(3, -13, 6, 0, Math.PI * 2);
  ctx.fill();
  // Hair.
  ctx.fillStyle = '#2c2118';
  ctx.beginPath();
  ctx.arc(2, -15, 5.5, Math.PI, Math.PI * 2);
  ctx.fill();
  // Pistol in hand when armed.
  if (p.ammo > 0) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(16, 0);
    ctx.stroke();
  }
  // Muzzle flash.
  if (state.combat.muzzle > 0) {
    ctx.fillStyle = '#ffe98a';
    ctx.beginPath();
    ctx.arc(20, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTitle(ctx, state, view) {
  // A painted backdrop: the city from above, warm sun, sea at the bottom.
  const grad = ctx.createLinearGradient(0, 0, 0, view.h);
  grad.addColorStop(0, '#ffcf7a');
  grad.addColorStop(0.55, '#f2a35e');
  grad.addColorStop(1, '#2f7fb8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, view.w, view.h);
  // Sun.
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(view.w - 180, 110, 58, 0, Math.PI * 2);
  ctx.fill();
  // Skyline silhouettes.
  ctx.fillStyle = 'rgba(60,40,30,0.55)';
  const base = view.h * 0.62;
  for (let i = 0; i < 14; i++) {
    const bw = 46 + ((i * 37) % 60);
    const bh = 70 + ((i * 53) % 130);
    ctx.fillRect(20 + i * 86, base - bh, bw, bh);
  }
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(0, base + 40, view.w, view.h - base - 40);
  // Title block.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText('SOLMAR BAY', view.w / 2, view.h * 0.34);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('An open-world crime story', view.w / 2, view.h * 0.34 + 44);
  ctx.shadowBlur = 0;
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#fff8e6';
  const lines = [
    'Leo Marin is a courier with a fast car and a faster temper.',
    'Steal cars, outrun the police, run jobs for Marta — and buy your way out of Solmar Bay.',
    '',
    'WASD / Arrows — move & drive      E — steal / exit car      Shift — run      Space — handbrake',
    'F — punch      Click — shoot      P — pause      M — mute',
    '',
    '3 story jobs • traffic • pedestrians • wanted stars • police chases • save & progress',
  ];
  lines.forEach((line, i) => ctx.fillText(line, view.w / 2, view.h * 0.52 + i * 26));
  // Blinking start prompt.
  if (Math.sin(state.time * 3) > -0.2) {
    ctx.fillStyle = '#ffb03a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('— CLICK OR PRESS ENTER TO START —', view.w / 2, view.h * 0.86);
  }
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('A fully original game. No real city, person or game is copied.', view.w / 2, view.h - 18);
}

function drawPaused(ctx, view) {
  ctx.fillStyle = 'rgba(10,14,22,0.6)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', view.w / 2, view.h / 2 - 10);
  ctx.font = '16px sans-serif';
  ctx.fillText('Press P or Enter to keep playing', view.w / 2, view.h / 2 + 30);
}

function drawGameOver(ctx, state, view) {
  ctx.fillStyle = 'rgba(10,10,16,0.72)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a5a';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(state.busted ? 'BUSTED!' : 'WASTED!', view.w / 2, view.h / 2 - 30);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText(
    state.busted
      ? 'The Solmar Bay police dragged you out of the car. The city keeps your money.'
      : 'Leo went down. The city keeps your money.',
    view.w / 2, view.h / 2 + 10,
  );
  ctx.fillText(`Money: $${state.player.money}   •   Jobs done: ${state.completedMissions} of 3`, view.w / 2, view.h / 2 + 44);
  ctx.fillStyle = '#ffb03a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press Enter to try again', view.w / 2, view.h / 2 + 90);
}

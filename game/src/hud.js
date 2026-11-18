// The HUD: health, cash, wanted stars, speed, the clock, the current
// objective, toasts, dialogue and the minimap — everything drawn on the
// canvas so the whole interface is one file.
import { WORLD_W, WORLD_H, SEA_Y, PALETTE } from './config.js';
import { missionList, currentTarget } from './missions.js';

function roundPanel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

export function drawHud(ctx, state, view) {
  const w = view.w;
  const h = view.h;
  ctx.textBaseline = 'alphabetic';

  // Top-left: health, money, ammo.
  roundPanel(ctx, 12, 12, 218, 86);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LEO MARIN', 24, 34);
  // Health bar.
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.roundRect(24, 44, 150, 12, 6);
  ctx.fill();
  ctx.fillStyle = state.player.health > 30 ? '#4fc98a' : '#e04040';
  ctx.beginPath();
  ctx.roundRect(24, 44, 150 * Math.max(0, state.player.health / 100), 12, 6);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '13px sans-serif';
  ctx.fillText(`$${state.player.money}`, 24, 78);
  ctx.fillText(`Ammo ${state.player.ammo}`, 110, 78);
  ctx.fillText(state.player.car ? `🚗 ${state.player.car.type}` : 'On foot', 24, 94 - 6 + 6);

  // Top-centre: wanted stars.
  const stars = state.wanted;
  const starW = 34;
  const sx = w / 2 - (5 * starW) / 2;
  roundPanel(ctx, sx - 10, 12, 5 * starW + 20, 40);
  for (let i = 0; i < 5; i++) {
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = i < stars ? '#ffd23a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', sx + starW / 2 + i * starW, 40);
  }

  // Objective banner under the stars.
  if (state.objective) {
    ctx.font = 'bold 15px sans-serif';
    const tw = ctx.measureText(state.objective).width;
    roundPanel(ctx, w / 2 - tw / 2 - 14, 60, tw + 28, 30);
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(state.objective, w / 2, 80);
  }

  // Clock and day.
  const hh = String(Math.floor(state.clockMinutes / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(state.clockMinutes % 60)).padStart(2, '0');
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText(`${hh}:${mm}`, w - 24, 34);
  ctx.font = '12px sans-serif';
  ctx.fillText(state.night ? 'Night — headlights on' : 'Solmar Bay', w - 24, 52);

  // Speed, bottom-right, when driving.
  if (state.player.car) {
    const kmh = Math.round(Math.abs(state.player.car.speed) * 0.36);
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${kmh}`, w - 24, h - 40);
    ctx.font = '13px sans-serif';
    ctx.fillText('km/h — Space = handbrake, E = exit', w - 24, h - 20);
  } else {
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(244,241,230,0.85)';
    ctx.fillText('E = steal car   F = punch   Click = shoot   P = pause   M = mute', w - 24, h - 20);
  }

  drawMinimap(ctx, state, w, h);
  drawMissionsPanel(ctx, state, w, h);

  // Toast line above the bottom.
  if (state.toastText && state.toastTimer > 0) {
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(state.toastText).width;
    roundPanel(ctx, w / 2 - tw / 2 - 12, h - 76, tw + 24, 28);
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(state.toastText, w / 2, h - 57);
  }

  // Dialogue box, bottom-left.
  if (state.dialogue && state.dialogue.timer > 0) {
    const boxW = Math.min(560, w - 40);
    roundPanel(ctx, 20, h - 150, boxW, 62);
    ctx.fillStyle = '#ffb03a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.dialogue.speaker, 34, h - 126);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '14px sans-serif';
    wrapText(ctx, state.dialogue.text, 34, h - 106, boxW - 28, 18);
  }

  // Mission-complete flash.
  if (state.missionCompleteFlash > 0) {
    ctx.globalAlpha = Math.min(0.85, state.missionCompleteFlash);
    ctx.fillStyle = '#ffb03a';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JOB COMPLETE!', w / 2, h / 2 - 40);
    ctx.globalAlpha = 1;
  }
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawMinimap(ctx, state, w, h) {
  const mw = 210;
  const mh = 150;
  const mx = w - mw - 14;
  const my = 66;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  roundPanel(ctx, mx - 6, my - 6, mw + 12, mh + 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#6da356';
  ctx.fillRect(mx, my, mw, mh);
  // Sea.
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(mx, my + (2280 * sy), mw, mh - 2280 * sy);
  // Roads.
  ctx.strokeStyle = '#3c3f46';
  ctx.lineWidth = 3;
  for (let x = 420; x < WORLD_W; x += 420) {
    ctx.beginPath();
    ctx.moveTo(mx + x * sx, my);
    ctx.lineTo(mx + x * sx, my + 2280 * sy);
    ctx.stroke();
  }
  for (let y = 420; y < 2280; y += 420) {
    ctx.beginPath();
    ctx.moveTo(mx, my + y * sy);
    ctx.lineTo(mx + mw, my + y * sy);
    ctx.stroke();
  }
  // Mission marker.
  const target = currentTarget(state);
  if (target && target.radius > 0) {
    const pulse = 5 + Math.sin(state.time * 4) * 2;
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.arc(mx + target.x * sx, my + target.y * sy, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (!state.missions.active && !state.missions.allDone) {
    ctx.fillStyle = '#4fc98a';
    ctx.beginPath();
    ctx.arc(mx + 630 * sx, my + 630 * sy, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police dots.
  ctx.fillStyle = '#3a7bff';
  for (const car of state.police.cars) {
    ctx.beginPath();
    ctx.arc(mx + car.x * sx, my + car.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const px = mx + state.player.x * sx;
  const py = my + state.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // North label, just above the minimap panel.
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N', mx + 2, my - 10);
  ctx.fillText('SOLMAR BAY', mx, my + mh + 24);
}

function drawMissionsPanel(ctx, state, w, h) {
  const list = missionList(state);
  const x = 12;
  const y = 108;
  roundPanel(ctx, x, y, 218, 24 + list.length * 20);
  ctx.fillStyle = '#ffb03a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('JOBS', x + 12, y + 17);
  list.forEach((m, i) => {
    ctx.fillStyle = m.done ? '#4fc98a' : m.current ? '#ffe9a8' : 'rgba(244,241,230,0.6)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${m.done ? '✓' : m.current ? '▶' : '·'} ${m.title}`, x + 12, y + 38 + i * 20);
  });
}

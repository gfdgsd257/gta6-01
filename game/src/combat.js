// Combat: a punch for close work and a pistol with scarce ammo.
// Bullets fly toward the mouse (or the nearest thug), thugs shoot back,
// and ammo crates respawn around the city.
import { PLAYER_RADIUS } from './config.js';
import { onThugDown } from './missions.js';

export function createCombat() {
  return {
    bullets: [],
    pickups: [],
    punchCooldown: 0,
    shootCooldown: 0,
    muzzle: 0,
  };
}

export function spawnAmmoPickups(state) {
  state.combat.pickups = [];
  const spots = [
    { x: 620, y: 620 }, { x: 1460, y: 1040 }, { x: 2300, y: 620 },
    { x: 1040, y: 1880 }, { x: 2720, y: 1460 }, { x: 1880, y: 2050 },
  ];
  for (const s of spots) {
    state.combat.pickups.push({ x: s.x, y: s.y, kind: 'ammo', amount: 12, bob: 0 });
  }
  state.combat.pickups.push({ x: 1040, y: 620, kind: 'health', amount: 40, bob: 0 });
  state.combat.pickups.push({ x: 2300, y: 1880, kind: 'health', amount: 40, bob: 0 });
  state.combat.pickups.push({ x: 620, y: 1460, kind: 'cash', amount: 80, bob: 0 });
}

// A punch: short range, quick, knocks a thug back.
export function punch(state) {
  const c = state.combat;
  if (c.punchCooldown > 0 || state.player.car) return;
  c.punchCooldown = 0.45;
  state.audio.punch();
  const reach = 46;
  const px = state.player.x + Math.cos(state.player.angle) * reach;
  const py = state.player.y + Math.sin(state.player.angle) * reach;
  for (const thug of state.thugs) {
    if (thug.dead) continue;
    const d = Math.hypot(thug.x - px, thug.y - py);
    if (d < 34) {
      thug.health -= 34;
      thug.x += Math.cos(state.player.angle) * 22;
      thug.y += Math.sin(state.player.angle) * 22;
      state.particles.sparks(thug.x, thug.y, 5);
      if (thug.health <= 0) killThug(state, thug);
    }
  }
  for (const ped of state.peds) {
    const d = Math.hypot(ped.x - px, ped.y - py);
    if (d < 30) {
      ped.flee = 3;
      ped.scared = true;
      state.addWanted(1, 'assault');
    }
  }
}

// A pistol shot toward the mouse cursor (screen space -> world space).
export function shoot(state, screenX, screenY) {
  const c = state.combat;
  if (c.shootCooldown > 0 || state.player.car) return;
  if (state.player.ammo <= 0) {
    state.toast('Out of ammo — find a green ammo crate.');
    c.shootCooldown = 0.3;
    return;
  }
  c.shootCooldown = 0.28;
  c.muzzle = 0.07;
  state.player.ammo -= 1;
  state.audio.gunshot();
  state.shake = Math.max(state.shake, 3);
  // Gunfire draws the law, but one burst counts once — a firefight is
  // not five separate crimes.
  if (state.gunfireTimer <= 0) {
    state.addWanted(1, 'gunfire');
    state.gunfireTimer = 8;
  }
  const world = state.screenToWorld(screenX, screenY);
  const angle = Math.atan2(world.y - state.player.y, world.x - state.player.x);
  state.player.angle = angle;
  const mx = state.player.x + Math.cos(angle) * 22;
  const my = state.player.y + Math.sin(angle) * 22;
  c.bullets.push({ x: mx, y: my, vx: Math.cos(angle) * 900, vy: Math.sin(angle) * 900, life: 0.6, fromPlayer: true });
  state.particles.flash(mx, my);
}

export function killThug(state, thug) {
  thug.dead = true;
  state.particles.sparks(thug.x, thug.y, 14);
  state.player.money += 25;
  state.audio.crash();
  state.toast('Thug down — $25 taken.');
  onThugDown(state);
}

export function updateCombat(state, dt) {
  const c = state.combat;
  c.punchCooldown = Math.max(0, c.punchCooldown - dt);
  c.shootCooldown = Math.max(0, c.shootCooldown - dt);
  c.muzzle = Math.max(0, c.muzzle - dt);

  for (const p of c.pickups) p.bob += dt;

  // Pickup collection.
  for (const p of c.pickups) {
    if (p.taken) continue;
    const d = Math.hypot(p.x - state.player.x, p.y - state.player.y);
    if (d < 34) {
      p.taken = true;
      state.particles.ring(p.x, p.y, p.kind === 'health' ? '#4fc98a' : '#ffb03a');
      if (p.kind === 'ammo') {
        state.player.ammo += p.amount;
        state.toast(`+${p.amount} pistol ammo`);
      } else if (p.kind === 'health') {
        state.player.health = Math.min(100, state.player.health + p.amount);
        state.toast(`+${p.amount} health`);
      } else {
        state.player.money += p.amount;
        state.toast(`+$${p.amount} found`);
      }
      state.audio.pickup();
    }
  }

  // Bullets fly and hit thugs, cars and buildings.
  for (let i = c.bullets.length - 1; i >= 0; i--) {
    const b = c.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.life <= 0;
    if (b.fromPlayer) {
      for (const thug of state.thugs) {
        if (thug.dead) continue;
        if (Math.hypot(thug.x - b.x, thug.y - b.y) < 20) {
          thug.health -= 34;
          state.particles.sparks(thug.x, thug.y, 6);
          if (thug.health <= 0) killThug(state, thug);
          dead = true;
          break;
        }
      }
      if (!dead) {
        for (const car of state.cars) {
          // Bullets pass through the car the player just stepped out of —
          // otherwise it would eat every shot fired beside it.
          if (car === state.player.lastCar) continue;
          if (Math.hypot(car.x - b.x, car.y - b.y) < 30) {
            state.particles.sparks(b.x, b.y, 5);
            dead = true;
            break;
          }
        }
      }
    } else if (Math.hypot(state.player.x - b.x, state.player.y - b.y) < PLAYER_RADIUS + 4) {
      state.player.health = Math.max(0, state.player.health - 9);
      state.particles.sparks(state.player.x, state.player.y, 5);
      state.shake = 6;
      dead = true;
    }
    if (dead) c.bullets.splice(i, 1);
  }

  // Thugs: chase the player and shoot when close enough.
  for (const thug of state.thugs) {
    if (thug.dead) continue;
    const dx = state.player.x - thug.x;
    const dy = state.player.y - thug.y;
    const d = Math.hypot(dx, dy) || 1;
    thug.angle = Math.atan2(dy, dx);
    thug.shootTimer -= dt;
    if (d > 260) {
      thug.x += (dx / d) * 120 * dt;
      thug.y += (dy / d) * 120 * dt;
    } else if (d > 60 && thug.shootTimer <= 0) {
      thug.shootTimer = 1.1 + Math.random() * 0.6;
      state.audio.gunshot();
      c.bullets.push({
        x: thug.x + Math.cos(thug.angle) * 20,
        y: thug.y + Math.sin(thug.angle) * 20,
        vx: Math.cos(thug.angle) * 620,
        vy: Math.sin(thug.angle) * 620,
        life: 0.9,
        fromPlayer: false,
      });
      state.particles.flash(thug.x + Math.cos(thug.angle) * 20, thug.y + Math.sin(thug.angle) * 20);
    }
  }
}

export function drawCombat(ctx, state) {
  const c = state.combat;
  // Pickups.
  for (const p of c.pickups) {
    if (p.taken) continue;
    const bob = Math.sin(p.bob * 3) * 3;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.fillStyle = p.kind === 'ammo' ? '#3a9e5f' : p.kind === 'health' ? '#e8e8e8' : '#ffb03a';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-17, -13, 34, 26, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.kind === 'ammo' ? 'AMMO' : p.kind === 'health' ? '+' : '$', 0, 1);
    ctx.restore();
  }
  // Bullets.
  ctx.fillStyle = '#ffe98a';
  for (const b of c.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Thugs.
  for (const thug of state.thugs) {
    if (thug.dead) continue;
    ctx.save();
    ctx.translate(thug.x, thug.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a1f1f';
    ctx.beginPath();
    ctx.roundRect(-7, -8, 14, 13, 4);
    ctx.fill();
    ctx.fillStyle = '#d9a06b';
    ctx.beginPath();
    ctx.arc(0, -12, 6, 0, Math.PI * 2);
    ctx.fill();
    // Gun.
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(thug.angle) * 16, Math.sin(thug.angle) * 16);
    ctx.stroke();
    // Health bar.
    ctx.fillStyle = '#111';
    ctx.fillRect(-12, -24, 24, 4);
    ctx.fillStyle = '#e04040';
    ctx.fillRect(-12, -24, 24 * Math.max(0, thug.health / 100), 4);
    ctx.restore();
  }
}

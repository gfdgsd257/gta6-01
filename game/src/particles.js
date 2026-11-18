// Particles: smoke puffs, sparks, muzzle flashes and blood-free impact
// stars. Short-lived, capped, and drawn as simple vector shapes.
export function createParticles() {
  const list = [];

  function add(p) {
    if (list.length > 320) list.shift();
    list.push(p);
  }

  return {
    list,
    smoke(x, y, count) {
      for (let i = 0; i < count; i++) {
        add({
          kind: 'smoke',
          x: x + (Math.random() - 0.5) * 14,
          y: y + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 30,
          vy: -20 - Math.random() * 30,
          life: 0.7 + Math.random() * 0.5,
          age: 0,
          size: 6 + Math.random() * 10,
        });
      }
    },
    sparks(x, y, count) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 120 + Math.random() * 220;
        add({
          kind: 'spark',
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0.25 + Math.random() * 0.3,
          age: 0,
          size: 2 + Math.random() * 2,
        });
      }
    },
    flash(x, y) {
      add({ kind: 'flash', x, y, vx: 0, vy: 0, life: 0.08, age: 0, size: 16 });
    },
    ring(x, y, color) {
      add({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.5, age: 0, size: 8, color });
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.age += dt;
        if (p.age >= p.life) {
          list.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'spark') {
          p.vx *= 0.92;
          p.vy *= 0.92;
        }
      }
    },
    draw(ctx) {
      for (const p of list) {
        const t = 1 - p.age / p.life;
        if (p.kind === 'smoke') {
          ctx.globalAlpha = 0.35 * t;
          ctx.fillStyle = '#cfd4d8';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'spark') {
          ctx.globalAlpha = t;
          ctx.fillStyle = '#ffd23a';
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else if (p.kind === 'flash') {
          ctx.globalAlpha = t;
          ctx.fillStyle = '#ffe98a';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * t + 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'ring') {
          ctx.globalAlpha = t;
          ctx.strokeStyle = p.color || '#ffb03a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + (1 - t) * 26, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}

// Story and missions: three jobs for Leo Marin, a courier trying to
// buy his way out of Solmar Bay. Each mission is a small state machine
// — go here, do this, get paid — with dialogue from the dispatcher.
export const MISSION_REWARDS = [150, 300, 500];

const MISSIONS = [
  {
    id: 'package-run',
    title: '1 — Package Run',
    intro: 'Marta: Leo, a parcel is waiting at the market square. Pick it up, then run it to the Coral Hotel. No detours, no trouble.',
    stages: [
      { label: 'Pick up the parcel at the market square', x: 1260, y: 1260, radius: 70 },
      { label: 'Deliver the parcel to the Coral Hotel', x: 2520, y: 840, radius: 70 },
    ],
    complete: 'Marta: Clean run. The hotel paid $150. You are getting good at this.',
  },
  {
    id: 'hot-wheels',
    title: '2 — Hot Wheels',
    intro: 'Marta: A client needs wheels, fast. Steal any car on the street and bring it to the chop shop on the south side. The cops will notice — drive like you mean it.',
    stages: [
      { label: 'Steal a car (walk up and press E)', x: 0, y: 0, radius: 0, needCar: true },
      { label: 'Drive to the chop shop — lose the cops if you can', x: 2940, y: 2100, radius: 80, needCar: true },
    ],
    complete: 'Marta: The shop paid $300 for that one. You drive like the city owes you money.',
    onStart: (state) => { state.toast('Steal any car — press E next to one'); },
  },
  {
    id: 'pier-rescue',
    title: '3 — Pier Rescue',
    intro: 'Marta: Nico is pinned down on the pier by the Dock Rats. Get down there, deal with them, and bring Nico back to the garage alive.',
    stages: [
      { label: 'Reach the pier at the end of the bridge', x: 1800, y: 2380, radius: 90 },
      { label: 'Deal with the Dock Rats (3 thugs)', x: 1800, y: 2380, radius: 0, needThugsDead: true },
      { label: 'Bring Nico back to the garage', x: 630, y: 630, radius: 80 },
    ],
    complete: 'Nico: You came back for me. That is worth $500 — and a friend for life.',
    onStart: (state) => { state.toast('Head south across the bridge to the pier'); },
  },
];

export function createMissions() {
  return {
    index: 0,
    stage: 0,
    active: false,
    done: false,
    allDone: false,
    // A follower (Nico) who trails the player once rescued.
    follower: null,
  };
}

export function currentMission(state) {
  const m = state.missions;
  if (m.allDone || m.index >= MISSIONS.length) return null;
  return MISSIONS[m.index];
}

export function currentTarget(state) {
  const mission = currentMission(state);
  if (!mission || !state.missions.active) return null;
  const stage = mission.stages[state.missions.stage];
  if (!stage) return null;
  return { x: stage.x, y: stage.y, label: stage.label, radius: stage.radius || 70 };
}

export function startMission(state, index) {
  const m = state.missions;
  m.index = index;
  m.stage = 0;
  m.active = true;
  m.done = false;
  const mission = MISSIONS[index];
  state.dialogue = { speaker: 'Marta', text: mission.intro, timer: 7 };
  state.objective = mission.stages[0].label;
  state.audio.mission();
  if (mission.onStart) mission.onStart(state);
  if (index === 2) {
    // The Dock Rats wait at the pier until Leo arrives.
    state.thugs = [
      { x: 1740, y: 2400, angle: 0, health: 100, shootTimer: 1, dead: false },
      { x: 1860, y: 2420, angle: 0, health: 100, shootTimer: 1.5, dead: false },
      { x: 1800, y: 2330, angle: 0, health: 100, shootTimer: 2, dead: false },
    ];
    // Clear the bridge of traffic for the firefight: a car crossing the
    // narrow pier would eat every bullet meant for the Dock Rats.
    for (const car of state.cars) {
      if (!car.traffic) continue;
      if (Math.hypot(car.x - 1800, car.y - 2380) < 650) {
        car.x = 420 + state.rng.range(-30, 30);
        car.y = 420 + state.rng.range(-30, 30);
        car.angle = state.rng.chance(0.5) ? 0 : Math.PI / 2;
        car.speed = car.cruise;
      }
    }
  }
}

export function beginNextMission(state) {
  if (state.missions.index < MISSIONS.length && !state.missions.allDone) {
    startMission(state, state.missions.index);
  }
}

function advanceStage(state, mission) {
  const m = state.missions;
  // Stealing the getaway car in mission 2 puts the cops on the player.
  if (m.index === 1 && m.stage === 0) {
    state.addWanted(2, 'grand theft auto');
    state.toast('The cops are onto the stolen car!');
  }
  m.stage += 1;
  if (m.stage >= mission.stages.length) {
    completeMission(state);
  } else {
    state.objective = mission.stages[m.stage].label;
    state.audio.pickup();
  }
}

function completeMission(state) {
  const m = state.missions;
  const mission = MISSIONS[m.index];
  const reward = MISSION_REWARDS[m.index];
  state.player.money += reward;
  state.completedMissions = Math.max(state.completedMissions, m.index + 1);
  state.missionCompleteFlash = 3.2;
  state.dialogue = { speaker: 'Job done', text: `${mission.complete} (+$${reward})`, timer: 6 };
  state.audio.mission();
  m.active = false;
  m.done = true;
  m.index += 1;
  if (m.index >= MISSIONS.length) {
    m.allDone = true;
    state.objective = 'All jobs done — Solmar Bay is yours. Free roam!';
    state.dialogue = { speaker: 'Marta', text: 'That is every job on the board, Leo. The city is yours now — keep the money, keep driving.', timer: 8 };
  } else {
    state.objective = 'Job complete! Press Enter for the next job, or return to the garage.';
  }
  state.saveProgress();
}

export function updateMissions(state, dt) {
  const m = state.missions;
  if (m.allDone) return;
  if (!m.active) {
    // Between jobs: walk (or drive) to the garage marker to start the next.
    if ((m.done || m.index === 0) && m.index < MISSIONS.length) {
      const d = Math.hypot(state.player.x - 630, state.player.y - 630);
      if (d < 90) {
        startMission(state, state.missions.index);
      }
    }
    return;
  }
  const mission = MISSIONS[m.index];
  const stage = mission.stages[m.stage];
  if (!stage) return;

  if (stage.needThugsDead) {
    const alive = state.thugs.filter((t) => !t.dead).length;
    state.objective = `Deal with the Dock Rats — ${alive} left`;
    if (alive === 0) {
      // Nico joins Leo and follows him home.
      m.follower = { x: 1800, y: 2440, angle: 0 };
      state.dialogue = { speaker: 'Nico', text: 'Thanks, Leo. Let us get out of here — back to the garage.', timer: 5 };
      m.stage += 1;
      state.objective = mission.stages[m.stage].label;
      state.audio.mission();
    }
    return;
  }

  if (stage.needCar && !state.player.car) {
    state.objective = stage.label;
    return;
  }
  if (stage.radius === 0) {
    // A pure "get in a car" stage completes as soon as the player has one.
    advanceStage(state, mission);
    return;
  }

  state.objective = stage.label;
  const d = Math.hypot(state.player.x - stage.x, state.player.y - stage.y);
  if (d < stage.radius) {
    state.particles.ring(stage.x, stage.y, '#4fc98a');
    advanceStage(state, mission);
  }
}

export function onThugDown(state) {
  // The stage check in updateMissions handles the count; this is the hook
  // combat calls so the mission module stays the single source of truth.
  updateMissions(state, 0);
}

export function updateFollower(state, dt) {
  const f = state.missions.follower;
  if (!f) return;
  const dx = state.player.x - f.x;
  const dy = state.player.y - f.y;
  const d = Math.hypot(dx, dy) || 1;
  if (d > 60) {
    const speed = 200;
    f.x += (dx / d) * speed * dt;
    f.y += (dy / d) * speed * dt;
    f.angle = Math.atan2(dy, dx);
  }
}

export function missionList(state) {
  return MISSIONS.map((m, i) => ({
    title: m.title,
    done: i < state.completedMissions,
    current: i === state.missions.index && state.missions.active,
  }));
}

// Keyboard and mouse input: one place that owns every key the game
// listens to, so the rest of the game only asks "is this held?" or
// "was this just pressed?".
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_HANDBRAKE = 16;
export const ACTION_MUTE = 32;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyE: ACTION_ENTER_CAR,
  KeyF: ACTION_PUNCH,
  KeyM: ACTION_MUTE,
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseClicked = false;

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function onMouseDown(event) {
    onMouseMove(event);
    mouseClicked = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    // -1/0/1 drive axis: W/Up forward, S/Down back.
    driveAxis() {
      const up = held.has('KeyW') || held.has('ArrowUp');
      const down = held.has('KeyS') || held.has('ArrowDown');
      return (up ? 1 : 0) - (down ? 1 : 0);
    },
    // -1/0/1 steering axis: A/Left, D/Right.
    steerAxis() {
      const left = held.has('KeyA') || held.has('ArrowLeft');
      const right = held.has('KeyD') || held.has('ArrowRight');
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    // On foot: a unit vector from the held movement keys.
    moveVector() {
      const x = this.steerAxis();
      const y = this.driveAxis();
      const len = Math.hypot(x, y);
      if (len === 0) return { x: 0, y: 0 };
      return { x: x / len, y: -y / len };
    },
    running() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    handbrake() {
      return held.has('Space');
    },
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    takeClick() {
      const clicked = mouseClicked;
      mouseClicked = false;
      return clicked;
    },
    // Edge-triggered actions, consumed once per frame.
    takeActions() {
      let actions = 0;
      for (const code of pressed) {
        if (KEY_ACTIONS[code]) actions |= KEY_ACTIONS[code];
      }
      pressed.clear();
      return actions;
    },
    anyKey() {
      return pressed.size > 0 || mouseClicked;
    },
  };
}

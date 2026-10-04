import { W, H, CS } from "./config.js";
import { astar } from "./map.js";
import { setPath } from "./unit.js";

// 挂接鼠标 + 键盘
export function attach(canvas, state, camera) {
  const keys = {};
  state.keys = keys;
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === "w" || e.key === "a" || e.key === "s" || e.key === "d" || e.key.startsWith("Arrow"))
      camera.keysLock = true;
  });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });

  function world(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * (canvas.width / r.width);
    const py = (e.clientY - r.top) * (canvas.height / r.height);
    return { px, py, wx: px + camera.offX, wy: py + camera.offY };
  }

  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const p = world(e);
    state.dragBox = { px0: p.px, py0: p.py, wx0: p.wx, wy0: p.wy, moved: false };
  });
  canvas.addEventListener("mousemove", (e) => {
    if (!state.dragBox) return;
    const p = world(e);
    if (Math.abs(p.px - state.dragBox.px0) > 6 || Math.abs(p.py - state.dragBox.py0) > 6) state.dragBox.moved = true;
    state.dragBox.wx1 = p.wx;
    state.dragBox.wy1 = p.wy;
  });
  canvas.addEventListener("mouseup", (e) => {
    if (!state.dragBox) return;
    const box = state.dragBox;
    state.dragBox = null;
    const p = world(e);
    if (box.moved) {
      // 框选
      const x0 = Math.min(box.wx0, box.wx1) / CS, x1 = Math.max(box.wx0, box.wx1) / CS;
      const y0 = Math.min(box.wy0, box.wy1) / CS, y1 = Math.max(box.wy0, box.wy1) / CS;
      const picked = state.units.filter((u) =>
        u.owner === "P" && u.alive &&
        Math.round(u.x) >= x0 && Math.round(u.x) <= x1 &&
        Math.round(u.y) >= y0 && Math.round(u.y) <= y1
      );
      state.selected = picked.length === 0 ? null : picked.length === 1 ? picked[0] : picked;
      state.moveTarget = null;
      return;
    }
    // 普通点击
    const gx = Math.floor(p.wx / CS), gy = Math.floor(p.wy / CS);
    if (gx < 0 || gx >= W || gy < 0 || gy >= H) return;
    const self = state.units.find((u) => u.owner === "P" && u.alive && Math.round(u.x) === gx && Math.round(u.y) === gy);
    if (self) {
      state.selected = self;
      state.moveTarget = null;
      return;
    }
    if (!state.selected || !state.selected.alive) return;
    setPath(state.selected, gx, gy, astar);
    state.moveTarget = { x: gx, y: gy };
  });

  return keys;
}

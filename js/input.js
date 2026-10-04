import { W, H, CS } from "./config.js";
import { astar } from "./map.js";
import { setPath } from "./unit.js";

export function attach(canvas, state, camera) {
  const keys = {};
  state.keys = keys;
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === "w" || e.key === "a" || e.key === "s" || e.key === "d" || e.key.startsWith("Arrow"))
      camera.keysLock = true;
  });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });

  function local(e) {
    const r = canvas.getBoundingClientRect();
    return {
      px: (e.clientX - r.left) * (canvas.width / r.width),
      py: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }
  function toWorld(px, py) {
    return { wx: px + camera.offX, wy: py + camera.offY };
  }

  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const p = local(e);
    state.dragBox = { px0: p.px, py0: p.py, px1: p.px, py1: p.py, moved: false };
  });
  canvas.addEventListener("mousemove", (e) => {
    if (!state.dragBox) return;
    const p = local(e);
    const dx = Math.abs(p.px - state.dragBox.px0), dy = Math.abs(p.py - state.dragBox.py0);
    if (dx > 4 || dy > 4) state.dragBox.moved = true;
    state.dragBox.px1 = p.px;
    state.dragBox.py1 = p.py;
  });
  window.addEventListener("mouseup", (e) => {
    if (!state.dragBox) return;
    const box = state.dragBox;
    state.dragBox = null;
    if (box.moved) {
      // 框选: 用 mouseup 时的相机偏移, 把像素框换算成世界格
      const p = local(e);
      const bx0 = Math.min(box.px0, p.px), bx1 = Math.max(box.px0, p.px);
      const by0 = Math.min(box.py0, p.py), by1 = Math.max(box.py0, p.py);
      const wx0 = bx0 + camera.offX, wx1 = bx1 + camera.offX;
      const wy0 = by0 + camera.offY, wy1 = by1 + camera.offY;
      const cx0 = Math.floor(wx0 / CS), cx1 = Math.ceil(wx1 / CS) - 1;
      const cy0 = Math.floor(wy0 / CS), cy1 = Math.ceil(wy1 / CS) - 1;
      const picked = state.units.filter((u) => {
        if (u.owner !== "P" || !u.alive) return false;
        const ux = u.x * CS + CS / 2, uy = u.y * CS + CS / 2;
        return ux >= wx0 && ux <= wx1 && uy >= wy0 && uy <= wy1;
      });
      state.selected = picked.length === 0 ? null : picked.length === 1 ? picked[0] : picked;
      state.moveTarget = null;
      return;
    }
    // 普通点击(未移动)
    const p2 = local(e);
    const w = toWorld(p2.px, p2.py);
    const gx = Math.floor(w.wx / CS), gy = Math.floor(w.wy / CS);
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
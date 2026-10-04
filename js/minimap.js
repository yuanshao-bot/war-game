import { W, H, CS, TERRAIN } from "./config.js";
import { allCities, terrAt } from "./map.js";

const MINI = 180;
const SX = MINI / (W * CS); // 小地图像素 / 世界像素
const SY = MINI / (H * CS);

export function drawMinimap(ctx, cam, state, units, fog, vw, vh) {
  const { cityOwner } = state;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, MINI, MINI);
  // 地形（仅已探索/可见）
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = x + "," + y;
      if (!fog.explored.has(k)) continue;
      ctx.fillStyle = TERRAIN[terrAt(x, y)].color;
      ctx.globalAlpha = fog.visible.has(k) ? 0.95 : 0.4;
      ctx.fillRect(x * CS * SX, y * CS * SY, CS * SX, CS * SY);
    }
  ctx.globalAlpha = 1;
  // 城市
  for (const c of allCities()) {
    const ck = c.x + "," + c.y;
    if (!fog.explored.has(ck)) continue;
    const o = cityOwner ? cityOwner[ck] : null;
    ctx.fillStyle = o ? (o.owner === "P" ? "#4fc3f7" : o.owner === "E" ? "#ef5350" : "#888") : "#546e7a";
    ctx.fillRect(c.x * CS * SX - 1, c.y * CS * SY - 1, 3, 3);
  }
  // 单位
  for (const u of units) {
    if (!u.alive) continue;
    ctx.fillStyle = u.owner === "P" ? "#4fc3f7" : "#ef5350";
    ctx.fillRect(u.x * CS * SX - 1, u.y * CS * SY - 1, 2, 2);
  }
  // 视口框
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.strokeRect(cam.offX * SX, cam.offY * SY, vw * SX, vh * SY);
  ctx.restore();
  return { mini: MINI, sx: SX, sy: SY };
}

// 点击小地图 -> 世界坐标
export function minimapToWorld(px, py, res) {
  return { wx: px / res.sx, wy: py / res.sy };
}

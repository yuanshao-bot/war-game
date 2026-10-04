import { W, H, UC, FOG } from "./config.js";
import { allCities, terrAt, isCity } from "./map.js";

export function makeFog() {
  return { visible: new Set(), explored: new Set(), seed: new Set() };
}

// 计算某方当前可见格
export function calcVis(units, side) {
  const v = new Set();
  for (const u of units) {
    if (!u.alive || u.owner !== side) continue;
    const r = UC[u.type].vision;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (Math.hypot(x - u.x, y - u.y) <= r) v.add(x + "," + y);
  }
  return v;
}

// 城市归属：统计城内各边存活单位数
export function ownerOf(units) {
  const res = {};
  for (const c of allCities()) {
    let p = 0, e = 0;
    for (const u of units) {
      if (!u.alive) continue;
      const cx = Math.round(u.x), cy = Math.round(u.y);
      if (!isCity(cx, cy)) continue;
      if (Math.abs(cx - c.x) <= 1 && Math.abs(cy - c.y) <= 1) {
        if (u.owner === "P") p++; else e++;
      }
    }
    res[c.x + "," + c.y] = { p, e, owner: p > e ? "P" : e > p ? "E" : "neutral" };
  }
  return res;
}

// 开局种子视野：点亮地图中央一带
export function seedVision(fog) {
  const ccx = Math.floor(W / 2), ccy = Math.floor(H / 2), R = FOG.seedRadius;
  for (let y = ccy - R; y <= ccy + R; y++)
    for (let x = ccx - R; x <= ccx + R; x++) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const k = x + "," + y;
      fog.explored.add(k);
      if (Math.abs(x - ccx) <= R && Math.abs(y - ccy) <= R) {
        fog.visible.add(k);
        fog.seed.add(k);
      }
    }
}

// 每 0.3s 刷新玩家迷雾
export function refreshFog(fog, units) {
  fog.visible = calcVis(units, "P");
  fog.visible.forEach((k) => fog.explored.add(k));
  fog.seed.forEach((k) => { fog.visible.add(k); fog.explored.add(k); });
}

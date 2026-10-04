import { W, H, UC, FOG } from "./config.js";
import { allCities, terrAt, isCity } from "./map.js";

export function makeFog() {
  return { visible: new Set(), explored: new Set(), seed: new Set() };
}

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

// 开局种子视野：点亮玩家基地 + 敌方基地 + 地图中央
export function seedVision(fog, pCity, eCity) {
  const centers = [];
  if (pCity) centers.push(pCity);
  if (eCity) centers.push(eCity);
  centers.push({ x: Math.floor(W / 2), y: Math.floor(H / 2) });
  const R = FOG.seedRadius;
  for (const c of centers) {
    for (let y = c.y - R; y <= c.y + R; y++)
      for (let x = c.x - R; x <= c.x + R; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const k = x + "," + y;
        fog.explored.add(k);
        if (Math.abs(x - c.x) <= R && Math.abs(y - c.y) <= R) {
          fog.visible.add(k);
          fog.seed.add(k);
        }
      }
  }
}

export function refreshFog(fog, units) {
  fog.visible = calcVis(units, "P");
  if (!fog.seen) fog.seen = new Set();
  for (const k of fog.explored) {
    if (fog.seed.has(k) || fog.seen.has(k)) fog.visible.add(k);
    fog.seen.add(k);
  }
  fog.visible.forEach((k) => { fog.explored.add(k); fog.seen.add(k); });
  fog.seed.forEach((k) => { fog.visible.add(k); fog.explored.add(k); });
}

import { W, H, CS, TERRAIN, MOVE_COST, CITIES as CCFG } from "./config.js";

// 种子随机
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const map = Array.from({ length: H }, () => Array(W).fill("plains"));
const macroT = ["plains", "forest", "desert", "valley", "plains", "forest"];
(function genTerrain() {
  const rng = mulberry32(42);
  for (let my = 0; my < 12; my++)
    for (let mx = 0; mx < 12; mx++) {
      const t = macroT[(mx * 7 + my * 3) % macroT.length];
      for (let y = my * 5; y < my * 5 + 5 && y < H; y++)
        for (let x = mx * 5; x < mx * 5 + 5 && x < W; x++)
          if (rng() < 0.85) map[y][x] = t;
    }
})();

// 城市（中央 + 随机分布）
const CITIES = [];
(function genCities() {
  const crng = mulberry32(CCFG.seed);
  const ccx = Math.floor(W / 2), ccy = Math.floor(H / 2);
  CITIES.push({ x: ccx, y: ccy });
  let tries = 0;
  while (CITIES.length < CCFG.count && tries < 800) {
    tries++;
    const cx = 2 + Math.floor(crng() * (W - 4));
    const cy = 2 + Math.floor(crng() * (H - 4));
    if (CITIES.some((c) => Math.abs(c.x - cx) < CCFG.minDist && Math.abs(c.y - cy) < CCFG.minDist)) continue;
    CITIES.push({ x: cx, y: cy });
  }
  setCityArea(CITIES);
})();
function setCityArea(list) {
  for (const c of list)
    for (let y = c.y - 1; y <= c.y + 1; y++)
      for (let x = c.x - 1; x <= c.x + 1; x++)
        if (x >= 0 && x < W && y >= 0 && y < H) map[y][x] = "city";
}

export function terrAt(x, y) {
  return map[y] && map[y][x] ? map[y][x] : "plains";
}
export function isCity(x, y) {
  return terrAt(x, y) === "city";
}
export function getCityAt(x, y) {
  return CITIES.find((c) => c.x === x && c.y === y) || null;
}
export function allCities() {
  return CITIES;
}
export function cellCost(type, tx, ty) {
  if (tx < 0 || tx >= W || ty < 0 || ty >= H) return Infinity;
  return MOVE_COST[type](terrAt(tx, ty));
}
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export const MAP = { W, H, CS, TERRAIN };

// A* 寻路（地形成本加权）
export function astar(unit, tx, ty) {
  const sx = Math.round(unit.x), sy = Math.round(unit.y);
  if (sx === tx && sy === ty) return null;
  const open = [{ x: sx, y: sy, g: 0, f: 0, path: [] }];
  const gS = new Map([[sx + "," + sy, 0]]);
  const closed = new Set();
  let it = 0;
  while (open.length && it < 1500) {
    it++;
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    const k = cur.x + "," + cur.y;
    if (closed.has(k)) continue;
    closed.add(k);
    if (cur.x === tx && cur.y === ty) return cur.path;
    for (const dir of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dir[0], ny = cur.y + dir[1];
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const c = cellCost(unit.type, nx, ny);
      if (c === Infinity) continue;
      const nk = nx + "," + ny;
      const ng = cur.g + c;
      if (gS.has(nk) && ng >= gS.get(nk)) continue;
      gS.set(nk, ng);
      open.push({ x: nx, y: ny, g: ng, f: ng + Math.max(Math.abs(tx - nx), Math.abs(ty - ny)) * 0.9, path: cur.path.concat([{ x: nx, y: ny }]) });
    }
  }
  return null;
}

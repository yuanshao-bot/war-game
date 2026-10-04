import { UC, T_ATK, DECAY, RESUPPLY } from "./config.js";
import { terrAt, isCity, getCityAt, cellCost } from "./map.js";

let uid = 0;
export function makeUnit(type, owner, x, y) {
  const c = UC[type];
  return {
    id: uid++,
    type, owner,
    x, y,
    hp: c.hp, maxHp: c.hp,
    ammo: c.ammo, maxAmmo: c.ammo,
    exposure: 0,
    cdTimer: 0,
    path: null,
    alive: true,
  };
}
export function resetUid() { uid = 0; }
export function effAtk(u) {
  const t = terrAt(Math.round(u.x), Math.round(u.y));
  return UC[u.type].atk * (1 - u.exposure * DECAY.exposureDamage) * (T_ATK[u.type][t] || 1);
}
export function stealthed(u) {
  return u.type === "infantry" && terrAt(Math.round(u.x), Math.round(u.y)) === "forest";
}
// 时间衰减 / 城市补给
export function tickExposure(u, dt, cityOwnerMap) {
  const cx = Math.round(u.x), cy = Math.round(u.y);
  const inCity = isCity(cx, cy);
  const co = cityOwnerMap ? cityOwnerMap[cx + "," + cy] : null;
  const ownCity = inCity && co && co.owner === u.owner;
  if (ownCity) {
    u.exposure = Math.max(0, u.exposure - dt * DECAY.cityGen);
    u.hp = Math.min(u.maxHp, u.hp + dt * RESUPPLY.hpPerSec);
    u.ammo = Math.min(u.maxAmmo, u.ammo + dt * RESUPPLY.ammoPerSec);
  } else if (inCity) {
    u.exposure = Math.min(1, u.exposure + dt * DECAY.neutralCity);
  } else {
    u.exposure = Math.min(1, u.exposure + dt * DECAY.outside);
  }
}
// 连续移动（沿 A* 路径）
export function moveUnit(u, dt) {
  if (!u.path || !u.path.length) return;
  const t = u.path[0];
  const dx = t.x - u.x, dy = t.y - u.y;
  const d = Math.hypot(dx, dy);
  const c = cellCost(u.type, t.x, t.y);
  const step = UC[u.type].speed * dt / c;
  if (d <= step || d < 0.001) {
    u.x = t.x; u.y = t.y;
    u.path.shift();
  } else {
    u.x += (dx / d) * step;
    u.y += (dy / d) * step;
  }
}
export function setPath(u, tx, ty, pathFn) {
  u.path = pathFn(u, tx, ty);
}

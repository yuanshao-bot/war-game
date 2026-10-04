import { UC, T_DEF, DMG_JITTER } from "./config.js";
import { terrAt, dist } from "./map.js";
import { effAtk, stealthed } from "./unit.js";

// 计算某单位对某目标的地形减伤
export function terrainMitig(type, x, y) {
  const t = terrAt(Math.round(x), Math.round(y));
  return (T_DEF[t] && T_DEF[t][type]) || 0;
}

// 单位能否看到目标（用于玩家自动开火：需可见 + 隐身限制）
export function canSee(attacker, target, playerVis) {
  if (attacker.owner === "P") {
    const key = Math.round(target.x) + "," + Math.round(target.y);
    if (!playerVis.has(key)) return false;
    if (stealthed(target) && dist(attacker, target) > 1.6) return false;
  }
  return true;
}

// 找最近可攻击目标
export function findTarget(u, units, playerVis) {
  let tgt = null, best = Infinity;
  for (const e of units) {
    if (!e.alive || e.owner === u.owner) continue;
    const d = dist(u, e);
    if (d > UC[u.type].range) continue;
    if (!canSee(u, e, playerVis)) continue;
    if (d < best) { best = d; tgt = e; }
  }
  return tgt;
}

// 开火：返回 { dealt, killed }
export function fire(u, tgt, log) {
  const db = terrainMitig(tgt.type, tgt.x, tgt.y);
  const jit = 1 - DMG_JITTER / 2 + Math.random() * DMG_JITTER;
  const dmg = effAtk(u) * (1 - db) * jit;
  tgt.hp -= dmg;
  u.ammo--;
  u.cdTimer = UC[u.type].cd;
  let killed = false;
  if (tgt.hp <= 0) {
    tgt.alive = false;
    killed = true;
    if (tgt.owner === "E") log("玩家击毁敌方" + (tgt.cn || tgt.type) + "！");
    else log("敌方击毁你的" + (tgt.cn || tgt.type) + "！");
  }
  return { dealt: dmg, killed };
}

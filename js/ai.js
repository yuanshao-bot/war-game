// 敌方 AI: 独立经济 + 招募 + 多目标优先级决策 + 协同
// 优先级: 撤退补给 > 夺城市 > 猎杀 > 巡逻
import { UC, AI, ROST, ECON } from "./config.js";
import { allCities, dist, isCity } from "./map.js";
import { setPath, makeUnit } from "./unit.js";
import { astar } from "./map.js";
import { ownerOf } from "./fog.js";

let eco = null;
let memo = null;
let memoT = 0;

export function makeAI() {
  eco = { money: 200 };
  memo = null;
  memoT = 0;
  return eco;
}

function citiesOf(ownerMap, side) {
  return allCities().filter((c) => {
    const o = ownerMap[c.x + "," + c.y];
    return o && o.owner === side;
  });
}

function refresh(units, ownerMap) {
  memo = {
    eUnits: units.filter((u) => u.owner === "E" && u.alive),
    pUnits: units.filter((u) => u.owner === "P" && u.alive),
    eCities: citiesOf(ownerMap, "E"),
    pCities: citiesOf(ownerMap, "P"),
    t: Date.now(),
  };
}

// 找某点最近可驻留的己方城市(城内 E 数量 > P 数量)
function nearestSafeCity(u, ownerMap) {
  let best = null, bd = Infinity;
  for (const c of allCities()) {
    const o = ownerMap[c.x + "," + c.y];
    if (!o || o.owner === "P") continue;
    const d = dist(u, c);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// 对玩家城市评分: 距离越近 + 敌方驻留多 + 玩家驻留少 => 越该去夺
function seizeScore(u, c, ownerMap) {
  const o = ownerMap[c.x + "," + c.y];
  if (!o) return -1;
  const d = dist(u, c);
  return (o.e - o.p) * 2 - d * 0.15; // 城内 E 比 P 多越多越值得
}

// 单单位决策, 返回动作字符串(供日志/UI 展示)
function decide(u, ownerMap) {
  // 1) 撤退
  if (u.hp < u.maxHp * AI.retreatHp || u.ammo < u.maxAmmo * AI.retreatAmmo) {
    const c = nearestSafeCity(u, ownerMap);
    if (c) { setPath(u, c.x, c.y, astar); return "retreat"; }
  }
  // 2) 夺城市: 只打近距(<= seizeRange)且评分为正的玩家城市
  if (AI.seize && memo.pCities.length) {
    let best = null, bs = -Infinity;
    for (const c of memo.pCities) {
      const s = seizeScore(u, c, ownerMap);
      if (dist(u, c) <= AI.seizeRange && s > bs) { bs = s; best = c; }
    }
    if (best) { setPath(u, best.x, best.y, astar); return "seize"; }
  }
  // 3) 猎杀: 弱目标优先(血/弹越低越 attractive), 限定 3x 射程内
  if (memo.pUnits.length) {
    let tgt = null, score = -Infinity;
    for (const p of memo.pUnits) {
      const d = dist(u, p);
      if (d > UC[u.type].range * 3) continue;
      const s = (1 - p.hp / p.maxHp) * 40 + (1 - p.ammo / p.maxAmmo) * 20 - d * 0.4;
      if (s > score) { score = s; tgt = p; }
    }
    if (tgt) { setPath(u, Math.round(tgt.x), Math.round(tgt.y), astar); return "hunt"; }
  }
  // 4) 巡逻: 轮转己方城市
  if (memo.eCities.length) {
    if (isCity(Math.round(u.x), Math.round(u.y))) return "hold";
    const c = memo.eCities[u.id % memo.eCities.length];
    setPath(u, c.x, c.y, astar);
    return "patrol";
  }
  return "idle";
}

// 主入口: 每 AI.thinkSec 调用一次
export function think(units, ownerMap) {
  if (!eco) makeAI();
  const now = Date.now();
  // AI 收入
  eco.money += AI.incomeFactor * ECON.incomePerSec * AI.thinkSec;
  // 每 2s 刷新态势
  if (!memo || now - memo.t > 2000) refresh(units, ownerMap);
  const om = ownerMap || ownerOf(units);

  // 招募: 资金足 + 有己方城市 + 城市内有己方单位
  if (eco.money >= ROST[AI.recruitType] && memo.eCities.length) {
    const c = memo.eCities[0];
    const host = units.find((u) => u.owner === "E" && u.alive && Math.round(u.x) === c.x && Math.round(u.y) === c.y);
    if (host) {
      eco.money -= ROST[AI.recruitType];
      units.push(makeUnit(AI.recruitType, "E", c.x, c.y));
    }
  }

  const acts = [];
  for (const u of memo.eUnits) acts.push(decide(u, om));
  return acts;
}

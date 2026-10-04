import { UC, AI } from "./config.js";
import { dist, astar, allCities } from "./map.js";
import { setPath } from "./unit.js";

// 简单 AI：低血/低弹撤退最近己方城市，否则追击最近玩家单位
export function think(units) {
  for (const u of units) {
    if (u.owner !== "E" || !u.alive) continue;
    const low = u.hp < u.maxHp * AI.retreatHp || u.ammo < u.maxAmmo * AI.retreatAmmo;
    if (low) {
      let bestC = allCities()[0], bd = Infinity;
      for (const c of allCities()) {
        const d = dist(u, c);
        if (d < bd) { bd = d; bestC = c; }
      }
      setPath(u, bestC.x, bestC.y, astar);
      continue;
    }
    let tgt = null, bd = Infinity;
    for (const p of units) {
      if (p.owner !== "P" || !p.alive) continue;
      const d = dist(u, p);
      if (d < bd) { bd = d; tgt = p; }
    }
    if (tgt) setPath(u, Math.round(tgt.x), Math.round(tgt.y), astar);
  }
}

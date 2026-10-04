import { ROST, ECON } from "./config.js";
import { allCities, isCity } from "./map.js";
import { makeUnit } from "./unit.js";

export function makeEconomy() {
  return { money: 200 };
}

export function tickIncome(eco, dt) {
  eco.money += dt * ECON.incomePerSec;
}

export function addKillReward(eco) {
  eco.money += ECON.killReward;
}

// 招募: 资金足 + 有己方单位站在某城市内(以该单位最近的城市为准), 该城市归属必须为己方
export function recruit(eco, units, cityOwnerMap, log, type = "infantry", spawnAt = null) {
  // 1) 找第一个站在城市里的己方单位
  const inCity = units.find((u) => u.owner === "P" && u.alive && isCity(Math.round(u.x), Math.round(u.y)));
  if (!inCity) { log("需要己方单位站在城市里"); return false; }
  // 2) 确定招募点: 优先用指定城市, 否则取该单位最近的城市
  let c = spawnAt;
  if (!c) {
    let bd = Infinity;
    for (const cc of allCities()) {
      const d = (cc.x - inCity.x) * (cc.x - inCity.x) + (cc.y - inCity.y) * (cc.y - inCity.y);
      if (d < bd) { bd = d; c = cc; }
    }
  }
  if (!c) { log("没有可招募的城市"); return false; }
  // 3) 归属: 用 cityOwnerMap, 若为 null(初始化前) 则用单位实时重算, 不再出现\"未知\"
  let co = cityOwnerMap ? cityOwnerMap[c.x + "," + c.y] : null;
  if (!co) {
    let p = 0, e = 0;
    for (const u of units) {
      if (!u.alive) continue;
      const dx = Math.abs(Math.round(u.x) - c.x), dy = Math.abs(Math.round(u.y) - c.y);
      if ((dx <= 1 && dy <= 1) || (dx + dy <= 2)) { if (u.owner === "P") p++; else e++; }
    }
    co = { p, e, owner: p > e ? "P" : e > p ? "E" : "neutral" };
  }
  if (co.owner !== "P") { log("该城市不是你的(归属:" + co.owner + ", 城内 己" + co.p + ":敌" + co.e + ")"); return false; }
  // 4) 资金 + 招募
  if (eco.money < ROST[type]) { log("资金不足(" + type + ": " + ROST[type] + ", 现有 " + Math.floor(eco.money) + ")"); return false; }
  eco.money -= ROST[type];
  const nu = makeUnit(type, "P", c.x, c.y);
  units.push(nu);
  log("招募 " + type + " 于 (" + c.x + "," + c.y + ")");
  return nu;
}

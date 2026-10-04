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

// 招募: 需指定兵种 + 资金足 + 己方单位在归属己方的城市内
export function recruit(eco, units, cityOwnerMap, log, type = "infantry", spawnAt = null) {
  const inCity = units.find((u) => u.owner === "P" && u.alive && isCity(Math.round(u.x), Math.round(u.y)));
  if (!inCity) { log("需要一名己方单位在城市内"); return false; }
  const cx = Math.round(inCity.x), cy = Math.round(inCity.y);
  const co = cityOwnerMap ? cityOwnerMap[cx + "," + cy] : null;
  if (!co || co.owner !== "P") {
    log("该城市不是你控制的(归属:" + ((co && co.owner) || "未知") + ")"); return false;
  }
  const c = spawnAt || allCities().find((cc) => cc.x === cx && cc.y === cy) || allCities()[0];
  if (eco.money < ROST[type]) { log("资金不足(" + type + ")"); return false; }
  eco.money -= ROST[type];
  const nu = makeUnit(type, "P", c.x, c.y);
  units.push(nu);
  log("招募 " + type + " 于 (" + c.x + "," + c.y + ")");
  return nu;
}

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

// 招募：需己方单位在归属己方的城市内
export function recruit(eco, units, cityOwnerMap, log) {
  const inCity = units.find((u) => u.owner === "P" && u.alive && isCity(Math.round(u.x), Math.round(u.y)));
  if (!inCity) { log("需要一名己方单位在城市内"); return false; }
  const cx = Math.round(inCity.x), cy = Math.round(inCity.y);
  const co = cityOwnerMap ? cityOwnerMap[cx + "," + cy] : null;
  if (!co || co.owner !== "P") {
    log("该城市不是你的，无法招募(归属:" + ((co && co.owner) || "未知") + ")");
    return false;
  }
  const c = allCities().find((cc) => cc.x === cx && cc.y === cy) || allCities()[0];
  for (const t of Object.keys(ROST)) {
    if (eco.money >= ROST[t]) {
      eco.money -= ROST[t];
      units.push(makeUnit(t, "P", c.x, c.y));
      log("招募 " + t + " 于 (" + c.x + "," + c.y + ")");
      return true;
    }
  }
  log("资金不足");
  return false;
}

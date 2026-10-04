import { UC, CN, TERRAIN, FOG, AI, ROST, DECAY, W, H, CS } from "./config.js";
import { allCities, terrAt } from "./map.js";
import { makeUnit, resetUid, tickExposure, moveUnit, setPath } from "./unit.js";
import { findTarget, fire } from "./combat.js";
import { makeFog, refreshFog, ownerOf, seedVision } from "./fog.js";
import { makeEconomy, tickIncome, addKillReward, recruit as doRecruit } from "./economy.js";
import { think as aiThink } from "./ai.js";
import { makeCamera, centerOn, follow, step as camStep, clamp } from "./camera.js";
import { render } from "./render.js";
import { attach } from "./input.js";
import { drawMinimap, minimapToWorld } from "./minimap.js";

// ===== 启动 =====
const canvas = document.getElementById("cv");
const ctx = canvas.getContext("2d");
resetUid();

const sorted = [...allCities()].sort((a, b) => a.y - b.y);
const pCity = sorted[sorted.length - 1];
const eCity = sorted[0];
const units = [
  makeUnit("infantry", "P", pCity.x, pCity.y),
  makeUnit("tank", "P", pCity.x + 1, pCity.y),
  makeUnit("fighter", "P", pCity.x, pCity.y - 1),
  makeUnit("infantry", "E", eCity.x, eCity.y),
  makeUnit("tank", "E", eCity.x - 1, eCity.y),
  makeUnit("fighter", "E", eCity.x, eCity.y + 1),
];

const state = { units, selected: null, moveTarget: null, dragBox: null, cityOwner: null };

const fog = makeFog();
seedVision(fog, pCity, eCity);
const cam = makeCamera();
centerOn(cam, canvas);
const eco = makeEconomy();
const keys = attach(canvas, state, cam);

let gTime = 0, paused = false, speed = 1, visT = 0, aiT = 0, winDone = false, lastTs = 0;

const logEl = document.getElementById("log");
function logMsg(m) {
  logEl.innerHTML = "<div>" + m + "</div>" + logEl.innerHTML;
  if (logEl.children.length > 50) logEl.lastElementChild.remove();
}

function recruitNow(type) {
  if (eco.money < ROST[type]) { logMsg("资金不足"); return; }
  const ok = doRecruit(eco, units, state.cityOwner, logMsg);
  if (ok) state.cityOwner = ownerOf(units);
}
document.getElementById("recInf").onclick = () => recruitNow("infantry");
document.getElementById("recTank").onclick = () => recruitNow("tank");
document.getElementById("recFgh").onclick = () => recruitNow("fighter");

document.getElementById("pauseBtn").onclick = () => {
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "继续" : "暂停";
};
document.getElementById("speedBtn").onclick = () => {
  speed = speed === 1 ? 2 : 1;
  document.getElementById("speedBtn").textContent = speed + "x";
};

// 小地图点击 -> 相机跳转
let miniRes = null;
canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (canvas.width / r.width);
  const my = (e.clientY - r.top) * (canvas.height / r.height);
  if (!miniRes) return;
  if (mx < miniRes.mini && my < miniRes.mini) {
    const p = minimapToWorld(mx, my, miniRes);
    cam.offX = p.wx - canvas.width / 2;
    cam.offY = p.wy - canvas.height / 2;
    cam.keysLock = true;
    clamp(cam, canvas);
  }
});

function update(dt) {
  gTime += dt;
  tickIncome(eco, dt);
  visT += dt;
  if (visT > FOG.refreshSec) {
    visT = 0;
    refreshFog(fog, units);
    state.cityOwner = ownerOf(units);
  }
  aiT += dt;
  if (aiT > AI.thinkSec) {
    aiT = 0;
    aiThink(units);
  }
  for (const u of units) {
    if (!u.alive) continue;
    tickExposure(u, dt, state.cityOwner);
    moveUnit(u, dt);
    u.cdTimer -= dt;
    if (u.cdTimer <= 0 && u.ammo >= 1) {
      const tgt = findTarget(u, units, fog.visible);
      if (tgt) {
        const res = fire(u, tgt, (m) => logMsg(m));
        if (res.killed && tgt.owner === "E") addKillReward(eco);
      }
    }
  }
  checkWin();
}

function checkWin() {
  const p = units.filter((u) => u.owner === "P" && u.alive).length;
  const e = units.filter((u) => u.owner === "E" && u.alive).length;
  const el = document.getElementById("winEl");
  if (!winDone) {
    if (e === 0) { winDone = true; el.innerHTML = '<h1 style="color:#4caf50">胜利！消灭了所有敌方单位</h1>'; }
    else if (p === 0) { winDone = true; el.innerHTML = '<h1 style="color:#ef5350">失败！你的单位全被消灭</h1>'; }
  }
}

function updateUI() {
  document.getElementById("money").textContent = Math.floor(eco.money);
  const s = Math.floor(gTime);
  document.getElementById("time").textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  document.getElementById("pcount").textContent = units.filter((u) => u.owner === "P" && u.alive).length;
  document.getElementById("ecount").textContent = units.filter((u) => u.owner === "E" && u.alive).length;
  const info = document.getElementById("selInfo");
  const sel = state.selected;
  if (Array.isArray(sel)) {
    info.innerHTML = "<b>已选 " + sel.filter((u) => u.alive).length + " 个单位</b><br>点击微调";
  } else if (sel && sel.alive) {
    const t = TERRAIN[terrAt(Math.round(sel.x), Math.round(sel.y))];
    info.innerHTML =
      "<b>" + CN[sel.type] + "</b><br>HP:" + Math.round(sel.hp) +
      "<br>弹药:" + Math.floor(sel.ammo) + "/" + sel.maxAmmo +
      "<br>地形:" + t.name +
      "<br>战斗力:" + Math.round((1 - sel.exposure * DECAY.exposureDamage) * 100) + "%";
  } else info.innerHTML = "未选中<br>点击己方单位";
}

function loop(ts) {
  const dt = Math.min(0.05, ((ts - lastTs) / 1000 || 0) * speed);
  lastTs = ts;
  if (!paused) {
    update(dt);
    follow(cam, Array.isArray(state.selected) ? null : state.selected, canvas);
    camStep(cam, keys, dt, canvas);
  }
  render(ctx, canvas, {
    units: state.units, fog, cam,
    cityOwner: state.cityOwner,
    selected: state.selected, moveTarget: state.moveTarget, dragBox: state.dragBox,
  });
  // 小地图（左上角）
  miniRes = drawMinimap(ctx, cam, state, units, fog, canvas.width, canvas.height);
  updateUI();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);


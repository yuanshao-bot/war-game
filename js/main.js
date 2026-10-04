import { UC, CN, TERRAIN, FOG, AI, ROST, DECAY, W, H, CS } from "./config.js";
import { allCities, terrAt, isCity } from "./map.js";
import { makeUnit, resetUid, tickExposure, moveUnit, setPath } from "./unit.js";
import { findTarget, fire } from "./combat.js";
import { makeFog, refreshFog, ownerOf, seedVision } from "./fog.js";
import { makeEconomy, tickIncome, addKillReward, recruit as doRecruit } from "./economy.js";
import { makeAI, think as aiThink } from "./ai.js";
import { makeCamera, centerOn, follow, step as camStep, clamp } from "./camera.js";
import { render } from "./render.js";
import { attach } from "./input.js";
import { drawMinimap, minimapToWorld } from "./minimap.js";

// ===== 启动 =====
const canvas = document.getElementById("cv");
const ctx = canvas.getContext("2d");
resetUid();

const sorted = [...allCities()].sort((a, b) => a.y - b.y);
const pCity = sorted[Math.floor(sorted.length / 2)];
const eCity = sorted[0];
const units = [
  makeUnit("infantry", "P", pCity.x, pCity.y),
  makeUnit("tank", "P", pCity.x + 1, pCity.y),
  makeUnit("fighter", "P", pCity.x, pCity.y - 1),
  makeUnit("infantry", "E", eCity.x, eCity.y),
  makeUnit("tank", "E", eCity.x - 1, eCity.y),
  makeUnit("fighter", "E", eCity.x, eCity.y + 1),
];

const state = { units, selected: null, moveTarget: null, dragBox: null, cityOwner: ownerOf(units) };

const fog = makeFog();
seedVision(fog, pCity, eCity);
const cam = makeCamera();
makeAI();
centerOn(cam, canvas);
const eco = makeEconomy();
const keys = attach(canvas, state, cam);

let gTime = 0, paused = false, speed = 1, visT = 0, aiT = 0, winDone = false, lastTs = 0;

const logEl = document.getElementById("log");
function logMsg(m) {
  // 同类日志 2s 去重, 避免刷屏
  if (m === lastLog && Date.now() - lastLogT < 2000) { lastLogT = Date.now(); return; }
  lastLog = m; lastLogT = Date.now();
  logEl.innerHTML = "<div>" + m + "</div>" + logEl.innerHTML;
  if (logEl.children.length > 80) logEl.lastElementChild.remove();
}
let lastLog = "", lastLogT = 0;

function recruitNow(type) {
  const nu = doRecruit(eco, units, state.cityOwner, logMsg, type);
  if (nu) state.cityOwner = ownerOf(units);
}
document.getElementById("recInf").onclick = () => recruitNow("infantry");
// 日志折叠
document.getElementById("logToggle").onclick = () => {
  const el = document.getElementById("log");
  const t = document.getElementById("logToggle");
  const hidden = el.style.display === "none";
  el.style.display = hidden ? "" : "none";
  t.textContent = hidden ? "▼ 日志(点击收起)" : "▶ 日志(已收起, 点击展开)";
};
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
    aiThink(units, state.cityOwner);
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
    // 跟随: 只有"单击选中且仍在移动中"的单位才跟; 多选/拖动框选/选中单位已到达路径终点 => 不跟(避免相机回跳)
  const sel = state.selected;
  const focusUnit = (!Array.isArray(sel) && sel && sel.alive) ? sel : null;
  follow(cam, focusUnit, canvas);
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


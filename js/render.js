import { W, H, CS, UC, TERRAIN } from "./config.js";
import { allCities, terrAt } from "./map.js";
import { stealthed } from "./unit.js";

export function render(ctx, canvas, state) {
  const { units, fog, cam, cityOwner, selected, moveTarget, dragBox } = state;
  const VW = canvas.width, VH = canvas.height;
  const cx = cam.offX, cy = cam.offY;

  // 1) 整块填黑底（地图外画布区域保持黑）
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, VW, VH);

  // 2) 视口内地图格范围
  const x0 = Math.max(0, Math.floor(cx / CS));
  const y0 = Math.max(0, Math.floor(cy / CS));
  const x1 = Math.min(W - 1, Math.ceil((cx + VW) / CS) - 1);
  const y1 = Math.min(H - 1, Math.ceil((cy + VH) / CS) - 1);

  // 诊断: 若视口内无任何可见格子, 输出原因并强制点亮中心, 避免全黑
  let _litCount = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (fog.visible.has(x + "," + y)) _litCount++;
  if (_litCount === 0) {
    if (!window.__fogProbe) {
      window.__fogProbe = true;
      console.warn("[fog-probe] 视口内无可见格子", JSON.stringify({ x0, x1, y0, y1, cx, cy, visible: fog.visible.size, explored: fog.explored.size, seed: fog.seed ? fog.seed.size : -1 }));
    }
    const mx = Math.floor((x0 + x1) / 2), my = Math.floor((y0 + y1) / 2);
    for (let dy = -7; dy <= 7; dy++)
      for (let dx = -7; dx <= 7; dx++) {
        const k = (mx + dx) + "," + (my + dy);
        fog.visible.add(k); fog.explored.add(k);
      }
  }
  // 3) 地形 + 迷雾
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const px = CS * x - cx, py = CS * y - cy;
      const k = x + "," + y;
      ctx.fillStyle = TERRAIN[terrAt(x, y)].color;
      ctx.fillRect(px, py, CS, CS);
      if (!fog.explored.has(k)) {
        ctx.fillStyle = "rgba(0,0,0,0.92)";
        ctx.fillRect(px, py, CS, CS);
        continue;
      }
      if (!fog.visible.has(k)) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(px, py, CS, CS);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.strokeRect(px, py, CS, CS);
    }

  // 4) 城市边框（仅 3x3 全可见才画）
  for (const c of allCities()) {
    const ck = c.x + "," + c.y;
    const o = cityOwner ? cityOwner[ck] : null;
    if (!o) continue;
    let lit = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = c.x + dx, ny = c.y + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        if (fog.visible.has(nx + "," + ny)) lit++;
      }
    if (lit < 9) continue;
    let bx = (c.x - 1) * CS - cx, by = (c.y - 1) * CS - cy;
    let bw = CS * 3 - 2, bh = CS * 3 - 2;
    if (bx < 0) { bw -= -bx; bx = 0; }
    if (by < 0) { bh -= -by; by = 0; }
    if (bx + bw > VW) bw = VW - bx;
    if (by + bh > VH) bh = VH - by;
    if (bw <= 0 || bh <= 0) continue;
    ctx.strokeStyle = o.owner === "P" ? "#4fc3f7" : o.owner === "E" ? "#ef5350" : "#888";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw, bh);
    ctx.lineWidth = 1;
  }

  // 5) 选中范围圈（单选）
  if (selected && !Array.isArray(selected) && selected.alive) {
    const r = UC[selected.type].range * CS;
    ctx.beginPath();
    ctx.arc(selected.x * CS + CS / 2 - cx, selected.y * CS + CS / 2 - cy, r, 0, 7);
    ctx.strokeStyle = "rgba(79,195,247,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(79,195,247,0.08)";
    ctx.fill();
  }

  // 6) 移动目标连线
  if (selected && selected.alive && moveTarget) {
    const ux = selected.x * CS + CS / 2 - cx, uy = selected.y * CS + CS / 2 - cy;
    const tx = moveTarget.x * CS + CS / 2 - cx, ty = moveTarget.y * CS + CS / 2 - cy;
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "rgba(79,195,247,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(79,195,247,0.9)";
    ctx.lineWidth = 1;
    ctx.strokeRect(moveTarget.x * CS + 2 - cx, moveTarget.y * CS + 2 - cy, CS - 4, CS - 4);
    ctx.fillStyle = "rgba(79,195,247,0.9)";
    ctx.beginPath(); ctx.arc(tx, ty, 3, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 7) 单位
  for (const u of units) {
    if (!u.alive) continue;
    if (u.owner === "E" && !fog.visible.has(Math.round(u.x) + "," + Math.round(u.y))) continue;
    const px = u.x * CS + CS / 2 - cx, py = u.y * CS + CS / 2 - cy;
    ctx.fillStyle = u.owner === "P" ? "#4fc3f7" : "#ef5350";
    if (u.type === "infantry") ctx.fillRect(px - 5, py - 5, 10, 10);
    else if (u.type === "tank") { ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); }
    else {
      ctx.beginPath();
      ctx.moveTo(px, py - 9); ctx.lineTo(px + 9, py + 7); ctx.lineTo(px - 9, py + 7);
      ctx.closePath(); ctx.fill();
    }
    const hw = 18;
    ctx.fillStyle = "#000"; ctx.fillRect(px - hw / 2, py - 14, hw, 4);
    ctx.fillStyle = u.owner === "P" ? "#4caf50" : "#ff9800";
    ctx.fillRect(px - hw / 2, py - 14, hw * (u.hp / u.maxHp), 4);
    ctx.fillStyle = "#000"; ctx.fillRect(px - hw / 2, py + 10, hw, 3);
    ctx.fillStyle = "#e0e0e0"; ctx.fillRect(px - hw / 2, py + 10, hw * (u.ammo / u.maxAmmo), 3);
    if (u === selected || (Array.isArray(selected) && selected.includes(u))) {
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.strokeRect(u.x * CS + 1 - cx, u.y * CS + 1 - cy, CS - 2, CS - 2);
    }
    if (stealthed(u) && u.owner === "E") {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "10px monospace";
      ctx.fillText("?", px - 3, py + 24);
    }
  }

  // 8) 框选矩形
  if (dragBox && dragBox.moved) {
    const bx = Math.min(dragBox.px0, dragBox.px1), by = Math.min(dragBox.py0, dragBox.py1);
    const bw = Math.abs(dragBox.px1 - dragBox.px0), bh = Math.abs(dragBox.py1 - dragBox.py0);
    ctx.strokeStyle = "#4fc3f7"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.strokeRect(bx - cx, by - cy, bw, bh);
    ctx.fillStyle = "rgba(79,195,247,0.08)";
    ctx.fillRect(bx - cx, by - cy, bw, bh);
    ctx.setLineDash([]);
  }
}

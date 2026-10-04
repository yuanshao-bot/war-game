import { W, H, CS, CAM } from "./config.js";

export function makeCamera() {
  return { offX: 0, offY: 0, keysLock: false };
}

export function centerOn(cam, canvas) {
  cam.offX = Math.floor((W * CS - canvas.width) / 2);
  cam.offY = Math.floor((H * CS - canvas.height) / 2);
  clamp(cam, canvas);
}

export function clamp(cam, canvas) {
  const mx = Math.max(0, W * CS - canvas.width);
  const my = Math.max(0, H * CS - canvas.height);
  if (cam.offX > mx) cam.offX = mx;
  if (cam.offY > my) cam.offY = my;
  if (cam.offX < 0) cam.offX = 0;
  if (cam.offY < 0) cam.offY = 0;
}

// 跟随选中单位
export function follow(cam, focusUnit, canvas) {
  if (focusUnit && !cam.keysLock) {
    cam.offX = focusUnit.x * CS + CS / 2 - canvas.width / 2;
    cam.offY = focusUnit.y * CS + CS / 2 - canvas.height / 2;
    clamp(cam, canvas);
  }
}

// 键盘平移
export function step(cam, keys, dt, canvas) {
  const fast = (keys["ShiftLeft"] || keys["ShiftRight"]) ? CAM.fastMult : 1;
  const spd = CAM.panStep * fast * dt;
  if (keys["w"] || keys["ArrowUp"]) cam.offY -= spd;
  if (keys["s"] || keys["ArrowDown"]) cam.offY += spd;
  if (keys["a"] || keys["ArrowLeft"]) cam.offX -= spd;
  if (keys["d"] || keys["ArrowRight"]) cam.offX += spd;
  clamp(cam, canvas);
}

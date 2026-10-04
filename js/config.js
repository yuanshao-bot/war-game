// 所有数值规则集中在此。改数值不用碰逻辑。
export const CS = 24;        // 每格像素
export const W = 60, H = 60; // 地图格数

// 地形
export const TERRAIN = {
  plains: { name: "平原", color: "#8bc34a" },
  forest: { name: "森林", color: "#2e7d32" },
  desert: { name: "沙漠", color: "#e8c56d" },
  valley: { name: "山谷", color: "#6a8f8f" },
  city:   { name: "城市", color: "#546e7a" },
};

// 兵种基础属性
export const UC = {
  infantry: { hp: 100, atk: 9,  range: 1.3, cd: 0.8, ammo: 20, speed: 2.0, vision: 2.5 },
  tank:     { hp: 180, atk: 18, range: 2.6, cd: 2.0, ammo: 12, speed: 1.5, vision: 3.5 },
  fighter:  { hp: 90,  atk: 14, range: 5.0, cd: 1.2, ammo: 15, speed: 3.2, vision: 7.0 },
};

// 地形攻击修正（按兵种）
export const T_ATK = {
  tank:     { plains: 1.3, forest: 0.7, valley: 1, desert: 1, city: 1.1 },
  infantry: { plains: 1, forest: 1.1, valley: 1, desert: 1, city: 1 },
  fighter:  { plains: 1, forest: 1, valley: 1, desert: 1, city: 1 },
};

// 地形防御加成（被击中时减伤）
export const T_DEF = {
  forest: { infantry: 0.4, tank: 0.1 },
  valley: { infantry: 0.25, tank: 0.25, fighter: 0.25 },
  city:   { infantry: 0.15, tank: 0.15, fighter: 0.15 },
};

// 各兵种进入某地形格的移动成本
export const MOVE_COST = {
  fighter:  () => 0.7,
  tank:     (t) => ({ forest: 2, plains: 0.7, valley: 1.3, desert: 1.2, city: 1 }[t]),
  infantry: (t) => ({ forest: 1.2, plains: 1, valley: 1.4, desert: 1.3, city: 1 }[t]),
};

// 招募造价
export const ROST = { infantry: 100, tank: 250, fighter: 180 };
export const CN = { infantry: "步兵", tank: "坦克", fighter: "战机" };

// 时间 / 衰减
export const DECAY = {
  cityGen: 0.15,     // 己方城市内每秒恢复暴露度
  outside: 0.03,     // 城市外每秒累积暴露度
  neutralCity: 0.02,// 非己方城市内每秒累积
  exposureDamage: 0.5, // 满暴露度战斗力上限削减比例
};

// 城市补给
export const RESUPPLY = { hpPerSec: 20, ammoPerSec: 3 };

// 经济
export const ECON = { incomePerSec: 10, killReward: 50 };

// 城市生成
export const CITIES = { count: 14, minDist: 7, seed: 7 };

// 迷雾 / 种子视野
export const FOG = { refreshSec: 0.3, seedRadius: 12 };

// AI
export const AI = { thinkSec: 0.4, retreatHp: 0.4, retreatAmmo: 0.3 };

// 相机
export const CAM = { followSpeed: 500, panStep: 500, fastMult: 2 };

// 伤害浮动
export const DMG_JITTER = 0.2; // ±20%

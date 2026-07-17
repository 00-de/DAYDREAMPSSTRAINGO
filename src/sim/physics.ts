/**
 * 通勤形10両編成（約350t）を想定した走行計算。
 * 速度は km/h、距離は m、加速度は km/h/s で統一する。
 */
export const TRAIN = {
  cars: 10,
  maxSpeed: 120,
  powerNotches: 5,
  brakeNotches: 8,
  accelBase: 2.5,      // 定トルク領域の加速度
  fullTorqueTo: 45,    // ここまでは加速度が落ちない
  brakeMax: 3.5,       // 常用最大ブレーキ
  brakeEmergency: 4.5, // 非常ブレーキ
  brakeResponse: 0.55, // ブレーキが立ち上がるまでの空走時間 [s]
  length: 20 * 10,     // 編成長 [m]
};

/** 力行の加速度。高速域では定出力特性で頭打ちになる */
export function powerAccel(notch: number, v: number): number {
  if (notch <= 0 || v >= TRAIN.maxSpeed) return 0;
  let a = TRAIN.accelBase;
  if (v > TRAIN.fullTorqueTo) a = (TRAIN.accelBase * TRAIN.fullTorqueTo) / v;
  if (v > 85) a *= 0.85; // 特性領域
  return a * (notch / TRAIN.powerNotches);
}

/** ブレーキの減速度。9 は非常ブレーキ */
export function brakeDecel(notch: number): number {
  if (notch <= 0) return 0;
  if (notch >= 9) return TRAIN.brakeEmergency;
  return TRAIN.brakeMax * (notch / TRAIN.brakeNotches);
}

/** 走行抵抗（転がり + 空気）。Davis 式を N/t で計算して km/h/s に直す */
export function runResistance(v: number): number {
  const nPerTon = 8.0 + 0.08 * v + 0.0075 * v * v;
  return nPerTon * 0.0036;
}

/** 勾配抵抗。+‰（上り）で減速側に効く */
export function gradeAccel(permil: number): number {
  return -permil * 0.035;
}

/** 常用最大で止まるのに必要な距離 [m]（目安表示用） */
export function stoppingDistance(v: number, decel = TRAIN.brakeMax): number {
  const ms = v / 3.6;
  const beta = decel / 3.6;
  return (ms * ms) / (2 * beta) + ms * TRAIN.brakeResponse;
}

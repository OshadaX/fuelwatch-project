const TANK_HEIGHT = 37.78;
const TANK_RADIUS = 16.51;

exports.calculateVolumeLitres = (distance) => {
  const h = TANK_HEIGHT - distance;
  if (h <= 0) return 0;
  const volumeCM3 = Math.PI * TANK_RADIUS ** 2 * h;
  return volumeCM3 / 1000;
};

// src/utils/healthFeatures.js
function isValidDistance(x, maxRange = 400) {
  return Number.isFinite(x) && x > 0 && x < maxRange;
}

function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function mad(arr, med) {
  const dev = arr.map((x) => Math.abs(x - med));
  return median(dev);
}

function trimmedArray(arr, trimRatio = 0.1) {
  const a = [...arr].sort((x, y) => x - y);
  const k = Math.floor(a.length * trimRatio);
  // keep at least 5 samples if possible
  const start = Math.min(k, Math.max(0, a.length - 5));
  const end = Math.max(a.length - start, 5);
  return a.slice(start, end);
}

function mean(arr) {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) * (x - m), 0) / (arr.length - 1);
  return Math.sqrt(v);
}

/**
 * Research-grade per-run health features:
 * - invalidRatio
 * - medianDistance
 * - MAD (robust noise)
 * - outlierRatio (MAD z-score)
 * - trimmedStd
 * - sigmaEstimate (uncertainty proxy)
 * - maxJump (spike/echo instability)
 * - boundary stickiness (nearMinRatio/nearMaxRatio)
 */
function computeHealthFeatures(samples, opts = {}) {
  const {
    maxRange = 400,
    outlierZ = 3.5,
    trimRatio = 0.1,
    nearMinCm = 5,
    nearMaxCm = 350
  } = opts;

  const sampleCount = samples.length;

  const valid = samples.filter((x) => isValidDistance(x, maxRange));
  const invalidCount = sampleCount - valid.length;
  const invalidRatio = sampleCount ? invalidCount / sampleCount : 1;

  // Too few valid samples => mark as low-quality
  if (valid.length < 5) {
    return {
      sampleCount,
      validCount: valid.length,
      invalidCount,
      invalidRatio: Number(invalidRatio.toFixed(3)),

      medianDistance: null,
      mad: null,
      outlierRatio: 1,
      trimmedStd: null,
      sigmaEstimate: null,
      maxJump: null,
      nearMinRatio: null,
      nearMaxRatio: null
    };
  }

  const med = median(valid);
  const m = mad(valid, med);

  // Outliers via modified z-score (MAD)
  let outliers = 0;
  if (m > 0) {
    for (const x of valid) {
      const z = (0.6745 * (x - med)) / m;
      if (Math.abs(z) > outlierZ) outliers++;
    }
  }
  const outlierRatio = outliers / valid.length;

  // Max jump (instability) – based on time order of valid samples
  let maxJump = 0;
  for (let i = 1; i < valid.length; i++) {
    maxJump = Math.max(maxJump, Math.abs(valid[i] - valid[i - 1]));
  }

  // Trimmed std + sigma estimate
  const trimmed = trimmedArray(valid, trimRatio);
  const tStd = stddev(trimmed);
  const sigmaEstimate = tStd / Math.sqrt(trimmed.length || 1);

  const nearMinRatio = valid.filter((x) => x < nearMinCm).length / valid.length;
  const nearMaxRatio = valid.filter((x) => x > nearMaxCm).length / valid.length;

  return {
    sampleCount,
    validCount: valid.length,
    invalidCount,
    invalidRatio: Number(invalidRatio.toFixed(3)),

    medianDistance: Number(med.toFixed(2)),
    mad: Number(m.toFixed(2)),
    outlierRatio: Number(outlierRatio.toFixed(3)),

    trimmedStd: Number(tStd.toFixed(2)),
    sigmaEstimate: Number(sigmaEstimate.toFixed(3)),

    maxJump: Number(maxJump.toFixed(2)),
    nearMinRatio: Number(nearMinRatio.toFixed(3)),
    nearMaxRatio: Number(nearMaxRatio.toFixed(3))
  };
}

module.exports = { computeHealthFeatures };
/**
 * Glass Slab Dimension & Formula Calculation Engine
 * 
 * Implements standard Pakistani Glass Industry slab cut tiers (e.g. Ghani Glass):
 * 1. Formula 1: 0.1" Grace Tolerance (White / Mirror / 3mm / 5mm / Brown)
 *    - Width or Height <= 6.1" -> 6"
 *    - > 6.1" and <= 9.1" -> 9"
 *    - > 9.1" and <= 12.1" -> 12"
 *    - > 12.1" and <= 15.1" -> 15", etc.
 * 
 * 2. Formula 2: Strict Step Grid (8mm / 10mm / 12mm Heavy Glass, Polish)
 *    - Width or Height <= 6" -> 6"
 *    - > 6" and <= 9" -> 9"
 *    - > 9" and <= 12" -> 12"
 *    - Strict steps without tolerance.
 * 
 * Area formula: ((Adjusted Width * Adjusted Height) / 144) * Pieces
 */

export const DEFAULT_WIDTH_STEPS = [6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72, 84, 96, 102, 108, 114, 120, 126, 132, 144];
export const DEFAULT_GHANI_STEPS = [6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 108, 120, 144];

export function parseStepsString(stepsInput) {
  if (Array.isArray(stepsInput)) {
    return stepsInput.map(Number).filter(n => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  }
  if (typeof stepsInput === 'string') {
    return stepsInput
      .split(/[,;\s]+/)
      .map(s => parseFloat(s.trim()))
      .filter(n => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
  }
  return DEFAULT_WIDTH_STEPS;
}

/**
 * Finds the nearest matching standard glass slab tier for a dimension
 * @param {number|string} val - Input dimension in inches
 * @param {Array<number>} steps - Sorted array of slab sizes in inches
 * @param {number} tolerance - Grace tolerance in inches (e.g. 0.10)
 * @param {number} minVal - Minimum allowable slab dimension
 * @returns {number} The calculated/available glass slab dimension in inches
 */
export function findSlabTier(val, steps = DEFAULT_WIDTH_STEPS, tolerance = 0, minVal = 6) {
  const num = parseFloat(val);
  if (!Number.isFinite(num) || num <= 0) return 0;

  const sorted = (steps && steps.length > 0) ? steps : DEFAULT_WIDTH_STEPS;
  const tol = parseFloat(tolerance) || 0;
  const minThreshold = parseFloat(minVal) || sorted[0] || 6;

  // Check each step tier in ascending order
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    // If input is less than or equal to tier + tolerance, this slab tier applies
    // E.g. tier = 6, tol = 0.1 -> num <= 6.1001 -> return 6
    if (num <= (tier + tol + 0.0001)) {
      return Math.max(tier, minThreshold);
    }
  }

  // If size exceeds the largest defined tier, step by 6" intervals
  const maxTier = sorted[sorted.length - 1];
  let current = maxTier;
  while (num > (current + tol + 0.0001)) {
    current += 6;
  }
  return current;
}

/**
 * Calculate glass dimensions, adjusted sizes, and square footage quantity
 * 
 * @param {Object} params
 * @param {number|string} params.width - Input width in inches
 * @param {number|string} params.height - Input height in inches
 * @param {number|string} params.pieces - Number of pieces (default 1)
 * @param {Object|null} params.formula - Formula configuration object
 * @returns {Object} Calculated dimensions and quantity
 */
export function calculateGlassDimensions({
  width,
  height,
  pieces = 1,
  formula = null
}) {
  const rawW = parseFloat(width);
  const rawH = parseFloat(height);
  const pcs = parseInt(pieces, 10) || 1;

  if (!Number.isFinite(rawW) || rawW <= 0 || !Number.isFinite(rawH) || rawH <= 0) {
    return {
      calc_width: Number.isFinite(rawW) && rawW > 0 ? Math.ceil(rawW) : '',
      calc_height: Number.isFinite(rawH) && rawH > 0 ? Math.ceil(rawH) : '',
      pieces: pcs,
      quantity: 0,
      formula_name: formula?.name || 'Default'
    };
  }

  const roundingRule = formula?.rounding_rule || 'SLAB_TIERS';
  const tolerance = parseFloat(formula?.tolerance) || 0;
  const divisor = parseFloat(formula?.divisor) || 144;
  const minW = parseFloat(formula?.min_width) || 6;
  const minH = parseFloat(formula?.min_height) || 6;

  let calcW = 0;
  let calcH = 0;

  if (roundingRule === 'SLAB_TIERS') {
    const widthSteps = parseStepsString(formula?.width_steps || DEFAULT_GHANI_STEPS);
    const heightSteps = formula?.height_steps
      ? parseStepsString(formula.height_steps)
      : widthSteps;

    calcW = findSlabTier(rawW, widthSteps, tolerance, minW);
    calcH = findSlabTier(rawH, heightSteps, tolerance, minH);
  } else if (roundingRule === 'CEIL_INCH') {
    calcW = Math.ceil(rawW);
    calcH = Math.ceil(rawH);
  } else if (roundingRule === 'ROUND_INCH') {
    calcW = Math.round(rawW);
    calcH = Math.round(rawH);
  } else if (roundingRule === 'ROUND_HALF') {
    calcW = Math.round(rawW * 2) / 2;
    calcH = Math.round(rawH * 2) / 2;
  } else {
    calcW = rawW;
    calcH = rawH;
  }

  // Calculate Square Feet: ((W * H) / Divisor) * Pieces
  const rawQty = ((calcW * calcH) / divisor) * pcs;
  const quantity = Number(rawQty.toFixed(2));

  return {
    raw_width: rawW,
    raw_height: rawH,
    calc_width: calcW,
    calc_height: calcH,
    pieces: pcs,
    quantity: quantity,
    formula_id: formula?.id || null,
    formula_name: formula?.name || 'Default Glass Formula',
    tolerance: tolerance,
    rounding_rule: roundingRule
  };
}

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

/**
 * Resolves the appropriate formula configuration for a given product
 * Checks product.formula, productsList lookup, or formulasList lookup by formula_id
 */
export function getProductFormula(product, productsList = [], formulasList = []) {
  if (!product) return null;

  // 1. Direct formula object on product
  if (product.formula && typeof product.formula === 'object' && (product.formula.width_steps || product.formula.name)) {
    return product.formula;
  }

  // 2. Lookup in productsList if product only has pro_id
  const proId = product.pro_id || product.id;
  const fullProd = Array.isArray(productsList) ? productsList.find(p => p.pro_id === proId || p.id === proId) : null;
  if (fullProd?.formula && typeof fullProd.formula === 'object' && (fullProd.formula.width_steps || fullProd.formula.name)) {
    return fullProd.formula;
  }

  // 3. Resolve by formula_id
  const formulaId = product.formula_id || fullProd?.formula_id;
  if (formulaId && Array.isArray(formulasList) && formulasList.length > 0) {
    const matched = formulasList.find(f => f.id === formulaId || f.id === parseInt(formulaId, 10));
    if (matched) return matched;
  }

  // 4. Default active formula in formulasList
  if (Array.isArray(formulasList) && formulasList.length > 0) {
    const defaultF = formulasList.find(f => f.is_default && f.is_active);
    if (defaultF) return defaultF;
    const firstActive = formulasList.find(f => f.is_active);
    if (firstActive) return firstActive;
  }

  return null;
}

/**
 * Parses size string from DB (e.g. '15"×14" (Avail: 15"×15") [1 pcs] - particular comments')
 * into individual dimensions: width_in, height_in, calc_width, calc_height, pieces, comments.
 */
export function parseSizeDetails(sizeStr, product = null, formulasList = []) {
  if (!sizeStr || typeof sizeStr !== 'string') {
    return { width_in: '', height_in: '', calc_width: '', calc_height: '', pieces: 1, comments: '' };
  }

  let comments = '';
  let mainPart = sizeStr.trim();

  // Extract comments after ' - '
  if (mainPart.includes(' - ')) {
    const parts = mainPart.split(' - ');
    mainPart = parts[0].trim();
    comments = parts.slice(1).join(' - ').trim();
  }

  // Extract pieces from [X pcs]
  let pieces = 1;
  const pcsMatch = mainPart.match(/\[(\d+)\s*pcs\]/i);
  if (pcsMatch) {
    pieces = parseInt(pcsMatch[1], 10) || 1;
    mainPart = mainPart.replace(pcsMatch[0], '').trim();
  }

  // Extract Avail (calc_width x calc_height)
  // Format: (Avail: 15"×15") or (Avail: 15"x15") or (Avail: 15×15)
  let calc_width = '';
  let calc_height = '';
  const availMatch = mainPart.match(/\(Avail:\s*([0-9.]+)\s*["']?\s*[x×]\s*([0-9.]+)\s*["']?\)/i);
  if (availMatch) {
    calc_width = parseFloat(availMatch[1]) || '';
    calc_height = parseFloat(availMatch[2]) || '';
    mainPart = mainPart.replace(availMatch[0], '').trim();
  }

  // Extract Entered Size (width_in x height_in)
  // Format: 15"×14" or 15"x14" or 15x14
  let width_in = '';
  let height_in = '';
  const enteredMatch = mainPart.match(/([0-9.]+)\s*["']?\s*[x×]\s*([0-9.]+)/i);
  if (enteredMatch) {
    width_in = parseFloat(enteredMatch[1]) || '';
    height_in = parseFloat(enteredMatch[2]) || '';
  }

  // If no calc sizes found from string but we have entered sizes:
  // calculate calc_width and calc_height using product formula if available
  if ((calc_width === '' || calc_height === '') && width_in !== '' && height_in !== '') {
    const formula = getProductFormula(product, [], formulasList);
    const calculated = calculateGlassDimensions({
      width: width_in,
      height: height_in,
      pieces,
      formula
    });
    calc_width = calculated.calc_width;
    calc_height = calculated.calc_height;
  }

  // If sizeStr didn't contain dimensions at all (e.g. General product), keep it as comments if comments is empty
  if (width_in === '' && height_in === '' && calc_width === '' && calc_height === '' && !comments) {
    comments = sizeStr;
  }

  return {
    width_in: width_in !== '' ? String(width_in) : '',
    height_in: height_in !== '' ? String(height_in) : '',
    calc_width: calc_width !== '' ? String(calc_width) : '',
    calc_height: calc_height !== '' ? String(calc_height) : '',
    pieces,
    comments
  };
}



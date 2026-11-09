import { calculateGlassDimensions } from '../src/lib/glass-formula.js';

const formula1 = {
  name: 'Ghani Glass 0.1" Tolerance',
  tolerance: 0.10,
  width_steps: '6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 144',
  divisor: 144
};

const formula2 = {
  name: 'Strict Step (0 Tolerance)',
  tolerance: 0.00,
  width_steps: '6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72, 84, 96, 102, 108, 114, 120, 126, 132, 144',
  divisor: 144
};

console.log('--- TEST FORMULA 1 (0.1" Grace Tolerance) ---');
console.log('W=6.0  -> Expected 6,  Got:', calculateGlassDimensions({ width: 6.0, height: 12, pieces: 1, formula: formula1 }).calc_width);
console.log('W=6.1  -> Expected 6,  Got:', calculateGlassDimensions({ width: 6.1, height: 12, pieces: 1, formula: formula1 }).calc_width);
console.log('W=6.2  -> Expected 9,  Got:', calculateGlassDimensions({ width: 6.2, height: 12, pieces: 1, formula: formula1 }).calc_width);
console.log('W=12.1 -> Expected 12, Got:', calculateGlassDimensions({ width: 12.1, height: 12, pieces: 1, formula: formula1 }).calc_width);
console.log('W=12.2 -> Expected 15, Got:', calculateGlassDimensions({ width: 12.2, height: 12, pieces: 1, formula: formula1 }).calc_width);

console.log('\n--- TEST FORMULA 2 (Strict Step, 0 Tolerance) ---');
console.log('W=6.0  -> Expected 6,  Got:', calculateGlassDimensions({ width: 6.0, height: 12, pieces: 1, formula: formula2 }).calc_width);
console.log('W=6.1  -> Expected 9,  Got:', calculateGlassDimensions({ width: 6.1, height: 12, pieces: 1, formula: formula2 }).calc_width);
console.log('W=12.0 -> Expected 12, Got:', calculateGlassDimensions({ width: 12.0, height: 12, pieces: 1, formula: formula2 }).calc_width);
console.log('W=12.1 -> Expected 15, Got:', calculateGlassDimensions({ width: 12.1, height: 12, pieces: 1, formula: formula2 }).calc_width);

console.log('\n--- AREA & PIECES TEST ---');
const areaResult = calculateGlassDimensions({ width: 12.6, height: 23, pieces: 1, formula: formula1 });
console.log('12.6" x 23" -> Adjusted:', areaResult.calc_width, 'x', areaResult.calc_height, 'Quantity (Sq Ft):', areaResult.quantity);

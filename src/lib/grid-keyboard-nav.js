/**
 * src/lib/grid-keyboard-nav.js
 *
 * Full 4-way arrow key navigation (Up, Down, Left, Right) for items grid tables
 * in Sales, Orders, and Quotations pages.
 */

const COLUMN_ORDER = [
  'serial_no',
  'pro_title',
  'comments',
  'width_in',
  'height_in',
  'pieces',
  'calc_width',
  'calc_height',
  'quantity',
  'rate'
];

/**
 * Returns inputProps attributes to tag an input for grid navigation.
 */
export function gridNavProps(rowIndex, colKey) {
  return {
    'data-grid-row': String(rowIndex),
    'data-grid-col': colKey,
  };
}

/**
 * Helper to determine if Left arrow should trigger cell navigation.
 */
function shouldNavigateLeft(input) {
  if (input.type === 'number') {
    return true;
  }
  try {
    const { selectionStart, selectionEnd, value } = input;
    if (selectionStart == null || selectionEnd == null) return true;
    const len = (value || '').length;
    // Navigate if whole text is selected or caret is at beginning
    return (selectionStart === 0 && selectionEnd === len) ||
           (selectionStart === 0 && selectionEnd === 0);
  } catch {
    return true;
  }
}

/**
 * Helper to determine if Right arrow should trigger cell navigation.
 */
function shouldNavigateRight(input) {
  if (input.type === 'number') {
    return true;
  }
  try {
    const { selectionStart, selectionEnd, value } = input;
    if (selectionStart == null || selectionEnd == null) return true;
    const len = (value || '').length;
    // Navigate if whole text is selected or caret is at end
    return (selectionStart === 0 && selectionEnd === len) ||
           (selectionStart === len && selectionEnd === len);
  } catch {
    return true;
  }
}

/**
 * Find the best matching input in a target row when the exact column might not exist.
 */
function findBestColumnInRow(rowInputs, currentCol) {
  if (!rowInputs || rowInputs.length === 0) return null;
  const directMatch = rowInputs.find(inp => inp.getAttribute('data-grid-col') === currentCol);
  if (directMatch) return directMatch;

  const currentIdx = COLUMN_ORDER.indexOf(currentCol);
  if (currentIdx === -1) return rowInputs[0];

  let bestInput = rowInputs[0];
  let bestDistance = Infinity;

  for (const inp of rowInputs) {
    const col = inp.getAttribute('data-grid-col');
    const idx = COLUMN_ORDER.indexOf(col);
    if (idx !== -1) {
      const dist = Math.abs(idx - currentIdx);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestInput = inp;
      }
    }
  }

  return bestInput;
}

/**
 * Main keydown handler to attach to <TableContainer> or <table>.
 */
export function handleGridKeyDown(e) {
  const key = e.key;
  if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight') {
    return;
  }

  const currentInput = e.target;
  if (!currentInput || currentInput.tagName !== 'INPUT') return;

  const rowAttr = currentInput.getAttribute('data-grid-row');
  if (rowAttr === null || rowAttr === undefined) return;

  const currentRow = parseInt(rowAttr, 10);
  const currentCol = currentInput.getAttribute('data-grid-col') || '';

  const container = currentInput.closest('table') || currentInput.closest('[data-grid-container]') || currentInput.closest('.MuiTableContainer-root');
  if (!container) return;

  const allInputs = Array.from(container.querySelectorAll('input[data-grid-row]'));
  if (allInputs.length === 0) return;

  if (key === 'ArrowUp') {
    e.preventDefault();
    if (currentRow <= 0) return;

    const rowAboveInputs = allInputs.filter(inp => parseInt(inp.getAttribute('data-grid-row'), 10) === currentRow - 1);
    const target = findBestColumnInRow(rowAboveInputs, currentCol);
    if (target) {
      target.focus();
      try { target.select(); } catch {}
    }
    return;
  }

  if (key === 'ArrowDown') {
    e.preventDefault();
    const rowBelowInputs = allInputs.filter(inp => parseInt(inp.getAttribute('data-grid-row'), 10) === currentRow + 1);
    if (rowBelowInputs.length === 0) return;

    const target = findBestColumnInRow(rowBelowInputs, currentCol);
    if (target) {
      target.focus();
      try { target.select(); } catch {}
    }
    return;
  }

  if (key === 'ArrowLeft') {
    if (!shouldNavigateLeft(currentInput)) return;

    const currentIndex = allInputs.indexOf(currentInput);
    if (currentIndex > 0) {
      e.preventDefault();
      const prevInput = allInputs[currentIndex - 1];
      prevInput.focus();
      try { prevInput.select(); } catch {}
    }
    return;
  }

  if (key === 'ArrowRight') {
    if (!shouldNavigateRight(currentInput)) return;

    const currentIndex = allInputs.indexOf(currentInput);
    if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
      e.preventDefault();
      const nextInput = allInputs[currentIndex + 1];
      nextInput.focus();
      try { nextInput.select(); } catch {}
    }
    return;
  }
}

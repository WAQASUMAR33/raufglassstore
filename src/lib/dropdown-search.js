/**
 * Universal substring & multi-token pattern matcher for dropdowns, autocompletes, and search inputs.
 * Ensures matching anywhere in the string: start, middle, or end.
 *
 * Example:
 * Name: "Waqas Umar Hayat"
 * Search: "qas" -> Matches (middle of Waqas)
 * Search: "umar" -> Matches (middle word)
 * Search: "hayat" -> Matches (end word)
 * Search: "waqas hayat" -> Matches (multi-word pattern)
 */

export function matchSearchPattern(targetStringOrArray, query) {
  if (!query) return true;
  const q = String(query).toLowerCase().trim();
  if (!q) return true;

  const target = (Array.isArray(targetStringOrArray) ? targetStringOrArray : [targetStringOrArray])
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!target) return false;

  // Direct substring match anywhere (start, middle, end)
  if (target.includes(q)) return true;

  // Multi-token match: every whitespace-separated word in query must be present anywhere in target
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((token) => target.includes(token));
  }

  return false;
}

/**
 * Filter customer / account dropdown options in MUI Autocomplete.
 */
export function filterCustomerDropdown(options, stateOrInput, limit = 150) {
  if (!options || !Array.isArray(options)) return [];
  const rawInput = typeof stateOrInput === 'object' && stateOrInput !== null
    ? stateOrInput.inputValue
    : stateOrInput;
  const inputValue = typeof rawInput === 'string' ? rawInput : '';

  if (!inputValue || !inputValue.trim()) {
    return limit ? options.slice(0, limit) : options;
  }
  const q = inputValue.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);
  const out = [];

  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    if (!o) continue;
    const searchable = [
      o.cus_name,
      o.name_urdu,
      o.cus_phone_no,
      o.cus_phone_no2,
      o.cus_address,
      o.cus_reference,
      o.city?.city_name || (typeof o.city === 'string' ? o.city : ''),
      o.cus_type_title || o.customer_type?.cus_type_title || o.cus_type_name,
      o.cus_cat_title || o.customer_category?.cus_cat_title,
      o.cus_id ? String(o.cus_id) : ''
    ].filter(Boolean).join(' ').toLowerCase();

    if (searchable.includes(q) || (tokens.length > 1 && tokens.every(t => searchable.includes(t)))) {
      out.push(o);
      if (limit && out.length >= limit) break;
    }
  }

  return out;
}

/**
 * Filter product dropdown options in MUI Autocomplete.
 */
export function filterProductDropdown(options, stateOrInput, limit = 150) {
  if (!options || !Array.isArray(options)) return [];
  const rawInput = typeof stateOrInput === 'object' && stateOrInput !== null
    ? stateOrInput.inputValue
    : stateOrInput;
  const inputValue = typeof rawInput === 'string' ? rawInput : '';

  if (!inputValue || !inputValue.trim()) {
    return limit ? options.slice(0, limit) : options;
  }
  const q = inputValue.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);
  const out = [];

  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    if (!o) continue;
    const searchable = [
      o.pro_title,
      o.pro_code,
      o.category?.cat_name || o.category?.cat_title || o.cat_title || o.cat_name,
      o.subcategory?.sub_cat_name || o.sub_category?.sub_cat_name || o.subcategory?.sub_cat_title || o.sub_cat_title,
      o.pro_id ? String(o.pro_id) : ''
    ].filter(Boolean).join(' ').toLowerCase();

    if (searchable.includes(q) || (tokens.length > 1 && tokens.every(t => searchable.includes(t)))) {
      out.push(o);
      if (limit && out.length >= limit) break;
    }
  }

  return out;
}

/**
 * Universal filter for generic object or string options in MUI Autocomplete.
 */
export function createUniversalFilter(getFields = (o) => [o?.name || o?.title || o?.label || String(o || '')], limit = 150) {
  return (options, stateOrInput) => {
    if (!options || !Array.isArray(options)) return [];
    const rawInput = typeof stateOrInput === 'object' && stateOrInput !== null
      ? stateOrInput.inputValue
      : stateOrInput;
    const inputValue = typeof rawInput === 'string' ? rawInput : '';

    if (!inputValue || !inputValue.trim()) {
      return limit ? options.slice(0, limit) : options;
    }
    const q = inputValue.toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);
    const out = [];

    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (!o) continue;
      const fields = getFields(o);
      const searchable = (Array.isArray(fields) ? fields : [fields]).filter(Boolean).join(' ').toLowerCase();

      if (searchable.includes(q) || (tokens.length > 1 && tokens.every(t => searchable.includes(t)))) {
        out.push(o);
        if (limit && out.length >= limit) break;
      }
    }

    return out;
  };
}


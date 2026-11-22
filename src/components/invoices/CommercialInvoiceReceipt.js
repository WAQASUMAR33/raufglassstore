'use client';

import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { printDirectSingleItemLabel } from '@/lib/print-glass-label';

// Format currency
const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format quantity / rate
const fmtNum = (val) => {
  const n = parseFloat(val || 0);
  if (isNaN(n)) return '0.00';
  if (n % 1 === 0) return n.toString();
  return n.toFixed(2);
};

// Format dimensions cleanly without trailing zeros
const fmtDim = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const n = parseFloat(val);
  if (isNaN(n)) return String(val).trim();
  if (n % 1 === 0) return n.toString();
  return parseFloat(n.toFixed(3)).toString();
};

const formatDimension = (h, w) => {
  const dh = fmtDim(h);
  const dw = fmtDim(w);
  if (!dh && !dw) return '—';
  if (dh && dw) return `${dh}" × ${dw}"`;
  return `${dh || dw}"`;
};

// Cache addons in memory across renders
let cachedAddons = null;

// Parse line item details (width, height, pcs, job desc) and expand any ad-ons
export function expandInvoiceLineItems(detail, availableAddons = []) {
  let actualWidth = detail.width_in !== undefined && detail.width_in !== null && detail.width_in !== '' ? detail.width_in : '';
  let actualHeight = detail.height_in !== undefined && detail.height_in !== null && detail.height_in !== '' ? detail.height_in : '';
  let calcWidth = detail.calc_width !== undefined && detail.calc_width !== null && detail.calc_width !== '' ? detail.calc_width : '';
  let calcHeight = detail.calc_height !== undefined && detail.calc_height !== null && detail.calc_height !== '' ? detail.calc_height : '';
  let pcs = detail.pieces ?? detail.qnty_pcs ?? '';
  let jobDesc = detail.comments || '';

  const sizeStr = String(detail.size || '').trim();

  // Try parsing actual dimensions from sizeStr if missing
  if ((!actualWidth || !actualHeight) && sizeStr) {
    const preMatch = sizeStr.split(/\(Avail|\[/i)[0];
    const dimMatch = preMatch.match(/(\d+(?:\.\d+)?)\s*["']?\s*[×x*X]\s*(\d+(?:\.\d+)?)/);
    if (dimMatch) {
      if (!actualWidth) actualWidth = dimMatch[1];
      if (!actualHeight) actualHeight = dimMatch[2];
    }
  }

  // Parse Avail (standard) dimensions from sizeStr if missing
  if ((!calcWidth || !calcHeight) && sizeStr) {
    const availMatch = sizeStr.match(/\(Avail:\s*(\d+(?:\.\d+)?)\s*["']?\s*[×x*X]\s*(\d+(?:\.\d+)?)\s*["']?\)/i);
    if (availMatch) {
      if (!calcWidth) calcWidth = availMatch[1];
      if (!calcHeight) calcHeight = availMatch[2];
    }
  }

  // If standard dimensions still missing, calculate or fallback to actual
  if (!calcWidth && actualWidth) {
    const nw = parseFloat(actualWidth);
    calcWidth = (!isNaN(nw) && nw > 0) ? Math.ceil(nw).toString() : actualWidth;
  }
  if (!calcHeight && actualHeight) {
    const nh = parseFloat(actualHeight);
    calcHeight = (!isNaN(nh) && nh > 0) ? Math.ceil(nh).toString() : actualHeight;
  }

  if (!pcs && sizeStr) {
    const pcsMatch = sizeStr.match(/\[(\d+)\s*pcs\]/i);
    if (pcsMatch) {
      pcs = pcsMatch[1];
    }
  }
  if (!pcs) pcs = 1;

  if (!jobDesc && sizeStr) {
    const cleanSize = sizeStr.replace(/\[(?:Ad-?Ons?|Addons?):\s*[^\]]+\]/i, '').trim();
    const commentMatch = cleanSize.match(/\]\s*-\s*(.+)$/) || cleanSize.match(/^-\s*(.+)$/);
    if (commentMatch) {
      jobDesc = commentMatch[1].trim();
    }
  }
  if (jobDesc) {
    jobDesc = jobDesc.replace(/\s*\((?:Ad-?Ons?|Addons?):\s*[^)]+\)/i, '').trim();
  }

  let itemName = detail.product?.pro_title || detail.pro_title || detail.product_name || 'Glass Item';
  const genMatch = sizeStr.match(/^(?:General:\s*|\[General:\s*)([^\]\n]+)\]?/i);
  if (genMatch) {
    const rawGen = genMatch[1].trim();
    if (rawGen.includes(' - ') && (!jobDesc || jobDesc === '-')) {
      const parts = rawGen.split(' - ');
      itemName = parts[0].trim();
      jobDesc = parts.slice(1).join(' - ').trim();
    } else {
      itemName = rawGen;
    }
  } else if ((itemName === 'General Product' || itemName === 'General Item') && detail.comments) {
    itemName = detail.comments;
  }

  const detailQty = parseFloat(detail.qnty || 0);
  const detailRate = parseFloat(detail.unit_rate ?? detail.rate ?? 0);
  const detailTotalAmount = parseFloat(detail.total_amount ?? detail.amount ?? 0);

  let parsedAddons = [];
  if (Array.isArray(detail.selected_addons) && detail.selected_addons.length > 0) {
    parsedAddons = detail.selected_addons.map(a => {
      const name = a.name || a.addon?.name;
      const rate = parseFloat(a.sale_price || a.addon?.sale_price || a.rate || 0);
      return { name, rate };
    }).filter(a => a.name);
  }

  const addonMatch = sizeStr.match(/\[(?:Ad-?Ons?|Addons?):\s*([^\]]+)\]/i);
  if (addonMatch && parsedAddons.length === 0) {
    const rawTokens = addonMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    parsedAddons = rawTokens.map(token => {
      const rateMatch = token.match(/^(.*?)(?:\s*[@:]\s*|\s*\((?:Rs\.?\s*|Rate:\s*)?)([0-9.]+)\)?$/i);
      if (rateMatch) {
        return {
          name: rateMatch[1].trim(),
          rate: parseFloat(rateMatch[2]) || 0
        };
      }
      const cleanTokenName = token.replace(/\s*\(.*?\)/, '').trim();
      const catalogMatch = (availableAddons || []).find(
        cat => cat.name?.toLowerCase() === cleanTokenName.toLowerCase() ||
               cat.short_code?.toLowerCase() === cleanTokenName.toLowerCase()
      );
      return {
        name: cleanTokenName,
        rate: catalogMatch ? parseFloat(catalogMatch.sale_price || 0) : 0
      };
    }).filter(a => a.name);
  } else if (parsedAddons.length > 0 && availableAddons?.length > 0) {
    parsedAddons = parsedAddons.map(a => {
      if (a.rate > 0) return a;
      const catalogMatch = availableAddons.find(
        cat => cat.name?.toLowerCase() === a.name?.toLowerCase() ||
               cat.short_code?.toLowerCase() === a.name?.toLowerCase()
      );
      return {
        name: a.name,
        rate: catalogMatch ? parseFloat(catalogMatch.sale_price || 0) : a.rate
      };
    });
  }

  return [{
    pro_id: detail.pro_id,
    itemName: itemName,
    jobDesc: jobDesc || '-',
    actualWidth: actualWidth,
    actualHeight: actualHeight,
    calcWidth: calcWidth,
    calcHeight: calcHeight,
    pcs: Number(pcs) || 1,
    qtySqFt: detailQty,
    rate: detailRate,
    amount: detailTotalAmount,
    addons: parsedAddons,
    isAddon: false,
  }];
}

export function parseInvoiceLineItem(detail, availableAddons = []) {
  const items = expandInvoiceLineItems(detail, availableAddons);
  return items[0];
}

// Format Date as DD-MMM-YY (e.g. 18-Oct-26)
function formatInvoiceDate(dateVal) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateVal);
  }
}

/**
 * CommercialInvoiceReceipt Component
 * Supports 3 specialized copies:
 * 1. OFFICE: Full columns (#, Item Name, Job Desc, Actual Size, Pcs, Standard Size, Qty, Rate, Value) + Full financial summary
 * 2. CUSTOMER: (#, Item Name, Job Desc, Actual Size, Pcs, Value) + Customer billing summary
 * 3. CUTTER: (#, Item Name, Job Desc, Actual Size, Pcs) + Workshop cutting & sign-off box (NO rates/amounts)
 */
export default function CommercialInvoiceReceipt({
  bill = {},
  copyType = 'OFFICE',
  isOrder = false,
  isQuotation = false,
  title = null,
  onPrintLabel = null,
}) {
  if (!bill) return null;

  const copy = String(copyType || 'OFFICE').toUpperCase();

  // Header title
  const baseInvoiceTitle = title || (
    isQuotation || bill.bill_type === 'QUOTATION'
      ? 'Quotation'
      : bill.bill_type === 'ORDER' || isOrder
      ? 'Commercial Invoice'
      : bill.is_return
      ? 'Sale Return Invoice'
      : 'Commercial Invoice'
  );

  const copyBadgeText = copy === 'CUTTER'
    ? 'CUTTER COPY'
    : copy === 'CUSTOMER'
    ? 'CUSTOMER COPY'
    : 'OFFICE COPY';

  const copyBadgeBg = copy === 'CUTTER'
    ? '#b45309'
    : copy === 'CUSTOMER'
    ? '#047857'
    : '#1e40af';

  const [availableAddons, setAvailableAddons] = React.useState(cachedAddons || []);

  React.useEffect(() => {
    if (!cachedAddons) {
      fetch('/api/addons?status=ACTIVE')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            cachedAddons = data;
            setAvailableAddons(data);
          }
        })
        .catch(err => console.error('Failed to load addons for invoice:', err));
    }
  }, []);

  // Parse lines
  const rawDetails = Array.isArray(bill.sale_details) ? bill.sale_details : [];
  const lines = rawDetails.flatMap(d => expandInvoiceLineItems(d, availableAddons));

  // Totals calculation
  const totalPcs = lines.reduce((sum, item) => sum + (typeof item.pcs === 'number' ? item.pcs : 0), 0);
  const totalSqFt = lines.filter(item => !item.isAddon).reduce((sum, item) => sum + (item.qtySqFt || 0), 0);
  const totalItemsValue = lines.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Group lines by product for per-group sub totals
  const productGroups = React.useMemo(() => {
    if (!lines || lines.length === 0) return [];
    const map = new Map();
    const groupOrder = [];

    lines.forEach((item) => {
      const key = item.pro_id ? `id_${item.pro_id}` : `name_${(item.itemName || '').trim().toLowerCase()}`;
      if (!map.has(key)) {
        const group = {
          key,
          itemName: item.itemName,
          items: [],
          totalPcs: 0,
          totalSqFt: 0,
          totalAmount: 0,
        };
        map.set(key, group);
        groupOrder.push(group);
      }
      const group = map.get(key);
      group.items.push(item);
      group.totalPcs += (typeof item.pcs === 'number' ? item.pcs : 0);
      group.totalSqFt += (item.qtySqFt || 0);
      group.totalAmount += (item.amount || 0);
    });

    return groupOrder;
  }, [lines]);

  // Extract Cutter / Fitter
  const fitterMatch = String(bill.reference || bill.notes || '').match(/\[Fitter:\s*([^\]]+)\]/i);
  const fitterName = bill.fitter_name || (fitterMatch ? fitterMatch[1].trim() : '') || (Array.isArray(bill.fitter_details) && bill.fitter_details[0]?.accountName) || '';
  const cutterMatch = String(bill.reference || bill.notes || '').match(/\[Cutter:\s*([^\]]+)\]/i);
  let rawCutter = bill.cutter_name || (cutterMatch ? cutterMatch[1].trim() : '');
  let cutterCharges = parseFloat(bill.cutter_amount || bill.cutter_charges || 0);
  if (rawCutter) {
    const amtM = rawCutter.match(/\(Rs\.?\s*([0-9.]+)\)/i);
    if (amtM) {
      if (!cutterCharges) cutterCharges = parseFloat(amtM[1]) || 0;
      rawCutter = rawCutter.replace(/\(Rs\.?\s*[0-9.]+\)/i, '').trim();
    }
  }
  const cutterName = rawCutter || '-';
  const displayFitter = fitterName && rawCutter ? `${fitterName} (Cutter: ${rawCutter})` : (fitterName || rawCutter || '-');

  // Extract DC No
  const dcMatch = String(bill.reference || bill.notes || '').match(/\[DC:\s*([^\]]+)\]/i);
  const dcNo = bill.dc_no || (dcMatch ? dcMatch[1].trim() : '') || bill.vehicle_no || '-';

  // Clean Remarks
  let remarks = String(bill.notes || bill.reference || '')
    .replace(/\[Cutter:[^\]]+\]/gi, '')
    .replace(/\[Fitter:[^\]]+\]/gi, '')
    .replace(/\[Hardware:[^\]]+\]/gi, '')
    .replace(/\[DC:[^\]]+\]/gi, '')
    .replace(/\[Retail\]|\[Whole sale\]/gi, '')
    .trim();
  if (!remarks) remarks = '-';

  // Invoice Numbers
  const invoiceNo = bill.sale_id || bill.order_id || bill.bill_number || bill.return_id || '—';
  const qNo = bill.loaded_order_id || bill.order_id || '0';

  // Financial values
  const discount = parseFloat(bill.discount || 0);
  const carriage = parseFloat(bill.loader_amount || bill.shipping_amount || bill.delivery_charges || 0);
  const labourCharges = parseFloat(bill.labour_charges || bill.labour || 0);
  const fittingCharges = parseFloat(bill.fitter_amount || bill.fitting_charges || 0) || (Array.isArray(bill.fitter_details) ? bill.fitter_details.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0) : 0);
  const hwMatch = String(bill.reference || bill.notes || '').match(/\[Hardware:\s*(?:Rs\.\s*)?([0-9.]+)\]/i);
  const hardwareCharges = parseFloat(bill.hardware_amount || 0) || (hwMatch ? parseFloat(hwMatch[1]) : 0);
  const billValue = parseFloat(bill.total_amount || 0);

  const cashPayment = parseFloat(bill.cash_payment || (bill.payment && !bill.bank_payment ? bill.payment : 0) || 0);
  const bankPayment = parseFloat(bill.bank_payment || 0);
  const advancePayment = parseFloat(bill.advance_payment || 0);
  const bankTitle = bill.bank_title || '';

  const totalPaid = parseFloat(bill.payment !== undefined && bill.payment !== null ? bill.payment : (cashPayment + bankPayment + advancePayment));
  const balance = billValue - totalPaid;
  const rawPrevBal = parseFloat(
    bill.previous_balance !== undefined && bill.previous_balance !== null
      ? bill.previous_balance
      : (bill.previous_customer_balance !== undefined && bill.previous_customer_balance !== null
        ? bill.previous_customer_balance
        : (bill.customer?.cus_balance ?? 0))
  ) || 0;
  const hasPrevBal = Math.abs(rawPrevBal) > 0.009;
  const prevBal = rawPrevBal;
  const totalBalance = prevBal - balance;

  const invLabel = isQuotation || bill.bill_type === 'QUOTATION'
    ? 'QUOT. NO.:'
    : (isOrder || bill.bill_type === 'ORDER' ? 'ORDER NO.:' : 'INV. NO.:');

  return (
    <Box
      style={{
        width: '100%',
        maxWidth: '140mm',
        margin: '0 auto',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
      }}
      sx={{
        width: '100%',
        maxWidth: '140mm',
        mx: 'auto',
        p: { xs: 0.5, sm: 1 },
        bgcolor: '#ffffff',
        color: '#000000',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        boxSizing: 'border-box',
        '@media print': {
          p: '0.5mm 1mm',
          maxWidth: '100%',
          width: '100%',
        },
      }}
    >
      {/* ───────────────── HEADER SECTION ───────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '4px' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', border: 'none', padding: 0 }}>
              <table style={{ borderCollapse: 'collapse', border: 'none' }}>
                <tbody>
                  <tr>
                    <td style={{ verticalAlign: 'middle', paddingRight: '8px', border: 'none' }}>
                      <img
                        src="/zain-logo.png"
                        alt="Zain Traders"
                        style={{
                          width: '44px',
                          height: '44px',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                    </td>
                    <td style={{ verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '0.03em', lineHeight: 1.1, color: '#000000' }}>
                        ZAIN TRADERS
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1.15, color: '#1e293b', textTransform: 'uppercase', marginTop: '1px' }}>
                        Mandi Bahauddin
                      </div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#333333', lineHeight: 1.15, marginTop: '2px' }}>
                        Phalia Road , Near Aljannat Petrol pump M.B.Din.
                      </div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#000000', lineHeight: 1.15, marginTop: '2px' }}>
                        Ph: 0302-2133218, 0347-7743218
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right', border: 'none', padding: 0 }}>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: 'italic',
                  letterSpacing: '0.02em',
                  color: '#000000',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  lineHeight: 1.1,
                }}
              >
                {baseInvoiceTitle}
              </div>
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    backgroundColor: copyBadgeBg,
                    color: '#ffffff',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {copyBadgeText}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Decorative horizontal accent */}
      <div style={{ borderBottom: '1.5px solid #000000', marginBottom: '6px', width: '100%' }} />

      {/* ───────────────── CUSTOMER & INVOICE DETAILS ───────────────── */}
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px 0', border: 'none', marginBottom: '6px' }}>
        <tbody>
          <tr>
            {/* Left Box: Customer Info */}
            <td style={{ verticalAlign: 'top', width: '58%', border: '1px solid #000000', borderRadius: '4px', padding: '4px 6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '0.72rem' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '70px', fontWeight: 700, color: '#222', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>CUSTOMER:</td>
                    <td style={{ fontWeight: 600, color: '#000', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>
                      {bill.customer?.cus_name || 'Walking Customer'}
                      {bill.customer?.name_urdu ? ` (${bill.customer.name_urdu})` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#222', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>PHONE:</td>
                    <td style={{ fontWeight: 500, color: '#000', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>
                      {bill.customer?.cus_phone_no || bill.customer?.phone || bill.customer_phone || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#222', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>ADDRESS:</td>
                    <td style={{ fontWeight: 400, color: '#111', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>
                      {[bill.customer?.cus_address, bill.customer?.city?.city_name].filter(Boolean).join(', ') || bill.customer?.cus_address || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#222', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>FITTER:</td>
                    <td style={{ fontWeight: 400, color: '#000', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>
                      {displayFitter}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#222', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>REMARKS:</td>
                    <td style={{ fontWeight: 400, color: '#111', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>
                      {remarks}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

            {/* Right Box: Invoice Meta Info */}
            <td style={{ verticalAlign: 'top', width: '42%', border: '1px solid #000000', borderRadius: '4px', padding: '4px 6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '0.72rem' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '62px', fontWeight: 700, color: '#222', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>{invLabel}</td>
                    <td style={{ fontWeight: 700, color: '#000', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>{invoiceNo}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#222', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>DATE:</td>
                    <td style={{ fontWeight: 500, color: '#000', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>
                      {formatInvoiceDate(bill.created_at || new Date())}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#222', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>Q. No.:</td>
                    <td style={{ fontWeight: 500, color: '#111', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>{qNo}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#222', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>Dc No.:</td>
                    <td style={{ fontWeight: 500, color: '#111', border: 'none', padding: '1px 0', verticalAlign: 'top' }}>{dcNo}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ───────────────── PRODUCT TABLE ───────────────── */}
      <Box sx={{ mb: 1, overflowX: 'auto', width: '100%' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000000',
            fontSize: '0.7rem',
            textAlign: 'left',
            lineHeight: 1.2,
          }}
        >
          <thead>
            {/* Main Header Row */}
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000' }}>
              {/* S# */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '3px 2px',
                  fontWeight: 700,
                  textAlign: 'center',
                  fontSize: '0.68rem',
                  width: copy === 'OFFICE' ? '4%' : copy === 'CUSTOMER' ? '5%' : '5%',
                }}
              >
                #
              </th>

              {/* Item Name */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '3px 4px',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  width: copy === 'OFFICE' ? '21%' : copy === 'CUSTOMER' ? '29%' : '24%',
                }}
              >
                Item Name
              </th>

              {/* Job Description */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '3px 4px',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  width: copy === 'OFFICE' ? '17%' : copy === 'CUSTOMER' ? '24%' : '28%',
                }}
              >
                Job Description
              </th>

              {/* Actual Size (H × W) */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '3px 3px',
                  fontWeight: 700,
                  textAlign: 'center',
                  fontSize: '0.68rem',
                  width: copy === 'OFFICE' ? '14%' : copy === 'CUSTOMER' ? '18%' : '33%',
                }}
              >
                Actual Size
                <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 500, color: '#475569' }}>(H × W)</span>
              </th>

              {/* Number of Pieces (pcs) */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '3px 2px',
                  fontWeight: 700,
                  textAlign: 'center',
                  fontSize: '0.68rem',
                  width: copy === 'OFFICE' ? '5%' : copy === 'CUSTOMER' ? '7%' : '10%',
                }}
              >
                Pcs
              </th>

              {/* Office-only: Standard (H × W) */}
              {copy === 'OFFICE' && (
                <th
                  style={{
                    border: '1px solid #000000',
                    padding: '3px 3px',
                    fontWeight: 700,
                    textAlign: 'center',
                    fontSize: '0.68rem',
                    width: '14%',
                  }}
                >
                  Standard
                  <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 500, color: '#475569' }}>(H × W)</span>
                </th>
              )}

              {/* Office-only: Qty (SqFt) */}
              {copy === 'OFFICE' && (
                <th
                  style={{
                    border: '1px solid #000000',
                    padding: '3px 3px',
                    fontWeight: 700,
                    textAlign: 'right',
                    fontSize: '0.68rem',
                    width: '8%',
                  }}
                >
                  Qty
                  <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 500, color: '#475569' }}>SqFt</span>
                </th>
              )}

              {/* Office-only: Rate */}
              {copy === 'OFFICE' && (
                <th
                  style={{
                    border: '1px solid #000000',
                    padding: '3px 3px',
                    fontWeight: 700,
                    textAlign: 'right',
                    fontSize: '0.68rem',
                    width: '8%',
                  }}
                >
                  Rate
                </th>
              )}

              {/* Value (Office & Customer copies only) */}
              {copy !== 'CUTTER' && (
                <th
                  style={{
                    border: '1px solid #000000',
                    padding: '3px 4px',
                    fontWeight: 700,
                    textAlign: 'right',
                    fontSize: '0.68rem',
                    width: copy === 'OFFICE' ? '9%' : '14%',
                  }}
                >
                  Value
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {productGroups.length > 0 ? (() => {
              let runningRowIndex = 0;
              return productGroups.map((group) => (
                <React.Fragment key={group.key}>
                  {group.items.map((item, itemIdxInGroup) => {
                    runningRowIndex++;
                    const prevItem = itemIdxInGroup > 0 ? group.items[itemIdxInGroup - 1] : null;
                    const currentAddonsStr = (item.addons || []).map(a => `${a.name}:${a.rate}`).sort().join('|');
                    const prevAddonsStr = (prevItem?.addons || []).map(a => `${a.name}:${a.rate}`).sort().join('|');
                    const isRepeatedAddons = itemIdxInGroup > 0 && currentAddonsStr === prevAddonsStr;

                    const actualSizeStr = formatDimension(item.actualHeight, item.actualWidth);
                    const standardSizeStr = formatDimension(item.calcHeight, item.calcWidth);

                    return (
                      <tr key={`${group.key}-${itemIdxInGroup}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        {/* # */}
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '2.5px 2px',
                            textAlign: 'center',
                            fontWeight: 600,
                            fontSize: '0.68rem',
                            color: '#000',
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            <span>{runningRowIndex}</span>
                            <button
                              type="button"
                              className="no-print"
                              title="Print 2x2 sticker label for this item"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const targetIdx = runningRowIndex - 1;
                                if (typeof onPrintLabel === 'function') {
                                  onPrintLabel(item, targetIdx);
                                } else {
                                  await printDirectSingleItemLabel({
                                    bill,
                                    item,
                                    index: targetIdx,
                                    pieceMode: 'per-piece',
                                  });
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                background: '#f3e8ff',
                                border: '1px solid #c084fc',
                                borderRadius: '3px',
                                padding: '1px 3px',
                                fontSize: '10px',
                                lineHeight: 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                color: '#7c3aed',
                              }}
                            >
                              🏷️
                            </button>
                          </div>
                        </td>

                        {/* Item Name */}
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '2.5px 4px',
                            fontWeight: 400,
                            color: '#000',
                          }}
                        >
                          {itemIdxInGroup === 0 ? (
                            <span style={{ fontWeight: 600, fontSize: '0.72rem' }}>{item.itemName}</span>
                          ) : (
                            <div style={{ textAlign: 'center', color: '#64748b', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1 }}>"</div>
                          )}
                          {item.addons && item.addons.length > 0 && !isRepeatedAddons && (
                            <div style={{ fontSize: '0.6rem', color: '#475569', fontStyle: 'italic', marginTop: '1px', lineHeight: 1.1 }}>
                              {item.addons.map(a => `${a.name}${copy === 'OFFICE' && a.rate ? ` (${fmtAmt(a.rate)})` : ''}`).join(', ')}
                            </div>
                          )}
                        </td>

                        {/* Job Description */}
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '2.5px 4px',
                            color: '#333',
                            fontWeight: 400,
                            fontSize: '0.68rem',
                            lineHeight: 1.15,
                          }}
                        >
                          {item.jobDesc}
                        </td>

                        {/* Actual Size (H × W) */}
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '2.5px 2px',
                            textAlign: 'center',
                            fontWeight: copy === 'CUTTER' ? 700 : 500,
                            fontSize: copy === 'CUTTER' ? '0.74rem' : '0.68rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {actualSizeStr}
                        </td>

                        {/* Number of Pieces (pcs) */}
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '2.5px 2px',
                            textAlign: 'center',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                          }}
                        >
                          {item.pcs}
                        </td>

                        {/* Office-only: Standard (H × W) */}
                        {copy === 'OFFICE' && (
                          <td
                            style={{
                              border: '1px solid #000000',
                              padding: '2.5px 2px',
                              textAlign: 'center',
                              fontWeight: 500,
                              fontSize: '0.68rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {standardSizeStr}
                          </td>
                        )}

                        {/* Office-only: Qty (SqFt) */}
                        {copy === 'OFFICE' && (
                          <td
                            style={{
                              border: '1px solid #000000',
                              padding: '2.5px 3px',
                              textAlign: 'right',
                              fontWeight: 400,
                              fontSize: '0.68rem',
                            }}
                          >
                            {fmtNum(item.qtySqFt)}
                          </td>
                        )}

                        {/* Office-only: Rate */}
                        {copy === 'OFFICE' && (
                          <td
                            style={{
                              border: '1px solid #000000',
                              padding: '2.5px 3px',
                              textAlign: 'right',
                              fontWeight: 400,
                              fontSize: '0.68rem',
                            }}
                          >
                            {fmtAmt(item.rate)}
                          </td>
                        )}

                        {/* Value (Office & Customer copies only) */}
                        {copy !== 'CUTTER' && (
                          <td
                            style={{
                              border: '1px solid #000000',
                              padding: '2.5px 4px',
                              textAlign: 'right',
                              fontWeight: 500,
                              fontSize: '0.72rem',
                            }}
                          >
                            {fmtAmt(item.amount)}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* ────────── PRODUCT GROUP SUB TOTAL ROW ────────── */}
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #000000', fontWeight: 600 }}>
                    <td
                      colSpan={4}
                      style={{
                        border: '1px solid #000000',
                        padding: '2px 4px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        color: '#1e293b',
                      }}
                    >
                      Sub Total ({group.itemName}):
                    </td>
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '2px 2px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        color: '#000000',
                      }}
                    >
                      {group.totalPcs}
                    </td>
                    {copy === 'OFFICE' && (
                      <>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '2px 2px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '0.65rem',
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '2px 3px',
                            textAlign: 'right',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                          }}
                        >
                          {fmtNum(group.totalSqFt)}
                        </td>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '2px 3px',
                            textAlign: 'right',
                            color: '#64748b',
                          }}
                        >
                          —
                        </td>
                      </>
                    )}
                    {copy !== 'CUTTER' && (
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '2px 4px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          color: '#000000',
                        }}
                      >
                        {fmtAmt(group.totalAmount)}
                      </td>
                    )}
                  </tr>
                </React.Fragment>
              ));
            })() : (
              <tr>
                <td colSpan={copy === 'OFFICE' ? 9 : copy === 'CUSTOMER' ? 6 : 5} style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                  No items in this invoice
                </td>
              </tr>
            )}

            {/* ────────── GRAND TOTAL ROW ────────── */}
            <tr style={{ borderTop: '2px solid #000000', borderBottom: '2px solid #000000', fontWeight: 700, backgroundColor: '#f1f5f9' }}>
              <td
                colSpan={4}
                style={{
                  border: '1px solid #000000',
                  padding: '3px 4px',
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  letterSpacing: '0.02em',
                }}
              >
                {copy === 'CUTTER' ? 'Total Pcs to Cut' : 'Grand Total'}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '3px 2px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: copy === 'CUTTER' ? '0.8rem' : '0.72rem',
                }}
              >
                {totalPcs}
              </td>
              {copy === 'OFFICE' && (
                <>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '3px 2px',
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '0.65rem',
                    }}
                  >
                    —
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '3px 3px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                    }}
                  >
                    {fmtNum(totalSqFt)}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '3px 3px',
                      textAlign: 'right',
                    }}
                  >
                    —
                  </td>
                </>
              )}
              {copy !== 'CUTTER' && (
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '3px 4px',
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                  }}
                >
                  {fmtAmt(billValue || totalItemsValue)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </Box>

      {/* ───────────────── BOTTOM SECTION ───────────────── */}
      {copy === 'CUTTER' ? (
        /* CUTTER COPY BOTTOM: Quality & Cutter Sign-off */
        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '6px' }}>
          <tbody>
            <tr>
              <td style={{ width: '55%', border: 'none' }}></td>
              <td
                style={{
                  width: '45%',
                  verticalAlign: 'top',
                  border: '1px solid #000000',
                  borderRadius: '4px',
                  padding: '6px',
                  fontSize: '0.7rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#333' }}>Cutter Signature:</div>
                  <div style={{ borderBottom: '1px solid #000', marginTop: '16px', width: '100%' }} />
                </div>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#333' }}>Checked By (Quality / Sizes):</div>
                  <div style={{ borderBottom: '1px solid #000', marginTop: '16px', width: '100%' }} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        /* OFFICE & CUSTOMER COPIES BOTTOM: Signature & Financial Summary */
        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '6px' }}>
          <tbody>
            <tr>
              {/* Left: Signature & Stamp area */}
              <td style={{ verticalAlign: 'bottom', border: 'none', padding: '0 8px 4px 0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#000', marginBottom: '8px' }}>
                  Signature & Stamp _____________________
                </div>
                <div style={{ fontSize: '0.62rem', color: '#64748b', fontStyle: 'italic' }}>
                  Software Developed by RapidTechPro 0300-4657827
                </div>
              </td>

              {/* Right: Boxed Amount Summary Table */}
              <td style={{ verticalAlign: 'bottom', width: '230px', border: 'none', padding: 0 }}>
                <div
                  style={{
                    border: '1px solid #000000',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.68rem',
              }}
            >
              <tbody>
                {/* Discount */}
                <tr>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>Discount:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(discount)}</td>
                </tr>

                {/* Delivery / Carriage */}
                <tr>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>Loader / Delivery:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(carriage)}</td>
                </tr>

                {/* Additional charges (Fitter, Labour, Cutter, Hardware) */}
                <tr>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>Fitter Amount:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(fittingCharges)}</td>
                </tr>
                <tr>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>Labour:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(labourCharges)}</td>
                </tr>
                {cutterCharges > 0 && (
                  <tr>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>Cutter Amount:</td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(cutterCharges)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>Hardware Amount:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(hardwareCharges)}</td>
                </tr>

                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ borderBottom: '1px solid #000000', padding: '3px 5px', fontWeight: 700, fontSize: '0.72rem' }}>Bill Value:</td>
                  <td style={{ borderBottom: '1px solid #000000', padding: '3px 5px', textAlign: 'right', fontWeight: 700, fontSize: '0.72rem' }}>{fmtAmt(billValue)}</td>
                </tr>

                {/* Payment Details */}
                {bankPayment > 0 && cashPayment > 0 ? (
                  <>
                    <tr>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>Cash Received:</td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(cashPayment)}</td>
                    </tr>
                    <tr>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>
                        Bank Payment{bankTitle ? ` (${bankTitle})` : ''}:
                      </td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(bankPayment)}</td>
                    </tr>
                  </>
                ) : bankPayment > 0 ? (
                  <tr>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>
                      Bank Payment{bankTitle ? ` (${bankTitle})` : ''}:
                    </td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(bankPayment)}</td>
                  </tr>
                ) : (
                  <tr>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>Cash Received:</td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(cashPayment)}</td>
                  </tr>
                )}
                {advancePayment > 0 && (
                  <tr>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600 }}>Advance Payment:</td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(advancePayment)}</td>
                  </tr>
                )}

                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <td style={{ borderBottom: hasPrevBal ? '1px solid #cbd5e1' : 'none', padding: '3px 5px', fontWeight: 700, fontSize: '0.74rem' }}>Balance:</td>
                  <td style={{ borderBottom: hasPrevBal ? '1px solid #cbd5e1' : 'none', padding: '3px 5px', textAlign: 'right', fontWeight: 700, fontSize: '0.74rem', color: balance > 0 ? '#b91c1c' : '#15803d' }}>
                    {fmtAmt(balance)}
                  </td>
                </tr>
                {hasPrevBal && (
                  <>
                    <tr>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', fontWeight: 600, color: '#64748b' }}>Prev. Balance:</td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '2px 5px', textAlign: 'right', fontWeight: 400, color: '#64748b' }}>{fmtAmt(prevBal)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <td style={{ padding: '3px 5px', fontWeight: 700, fontSize: '0.74rem' }}>Total Balance:</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', fontWeight: 700, fontSize: '0.74rem', color: totalBalance !== 0 ? '#b91c1c' : '#15803d' }}>
                        {fmtAmt(totalBalance)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
)}
    </Box>
  );
}

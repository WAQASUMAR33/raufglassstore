'use client';

import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';

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
  const prevBal = parseFloat(bill.previous_balance || bill.previous_customer_balance || 0);
  const totalBalance = prevBal + balance;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '820px',
        mx: 'auto',
        p: { xs: 1.5, sm: 2.5 },
        bgcolor: '#ffffff',
        color: '#000000',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        boxSizing: 'border-box',
        '@media print': {
          p: '0.2cm',
          maxWidth: '100%',
          width: '100%',
        },
      }}
    >
      {/* ───────────────── HEADER SECTION ───────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        {/* Left: Brand Identity */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              border: '2px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: '26px',
                fontWeight: 900,
                lineHeight: 1,
                fontFamily: '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Urdu Typesetting", serif',
                color: '#000000',
                pb: 0.5,
              }}
            >
              زین
            </Typography>
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: '1.25rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                lineHeight: 1.15,
                color: '#000000',
              }}
            >
              ZAIN TRADERS MANDI BAHAUDDIN
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#333333', lineHeight: 1.2, mt: 0.25 }}>
              Phalia Road , Near Aljannat Petrol pump M.B.Din.
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#000000', lineHeight: 1.25, mt: 0.25 }}>
              Ph: 0302-2133218, 0315-4533218
            </Typography>
          </Box>
        </Box>

        {/* Center/Right: Commercial Invoice Title + Copy Badge */}
        <Box sx={{ textAlign: 'right', pr: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: '1.2rem', sm: '1.45rem' },
              fontWeight: 700,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: 'italic',
              letterSpacing: '0.03em',
              color: '#000000',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}
          >
            {baseInvoiceTitle}
          </Typography>
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              mt: 0.6,
              px: 1.2,
              py: 0.25,
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              bgcolor: copyBadgeBg,
              color: '#ffffff',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          >
            {copyBadgeText}
          </Box>
        </Box>
      </Box>

      {/* Decorative horizontal accent */}
      <Box sx={{ borderBottom: '2px solid #000000', mb: 2, width: '100%' }} />

      {/* ───────────────── CUSTOMER & INVOICE DETAILS ───────────────── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1.45fr 1fr' },
          gap: 1.5,
          mb: 2,
        }}
      >
        {/* Left Box: Customer Info */}
        <Box
          sx={{
            border: '1px solid #000000',
            borderRadius: '6px',
            p: 1.25,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            fontSize: '0.825rem',
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>CUSTOMER:</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#000' }}>
              {bill.customer?.cus_name || 'Walking Customer'}
              {bill.customer?.name_urdu ? ` (${bill.customer.name_urdu})` : ''}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>PHONE:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 500, color: '#000' }}>
              {bill.customer?.cus_phone_no || bill.customer?.phone || bill.customer_phone || '-'}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>ADDRESS:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 400, color: '#111' }}>
              {[bill.customer?.cus_address, bill.customer?.city?.city_name].filter(Boolean).join(', ') || bill.customer?.cus_address || '-'}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>FITTER:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 400, color: '#000' }}>
              {displayFitter}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>REMARKS:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 400, color: '#111' }}>
              {remarks}
            </Typography>
          </Box>
        </Box>

        {/* Right Box: Invoice Meta Info */}
        <Box
          sx={{
            border: '1px solid #000000',
            borderRadius: '6px',
            p: 1.25,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            fontSize: '0.825rem',
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>INV. NO.:</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#000' }}>
              {invoiceNo}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>DATE:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 400, color: '#000' }}>
              {formatInvoiceDate(bill.created_at || new Date())}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>Q. No.:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 400, color: '#111' }}>
              {qNo}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#222' }}>Dc No.:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 400, color: '#111' }}>
              {dcNo}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ───────────────── PRODUCT TABLE ───────────────── */}
      <Box sx={{ mb: 2, overflowX: 'auto', width: '100%' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #000000',
            fontSize: '0.82rem',
            textAlign: 'left',
          }}
        >
          <thead>
            {/* Main Header Row */}
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000' }}>
              {/* S# */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '6px 4px',
                  fontWeight: 700,
                  textAlign: 'center',
                  width: copy === 'OFFICE' ? '5%' : copy === 'CUSTOMER' ? '6%' : '7%',
                }}
              >
                #
              </th>

              {/* Item Name */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  fontWeight: 700,
                  width: copy === 'OFFICE' ? '22%' : copy === 'CUSTOMER' ? '30%' : '35%',
                }}
              >
                Item Name
              </th>

              {/* Job Description */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  fontWeight: 700,
                  width: copy === 'OFFICE' ? '17%' : copy === 'CUSTOMER' ? '24%' : '28%',
                }}
              >
                Job Description
              </th>

              {/* Actual Size (H × W) */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '6px 6px',
                  fontWeight: 700,
                  textAlign: 'center',
                  width: copy === 'OFFICE' ? '13%' : copy === 'CUSTOMER' ? '18%' : '18%',
                }}
              >
                Actual Size
                <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#475569' }}>(H × W)</span>
              </th>

              {/* Number of Pieces (pcs) */}
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '6px 4px',
                  fontWeight: 700,
                  textAlign: 'center',
                  width: copy === 'OFFICE' ? '6%' : copy === 'CUSTOMER' ? '8%' : '12%',
                }}
              >
                Pcs
              </th>

              {/* Office-only: Standard (H × W) */}
              {copy === 'OFFICE' && (
                <th
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 6px',
                    fontWeight: 700,
                    textAlign: 'center',
                    width: '13%',
                  }}
                >
                  Standard
                  <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#475569' }}>(H × W)</span>
                </th>
              )}

              {/* Office-only: Qty (SqFt) */}
              {copy === 'OFFICE' && (
                <th
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 6px',
                    fontWeight: 700,
                    textAlign: 'right',
                    width: '8%',
                  }}
                >
                  Qty
                  <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#475569' }}>SqFt</span>
                </th>
              )}

              {/* Office-only: Rate */}
              {copy === 'OFFICE' && (
                <th
                  style={{
                    border: '1px solid #000000',
                    padding: '6px 6px',
                    fontWeight: 700,
                    textAlign: 'right',
                    width: '7%',
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
                    padding: '6px 8px',
                    fontWeight: 700,
                    textAlign: 'right',
                    width: copy === 'OFFICE' ? '9%' : '14%',
                  }}
                >
                  Value
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {lines.length > 0 ? (
              lines.map((item, index) => {
                const prevItem = index > 0 ? lines[index - 1] : null;
                const isRepeatedProduct = index > 0 && (
                  (item.pro_id && item.pro_id === prevItem?.pro_id) ||
                  (item.itemName && item.itemName === prevItem?.itemName)
                );
                const currentAddonsStr = (item.addons || []).map(a => `${a.name}:${a.rate}`).sort().join('|');
                const prevAddonsStr = (prevItem?.addons || []).map(a => `${a.name}:${a.rate}`).sort().join('|');
                const isRepeatedAddons = isRepeatedProduct && currentAddonsStr === prevAddonsStr;

                const actualSizeStr = formatDimension(item.actualHeight, item.actualWidth);
                const standardSizeStr = formatDimension(item.calcHeight, item.calcWidth);

                return (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {/* # */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontWeight: 600,
                        color: '#000',
                      }}
                    >
                      {index + 1}
                    </td>

                    {/* Item Name */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '6px 8px',
                        fontWeight: 400,
                        color: '#000',
                      }}
                    >
                      {!isRepeatedProduct ? (
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.itemName}</span>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#64748b', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>"</div>
                      )}
                      {item.addons && item.addons.length > 0 && !isRepeatedAddons && (
                        <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                          {item.addons.map(a => `${a.name}${copy !== 'CUTTER' && a.rate ? ` (${fmtAmt(a.rate)})` : ''}`).join(', ')}
                        </div>
                      )}
                    </td>

                    {/* Job Description */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '6px 8px',
                        color: '#333',
                        fontWeight: 400,
                      }}
                    >
                      {item.jobDesc}
                    </td>

                    {/* Actual Size (H × W) */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {actualSizeStr}
                    </td>

                    {/* Number of Pieces (pcs) */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontWeight: 600,
                      }}
                    >
                      {item.pcs}
                    </td>

                    {/* Office-only: Standard (H × W) */}
                    {copy === 'OFFICE' && (
                      <td
                        style={{
                          border: '1px solid #000000',
                          padding: '6px 4px',
                          textAlign: 'center',
                          fontWeight: 500,
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
                          padding: '6px 6px',
                          textAlign: 'right',
                          fontWeight: 400,
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
                          padding: '6px 6px',
                          textAlign: 'right',
                          fontWeight: 400,
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
                          padding: '6px 8px',
                          textAlign: 'right',
                          fontWeight: 500,
                        }}
                      >
                        {fmtAmt(item.amount)}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={copy === 'OFFICE' ? 9 : copy === 'CUSTOMER' ? 6 : 5} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                  No items in this invoice
                </td>
              </tr>
            )}

            {/* ────────── TOTAL ROW ────────── */}
            <tr style={{ borderTop: '2px solid #000000', fontWeight: 600, backgroundColor: '#fafafa' }}>
              <td
                colSpan={3}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 600,
                }}
              >
                {copy === 'CUTTER' ? 'Total Pieces' : 'Total'}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 4px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '0.75rem',
                }}
              >
                —
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                {totalPcs}
              </td>
              {copy === 'OFFICE' && (
                <>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 4px',
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '0.75rem',
                    }}
                  >
                    —
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 6px',
                      textAlign: 'right',
                      fontWeight: 600,
                    }}
                  >
                    {fmtNum(totalSqFt)}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 6px',
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
                    padding: '6px 8px',
                    textAlign: 'right',
                    fontWeight: 600,
                  }}
                >
                  {fmtAmt(totalItemsValue)}
                </td>
              )}
            </tr>

            {/* ────────── GRAND TOTAL ROW ────────── */}
            <tr style={{ borderBottom: '2px solid #000000', fontWeight: 700, backgroundColor: '#f1f5f9' }}>
              <td
                colSpan={4}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: '0.02em',
                }}
              >
                {copy === 'CUTTER' ? 'Total Pcs to Cut' : 'Grand Total'}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: copy === 'CUTTER' ? '0.95rem' : '0.85rem',
                }}
              >
                {totalPcs}
              </td>
              {copy === 'OFFICE' && (
                <>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 4px',
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '0.75rem',
                    }}
                  >
                    —
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 6px',
                      textAlign: 'right',
                      fontWeight: 700,
                    }}
                  >
                    {fmtNum(totalSqFt)}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 6px',
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
                    padding: '6px 8px',
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                  }}
                >
                  {fmtAmt(billValue)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </Box>

      {/* ───────────────── BOTTOM SECTION ───────────────── */}
      {copy === 'CUTTER' ? (
        /* CUTTER COPY BOTTOM: Workshop Details & Quality Verification (No financial details) */
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1.25fr 1fr' },
            gap: 2,
            pt: 1,
          }}
        >
          {/* Left: Workshop & Glass Specs */}
          <Box
            sx={{
              border: '1px solid #000000',
              borderRadius: '6px',
              p: 1.25,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              fontSize: '0.8rem',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', pb: 0.5 }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>Assigned Cutter:</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#b45309' }}>{cutterName}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', pb: 0.5 }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#333' }}>Total Glass Area:</Typography>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>{fmtNum(totalSqFt)} Sq Ft</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', pb: 0.5 }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#333' }}>DC / Vehicle No:</Typography>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#000' }}>{dcNo}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#333' }}>Cutting Remarks:</Typography>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#000', mt: 0.25 }}>{remarks}</Typography>
            </Box>
          </Box>

          {/* Right: Cutter & Inspection Sign-off */}
          <Box
            sx={{
              border: '1px solid #000000',
              borderRadius: '6px',
              p: 1.25,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 2,
              fontSize: '0.8rem',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#333' }}>Cutter Signature:</Typography>
              <Box sx={{ borderBottom: '1px solid #000', mt: 2.5, width: '100%' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#333' }}>Checked By (Quality / Sizes):</Typography>
              <Box sx={{ borderBottom: '1px solid #000', mt: 2.5, width: '100%' }} />
            </Box>
          </Box>
        </Box>
      ) : (
        /* OFFICE & CUSTOMER COPIES BOTTOM: Signature & Financial Summary */
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1.25fr 1fr' },
            gap: 2,
            alignItems: 'end',
            pt: 1,
          }}
        >
          {/* Left: Signature & Stamp area */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 1 }}>
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#000' }}>
                Signature & Stamp _____________________
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                Software Developed by RapidTechPro 0300-4657827
              </Typography>
            </Box>
          </Box>

          {/* Right: Boxed Amount Summary Table */}
          <Box
            sx={{
              border: '1px solid #000000',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8rem',
              }}
            >
              <tbody>
                {/* Discount */}
                <tr>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>Discount:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(discount)}</td>
                </tr>

                {/* Delivery / Carriage */}
                <tr>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>Loader / Delivery:</td>
                  <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(carriage)}</td>
                </tr>

                {/* Office Copy includes internal expense breakdowns */}
                {copy === 'OFFICE' && (
                  <>
                    <tr>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>Fitter Amount:</td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(fittingCharges)}</td>
                    </tr>
                    <tr>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>Labour:</td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(labourCharges)}</td>
                    </tr>
                    {cutterCharges > 0 && (
                      <tr>
                        <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>Cutter Amount:</td>
                        <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(cutterCharges)}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>Hardware Amount:</td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(hardwareCharges)}</td>
                    </tr>
                  </>
                )}

                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ borderBottom: '1px solid #000000', padding: '5px 8px', fontWeight: 700 }}>Bill Value:</td>
                  <td style={{ borderBottom: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>{fmtAmt(billValue)}</td>
                </tr>

                {/* Payment Details */}
                {bankPayment > 0 && cashPayment > 0 ? (
                  <>
                    <tr>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>Cash Received:</td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(cashPayment)}</td>
                    </tr>
                    <tr>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>
                        Bank Payment{bankTitle ? ` (${bankTitle})` : ''}:
                      </td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(bankPayment)}</td>
                    </tr>
                  </>
                ) : bankPayment > 0 ? (
                  <tr>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>
                      Bank Payment{bankTitle ? ` (${bankTitle})` : ''}:
                    </td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(bankPayment)}</td>
                  </tr>
                ) : (
                  <tr>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>Cash Received:</td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(cashPayment)}</td>
                  </tr>
                )}
                {advancePayment > 0 && (
                  <tr>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600 }}>Advance Payment:</td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400 }}>{fmtAmt(advancePayment)}</td>
                  </tr>
                )}

                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <td style={{ borderBottom: prevBal > 0 ? '1px solid #cbd5e1' : 'none', padding: '6px 8px', fontWeight: 700, fontSize: '0.85rem' }}>Balance:</td>
                  <td style={{ borderBottom: prevBal > 0 ? '1px solid #cbd5e1' : 'none', padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: balance > 0 ? '#b91c1c' : '#15803d' }}>
                    {fmtAmt(balance)}
                  </td>
                </tr>
                {prevBal > 0 && (
                  <>
                    <tr>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 600, color: '#64748b' }}>Prev. Balance:</td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 400, color: '#64748b' }}>{fmtAmt(prevBal)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '0.85rem' }}>Total Balance:</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: totalBalance > 0 ? '#b91c1c' : '#15803d' }}>
                        {fmtAmt(totalBalance)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </Box>
        </Box>
      )}
    </Box>
  );
}

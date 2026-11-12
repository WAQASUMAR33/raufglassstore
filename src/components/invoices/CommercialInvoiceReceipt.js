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

// Parse line item details (width, height, pcs, job desc)
export function parseInvoiceLineItem(detail) {
  let width = detail.calc_width ?? detail.width_in ?? '';
  let height = detail.calc_height ?? detail.height_in ?? '';
  let pcs = detail.pieces ?? detail.qnty_pcs ?? '';
  let jobDesc = detail.comments || '';

  const sizeStr = String(detail.size || '').trim();

  if ((!width || !height) && sizeStr) {
    const dimMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*["']?\s*[×x*X]\s*(\d+(?:\.\d+)?)\s*["']?/);
    if (dimMatch) {
      if (!width) width = dimMatch[1];
      if (!height) height = dimMatch[2];
    }
  }

  if (!pcs && sizeStr) {
    const pcsMatch = sizeStr.match(/\[(\d+)\s*pcs\]/i);
    if (pcsMatch) {
      pcs = pcsMatch[1];
    }
  }
  if (!pcs) pcs = 1;

  if (!jobDesc && sizeStr) {
    const commentMatch = sizeStr.match(/\]\s*-\s*(.+)$/);
    if (commentMatch) {
      jobDesc = commentMatch[1].trim();
    }
  }

  if (Array.isArray(detail.selected_addons) && detail.selected_addons.length > 0) {
    const addonNames = detail.selected_addons.map(a => a.name || a.addon?.name).filter(Boolean).join(', ');
    if (addonNames) {
      jobDesc = jobDesc && jobDesc !== '-' ? `${jobDesc} (${addonNames})` : addonNames;
    }
  }

  return {
    itemName: detail.product?.pro_title || detail.pro_title || detail.product_name || 'Glass Item',
    jobDesc: jobDesc || '-',
    width: width ? fmtNum(width) : '-',
    height: height ? fmtNum(height) : '-',
    pcs: Number(pcs) || 1,
    qtySqFt: parseFloat(detail.qnty || 0),
    rate: parseFloat(detail.unit_rate ?? detail.rate ?? 0),
    amount: parseFloat(detail.total_amount ?? detail.amount ?? 0),
  };
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
 * Matches the official physical invoice format:
 * - Calligraphic logo + Zain Traders Sargodha
 * - Commercial Invoice Title
 * - Outlined Customer Info Box & Invoice Info Box
 * - Item Table with sub-headers: Size (Width | Height)
 * - Totals & Grand Total line
 * - Bottom Signature & box summary table (Discount, Carriage, Bill Value, Payments, Balance)
 */
export default function CommercialInvoiceReceipt({
  bill = {},
  isOrder = false,
  isQuotation = false,
  title = null,
}) {
  if (!bill) return null;

  // Header title
  const invoiceTitle = title || (
    isQuotation || bill.bill_type === 'QUOTATION'
      ? 'Quotation'
      : bill.bill_type === 'ORDER' || isOrder
      ? 'Commercial Invoice'
      : bill.is_return
      ? 'Sale Return Invoice'
      : 'Commercial Invoice'
  );

  // Parse lines
  const rawDetails = Array.isArray(bill.sale_details) ? bill.sale_details : [];
  const lines = rawDetails.map(d => parseInvoiceLineItem(d));

  // Totals calculation
  const totalPcs = lines.reduce((sum, item) => sum + (item.pcs || 0), 0);
  const totalSqFt = lines.reduce((sum, item) => sum + (item.qtySqFt || 0), 0);
  const totalItemsValue = lines.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Extract Cutter / Fitter
  const cutterMatch = String(bill.reference || bill.notes || '').match(/\[Cutter:\s*([^\]]+)\]/i);
  const cutterName = bill.cutter_name || (cutterMatch ? cutterMatch[1].trim() : '-');

  // Clean Remarks
  let remarks = String(bill.notes || bill.reference || '').replace(/\[Cutter:[^\]]+\]/gi, '').trim();
  if (!remarks) remarks = '-';

  // Invoice Numbers
  const invoiceNo = bill.sale_id || bill.order_id || bill.bill_number || bill.return_id || '—';
  const qNo = bill.loaded_order_id || bill.order_id || '0';
  const dcNo = bill.dc_no || bill.vehicle_no || '-';

  // Financial values
  const discount = parseFloat(bill.discount || 0);
  const carriage = parseFloat(bill.shipping_amount || bill.delivery_charges || 0);
  const billValue = parseFloat(bill.total_amount || 0);
  
  const payment1 = parseFloat(bill.cash_payment || (bill.payment && !bill.bank_payment ? bill.payment : 0) || 0);
  const payment2 = parseFloat(bill.bank_payment || (bill.advance_payment ? bill.advance_payment : 0) || 0);
  const payment3 = 0;
  const payment4 = 0;
  
  const totalPaid = payment1 + payment2 + payment3 + payment4;
  const balance = billValue - (bill.payment ? parseFloat(bill.payment) : totalPaid);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '800px',
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
          {/* Stylized Urdu calligraphy mark */}
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
                letterSpacing: '0.05em',
                lineHeight: 1.15,
                color: '#000000',
              }}
            >
              ZAIN TRADERS
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#333333', lineHeight: 1.2 }}>
              Sargodha
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#444444', lineHeight: 1.25, mt: 0.25 }}>
              0483-712161, 0483-712160, 0321-8681824
            </Typography>
          </Box>
        </Box>

        {/* Center/Right: Commercial Invoice Title */}
        <Box sx={{ textAlign: 'right', pr: 2 }}>
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
            {invoiceTitle}
          </Typography>
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
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#222' }}>CUSTOMER:</Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: '#000' }}>
              {bill.customer?.cus_name || 'Walking Customer'}
              {bill.customer?.name_urdu ? ` (${bill.customer.name_urdu})` : ''}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#222' }}>ADDRESS:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, color: '#111' }}>
              {[bill.customer?.cus_address, bill.customer?.city?.city_name].filter(Boolean).join(', ') || '-'}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#222' }}>FITTER:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 700, color: '#000' }}>
              {cutterName}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#222' }}>REMARKS:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, color: '#111' }}>
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
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#222' }}>INV. NO.:</Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: '#000' }}>
              {invoiceNo}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#222' }}>DATE:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 700, color: '#000' }}>
              {formatInvoiceDate(bill.created_at || new Date())}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#222' }}>Q. No.:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, color: '#111' }}>
              {qNo}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1fr', alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#222' }}>Dc No.:</Typography>
            <Typography sx={{ fontSize: '0.825rem', fontWeight: 600, color: '#111' }}>
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
            fontSize: '0.825rem',
            textAlign: 'left',
          }}
        >
          <thead>
            {/* Main Header Row */}
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000' }}>
              <th
                rowSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  fontWeight: 800,
                  width: '26%',
                }}
              >
                Item Name
              </th>
              <th
                rowSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  fontWeight: 800,
                  width: '22%',
                }}
              >
                Job Description
              </th>
              <th
                colSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '4px 6px',
                  fontWeight: 800,
                  textAlign: 'center',
                  width: '18%',
                }}
              >
                Size
              </th>
              <th
                rowSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 4px',
                  fontWeight: 800,
                  textAlign: 'center',
                  width: '7%',
                }}
              >
                Qty Pcs
              </th>
              <th
                rowSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  fontWeight: 800,
                  textAlign: 'right',
                  width: '11%',
                }}
              >
                Quantity SqFt
              </th>
              <th
                rowSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  fontWeight: 800,
                  textAlign: 'right',
                  width: '8%',
                }}
              >
                Rate
              </th>
              <th
                rowSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  fontWeight: 800,
                  textAlign: 'right',
                  width: '12%',
                }}
              >
                Value
              </th>
            </tr>

            {/* Sub-header for Size (Width | Height) */}
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000' }}>
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '4px 6px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  width: '9%',
                }}
              >
                Width
              </th>
              <th
                style={{
                  border: '1px solid #000000',
                  padding: '4px 6px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  width: '9%',
                }}
              >
                Height
              </th>
            </tr>
          </thead>

          <tbody>
            {lines.length > 0 ? (
              lines.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 8px',
                      fontWeight: 700,
                      color: '#000',
                    }}
                  >
                    {item.itemName}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 8px',
                      color: '#333',
                    }}
                  >
                    {item.jobDesc}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 4px',
                      textAlign: 'center',
                      fontWeight: 600,
                    }}
                  >
                    {item.width}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 4px',
                      textAlign: 'center',
                      fontWeight: 600,
                    }}
                  >
                    {item.height}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 4px',
                      textAlign: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {item.pcs}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 8px',
                      textAlign: 'right',
                      fontWeight: 700,
                    }}
                  >
                    {fmtNum(item.qtySqFt)}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 8px',
                      textAlign: 'right',
                    }}
                  >
                    {fmtAmt(item.rate)}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 8px',
                      textAlign: 'right',
                      fontWeight: 800,
                    }}
                  >
                    {fmtAmt(item.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                  No items in this invoice
                </td>
              </tr>
            )}

            {/* ────────── TOTAL ROW ────────── */}
            <tr style={{ borderTop: '2px solid #000000', fontWeight: 800, backgroundColor: '#fafafa' }}>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 800,
                }}
              >
                Total
              </td>
              <td
                colSpan={2}
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
                  fontWeight: 800,
                }}
              >
                {totalPcs}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 800,
                }}
              >
                {fmtNum(totalSqFt)}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                }}
              >
                —
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 900,
                }}
              >
                {fmtAmt(totalItemsValue)}
              </td>
            </tr>

            {/* ────────── GRAND TOTAL ROW ────────── */}
            <tr style={{ borderBottom: '2px solid #000000', fontWeight: 900, backgroundColor: '#f1f5f9' }}>
              <td
                colSpan={4}
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  letterSpacing: '0.02em',
                }}
              >
                Grand Total
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontWeight: 900,
                }}
              >
                {totalPcs}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 900,
                }}
              >
                {fmtNum(totalSqFt)}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                }}
              >
                —
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                }}
              >
                {fmtAmt(billValue)}
              </td>
            </tr>
          </tbody>
        </table>
      </Box>

      {/* ───────────────── BOTTOM SECTION: SIGNATURE & SUMMARY BOX ───────────────── */}
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
              <tr>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 700 }}>Discount:</td>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtAmt(discount)}</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 700 }}>Carriage:</td>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtAmt(carriage)}</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={{ borderBottom: '1px solid #000000', padding: '5px 8px', fontWeight: 800 }}>Bill Value:</td>
                <td style={{ borderBottom: '1px solid #000000', padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>{fmtAmt(billValue)}</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 700 }}>Payment 1:</td>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtAmt(payment1)}</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 700 }}>Payment 2:</td>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtAmt(payment2)}</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 700 }}>Payment 3:</td>
                <td style={{ borderBottom: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtAmt(payment3)}</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid #000000', padding: '4px 8px', fontWeight: 700 }}>Payment 4:</td>
                <td style={{ borderBottom: '1px solid #000000', padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtAmt(payment4)}</td>
              </tr>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 900, fontSize: '0.85rem' }}>Balance:</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 900, fontSize: '0.85rem', color: balance > 0 ? '#b91c1c' : '#15803d' }}>
                  {fmtAmt(balance)}
                </td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}

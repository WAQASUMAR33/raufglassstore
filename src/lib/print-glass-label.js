'use client';

import QRCode from 'qrcode';
import { COMPANY } from './brand-theme.js';
import { formatCustomerPhoneDisplay, formatWhatsAppPhone } from './whatsapp-local.js';

/**
 * Generate a WhatsApp chat URL.
 * Always targets the store WhatsApp number (+923022133218) with the invoice and item information.
 */
export function getWhatsAppTargetUrl(customer, bill, item) {
  const storePhone = '923022133218';
  const billNo = bill?.sale_id || bill?.bill_number || bill?.inv_no || '';
  const itemText = (item?.itemName || item?.item_name || item?.pro_title || item?.product?.pro_title)
    ? ` ${item.itemName || item.item_name || item.pro_title || item.product?.pro_title}`
    : '';
  const sizeText = item?.actualSize ? ` (${item.actualSize})` : '';
  const text = encodeURIComponent(`Bill #${billNo}${itemText}${sizeText}`);
  
  return `https://wa.me/${storePhone}?text=${text}`;
}

/**
 * Pre-generate QR code base64 Data URL
 */
export async function generateWhatsAppQrCode(url) {
  try {
    return await QRCode.toDataURL(url, {
      width: 120,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate WhatsApp QR code:', err);
    return '';
  }
}

/**
 * Build HTML for one 2" x 2" sticker
 */
export function buildGlassStickerHtml({
  bill,
  item,
  index = 0,
  pieceLabel = null, // e.g. "Pcs: 1" or "Pcs 1 of 3"
  qrCodeDataUrl = '',
}) {
  const companyNameUr = COMPANY.nameUr || 'زین ٹریڈرز منڈی بہاؤالدین';
  const customerName = bill?.customer?.cus_name || bill?.cus_name || bill?.customer_name || 'Customer';
  const billNo = bill?.sale_id || bill?.bill_number || bill?.inv_no || '—';
  
  const srNo = item?.index || (index + 1);
  const itemName = item?.itemName || item?.item_name || item?.product?.pro_title || item?.pro_title || item?.title || 'Glass Item';
  const jobDesc = (item?.jobDesc && item?.jobDesc !== '-') ? item.jobDesc : (item?.job_description || item?.job_desc || '');
  
  // Entered size (width x height)
  let actualSize = item?.actualSize || '';
  if (!actualSize) {
    const w = item?.actualWidth || item?.width_in;
    const h = item?.actualHeight || item?.height_in;
    if (w && h) {
      actualSize = `${w}" × ${h}"`;
    } else if (w || h) {
      actualSize = `${w || h}"`;
    } else if (item?.size) {
      actualSize = item.size;
    } else {
      actualSize = 'Standard';
    }
  }

  const pcsText = pieceLabel || `Pcs: ${item?.pcs ?? item?.quantity ?? item?.qty ?? 1}`;

  return `
    <div class="glass-sticker-page" style="
      width: 2in;
      height: 2in;
      max-width: 2in;
      max-height: 2in;
      box-sizing: border-box;
      padding: 2mm 2.2mm;
      margin: 0;
      background: #ffffff;
      color: #000000;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid #000000;
      border-radius: 3px;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    ">
      <!-- Line 1: Top Header (QR Code Left, Urdu Brand Center, Logo Right) -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1.5px solid #000000;
        padding-bottom: 2px;
        gap: 4px;
      ">
        <!-- Left: WhatsApp QR Code (scans to +923022133218) -->
        <div style="display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR" style="width: 28px; height: 28px; display: block;" />` : '<div style="width: 28px; height: 28px;"></div>'}
        </div>

        <!-- Center: Company Name in Urdu -->
        <div style="
          font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif;
          font-size: 13.5px;
          font-weight: 900;
          direction: rtl;
          text-align: center;
          color: #000000;
          line-height: 1.15;
          letter-spacing: -0.2px;
          white-space: nowrap;
          flex: 1;
        ">
          ${escapeHtml(companyNameUr)}
        </div>

        <!-- Right: Zain Traders Brand Logo -->
        <img
          src="/zain-logo.png"
          alt="Zain Traders"
          style="
            width: 26px;
            height: 26px;
            object-fit: contain;
            flex-shrink: 0;
            display: inline-block;
          "
        />
      </div>

      <!-- Line 2: Serial Number at top, Product Name in the next line -->
      <div style="display: flex; flex-direction: column; min-width: 0; padding-top: 1px;">
        <span style="
          color: #000000;
          font-weight: 900;
          font-size: 13px;
          line-height: 1.15;
        ">
          #${srNo}
        </span>
        <span style="
          font-weight: 800;
          font-size: 11.5px;
          color: #000000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.15;
          letter-spacing: -0.2px;
          margin-top: 1px;
        ">
          ${escapeHtml(itemName)}
        </span>
      </div>

      <!-- Line 3: Entered Size (Width x Height) & Number of Pcs -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f8fafc;
        padding: 2px 5px;
        border-radius: 3px;
        border: 1px solid #cbd5e1;
      ">
        <div style="display: flex; align-items: baseline; gap: 3px;">
          <span style="font-size: 8.5px; font-weight: 800; color: #475569; text-transform: uppercase;">Size:</span>
          <span style="font-size: 12px; font-weight: 900; color: #000000; letter-spacing: -0.2px;">${escapeHtml(actualSize)}</span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 3px;">
          <span style="font-size: 12px; font-weight: 900; color: #000000;">${escapeHtml(pcsText)}</span>
        </div>
      </div>

      <!-- Line 4: Customer Name & Inv # (Customer phone and bottom QR removed) -->
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        border-top: 1.5px solid #000000;
        padding-top: 2px;
        text-align: left;
        min-width: 0;
      ">
        <div style="
          font-size: 11px;
          font-weight: 700;
          color: #000000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.25;
        ">
          ${escapeHtml(customerName)}
        </div>
        <div style="
          font-size: 9.5px;
          font-weight: 700;
          color: #334155;
          line-height: 1.2;
          margin-top: 1px;
        ">
          Inv #${escapeHtml(String(billNo))}
        </div>
      </div>
    </div>
  `;
}

/**
 * Direct print single line item label (no modal/popup)
 */
export async function printDirectSingleItemLabel({
  bill,
  item,
  index = 0,
  pieceMode = 'per-piece',
}) {
  if (!bill || !item) return false;

  const waUrl = getWhatsAppTargetUrl(bill?.customer || bill, bill, item);
  const qrCodeDataUrl = await generateWhatsAppQrCode(waUrl);

  const pcs = Number(item.pcs ?? item.quantity ?? item.qty ?? 1) || 1;
  let html = '';

  if (pieceMode === 'per-piece' && pcs > 1) {
    for (let p = 1; p <= pcs; p++) {
      html += buildGlassStickerHtml({
        bill,
        item,
        index,
        pieceLabel: `Pcs: ${p}/${pcs}`,
        qrCodeDataUrl,
      });
    }
  } else {
    html += buildGlassStickerHtml({
      bill,
      item,
      index,
      pieceLabel: `Pcs: ${pcs}`,
      qrCodeDataUrl,
    });
  }

  return printGlassStickers({
    stickersHtml: html,
    title: `Label-${bill.sale_id || ''}-${item.itemName || 'item'}`,
  });
}

/**
 * Direct print all labels for a bill (no modal/popup)
 */
export async function printDirectBillLabels({
  bill,
  items = null,
  pieceMode = 'per-piece',
}) {
  if (!bill) return false;

  const rawDetails = Array.isArray(items)
    ? items
    : Array.isArray(bill.sale_details)
    ? bill.sale_details
    : Array.isArray(bill.productTableData)
    ? bill.productTableData
    : [];

  if (rawDetails.length === 0) {
    alert('No items found in this bill to print labels.');
    return false;
  }

  let combinedHtml = '';

  for (let i = 0; i < rawDetails.length; i++) {
    const item = rawDetails[i];
    const waUrl = getWhatsAppTargetUrl(bill?.customer || bill, bill, item);
    const qrCodeDataUrl = await generateWhatsAppQrCode(waUrl);
    const pcs = Number(item.pcs ?? item.quantity ?? item.qty ?? 1) || 1;

    if (pieceMode === 'per-piece' && pcs > 1) {
      for (let p = 1; p <= pcs; p++) {
        combinedHtml += buildGlassStickerHtml({
          bill,
          item,
          index: i,
          pieceLabel: `Pcs: ${p}/${pcs}`,
          qrCodeDataUrl,
        });
      }
    } else {
      combinedHtml += buildGlassStickerHtml({
        bill,
        item,
        index: i,
        pieceLabel: `Pcs: ${pcs}`,
        qrCodeDataUrl,
      });
    }
  }

  return printGlassStickers({
    stickersHtml: combinedHtml,
    title: `Labels-Bill-${bill.sale_id || bill.inv_no || 'all'}`,
  });
}

/**
 * Print stickers via isolated invisible iframe for exact 2in x 2in label printers
 */
export function printGlassStickers({ stickersHtml, title = 'Glass Labels 2x2' }) {
  if (!stickersHtml || !stickersHtml.trim()) {
    console.error('No stickers content to print');
    return false;
  }

  let iframe = document.getElementById('glass-label-print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'glass-label-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: 2in 2in;
      margin: 0;
    }
    html, body {
      width: 2in !important;
      height: 2in !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
    }
    .no-print {
      display: none !important;
    }
    .glass-sticker-page {
      width: 2in !important;
      height: 2in !important;
      max-width: 2in !important;
      max-height: 2in !important;
      margin: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
    }
  </style>
</head>
<body>
  ${stickersHtml}
</body>
</html>`);
  iframeDoc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Failed to trigger sticker print:', err);
      window.print();
    }
  }, 250);

  return true;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

'use client';

import QRCode from 'qrcode';
import { COMPANY } from './brand-theme.js';
import { formatCustomerPhoneDisplay, formatWhatsAppPhone } from './whatsapp-local.js';

/**
 * Generate a WhatsApp chat URL.
 * If customer mobile is available, uses customer mobile so scanning the sticker contacts customer or store.
 */
export function getWhatsAppTargetUrl(customer, bill, item) {
  const storePhone = (COMPANY.phones && COMPANY.phones[0]) ? formatWhatsAppPhone(COMPANY.phones[0]) : '923022133218';
  const cus = customer || bill?.customer || bill;
  const rawCusPhone = cus?.cus_phone_no || cus?.cus_phone_no2 || cus?.customer_phone || cus?.phone || cus?.cus_phone;
  const cusPhone = formatWhatsAppPhone(rawCusPhone);
  
  // Target phone number: use customer phone if available so delivery/fitter can message customer,
  // or store phone if customer phone is not set.
  const phone = cusPhone || storePhone;
  
  const billNo = bill?.sale_id || bill?.bill_number || bill?.inv_no || '';
  const itemText = (item?.itemName || item?.item_name || item?.pro_title) ? ` ${item.itemName || item.item_name || item.pro_title}` : '';
  const sizeText = item?.actualSize ? ` (${item.actualSize})` : '';
  const text = encodeURIComponent(`Bill #${billNo}${itemText}${sizeText}`);
  
  return `https://wa.me/${phone}?text=${text}`;
}

/**
 * Pre-generate QR code base64 Data URL
 */
export async function generateWhatsAppQrCode(url) {
  try {
    return await QRCode.toDataURL(url, {
      width: 96,
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
  
  let customerPhone = '';
  const cus = bill?.customer || bill;
  const rawPhone = cus?.cus_phone_no || cus?.cus_phone_no2 || cus?.customer_phone || cus?.phone || cus?.cus_phone;
  if (rawPhone) {
    customerPhone = String(rawPhone).trim();
  } else {
    customerPhone = formatCustomerPhoneDisplay(bill?.customer || bill);
  }
  if (!customerPhone || customerPhone === 'N/A') {
    customerPhone = '-';
  }

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
      <!-- Line 1: Logo & Company Name in Urdu -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #000; padding-bottom: 2px;">
        <!-- Circular Urdu Logo -->
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.5px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #ffffff;
          text-align: center;
        ">
          <span style="font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif; font-size: 11px; font-weight: 900; line-height: 1; color: #000;">زین</span>
        </div>

        <!-- Company Name in Urdu -->
        <div style="
          font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif;
          font-size: 12px;
          font-weight: 900;
          direction: rtl;
          text-align: right;
          color: #000000;
          line-height: 1.1;
          letter-spacing: -0.2px;
        ">
          ${companyNameUr}
        </div>
      </div>

      <!-- Line 2: Serial Number & Product Name -->
      <div style="display: flex; align-items: baseline; gap: 4px; padding-top: 1px; min-width: 0;">
        <span style="
          background: #000000;
          color: #ffffff;
          font-weight: 900;
          font-size: 10px;
          padding: 1px 3px;
          border-radius: 2px;
          flex-shrink: 0;
          line-height: 1.1;
        ">
          #${srNo}
        </span>
        <span style="
          font-weight: 800;
          font-size: 11px;
          color: #000000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.15;
          letter-spacing: -0.2px;
        ">
          ${escapeHtml(itemName)}${jobDesc ? ` <span style="font-size: 9.5px; font-weight: 600; color: #334155;">(${escapeHtml(jobDesc)})</span>` : ''}
        </span>
      </div>

      <!-- Line 3: Entered Size (Width x Height) & Number of Pcs -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f1f5f9;
        padding: 2px 4px;
        border-radius: 3px;
        border: 1px solid #94a3b8;
      ">
        <div style="display: flex; align-items: baseline; gap: 3px;">
          <span style="font-size: 8px; font-weight: 800; color: #475569; text-transform: uppercase;">Size:</span>
          <span style="font-size: 11.5px; font-weight: 900; color: #000000; letter-spacing: -0.3px;">${escapeHtml(actualSize)}</span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 3px;">
          <span style="font-size: 11.5px; font-weight: 900; color: #000000;">${escapeHtml(pcsText)}</span>
        </div>
      </div>

      <!-- Line 4: WhatsApp QR code (Left) + Customer Name & Phone (Right) -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1.5px solid #000000;
        padding-top: 2px;
        gap: 5px;
      ">
        <!-- Left: WhatsApp QR code -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
          ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="WhatsApp QR" style="width: 44px; height: 44px; display: block;" />` : ''}
          <span style="font-size: 6.5px; font-weight: 800; color: #16a34a; line-height: 1; margin-top: 1px; text-transform: uppercase;">WhatsApp</span>
        </div>

        <!-- Right: Customer Info -->
        <div style="display: flex; flex-direction: column; justify-content: center; overflow: hidden; flex: 1; text-align: right; min-width: 0;">
          <div style="
            font-size: 9.5px;
            font-weight: 900;
            color: #000000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
          ">
            ${escapeHtml(customerName)}
          </div>
          <div style="
            font-size: 9.5px;
            font-weight: 800;
            color: #000000;
            letter-spacing: 0.2px;
            line-height: 1.2;
            margin-top: 1px;
          ">
            ${escapeHtml(customerPhone)}
          </div>
          <div style="
            font-size: 7.5px;
            font-weight: 700;
            color: #475569;
            line-height: 1.1;
            margin-top: 1px;
          ">
            Inv #${escapeHtml(String(billNo))}
          </div>
        </div>
      </div>
    </div>
  `;
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

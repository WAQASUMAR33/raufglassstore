'use client';

/**
 * Invoice Report Service
 * Provides isolated A5 report printing and PDF download
 * without dashboard / modal DOM bleeding or CSS conflicts.
 */

export function printReceiptReport({
  htmlContent,
  element,
  title = 'Commercial Invoice',
  isThermal = false,
}) {
  let content = htmlContent;
  if (!content && element) {
    content = element.innerHTML || '';
  }

  if (!content || !content.trim()) {
    console.error('No receipt content available to print');
    return false;
  }

  let iframe = document.getElementById('report-print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'report-print-iframe';
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
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    @page {
      size: ${isThermal ? '80mm auto' : 'A5 portrait'};
      margin: ${isThermal ? '0' : '3mm 4mm'};
    }
    html, body {
      width: 100%;
      height: auto;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      max-width: ${isThermal ? '78mm' : '142mm'};
      margin: 0 auto;
      padding: ${isThermal ? '2mm' : '1mm 2mm'};
      font-size: 10px;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    th, td {
      border: 1px solid #000000 !important;
    }
    tr {
      page-break-inside: avoid;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    .no-print {
      display: none !important;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`);
  iframeDoc.close();

  // Give fonts, images, and layout time to settle
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Failed to trigger iframe print:', err);
      // Fallback: print current window
      window.print();
    }
  }, 250);

  return true;
}

export async function downloadReceiptPdf({
  element,
  fileName = 'Commercial-Invoice.pdf',
}) {
  if (!element) {
    console.error('Target element required for PDF download');
    return false;
  }

  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;

    let heightLeft = pdfHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, pdfHeight);
    heightLeft -= pageHeight;

    // Multi-page support if height exceeds single A5
    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return false;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

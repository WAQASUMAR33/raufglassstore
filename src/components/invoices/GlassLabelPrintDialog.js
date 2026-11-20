'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  CircularProgress,
  Chip,
  Paper,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import {
  getWhatsAppTargetUrl,
  generateWhatsAppQrCode,
  buildGlassStickerHtml,
  printGlassStickers,
} from '@/lib/print-glass-label';
import { expandInvoiceLineItems } from '@/components/invoices/CommercialInvoiceReceipt';
import { COMPANY } from '@/lib/brand-theme';
import { formatCustomerPhoneDisplay } from '@/lib/whatsapp-local';

/**
 * Interactive Modal for Printing 2" x 2" Glass Labels / Stickers
 */
export default function GlassLabelPrintDialog({
  open,
  onClose,
  bill = null,
  initialItemIndex = 'ALL', // 'ALL' or 0-based index
}) {
  const [selectedItemIndex, setSelectedItemIndex] = useState(initialItemIndex ?? 'ALL');
  const [printPerPiece, setPrintPerPiece] = useState(true); // true: 1 sticker per piece, false: 1 per line item
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);

  // Sync initial selection when opened
  useEffect(() => {
    if (open) {
      setSelectedItemIndex(initialItemIndex !== undefined && initialItemIndex !== null ? initialItemIndex : 'ALL');
    }
  }, [open, initialItemIndex]);

  // Extract bill info
  const customerName = bill?.customer?.cus_name || bill?.cus_name || 'Customer';
  const customerPhone = formatCustomerPhoneDisplay(bill?.customer || bill);
  const billNo = bill?.sale_id || bill?.bill_number || bill?.inv_no || '—';

  // Parse lines using expandInvoiceLineItems
  const lineItems = useMemo(() => {
    if (!bill) return [];
    const details = Array.isArray(bill.sale_details) ? bill.sale_details : [];
    const expanded = details.flatMap((d) => expandInvoiceLineItems(d));
    return expanded.map((item, idx) => {
      // Resolve actual size
      let actualSize = item.actualSize || '';
      if (!actualSize) {
        const w = item.actualWidth || item.width_in;
        const h = item.actualHeight || item.height_in;
        if (w && h) {
          actualSize = `${w}" × ${h}"`;
        } else if (w || h) {
          actualSize = `${w || h}"`;
        } else {
          actualSize = item.size || 'Standard';
        }
      }
      return {
        ...item,
        index: idx + 1,
        actualSize,
      };
    });
  }, [bill]);

  // Generate WhatsApp QR Code for this bill / customer
  useEffect(() => {
    if (!open || !bill) return;

    let isMounted = true;
    setLoadingQr(true);

    const targetUrl = getWhatsAppTargetUrl(bill.customer || bill, bill, lineItems[0]);
    generateWhatsAppQrCode(targetUrl)
      .then((dataUrl) => {
        if (isMounted) {
          setQrCodeDataUrl(dataUrl);
          setLoadingQr(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate sticker QR code:', err);
        if (isMounted) setLoadingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, bill, lineItems]);

  // Selected items to print
  const itemsToPrint = useMemo(() => {
    if (selectedItemIndex === 'ALL') {
      return lineItems;
    }
    const idx = parseInt(selectedItemIndex, 10);
    return lineItems[idx] ? [lineItems[idx]] : lineItems;
  }, [lineItems, selectedItemIndex]);

  // Build the individual stickers (multiplying by pieces if printPerPiece is enabled)
  const stickerUnits = useMemo(() => {
    const units = [];
    itemsToPrint.forEach((item, itemIdx) => {
      const pcsCount = Math.max(1, parseInt(item.pcs, 10) || 1);
      if (printPerPiece && pcsCount > 1) {
        for (let p = 1; p <= pcsCount; p++) {
          units.push({
            item,
            index: item.index,
            pieceLabel: `Pcs: ${p}/${pcsCount}`,
            unitId: `${item.index}-p${p}`,
          });
        }
      } else {
        units.push({
          item,
          index: item.index,
          pieceLabel: `Pcs: ${item.pcs ?? 1}`,
          unitId: `${item.index}-single`,
        });
      }
    });
    return units;
  }, [itemsToPrint, printPerPiece]);

  // Handle Print Action
  const handlePrint = () => {
    if (!stickerUnits.length) return;
    const allStickersHtml = stickerUnits
      .map((unit) =>
        buildGlassStickerHtml({
          bill,
          item: unit.item,
          index: unit.index - 1,
          pieceLabel: unit.pieceLabel,
          qrCodeDataUrl,
        })
      )
      .join('\n');

    printGlassStickers({
      stickersHtml: allStickersHtml,
      title: `Glass-Stickers-Bill-${billNo}`,
    });
  };

  // Print single specific unit
  const handlePrintSingle = (unit) => {
    const singleHtml = buildGlassStickerHtml({
      bill,
      item: unit.item,
      index: unit.index - 1,
      pieceLabel: unit.pieceLabel,
      qrCodeDataUrl,
    });
    printGlassStickers({
      stickersHtml: singleHtml,
      title: `Glass-Sticker-#${unit.item.index}`,
    });
  };

  if (!bill) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          bgcolor: '#7c3aed',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <QrCode2Icon sx={{ fontSize: 26, color: '#f3e8ff' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Print Glass Sticker Labels (2" × 2")
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
              Invoice #{billNo} • {customerName}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Control Toolbar */}
      <Box
        sx={{
          p: 2.5,
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Left: Item Filter Dropdown */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="select-label-item-label">Select Item</InputLabel>
            <Select
              labelId="select-label-item-label"
              label="Select Item"
              value={selectedItemIndex}
              onChange={(e) => setSelectedItemIndex(e.target.value)}
            >
              <MenuItem value="ALL">
                <strong>All Items ({lineItems.length} lines)</strong>
              </MenuItem>
              {lineItems.map((item, idx) => (
                <MenuItem key={idx} value={String(idx)}>
                  #{item.index}: {item.itemName} ({item.actualSize} • {item.pcs} pcs)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Right/Middle: Mode (Per piece vs Per line) */}
          <RadioGroup
            row
            value={printPerPiece ? 'piece' : 'line'}
            onChange={(e) => setPrintPerPiece(e.target.value === 'piece')}
            sx={{ gap: 1 }}
          >
            <FormControlLabel
              value="piece"
              control={<Radio size="small" sx={{ color: '#7c3aed', '&.Mui-checked': { color: '#7c3aed' } }} />}
              label={<Typography variant="body2" sx={{ fontWeight: 600 }}>1 per Piece</Typography>}
            />
            <FormControlLabel
              value="line"
              control={<Radio size="small" sx={{ color: '#7c3aed', '&.Mui-checked': { color: '#7c3aed' } }} />}
              label={<Typography variant="body2" sx={{ fontWeight: 600 }}>1 per Line</Typography>}
            />
          </RadioGroup>
        </Box>

        {/* Counter & Print Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={`${stickerUnits.length} Sticker${stickerUnits.length === 1 ? '' : 's'}`}
            sx={{ fontWeight: 800, bgcolor: '#ede9fe', color: '#6d28d9' }}
          />
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={stickerUnits.length === 0 || loadingQr}
            sx={{
              bgcolor: '#7c3aed',
              '&:hover': { bgcolor: '#6d28d9' },
              color: '#ffffff',
              fontWeight: 800,
              px: 3,
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
            }}
          >
            Print Labels (2" × 2")
          </Button>
        </Box>
      </Box>

      {/* Live 2" x 2" Stickers Preview */}
      <DialogContent sx={{ p: 3, bgcolor: '#f1f5f9', minHeight: 340 }}>
        {loadingQr ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
            <CircularProgress sx={{ color: '#7c3aed' }} />
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
              Generating WhatsApp QR Code...
            </Typography>
          </Box>
        ) : stickerUnits.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 600 }}>
              No line items available to generate labels.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            {stickerUnits.map((unit) => {
              const { item, index, pieceLabel, unitId } = unit;
              const companyNameUr = COMPANY.nameUr || 'زین ٹریڈرز منڈی بہاؤالدین';
              const jobDesc = item.jobDesc && item.jobDesc !== '-' ? item.jobDesc : '';

              return (
                <Paper
                  key={unitId}
                  elevation={3}
                  sx={{
                    width: '2in',
                    height: '2in',
                    maxWidth: '2in',
                    maxHeight: '2in',
                    boxSizing: 'border-box',
                    p: '2mm 2.2mm',
                    bgcolor: '#ffffff',
                    color: '#000000',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1.5px solid #000000',
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'hidden',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  {/* Line 1: Logo & Company Name in Urdu */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1.5px solid #000000',
                      pb: '2px',
                    }}
                  >
                    {/* Circle Logo */}
                    <Box
                      sx={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: '1.5px solid #000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        bgcolor: '#ffffff',
                        textAlign: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Urdu Typesetting", serif',
                          fontSize: '11px',
                          fontWeight: 900,
                          lineHeight: 1,
                          color: '#000000',
                        }}
                      >
                        زین
                      </span>
                    </Box>

                    {/* Urdu Company Name */}
                    <Typography
                      sx={{
                        fontFamily: '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Urdu Typesetting", serif',
                        fontSize: '12px',
                        fontWeight: 900,
                        direction: 'rtl',
                        textAlign: 'right',
                        color: '#000000',
                        lineHeight: 1.1,
                        letterSpacing: '-0.2px',
                      }}
                    >
                      {companyNameUr}
                    </Typography>
                  </Box>

                  {/* Line 2: Serial Number & Product Name */}
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, pt: '1px', minWidth: 0 }}>
                    <Box
                      component="span"
                      sx={{
                        bgcolor: '#000000',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '10px',
                        px: '3px',
                        py: '1px',
                        borderRadius: '2px',
                        flexShrink: 0,
                        lineHeight: 1.1,
                      }}
                    >
                      #{index}
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: '11px',
                        color: '#000000',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.15,
                        letterSpacing: '-0.2px',
                      }}
                    >
                      {item.itemName}
                      {jobDesc && (
                        <Box component="span" sx={{ fontSize: '9.5px', fontWeight: 600, color: '#334155', ml: 0.5 }}>
                          ({jobDesc})
                        </Box>
                      )}
                    </Typography>
                  </Box>

                  {/* Line 3: Entered Size & Pcs */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: '#f1f5f9',
                      px: '4px',
                      py: '2px',
                      borderRadius: '3px',
                      border: '1px solid #94a3b8',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <Typography sx={{ fontSize: '8px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                        Size:
                      </Typography>
                      <Typography sx={{ fontSize: '11.5px', fontWeight: 900, color: '#000000', letterSpacing: '-0.3px' }}>
                        {item.actualSize}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <Typography sx={{ fontSize: '11.5px', fontWeight: 900, color: '#000000' }}>
                        {pieceLabel}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Line 4: WhatsApp QR code (Left) + Customer Name & Phone (Right) */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1.5px solid #000000',
                      pt: '2px',
                      gap: '5px',
                    }}
                  >
                    {/* Left: QR code */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      {qrCodeDataUrl && (
                        <img
                          src={qrCodeDataUrl}
                          alt="WhatsApp QR"
                          style={{ width: '44px', height: '44px', display: 'block' }}
                        />
                      )}
                      <Typography sx={{ fontSize: '6.5px', fontWeight: 800, color: '#16a34a', lineHeight: 1, mt: '1px', textTransform: 'uppercase' }}>
                        WhatsApp
                      </Typography>
                    </Box>

                    {/* Right: Customer info */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', flex: 1, textAlign: 'right', minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: '9.5px',
                          fontWeight: 900,
                          color: '#000000',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                        }}
                      >
                        {customerName}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          color: '#000000',
                          letterSpacing: '0.2px',
                          lineHeight: 1.2,
                          mt: '1px',
                        }}
                      >
                        {customerPhone}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '7.5px',
                          fontWeight: 700,
                          color: '#475569',
                          lineHeight: 1.1,
                          mt: '1px',
                        }}
                      >
                        Inv #{billNo}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>

      {/* Footer Actions */}
      <DialogActions sx={{ p: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
          💡 Perfect for 2" × 2" (50mm × 50mm) thermal glass stickers and barcode label rolls.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" onClick={onClose} sx={{ minWidth: 90, color: '#64748b', borderColor: '#cbd5e1' }}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={stickerUnits.length === 0 || loadingQr}
            sx={{
              bgcolor: '#7c3aed',
              '&:hover': { bgcolor: '#6d28d9' },
              color: '#ffffff',
              fontWeight: 800,
              minWidth: 160,
            }}
          >
            Print Labels (2" × 2")
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

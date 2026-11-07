'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  Chip,
  IconButton,
  InputAdornment,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Extension as ExtensionIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Reusable AddonPickerModal component
 * Pop-up dialog to select and customize add-ons for a product or sale line item.
 */
export default function AddonPickerModal({
  open = false,
  onClose,
  selectedAddonIds = [],
  onApply,
  title = "Select Ad On's",
  subtitle = "Choose one or more add-ons to apply",
  availableAddons = null,
}) {
  const [addonsList, setAddonsList] = useState(availableAddons || []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set(selectedAddonIds || []));

  useEffect(() => {
    setSelectedIds(new Set(selectedAddonIds || []));
  }, [selectedAddonIds, open]);

  useEffect(() => {
    if (availableAddons && Array.isArray(availableAddons)) {
      setAddonsList(availableAddons);
      return;
    }

    if (open) {
      setLoading(true);
      fetch('/api/addons?status=ACTIVE')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          setAddonsList(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error('Failed to load add-ons:', err))
        .finally(() => setLoading(false));
    }
  }, [open, availableAddons]);

  const filteredAddons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return addonsList;
    return addonsList.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.short_code || '').toLowerCase().includes(q)
    );
  }, [addonsList, search]);

  const toggleAddon = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedList = useMemo(() => {
    return addonsList.filter((a) => selectedIds.has(a.id));
  }, [addonsList, selectedIds]);

  const totalSale = selectedList.reduce((sum, a) => sum + parseFloat(a.sale_price || 0), 0);
  const totalCost = selectedList.reduce((sum, a) => sum + parseFloat(a.cost_price || 0), 0);
  const profit = totalSale - totalCost;

  const handleApply = () => {
    const ids = Array.from(selectedIds);
    if (onApply) onApply(ids, selectedList);
    if (onClose) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 0,
          border: '1px solid #cbd5e1',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          bgcolor: '#fafbfd',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              bgcolor: '#e8effd',
              border: '1px solid #bfdbfe',
              borderRadius: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ExtensionIcon sx={{ color: '#1A55E3', fontSize: '20px' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ borderRadius: 0 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, bgcolor: '#ffffff' }}>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Filter by name or short code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 0, fontSize: '0.8125rem', bgcolor: '#f8fafc', mb: 2 },
          }}
        />

        {/* Addon checklist */}
        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : filteredAddons.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
            <Typography sx={{ fontSize: '0.85rem' }}>No add-ons found matching "{search}"</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              maxHeight: 320,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 0,
              divideY: '1px solid #f1f5f9',
            }}
          >
            {filteredAddons.map((addon) => {
              const isChecked = selectedIds.has(addon.id);
              return (
                <Box
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    bgcolor: isChecked ? '#eff6ff' : '#ffffff',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: isChecked ? '#dbeafe' : '#f8fafc' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <Checkbox
                      checked={isChecked}
                      size="small"
                      sx={{ borderRadius: 0, p: 0.5, color: '#94a3b8', '&.Mui-checked': { color: '#1A55E3' } }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                          {addon.name}
                        </Typography>
                        {addon.short_code && (
                          <Chip
                            label={addon.short_code}
                            size="small"
                            sx={{
                              height: 18,
                              borderRadius: 0,
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              bgcolor: '#f1f5f9',
                              color: '#475569',
                            }}
                          />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#64748b', mt: 0.2 }}>
                        Cost: PKR {fmtAmt(addon.cost_price)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: 'right', shrink: 0 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#1A55E3' }}>
                      PKR {fmtAmt(addon.sale_price)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Live Calculation Footer inside Modal */}
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: '#fafbfd',
            border: '1px solid #e2e8f0',
            borderRadius: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
            Selected: <strong style={{ color: '#0f172a' }}>{selectedList.length}</strong> add-on(s)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>
                Total Add-on Price
              </Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A55E3' }}>
                PKR {fmtAmt(totalSale)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #f1f5f9', bgcolor: '#fafbfd', gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 0, textTransform: 'none', color: '#64748b', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          sx={{
            borderRadius: 0,
            bgcolor: '#1A55E3',
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: '#1545b8' },
          }}
        >
          Apply ({selectedList.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
}


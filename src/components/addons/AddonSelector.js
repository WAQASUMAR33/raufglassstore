'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  Extension as ExtensionIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Reusable AddonSelector component
 * Allows selecting and associating add-ons to products, sale line items, or orders.
 *
 * Props:
 * - selectedAddonIds: number[]
 * - onChange: (ids: number[], addons: Addon[]) => void
 * - availableAddons?: Addon[] (optional pre-loaded list)
 * - label?: string
 * - placeholder?: string
 * - showSummary?: boolean (displays total add-on sale & profit preview)
 * - disabled?: boolean
 */
export default function AddonSelector({
  selectedAddonIds = [],
  onChange,
  availableAddons = null,
  label = "Associate Ad On's",
  placeholder = "Search and select add-on's...",
  showSummary = true,
  disabled = false,
  helperText = null,
}) {
  const [addonsList, setAddonsList] = useState(availableAddons || []);
  const [loading, setLoading] = useState(!availableAddons);

  useEffect(() => {
    if (availableAddons && Array.isArray(availableAddons)) {
      setAddonsList(availableAddons);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadAddons() {
      try {
        setLoading(true);
        const res = await fetch('/api/addons?status=ACTIVE');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setAddonsList(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load add-ons:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAddons();
    return () => {
      isMounted = false;
    };
  }, [availableAddons]);

  // Selected addon objects
  const selectedAddons = useMemo(() => {
    const idSet = new Set((selectedAddonIds || []).map((id) => parseInt(id, 10)));
    return addonsList.filter((a) => idSet.has(a.id));
  }, [selectedAddonIds, addonsList]);

  // Financial summary of selected add-ons
  const summary = useMemo(() => {
    const totalCost = selectedAddons.reduce((sum, a) => sum + parseFloat(a.cost_price || 0), 0);
    const totalSale = selectedAddons.reduce((sum, a) => sum + parseFloat(a.sale_price || 0), 0);
    const profit = totalSale - totalCost;
    return { totalCost, totalSale, profit, count: selectedAddons.length };
  }, [selectedAddons]);

  const handleChange = (event, newSelected) => {
    const ids = newSelected.map((item) => item.id);
    if (onChange) onChange(ids, newSelected);
  };

  const handleRemove = (idToRemove) => {
    const updated = selectedAddons.filter((a) => a.id !== idToRemove);
    const ids = updated.map((a) => a.id);
    if (onChange) onChange(ids, updated);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <ExtensionIcon sx={{ fontSize: '16px', color: '#1A55E3' }} />
          {label}
        </Typography>

        {showSummary && summary.count > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.2,
                py: 0.25,
                bgcolor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 0,
              }}
            >
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#15803d' }}>
                +{summary.count} Ad On{summary.count > 1 ? 's' : ''}:
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534' }}>
                PKR {fmtAmt(summary.totalSale)}
              </Typography>
              {summary.profit > 0 && (
                <Typography sx={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 600 }}>
                  (Margin: PKR {fmtAmt(summary.profit)})
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Autocomplete
        multiple
        disabled={disabled}
        options={addonsList}
        getOptionLabel={(option) =>
          `${option.name}${option.short_code ? ` (${option.short_code})` : ''} — PKR ${fmtAmt(option.sale_price)}`
        }
        isOptionEqualToValue={(option, value) => option.id === value.id}
        value={selectedAddons}
        onChange={handleChange}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={selectedAddons.length === 0 ? placeholder : ''}
            size="small"
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              sx: {
                borderRadius: 0,
                fontSize: '0.8125rem',
                bgcolor: '#ffffff',
                '& fieldset': { borderColor: '#cbd5e1' },
                '&:hover fieldset': { borderColor: '#94a3b8' },
                '&.Mui-focused fieldset': { borderColor: '#1A55E3' },
              },
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderTags={() => null} // We render custom interactive tags below
        renderOption={(props, option, { selected }) => (
          <li
            {...props}
            key={option.id}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: selected ? '#eff6ff' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <Box sx={{ minWidth: 0, pr: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                  {option.name}
                </Typography>
                {option.short_code && (
                  <Chip
                    size="small"
                    label={option.short_code}
                    sx={{
                      height: 18,
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      borderRadius: 0,
                      bgcolor: '#f1f5f9',
                      color: '#475569',
                    }}
                  />
                )}
              </Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#64748b', mt: 0.2 }}>
                Cost: PKR {fmtAmt(option.cost_price)} | Sale: PKR {fmtAmt(option.sale_price)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, shrink: 0 }}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1A55E3' }}>
                PKR {fmtAmt(option.sale_price)}
              </Typography>
              {selected && <CheckIcon sx={{ fontSize: '18px', color: '#059669' }} />}
            </Box>
          </li>
        )}
        sx={{
          '& .MuiAutocomplete-paper': {
            borderRadius: 0,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            border: '1px solid #e2e8f0',
          },
        }}
      />

      {/* Selected Add-ons Badges */}
      {selectedAddons.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
          {selectedAddons.map((addon) => (
            <Chip
              key={addon.id}
              label={
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {addon.name}
                  </Typography>
                  {addon.short_code && (
                    <Typography component="span" sx={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 600 }}>
                      [{addon.short_code}]
                    </Typography>
                  )}
                  <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e3a8a' }}>
                    +PKR {fmtAmt(addon.sale_price)}
                  </Typography>
                </Box>
              }
              onDelete={disabled ? undefined : () => handleRemove(addon.id)}
              deleteIcon={<CloseIcon sx={{ fontSize: '13px !important' }} />}
              sx={{
                borderRadius: 0,
                bgcolor: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #bfdbfe',
                height: 26,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}


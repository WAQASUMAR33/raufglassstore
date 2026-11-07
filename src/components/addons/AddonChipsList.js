'use client';

import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { Extension as ExtensionIcon } from '@mui/icons-material';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Reusable AddonChipsList component
 * Displays add-ons as clean rectangular chips with pricing tooltips.
 * Used in:
 * - Products table & detail views
 * - Sale / Billing line items
 * - Order line items
 * - Add-on management view
 */
export default function AddonChipsList({
  addons = [],
  onRemove = null,
  maxDisplay = 3,
  showPrice = true,
  priceType = 'sale', // 'sale' | 'cost'
  size = 'small',
  emptyText = 'No add-ons',
  sx = {},
}) {
  const normalizedList = Array.isArray(addons)
    ? addons.map((item) => {
        // Handle both raw Addon and ProductAddon join object ({ addon: { ... } })
        const a = item.addon || item;
        return {
          id: a.id || item.addon_id || item.id,
          name: a.name || 'Unnamed Add-on',
          short_code: a.short_code || '',
          cost_price: parseFloat(a.cost_price || 0),
          sale_price: parseFloat(a.sale_price || 0),
          status: a.status || 'ACTIVE',
        };
      })
    : [];

  if (normalizedList.length === 0) {
    if (!emptyText) return null;
    return (
      <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>
        {emptyText}
      </Typography>
    );
  }

  const visibleAddons = maxDisplay ? normalizedList.slice(0, maxDisplay) : normalizedList;
  const remainingCount = maxDisplay ? Math.max(0, normalizedList.length - maxDisplay) : 0;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, alignItems: 'center', ...sx }}>
      {visibleAddons.map((addon) => {
        const price = priceType === 'cost' ? addon.cost_price : addon.sale_price;
        const displayLabel = addon.short_code
          ? `${addon.short_code}${showPrice && price > 0 ? ` · PKR ${fmtAmt(price)}` : ''}`
          : `${addon.name}${showPrice && price > 0 ? ` · PKR ${fmtAmt(price)}` : ''}`;

        return (
          <Tooltip
            key={addon.id}
            title={
              <Box sx={{ p: 0.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{addon.name}</Typography>
                {addon.short_code && (
                  <Typography sx={{ fontSize: '0.7rem', color: '#93c5fd' }}>
                    Code: {addon.short_code}
                  </Typography>
                )}
                <Typography sx={{ fontSize: '0.7rem', color: '#e2e8f0', mt: 0.5 }}>
                  Cost: PKR {fmtAmt(addon.cost_price)} | Sale: PKR {fmtAmt(addon.sale_price)}
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: addon.status === 'ACTIVE' ? '#86efac' : '#fca5a5' }}>
                  Status: {addon.status}
                </Typography>
              </Box>
            }
            arrow
          >
            <Chip
              size={size}
              icon={<ExtensionIcon sx={{ fontSize: '13px !important', color: '#1A55E3 !important' }} />}
              label={displayLabel}
              onDelete={onRemove ? () => onRemove(addon.id) : undefined}
              sx={{
                borderRadius: 0,
                fontSize: size === 'small' ? '0.6875rem' : '0.75rem',
                fontWeight: 600,
                height: size === 'small' ? 22 : 26,
                bgcolor: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #bfdbfe',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: '#dbeafe',
                  borderColor: '#93c5fd',
                },
                '& .MuiChip-label': {
                  px: 0.8,
                },
              }}
            />
          </Tooltip>
        );
      })}

      {remainingCount > 0 && (
        <Tooltip
          title={normalizedList
            .slice(maxDisplay)
            .map((a) => a.name)
            .join(', ')}
          arrow
        >
          <Chip
            size={size}
            label={`+${remainingCount}`}
            sx={{
              borderRadius: 0,
              fontSize: '0.6875rem',
              fontWeight: 700,
              height: size === 'small' ? 22 : 26,
              bgcolor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}


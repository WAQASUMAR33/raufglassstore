'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

export default function DuplicateRowDialog({
  open = false,
  onClose,
  targetRow = null,
  onDuplicate,
}) {
  const [count, setCount] = useState(1);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setCount(1);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [open]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const num = Math.max(1, parseInt(count, 10) || 1);
    if (onDuplicate && targetRow) {
      onDuplicate(targetRow, num);
    }
    if (onClose) onClose();
  };

  if (!targetRow) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 1,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
            pt: 1.5,
            px: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ContentCopyIcon color="primary" fontSize="small" />
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Duplicate Item Row
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2, py: 1.5 }}>
          {/* Item Preview Card */}
          <Box
            sx={{
              p: 1.5,
              mb: 2,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 1.5,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
              {targetRow.pro_title || 'Selected Item'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
              {targetRow.width_in && targetRow.height_in && (
                <Chip
                  size="small"
                  label={`Size: ${targetRow.width_in}" × ${targetRow.height_in}"`}
                  sx={{ height: 20, fontSize: '0.72rem', fontWeight: 600, bgcolor: '#e0f2fe', color: '#0369a1' }}
                />
              )}
              {targetRow.calc_width && targetRow.calc_height && (
                <Chip
                  size="small"
                  label={`Avail: ${targetRow.calc_width}" × ${targetRow.calc_height}"`}
                  sx={{ height: 20, fontSize: '0.72rem', fontWeight: 600, bgcolor: '#dcfce7', color: '#15803d' }}
                />
              )}
              <Chip
                size="small"
                label={`${targetRow.pieces || 1} pcs`}
                sx={{ height: 20, fontSize: '0.72rem', fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={`Qty: ${targetRow.quantity || 0} sq ft`}
                sx={{ height: 20, fontSize: '0.72rem', fontWeight: 600 }}
              />
            </Box>
          </Box>

          <Typography variant="body2" sx={{ mb: 1, fontWeight: 700, color: '#334155' }}>
            How many duplicate rows do you want to add?
          </Typography>

          <TextField
            inputRef={inputRef}
            fullWidth
            type="number"
            size="small"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            inputProps={{ min: 1, max: 100, step: 1 }}
            placeholder="Enter number (e.g. 1, 2, 5...)"
            helperText="Press Enter to duplicate or Esc to cancel"
            sx={{
              '& .MuiInputBase-input': {
                fontWeight: 800,
                fontSize: '1.1rem',
                textAlign: 'center',
                py: 1,
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<ContentCopyIcon />}
            sx={{ fontWeight: 700, px: 2.5 }}
          >
            Duplicate ({Math.max(1, parseInt(count, 10) || 1)})
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

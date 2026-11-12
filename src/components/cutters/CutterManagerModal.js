'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ContentCut as CutterIcon,
  Check as CheckIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';

export default function CutterManagerModal({
  open,
  onClose,
  onCutterSaved,
  onCutterDeleted,
  selectedCutterId,
}) {
  const [cutters, setCutters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    cutter_name: '',
    cutter_phone: '',
    notes: '',
    status: 'ACTIVE',
  });

  const fetchCutters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cutters?all=true');
      if (!res.ok) throw new Error('Failed to fetch cutters');
      const data = await res.json();
      setCutters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading cutters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchCutters();
      resetForm();
    }
  }, [open, fetchCutters]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      cutter_name: '',
      cutter_phone: '',
      notes: '',
      status: 'ACTIVE',
    });
    setError('');
    setSuccess('');
  };

  const handleStartEdit = (cutter) => {
    setIsEditing(true);
    setEditingId(cutter.cutter_id);
    setFormData({
      cutter_name: cutter.cutter_name || '',
      cutter_phone: cutter.cutter_phone || '',
      notes: cutter.notes || '',
      status: cutter.status || 'ACTIVE',
    });
    setError('');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.cutter_name.trim()) {
      setError('Cutter name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const payload = isEditing ? { cutter_id: editingId, ...formData } : formData;

      const res = await fetch('/api/cutters', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save cutter');
      }

      const savedCutter = await res.json();
      setSuccess(isEditing ? 'Cutter updated successfully' : 'New cutter added successfully');
      resetForm();
      await fetchCutters();

      if (typeof onCutterSaved === 'function') {
        onCutterSaved(savedCutter);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error saving cutter');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete cutter "${name}"?`)) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/cutters?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete cutter');
      }

      setSuccess(`Cutter "${name}" deleted`);
      if (editingId === id) resetForm();
      await fetchCutters();

      if (typeof onCutterDeleted === 'function') {
        onCutterDeleted(id);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error deleting cutter');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, bgcolor: '#1e3a5f', color: '#fff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <CutterIcon sx={{ color: '#93c5fd' }} />
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
            Glass Cutters Management
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Add / Edit Form Card */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: '1px solid #cbd5e1', borderRadius: 2, bgcolor: '#fff' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#1e293b' }}>
            {isEditing ? `✏️ Edit Cutter #${editingId}` : '➕ Add New Glass Cutter'}
          </Typography>

          <Box component="form" onSubmit={handleSave}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1.5fr 2.5fr auto' }, gap: 1.5, alignItems: 'center' }}>
              <TextField
                size="small"
                label="Cutter Name *"
                placeholder="e.g. Master Aslam"
                value={formData.cutter_name}
                onChange={(e) => setFormData(prev => ({ ...prev, cutter_name: e.target.value }))}
                required
                autoFocus={isEditing}
              />
              <TextField
                size="small"
                label="Phone Number"
                placeholder="e.g. 0300-1234567"
                value={formData.cutter_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, cutter_phone: e.target.value }))}
              />
              <TextField
                size="small"
                label="Specialization / Notes"
                placeholder="e.g. Table 1, Beveling expert"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving || !formData.cutter_name.trim()}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
                  sx={{
                    bgcolor: isEditing ? '#0284c7' : '#16a34a',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 2,
                    '&:hover': { bgcolor: isEditing ? '#0369a1' : '#15803d' },
                  }}
                >
                  {isEditing ? 'Update' : 'Add'}
                </Button>
                {isEditing && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={resetForm}
                    sx={{ textTransform: 'none', color: '#64748b', borderColor: '#cbd5e1' }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Existing Cutters Table */}
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, display: 'block' }}>
          Registered Cutters List ({cutters.length})
        </Typography>

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, maxHeight: 320 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f1f5f9', width: 50 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f1f5f9', minWidth: 150 }}>Cutter Name</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f1f5f9', minWidth: 130 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f1f5f9' }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f1f5f9', width: 80 }} align="center">Status</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f1f5f9', width: 100 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : cutters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                    No cutters registered yet. Add one above.
                  </TableCell>
                </TableRow>
              ) : (
                cutters.map((c) => {
                  const isCurrent = Number(c.cutter_id) === Number(selectedCutterId);
                  return (
                    <TableRow
                      key={c.cutter_id}
                      sx={{
                        bgcolor: isCurrent ? '#eff6ff' : 'inherit',
                        '&:hover': { bgcolor: isCurrent ? '#dbeafe' : '#f8fafc' },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>#{c.cutter_id}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {c.cutter_name}
                        {isCurrent && (
                          <Chip size="small" label="Selected" sx={{ ml: 1, height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#3b82f6', color: '#fff' }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: '#475569' }}>
                        {c.cutter_phone ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 13, color: '#64748b' }} />
                            <span>{c.cutter_phone}</span>
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ color: '#64748b', fontSize: '0.82rem' }}>{c.notes || '—'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={c.status || 'ACTIVE'}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: c.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                            color: c.status === 'ACTIVE' ? '#166534' : '#991b1b',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Edit Cutter">
                            <IconButton
                              size="small"
                              onClick={() => handleStartEdit(c)}
                              sx={{ color: '#0284c7', p: 0.5 }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Cutter">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(c.cutter_id, c.cutter_name)}
                              sx={{ color: '#dc2626', p: 0.5 }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, bgcolor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: '#475569', textTransform: 'none', fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

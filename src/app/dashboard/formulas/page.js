'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/dashboard-layout';
import { calculateGlassDimensions, parseStepsString } from '@/lib/glass-formula';

// Material-UI imports
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Stack,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';

// Material Icons
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

const GHANI_PRESET_STEPS = '6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 108, 120, 144';
const STRICT_PRESET_STEPS = '6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72, 84, 96, 102, 108, 114, 120, 126, 132, 144';

export default function FormulasManagementPage() {
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFormula, setEditingFormula] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tolerance: '0.10',
    width_steps: GHANI_PRESET_STEPS,
    height_steps: '',
    min_width: '6',
    min_height: '6',
    divisor: '144',
    rounding_rule: 'SLAB_TIERS',
    is_default: false,
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});

  // Simulator state in modal
  const [simWidth, setSimWidth] = useState('12.6');
  const [simHeight, setSimHeight] = useState('23');
  const [simPcs, setSimPcs] = useState('1');

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Feedback snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchFormulas = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/formulas');
      if (!res.ok) throw new Error('Failed to load formulas');
      const data = await res.json();
      setFormulas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showSnackbar(err.message || 'Error fetching formulas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormulas();
  }, []);

  // Filtered formulas
  const filteredFormulas = useMemo(() => {
    return formulas.filter(f => {
      const matchesSearch =
        !searchTerm ||
        f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && f.is_active) ||
        (statusFilter === 'inactive' && !f.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [formulas, searchTerm, statusFilter]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingFormula(null);
    setFormData({
      name: '',
      description: '',
      tolerance: '0.10',
      width_steps: GHANI_PRESET_STEPS,
      height_steps: '',
      min_width: '6',
      min_height: '6',
      divisor: '144',
      rounding_rule: 'SLAB_TIERS',
      is_default: formulas.length === 0,
      is_active: true,
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (formula) => {
    setEditingFormula(formula);
    setFormData({
      id: formula.id,
      name: formula.name || '',
      description: formula.description || '',
      tolerance: formula.tolerance !== undefined ? String(formula.tolerance) : '0.10',
      width_steps: formula.width_steps || GHANI_PRESET_STEPS,
      height_steps: formula.height_steps || '',
      min_width: formula.min_width !== undefined ? String(formula.min_width) : '6',
      min_height: formula.min_height !== undefined ? String(formula.min_height) : '6',
      divisor: formula.divisor !== undefined ? String(formula.divisor) : '144',
      rounding_rule: formula.rounding_rule || 'SLAB_TIERS',
      is_default: Boolean(formula.is_default),
      is_active: Boolean(formula.is_active),
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  // Preset loaders
  const loadGhaniPreset = () => {
    setFormData(prev => ({
      ...prev,
      name: prev.name || 'Ghani Glass 0.1" Tolerance',
      description: 'Standard Ghani Glass: <= 6.1" -> 6", <= 9.1" -> 9", <= 12.1" -> 12" etc.',
      tolerance: '0.10',
      width_steps: GHANI_PRESET_STEPS,
      height_steps: '',
      min_width: '6',
      min_height: '6',
      divisor: '144',
      rounding_rule: 'SLAB_TIERS',
    }));
  };

  const loadStrictPreset = () => {
    setFormData(prev => ({
      ...prev,
      name: prev.name || 'Heavy Glass Strict Step (0 Tolerance)',
      description: 'Strict slab cut: <= 6" -> 6", > 6" -> 9", steps by 3" up to 24", then by 6"',
      tolerance: '0.00',
      width_steps: STRICT_PRESET_STEPS,
      height_steps: '',
      min_width: '6',
      min_height: '6',
      divisor: '144',
      rounding_rule: 'SLAB_TIERS',
    }));
  };

  // Validate form
  const validate = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Formula name is required';
    if (!formData.width_steps?.trim()) errors.width_steps = 'Width slab steps are required';
    if (isNaN(parseFloat(formData.tolerance))) errors.tolerance = 'Enter a valid tolerance (e.g. 0.10 or 0.00)';
    if (isNaN(parseFloat(formData.divisor)) || parseFloat(formData.divisor) <= 0) errors.divisor = 'Enter a valid divisor (default 144)';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const url = '/api/formulas';
      const method = editingFormula ? 'PUT' : 'POST';
      const payload = {
        ...(editingFormula ? { id: editingFormula.id } : {}),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        tolerance: parseFloat(formData.tolerance) || 0,
        width_steps: formData.width_steps.trim(),
        height_steps: formData.height_steps?.trim() || null,
        min_width: parseFloat(formData.min_width) || 6,
        min_height: parseFloat(formData.min_height) || 6,
        divisor: parseFloat(formData.divisor) || 144,
        rounding_rule: formData.rounding_rule,
        is_default: Boolean(formData.is_default),
        is_active: Boolean(formData.is_active),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      showSnackbar(editingFormula ? 'Formula updated successfully' : 'Formula created successfully');
      setShowFormModal(false);
      fetchFormulas();
    } catch (err) {
      console.error(err);
      showSnackbar(err.message || 'Error saving formula', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete formula
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/formulas?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      showSnackbar(data.message || 'Formula removed');
      setDeleteConfirmId(null);
      fetchFormulas();
    } catch (err) {
      console.error(err);
      showSnackbar(err.message || 'Error deleting formula', 'error');
    }
  };

  // Live simulation for modal preview
  const liveSimResult = useMemo(() => {
    const tempFormula = {
      name: formData.name || 'Preview',
      tolerance: parseFloat(formData.tolerance) || 0,
      width_steps: formData.width_steps,
      height_steps: formData.height_steps,
      min_width: parseFloat(formData.min_width) || 6,
      min_height: parseFloat(formData.min_height) || 6,
      divisor: parseFloat(formData.divisor) || 144,
      rounding_rule: formData.rounding_rule,
    };
    return calculateGlassDimensions({
      width: simWidth,
      height: simHeight,
      pieces: simPcs,
      formula: tempFormula,
    });
  }, [formData, simWidth, simHeight, simPcs]);

  return (
    <DashboardLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        {/* Top Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                bgcolor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <CalculateIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Formulas Management
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Manage custom glass slab cut sizes, grace tolerances, and area formulas
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#fff',
              fontWeight: 700,
              px: 2.5,
              py: 1,
              borderRadius: 1,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              },
            }}
          >
            Add New Formula
          </Button>
        </Box>

        {/* Metric Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, boxShadow: 'none' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Formulas
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                  {formulas.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, boxShadow: 'none' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Active Formulas
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#16a34a', mt: 0.5 }}>
                  {formulas.filter(f => f.is_active).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, boxShadow: 'none' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Default Formula
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#2563eb', mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formulas.find(f => f.is_default)?.name || 'None Set'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters Card */}
        <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, boxShadow: 'none', mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search formulas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8' }} fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260, flex: 1 }}
              />

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active Only</MenuItem>
                  <MenuItem value="inactive">Inactive Only</MenuItem>
                </Select>
              </FormControl>

              <IconButton onClick={fetchFormulas} title="Refresh">
                <RefreshIcon />
              </IconButton>
            </Box>
          </CardContent>
        </Card>

        {/* Formulas Table */}
        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, boxShadow: 'none' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>NAME & DESCRIPTION</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>TOLERANCE</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>SLAB STEPS (INCHES)</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>DIVISOR</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>LINKED PRODUCTS</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>STATUS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.78rem' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredFormulas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#64748b' }}>
                    No formulas found. Click &quot;Add New Formula&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFormulas.map((f) => {
                  const steps = parseStepsString(f.width_steps);
                  return (
                    <TableRow key={f.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {f.is_default && (
                            <Tooltip title="Default Formula for all products">
                              <StarIcon sx={{ color: '#eab308', fontSize: 18 }} />
                            </Tooltip>
                          )}
                          <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                            {f.name}
                          </Typography>
                        </Box>
                        {f.description && (
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                            {f.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={parseFloat(f.tolerance) > 0 ? `+${f.tolerance}" tolerance` : 'Strict (0.00")'}
                          sx={{
                            fontWeight: 700,
                            bgcolor: parseFloat(f.tolerance) > 0 ? '#eff6ff' : '#f1f5f9',
                            color: parseFloat(f.tolerance) > 0 ? '#1d4ed8' : '#475569',
                            borderRadius: '4px',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="caption" sx={{ color: '#334155', fontWeight: 600, display: 'block' }}>
                          {steps.slice(0, 8).join(', ')}... ({steps.length} slabs up to {steps[steps.length - 1]}&quot;)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>
                          /{f.divisor} (Sq Ft)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={`${f._count?.products || 0} Products`}
                          sx={{
                            fontWeight: 700,
                            bgcolor: f._count?.products > 0 ? '#ecfdf5' : '#f8fafc',
                            color: f._count?.products > 0 ? '#047857' : '#64748b',
                            borderRadius: '4px',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={f.is_active ? 'Active' : 'Inactive'}
                          sx={{
                            fontWeight: 700,
                            bgcolor: f.is_active ? '#f0fdf4' : '#fef2f2',
                            color: f.is_active ? '#15803d' : '#b91c1c',
                            borderRadius: '4px',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit Formula">
                            <IconButton size="small" onClick={() => handleOpenEdit(f)} sx={{ color: '#2563eb' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Formula">
                            <IconButton size="small" onClick={() => setDeleteConfirmId(f.id)} sx={{ color: '#dc2626' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create / Edit Dialog */}
        <Dialog
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 0 } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 4, height: 20, bgcolor: '#2563eb' }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {editingFormula ? 'Edit Formula' : 'Add New Formula'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setShowFormModal(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <form onSubmit={handleSubmit}>
            <DialogContent dividers sx={{ p: 2.5 }}>
              {/* Quick Preset Buttons */}
              <Box sx={{ mb: 2.5, p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  Quick Load Standard Presets:
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={loadGhaniPreset}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 0 }}
                  >
                    Load Ghani Glass (0.1&quot; Grace Tolerance)
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={loadStrictPreset}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 0 }}
                  >
                    Load Heavy Glass (Strict 0 Tolerance)
                  </Button>
                </Stack>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    label="Formula Name"
                    placeholder="e.g. Ghani Glass 0.1 Tolerance (3mm, 5mm, Mirror)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={Boolean(formErrors.name)}
                    helperText={formErrors.name}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    type="number"
                    label="Grace Tolerance (Inches)"
                    placeholder="0.10"
                    value={formData.tolerance}
                    onChange={(e) => setFormData({ ...formData, tolerance: e.target.value })}
                    error={Boolean(formErrors.tolerance)}
                    helperText="e.g. 0.10 allows 12.1 → 12"
                    inputProps={{ step: '0.01', min: '0' }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description & Notes"
                    placeholder="Brief description of products using this formula..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    required
                    multiline
                    rows={2}
                    label="Width Slab Steps (Inches, comma-separated)"
                    placeholder="6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 144"
                    value={formData.width_steps}
                    onChange={(e) => setFormData({ ...formData, width_steps: e.target.value })}
                    error={Boolean(formErrors.width_steps)}
                    helperText={formErrors.width_steps || 'Enter comma-separated standard cut slabs in inches'}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={1}
                    label="Height Slab Steps (Optional, leave blank to use Width steps)"
                    placeholder="Leave blank to use width steps..."
                    value={formData.height_steps}
                    onChange={(e) => setFormData({ ...formData, height_steps: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Min Width (Inches)"
                    value={formData.min_width}
                    onChange={(e) => setFormData({ ...formData, min_width: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Min Height (Inches)"
                    value={formData.min_height}
                    onChange={(e) => setFormData({ ...formData, min_height: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Area Divisor"
                    value={formData.divisor}
                    onChange={(e) => setFormData({ ...formData, divisor: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="144 for Sq Ft from Inches"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_default}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        color="primary"
                      />
                    }
                    label="Set as Default Formula"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        color="success"
                      />
                    }
                    label="Active Status"
                  />
                </Grid>
              </Grid>

              {/* LIVE SIMULATOR / TESTER CARD */}
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: 0,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PlayArrowIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#166534', textTransform: 'uppercase' }}>
                    Live Formula Size Simulator
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#166534', display: 'block', mb: 1.5 }}>
                  Type sample entered sizes below to test how this formula adjusts width, height, and square feet:
                </Typography>

                <Grid container spacing={1.5} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <TextField
                      size="small"
                      type="number"
                      label="Test Width (In)"
                      value={simWidth}
                      onChange={(e) => setSimWidth(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ bgcolor: '#fff' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      size="small"
                      type="number"
                      label="Test Height (In)"
                      value={simHeight}
                      onChange={(e) => setSimHeight(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ bgcolor: '#fff' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      size="small"
                      type="number"
                      label="Pcs"
                      value={simPcs}
                      onChange={(e) => setSimPcs(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ bgcolor: '#fff' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ p: 1, bgcolor: '#ffffff', border: '1px solid #86efac', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', display: 'block' }}>
                        Adjusted Size & Area:
                      </Typography>
                      <Typography sx={{ fontWeight: 900, color: '#14532d', fontSize: '0.95rem' }}>
                        {liveSimResult.calc_width}&quot; × {liveSimResult.calc_height}&quot; = {liveSimResult.quantity} sq ft
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 1.5 }}>
              <Button onClick={() => setShowFormModal(false)} sx={{ borderRadius: 0 }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={<SaveIcon />}
                sx={{
                  bgcolor: '#2563eb',
                  borderRadius: 0,
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#1d4ed8' },
                }}
              >
                {isSubmitting ? 'Saving...' : editingFormula ? 'Update Formula' : 'Create Formula'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          PaperProps={{ sx: { borderRadius: 0 } }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to remove this formula? If products are currently linked to it, it will be deactivated to safeguard your data.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteConfirmId(null)} sx={{ borderRadius: 0 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleDelete(deleteConfirmId)}
              sx={{ borderRadius: 0, fontWeight: 700 }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar Notification */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
}

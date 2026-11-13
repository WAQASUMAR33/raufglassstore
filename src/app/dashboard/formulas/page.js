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
  Avatar,
  Divider,
  Container,
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
  PlayArrow as PlayArrowIcon,
  Layers as LayersIcon,
  Warning as WarningIcon,
  Tune as TuneIcon,
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
      <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={3}>
          {/* Top Header Banner */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              pb: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#eff6ff',
                  color: '#1A55E3',
                  border: '1px solid #dbeafe',
                }}
              >
                <CalculateIcon fontSize="medium" />
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="h5"
                    component="h1"
                    sx={{
                      fontWeight: 700,
                      color: '#0f172a',
                      letterSpacing: '-0.02em',
                      fontSize: { xs: '1.45rem', sm: '1.65rem' },
                    }}
                  >
                    Formulas Management
                  </Typography>
                  <Chip
                    label="Glass Calculations"
                    size="small"
                    sx={{
                      bgcolor: '#eff6ff',
                      color: '#1A55E3',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: '8px',
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.25, fontSize: '0.875rem' }}>
                  Manage custom glass slab cut sizes, grace tolerances, and area calculation rules
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{
                background: 'linear-gradient(135deg, #1A55E3 0%, #2563EB 100%)',
                color: '#ffffff',
                fontWeight: 600,
                px: 3,
                py: 1.1,
                borderRadius: '10px',
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(26, 85, 227, 0.3)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1646b8 0%, #1d4ed8 100%)',
                  boxShadow: '0 6px 18px rgba(26, 85, 227, 0.4)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Add New Formula
            </Button>
          </Box>

          {/* Metric Cards Ribbon */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  bgcolor: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#cbd5e1' },
                }}
              >
                <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Total Formulas
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                        {formulas.length}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#eff6ff', color: '#1A55E3', width: 44, height: 44, borderRadius: '10px' }}>
                      <LayersIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  bgcolor: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#cbd5e1' },
                }}
              >
                <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Active Formulas
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#059669', mt: 0.5 }}>
                        {formulas.filter(f => f.is_active).length}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#ecfdf5', color: '#059669', width: 44, height: 44, borderRadius: '10px' }}>
                      <CheckCircleIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  bgcolor: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#cbd5e1' },
                }}
              >
                <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0, pr: 1 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Default System Formula
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#d97706',
                          mt: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '1.05rem',
                        }}
                      >
                        {formulas.find(f => f.is_default)?.name || 'None Set'}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: '#fffbeb', color: '#d97706', width: 44, height: 44, borderRadius: '10px', flexShrink: 0 }}>
                      <StarIcon />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filters Card */}
          <Card
            sx={{
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              bgcolor: '#ffffff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Search formulas by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94a3b8' }} fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    minWidth: 260,
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      bgcolor: '#f8fafc',
                    },
                  }}
                />

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ borderRadius: '10px', bgcolor: '#f8fafc' }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active Only</MenuItem>
                    <MenuItem value="inactive">Inactive Only</MenuItem>
                  </Select>
                </FormControl>

                <Tooltip title="Refresh formulas list">
                  <IconButton
                    onClick={fetchFormulas}
                    sx={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      bgcolor: '#f8fafc',
                      '&:hover': { bgcolor: '#eff6ff', color: '#1A55E3', borderColor: '#bfdbfe' },
                    }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>

          {/* Formulas Table Card */}
          <Card
            sx={{
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              bgcolor: '#ffffff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              overflow: 'hidden',
            }}
          >
            {/* Table Header Bar */}
            <Box
              sx={{
                p: 2,
                px: 2.5,
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#f8fafc',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <TuneIcon sx={{ fontSize: 18, color: '#1A55E3' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Configured Formula Rules
                </Typography>
              </Box>
              <Chip
                label={`Showing ${filteredFormulas.length} of ${formulas.length} formulas`}
                size="small"
                sx={{
                  bgcolor: '#ffffff',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  border: '1px solid #e2e8f0',
                }}
              />
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: '#f8fafc',
                      '& .MuiTableCell-head': {
                        fontWeight: 600,
                        color: '#64748b',
                        fontSize: '0.735rem',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        py: 1.5,
                        borderBottom: '1px solid #e2e8f0',
                      },
                    }}
                  >
                    <TableCell sx={{ pl: 2.5 }}>Formula Name & Notes</TableCell>
                    <TableCell>Grace Tolerance</TableCell>
                    <TableCell>Slab Steps (Inches)</TableCell>
                    <TableCell>Divisor</TableCell>
                    <TableCell>Linked Products</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right" sx={{ pr: 2.5 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={32} sx={{ color: '#1A55E3' }} />
                        <Typography variant="body2" sx={{ mt: 1.5, color: '#64748b', fontWeight: 500 }}>
                          Loading formulas...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredFormulas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: '#f1f5f9', color: '#94a3b8', width: 48, height: 48, mb: 0.5 }}>
                            <CalculateIcon />
                          </Avatar>
                          <Typography variant="body1" sx={{ color: '#334155', fontWeight: 600 }}>
                            No formulas found
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 360, fontSize: '0.825rem' }}>
                            {searchTerm
                              ? 'No formulas match your search criteria. Try modifying your filter.'
                              : 'Click "Add New Formula" to define cut rules and grace tolerances.'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFormulas.map((f) => {
                      const steps = parseStepsString(f.width_steps);
                      const isTol = parseFloat(f.tolerance) > 0;
                      return (
                        <TableRow
                          key={f.id}
                          hover
                          sx={{
                            transition: 'background-color 0.15s',
                            '&:hover': { bgcolor: '#f8fafc' },
                            '& .MuiTableCell-body': {
                              py: 1.6,
                              fontSize: '0.85rem',
                              borderBottom: '1px solid #f1f5f9',
                            },
                          }}
                        >
                          {/* Name & Description */}
                          <TableCell sx={{ pl: 2.5, minWidth: 220 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {f.is_default && (
                                <Tooltip title="Default Formula for all unassigned products">
                                  <StarIcon sx={{ color: '#eab308', fontSize: 17 }} />
                                </Tooltip>
                              )}
                              <Typography sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                                {f.name}
                              </Typography>
                            </Box>
                            {f.description && (
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.3, fontWeight: 400 }}>
                                {f.description}
                              </Typography>
                            )}
                          </TableCell>

                          {/* Tolerance */}
                          <TableCell>
                            <Chip
                              size="small"
                              label={isTol ? `+${f.tolerance}" Grace` : 'Strict (0.00")'}
                              sx={{
                                fontWeight: 500,
                                fontSize: '0.775rem',
                                bgcolor: isTol ? '#eff6ff' : '#f1f5f9',
                                color: isTol ? '#1d4ed8' : '#475569',
                                borderRadius: '6px',
                                border: `1px solid ${isTol ? '#bfdbfe' : '#e2e8f0'}`,
                              }}
                            />
                          </TableCell>

                          {/* Slab Steps */}
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.8rem', fontWeight: 500 }}>
                              {steps.slice(0, 6).join(', ')}...
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.725rem' }}>
                              {steps.length} slabs up to {steps[steps.length - 1]}&quot;
                            </Typography>
                          </TableCell>

                          {/* Divisor */}
                          <TableCell>
                            <Typography sx={{ fontWeight: 500, color: '#0f172a', fontSize: '0.825rem' }}>
                              /{f.divisor} <span style={{ color: '#64748b', fontSize: '0.75rem' }}>(Sq Ft)</span>
                            </Typography>
                          </TableCell>

                          {/* Linked Products */}
                          <TableCell>
                            <Chip
                              size="small"
                              label={`${f._count?.products || 0} Products`}
                              sx={{
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                bgcolor: f._count?.products > 0 ? '#ecfdf5' : '#f8fafc',
                                color: f._count?.products > 0 ? '#047857' : '#64748b',
                                borderRadius: '6px',
                                border: `1px solid ${f._count?.products > 0 ? '#a7f3d0' : '#e2e8f0'}`,
                              }}
                            />
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Chip
                              size="small"
                              label={f.is_active ? 'Active' : 'Inactive'}
                              sx={{
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                bgcolor: f.is_active ? '#f0fdf4' : '#fef2f2',
                                color: f.is_active ? '#15803d' : '#b91c1c',
                                borderRadius: '6px',
                                border: `1px solid ${f.is_active ? '#bbf7d0' : '#fecaca'}`,
                              }}
                            />
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="right" sx={{ pr: 2.5 }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Edit Formula">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEdit(f)}
                                  sx={{
                                    color: '#2563eb',
                                    bgcolor: '#f1f5f9',
                                    borderRadius: '8px',
                                    '&:hover': { bgcolor: '#dbeafe' },
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Formula">
                                <IconButton
                                  size="small"
                                  onClick={() => setDeleteConfirmId(f.id)}
                                  sx={{
                                    color: '#dc2626',
                                    bgcolor: '#fef2f2',
                                    borderRadius: '8px',
                                    '&:hover': { bgcolor: '#fee2e2' },
                                  }}
                                >
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
          </Card>
        </Stack>

        {/* Create / Edit Formula Dialog */}
        <Dialog
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '18px',
              p: 0.5,
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
            },
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Dialog Header */}
            <DialogTitle
              sx={{
                p: 2.5,
                pb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    bgcolor: '#eff6ff',
                    color: '#1A55E3',
                    width: 42,
                    height: 42,
                    borderRadius: '10px',
                    border: '1px solid #dbeafe',
                  }}
                >
                  <CalculateIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.15rem' }}>
                    {editingFormula ? 'Edit Formula' : 'Add New Formula'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 400 }}>
                    {editingFormula
                      ? 'Modify slab cut tiers, grace tolerances, and calculation settings'
                      : 'Configure standard glass slab sizes and area formulas'}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setShowFormModal(false)} sx={{ color: '#94a3b8', '&:hover': { color: '#0f172a' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2.5 }}>
              {/* Quick Preset Buttons */}
              <Box sx={{ mb: 2.5, p: 1.75, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', display: 'block', mb: 1, letterSpacing: '0.02em' }}>
                  Quick Suggestions & Presets:
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={loadGhaniPreset}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      borderColor: '#bfdbfe',
                      bgcolor: '#ffffff',
                      color: '#1d4ed8',
                      '&:hover': { bgcolor: '#eff6ff', borderColor: '#93c5fd' },
                    }}
                  >
                    Ghani Glass (0.10&quot; Grace Tolerance)
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={loadStrictPreset}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      borderColor: '#e2e8f0',
                      bgcolor: '#ffffff',
                      color: '#334155',
                      '&:hover': { bgcolor: '#f1f5f9' },
                    }}
                  >
                    Heavy Glass (Strict 0.00&quot; Tolerance)
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
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
                    label={<Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>Set as Default Formula</Typography>}
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
                    label={<Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>Active Status</Typography>}
                  />
                </Grid>
              </Grid>

              {/* LIVE SIMULATOR / TESTER CARD */}
              <Box
                sx={{
                  mt: 2.5,
                  p: 2,
                  bgcolor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PlayArrowIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                  <Typography sx={{ fontWeight: 600, fontSize: '0.825rem', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Live Formula Size Simulator
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#166534', display: 'block', mb: 1.5, fontWeight: 400 }}>
                  Enter sample dimensions below to preview how this formula maps width, height, and square feet:
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
                      sx={{ bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
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
                      sx={{ bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
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
                      sx={{ bgcolor: '#ffffff', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ p: 1.25, bgcolor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 500, color: '#166534', display: 'block', fontSize: '0.725rem' }}>
                        Adjusted Size & Area:
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: '#15803d', fontSize: '0.925rem', mt: 0.25 }}>
                        {liveSimResult.calc_width}&quot; × {liveSimResult.calc_height}&quot; = {liveSimResult.quantity} sq ft
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 2, borderTop: '1px solid #f1f5f9', gap: 1 }}>
              <Button
                onClick={() => setShowFormModal(false)}
                sx={{
                  color: '#64748b',
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: '8px',
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={<SaveIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #1A55E3 0%, #2563EB 100%)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  textTransform: 'none',
                  px: 2.5,
                  py: 0.9,
                  boxShadow: '0 4px 12px rgba(26, 85, 227, 0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1646b8 0%, #1d4ed8 100%)',
                  },
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
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              p: 1,
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              color: '#dc2626',
              pt: 2,
              pb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Avatar sx={{ bgcolor: '#fee2e2', color: '#dc2626', width: 38, height: 38 }}>
              <WarningIcon fontSize="small" />
            </Avatar>
            Confirm Deletion
          </DialogTitle>
          <DialogContent sx={{ py: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
              Are you sure you want to remove this formula? If products are currently linked to it, it will be deactivated to safeguard your data.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
            <Button
              onClick={() => setDeleteConfirmId(null)}
              sx={{ color: '#64748b', textTransform: 'none', fontWeight: 500, borderRadius: '8px' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleDelete(deleteConfirmId)}
              sx={{
                borderRadius: '8px',
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: '#dc2626',
                '&:hover': { bgcolor: '#b91c1c' },
              }}
            >
              Confirm Delete
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
          <Alert
            severity={snackbar.severity}
            variant="filled"
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ borderRadius: '10px', fontWeight: 500 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}

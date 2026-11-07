'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/dashboard-layout';
import { formatDatePK } from '@/lib/date-helper';

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
  Divider,
} from '@mui/material';

// Material Icons
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Extension as ExtensionIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  FileDownload as FileDownloadIcon,
  PowerSettingsNew as PowerIcon,
} from '@mui/icons-material';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function AddonsManagementPage() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    cost_price: '',
    sale_price: '',
    status: 'ACTIVE',
  });
  const [formErrors, setFormErrors] = useState({});

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Snackbar feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Fetch add-ons from API
  const fetchAddons = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/addons');
      if (res.ok) {
        const data = await res.json();
        setAddons(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json();
        showSnackbar(err.error || 'Failed to fetch add-ons', 'error');
      }
    } catch (err) {
      console.error('Error fetching add-ons:', err);
      showSnackbar('Network error while loading add-ons', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, []);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAddon(null);
    setFormData({
      name: '',
      short_code: '',
      cost_price: '',
      sale_price: '',
      status: 'ACTIVE',
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (addon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name || '',
      short_code: addon.short_code || '',
      cost_price: addon.cost_price != null ? String(addon.cost_price) : '',
      sale_price: addon.sale_price != null ? String(addon.sale_price) : '',
      status: addon.status || 'ACTIVE',
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  // Quick Toggle Status
  const handleToggleStatus = async (addon) => {
    const newStatus = addon.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch('/api/addons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: addon.id, status: newStatus }),
      });
      if (res.ok) {
        showSnackbar(`Add-on marked as ${newStatus}`);
        fetchAddons();
      } else {
        const err = await res.json();
        showSnackbar(err.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showSnackbar('Error updating status', 'error');
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Add-on name is required';
    if (formData.cost_price && (isNaN(formData.cost_price) || parseFloat(formData.cost_price) < 0)) {
      errors.cost_price = 'Cost price must be a positive number';
    }
    if (formData.sale_price && (isNaN(formData.sale_price) || parseFloat(formData.sale_price) < 0)) {
      errors.sale_price = 'Sale price must be a positive number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Create or Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        short_code: formData.short_code.trim() || null,
        cost_price: parseFloat(formData.cost_price) || 0,
        sale_price: parseFloat(formData.sale_price) || 0,
        status: formData.status,
      };

      let res;
      if (editingAddon) {
        res = await fetch('/api/addons', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingAddon.id, ...payload }),
        });
      } else {
        res = await fetch('/api/addons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (res.ok) {
        showSnackbar(editingAddon ? 'Add-on updated successfully' : 'Add-on created successfully');
        setShowFormModal(false);
        fetchAddons();
      } else {
        showSnackbar(result.error || 'Failed to save add-on', 'error');
      }
    } catch (err) {
      console.error('Error saving add-on:', err);
      showSnackbar('Server error while saving add-on', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Add-on
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/addons?id=${deleteConfirmId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showSnackbar('Add-on deleted successfully');
        setDeleteConfirmId(null);
        fetchAddons();
      } else {
        const err = await res.json();
        showSnackbar(err.error || 'Failed to delete add-on', 'error');
      }
    } catch (err) {
      showSnackbar('Error deleting add-on', 'error');
    }
  };

  // Filtered and Sorted Add-ons
  const filteredAddons = useMemo(() => {
    let list = [...addons];

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (a) =>
          String(a.id).includes(q) ||
          (a.name || '').toLowerCase().includes(q) ||
          (a.short_code || '').toLowerCase().includes(q) ||
          (a.creator?.full_name || '').toLowerCase().includes(q) ||
          (a.updater?.full_name || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (sortBy === 'cost_price' || sortBy === 'sale_price' || sortBy === 'id') {
        valA = parseFloat(valA || 0);
        valB = parseFloat(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [addons, searchTerm, statusFilter, sortBy, sortOrder]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = addons.length;
    const active = addons.filter((a) => a.status === 'ACTIVE').length;
    const inactive = total - active;
    const avgSale = total > 0 ? addons.reduce((s, a) => s + parseFloat(a.sale_price || 0), 0) / total : 0;
    const avgCost = total > 0 ? addons.reduce((s, a) => s + parseFloat(a.cost_price || 0), 0) / total : 0;
    const avgMargin = avgSale - avgCost;
    const totalAttached = addons.reduce((s, a) => s + (a._count?.product_addons || 0), 0);
    return { total, active, inactive, avgSale, avgCost, avgMargin, totalAttached };
  }, [addons]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredAddons.length === 0) {
      showSnackbar('No add-ons to export', 'info');
      return;
    }
    const headers = ['ID', 'Name', 'Short Code', 'Cost Price', 'Sale Price', 'Profit Margin', 'Status', 'Products Attached', 'Created At', 'Created By', 'Updated At', 'Updated By'];
    const rows = filteredAddons.map((a) => [
      a.id,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      a.short_code || '',
      a.cost_price,
      a.sale_price,
      parseFloat(a.sale_price || 0) - parseFloat(a.cost_price || 0),
      a.status,
      a._count?.product_addons || 0,
      formatDatePK(a.created_at),
      a.creator?.full_name || '',
      formatDatePK(a.updated_at),
      a.updater?.full_name || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `addons_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSnackbar('Add-ons exported successfully');
  };

  // Profit calculation for the form
  const formProfit = useMemo(() => {
    const c = parseFloat(formData.cost_price || 0);
    const s = parseFloat(formData.sale_price || 0);
    const diff = s - c;
    const marginPct = s > 0 ? (diff / s) * 100 : 0;
    return { diff, marginPct };
  }, [formData.cost_price, formData.sale_price]);

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Header Banner */}
        <Box
          sx={{
            p: { xs: 2.5, md: 3 },
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #1A55E3',
            borderRadius: 0,
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 0,
                bgcolor: '#e8effd',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                shrink: 0,
              }}
            >
              <ExtensionIcon sx={{ color: '#1A55E3', fontSize: 26 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Ad On's Management
                </Typography>
                <Chip
                  label={`${addons.length} Total`}
                  size="small"
                  sx={{ borderRadius: 0, fontWeight: 700, fontSize: '0.7rem', bgcolor: '#f1f5f9', color: '#475569' }}
                />
              </Box>
              <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>
                Configure and manage custom add-ons (beveling, tempering, polishing, drilling, custom services) to associate with products, bills & orders.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, shrink: 0, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportCSV}
              startIcon={<FileDownloadIcon />}
              sx={{
                borderRadius: 0,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                borderColor: '#cbd5e1',
                color: '#475569',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
              }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={fetchAddons}
              startIcon={<RefreshIcon />}
              sx={{
                borderRadius: 0,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                borderColor: '#cbd5e1',
                color: '#475569',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
              }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              size="medium"
              onClick={handleOpenCreate}
              startIcon={<AddIcon />}
              sx={{
                borderRadius: 0,
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                bgcolor: '#1A55E3',
                px: 2.5,
                boxShadow: '0 2px 8px rgba(26, 85, 227, 0.25)',
                '&:hover': { bgcolor: '#1545b8' },
              }}
            >
              Add New Ad On
            </Button>
          </Box>
        </Box>

        {/* 4 Summary Metric Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Card elevation={0} sx={{ borderRadius: 0, border: '1px solid #e2e8f0', borderTop: '3px solid #1A55E3', bgcolor: '#ffffff', p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Total Add-ons
                </Typography>
                <Typography sx={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', mt: 0.5, lineHeight: 1 }}>
                  {kpis.total}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', mt: 0.5 }}>
                  {kpis.active} active · {kpis.inactive} inactive
                </Typography>
              </Box>
              <Box sx={{ width: 42, height: 42, borderRadius: 0, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ExtensionIcon sx={{ color: '#1A55E3', fontSize: 22 }} />
              </Box>
            </Box>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 0, border: '1px solid #e2e8f0', borderTop: '3px solid #00D284', bgcolor: '#ffffff', p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Active Availability
                </Typography>
                <Typography sx={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669', mt: 0.5, lineHeight: 1 }}>
                  {kpis.active}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', mt: 0.5 }}>
                  Ready for products & sales
                </Typography>
              </Box>
              <Box sx={{ width: 42, height: 42, borderRadius: 0, bgcolor: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleIcon sx={{ color: '#059669', fontSize: 22 }} />
              </Box>
            </Box>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 0, border: '1px solid #e2e8f0', borderTop: '3px solid #5E6EED', bgcolor: '#ffffff', p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Avg. Sale Price
                </Typography>
                <Typography sx={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', mt: 0.5, lineHeight: 1 }}>
                  PKR {fmtAmt(kpis.avgSale)}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#059669', mt: 0.5, fontWeight: 600 }}>
                  Avg. Margin: +PKR {fmtAmt(kpis.avgMargin)}
                </Typography>
              </Box>
              <Box sx={{ width: 42, height: 42, borderRadius: 0, bgcolor: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUpIcon sx={{ color: '#4338ca', fontSize: 22 }} />
              </Box>
            </Box>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 0, border: '1px solid #e2e8f0', borderTop: '3px solid #0DCAF0', bgcolor: '#ffffff', p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                  Product Links
                </Typography>
                <Typography sx={{ fontSize: '1.65rem', fontWeight: 800, color: '#0891b2', mt: 0.5, lineHeight: 1 }}>
                  {kpis.totalAttached}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', mt: 0.5 }}>
                  Associations across catalog
                </Typography>
              </Box>
              <Box sx={{ width: 42, height: 42, borderRadius: 0, bgcolor: '#ecfeff', border: '1px solid #a5f3fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <InventoryIcon sx={{ color: '#0891b2', fontSize: 22 }} />
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Filter and Search Bar */}
        <Card elevation={0} sx={{ borderRadius: 0, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
          <Box
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              borderBottom: '1px solid #f1f5f9',
              bgcolor: '#fafbfd',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, maxWidth: { sm: 460 } }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, short code, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 0, fontSize: '0.8125rem', bgcolor: '#ffffff' },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel sx={{ fontSize: '0.8rem' }}>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ borderRadius: 0, fontSize: '0.8125rem', bgcolor: '#ffffff' }}
                >
                  <MenuItem value="all" sx={{ fontSize: '0.8125rem' }}>All Status</MenuItem>
                  <MenuItem value="ACTIVE" sx={{ fontSize: '0.8125rem' }}>Active</MenuItem>
                  <MenuItem value="INACTIVE" sx={{ fontSize: '0.8125rem' }}>Inactive</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel sx={{ fontSize: '0.8rem' }}>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                  sx={{ borderRadius: 0, fontSize: '0.8125rem', bgcolor: '#ffffff' }}
                >
                  <MenuItem value="created_at" sx={{ fontSize: '0.8125rem' }}>Created Date</MenuItem>
                  <MenuItem value="name" sx={{ fontSize: '0.8125rem' }}>Name</MenuItem>
                  <MenuItem value="sale_price" sx={{ fontSize: '0.8125rem' }}>Sale Price</MenuItem>
                  <MenuItem value="cost_price" sx={{ fontSize: '0.8125rem' }}>Cost Price</MenuItem>
                  <MenuItem value="id" sx={{ fontSize: '0.8125rem' }}>ID</MenuItem>
                </Select>
              </FormControl>

              <Button
                size="small"
                variant="outlined"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                sx={{ borderRadius: 0, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderColor: '#cbd5e1', color: '#475569', minHeight: 40 }}
              >
                {sortOrder === 'asc' ? 'Asc ↑' : 'Desc ↓'}
              </Button>
            </Box>
          </Box>

          {/* Table */}
          <TableContainer sx={{ borderRadius: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, fontSize: '0.75rem', color: '#475569', borderBottom: '1px solid #e2e8f0', py: 1.5 } }}>
                  <TableCell align="center" sx={{ width: 60 }}>ID</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Name</TableCell>
                  <TableCell sx={{ width: 120 }}>Short Code</TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>Cost Price</TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>Sale Price</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>Margin</TableCell>
                  <TableCell align="center" sx={{ width: 110 }}>Status</TableCell>
                  <TableCell align="center" sx={{ width: 110 }}>Products</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Created Info</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Updated Info</TableCell>
                  <TableCell align="center" sx={{ width: 120 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={36} />
                      <Typography sx={{ mt: 1.5, fontSize: '0.85rem', color: '#64748b' }}>Loading add-ons...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredAddons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 8 }}>
                      <Box sx={{ width: 56, height: 56, bgcolor: '#f1f5f9', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                        <ExtensionIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: '#334155' }}>No add-ons found</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.5 }}>
                        {searchTerm ? 'Try adjusting your search criteria' : 'Click "Add New Ad On" to create your first add-on.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAddons.map((addon) => {
                    const cost = parseFloat(addon.cost_price || 0);
                    const sale = parseFloat(addon.sale_price || 0);
                    const margin = sale - cost;
                    const marginPct = sale > 0 ? (margin / sale) * 100 : 0;
                    const isPositive = margin >= 0;

                    return (
                      <TableRow
                        key={addon.id}
                        hover
                        sx={{
                          '& td': { fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', py: 1.25 },
                          bgcolor: addon.status === 'INACTIVE' ? '#fafafa' : '#ffffff',
                          opacity: addon.status === 'INACTIVE' ? 0.75 : 1,
                        }}
                      >
                        {/* ID */}
                        <TableCell align="center">
                          <Chip
                            label={`#${addon.id}`}
                            size="small"
                            sx={{ height: 20, borderRadius: 0, fontWeight: 800, fontSize: '0.6875rem', bgcolor: '#f1f5f9', color: '#475569' }}
                          />
                        </TableCell>

                        {/* Name */}
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>
                            {addon.name}
                          </Typography>
                        </TableCell>

                        {/* Short Code */}
                        <TableCell>
                          {addon.short_code ? (
                            <Chip
                              label={addon.short_code}
                              size="small"
                              sx={{ height: 22, borderRadius: 0, fontWeight: 700, fontSize: '0.6875rem', bgcolor: '#eff6ff', color: '#1A55E3', border: '1px solid #bfdbfe' }}
                            />
                          ) : (
                            <Typography sx={{ fontSize: '0.75rem', color: '#cbd5e1' }}>—</Typography>
                          )}
                        </TableCell>

                        {/* Cost Price */}
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                          PKR {fmtAmt(cost)}
                        </TableCell>

                        {/* Sale Price */}
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          PKR {fmtAmt(sale)}
                        </TableCell>

                        {/* Margin */}
                        <TableCell align="right">
                          <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography sx={{ fontSize: '0.775rem', fontWeight: 800, color: isPositive ? '#059669' : '#dc2626' }}>
                              {isPositive ? '+' : ''}PKR {fmtAmt(margin)}
                            </Typography>
                            <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              ({marginPct.toFixed(0)}%)
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Status */}
                        <TableCell align="center">
                          <Chip
                            size="small"
                            icon={addon.status === 'ACTIVE' ? <CheckCircleIcon sx={{ fontSize: '13px !important' }} /> : <CancelIcon sx={{ fontSize: '13px !important' }} />}
                            label={addon.status}
                            sx={{
                              height: 22,
                              borderRadius: 0,
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              bgcolor: addon.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9',
                              color: addon.status === 'ACTIVE' ? '#059669' : '#64748b',
                              border: `1px solid ${addon.status === 'ACTIVE' ? '#a7f3d0' : '#cbd5e1'}`,
                            }}
                          />
                        </TableCell>

                        {/* Attached Products Count */}
                        <TableCell align="center">
                          <Tooltip title="Products associated with this add-on" arrow>
                            <Chip
                              label={`${addon._count?.product_addons || 0} items`}
                              size="small"
                              sx={{
                                height: 20,
                                borderRadius: 0,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                bgcolor: (addon._count?.product_addons || 0) > 0 ? '#e0f2fe' : '#f8fafc',
                                color: (addon._count?.product_addons || 0) > 0 ? '#0284c7' : '#94a3b8',
                              }}
                            />
                          </Tooltip>
                        </TableCell>

                        {/* Created By & Date */}
                        <TableCell>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                            {addon.creator?.full_name || 'System / Admin'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            {formatDatePK(addon.created_at)}
                          </Typography>
                        </TableCell>

                        {/* Updated By & Date */}
                        <TableCell>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                            {addon.updater?.full_name || 'System / Admin'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            {formatDatePK(addon.updated_at)}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={addon.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleStatus(addon)}
                                sx={{
                                  borderRadius: 0,
                                  color: addon.status === 'ACTIVE' ? '#059669' : '#94a3b8',
                                  '&:hover': { bgcolor: '#f1f5f9' },
                                }}
                              >
                                <PowerIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Add-on" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEdit(addon)}
                                sx={{ borderRadius: 0, color: '#1A55E3', '&:hover': { bgcolor: '#eff6ff' } }}
                              >
                                <EditIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Add-on" arrow>
                              <IconButton
                                size="small"
                                onClick={() => setDeleteConfirmId(addon.id)}
                                sx={{ borderRadius: 0, color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}
                              >
                                <DeleteIcon sx={{ fontSize: 17 }} />
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

          {/* Table Footer */}
          <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #f1f5f9', bgcolor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
              Showing {filteredAddons.length} of {addons.length} add-on(s)
            </Typography>
          </Box>
        </Card>

        {/* Create / Edit Modal */}
        <Dialog
          open={showFormModal}
          onClose={() => !isSubmitting && setShowFormModal(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 0,
              border: '1px solid #cbd5e1',
              boxShadow: '0 20px 48px rgba(15, 23, 42, 0.16)',
            },
          }}
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle
              sx={{
                p: 2.5,
                borderBottom: '1px solid #f1f5f9',
                bgcolor: '#fafbfd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 0,
                    bgcolor: '#e8effd',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ExtensionIcon sx={{ color: '#1A55E3', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                    {editingAddon ? 'Edit Ad On' : 'Create New Ad On'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {editingAddon ? `Update properties for ID #${editingAddon.id}` : 'Add a new product or order custom add-on'}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setShowFormModal(false)} disabled={isSubmitting} sx={{ borderRadius: 0 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: '#ffffff' }}>
              {/* Name */}
              <TextField
                label="Add-on Name *"
                placeholder="e.g. Glass Beveling (1-inch), Hole Drilling 12mm, Tempering, Frosting"
                fullWidth
                size="small"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={Boolean(formErrors.name)}
                helperText={formErrors.name}
                InputProps={{ sx: { borderRadius: 0, fontSize: '0.85rem' } }}
              />

              {/* Short code & Status in row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Short Code"
                  placeholder="e.g. BEV-1, HOLE-12, TEMPER"
                  fullWidth
                  size="small"
                  value={formData.short_code}
                  onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toUpperCase() })}
                  helperText="Short acronym shown on bills & badges"
                  InputProps={{ sx: { borderRadius: 0, fontSize: '0.85rem', textTransform: 'uppercase' } }}
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>Status *</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status *"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    sx={{ borderRadius: 0, fontSize: '0.85rem' }}
                  >
                    <MenuItem value="ACTIVE">Active (Available)</MenuItem>
                    <MenuItem value="INACTIVE">Inactive (Hidden)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Pricing row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Cost Price (PKR)"
                  placeholder="0.00"
                  type="number"
                  inputProps={{ step: 'any', min: '0' }}
                  fullWidth
                  size="small"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  error={Boolean(formErrors.cost_price)}
                  helperText={formErrors.cost_price || 'Your internal expense/cost'}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">PKR</InputAdornment>,
                    sx: { borderRadius: 0, fontSize: '0.85rem' },
                  }}
                />

                <TextField
                  label="Sale Price (PKR) *"
                  placeholder="0.00"
                  type="number"
                  inputProps={{ step: 'any', min: '0' }}
                  fullWidth
                  size="small"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  error={Boolean(formErrors.sale_price)}
                  helperText={formErrors.sale_price || 'Amount charged to customer'}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">PKR</InputAdornment>,
                    sx: { borderRadius: 0, fontSize: '0.85rem' },
                  }}
                />
              </Box>

              {/* Live Margin Calculation Preview */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                    Calculated Profit Margin
                  </Typography>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: formProfit.diff >= 0 ? '#059669' : '#dc2626' }}>
                    {formProfit.diff >= 0 ? '+' : ''}PKR {fmtAmt(formProfit.diff)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>Markup on Sale</Typography>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                    {formProfit.marginPct.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, borderTop: '1px solid #f1f5f9', bgcolor: '#fafbfd', gap: 1 }}>
              <Button
                onClick={() => setShowFormModal(false)}
                disabled={isSubmitting}
                sx={{ borderRadius: 0, textTransform: 'none', color: '#64748b', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                sx={{
                  borderRadius: 0,
                  bgcolor: '#1A55E3',
                  textTransform: 'none',
                  fontWeight: 800,
                  px: 3,
                  '&:hover': { bgcolor: '#1545b8' },
                }}
              >
                {isSubmitting ? 'Saving...' : editingAddon ? 'Save Changes' : 'Create Ad On'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog
          open={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 0 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#dc2626', pb: 1 }}>
            Confirm Delete
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: '0.85rem', color: '#475569' }}>
              Are you sure you want to delete this add-on?
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1 }}>
              It will also be disassociated from any products currently linking to it.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#fafbfd', borderTop: '1px solid #f1f5f9' }}>
            <Button onClick={() => setDeleteConfirmId(null)} sx={{ borderRadius: 0, textTransform: 'none', color: '#64748b' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
              sx={{ borderRadius: 0, textTransform: 'none', fontWeight: 700 }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Global Snackbar Notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ borderRadius: 0, fontWeight: 600, fontSize: '0.8125rem' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
}


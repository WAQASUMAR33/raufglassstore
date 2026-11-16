'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  DirectionsCar as VehicleIcon,
  Chair as FurnitureIcon,
  Build as MachineryIcon,
  Computer as ElectronicsIcon,
  Handyman as ToolsIcon,
  Category as OtherIcon,
  Landmark as LandmarkIcon,
} from '@mui/icons-material';
import DashboardLayout from '../components/dashboard-layout';

const CATEGORIES = [
  { value: 'Vehicle', label: 'Vehicle', icon: VehicleIcon, color: '#2563eb' },
  { value: 'Furniture', label: 'Furniture & Fixtures', icon: FurnitureIcon, color: '#7c3aed' },
  { value: 'Machinery', label: 'Machinery & Equipment', icon: MachineryIcon, color: '#d97706' },
  { value: 'Electronics', label: 'Electronics & IT', icon: ElectronicsIcon, color: '#0891b2' },
  { value: 'Tools', label: 'Tools', icon: ToolsIcon, color: '#059669' },
  { value: 'Other', label: 'Other', icon: OtherIcon, color: '#475569' },
];

const STATUSES = [
  { value: 'ACTIVE', label: 'Active / In Use', color: 'success' },
  { value: 'IN_REPAIR', label: 'Under Maintenance', color: 'warning' },
  { value: 'SOLD', label: 'Sold', color: 'info' },
  { value: 'DISPOSED', label: 'Disposed / Written Off', color: 'default' },
];

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Form state
  const [formData, setFormData] = useState({
    asset_name: '',
    category: 'Furniture',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: '',
    current_value: '',
    description: '',
    status: 'ACTIVE',
  });

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assets');
      const data = await res.json();
      if (res.ok) {
        setAssets(data.assets || []);
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to load assets', severity: 'error' });
      }
    } catch (err) {
      console.error('Error fetching assets:', err);
      setSnackbar({ open: true, message: 'Network error loading assets', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchSearch = !search.trim() ||
        (a.asset_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || a.category === selectedCategory;
      const matchStatus = selectedStatus === 'ALL' || a.status === selectedStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [assets, search, selectedCategory, selectedStatus]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const activeAssets = assets.filter((a) => a.status === 'ACTIVE');
    const totalValue = activeAssets.reduce((sum, a) => sum + (a.current_value || 0), 0);
    const totalCost = assets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0);

    const vehicleValue = activeAssets.filter((a) => a.category === 'Vehicle').reduce((s, a) => s + (a.current_value || 0), 0);
    const vehicleCount = activeAssets.filter((a) => a.category === 'Vehicle').length;

    const furnitureValue = activeAssets.filter((a) => a.category === 'Furniture').reduce((s, a) => s + (a.current_value || 0), 0);
    const furnitureCount = activeAssets.filter((a) => a.category === 'Furniture').length;

    const machineryValue = activeAssets.filter((a) => a.category === 'Machinery' || a.category === 'Tools').reduce((s, a) => s + (a.current_value || 0), 0);
    const machineryCount = activeAssets.filter((a) => a.category === 'Machinery' || a.category === 'Tools').length;

    return {
      totalValue,
      totalCost,
      totalCount: assets.length,
      activeCount: activeAssets.length,
      vehicleValue,
      vehicleCount,
      furnitureValue,
      furnitureCount,
      machineryValue,
      machineryCount,
    };
  }, [assets]);

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setFormData({
      asset_name: '',
      category: 'Furniture',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_cost: '',
      current_value: '',
      description: '',
      status: 'ACTIVE',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      asset_name: asset.asset_name || '',
      category: asset.category || 'Other',
      purchase_date: asset.purchase_date || new Date().toISOString().split('T')[0],
      purchase_cost: asset.purchase_cost || '',
      current_value: asset.current_value || '',
      description: asset.description || '',
      status: asset.status || 'ACTIVE',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.asset_name.trim()) {
      setSnackbar({ open: true, message: 'Please enter an asset name', severity: 'warning' });
      return;
    }

    try {
      setSaving(true);
      const url = '/api/assets';
      const method = editingAsset ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        ...(editingAsset ? { asset_id: editingAsset.asset_id } : {}),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setSnackbar({
          open: true,
          message: editingAsset ? 'Asset updated successfully' : 'Asset added successfully',
          severity: 'success',
        });
        setDialogOpen(false);
        fetchAssets();
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to save asset', severity: 'error' });
      }
    } catch (err) {
      console.error('Error saving asset:', err);
      setSnackbar({ open: true, message: 'Error saving asset', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!assetToDelete) return;
    try {
      const res = await fetch(`/api/assets?id=${assetToDelete.asset_id}`, { method: 'DELETE' });
      if (res.ok) {
        setSnackbar({ open: true, message: 'Asset deleted successfully', severity: 'success' });
        setDeleteConfirmOpen(false);
        setAssetToDelete(null);
        fetchAssets();
      } else {
        const data = await res.json();
        setSnackbar({ open: true, message: data.error || 'Failed to delete asset', severity: 'error' });
      }
    } catch (err) {
      console.error('Error deleting asset:', err);
      setSnackbar({ open: true, message: 'Error deleting asset', severity: 'error' });
    }
  };

  const handleExportCSV = () => {
    if (filteredAssets.length === 0) return;
    let csv = 'ZAIN TRADERS MANDI BAHAUDDIN\n';
    csv += 'FIXED ASSETS REGISTER\n';
    csv += `Exported: ${new Date().toLocaleDateString('en-GB')}\n\n`;
    csv += 'S.No,Asset Name,Category,Purchase Date,Purchase Cost (PKR),Current Value (PKR),Status,Description\n';
    filteredAssets.forEach((a, i) => {
      csv += `${i + 1},"${a.asset_name.replace(/"/g, '""')}",${a.category},${a.purchase_date},${a.purchase_cost},${a.current_value},${a.status},"${(a.description || '').replace(/"/g, '""')}"\n`;
    });
    csv += `\nTOTAL CURRENT VALUE (ACTIVE ASSETS),,,,,${metrics.totalValue},,\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fixed-assets-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout title="Fixed Assets Management">
      <Box sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
        {/* Header Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 3,
          }}
          className="no-print"
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Fixed Assets Register
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.25 }}>
              Track business property, vehicles, showroom furniture, machinery & tools (reflected in Balance Sheet)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchAssets}
              disabled={loading}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Print List
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExportCSV}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{
                bgcolor: '#1A55E3',
                '&:hover': { bgcolor: '#1648c4' },
                textTransform: 'none',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(26, 85, 227, 0.28)',
              }}
            >
              + Add New Asset
            </Button>
          </Box>
        </Box>

        {/* Print Header */}
        <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 2, textAlign: 'center' } }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>ZAIN TRADERS MANDI BAHAUDDIN</Typography>
          <Typography variant="body2">Phalia Road , Near Aljannat Petrol pump M.B.Din. | Tel: 0302-2133218, 0347-7743218</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, textDecoration: 'underline' }}>FIXED ASSETS REPORT</Typography>
          <Typography variant="caption">As of: {new Date().toLocaleDateString('en-GB')}</Typography>
        </Box>

        {/* ───────────────── SUMMARY METRICS ───────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
          className="no-print"
        >
          {/* Card 1: Total Assets Value */}
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Asset Value
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e3a8a', mt: 0.5 }}>
              PKR {fmtAmt(metrics.totalValue)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600 }}>
              {metrics.activeCount} active assets
            </Typography>
          </Paper>

          {/* Card 2: Vehicles */}
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vehicles
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#14532d', mt: 0.5 }}>
              PKR {fmtAmt(metrics.vehicleValue)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
              {metrics.vehicleCount} vehicles registered
            </Typography>
          </Paper>

          {/* Card 3: Furniture & Fixtures */}
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Furniture & Fixtures
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#581c87', mt: 0.5 }}>
              PKR {fmtAmt(metrics.furnitureValue)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#9333ea', fontWeight: 600 }}>
              {metrics.furnitureCount} furniture items
            </Typography>
          </Paper>

          {/* Card 4: Machinery & Tools */}
          <Paper
            elevation={0}
            sx={{
              p: 2.25,
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Machinery & Tools
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#78350f', mt: 0.5 }}>
              PKR {fmtAmt(metrics.machineryValue)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 600 }}>
              {metrics.machineryCount} equipment items
            </Typography>
          </Paper>
        </Box>

        {/* ───────────────── FILTERS ───────────────── */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center',
          }}
          className="no-print"
        >
          <TextField
            size="small"
            placeholder="Search assets by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260, flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            size="small"
            label="Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">All Categories</MenuItem>
            {CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Paper>

        {/* ───────────────── ASSETS TABLE ───────────────── */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            bgcolor: '#ffffff',
          }}
        >
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={36} />
              <Typography sx={{ mt: 1.5, color: '#64748b', fontSize: '0.9rem' }}>Loading assets...</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#334155', width: '5%' }}>#</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#334155', width: '28%' }}>Asset Name</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#334155', width: '15%' }}>Category</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#334155', width: '12%' }}>Purchase Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#334155', textAlign: 'right', width: '12%' }}>Cost (PKR)</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#334155', textAlign: 'right', width: '13%' }}>Current Value</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#334155', textAlign: 'center', width: '10%' }}>Status</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: '#334155', textAlign: 'center', width: '10%' }} className="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length > 0 ? (
                    filteredAssets.map((asset, index) => {
                      const catConfig = CATEGORIES.find((c) => c.value === asset.category) || CATEGORIES[5];
                      const statusConfig = STATUSES.find((s) => s.value === asset.status) || STATUSES[0];
                      const IconComponent = catConfig.icon;

                      return (
                        <tr
                          key={asset.asset_id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                          }}
                        >
                          <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: 500 }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '8px',
                                  bgcolor: `${catConfig.color}15`,
                                  color: catConfig.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <IconComponent sx={{ fontSize: 18 }} />
                              </Box>
                              <Box>
                                <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                                  {asset.asset_name}
                                </Typography>
                                {asset.description && (
                                  <Typography sx={{ color: '#64748b', fontSize: '0.75rem', mt: 0.25 }}>
                                    {asset.description}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <Chip
                              label={catConfig.label}
                              size="small"
                              sx={{
                                bgcolor: `${catConfig.color}15`,
                                color: catConfig.color,
                                fontWeight: 700,
                                fontSize: '0.75rem',
                              }}
                            />
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.85rem' }}>
                            {asset.purchase_date}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtAmt(asset.purchase_cost)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtAmt(asset.current_value)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <Chip
                              label={statusConfig.label}
                              size="small"
                              color={statusConfig.color}
                              variant={asset.status === 'ACTIVE' ? 'filled' : 'outlined'}
                              sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                            />
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }} className="no-print">
                            <Tooltip title="Edit Asset">
                              <IconButton size="small" onClick={() => handleOpenEdit(asset)} sx={{ color: '#2563eb' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Asset">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setAssetToDelete(asset);
                                  setDeleteConfirmOpen(true);
                                }}
                                sx={{ color: '#ef4444' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        No assets found. Click "+ Add New Asset" to add business assets.
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredAssets.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                      <td colSpan={4} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b' }}>
                        Total Current Value (Active Assets):
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtAmt(filteredAssets.reduce((s, a) => s + (a.purchase_cost || 0), 0))}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#1e3a8a', fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
                        PKR {fmtAmt(filteredAssets.filter((a) => a.status === 'ACTIVE').reduce((s, a) => s + (a.current_value || 0), 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </Box>
          )}
        </Paper>

        {/* ───────────────── ADD / EDIT DIALOG ───────────────── */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSave}>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {editingAsset ? 'Edit Asset' : 'Add New Fixed Asset'}
            </DialogTitle>
            <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Asset Name"
                placeholder="e.g. Suzuki Ravi Loader, Glass Cutting Table, Showroom Display Racks"
                fullWidth
                required
                value={formData.asset_name}
                onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  select
                  label="Category"
                  fullWidth
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Purchase Date"
                  type="date"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Purchase Cost (PKR)"
                  type="number"
                  placeholder="0.00"
                  fullWidth
                  required
                  value={formData.purchase_cost}
                  onChange={(e) => {
                    const cost = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      purchase_cost: cost,
                      // Automatically set current value if empty or previously matching
                      current_value: prev.current_value === '' || prev.current_value === prev.purchase_cost ? cost : prev.current_value,
                    }));
                  }}
                />

                <TextField
                  label="Current Value (PKR)"
                  type="number"
                  placeholder="0.00"
                  fullWidth
                  required
                  helperText="Value used for Balance Sheet"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                />
              </Box>

              <TextField
                select
                label="Status"
                fullWidth
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Description / Location / Notes"
                placeholder="Optional details, location in shop, or supplier information"
                multiline
                rows={3}
                fullWidth
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={() => setDialogOpen(false)} variant="outlined">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                sx={{ bgcolor: '#1A55E3', '&:hover': { bgcolor: '#1648c4' }, fontWeight: 700 }}
              >
                {saving ? 'Saving...' : editingAsset ? 'Save Changes' : 'Add Asset'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* ───────────────── DELETE CONFIRMATION DIALOG ───────────────── */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Delete Asset?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#475569' }}>
              Are you sure you want to delete <strong>{assetToDelete?.asset_name}</strong>? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteConfirmOpen(false)} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="contained" color="error" sx={{ fontWeight: 700 }}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
}


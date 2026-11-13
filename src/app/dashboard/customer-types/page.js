'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import DashboardLayout from '../components/dashboard-layout';
import { formatDatePK } from '@/lib/date-helper';

// Lucide Icons
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Search,
  ArrowUpDown,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

// Material-UI components
import {
  Box,
  Container,
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
  Avatar,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Divider,
  Stack,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

// Material Icons
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Tag as TagIcon
} from '@mui/icons-material';

export default function AccountTypesPage() {
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    cus_type_title: ''
  });

  // Delete modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter & Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch account types on mount
  useEffect(() => {
    fetchCustomerTypes();
  }, []);

  const fetchCustomerTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer-types');
      if (response.ok) {
        const data = await response.json();
        setCustomerTypes(Array.isArray(data) ? data : []);
      } else {
        showSnackbar('Failed to fetch account types', 'error');
      }
    } catch (error) {
      console.error('Error fetching account types:', error);
      showSnackbar('Error fetching account types', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Open add dialog
  const handleOpenAddModal = () => {
    setEditingType(null);
    setTypeForm({ cus_type_title: '' });
    setShowTypeForm(true);
  };

  // Open edit dialog
  const handleOpenEditModal = (type) => {
    setEditingType(type);
    setTypeForm({ cus_type_title: type.cus_type_title || '' });
    setShowTypeForm(true);
  };

  // Save add/edit
  const handleSaveType = async (e) => {
    if (e) e.preventDefault();
    const title = (typeForm.cus_type_title || '').trim();
    if (!title) {
      showSnackbar('Account type title is required', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = !!editingType;
      const url = '/api/customer-types';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? { id: editingType.cus_type_id, cus_type_title: title }
        : { cus_type_title: title };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showSnackbar(
          isEdit ? 'Account type updated successfully!' : 'Account type added successfully!',
          'success'
        );
        setShowTypeForm(false);
        setTypeForm({ cus_type_title: '' });
        setEditingType(null);
        fetchCustomerTypes();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Failed to save account type', 'error');
      }
    } catch (error) {
      console.error('Error saving account type:', error);
      showSnackbar('Failed to save account type', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open delete confirm modal
  const handleOpenDeleteModal = (type) => {
    setTypeToDelete(type);
    setDeleteConfirmOpen(true);
  };

  // Execute delete
  const handleDeleteType = async () => {
    if (!typeToDelete) return;

    const assignedCount = typeToDelete._count?.customers || 0;
    if (assignedCount > 0) {
      showSnackbar(
        `Cannot delete "${typeToDelete.cus_type_title}" because ${assignedCount} account(s) are assigned to it.`,
        'error'
      );
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/customer-types?id=${typeToDelete.cus_type_id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSnackbar('Account type deleted successfully!', 'success');
        setDeleteConfirmOpen(false);
        setTypeToDelete(null);
        fetchCustomerTypes();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Failed to delete account type', 'error');
      }
    } catch (error) {
      console.error('Error deleting account type:', error);
      showSnackbar('Failed to delete account type', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  // Filter and sort customer types
  const filteredAndSortedTypes = useMemo(() => {
    return customerTypes
      .filter((type) => {
        const term = searchTerm.toLowerCase();
        const titleMatch = (type.cus_type_title || '').toLowerCase().includes(term);
        const idMatch = String(type.cus_type_id).includes(term);
        return titleMatch || idMatch;
      })
      .sort((a, b) => {
        let aValue, bValue;
        if (sortBy === 'created_at') {
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
        } else if (sortBy === 'title') {
          aValue = (a.cus_type_title || '').toLowerCase();
          bValue = (b.cus_type_title || '').toLowerCase();
        } else if (sortBy === 'accounts_count') {
          aValue = a._count?.customers || 0;
          bValue = b._count?.customers || 0;
        } else if (sortBy === 'id') {
          aValue = a.cus_type_id;
          bValue = b.cus_type_id;
        } else {
          aValue = a[sortBy];
          bValue = b[sortBy];
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        }
        return aValue < bValue ? 1 : -1;
      })
      .map((type, index) => ({
        ...type,
        sequentialId: index + 1
      }));
  }, [customerTypes, searchTerm, sortBy, sortOrder]);

  // Statistics
  const totalTypes = customerTypes.length;
  const totalAccountsLinked = customerTypes.reduce(
    (sum, t) => sum + (t._count?.customers || 0),
    0
  );
  const activeTypesCount = customerTypes.filter((t) => (t._count?.customers || 0) > 0).length;
  const recentAdditions = customerTypes.filter((t) => {
    if (!t.created_at) return false;
    const createdDate = new Date(t.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate > thirtyDaysAgo;
  }).length;

  if (loading) {
    return (
      <DashboardLayout>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f8fafc',
            gap: 2
          }}
        >
          <CircularProgress size={56} sx={{ color: '#1A55E3' }} />
          <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 600 }}>
            Loading Account Types...
          </Typography>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={3}>
          {/* Header Banner */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              pb: 1
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.025em',
                    fontSize: { xs: '1.65rem', md: '2rem' }
                  }}
                >
                  Account Types
                </Typography>
                <Chip
                  label="Accounts"
                  size="small"
                  sx={{
                    bgcolor: '#eff6ff',
                    color: '#1d4ed8',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    borderRadius: '8px'
                  }}
                />
              </Box>
              <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5, fontSize: '0.925rem' }}>
                Define and manage classification types for customer accounts, clients, and partners
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={handleOpenAddModal}
              sx={{
                background: 'linear-gradient(135deg, #1A55E3 0%, #2563EB 100%)',
                color: 'white',
                px: 3,
                py: 1.25,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: '0 4px 14px rgba(26, 85, 227, 0.35)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1646b8 0%, #1d4ed8 100%)',
                  boxShadow: '0 6px 20px rgba(26, 85, 227, 0.45)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Add Account Type
            </Button>
          </Box>

          {/* Stats KPI Ribbon */}
          <Box sx={{ flexShrink: 0, width: '100%' }}>
            <Card
              sx={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: 'stretch'
                }}
              >
                {[
                  {
                    title: 'Total Account Types',
                    val: totalTypes,
                    color: '#1A55E3',
                    bg: '#eff6ff',
                    icon: <Tag size={22} />
                  },
                  {
                    title: 'Accounts Assigned',
                    val: totalAccountsLinked,
                    color: '#059669',
                    bg: '#ecfdf5',
                    icon: <Users size={22} />
                  },
                  {
                    title: 'Active Types in Use',
                    val: activeTypesCount,
                    color: '#7c3aed',
                    bg: '#f5f3ff',
                    icon: <Layers size={22} />
                  },
                  {
                    title: 'Added Recently (30d)',
                    val: recentAdditions,
                    color: '#d97706',
                    bg: '#fffbeb',
                    icon: <Clock size={22} />
                  }
                ].map((stat, i) => (
                  <Fragment key={i}>
                    <Box
                      sx={{
                        flex: 1,
                        p: { xs: 2.25, md: 2.75 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        bgcolor: stat.bg,
                        transition: 'background-color 0.2s',
                        borderBottom: i < 3 ? { xs: '1px solid #e2e8f0', md: 'none' } : 'none',
                        '&:hover': {
                          bgcolor: 'white'
                        }
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: 'white',
                          color: stat.color,
                          width: 48,
                          height: 48,
                          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.06)',
                          border: `1.5px solid ${stat.color}25`
                        }}
                      >
                        {stat.icon}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="overline"
                          sx={{
                            display: 'block',
                            lineHeight: 1.2,
                            mb: 0.5,
                            color: '#64748b',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            fontSize: '0.7rem'
                          }}
                        >
                          {stat.title}
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            color: stat.color,
                            fontSize: '1.45rem'
                          }}
                        >
                          {stat.val.toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                    {i < 3 && (
                      <Divider
                        orientation="vertical"
                        flexItem
                        sx={{
                          display: { xs: 'none', md: 'block' },
                          borderColor: '#e2e8f0'
                        }}
                      />
                    )}
                  </Fragment>
                ))}
              </Box>
            </Card>
          </Box>

          {/* Search, Filter & Sort Bar */}
          <Card
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              bgcolor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#334155' }}>
                  Filter & Search Types
                </Typography>
                {(searchTerm || sortBy !== 'created_at' || sortOrder !== 'desc') && (
                  <Button
                    onClick={clearFilters}
                    size="small"
                    startIcon={<X size={14} />}
                    sx={{
                      color: '#64748b',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      '&:hover': { color: '#ef4444' }
                    }}
                  >
                    Reset Filters
                  </Button>
                )}
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '1fr 1fr',
                    md: '2fr 1fr 1fr'
                  },
                  gap: 2
                }}
              >
                {/* Search */}
                <TextField
                  fullWidth
                  size="small"
                  label="Search Account Types"
                  placeholder="Type title or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={18} color="#94a3b8" />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      bgcolor: '#f8fafc'
                    }
                  }}
                />

                {/* Sort By */}
                <FormControl fullWidth size="small">
                  <InputLabel id="sort-by-label">Sort By</InputLabel>
                  <Select
                    labelId="sort-by-label"
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => setSortBy(e.target.value)}
                    sx={{ borderRadius: '10px', bgcolor: '#f8fafc' }}
                  >
                    <MenuItem value="created_at">Date Created</MenuItem>
                    <MenuItem value="title">Type Title (A-Z)</MenuItem>
                    <MenuItem value="accounts_count">Assigned Accounts</MenuItem>
                    <MenuItem value="id">ID</MenuItem>
                  </Select>
                </FormControl>

                {/* Sort Order */}
                <FormControl fullWidth size="small">
                  <InputLabel id="sort-order-label">Order</InputLabel>
                  <Select
                    labelId="sort-order-label"
                    value={sortOrder}
                    label="Order"
                    onChange={(e) => setSortOrder(e.target.value)}
                    sx={{ borderRadius: '10px', bgcolor: '#f8fafc' }}
                  >
                    <MenuItem value="desc">Descending (Newest / High)</MenuItem>
                    <MenuItem value="asc">Ascending (Oldest / Low)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {/* Account Types Table Card */}
          <Card
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              bgcolor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              overflow: 'hidden'
            }}
          >
            {/* Table Header Bar */}
            <Box
              sx={{
                p: 2,
                px: 3,
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: '#f8fafc'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Tag size={18} color="#1A55E3" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Registered Account Types
                </Typography>
              </Box>
              <Chip
                label={`Showing ${filteredAndSortedTypes.length} of ${totalTypes} types`}
                size="small"
                sx={{
                  bgcolor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.785rem'
                }}
              />
            </Box>

            <TableContainer sx={{ maxHeight: 620 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow
                    sx={{
                      '& .MuiTableCell-head': {
                        bgcolor: '#f8fafc',
                        fontWeight: 700,
                        color: '#64748b',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        py: 1.75,
                        borderBottom: '1px solid #e2e8f0'
                      }
                    }}
                  >
                    <TableCell sx={{ pl: 3, width: 70 }}>#</TableCell>
                    <TableCell sx={{ width: 90 }}>ID</TableCell>
                    <TableCell>Account Type Title</TableCell>
                    <TableCell sx={{ width: 180 }}>Assigned Accounts</TableCell>
                    <TableCell sx={{ width: 170 }}>Created Date</TableCell>
                    <TableCell align="right" sx={{ pr: 3, width: 130 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1.5
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: '#f1f5f9',
                              color: '#94a3b8',
                              width: 60,
                              height: 60,
                              mb: 1
                            }}
                          >
                            <Tag size={30} />
                          </Avatar>
                          <Typography variant="h6" sx={{ color: '#334155', fontWeight: 700 }}>
                            No Account Types Found
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 400 }}>
                            {searchTerm
                              ? 'No account types match your search criteria. Try modifying your search term or clearing filters.'
                              : 'No account types have been created yet. Click "Add Account Type" to define your first classification.'}
                          </Typography>
                          {!searchTerm && (
                            <Button
                              variant="outlined"
                              startIcon={<Plus size={16} />}
                              onClick={handleOpenAddModal}
                              sx={{
                                mt: 1,
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderColor: '#1A55E3',
                                color: '#1A55E3',
                                '&:hover': {
                                  bgcolor: '#eff6ff',
                                  borderColor: '#1A55E3'
                                }
                              }}
                            >
                              Add First Account Type
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedTypes.map((type, idx) => {
                      const accountsCount = type._count?.customers || 0;
                      return (
                        <TableRow
                          key={type.cus_type_id}
                          hover
                          sx={{
                            transition: 'background-color 0.15s',
                            '&:hover': { bgcolor: '#f8fafc' },
                            '& .MuiTableCell-body': {
                              py: 1.6,
                              fontSize: '0.875rem',
                              borderBottom: '1px solid #f1f5f9'
                            }
                          }}
                        >
                          {/* Sequential Number */}
                          <TableCell sx={{ pl: 3, fontWeight: 600, color: '#94a3b8' }}>
                            {type.sequentialId}
                          </TableCell>

                          {/* ID badge */}
                          <TableCell>
                            <Chip
                              label={`#${type.cus_type_id}`}
                              size="small"
                              sx={{
                                bgcolor: '#f1f5f9',
                                color: '#475569',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                borderRadius: '6px'
                              }}
                            />
                          </TableCell>

                          {/* Title */}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                sx={{
                                  width: 34,
                                  height: 34,
                                  bgcolor: '#eff6ff',
                                  color: '#1A55E3',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  border: '1px solid #dbeafe'
                                }}
                              >
                                {(type.cus_type_title || 'A').charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    fontSize: '0.925rem'
                                  }}
                                >
                                  {type.cus_type_title}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#94a3b8', fontSize: '0.725rem' }}
                                >
                                  Account Classification
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Assigned Accounts */}
                          <TableCell>
                            <Tooltip
                              title={
                                accountsCount > 0
                                  ? `${accountsCount} account(s) currently linked to this type`
                                  : 'No accounts currently using this type'
                              }
                            >
                              <Chip
                                icon={<Users size={14} />}
                                label={
                                  accountsCount > 0
                                    ? `${accountsCount} Account${accountsCount > 1 ? 's' : ''}`
                                    : '0 Accounts'
                                }
                                size="small"
                                sx={{
                                  bgcolor: accountsCount > 0 ? '#ecfdf5' : '#f1f5f9',
                                  color: accountsCount > 0 ? '#047857' : '#64748b',
                                  fontWeight: 700,
                                  fontSize: '0.785rem',
                                  borderRadius: '8px',
                                  border: `1px solid ${accountsCount > 0 ? '#a7f3d0' : '#e2e8f0'}`,
                                  '& .MuiChip-icon': {
                                    color: accountsCount > 0 ? '#047857' : '#94a3b8'
                                  }
                                }}
                              />
                            </Tooltip>
                          </TableCell>

                          {/* Created Date */}
                          <TableCell sx={{ color: '#64748b', fontSize: '0.825rem' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Calendar size={14} color="#94a3b8" />
                              <Typography variant="body2" sx={{ fontSize: '0.825rem', color: '#475569' }}>
                                {type.created_at ? formatDatePK(type.created_at) : '—'}
                              </Typography>
                            </Box>
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="right" sx={{ pr: 3 }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Edit Account Type">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEditModal(type)}
                                  sx={{
                                    bgcolor: '#f1f5f9',
                                    color: '#2563EB',
                                    borderRadius: '8px',
                                    p: 0.85,
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                      bgcolor: '#dbeafe',
                                      transform: 'scale(1.05)'
                                    }
                                  }}
                                >
                                  <Edit size={16} />
                                </IconButton>
                              </Tooltip>

                              <Tooltip
                                title={
                                  accountsCount > 0
                                    ? `Cannot delete (${accountsCount} accounts linked)`
                                    : 'Delete Account Type'
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDeleteModal(type)}
                                    disabled={accountsCount > 0}
                                    sx={{
                                      bgcolor: accountsCount > 0 ? '#f8fafc' : '#fef2f2',
                                      color: accountsCount > 0 ? '#cbd5e1' : '#dc2626',
                                      borderRadius: '8px',
                                      p: 0.85,
                                      transition: 'all 0.15s',
                                      '&:hover': {
                                        bgcolor: '#fee2e2',
                                        transform: 'scale(1.05)'
                                      }
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </span>
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

        {/* Add / Edit Account Type Dialog */}
        <Dialog
          open={showTypeForm}
          onClose={() => !isSubmitting && setShowTypeForm(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
              p: 0.5,
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
            }
          }}
        >
          <form onSubmit={handleSaveType}>
            {/* Dialog Header */}
            <Box
              sx={{
                p: 3,
                pb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    bgcolor: '#eff6ff',
                    color: '#1A55E3',
                    width: 44,
                    height: 44,
                    border: '1px solid #dbeafe'
                  }}
                >
                  <Tag size={22} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {editingType ? 'Edit Account Type' : 'Add New Account Type'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.825rem' }}>
                    {editingType
                      ? 'Update the title for this account classification'
                      : 'Define a new account type to categorize customer ledgers'}
                  </Typography>
                </Box>
              </Box>

              <IconButton
                size="small"
                onClick={() => setShowTypeForm(false)}
                disabled={isSubmitting}
                sx={{ color: '#94a3b8', '&:hover': { color: '#0f172a' } }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Dialog Content */}
            <DialogContent sx={{ p: 3, pt: 2.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  autoFocus
                  fullWidth
                  label="Account Type Title *"
                  placeholder="e.g. Retailer, Wholesaler, Contractor, Corporate"
                  value={typeForm.cus_type_title}
                  onChange={(e) => setTypeForm({ cus_type_title: e.target.value })}
                  required
                  helperText="Enter a descriptive title for this account type"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Tag size={18} color="#94a3b8" />
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      bgcolor: '#f8fafc'
                    }
                  }}
                />

                {/* Example Quick Presets */}
                {!editingType && (
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1 }}
                    >
                      Quick Suggestions (Click to apply):
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {['Retail Customer', 'Wholesale Dealer', 'Contractor / Builder', 'Corporate Account', 'Walk-in Customer'].map((preset) => (
                        <Chip
                          key={preset}
                          label={preset}
                          size="small"
                          onClick={() => setTypeForm({ cus_type_title: preset })}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: '#f1f5f9',
                            color: '#334155',
                            fontWeight: 600,
                            borderRadius: '8px',
                            '&:hover': {
                              bgcolor: '#eff6ff',
                              color: '#1A55E3'
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </DialogContent>

            {/* Dialog Actions */}
            <DialogActions
              sx={{
                p: 3,
                pt: 1.5,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1.5
              }}
            >
              <Button
                onClick={() => setShowTypeForm(false)}
                disabled={isSubmitting}
                sx={{
                  color: '#64748b',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2.5,
                  borderRadius: '10px'
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                sx={{
                  background: 'linear-gradient(135deg, #1A55E3 0%, #2563EB 100%)',
                  borderRadius: '10px',
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(26, 85, 227, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1646b8 0%, #1d4ed8 100%)'
                  }
                }}
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingType
                  ? 'Update Account Type'
                  : 'Save Account Type'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => !isDeleting && setDeleteConfirmOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
              p: 1,
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)'
            }
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 800,
              color: '#dc2626',
              pt: 2.5,
              pb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}
          >
            <Avatar
              sx={{
                bgcolor: '#fee2e2',
                color: '#dc2626',
                width: 40,
                height: 40
              }}
            >
              <AlertCircle size={22} />
            </Avatar>
            Delete Account Type
          </DialogTitle>
          <DialogContent sx={{ py: 2 }}>
            <Typography variant="body1" sx={{ color: '#1e293b', fontWeight: 700, mb: 1 }}>
              Are you sure you want to delete &quot;{typeToDelete?.cus_type_title}&quot;?
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.5 }}>
              This action cannot be undone. Account types can only be deleted if they are not currently assigned to any customer accounts.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
            <Button
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
              sx={{
                color: '#64748b',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '10px'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteType}
              variant="contained"
              color="error"
              disabled={isDeleting}
              startIcon={
                isDeleting ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />
              }
              sx={{
                borderRadius: '10px',
                px: 2.5,
                py: 0.9,
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: '#dc2626',
                '&:hover': { bgcolor: '#b91c1c' }
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Toast Snackbar Notification */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            variant="filled"
            sx={{
              width: '100%',
              borderRadius: '12px',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}

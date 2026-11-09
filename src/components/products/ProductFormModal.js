'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Inventory as ProductIcon,
  Add as AddIcon,
  Save as SaveIcon,
  AttachMoney as MoneyIcon,
  Warehouse as StoreIcon,
  Category as CategoryIcon,
  Extension as ExtensionIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import { AddonSelector } from '@/components/addons';

const EMPTY_FORM = {
  pro_title: '',
  pro_description: '',
  pro_cost_price: '',
  pro_sale_price: '',
  pro_baser_price: '',
  pro_crate: '',
  pro_stock_qnty: '',
  low_stock_quantity: '',
  pro_unit: '',
  pro_packing: '',
  cat_id: '',
  sub_cat_id: '',
  store_id: '',
  addon_ids: []
};

const COMMON_UNITS = ['pieces', 'sq ft', 'sheets', 'meters', 'boxes', 'kg', 'sets'];

export default function ProductFormModal({
  open,
  onClose,
  product = null,
  onSuccess,
  categories: externalCategories = null,
  subcategories: externalSubcategories = null,
  stores: externalStores = null,
  initialData = null
}) {
  const isEditing = Boolean(product && product.pro_id);

  // Form State
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // Dropdown options
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Autocomplete search inputs
  const [categoryInput, setCategoryInput] = useState('');
  const [subcategoryInput, setSubcategoryInput] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);
  const [categoryHighlighted, setCategoryHighlighted] = useState(null);
  const [subcategoryHighlighted, setSubcategoryHighlighted] = useState(null);

  // Quick Inline Category/Subcategory Modals
  const [quickCatOpen, setQuickCatOpen] = useState(false);
  const [quickSubCatOpen, setQuickSubCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Toast Snackbar
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Load Metadata (Categories, Subcategories, Stores)
  const fetchMetadata = useCallback(async () => {
    try {
      setLoadingMeta(true);
      const [catsRes, subCatsRes, storesRes] = await Promise.all([
        !externalCategories ? fetch('/api/categories') : null,
        !externalSubcategories ? fetch('/api/subcategories') : null,
        !externalStores ? fetch('/api/stores') : null
      ]);

      if (catsRes && catsRes.ok) {
        const data = await catsRes.json();
        setCategories(Array.isArray(data) ? data : []);
      }
      if (subCatsRes && subCatsRes.ok) {
        const data = await subCatsRes.json();
        setSubcategories(Array.isArray(data) ? data : []);
      }
      if (storesRes && storesRes.ok) {
        const data = await storesRes.json();
        if (data?.success && Array.isArray(data.data)) {
          setStores(data.data);
        } else if (Array.isArray(data)) {
          setStores(data);
        }
      }
    } catch (err) {
      console.error('Failed to load metadata in ProductFormModal:', err);
    } finally {
      setLoadingMeta(false);
    }
  }, [externalCategories, externalSubcategories, externalStores]);

  useEffect(() => {
    if (externalCategories) setCategories(externalCategories);
    if (externalSubcategories) setSubcategories(externalSubcategories);
    if (externalStores) setStores(externalStores);

    if (open && (!externalCategories || !externalSubcategories || !externalStores)) {
      fetchMetadata();
    }
  }, [open, externalCategories, externalSubcategories, externalStores, fetchMetadata]);

  // Sync Form with Product or initialData when modal opens
  useEffect(() => {
    if (!open) {
      setErrorBanner('');
      return;
    }

    if (product) {
      const existingAddonIds = Array.isArray(product.addons)
        ? product.addons.map(a => a.addon_id || a.addon?.id || a.id).filter(Boolean)
        : [];

      setFormData({
        pro_title: product.pro_title || '',
        pro_description: product.pro_description || '',
        pro_cost_price: product.pro_cost_price ?? '',
        pro_sale_price: product.pro_sale_price ?? '',
        pro_baser_price: product.pro_baser_price ?? '',
        pro_crate: product.pro_crate ?? '',
        pro_stock_qnty: product.pro_stock_qnty ?? '',
        low_stock_quantity: product.low_stock_quantity ?? '',
        pro_unit: product.pro_unit || '',
        pro_packing: product.pro_packing || '',
        cat_id: product.cat_id || '',
        sub_cat_id: product.sub_cat_id || '',
        store_id: product.store_stocks?.[0]?.store_id || product.store_id || '',
        addon_ids: existingAddonIds
      });

      const matchedCat = categories.find(c => c.cat_id === product.cat_id);
      const matchedSub = subcategories.find(s => s.sub_cat_id === product.sub_cat_id);
      setCategoryInput(matchedCat ? matchedCat.cat_name : '');
      setSubcategoryInput(matchedSub ? matchedSub.sub_cat_name : '');
    } else {
      setFormData({
        ...EMPTY_FORM,
        ...(initialData || {})
      });
      setCategoryInput('');
      setSubcategoryInput('');
    }
    setErrorBanner('');
  }, [open, product, initialData, categories, subcategories]);

  // Filter Subcategories based on selected Category
  const availableSubcategories = formData.cat_id
    ? subcategories.filter(s => s.cat_id === formData.cat_id)
    : subcategories;

  // Form Field Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // When Purchase Cost changes, auto-fill Cost Price if empty or matched
      if (name === 'pro_crate' && (!prev.pro_cost_price || prev.pro_cost_price === prev.pro_crate)) {
        next.pro_cost_price = value;
      }
      return next;
    });
    if (errorBanner) setErrorBanner('');
  };

  // Keyboard navigation for Category
  const handleCategoryKeyDown = (e) => {
    if (e.key === 'Tab' && categoryOpen) {
      e.preventDefault();
      const chosen = categoryHighlighted || categories.find(c =>
        c.cat_name?.toLowerCase().includes(categoryInput.toLowerCase())
      ) || categories[0];

      if (chosen) {
        setFormData(prev => ({
          ...prev,
          cat_id: chosen.cat_id,
          sub_cat_id: ''
        }));
        setCategoryInput(chosen.cat_name);
      }
      setCategoryOpen(false);

      setTimeout(() => {
        const subInput = document.querySelector('[data-field="modalSubcategory"] input');
        if (subInput) {
          subInput.focus();
          setSubcategoryOpen(true);
        }
      }, 50);
    }
  };

  // Keyboard navigation for Subcategory
  const handleSubcategoryKeyDown = (e) => {
    if (e.key === 'Tab' && subcategoryOpen) {
      e.preventDefault();
      const chosen = subcategoryHighlighted || availableSubcategories.find(s =>
        s.sub_cat_name?.toLowerCase().includes(subcategoryInput.toLowerCase())
      ) || availableSubcategories[0];

      if (chosen) {
        setFormData(prev => ({
          ...prev,
          sub_cat_id: chosen.sub_cat_id
        }));
        setSubcategoryInput(chosen.sub_cat_name);
      }
      setSubcategoryOpen(false);

      setTimeout(() => {
        const costInput = document.querySelector('input[name="pro_crate"]');
        if (costInput) costInput.focus();
      }, 50);
    }
  };

  // Live profit calculation
  const saleVal = parseFloat(formData.pro_sale_price) || 0;
  const costVal = parseFloat(formData.pro_cost_price || formData.pro_crate) || 0;
  const profitMarginVal = saleVal - costVal;
  const profitMarginPct = costVal > 0 ? ((profitMarginVal / costVal) * 100).toFixed(1) : '0.0';

  // Quick Category Submit
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setQuickSubmitting(true);
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cat_name: newCatName.trim() })
      });
      if (res.ok) {
        const created = await res.json();
        setCategories(prev => [...prev, created]);
        setFormData(prev => ({ ...prev, cat_id: created.cat_id, sub_cat_id: '' }));
        setCategoryInput(created.cat_name);
        setNewCatName('');
        setQuickCatOpen(false);
        setToast({ open: true, message: `Category "${created.cat_name}" created!`, severity: 'success' });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create category');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating category');
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Quick Subcategory Submit
  const handleCreateSubcategory = async (e) => {
    e.preventDefault();
    if (!newSubCatName.trim() || !formData.cat_id) return;
    try {
      setQuickSubmitting(true);
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sub_cat_name: newSubCatName.trim(),
          cat_id: formData.cat_id
        })
      });
      if (res.ok) {
        const created = await res.json();
        setSubcategories(prev => [...prev, created]);
        setFormData(prev => ({ ...prev, sub_cat_id: created.sub_cat_id }));
        setSubcategoryInput(created.sub_cat_name);
        setNewSubCatName('');
        setQuickSubCatOpen(false);
        setToast({ open: true, message: `Subcategory "${created.sub_cat_name}" created!`, severity: 'success' });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create subcategory');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating subcategory');
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Save Product Submit
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Validation
    if (!formData.pro_title.trim()) {
      setErrorBanner('Product Title is required.');
      return;
    }
    if (!formData.cat_id) {
      setErrorBanner('Please select a Category for this product.');
      return;
    }
    if (parseFloat(formData.pro_stock_qnty) > 0 && !formData.store_id) {
      setErrorBanner('Please select a Store when entering an initial Stock Quantity.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorBanner('');

      const url = '/api/products';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = isEditing
        ? { id: product.pro_id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to ${isEditing ? 'update' : 'create'} product`);
      }

      const savedProduct = await res.json();

      if (onSuccess) {
        onSuccess(savedProduct);
      }

      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      setErrorBanner(err.message || 'An error occurred while saving the product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={isSubmitting ? undefined : onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: '1px solid #0f172a',
            boxShadow: '0 25px 60px rgba(15, 23, 42, 0.35)',
            bgcolor: '#ffffff',
            overflow: 'hidden'
          }
        }}
      >
        {/* EXECUTIVE HEADER */}
        <DialogTitle
          sx={{
            p: 2.5,
            bgcolor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #1A55E3'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                bgcolor: 'rgba(26, 85, 227, 0.2)',
                border: '1px solid #1A55E3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
                borderRadius: 0
              }}
            >
              <ProductIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#ffffff', letterSpacing: '-0.01em' }}>
                  {isEditing ? 'Edit Product' : 'Add New Product'}
                </Typography>
                <Chip
                  label={isEditing ? `ID: #${product.pro_id}` : 'NEW ITEM'}
                  size="small"
                  sx={{
                    borderRadius: 0,
                    bgcolor: isEditing ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: isEditing ? '#fef08a' : '#86efac',
                    border: isEditing ? '1px solid #eab308' : '1px solid #22c55e',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    height: 22
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', mt: 0.25 }}>
                {isEditing
                  ? 'Update product pricing, classification, inventory, and associated add-ons'
                  : 'Register a new glass, aluminum, or hardware item into your inventory'}
              </Typography>
            </Box>
          </Box>

          <IconButton
            onClick={onClose}
            disabled={isSubmitting}
            sx={{
              color: '#94a3b8',
              borderRadius: 0,
              p: 1,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                borderColor: '#ef4444'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        {/* DIALOG BODY */}
        <DialogContent sx={{ p: 3, bgcolor: '#f8fafc', maxHeight: '76vh', overflowY: 'auto' }}>
          {errorBanner && (
            <Alert
              severity="error"
              sx={{ borderRadius: 0, mb: 3, border: '1px solid #ef4444', fontWeight: 600 }}
              onClose={() => setErrorBanner('')}
            >
              {errorBanner}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>

            {/* SECTION 1: BASIC INFORMATION */}
            <Box
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 0,
                p: 2.5,
                mb: 3
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Box sx={{ width: 4, height: 18, bgcolor: '#1A55E3' }} />
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  1. Basic Information
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Product Title"
                    name="pro_title"
                    value={formData.pro_title}
                    onChange={handleChange}
                    placeholder="e.g., 12mm Clear Tempered Glass, Mirror Silver 5mm, Aluminum Profile 3-Track"
                    autoFocus
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 0,
                        bgcolor: '#ffffff',
                        fontSize: '0.95rem'
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description & Specifications"
                    name="pro_description"
                    value={formData.pro_description}
                    onChange={handleChange}
                    placeholder="Enter technical specs, sheet dimensions (e.g., 96 x 144 inches), grade, brand, or handling notes..."
                    multiline
                    rows={2}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 0,
                        bgcolor: '#ffffff',
                        fontSize: '0.9rem'
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* SECTION 2: CATEGORY & CLASSIFICATION */}
            <Box
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 0,
                p: 2.5,
                mb: 3
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 4, height: 18, bgcolor: '#9333ea' }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    2. Category & Classification
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Tip: Press <b>Tab</b> to select and jump to Subcategory
                </Typography>
              </Box>

              <Grid container spacing={2.5}>
                {/* Category Autocomplete */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Autocomplete
                      fullWidth
                      openOnFocus
                      autoHighlight
                      selectOnFocus
                      inputValue={categoryInput}
                      onInputChange={(_, v) => setCategoryInput(v)}
                      options={categories}
                      getOptionLabel={(opt) => opt.cat_name || ''}
                      value={categories.find(c => c.cat_id === formData.cat_id) || null}
                      onChange={(_, newVal) => {
                        setFormData(prev => ({
                          ...prev,
                          cat_id: newVal ? newVal.cat_id : '',
                          sub_cat_id: ''
                        }));
                        setCategoryInput(newVal ? newVal.cat_name : '');
                      }}
                      onHighlightChange={(_, option) => setCategoryHighlighted(option)}
                      open={categoryOpen}
                      onOpen={() => setCategoryOpen(true)}
                      onClose={() => setCategoryOpen(false)}
                      onKeyDown={handleCategoryKeyDown}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          required
                          label="Category"
                          placeholder="Select category..."
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 0,
                              bgcolor: '#ffffff'
                            }
                          }}
                        />
                      )}
                    />
                    <Tooltip title="Create new category on the fly">
                      <Button
                        variant="outlined"
                        onClick={() => setQuickCatOpen(true)}
                        sx={{
                          borderRadius: 0,
                          minWidth: 44,
                          px: 1,
                          border: '1px solid #cbd5e1',
                          color: '#1A55E3',
                          '&:hover': { bgcolor: 'rgba(26, 85, 227, 0.08)', borderColor: '#1A55E3' }
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </Button>
                    </Tooltip>
                  </Box>
                </Grid>

                {/* Subcategory Autocomplete */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Autocomplete
                      fullWidth
                      openOnFocus
                      autoHighlight
                      selectOnFocus
                      disabled={!formData.cat_id}
                      inputValue={subcategoryInput}
                      onInputChange={(_, v) => setSubcategoryInput(v)}
                      options={availableSubcategories}
                      getOptionLabel={(opt) => opt.sub_cat_name || ''}
                      value={availableSubcategories.find(s => s.sub_cat_id === formData.sub_cat_id) || null}
                      onChange={(_, newVal) => {
                        setFormData(prev => ({
                          ...prev,
                          sub_cat_id: newVal ? newVal.sub_cat_id : ''
                        }));
                        setSubcategoryInput(newVal ? newVal.sub_cat_name : '');
                      }}
                      onHighlightChange={(_, option) => setSubcategoryHighlighted(option)}
                      open={subcategoryOpen}
                      onOpen={() => setSubcategoryOpen(true)}
                      onClose={() => setSubcategoryOpen(false)}
                      onKeyDown={handleSubcategoryKeyDown}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Subcategory"
                          data-field="modalSubcategory"
                          placeholder={formData.cat_id ? 'Select subcategory...' : 'Select category first'}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 0,
                              bgcolor: '#ffffff'
                            }
                          }}
                        />
                      )}
                    />
                    <Tooltip title="Create new subcategory for this category">
                      <span>
                        <Button
                          variant="outlined"
                          disabled={!formData.cat_id}
                          onClick={() => setQuickSubCatOpen(true)}
                          sx={{
                            borderRadius: 0,
                            minWidth: 44,
                            height: '100%',
                            px: 1,
                            border: '1px solid #cbd5e1',
                            color: '#9333ea',
                            '&:hover': { bgcolor: 'rgba(147, 51, 234, 0.08)', borderColor: '#9333ea' }
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* SECTION 3: PRICING & VALUATION */}
            <Box
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 0,
                p: 2.5,
                mb: 3
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 4, height: 18, bgcolor: '#16a34a' }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    3. Pricing & Valuation
                  </Typography>
                </Box>

                {/* Real-Time Profit Margin Preview */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    EST. PROFIT:
                  </Typography>
                  <Chip
                    label={`PKR ${profitMarginVal >= 0 ? '+' : ''}${profitMarginVal.toFixed(2)} (${profitMarginPct}%)`}
                    size="small"
                    sx={{
                      borderRadius: 0,
                      fontWeight: 700,
                      bgcolor: profitMarginVal >= 0 ? '#ecfdf5' : '#fef2f2',
                      color: profitMarginVal >= 0 ? '#15803d' : '#b91c1c',
                      border: `1px solid ${profitMarginVal >= 0 ? '#86efac' : '#fca5a5'}`
                    }}
                  />
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Purchase Cost (CRate)"
                    name="pro_crate"
                    type="number"
                    inputProps={{ step: '0.01' }}
                    value={formData.pro_crate}
                    onChange={handleChange}
                    placeholder="0.00"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start" sx={{ fontWeight: 700, color: '#64748b' }}>Rs</InputAdornment>
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#ffffff' } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Sale Price"
                    name="pro_sale_price"
                    type="number"
                    inputProps={{ step: '0.01' }}
                    value={formData.pro_sale_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start" sx={{ fontWeight: 700, color: '#16a34a' }}>Rs</InputAdornment>
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 0,
                        bgcolor: '#ffffff',
                        fontWeight: 600
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Base Price"
                    name="pro_baser_price"
                    type="number"
                    inputProps={{ step: '0.01' }}
                    value={formData.pro_baser_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start" sx={{ fontWeight: 700, color: '#64748b' }}>Rs</InputAdornment>
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#ffffff' } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Cost Price"
                    name="pro_cost_price"
                    type="number"
                    inputProps={{ step: '0.01' }}
                    value={formData.pro_cost_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start" sx={{ fontWeight: 700, color: '#64748b' }}>Rs</InputAdornment>
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#ffffff' } }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* SECTION 4: INVENTORY & STOCK (FIXED SQUEEZED STORE DROPDOWN) */}
            <Box
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 0,
                p: 2.5,
                mb: 3
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Box sx={{ width: 4, height: 18, bgcolor: '#d97706' }} />
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  4. Inventory & Stock Details
                </Typography>
              </Box>

              <Grid container spacing={2.5}>
                {/* Store Selection - Given ample width (half row on sm, 6/12) */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required={parseFloat(formData.pro_stock_qnty) > 0}>
                    <InputLabel id="product-modal-store-label" shrink sx={{ fontWeight: 600 }}>
                      Primary Storage / Store
                    </InputLabel>
                    <Select
                      labelId="product-modal-store-label"
                      name="store_id"
                      value={formData.store_id || ''}
                      label="Primary Storage / Store"
                      onChange={handleChange}
                      displayEmpty
                      sx={{
                        borderRadius: 0,
                        bgcolor: '#ffffff',
                        fontSize: '0.95rem'
                      }}
                    >
                      <MenuItem value="">
                        <em style={{ color: '#94a3b8' }}>Select store location...</em>
                      </MenuItem>
                      {stores.map((s) => (
                        <MenuItem key={s.storeid} value={s.storeid}>
                          {s.store_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Stock Quantity */}
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Stock Quantity"
                    name="pro_stock_qnty"
                    type="number"
                    value={formData.pro_stock_qnty}
                    onChange={handleChange}
                    placeholder="0"
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#ffffff' } }}
                  />
                </Grid>

                {/* Low Stock Alert Qty */}
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Low Stock Alert"
                    name="low_stock_quantity"
                    type="number"
                    value={formData.low_stock_quantity}
                    onChange={handleChange}
                    placeholder="10"
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#ffffff' } }}
                  />
                </Grid>

                {/* Unit Field with Quick Preset Chips */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Unit of Measurement"
                    name="pro_unit"
                    value={formData.pro_unit}
                    onChange={handleChange}
                    placeholder="e.g., pieces, sq ft, sheets, boxes"
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#ffffff' } }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                    {COMMON_UNITS.map(unit => (
                      <Chip
                        key={unit}
                        label={unit}
                        size="small"
                        clickable
                        onClick={() => setFormData(prev => ({ ...prev, pro_unit: unit }))}
                        sx={{
                          borderRadius: 0,
                          fontSize: '0.72rem',
                          height: 22,
                          bgcolor: formData.pro_unit === unit ? '#1A55E3' : '#f1f5f9',
                          color: formData.pro_unit === unit ? '#ffffff' : '#475569',
                          border: '1px solid #e2e8f0',
                          '&:hover': { bgcolor: '#e2e8f0' }
                        }}
                      />
                    ))}
                  </Box>
                </Grid>

                {/* Packing Information */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Packing Information"
                    name="pro_packing"
                    value={formData.pro_packing}
                    onChange={handleChange}
                    placeholder="e.g., 10 sheets per wooden crate, bubble wrapped"
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: '#ffffff' } }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* SECTION 5: ASSOCIATED AD ON'S */}
            <Box
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 0,
                p: 2.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Box sx={{ width: 4, height: 18, bgcolor: '#1A55E3' }} />
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  5. Associated Ad On&apos;s
                </Typography>
              </Box>

              <AddonSelector
                selectedAddonIds={formData.addon_ids || []}
                onChange={(ids) => setFormData(prev => ({ ...prev, addon_ids: ids }))}
                label="Select Ad On's for this Product"
                placeholder="Search and attach add-ons (beveling, tempering, polishing, frost)..."
                helperText="Attached add-on services will be linked to this product and easily selectable during Sales, Quotations, and Order billing."
              />
            </Box>

          </Box>
        </DialogContent>

        {/* DIALOG ACTIONS */}
        <DialogActions
          sx={{
            p: 2.5,
            bgcolor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              * Required fields: Product Title & Category
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={onClose}
              disabled={isSubmitting}
              variant="outlined"
              sx={{
                borderRadius: 0,
                px: 3,
                py: 1,
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              variant="contained"
              startIcon={isSubmitting ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : <SaveIcon />}
              sx={{
                borderRadius: 0,
                px: 3.5,
                py: 1,
                bgcolor: '#1A55E3',
                color: '#ffffff',
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(26, 85, 227, 0.35)',
                '&:hover': { bgcolor: '#1544b8' },
                '&:disabled': { bgcolor: '#93c5fd', color: '#ffffff' }
              }}
            >
              {isSubmitting ? 'Saving Product...' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* QUICK ADD CATEGORY MODAL */}
      <Dialog
        open={quickCatOpen}
        onClose={() => setQuickCatOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: '1px solid #0f172a',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: '#0f172a', color: '#ffffff', py: 2, px: 2.5, borderBottom: '2px solid #1A55E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>Create New Category</Typography>
          <IconButton size="small" onClick={() => setQuickCatOpen(false)} sx={{ color: '#94a3b8', borderRadius: 0 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, bgcolor: '#ffffff' }}>
          <TextField
            autoFocus
            fullWidth
            label="Category Name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Architectural Glass, Mirrors"
            sx={{ mt: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setQuickCatOpen(false)} sx={{ borderRadius: 0, color: '#64748b', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateCategory}
            disabled={quickSubmitting || !newCatName.trim()}
            variant="contained"
            sx={{ borderRadius: 0, bgcolor: '#1A55E3', textTransform: 'none', fontWeight: 700 }}
          >
            {quickSubmitting ? 'Adding...' : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QUICK ADD SUBCATEGORY MODAL */}
      <Dialog
        open={quickSubCatOpen}
        onClose={() => setQuickSubCatOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: '1px solid #0f172a',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: '#0f172a', color: '#ffffff', py: 2, px: 2.5, borderBottom: '2px solid #9333ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>Create New Subcategory</Typography>
          <IconButton size="small" onClick={() => setQuickSubCatOpen(false)} sx={{ color: '#94a3b8', borderRadius: 0 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, bgcolor: '#ffffff' }}>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            Adding to category: <b>{categories.find(c => c.cat_id === formData.cat_id)?.cat_name || 'Selected'}</b>
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Subcategory Name"
            value={newSubCatName}
            onChange={(e) => setNewSubCatName(e.target.value)}
            placeholder="e.g. 12mm Clear, Beveled Edge"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setQuickSubCatOpen(false)} sx={{ borderRadius: 0, color: '#64748b', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubcategory}
            disabled={quickSubmitting || !newSubCatName.trim()}
            variant="contained"
            sx={{ borderRadius: 0, bgcolor: '#9333ea', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#7e22ce' } }}
          >
            {quickSubmitting ? 'Adding...' : 'Add Subcategory'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* NOTIFICATION SNACKBAR */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          sx={{ borderRadius: 0, border: '1px solid #1e293b' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}


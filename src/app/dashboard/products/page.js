'use client';

import { useState, useEffect, Fragment } from 'react';
import { Package, Search, Filter, ArrowUp, LayoutGrid, Clock, ListChecks, DollarSign, AlertTriangle, TrendingUp, Plus, Edit, Trash2, X, ChevronDown, Tag, Folder, Boxes } from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

// Material-UI imports
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
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
  Stack,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Divider,
  Checkbox
} from '@mui/material';

// Material Icons
import {

  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as PackageIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CheckCircle as CheckIcon,
  FilterList as FilterIcon,
  AttachMoney as DollarIcon,
  Numbers as HashIcon,
  CalendarToday as CalendarIcon,
  LocalOffer as TagIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  TrendingUp as TrendingUpIcon,
  Warning as AlertIcon,
  Star as StarIcon,
  Visibility as EyeIcon,
  BarChart as BarChartIcon,
  Extension as ExtensionIcon,
  Percent as PercentIcon
} from '@mui/icons-material';
import { AddonSelector, AddonChipsList, AddonPickerModal } from '@/components/addons';
import { ProductFormModal } from '@/components/products';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ProductsPage() {
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [stockFilter, setStockFilter] = useState('all');

  // Keyboard navigation states for Category/Subcategory Autocomplete
  const [categoryInput, setCategoryInput] = useState('');
  const [subcategoryInput, setSubcategoryInput] = useState('');
  const [categoryHighlighted, setCategoryHighlighted] = useState(null);
  const [subcategoryHighlighted, setSubcategoryHighlighted] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    pro_title: '',
    pro_description: '',
    pro_cost_price: '',
    pro_sale_price: '',
    pro_wholesale_price: '',
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
  });

  // Quick Addon Picker modal states
  const [pickerProduct, setPickerProduct] = useState(null);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [pickerSaving, setPickerSaving] = useState(false);

  // Batch Selection & Purchase Rate Adjustment States
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [adjustRateModalOpen, setAdjustRateModalOpen] = useState(false);
  const [adjustPercentage, setAdjustPercentage] = useState('');
  const [isAdjustingRate, setIsAdjustingRate] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Quick action states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ cat_name: '' });
  const [subcategoryFormData, setSubcategoryFormData] = useState({ sub_cat_name: '', cat_id: '' });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, subcategoriesRes, storesRes, formulasRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/subcategories'),
        fetch('/api/stores'),
        fetch('/api/formulas?active_only=true')
      ]);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
      if (subcategoriesRes.ok) {
        const subcategoriesData = await subcategoriesRes.json();
        setSubcategories(subcategoriesData);
      }
      if (storesRes.ok) {
        const storesData = await storesRes.json();
        if (storesData.success && Array.isArray(storesData.data)) {
          setStores(storesData.data);
        }
      }
      if (formulasRes && formulasRes.ok) {
        const formulasData = await formulasRes.json();
        setFormulas(Array.isArray(formulasData) ? formulasData : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const getFilteredSubcategories = () => {
    if (!selectedCategory) return subcategories;
    return subcategories.filter(sub => sub.cat_id === selectedCategory);
  };

  // Get subcategories for the form based on selected category in form
  const getFormSubcategories = () => {
    if (!formData.cat_id) return subcategories;
    return subcategories.filter(sub => sub.cat_id === formData.cat_id);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newProduct = await response.json();
        setProducts(prev => [...prev, newProduct]);
        setShowProductForm(false);
        setFormData({
          pro_title: '',
          pro_description: '',
          pro_cost_price: '',
          pro_sale_price: '',
          pro_wholesale_price: '',
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
        });
        setSnackbar({
          open: true,
          message: 'Product added successfully!',
          severity: 'success'
        });
      } else {
        const error = await response.json();
        setSnackbar({
          open: true,
          message: error.error || 'Failed to create product',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create product',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingProduct.pro_id,
          ...formData
        }),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setProducts(prev => prev.map(product =>
          product.pro_id === editingProduct.pro_id ? updatedProduct : product
        ));
        setShowProductForm(false);
        setEditingProduct(null);
        setFormData({
          pro_title: '',
          pro_description: '',
          pro_cost_price: '',
          pro_sale_price: '',
          pro_wholesale_price: '',
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
        });
        setSnackbar({
          open: true,
          message: 'Product updated successfully!',
          severity: 'success'
        });
      } else {
        const error = await response.json();
        setSnackbar({
          open: true,
          message: error.error || 'Failed to update product',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update product',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/products?id=${productId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setProducts(prev => prev.filter(product => product.pro_id !== productId));
          setSnackbar({
            open: true,
            message: 'Product deleted successfully!',
            severity: 'success'
          });
        } else {
          const error = await response.json();
          setSnackbar({
            open: true,
            message: error.error || 'Failed to delete product',
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        setSnackbar({
          open: true,
          message: 'Failed to delete product',
          severity: 'error'
        });
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // When purchase cost changes, auto-sync cost price
      ...(name === 'pro_crate' ? { pro_cost_price: value } : {})
    }));
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle Tab key on Category field (select highlighted option and move to Subcategory)
  const handleCategoryKeyDown = (e) => {
    if (e.key === 'Tab' && categoryOpen) {
      e.preventDefault();
      
      // Select the highlighted option
      if (categoryHighlighted) {
        setFormData(prev => ({
          ...prev,
          cat_id: categoryHighlighted.cat_id,
          sub_cat_id: '' // Reset subcategory when category changes
        }));
        setCategoryInput(categoryHighlighted.cat_name);
      } else if (categories.length > 0) {
        // If no highlighted, select first match
        const firstMatch = categories.find(c => c.cat_name.toLowerCase().includes(categoryInput.toLowerCase())) || categories[0];
        setFormData(prev => ({
          ...prev,
          cat_id: firstMatch.cat_id,
          sub_cat_id: ''
        }));
        setCategoryInput(firstMatch.cat_name);
      }
      
      setCategoryOpen(false);
      
      // Auto-focus and auto-open Subcategory after a brief delay
      setTimeout(() => {
        const subcategoryInput = document.querySelector('[data-field="subcategoryAutocomplete"] input');
        if (subcategoryInput) {
          subcategoryInput.focus();
          setSubcategoryOpen(true);
        }
      }, 50);
    }
  };

  // Handle Tab key on Subcategory field (select highlighted option and close)
  const handleSubcategoryKeyDown = (e) => {
    if (e.key === 'Tab' && subcategoryOpen) {
      e.preventDefault();
      
      // Select the highlighted option
      if (subcategoryHighlighted) {
        setFormData(prev => ({
          ...prev,
          sub_cat_id: subcategoryHighlighted.sub_cat_id
        }));
        setSubcategoryInput(subcategoryHighlighted.sub_cat_name);
      } else {
        const formSubcats = getFormSubcategories();
        if (formSubcats.length > 0) {
          const firstMatch = formSubcats.find(s => s.sub_cat_name.toLowerCase().includes(subcategoryInput.toLowerCase())) || formSubcats[0];
          setFormData(prev => ({
            ...prev,
            sub_cat_id: firstMatch.sub_cat_id
          }));
          setSubcategoryInput(firstMatch.sub_cat_name);
        }
      }
      
      setSubcategoryOpen(false);
      
      // Move focus to next field (Purchase Cost - first pricing field)
      setTimeout(() => {
        const purchaseCostInput = document.querySelector('input[name="pro_crate"]');
        if (purchaseCostInput) {
          purchaseCostInput.focus();
        }
      }, 50);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.pro_title.trim()) {
      setSnackbar({
        open: true,
        message: 'Product title is required',
        severity: 'error'
      });
      return;
    }

    if (!formData.cat_id) {
      setSnackbar({
        open: true,
        message: 'Please select a category',
        severity: 'error'
      });
      return;
    }

    if (parseFloat(formData.pro_stock_qnty) > 0 && !formData.store_id) {
      setSnackbar({
        open: true,
        message: 'Please select a store for the initial stock quantity',
        severity: 'error'
      });
      return;
    }

    if (editingProduct) {
      await handleUpdateProduct(e);
    } else {
      await handleAddProduct(e);
    }
  };

  const handleCloseDialog = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setFormData({
      pro_title: '',
      pro_description: '',
      pro_cost_price: '',
      pro_sale_price: '',
      pro_wholesale_price: '',
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
    });
    // Clear Category and Subcategory input states
    setCategoryInput('');
    setSubcategoryInput('');
    setCategoryHighlighted(null);
    setSubcategoryHighlighted(null);
    setCategoryOpen(false);
    setSubcategoryOpen(false);
  };

  const handleOpenAddonPicker = (product) => {
    setPickerProduct(product);
    setPickerModalOpen(true);
  };

  const handleSaveAddonPicker = async (selectedIds) => {
    if (!pickerProduct) return;
    try {
      setPickerSaving(true);
      const res = await fetch(`/api/products/${pickerProduct.pro_id}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addon_ids: selectedIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(prev => prev.map(p => {
          if (p.pro_id === pickerProduct.pro_id) {
            return {
              ...p,
              addons: data.addons || []
            };
          }
          return p;
        }));
        setSnackbar({
          open: true,
          message: "Product ad on's updated successfully!",
          severity: 'success'
        });
        setPickerModalOpen(false);
        setPickerProduct(null);
      } else {
        const err = await res.json();
        setSnackbar({
          open: true,
          message: err.error || "Failed to update ad on's",
          severity: 'error'
        });
      }
    } catch (e) {
      console.error(e);
      setSnackbar({
        open: true,
        message: "Failed to update ad on's",
        severity: 'error'
      });
    } finally {
      setPickerSaving(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Batch selection handlers
  const handleToggleProductSelect = (proId) => {
    setSelectedProductIds(prev =>
      prev.includes(proId) ? prev.filter(id => id !== proId) : [...prev, proId]
    );
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = filteredAndSortedProducts.map(p => p.pro_id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedProductIds.includes(id));
    if (allVisibleSelected) {
      setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  const handleSelectAllProducts = () => {
    setSelectedProductIds(products.map(p => p.pro_id));
  };

  const handleOpenAdjustRateModal = () => {
    if (selectedProductIds.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select at least one product using the checkboxes first.',
        severity: 'warning'
      });
      return;
    }
    setAdjustPercentage('');
    setAdjustError('');
    setAdjustRateModalOpen(true);
  };

  const handleApplyPurchaseRateAdjustment = async () => {
    const pctVal = parseFloat(adjustPercentage);
    if (adjustPercentage === '' || isNaN(pctVal)) {
      setAdjustError('Please enter a valid percentage (e.g. 10 or 15).');
      return;
    }

    try {
      setIsAdjustingRate(true);
      setAdjustError('');

      const response = await fetch('/api/products/adjust-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: selectedProductIds,
          purchasePercentage: pctVal,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSnackbar({
          open: true,
          message: data.message || `Successfully adjusted purchase rate for ${data.updatedCount || selectedProductIds.length} products!`,
          severity: 'success'
        });
        setAdjustRateModalOpen(false);
        setSelectedProductIds([]);
        await fetchData();
      } else {
        setAdjustError(data.error || 'Failed to adjust purchase rate');
      }
    } catch (err) {
      console.error('Error adjusting purchase rate:', err);
      setAdjustError('Failed to connect to server');
    } finally {
      setIsAdjustingRate(false);
    }
  };

  // Quick action handlers
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.cat_name.trim()) {
      setSnackbar({
        open: true,
        message: 'Category name is required',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData)
      });

      if (response.ok) {
        const newCategory = await response.json();
        setSnackbar({
          open: true,
          message: 'Category added successfully',
          severity: 'success'
        });
        setCategoryFormData({ cat_name: '' });
        setShowCategoryForm(false);
        // Update categories dropdown locally
        setCategories(prev => [...prev, newCategory]);
      } else {
        throw new Error('Failed to add category');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error adding category',
        severity: 'error'
      });
    }
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!subcategoryFormData.sub_cat_name.trim() || !subcategoryFormData.cat_id) {
      setSnackbar({
        open: true,
        message: 'Subcategory name and category are required',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subcategoryFormData)
      });

      if (response.ok) {
        const newSubcategory = await response.json();
        setSnackbar({
          open: true,
          message: 'Subcategory added successfully',
          severity: 'success'
        });
        setSubcategoryFormData({ sub_cat_name: '', cat_id: '' });
        setShowSubcategoryForm(false);
        // Update subcategories dropdown locally
        setSubcategories(prev => [...prev, newSubcategory]);
      } else {
        throw new Error('Failed to add subcategory');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error adding subcategory',
        severity: 'error'
      });
    }
  };

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.pro_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.pro_description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || product.cat_id === selectedCategory;
      const matchesSubcategory = !selectedSubcategory || product.sub_cat_id === selectedSubcategory;

      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = product.pro_stock_qnty < 10;
      } else if (stockFilter === 'out') {
        matchesStock = product.pro_stock_qnty <= 0;
      }

      return matchesSearch && matchesCategory && matchesSubcategory && matchesStock;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Handle numeric sorting
      if (sortBy === 'pro_cost_price' || sortBy === 'pro_sale_price' || sortBy === 'pro_wholesale_price' || sortBy === 'pro_stock_qnty') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    })
    .map((product, index) => ({
      ...product,
      sequentialId: index + 1
    }));

  // Calculate stats
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => sum + (parseFloat(product.pro_cost_price) * parseFloat(product.pro_stock_qnty) || 0), 0);
  const lowStockProducts = products.filter(product => parseFloat(product.pro_stock_qnty) < (product.low_stock_quantity ?? 10)).length;
  const outOfStockProducts = products.filter(product => product.pro_stock_qnty <= 0).length;

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSortBy('created_at');
    setSortOrder('desc');
    setStockFilter('all');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default'
          }}
        >
          <CircularProgress size={80} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth={false} sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.4rem', sm: '1.85rem' },
                  lineHeight: 1.2
                }}
              >
                Products Management
              </Typography>
            </Box>
            <Button
              startIcon={<Plus size={20} strokeWidth={2.8} />}
              onClick={() => {
                setEditingProduct(null);
                setShowProductForm(true);
              }}
              sx={{
                background: 'linear-gradient(90deg, #5b5be8 0%, #8b5cf6 30%, #d946ef 65%, #f43f5e 90%, #ef4444 100%)',
                color: '#ffffff',
                px: { xs: 2.5, sm: 3.5 },
                py: { xs: 1, sm: 1.25 },
                borderRadius: '9999px',
                fontSize: { xs: '0.85rem', sm: '0.925rem' },
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                boxShadow: '0 8px 24px -4px rgba(239, 68, 68, 0.4), 0 4px 14px -2px rgba(91, 91, 232, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
                transition: 'all 0.25s ease-in-out',
                border: 'none',
                whiteSpace: 'nowrap',
                '&:hover': {
                  background: 'linear-gradient(90deg, #4d4de0 0%, #7c3aed 30%, #c026d3 65%, #e11d48 90%, #dc2626 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 30px -4px rgba(239, 68, 68, 0.5), 0 6px 18px -2px rgba(91, 91, 232, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                  boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.3), 0 3px 8px -2px rgba(91, 91, 232, 0.3)',
                }
              }}
            >
              Add New Product
            </Button>
          </Box>

          {/* Premium Filters Section */}
          <Box sx={{ flexShrink: 0, width: '100%' }}>
            <Card sx={{
              borderRadius: 2,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
              bgcolor: '#f8fafc'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155' }}>
                    Filters & Sorting
                  </Typography>
                  <Button
                    onClick={clearFilters}
                    size="small"
                    sx={{
                      color: '#64748b',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { color: '#ef4444' }
                    }}
                  >
                    Clear All Filters
                  </Button>
                </Box>

                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '1fr 1fr',
                    md: 'repeat(4, 1fr)'
                  },
                  gap: 3,
                  width: '100%'
                }}>
                  {/* Search */}
                  <Box>
                    <TextField
                      fullWidth
                      label="Search"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ mr: 1 }}>
                            <Search size={18} color="#94a3b8" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: 'white',
                        }
                      }}
                    />
                  </Box>

                  {/* Category Filter */}
                  <Box>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={selectedCategory}
                        label="Category"
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setSelectedSubcategory('');
                        }}
                        startAdornment={
                          <InputAdornment position="start" sx={{ mr: 1, ml: -0.5 }}>
                            <Folder size={18} color="#94a3b8" />
                          </InputAdornment>
                        }
                        sx={{
                          borderRadius: 1.5,
                          bgcolor: 'white',
                        }}
                      >
                        <MenuItem value="">All Categories</MenuItem>
                        {categories.map(category => (
                          <MenuItem key={category.cat_id} value={category.cat_id}>
                            {category.cat_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Subcategory Filter */}
                  <Box>
                    <FormControl fullWidth disabled={!selectedCategory}>
                      <InputLabel>Subcategory</InputLabel>
                      <Select
                        value={selectedSubcategory}
                        label="Subcategory"
                        onChange={(e) => setSelectedSubcategory(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start" sx={{ mr: 1, ml: -0.5 }}>
                            <Boxes size={18} color="#94a3b8" />
                          </InputAdornment>
                        }
                        sx={{
                          borderRadius: 1.5,
                          bgcolor: 'white',
                        }}
                      >
                        <MenuItem value="">All Subcategories</MenuItem>
                        {getFilteredSubcategories().map(subcategory => (
                          <MenuItem key={subcategory.sub_cat_id} value={subcategory.sub_cat_id}>
                            {subcategory.sub_cat_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Stock Filter */}
                  <Box>
                    <FormControl fullWidth>
                      <InputLabel>Stock Status</InputLabel>
                      <Select
                        value={stockFilter}
                        label="Stock Status"
                        onChange={(e) => setStockFilter(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start" sx={{ mr: 1, ml: -0.5 }}>
                            <Tag size={18} color="#94a3b8" />
                          </InputAdornment>
                        }
                        sx={{
                          borderRadius: 1.5,
                          bgcolor: 'white',
                        }}
                      >
                        <MenuItem value="all">All Products</MenuItem>
                        <MenuItem value="low">Low Stock</MenuItem>
                        <MenuItem value="out">Out of Stock</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Sort By */}
                  <Box sx={{ gridColumn: { md: 'span 2' } }}>
                    <FormControl fullWidth>
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={sortBy}
                        label="Sort By"
                        onChange={(e) => setSortBy(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start" sx={{ mr: 1, ml: -0.5 }}>
                            <Filter size={18} color="#94a3b8" />
                          </InputAdornment>
                        }
                        sx={{
                          borderRadius: 1.5,
                          bgcolor: 'white',
                        }}
                      >
                        <MenuItem value="pro_title">Product Name</MenuItem>
                        <MenuItem value="pro_cost_price">Cost Price</MenuItem>
                        <MenuItem value="pro_sale_price">Sale Price</MenuItem>
                        <MenuItem value="pro_wholesale_price">Wholesale Price</MenuItem>
                        <MenuItem value="pro_stock_qnty">Stock Quantity</MenuItem>
                        <MenuItem value="created_at">Created Date</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Sort Order */}
                  <Box sx={{ gridColumn: { md: 'span 2' } }}>
                    <FormControl fullWidth>
                      <InputLabel>Order</InputLabel>
                      <Select
                        value={sortOrder}
                        label="Order"
                        onChange={(e) => setSortOrder(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start" sx={{ mr: 1, ml: -0.5 }}>
                            <ArrowUp size={18} color="#94a3b8" />
                          </InputAdornment>
                        }
                        sx={{
                          borderRadius: 1.5,
                          bgcolor: 'white',
                        }}
                      >
                        <MenuItem value="asc">Ascending</MenuItem>
                        <MenuItem value="desc">Descending</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Unified Professional Stats Bar */}
          <Box sx={{ flexShrink: 0, width: '100%' }}>
            <Card sx={{
              borderRadius: 2,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              bgcolor: 'white',
              border: '1px solid #e5e7eb'
            }}>
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'stretch',
                justifyContent: 'space-between',
                p: 0
              }}>
                {[
                  { title: 'Total Products', val: totalProducts, color: '#2563eb', bg: '#eff6ff', icon: <Package size={24} />, isCurrency: false },
                  { title: 'Total Value', val: totalValue, color: '#16a34a', bg: '#f0fdf4', icon: <DollarSign size={24} />, isCurrency: true },
                  { title: 'Low Stock', val: lowStockProducts, color: '#d97706', bg: '#fffbeb', icon: <AlertTriangle size={24} />, isCurrency: false },
                  { title: 'Out of Stock', val: outOfStockProducts, color: '#dc2626', bg: '#fef2f2', icon: <Boxes size={24} />, isCurrency: false }
                ].map((stat, i) => (
                  <Fragment key={i}>
                    <Box sx={{
                      flex: 1,
                      p: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2.5,
                      width: '100%',
                      bgcolor: stat.bg,
                      position: 'relative',
                      borderBottom: i < 3 && { xs: '1px solid #e5e7eb', md: 'none' },
                      '&:hover': {
                        bgcolor: 'white',
                        transition: 'background-color 0.3s'
                      }
                    }}>
                      <Avatar sx={{
                        bgcolor: 'white',
                        color: stat.color,
                        width: 52,
                        height: 52,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        border: `1.5px solid ${stat.color}20`
                      }}>
                        {stat.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="overline" sx={{
                          display: 'block',
                          lineHeight: 1,
                          mb: 0.5,
                          color: '#6b7280',
                          fontWeight: 700,
                          letterSpacing: 1.2
                        }}>
                          {stat.title}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.5, color: stat.color }}>
                          {stat.isCurrency && <span style={{ fontSize: '0.8rem', marginRight: 4, opacity: 0.6 }}>PKR</span>}
                          {stat.val.toLocaleString(undefined, { minimumFractionDigits: stat.isCurrency ? 2 : 0, maximumFractionDigits: stat.isCurrency ? 2 : 0 })}
                        </Typography>
                      </Box>
                    </Box>
                    {i < 3 && (
                      <Divider
                        orientation="vertical"
                        flexItem
                        sx={{
                          display: { xs: 'none', md: 'block' },
                          bgcolor: '#e5e7eb',
                          height: 60,
                          my: 'auto'
                        }}
                      />
                    )}
                  </Fragment>
                ))}
              </Box>
            </Card>
          </Box>

          {/* Products Table */}
          <Card sx={{ height: 600, display: 'flex', flexDirection: 'column', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc', flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 700, color: '#334155' }}>
                  Products List
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                  Showing {filteredAndSortedProducts.length} of {products.length} products
                </Typography>
                {selectedProductIds.length > 0 && (
                  <Chip
                    size="small"
                    color="primary"
                    label={`${selectedProductIds.length} Selected`}
                    onDelete={handleClearSelection}
                    sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc', border: '1px solid' }}
                  />
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {selectedProductIds.length > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={handleClearSelection}
                    sx={{ textTransform: 'none', fontSize: '0.8rem', borderColor: '#cbd5e1', color: '#64748b' }}
                  >
                    Deselect All
                  </Button>
                )}
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<TrendingUpIcon />}
                  onClick={handleOpenAdjustRateModal}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    bgcolor: selectedProductIds.length > 0 ? '#16a34a' : '#2563eb',
                    '&:hover': { bgcolor: selectedProductIds.length > 0 ? '#15803d' : '#1d4ed8' },
                    boxShadow: selectedProductIds.length > 0 ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none'
                  }}
                >
                  Adjust Purchase Rate (%){selectedProductIds.length > 0 ? ` (${selectedProductIds.length})` : ''}
                </Button>
              </Box>
            </Box>
            <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto', boxShadow: 'none' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ pl: 2, width: 48, bgcolor: '#f8fafc' }}>
                      <Checkbox
                        indeterminate={
                          filteredAndSortedProducts.length > 0 &&
                          filteredAndSortedProducts.some(p => selectedProductIds.includes(p.pro_id)) &&
                          !filteredAndSortedProducts.every(p => selectedProductIds.includes(p.pro_id))
                        }
                        checked={
                          filteredAndSortedProducts.length > 0 &&
                          filteredAndSortedProducts.every(p => selectedProductIds.includes(p.pro_id))
                        }
                        onChange={handleToggleSelectAllVisible}
                        inputProps={{ 'aria-label': 'Select all visible products' }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>No</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Store</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Purchase Rate</TableCell>
                    <TableCell>Crate (CodeRate)</TableCell>
                    <TableCell>Sale Rate</TableCell>
                    <TableCell>Wholesale Rate</TableCell>
                    <TableCell>Base Rate</TableCell>
                    <TableCell>Ad On's</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                        No products found matching your filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedProducts.map((product, index) => {
                      const isSelected = selectedProductIds.includes(product.pro_id);
                      return (
                        <TableRow 
                          key={product.pro_id} 
                          hover
                          selected={isSelected}
                          sx={{
                            bgcolor: isSelected ? 'rgba(34, 197, 94, 0.05)' : 'inherit',
                            '&.Mui-selected, &.Mui-selected:hover': {
                              bgcolor: 'rgba(34, 197, 94, 0.09) !important'
                            }
                          }}
                        >
                          {/* Checkbox */}
                          <TableCell padding="checkbox" sx={{ pl: 2 }}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleProductSelect(product.pro_id)}
                              size="small"
                            />
                          </TableCell>

                          {/* S. No */}
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {index + 1}
                            </Typography>
                          </TableCell>

                      {/* Product */}
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {product.pro_title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {product.pro_description || 'No description'}
                          </Typography>
                          {product.formula && (
                            <Chip
                              size="small"
                              label={`📐 ${product.formula.name}`}
                              sx={{
                                mt: 0.5,
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                bgcolor: '#eff6ff',
                                color: '#1d4ed8',
                                borderRadius: '3px'
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      {/* Store */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {product.store_stocks && product.store_stocks.length > 0 ? (
                            product.store_stocks.map(ss => {
                              const storeObj = stores.find(st => st.storeid === ss.store_id);
                              return (
                                <Chip 
                                  key={ss.store_id}
                                  label={`${storeObj ? storeObj.store_name : `Store #${ss.store_id}`}: ${parseFloat(ss.stock_quantity || 0)}`}
                                  size="small"
                                  sx={{ 
                                    fontSize: '0.75rem', 
                                    height: '20px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#334155',
                                    fontWeight: 500,
                                    border: '1px solid #e2e8f0',
                                    width: 'fit-content'
                                  }}
                                />
                              );
                            })
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                              No stock recorded
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Qty */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {product.pro_stock_qnty} {product.pro_unit || 'units'}
                        </Typography>
                      </TableCell>

                      {/* CRate */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {fmtAmt(product.pro_crate)}
                        </Typography>
                      </TableCell>

                      {/* Purchase Rate */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {parseFloat(((product.pro_cost_price ?? product.pro_baser_price) || 0)).toFixed(2)}
                        </Typography>
                      </TableCell>

                      {/* Sale Rate */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {fmtAmt(product.pro_sale_price)}
                        </Typography>
                      </TableCell>

                      {/* Wholesale Rate */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#0284c7' }}>
                          {product.pro_wholesale_price != null && parseFloat(product.pro_wholesale_price) > 0
                            ? fmtAmt(product.pro_wholesale_price)
                            : '-'}
                        </Typography>
                      </TableCell>

                      {/* Base Rate */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {fmtAmt(product.pro_baser_price)}
                        </Typography>
                      </TableCell>

                      {/* Ad On's */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AddonChipsList addons={product.addons} maxDisplay={2} />
                          <Tooltip title="Manage Ad On's for this product">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenAddonPicker(product)}
                              sx={{
                                color: '#1A55E3',
                                p: 0.5,
                                ml: 0.5,
                                borderRadius: 0,
                                '&:hover': { bgcolor: 'rgba(26, 85, 227, 0.08)' }
                              }}
                            >
                              <ExtensionIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Edit Product">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditProduct(product)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Product">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteProduct(product.pro_id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    );
                  }))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Reusable Product Form Modal */}
          <ProductFormModal
            open={showProductForm}
            onClose={() => {
              setShowProductForm(false);
              setEditingProduct(null);
            }}
            product={editingProduct}
            categories={categories}
            subcategories={subcategories}
            stores={stores}
            formulas={formulas}
            onSuccess={(savedProduct) => {
              if (editingProduct) {
                setProducts(prev => prev.map(p => p.pro_id === savedProduct.pro_id ? savedProduct : p));
                setSnackbar({
                  open: true,
                  message: `Product "${savedProduct.pro_title}" updated successfully!`,
                  severity: 'success'
                });
              } else {
                setProducts(prev => [savedProduct, ...prev]);
                setSnackbar({
                  open: true,
                  message: `Product "${savedProduct.pro_title}" created successfully!`,
                  severity: 'success'
                });
              }
              setEditingProduct(null);
              fetchData();
            }}
          />



          {/* Quick Addon Picker Modal for Table Row */}
          <AddonPickerModal
            open={pickerModalOpen}
            onClose={() => {
              setPickerModalOpen(false);
              setPickerProduct(null);
            }}
            title={pickerProduct ? `Ad On's: ${pickerProduct.pro_title}` : "Manage Product Ad On's"}
            productTitle={pickerProduct?.pro_title}
            initialSelectedIds={pickerProduct?.addons?.map(a => a.addon_id || a.addon?.id || a.id).filter(Boolean) || []}
            onSave={handleSaveAddonPicker}
            saving={pickerSaving}
          />

          {/* Adjust Purchase Rate by Percentage Modal */}
          <Dialog
            open={adjustRateModalOpen}
            onClose={() => !isAdjustingRate && setAdjustRateModalOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: { borderRadius: 3, overflow: 'hidden' }
            }}
          >
            <DialogTitle sx={{ 
              bgcolor: '#0f172a', 
              color: '#ffffff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              py: 2,
              px: 3 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', display: 'flex' }}>
                  <TrendingUpIcon />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', lineHeight: 1.2 }}>
                    Adjust Purchase Rate by Percentage
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    Calculates purchase rate using base rate for {selectedProductIds.length} selected product{selectedProductIds.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => setAdjustRateModalOpen(false)}
                disabled={isAdjustingRate}
                sx={{ color: '#94a3b8', '&:hover': { color: '#fff' } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, pt: '24px !important' }}>
              {adjustError && (
                <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setAdjustError('')}>
                  {adjustError}
                </Alert>
              )}

              {/* Formula explanation banner */}
              <Box sx={{ 
                p: 2, 
                mb: 3, 
                borderRadius: 2, 
                bgcolor: '#f0fdf4', 
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5
              }}>
                <Box sx={{ color: '#16a34a', mt: 0.25 }}>
                  <PercentIcon sx={{ fontSize: 26 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534' }}>
                    Formula: New Purchase Rate = Base Rate + (Base Rate × Percentage / 100)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#15803d', display: 'block', mt: 0.5 }}>
                    Example: If Base Rate is PKR 745.04 and you enter +10%, New Purchase Rate will become PKR 819.54. Both Purchase Cost (CRate) and Cost Price will be updated in the system.
                  </Typography>
                </Box>
              </Box>

              {/* Percentage input and presets */}
              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Adjustment Percentage"
                    placeholder="e.g. 10 or 15 or -5"
                    type="number"
                    value={adjustPercentage}
                    onChange={(e) => {
                      setAdjustPercentage(e.target.value);
                      setAdjustError('');
                    }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end" sx={{ fontWeight: 700, color: '#16a34a' }}>%</InputAdornment>,
                      sx: { fontSize: '1.1rem', fontWeight: 600 }
                    }}
                    helperText="Enter a positive percentage to increase rate, or negative to decrease"
                    autoFocus
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Quick Presets
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {['+5', '+10', '+12', '+15', '+20', '+25', '0', '-5'].map((val) => {
                      const numVal = parseFloat(val);
                      const isSelected = adjustPercentage === String(numVal) || adjustPercentage === val;
                      return (
                        <Chip
                          key={val}
                          label={`${val}%`}
                          clickable
                          onClick={() => {
                            setAdjustPercentage(String(numVal));
                            setAdjustError('');
                          }}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            bgcolor: isSelected ? '#16a34a' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#334155',
                            border: isSelected ? '1px solid #16a34a' : '1px solid #e2e8f0',
                            '&:hover': {
                              bgcolor: isSelected ? '#15803d' : '#e2e8f0'
                            }
                          }}
                        />
                      );
                    })}
                  </Box>
                </Grid>
              </Grid>

              {/* Impact Preview Table */}
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 1.5, px: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                    Preview Impact ({selectedProductIds.length} Selected)
                  </Typography>
                  {adjustPercentage !== '' && !isNaN(parseFloat(adjustPercentage)) && (
                    <Chip
                      size="small"
                      label={`Applying ${parseFloat(adjustPercentage) >= 0 ? '+' : ''}${adjustPercentage}%`}
                      sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>

                <TableContainer sx={{ maxHeight: 260 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', fontSize: '0.78rem' }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', fontSize: '0.78rem' }}>Product Title</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', fontSize: '0.78rem' }} align="right">Base Rate</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', fontSize: '0.78rem' }} align="right">Current Purchase Rate</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', fontSize: '0.78rem' }} align="right">New Purchase Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {products
                        .filter(p => selectedProductIds.includes(p.pro_id))
                        .map((product, idx) => {
                          const basePrice = parseFloat(product.pro_baser_price) || 0;
                          const currentPurchase = parseFloat(product.pro_crate || product.pro_cost_price || 0);
                          const pctVal = parseFloat(adjustPercentage);
                          const hasValidPct = adjustPercentage !== '' && !isNaN(pctVal);
                          const newPurchase = hasValidPct
                            ? Math.max(0, parseFloat((basePrice + (basePrice * (pctVal / 100))).toFixed(2)))
                            : currentPurchase;
                          const diff = newPurchase - currentPurchase;

                          return (
                            <TableRow key={product.pro_id} hover>
                              <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>{idx + 1}</TableCell>
                              <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                {product.pro_title}
                                {basePrice === 0 && (
                                  <Typography variant="caption" sx={{ display: 'block', color: '#ef4444', fontSize: '0.7rem' }}>
                                    (Base rate is 0 - result will be 0)
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.82rem', fontWeight: 500, color: '#475569' }}>
                                PKR {basePrice.toFixed(2)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.82rem', fontWeight: 500, color: '#64748b' }}>
                                PKR {currentPurchase.toFixed(2)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.85rem' }}>
                                {hasValidPct ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75 }}>
                                    <Typography sx={{ fontWeight: 700, color: '#16a34a', fontSize: '0.85rem' }}>
                                      PKR {newPurchase.toFixed(2)}
                                    </Typography>
                                    <Typography sx={{ 
                                      fontSize: '0.7rem', 
                                      fontWeight: 600,
                                      color: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#64748b' 
                                    }}>
                                      ({diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)})
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography sx={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                                    Enter % above
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc', justifyContent: 'space-between' }}>
              <Button
                onClick={() => setAdjustRateModalOpen(false)}
                disabled={isAdjustingRate}
                variant="outlined"
                sx={{ textTransform: 'none', borderColor: '#cbd5e1', color: '#475569' }}
              >
                Cancel
              </Button>

              <Button
                onClick={handleApplyPurchaseRateAdjustment}
                disabled={isAdjustingRate || adjustPercentage === '' || isNaN(parseFloat(adjustPercentage))}
                variant="contained"
                startIcon={isAdjustingRate ? <CircularProgress size={16} color="inherit" /> : <TrendingUpIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: '#16a34a',
                  '&:hover': { bgcolor: '#15803d' },
                  px: 3
                }}
              >
                {isAdjustingRate 
                  ? 'Applying Changes...' 
                  : `Apply to ${selectedProductIds.length} Product${selectedProductIds.length !== 1 ? 's' : ''}`
                }
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar for notifications */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={handleSnackbarClose}
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Stack>
      </Container>
    </DashboardLayout >
  );
}
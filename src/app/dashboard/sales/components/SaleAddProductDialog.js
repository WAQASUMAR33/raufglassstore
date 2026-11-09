'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Button,
  Box,
  Grid,
  TextField,
  InputAdornment,
  Autocomplete,
  CircularProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Inventory as PackageIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  LocationOn as MapPinIcon,
} from '@mui/icons-material';
import BiometricAuthDialog from '@/app/dashboard/components/BiometricAuthDialog';
import ProductFormModal from '@/components/products/ProductFormModal';
import { fmtAmt, fmtRateQty } from './sale-utils';
import { useSalesContext } from './SalesContext';
import { formatDatePK, formatTimePK, getCreatedByName } from '@/lib/date-helper';

export default function SaleAddProductDialog() {
  const {
    showAddProductPopup,
    setShowAddProductPopup,
    setProducts,
    handleProductSelect,
    showSnackbar,
    addProductFormData,
    setAddProductFormData,
    isAddingProduct,
    productCategories,
    productSubcategories,
    productCatInput,
    setProductCatInput,
    productSubCatInput,
    setProductSubCatInput,
    handleAddProductQuick,
    // Add Product Category State
    showAddProductCategoryPopup,
    setShowAddProductCategoryPopup,
    addProductCategoryName,
    setAddProductCategoryName,
    isAddingProductCategory,
    handleAddProductCategory,
    // Add Product Subcategory State
    showAddProductSubCategoryPopup,
    setShowAddProductSubCategoryPopup,
    addProductSubCategoryFormData,
    setAddProductSubCategoryFormData,
    isAddingProductSubCategory,
    handleAddProductSubCategory,
    // Customer Category State
    showCustomerCategoryPopup,
    setShowCustomerCategoryPopup,
    customerCategoryFormData,
    setCustomerCategoryFormData,
    isAddingCustomerCategory,
    handleAddCustomerCategory,
    // Customer Type State
    showCustomerTypePopup,
    setShowCustomerTypePopup,
    customerTypeFormData,
    setCustomerTypeFormData,
    isAddingCustomerType,
    handleAddCustomerType,
    // City State
    showCityPopup,
    setShowCityPopup,
    cityFormData,
    setCityFormData,
    isAddingCity,
    handleAddCity,
    // Auth & Loss Dialogs
    authDialogOpen,
    handleAuthSuccess,
    handleAuthCancel,
    lossConfirmOpen,
    setLossConfirmOpen,
    lossItems,
    handleSaveBill,
    currentBillData,
    selectedBill,
    currentUser,
    isWalkinCustomer,
    getBillDisplayNo,
    getSaleDetailsInAddOrder,
  } = useSalesContext();

  return (
    <>
      {/* Reusable Product Form Modal */}
      <ProductFormModal
        open={showAddProductPopup}
        onClose={() => setShowAddProductPopup(false)}
        onSuccess={(newProduct) => {
          if (newProduct) {
            setProducts?.(prev => [newProduct, ...prev]);
            handleProductSelect?.(newProduct);
            showSnackbar?.('Product added and selected successfully!', 'success');
          }
        }}
      />

      {/* Account Category Popup */}
      <Dialog
        open={showCustomerCategoryPopup}
        onClose={() => setShowCustomerCategoryPopup(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(45deg, #4caf50 30%, #2e7d32 90%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              mr: 2,
              width: 40,
              height: 40
            }}>
              <BusinessIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Add Account Category
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Create a new account category
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setShowCustomerCategoryPopup(false)}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              label="Account Category Title"
              value={customerCategoryFormData.cus_cat_title}
              onChange={(e) => setCustomerCategoryFormData({ cus_cat_title: e.target.value })}
              disabled={isAddingCustomerCategory}
              placeholder="Enter account category title"
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button
            onClick={() => setShowCustomerCategoryPopup(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddCustomerCategory}
            disabled={isAddingCustomerCategory}
            sx={{
              background: 'linear-gradient(45deg, #4caf50 30%, #2e7d32 90%)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(45deg, #388e3c 30%, #1b5e20 90%)',
              }
            }}
          >
            {isAddingCustomerCategory ? 'Adding...' : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Type Popup */}
      <Dialog
        open={showCustomerTypePopup}
        onClose={() => setShowCustomerTypePopup(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              mr: 2,
              width: 40,
              height: 40
            }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Add Account Type
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Create a new account type
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setShowCustomerTypePopup(false)}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              label="Account Type Title"
              value={customerTypeFormData.cus_type_title}
              onChange={(e) => setCustomerTypeFormData({ cus_type_title: e.target.value })}
              disabled={isAddingCustomerType}
              placeholder="Enter account type title"
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button
            onClick={() => setShowCustomerTypePopup(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddCustomerType}
            disabled={isAddingCustomerType}
            sx={{
              background: 'linear-gradient(45deg, #2196f3 30%, #9c27b0 90%)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976d2 30%, #7b1fa2 90%)',
              }
            }}
          >
            {isAddingCustomerType ? 'Adding...' : 'Add Type'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* City Popup */}
      <Dialog
        open={showCityPopup}
        onClose={() => setShowCityPopup(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(45deg, #ff9800 30%, #f57c00 90%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              mr: 2,
              width: 40,
              height: 40
            }}>
              <MapPinIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                Add City
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Create a new city
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setShowCityPopup(false)}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              label="City Name"
              value={cityFormData.city_name}
              onChange={(e) => setCityFormData({ city_name: e.target.value })}
              disabled={isAddingCity}
              placeholder="Enter city name"
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button
            onClick={() => setShowCityPopup(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddCity}
            disabled={isAddingCity}
            sx={{
              background: 'linear-gradient(45deg, #ff9800 30%, #f57c00 90%)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(45deg, #f57c00 30%, #ef6c00 90%)',
              }
            }}
          >
            {isAddingCity ? 'Adding...' : 'Add City'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

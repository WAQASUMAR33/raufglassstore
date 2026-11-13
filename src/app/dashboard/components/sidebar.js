'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Drawer,
  List,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
  ListItemButton,
  ListItemIcon,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  AttachMoney as AttachMoneyIcon,
  ShoppingCart as ShoppingCartIcon,
  ShoppingBag as ShoppingBagIcon,
  LocalShipping as LocalShippingIcon,
  Person as PersonIcon,
  Label as LabelIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Receipt as ReceiptIcon,
  CreditCard as CreditCardIcon,
  TableChart as TableChartIcon,
  MenuBook as MenuBookIcon,
  ExpandLess,
  Add as AddIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Store as StoreIcon,
  AssignmentReturn as AssignmentReturnIcon,
  SwapHoriz as SwapHorizIcon,
  PieChart as PieChartIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ListAlt as ListAltIcon,
  Badge as BadgeIcon,
  EventNote as EventNoteIcon,
  Payments as PaymentsIcon,
  Extension as ExtensionIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { canAccessMenuItem } from '@/lib/staff-access';
import { isHqUser } from '@/lib/branch-roles';
import { exitHqPosMode } from '@/lib/branch-client';
import { NAV_FN, SIDEBAR, SIDEBAR_WIDTH, SIDEBAR_SECTION_LABELS, COMPANY, POWERED_BY } from '@/lib/brand-theme';

const COLLAPSED_WIDTH = SIDEBAR_WIDTH.collapsed;
const EXPANDED_WIDTH = SIDEBAR_WIDTH.expanded;

const SECTION_META = {
  Overview: { fn: 'overview', icon: DashboardIcon },
  Accounts: { fn: 'accounts', icon: PeopleIcon },
  Products: { fn: 'inventory', icon: InventoryIcon },
  Finance: { fn: 'finance', icon: AttachMoneyIcon },
  Sales: { fn: 'sales', icon: ShoppingCartIcon },
  Purchase: { fn: 'purchase', icon: ShoppingBagIcon },
  Cargo: { fn: 'inventory', icon: LocalShippingIcon },
  'HR Management': { fn: 'hr', icon: BadgeIcon },
  Reports: { fn: 'reports', icon: PieChartIcon },
  System: { fn: 'system', icon: PersonIcon },
};

const SALES_IDS = new Set(['orders', 'new-sale', 'sales', 'hold-bills', 'sale-returns', 'quotations', 'sales-analytics', 'loaders']);
const PURCHASE_IDS = new Set(['purchases', 'new-purchase', 'purchase-list', 'purchase-returns', 'vehicles', 'purchase-details', 'super-order']);
const INVENTORY_IDS = new Set(['products', 'categories', 'sub-categories', 'store-stock', 'stock-transfer', 'stores', 'cargo', 'addons', 'formulas']);
const OPERATIONS_IDS = new Set(['day-end', 'day-end-history', 'cash-report', 'bank-report', 'bank-accounts']);
const FINANCE_IDS = new Set(['expenses', 'expense-titles', 'journal', 'internal-transfer', 'adjustment-management']);
const ACCOUNTS_IDS = new Set(['customercategory', 'customer-types', 'customers']);

const getNavFn = (item) => {
  const { id, category } = item;
  if (id === 'dashboard' || id === 'hq') return NAV_FN.overview;
  if (id === 'ledger') return NAV_FN.ledger;
  if (SALES_IDS.has(id) || category === 'sales-operations') return NAV_FN.sales;
  if (PURCHASE_IDS.has(id) || category === 'purchase-operations') return NAV_FN.purchase;
  if (INVENTORY_IDS.has(id) || category === 'product-management' || category === 'cargo-operations') return NAV_FN.inventory;
  if (OPERATIONS_IDS.has(id)) return NAV_FN.operations;
  if (FINANCE_IDS.has(id) || category === 'financial') return NAV_FN.finance;
  if (ACCOUNTS_IDS.has(id) || category === 'customer-management') return NAV_FN.accounts;
  if (category === 'reports') return NAV_FN.reports;
  if (category === 'hr-management') return NAV_FN.hr;
  if (category === 'system') return NAV_FN.system;
  if (category === 'main') return NAV_FN.overview;
  return NAV_FN.overview;
};

// Map item IDs to their route paths for URL-based active detection
const ROUTE_MAP = {
  'dashboard': '/dashboard',
  'hq': '/dashboard/hq',
  'usermanagement': '/dashboard/usermanagement',
  'customercategory': '/dashboard/customercategory',
  'customer-types': '/dashboard/customer-types',
  'customers': '/dashboard/customers',
  'categories': '/dashboard/categories',
  'sub-categories': '/dashboard/subcategories',
  'products': '/dashboard/products',
  'addons': '/dashboard/addons',
  'formulas': '/dashboard/formulas',
  'purchases': '/dashboard/purchases',
  'new-purchase': '/dashboard/purchases',
  'purchase-list': '/dashboard/purchases',
  'purchase-returns': '/dashboard/purchases',
  'vehicles': '/dashboard/vehicles',
  'ledger': '/dashboard/finance',
  'sales': '/dashboard/sales',
  'hold-bills': '/dashboard/hold-bills',
  'sale-returns': '/dashboard/sales',
  'loaders': '/dashboard/loaders',
  'expense-titles': '/dashboard/expense-titles',
  'expenses': '/dashboard/expenses',
  'journal': '/dashboard/journal',
  'internal-transfer': '/dashboard/internal-transfer',
  'bank-accounts': '/dashboard/bank-accounts',
  'day-end': '/dashboard/day-end',
  'day-end-history': '/dashboard/day-end/history',
  'cargo': '/dashboard/cargo',
  'new-sale': '/dashboard/sales',
  'orders': '/dashboard/orders',
  'quotations': '/dashboard/quotations',
  'sales-analytics': '/dashboard/sales/analytics',
  'reports-dashboard': '/dashboard/reports',
  'sales-by-date': '/dashboard/reports/sales-by-date',
  'sales-by-customer': '/dashboard/reports/sales-by-customer',
  'customer-balance-report': '/dashboard/reports/customer-balance-report',
  'customers-balance': '/dashboard/reports/customers-balance',
  'customer-ledger': '/dashboard/reports/customer-ledger',
  'purchases-by-date': '/dashboard/reports/purchases-by-date',
  'purchases-by-supplier': '/dashboard/reports/purchases-by-supplier',
  'expenses-by-date': '/dashboard/reports/expenses-by-date',
  'cash-report': '/dashboard/reports/cash-report',
  'bank-report': '/dashboard/reports/bank-report',
  'order-report': '/dashboard/reports/order-report',
  'stock-report': '/dashboard/reports/stock-report',
  'sale-report': '/dashboard/reports/sale-report',
  'item-sale-report': '/dashboard/reports/item-sale-report',
  'profit-report': '/dashboard/reports/profit-report',
  'purchase-report': '/dashboard/reports/purchase-report',
  'purchase-details': '/dashboard/purchases',
  'super-order': '/dashboard/super-order',
  'rebate-report': '/dashboard/reports/rebate',
  'balance-sheet': '/dashboard/reports/balance-sheet',
  'stores': '/dashboard/stores',
  'store-stock': '/dashboard/store-stock',
  'stock-transfer': '/dashboard/stock-transfer',
  'employees': '/dashboard/hr?module=employees',
  'attendance': '/dashboard/hr?module=attendance',
  'payroll': '/dashboard/hr?module=salary-sheet',
  'salary-management': '/dashboard/hr?module=salary-sheet',
  'hr': '/dashboard/hr',
  'settings': '/dashboard/settings',
  'import': '/dashboard/import',
  'internal-transfer': '/dashboard/internal-transfer',
  'adjustment-management': '/dashboard/adjustment-management',
  'activity-logs': '/dashboard/activity-logs',
};

// Reverse lookup: path → { itemId, category }
const PATH_TO_ITEM = {};

const getItemHref = (itemId) => {
  if (itemId === 'new-sale') return '/dashboard/sales';
  if (itemId === 'new-purchase') return '/dashboard/purchases?view=create';
  if (itemId === 'purchase-returns') return '/dashboard/purchases?type=return';
  if (itemId === 'sale-returns') return '/dashboard/sales?type=return';
  if (itemId === 'sub-categories') return '/dashboard/subcategories';
  return ROUTE_MAP[itemId] || '/dashboard';
};

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  expandedDropdowns,
  setExpandedDropdowns,
  user,
  collapsed,
  onToggleCollapse,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef(null);

  const menuItems = [
    { id: 'hq', name: 'Head Office', icon: StoreIcon, category: 'main', hqOnly: true },
    { id: 'dashboard', name: 'Dashboard', icon: DashboardIcon, category: 'main' },
    { id: 'orders', name: 'Order List', icon: ListAltIcon, category: 'main' },
    { id: 'new-sale', name: 'Sale', icon: StoreIcon, category: 'main' },
    { id: 'purchases', name: 'New Purchase', icon: ShoppingBagIcon, category: 'main' },
    { id: 'day-end', name: 'Day End / Day Close', icon: CalendarIcon, category: 'main' },
    { id: 'day-end-history', name: 'Closing History', icon: CalendarIcon, category: 'main' },
    { id: 'cash-report', name: 'Cash Report', icon: AttachMoneyIcon, category: 'main' },
    { id: 'bank-report', name: 'Bank Report', icon: CreditCardIcon, category: 'main' },
    { id: 'bank-accounts', name: 'Bank Accounts', icon: CreditCardIcon, category: 'main' },
    { id: 'ledger', name: 'Ledger', icon: DescriptionIcon, category: 'main' },
    { id: 'activity-logs', name: 'User Activity Logs', icon: ListAltIcon, category: 'main' },

    { id: 'customers', name: 'Accounts', icon: PeopleIcon, category: 'customer-management', parent: 'Accounts' },
    { id: 'customer-types', name: 'Account Type', icon: LabelIcon, category: 'customer-management', parent: 'Accounts' },
    { id: 'customercategory', name: 'Account Category Management', icon: FolderOpenIcon, category: 'customer-management', parent: 'Accounts' },

    { id: 'categories', name: 'Category Management', icon: FolderIcon, category: 'product-management', parent: 'Product Management' },
    { id: 'sub-categories', name: 'Sub Category Management', icon: FolderOpenIcon, category: 'product-management', parent: 'Product Management' },
    { id: 'products', name: 'Product List', icon: InventoryIcon, category: 'product-management', parent: 'Product Management' },
    { id: 'addons', name: "Ad On's Management", icon: ExtensionIcon, category: 'product-management', parent: 'Product Management' },
    { id: 'formulas', name: 'Formulas Management', icon: CalculateIcon, category: 'product-management', parent: 'Product Management' },

    { id: 'expense-titles', name: 'Expense Titles', icon: LabelIcon, category: 'financial', parent: 'Finance' },
    { id: 'expenses', name: 'Expense Management', icon: AttachMoneyIcon, category: 'financial', parent: 'Finance' },
    { id: 'journal', name: 'Journal Entries', icon: MenuBookIcon, category: 'financial', parent: 'Finance' },
    { id: 'internal-transfer', name: 'Internal Transfer', icon: SwapHorizIcon, category: 'financial', parent: 'Finance' },
    { id: 'adjustment-management', name: 'Adjustment Account', icon: SwapHorizIcon, category: 'financial', parent: 'Finance' },
    { id: 'day-end', name: 'Day End Closing', icon: CalendarIcon, category: 'financial', parent: 'Finance' },
    { id: 'day-end-history', name: 'Closing History', icon: CalendarIcon, category: 'financial', parent: 'Finance' },

    { id: 'hold-bills', name: 'Hold Bills', icon: InventoryIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'sale-returns', name: 'Sale Returns', icon: CloseIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'loaders', name: 'Loader/Transport', icon: LocalShippingIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'quotations', name: 'Quotations', icon: ReceiptIcon, category: 'sales-operations', parent: 'Sales' },
    { id: 'sales-analytics', name: 'Sales Analytics', icon: TrendingUpIcon, category: 'sales-operations', parent: 'Sales' },

    { id: 'new-purchase', name: 'Create New Purchase', icon: AddIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-list', name: 'Purchase List', icon: ShoppingBagIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-returns', name: 'Purchase Returns', icon: AssignmentReturnIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'vehicles', name: 'Vehicle Management', icon: LocalShippingIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'purchase-details', name: 'Purchase Details', icon: TableChartIcon, category: 'purchase-operations', parent: 'Purchase' },
    { id: 'super-order', name: 'Super Order', icon: ListAltIcon, category: 'purchase-operations', parent: 'Purchase' },

    { id: 'cargo', name: 'Cargo Management', icon: LocalShippingIcon, category: 'cargo-operations', parent: 'Cargo' },

    { id: 'reports-dashboard', name: 'Reports Dashboard', icon: DashboardIcon, category: 'reports', parent: 'Reports' },
    { id: 'sales-by-date', name: 'Sales (By Date)', icon: CalendarIcon, category: 'reports', parent: 'Reports' },
    { id: 'sales-by-customer', name: 'Sales (Customer Wise)', icon: PeopleIcon, category: 'reports', parent: 'Reports' },
    { id: 'customer-balance-report', name: 'Customer Balance Report', icon: TableChartIcon, category: 'reports', parent: 'Reports' },
    { id: 'customers-balance', name: 'Customers Balance (Basic)', icon: AttachMoneyIcon, category: 'reports', parent: 'Reports' },
    { id: 'customer-ledger', name: 'Customer Ledger', icon: DescriptionIcon, category: 'reports', parent: 'Reports' },
    { id: 'purchases-by-date', name: 'Purchases (By Date)', icon: CalendarIcon, category: 'reports', parent: 'Reports' },
    { id: 'purchases-by-supplier', name: 'Purchases (Supplier Wise)', icon: ShoppingBagIcon, category: 'reports', parent: 'Reports' },
    { id: 'expenses-by-date', name: 'Expenses Report', icon: TrendingUpIcon, category: 'reports', parent: 'Reports' },
    { id: 'order-report', name: 'Order Report', icon: DescriptionIcon, category: 'reports', parent: 'Reports' },
    { id: 'stock-report', name: 'Stock Report', icon: InventoryIcon, category: 'reports', parent: 'Reports' },
    { id: 'sale-report', name: 'Sale Report', icon: ShoppingCartIcon, category: 'reports', parent: 'Reports' },
    { id: 'item-sale-report', name: 'Item Sale Report', icon: ShoppingCartIcon, category: 'reports', parent: 'Reports' },
    { id: 'profit-report', name: 'Profit Report', icon: TrendingUpIcon, category: 'reports', parent: 'Reports' },
    { id: 'purchase-report', name: 'Purchase Report', icon: ShoppingBagIcon, category: 'reports', parent: 'Reports' },
    { id: 'rebate-report', name: 'Rebate Report', icon: PieChartIcon, category: 'reports', parent: 'Reports' },
    { id: 'rebate-history', name: 'Rebate History', icon: PieChartIcon, category: 'reports', parent: 'Reports' },
    { id: 'supplier-ledger', name: 'Supplier Ledger', icon: DescriptionIcon, category: 'reports', parent: 'Reports' },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: TableChartIcon, category: 'reports', parent: 'Reports' },

    { id: 'hr', name: 'HR Management', icon: BadgeIcon, category: 'hr-management', parent: 'HR Management' },

    { id: 'usermanagement', name: 'User Management', icon: PersonIcon, category: 'system', parent: 'System' },
    { id: 'stores', name: 'Store Management', icon: StoreIcon, category: 'system', parent: 'System' },
    { id: 'store-stock', name: 'Store Stock', icon: InventoryIcon, category: 'system', parent: 'System' },
    { id: 'stock-transfer', name: 'Stock Transfer', icon: SwapHorizIcon, category: 'system', parent: 'System' },
    { id: 'settings', name: 'Biometric Settings', icon: PersonIcon, category: 'system', parent: 'System', adminOnly: true },
    { id: 'import', name: 'Excel Data Import', icon: TableChartIcon, category: 'system', parent: 'System', adminOnly: true },
    { id: 'activity-logs', name: 'User Activity Logs', icon: ListAltIcon, category: 'system', parent: 'System', adminOnly: true },
  ];

  const visibleMenuItems = menuItems.filter((item) => canAccessMenuItem(user, item));

  // Derive activeTab from pathname + query (view=create, type=return, etc.)
  const detectActiveFromPath = useCallback((currentPath, params) => {
    if (!currentPath) return null;

    const view = params?.get?.('view') || null;
    const type = params?.get?.('type') || null;

    if (currentPath.startsWith('/dashboard/sales/analytics')) {
      return { id: 'sales-analytics', category: 'sales-operations' };
    }

    if (currentPath.startsWith('/dashboard/sales')) {
      if (type === 'return') {
        return { id: 'sale-returns', category: 'sales-operations' };
      }
      // Sidebar "New Sale" opens the sales list; form opens from the list page button
      return { id: 'new-sale', category: 'main' };
    }

    if (currentPath.startsWith('/dashboard/purchases')) {
      if (type === 'return') {
        return { id: 'purchase-returns', category: 'purchase-operations' };
      }
      if (view === 'create' || view === 'new') {
        return { id: 'purchases', category: 'main' };
      }
      return { id: 'purchase-list', category: 'purchase-operations' };
    }

    if (currentPath.startsWith('/dashboard/orders')) {
      return { id: 'orders', category: view === 'create' ? 'main' : 'sales-operations' };
    }

    // Order matters: check more specific paths first
    const pathMappings = [
      { path: '/dashboard/usermanagement', id: 'usermanagement', category: 'system' },
      { path: '/dashboard/customer-types', id: 'customer-types', category: 'customer-management' },
      { path: '/dashboard/customercategory', id: 'customercategory', category: 'customer-management' },
      { path: '/dashboard/customers', id: 'customers', category: 'customer-management' },
      { path: '/dashboard/categories', id: 'categories', category: 'product-management' },
      { path: '/dashboard/subcategories', id: 'sub-categories', category: 'product-management' },
      { path: '/dashboard/products', id: 'products', category: 'product-management' },
      { path: '/dashboard/addons', id: 'addons', category: 'product-management' },
      { path: '/dashboard/formulas', id: 'formulas', category: 'product-management' },
      { path: '/dashboard/super-order', id: 'super-order', category: 'purchase-operations' },
      { path: '/dashboard/vehicles', id: 'vehicles', category: 'purchase-operations' },
      { path: '/dashboard/finance', id: 'ledger', category: 'main' },
      { path: '/dashboard/hold-bills', id: 'hold-bills', category: 'sales-operations' },
      { path: '/dashboard/expense-titles', id: 'expense-titles', category: 'financial' },
      { path: '/dashboard/expenses', id: 'expenses', category: 'financial' },
      { path: '/dashboard/internal-transfer', id: 'internal-transfer', category: 'financial' },
      { path: '/dashboard/bank-accounts', id: 'bank-accounts', category: 'main' },
      { path: '/dashboard/adjustment-management', id: 'adjustment-management', category: 'financial' },
      { path: '/dashboard/day-end/history', id: 'day-end-history', category: 'financial' },
      { path: '/dashboard/day-end', id: 'day-end', category: 'financial' },
      { path: '/dashboard/cargo', id: 'cargo', category: 'cargo-operations' },
      { path: '/dashboard/quotations', id: 'quotations', category: 'sales-operations' },
      { path: '/dashboard/loaders', id: 'loaders', category: 'sales-operations' },
      { path: '/dashboard/reports/sales-by-date', id: 'sales-by-date', category: 'reports' },
      { path: '/dashboard/reports/sales-by-customer', id: 'sales-by-customer', category: 'reports' },
      { path: '/dashboard/reports/customer-balance-report', id: 'customer-balance-report', category: 'reports' },
      { path: '/dashboard/reports/customers-balance', id: 'customers-balance', category: 'reports' },
      { path: '/dashboard/reports/customer-ledger', id: 'customer-ledger', category: 'reports' },
      { path: '/dashboard/reports/purchases-by-date', id: 'purchases-by-date', category: 'reports' },
      { path: '/dashboard/reports/purchases-by-supplier', id: 'purchases-by-supplier', category: 'reports' },
      { path: '/dashboard/reports/expenses-by-date', id: 'expenses-by-date', category: 'reports' },
      { path: '/dashboard/reports/cash-report', id: 'cash-report', category: 'main' },
      { path: '/dashboard/reports/bank-report', id: 'bank-report', category: 'main' },
      { path: '/dashboard/reports/order-report', id: 'order-report', category: 'reports' },
      { path: '/dashboard/reports/stock-report', id: 'stock-report', category: 'reports' },
      { path: '/dashboard/reports/sale-report', id: 'sale-report', category: 'reports' },
      { path: '/dashboard/reports/item-sale-report', id: 'item-sale-report', category: 'reports' },
      { path: '/dashboard/reports/profit-report', id: 'profit-report', category: 'reports' },
      { path: '/dashboard/reports/purchase-report', id: 'purchase-report', category: 'reports' },
      { path: '/dashboard/reports/rebate/history', id: 'rebate-history', category: 'reports' },
      { path: '/dashboard/reports/rebate', id: 'rebate-report', category: 'reports' },
      { path: '/dashboard/reports/supplier-ledger', id: 'supplier-ledger', category: 'reports' },
      { path: '/dashboard/reports/balance-sheet', id: 'balance-sheet', category: 'reports' },
      { path: '/dashboard/reports', id: 'reports-dashboard', category: 'reports' },
      { path: '/dashboard/stores', id: 'stores', category: 'system' },
      { path: '/dashboard/store-stock', id: 'store-stock', category: 'system' },
      { path: '/dashboard/stock-transfer', id: 'stock-transfer', category: 'system' },
      { path: '/dashboard/hr', id: 'hr', category: 'hr-management' },
      { path: '/dashboard/employees', id: 'employees', category: 'hr-management' },
      { path: '/dashboard/attendance', id: 'attendance', category: 'hr-management' },
      { path: '/dashboard/payroll', id: 'payroll', category: 'hr-management' },
      { path: '/dashboard/salary-management', id: 'salary-management', category: 'hr-management' },
      { path: '/dashboard/settings', id: 'settings', category: 'system' },
      { path: '/dashboard/import', id: 'import', category: 'system' },
      { path: '/dashboard/activity-logs', id: 'activity-logs', category: 'main' },
      { path: '/dashboard', id: 'dashboard', category: 'main' },
    ];

    for (const mapping of pathMappings) {
      if (mapping.path === '/dashboard') {
        if (currentPath === '/dashboard' || currentPath === '/dashboard/') {
          return mapping;
        }
      } else if (currentPath.startsWith(mapping.path)) {
        return mapping;
      }
    }
    return null;
  }, []);

  // Sync active tab and expanded section from pathname + search params
  useEffect(() => {
    const match = detectActiveFromPath(pathname, searchParams);
    if (match) {
      setActiveTab(match.id);
      // Auto-expand the parent section for nested items
      if (match.category !== 'main') {
        setExpandedDropdowns({ [match.category]: true });
      }
    }
  }, [pathname, searchParams, detectActiveFromPath, setActiveTab, setExpandedDropdowns]);

  const isSearching = searchQuery.trim().length > 0;
  const filteredItems = isSearching
    ? visibleMenuItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : visibleMenuItems;

  // Accordion toggle: only one section can be open at a time
  const toggleDropdown = (category) => {
    setExpandedDropdowns(prev => {
      const isCurrentlyOpen = prev[category];
      if (isCurrentlyOpen) {
        // Close this one → all closed
        return {};
      }
      // Open this one → close all others
      return { [category]: true };
    });
  };

  const handleNavigation = (itemId) => {
    if (itemId === 'hq' && isHqUser(user)) {
      exitHqPosMode();
    }
    setActiveTab(itemId);
    setSidebarOpen(false);
    const href = getItemHref(itemId);
    if (href && href !== pathname) {
      router.push(href);
    }
  };


  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'), { noSsr: true, defaultMatches: false });

  const drawerWidth = collapsed && !isMobile ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
  const isCollapsed = collapsed && !isMobile;

  const handleToggleCollapse = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof onToggleCollapse === 'function') {
      onToggleCollapse();
    }
  };

  const drawerTransition = theme.transitions.create('width', {
    easing: theme.transitions.easing.easeInOut,
    duration: theme.transitions.duration.standard,
  });

  const renderNavLink = (item, { indent = false } = {}) => {
    const isActive = activeTab === item.id;
    const href = getItemHref(item.id);
    const fn = getNavFn(item);

    return (
      <Box key={`${item.id}-${item.category}`} sx={{ px: indent ? 0.75 : 1.25, mb: 0.35 }}>
        <Link href={href} passHref style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <Box
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                handleNavigation(item.id);
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              pl: indent ? 1.5 : 1.25,
              pr: 1.25,
              py: 0.75,
              ml: indent ? 0.5 : 0,
              mr: indent ? 0.25 : 0,
              borderRadius: '10px',
              cursor: 'pointer',
              position: 'relative',
              color: isActive ? '#ffffff' : '#334155',
              background: isActive
                ? 'linear-gradient(135deg, #1A55E3 0%, #2563EB 100%)'
                : 'transparent',
              border: 'none',
              boxShadow: isActive ? '0 4px 14px rgba(26, 85, 227, 0.28)' : 'none',
              transition: 'all 0.18s ease-in-out',
              '&:hover': {
                background: isActive
                  ? 'linear-gradient(135deg, #1A55E3 0%, #2563EB 100%)'
                  : '#f1f5f9',
                color: isActive ? '#ffffff' : '#0f172a',
                transform: isActive ? 'none' : 'translateX(3px)',
              },
            }}
          >
            <Box
              sx={{
                width: indent ? 26 : 30,
                height: indent ? 26 : 30,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: isActive
                  ? 'rgba(255, 255, 255, 0.22)'
                  : (indent ? 'rgba(0, 0, 0, 0.03)' : fn.bg),
                color: isActive ? '#ffffff' : fn.main,
                transition: 'all 0.18s ease',
              }}
            >
              <item.icon sx={{ fontSize: indent ? 15 : 17 }} />
            </Box>
            <Typography
              sx={{
                flex: 1,
                fontSize: indent ? '0.8125rem' : '0.84rem',
                fontWeight: isActive ? 600 : 500,
                letterSpacing: 0.01,
                lineHeight: 1.4,
                userSelect: 'none',
                color: 'inherit',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.name}
            </Typography>
            {isActive && (
              <Box
                sx={{
                  width: 3.5,
                  height: 16,
                  borderRadius: '3px',
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 0 6px rgba(255, 255, 255, 0.5)',
                  flexShrink: 0,
                }}
              />
            )}
          </Box>
        </Link>
      </Box>
    );
  };

  const renderCollapsedIcon = (item) => {
    const href = getItemHref(item.id);
    const isActive = activeTab === item.id;
    const fn = getNavFn(item);
    return (
      <Tooltip
        key={item.id}
        title={item.name}
        placement="right"
        arrow
        slotProps={{
          tooltip: {
            sx: {
              bgcolor: '#0f172a',
              fontSize: '0.785rem',
              fontWeight: 600,
              px: 1.5,
              py: 0.85,
              borderRadius: '8px',
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.25)',
            },
          },
        }}
      >
        <Link href={href} passHref style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <ListItemButton
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && e.button === 0) {
                handleNavigation(item.id);
              }
            }}
            sx={{
              borderRadius: '10px',
              mb: 0.6,
              minHeight: 40,
              width: 42,
              mx: 'auto',
              justifyContent: 'center',
              px: 1,
              background: isActive
                ? 'linear-gradient(135deg, #1A55E3 0%, #2563EB 100%)'
                : 'transparent',
              color: isActive ? '#ffffff' : fn.main,
              border: 'none',
              boxShadow: isActive ? '0 4px 14px rgba(26, 85, 227, 0.3)' : 'none',
              transition: 'all 0.18s ease',
              '&:hover': {
                bgcolor: isActive ? '#1A55E3' : '#f1f5f9',
                transform: 'scale(1.06)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}>
              <item.icon fontSize="small" />
            </ListItemIcon>
          </ListItemButton>
        </Link>
      </Tooltip>
    );
  };

  const renderSectionLabel = (label) => {
    return (
      <Typography
        sx={{
          px: 2,
          pt: 1.5,
          pb: 0.6,
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#94a3b8',
        }}
      >
        {label}
      </Typography>
    );
  };

  const renderSectionHeader = (title, { collapsible = false, expanded = true, onToggle, hasActive = false, itemCount = 0 } = {}) => {
    const meta = SECTION_META[title] || { fn: 'overview', icon: DashboardIcon };
    const fn = NAV_FN[meta.fn] || NAV_FN.overview;
    const Icon = meta.icon;
    const isOpen = collapsible ? expanded : true;
    const rowActive = hasActive || (collapsible && isOpen);

    return (
      <Box
        onClick={collapsible ? onToggle : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        sx={{
          mx: 1,
          mb: 0.25,
          px: 1.25,
          py: 0.8,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: 1.15,
          cursor: collapsible ? 'pointer' : 'default',
          userSelect: 'none',
          bgcolor: rowActive && collapsible ? (hasActive ? 'rgba(26, 85, 227, 0.05)' : SIDEBAR.bgHover) : 'transparent',
          border: hasActive ? '1px solid rgba(26, 85, 227, 0.12)' : '1px solid transparent',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: SIDEBAR.bgHover,
            borderColor: 'rgba(226, 232, 240, 0.8)',
          },
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: hasActive ? 'rgba(26, 85, 227, 0.12)' : fn.bg,
            color: hasActive ? '#1A55E3' : fn.main,
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          <Icon sx={{ fontSize: 16 }} />
        </Box>

        <Typography
          sx={{
            flex: 1,
            fontSize: '0.835rem',
            fontWeight: hasActive ? 700 : (rowActive ? 600 : 500),
            color: hasActive ? '#1A55E3' : '#334155',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </Typography>

        {itemCount > 0 && (
          <Box
            sx={{
              px: 0.75,
              py: 0.15,
              borderRadius: '6px',
              fontSize: '0.675rem',
              fontWeight: 700,
              bgcolor: hasActive ? '#eff6ff' : '#f1f5f9',
              color: hasActive ? '#1A55E3' : '#64748b',
              border: `1px solid ${hasActive ? '#bfdbfe' : '#e2e8f0'}`,
              lineHeight: 1,
            }}
          >
            {itemCount}
          </Box>
        )}

        {collapsible && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              color: hasActive ? '#1A55E3' : SIDEBAR.textMuted,
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 17 }} />
          </Box>
        )}
      </Box>
    );
  };

  const renderMenuSection = (category, title) => {
    const items = filteredItems.filter(item => item.category === category);
    if (items.length === 0) return null;
    const isExpanded = isCollapsed ? false : (isSearching ? true : expandedDropdowns[category]);
    const hasActiveChild = items.some(item => activeTab === item.id);

    if (isCollapsed) {
      return (
        <Box key={category} sx={{ mb: 0.35 }}>
          {items.map(renderCollapsedIcon)}
          <Divider sx={{ my: 0.75, mx: 1, borderColor: SIDEBAR.border }} />
        </Box>
      );
    }

    return (
      <Box key={category} sx={{ mb: 0.4 }}>
        {renderSectionHeader(title, {
          collapsible: true,
          expanded: isExpanded,
          onToggle: () => toggleDropdown(category),
          hasActive: hasActiveChild,
          itemCount: items.length,
        })}

        <Collapse in={isExpanded} timeout={250}>
          <Box
            sx={{
              mt: 0.25,
              mb: 0.5,
              ml: 2.75,
              pl: 1,
              borderLeft: '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.2,
            }}
          >
            {items.map((item) => renderNavLink(item, { indent: true }))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const mainItems = filteredItems.filter(item => item.category === 'main');
  const systemItems = filteredItems.filter(item => item.category === 'system');

  const drawerContent = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
    }}>
      {/* Brand Header */}
      <Box sx={{
        flexShrink: 0,
        position: 'relative',
        borderBottom: `1px solid ${SIDEBAR.border}`,
        bgcolor: '#ffffff',
      }}>
        {/* Top subtle glow accent line */}
        <Box
          sx={{
            height: 3,
            width: '100%',
            background: 'linear-gradient(90deg, #1A55E3 0%, #0DCAF0 50%, #00D284 100%)',
          }}
        />

        {!isMobile && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              gap: 1.25,
              px: isCollapsed ? 1 : 2,
              py: isCollapsed ? 1.5 : 1.75,
              flexDirection: isCollapsed ? 'column' : 'row',
            }}
          >
            {!isCollapsed ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '11px',
                    background: 'linear-gradient(135deg, #1A55E3 0%, #2563EB 50%, #0DCAF0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    letterSpacing: '0.04em',
                    boxShadow: '0 4px 12px rgba(26, 85, 227, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  ZT
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.985rem',
                        lineHeight: 1.2,
                        color: '#0f172a',
                        letterSpacing: '-0.015em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {COMPANY.nameShort}
                    </Typography>
                    <Box
                      sx={{
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        bgcolor: '#eff6ff',
                        color: '#1A55E3',
                        px: 0.7,
                        py: 0.15,
                        borderRadius: '6px',
                        border: '1px solid #bfdbfe',
                        lineHeight: 1,
                        letterSpacing: '0.02em',
                      }}
                    >
                      ERP
                    </Box>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.685rem',
                      fontWeight: 600,
                      color: '#64748b',
                      letterSpacing: '0.02em',
                      mt: 0.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {COMPANY.nameSub}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg, #1A55E3 0%, #2563EB 50%, #0DCAF0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  letterSpacing: '0.04em',
                  boxShadow: '0 4px 12px rgba(26, 85, 227, 0.28)',
                  mb: 0.5,
                }}
              >
                ZT
              </Box>
            )}

            <IconButton
              onClick={handleToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              size="small"
              sx={{
                bgcolor: '#f8fafc',
                color: '#64748b',
                width: 30,
                height: 30,
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                zIndex: 20,
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.18s ease',
                '&:hover': {
                  bgcolor: '#eff6ff',
                  color: '#1A55E3',
                  borderColor: '#bfdbfe',
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.96)',
                },
              }}
            >
              {isCollapsed ? <ChevronRightIcon sx={{ fontSize: 17 }} /> : <ChevronLeftIcon sx={{ fontSize: 17 }} />}
            </IconButton>
          </Box>
        )}

        {isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #1A55E3 0%, #0DCAF0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                }}
              >
                ZT
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                {COMPANY.nameShort}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setSidebarOpen(false)}
              sx={{ color: '#64748b', p: 0.5, borderRadius: '8px', '&:hover': { bgcolor: '#f1f5f9' } }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Modern Search */}
      {!isCollapsed && (
        <Box sx={{ px: 1.75, py: 1.25, borderBottom: `1px solid ${SIDEBAR.border}`, bgcolor: '#ffffff' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.7,
              borderRadius: '10px',
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#cbd5e1',
                bgcolor: '#ffffff',
              },
              '&:focus-within': {
                borderColor: '#1A55E3',
                bgcolor: '#ffffff',
                boxShadow: '0 0 0 3px rgba(26, 85, 227, 0.12)',
              },
            }}
          >
            <SearchIcon sx={{ color: '#94a3b8', fontSize: 17, flexShrink: 0 }} />
            <Box
              component="input"
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search sidebar menu"
              sx={{
                flex: 1,
                border: 'none',
                outline: 'none',
                bgcolor: 'transparent',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: '#0f172a',
                minWidth: 0,
                '&::placeholder': {
                  color: '#94a3b8',
                  fontWeight: 400,
                },
              }}
            />
            {searchQuery ? (
              <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.2, color: '#94a3b8', '&:hover': { color: '#0f172a' } }}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            ) : (
              <Box
                sx={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  bgcolor: '#ffffff',
                  color: '#94a3b8',
                  px: 0.6,
                  py: 0.15,
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  lineHeight: 1,
                }}
              >
                /
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Navigation List */}
      <Box
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 0.75,
          px: isCollapsed ? 0.75 : 0.5,
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(148, 163, 184, 0.35) transparent',
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(148, 163, 184, 0.28)',
            borderRadius: '10px',
            '&:hover': { background: 'rgba(26, 85, 227, 0.5)' },
          },
        }}
      >
        <List disablePadding>
          {/* Quick Access */}
          {mainItems.length > 0 && (
            <Box sx={{ mb: 0.5 }}>
              {!isCollapsed && renderSectionLabel('Quick Access')}
              {!isCollapsed ? (
                <Box sx={{ mb: 0.5 }}>
                  {mainItems.map((item) => renderNavLink(item))}
                </Box>
              ) : (
                mainItems.map((item) => renderCollapsedIcon(item))
              )}
              {isCollapsed && <Divider sx={{ my: 0.75, mx: 1, borderColor: SIDEBAR.border }} />}
            </Box>
          )}

          {!isCollapsed && renderSectionLabel('Modules')}

          {renderMenuSection('customer-management', 'Accounts')}
          {renderMenuSection('product-management', 'Products')}
          {renderMenuSection('financial', 'Finance')}
          {renderMenuSection('sales-operations', 'Sales')}
          {renderMenuSection('purchase-operations', 'Purchase')}
          {renderMenuSection('cargo-operations', 'Cargo')}
          {renderMenuSection('hr-management', 'HR Management')}
          {renderMenuSection('reports', 'Reports')}

          {/* System */}
          {systemItems.length > 0 && (
            <Box sx={{ mb: 1, mt: 0.5 }}>
              {!isCollapsed && renderSectionLabel('System')}
              {!isCollapsed ? (
                <Box sx={{ mb: 0.5 }}>
                  {systemItems.map((item) => renderNavLink(item))}
                </Box>
              ) : (
                systemItems.map((item) => renderCollapsedIcon(item))
              )}
            </Box>
          )}

          {isSearching && filteredItems.length === 0 && (
            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: SIDEBAR.textMuted }}>
                No results for &quot;{searchQuery}&quot;
              </Typography>
            </Box>
          )}
        </List>
      </Box>

      {/* Modern Status & Powered By Footer */}
      <Box
        sx={{
          flexShrink: 0,
          borderTop: `1px solid ${SIDEBAR.border}`,
          bgcolor: '#ffffff',
          px: isCollapsed ? 1 : 1.5,
          py: 1.25,
        }}
      >
        {!isCollapsed ? (
          <Box
            sx={{
              p: 1.15,
              borderRadius: '10px',
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#10b981',
                  boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    lineHeight: 1.1,
                  }}
                >
                  System Online
                </Typography>
                <Typography
                  component="span"
                  className="sidebar-powered-name"
                  sx={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    lineHeight: 1.25,
                    mt: 0.2,
                  }}
                >
                  {POWERED_BY.name}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                fontSize: '0.6rem',
                fontWeight: 700,
                bgcolor: '#eff6ff',
                color: '#1A55E3',
                px: 0.75,
                py: 0.25,
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
                whiteSpace: 'nowrap',
              }}
            >
              v2.0
            </Box>
          </Box>
        ) : (
          <Tooltip title={`System Online • ${POWERED_BY.name}`} placement="right" arrow>
            <Box
              sx={{
                width: 38,
                height: 38,
                mx: 'auto',
                borderRadius: '10px',
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'default',
                position: 'relative',
                transition: 'all 0.18s ease',
                '&:hover': {
                  borderColor: '#cbd5e1',
                  bgcolor: '#ffffff',
                },
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: '#10b981',
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  boxShadow: '0 0 0 2px #ffffff',
                }}
              />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#1A55E3' }}>
                {POWERED_BY.nameShort}
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? sidebarOpen : true}
      onClose={() => setSidebarOpen(false)}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: drawerTransition,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: `1px solid ${SIDEBAR.border}`,
          background: SIDEBAR.background,
          overflowX: 'hidden',
          boxShadow: SIDEBAR.drawerShadow,
          transition: drawerTransition,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

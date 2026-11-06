'use client';

import { Menu, Home, LogOut, BookOpen, LayoutGrid, ShoppingCart, ShoppingBag, ClipboardList, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';
import { getStaffRoleName, canStaffAccessPath, getRoleDisplayName } from '@/lib/staff-access';

function getUserDisplayName(user) {
  const name = (user?.full_name || '').trim();
  if (name) return name;
  const email = (user?.email || '').trim();
  if (email) return email.split('@')[0];
  return 'User';
}

function getUserRoleLabel(user) {
  const role = getStaffRoleName(user) || user?.role;
  return getRoleDisplayName(role);
}

export default function Header({ sidebarOpen, setSidebarOpen, activeTab, user, branchLabel, onLogout }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }));
  }, []);

  const viewParam = searchParams?.get('view');
  const typeParam = searchParams?.get('type');
  const isNewSaleActive =
    pathname === '/dashboard/sales' &&
    typeParam !== 'return';

  const isNewPurchaseActive =
    pathname === '/dashboard/purchases' &&
    (viewParam === 'create' || viewParam === 'new') &&
    typeParam !== 'return';

  const isOrdersActive =
    pathname === '/dashboard/orders' &&
    viewParam === 'create';

  const isLedgerActive = pathname === '/dashboard/finance';
  const isAllAccountsActive = pathname === '/dashboard/customers';

  const pageTitle = activeTab === 'dashboard'
    ? 'Dashboard'
    : activeTab === 'new-sale'
      ? 'New Sale'
      : activeTab === 'customers'
        ? 'Accounts'
        : String(activeTab || 'dashboard').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const branchCode = branchLabel || 'MAIN';
  const userDisplayName = getUserDisplayName(user);
  const userRoleLabel = getUserRoleLabel(user);
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  const canNewSale = user && canStaffAccessPath(user, '/dashboard/sales');
  const canNewPurchase = user && canStaffAccessPath(user, '/dashboard/purchases');
  const canOrders = user && canStaffAccessPath(user, '/dashboard/orders');
  const canLedger = user && canStaffAccessPath(user, '/dashboard/finance');
  const canAccounts = user && canStaffAccessPath(user, '/dashboard/customers');
  const hasHeaderActions = canNewSale || canNewPurchase || canOrders || canLedger || canAccounts;

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Top micro accent bar */}
      <Box sx={{ height: 4, background: 'linear-gradient(90deg, #1A55E3 0%, #0DCAF0 50%, #00D284 100%)' }} />

      {/* Main Bar */}
      <Box
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          px: { xs: 2, md: 3 },
          py: 1.25,
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          {/* Left section: mobile toggle + brand breadcrumb + quick action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <IconButton
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              size="small"
              sx={{
                display: { lg: 'none' },
                color: '#475569',
                borderRadius: 0,
                '&:hover': { bgcolor: '#f1f5f9' },
              }}
            >
              <Menu className="w-5 h-5" />
            </IconButton>

            {/* Live Branch Indicator */}
            <Chip
              icon={
                <Box sx={{ position: 'relative', width: 8, height: 8, ml: 0.5 }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: 0,
                      bgcolor: '#34d399',
                      opacity: 0.75,
                      animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                      '@keyframes ping': {
                        '75%, 100%': { transform: 'scale(2)', opacity: 0 },
                      },
                    }}
                  />
                  <Box sx={{ position: 'relative', width: 8, height: 8, borderRadius: 0, bgcolor: '#10b981' }} />
                </Box>
              }
              label={branchCode}
              size="small"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 0,
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#334155',
                height: 28,
              }}
            />

            {/* Breadcrumb title */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.75 }}>
              <Typography
                onClick={() => router.push('/dashboard')}
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#64748b',
                  cursor: 'pointer',
                  '&:hover': { color: '#0f172a' },
                  transition: 'color 0.15s ease',
                }}
              >
                Zain Traders
              </Typography>
              <Typography sx={{ color: '#cbd5e1', fontSize: '0.8125rem' }}>/</Typography>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1A55E3' }}>
                {pageTitle}
              </Typography>
            </Box>

            {/* Quick Action Buttons */}
            {hasHeaderActions && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 0.5 }}>
                {canNewSale && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                    onClick={() => router.push('/dashboard/sales')}
                    sx={{
                      background: isNewSaleActive
                        ? '#1347c4'
                        : 'linear-gradient(135deg, #1A55E3 0%, #2563EB 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      borderRadius: 0,
                      px: 2,
                      py: 0.6,
                      boxShadow: '0 2px 8px rgba(26, 85, 227, 0.25)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1347c4 0%, #1d4ed8 100%)',
                        boxShadow: '0 4px 12px rgba(26, 85, 227, 0.35)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    New Sale
                  </Button>
                )}
                {canNewPurchase && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ShoppingBag className="w-3.5 h-3.5 text-[#1A55E3]" />}
                    onClick={() => router.push('/dashboard/purchases?view=create')}
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      borderColor: isNewPurchaseActive ? '#1A55E3' : '#e2e8f0',
                      bgcolor: isNewPurchaseActive ? '#eff6ff' : '#ffffff',
                      color: isNewPurchaseActive ? '#1347c4' : '#334155',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      borderRadius: 0,
                      px: 1.75,
                      py: 0.6,
                      '&:hover': {
                        borderColor: '#93c5fd',
                        bgcolor: '#f0f7ff',
                        color: '#1A55E3',
                      },
                    }}
                  >
                    New Purchase
                  </Button>
                )}
                {canOrders && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ClipboardList className="w-3.5 h-3.5 text-[#0DCAF0]" />}
                    onClick={() => router.push('/dashboard/orders?view=create&type=ORDER')}
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      borderColor: isOrdersActive ? '#0DCAF0' : '#e2e8f0',
                      bgcolor: isOrdersActive ? '#ecfeff' : '#ffffff',
                      color: isOrdersActive ? '#0e7490' : '#334155',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      borderRadius: 0,
                      px: 1.75,
                      py: 0.6,
                      '&:hover': {
                        borderColor: '#67e8f9',
                        bgcolor: '#f0fdff',
                        color: '#0891b2',
                      },
                    }}
                  >
                    Orders
                  </Button>
                )}
              </Box>
            )}
          </Box>

          {/* Right section: date, modules, user info, logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 'auto' }}>
            {canLedger && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<BookOpen className="w-3.5 h-3.5" />}
                onClick={() => router.push('/dashboard/finance')}
                sx={{
                  bgcolor: isLedgerActive ? '#4f46e5' : '#eef2ff',
                  borderColor: isLedgerActive ? '#4338ca' : '#e0e7ff',
                  color: isLedgerActive ? '#ffffff' : '#4338ca',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  borderRadius: 0,
                  px: 1.5,
                  py: 0.6,
                  '&:hover': {
                    bgcolor: isLedgerActive ? '#4338ca' : '#e0e7ff',
                    borderColor: '#c7d2fe',
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Ledger</Box>
              </Button>
            )}

            {canAccounts && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<LayoutGrid className="w-3.5 h-3.5" />}
                onClick={() => router.push('/dashboard/customers')}
                sx={{
                  bgcolor: isAllAccountsActive ? '#059669' : '#ecfdf5',
                  borderColor: isAllAccountsActive ? '#047857' : '#d1fae5',
                  color: isAllAccountsActive ? '#ffffff' : '#059669',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  borderRadius: 0,
                  px: 1.5,
                  py: 0.6,
                  '&:hover': {
                    bgcolor: isAllAccountsActive ? '#047857' : '#d1fae5',
                    borderColor: '#a7f3d0',
                  },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Accounts</Box>
              </Button>
            )}

            {/* Date display pill */}
            <Chip
              icon={<Calendar className="w-3 h-3 text-slate-400" />}
              label={currentDate}
              size="small"
              sx={{
                display: { xs: 'none', lg: 'inline-flex' },
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 0,
                color: '#64748b',
                fontWeight: 500,
                fontSize: '0.72rem',
                height: 28,
              }}
            />

            {/* Home shortcut button */}
            <Tooltip title="Dashboard Home" arrow>
              <IconButton
                size="small"
                onClick={() => router.push('/dashboard')}
                aria-label="Dashboard Home"
                sx={{
                  color: '#64748b',
                  borderRadius: 0,
                  '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
                }}
              >
                <Home className="w-4 h-4" />
              </IconButton>
            </Tooltip>

            {/* User Profile Chip */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1, borderLeft: '1px solid #e2e8f0' }}>
              <Avatar
                variant="square"
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.775rem',
                  fontWeight: 800,
                  borderRadius: 0,
                  background: 'linear-gradient(135deg, #1A55E3 0%, #0DCAF0 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(26, 85, 227, 0.25)',
                }}
              >
                {userInitial}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0, textAlign: 'left' }}>
                <Typography sx={{ fontSize: '0.775rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, maxWidth: 120 }} noWrap>
                  {userDisplayName}
                </Typography>
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1A55E3', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2, maxWidth: 120 }} noWrap>
                  {userRoleLabel}
                </Typography>
              </Box>
            </Box>

            {/* Logout button */}
            <Tooltip title="Sign Out" arrow>
              <IconButton
                size="small"
                onClick={onLogout}
                aria-label="Sign Out"
                sx={{
                  color: '#94a3b8',
                  borderRadius: 0,
                  '&:hover': { bgcolor: '#fee2e2', color: '#dc2626' },
                }}
              >
                <LogOut className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Mobile secondary breadcrumb row */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 1,
            pt: 1,
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Zain Traders</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#cbd5e1' }}>/</Typography>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#1A55E3' }}>{pageTitle}</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8' }}>{currentDate}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

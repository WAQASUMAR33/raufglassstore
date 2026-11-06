'use client';

import { Menu, Bell, Home, LogOut, BookOpen, LayoutGrid, ShoppingCart, ShoppingBag, ClipboardList, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
    <header className="sticky top-0 z-30 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      {/* Top micro accent bar */}
      <div className="h-1 bg-gradient-to-r from-[#1A55E3] via-[#0DCAF0] to-[#00D284]" />

      {/* Main Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-6 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left section: mobile toggle + brand breadcrumb + quick action buttons */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Live Branch Indicator */}
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>{branchCode}</span>
            </div>

            {/* Breadcrumb title */}
            <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <span className="text-slate-500 font-semibold hover:text-slate-800 transition-colors cursor-pointer" onClick={() => router.push('/dashboard')}>
                Zain Traders
              </span>
              <span>/</span>
              <span className="text-[#1A55E3] font-bold">{pageTitle}</span>
            </div>

            {/* Quick Action Buttons */}
            {hasHeaderActions && (
              <div className="flex items-center gap-2 ml-1">
                {canNewSale && (
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/sales')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm ${
                      isNewSaleActive
                        ? 'bg-[#1347c4] text-white shadow-blue-500/25 ring-2 ring-[#1A55E3]/30'
                        : 'bg-gradient-to-r from-[#1A55E3] to-[#2563EB] hover:from-[#1347c4] hover:to-[#1d4ed8] text-white shadow-blue-500/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" strokeWidth={2.25} />
                    <span>New Sale</span>
                  </button>
                )}
                {canNewPurchase && (
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/purchases?view=create')}
                    className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      isNewPurchaseActive
                        ? 'border-[#1A55E3] bg-[#e8effd] text-[#1347c4] ring-2 ring-[#1A55E3]/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-[#1A55E3]'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#1A55E3]" strokeWidth={2.25} />
                    <span>New Purchase</span>
                  </button>
                )}
                {canOrders && (
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/orders?view=create&type=ORDER')}
                    className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      isOrdersActive
                        ? 'border-[#0DCAF0] bg-[#e6faff] text-[#0aa3bd] ring-2 ring-[#0DCAF0]/25'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/50 hover:text-[#0aa3bd]'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-[#0DCAF0]" strokeWidth={2.25} />
                    <span>Orders</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right section: date, modules, user info, logout */}
          <div className="flex items-center gap-2 ml-auto">
            {canLedger && (
              <button
                type="button"
                onClick={() => router.push('/dashboard/finance')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isLedgerActive
                    ? 'text-white bg-[#4a57d4] border border-[#5E6EED]/40 shadow-sm ring-2 ring-[#5E6EED]/25'
                    : 'text-indigo-700 bg-indigo-50 border border-indigo-200/60 hover:bg-indigo-100/70 hover:shadow-sm'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" strokeWidth={2.25} />
                <span className="hidden sm:inline">Ledger</span>
              </button>
            )}

            {canAccounts && (
              <button
                type="button"
                onClick={() => router.push('/dashboard/customers')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isAllAccountsActive
                    ? 'text-white bg-[#00a868] border border-[#00D284]/40 shadow-sm ring-2 ring-[#00D284]/25'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200/60 hover:bg-emerald-100/70 hover:shadow-sm'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2.25} />
                <span className="hidden sm:inline">Accounts</span>
              </button>
            )}

            {/* Date display pill */}
            <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-500 text-[11px] font-medium">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{currentDate}</span>
            </div>

            {/* Home shortcut button */}
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              aria-label="Dashboard Home"
              title="Dashboard Home"
            >
              <Home className="w-4 h-4" />
            </button>

            {/* User chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1A55E3] to-[#0DCAF0] flex items-center justify-center text-white text-xs font-extrabold shadow-sm shrink-0">
                {userInitial}
              </div>
              <div className="hidden md:block text-left min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]" title={userDisplayName}>
                  {userDisplayName}
                </p>
                <p className="text-[10px] font-semibold text-[#1A55E3] uppercase tracking-wide truncate max-w-[120px]" title={userRoleLabel}>
                  {userRoleLabel}
                </p>
              </div>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-0.5"
              aria-label="Logout"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile secondary breadcrumb row */}
        <div className="md:hidden mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-slate-600 font-semibold">Zain Traders</span>
            <span>/</span>
            <span className="text-[#1A55E3] font-bold">{pageTitle}</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">{currentDate}</span>
        </div>
      </div>
    </header>
  );
}

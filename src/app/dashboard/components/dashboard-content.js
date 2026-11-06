'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Chip,
  Tooltip,
  Divider,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpMui,
  TrendingDown as TrendingDownMui,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  hasDashboardWidgetAccess,
  canViewAnyDashboardAnalytics,
  filterDashboardShortcuts,
  canViewDashboardLowStock,
} from '@/lib/staff-access';
import {
  eachPkWeekInRange,
  formatDatePK,
  formatPkWeekLabel,
  getPkDateString,
  lastNCalendarMonthsFilter,
  lastNPkDaysInclusive,
  pkCalendarYearFilter,
  pkMonthKeysToDateRange,
} from '@/lib/date-helper';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Eye,
  EyeOff,
  ShoppingBag,
  FileText,
  ArrowLeftRight,
  Warehouse,
  Receipt,
  ClipboardList,
  RotateCcw,
  ScrollText,
  ListOrdered,
  TrendingDown,
  BookOpen,
  Clock,
  Calendar,
  Filter,
  CreditCard,
  Banknote,
  PieChart,
  BarChart3,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  SHORTCUT_PALETTE,
  KPI_PALETTE,
  QUICK_ENTRY_TONES,
  CHART_COLORS,
  KPI_NEON,
  REPORT,
  getReportNeonStyles,
} from '@/lib/brand-theme';

const fmtAmt = (val) => {
  const n = parseFloat(val || 0);
  if (n % 1 === 0) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatQty = (val) => {
  const n = parseFloat(String(val ?? 0));
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 10000) / 10000;
  return r.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
};

const stockStatusLabel = (status) => {
  if (status === 'OUT') return 'Out of Stock';
  if (status === 'LOW') return 'Low Stock';
  return status;
};

const formatMonthLabel = (mStr) => {
  if (!mStr) return '';
  const parts = mStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (parts.length === 3) {
    const d = parseInt(parts[2], 10);
    const mIndex = parseInt(parts[1], 10) - 1;
    return `${d} ${monthNames[mIndex] || parts[1]}`;
  }
  if (parts.length < 2) return mStr;
  const mIndex = parseInt(parts[1], 10) - 1;
  return `${monthNames[mIndex] || parts[1]} '${parts[0].slice(2)}`;
};

const fmtK = (v) => {
  if (v == null || isNaN(v)) return '0';
  const abs = Math.abs(v);
  if (abs >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(v / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`;
  if (abs < 1 && abs > 0) return v.toFixed(1);
  return Math.round(v).toLocaleString();
};

const CARD = 'relative bg-white rounded-none border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_20px_rgba(15,23,42,0.04)]';
const CARD_HOVER = 'transition-all duration-300 ease-out hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_16px_32px_rgba(15,23,42,0.08)] hover:-translate-y-1';

const EMPTY_DATE_FILTER = { fromDate: '', toDate: '' };

function last30DaysFilter() {
  return lastNPkDaysInclusive(30);
}

const ReportViewContext = createContext(null);

function getNiceMax(val) {
  if (!val || val <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
  const fraction = val / magnitude;
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * magnitude;
}

function ReportFullscreenExpandButton() {
  const ctx = useContext(ReportViewContext);
  if (!ctx || ctx.isFullscreen) return null;
  return (
    <Tooltip title="Full screen view" arrow>
      <IconButton
        size="small"
        onClick={ctx.expand}
        aria-label="Open full screen"
        sx={{
          width: 30,
          height: 30,
          borderRadius: 0,
          border: '1px solid #e2e8f0',
          color: '#64748b',
          bgcolor: '#ffffff',
          '&:hover': { bgcolor: '#f8fafc', color: '#0f172a', borderColor: '#cbd5e1' },
        }}
      >
        <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.25} />
      </IconButton>
    </Tooltip>
  );
}

function buildDatePreset(days) {
  if (days === 'year') {
    const today = getPkDateString();
    return { fromDate: `${today.slice(0, 4)}-01-01`, toDate: today };
  }
  return lastNPkDaysInclusive(Number(days) || 30);
}

function buildMonthChartPreset(months) {
  if (months === 'year') return pkCalendarYearFilter();
  return lastNCalendarMonthsFilter(Number(months) || 6);
}

/** Month pickers + calendar-month presets for month-end closing charts. */
function WidgetMonthRangeFilter({ filters, onChange, loading = false, accent, children }) {
  const fromMonth = filters.fromDate?.slice(0, 7) || '';
  const toMonth = filters.toDate?.slice(0, 7) || '';

  const applyFromMonth = (monthKey) => {
    const endKey = toMonth && toMonth >= monthKey ? toMonth : monthKey;
    const range = pkMonthKeysToDateRange(monthKey, endKey);
    if (range) onChange(range);
  };

  const applyToMonth = (monthKey) => {
    const startKey = fromMonth && fromMonth <= monthKey ? fromMonth : monthKey;
    const range = pkMonthKeysToDateRange(startKey, monthKey);
    if (range) onChange(range);
  };

  const pillClass = 'flex items-center gap-1.5 bg-white border border-slate-200 rounded-none px-2 py-1 shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.02)]';
  const labelClass = 'text-[9px] font-bold text-slate-500 uppercase tracking-wider';
  const inputClass = 'text-[11px] font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer';

  return (
    <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-[#fafbfd]">
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        <Filter className="w-3 h-3 text-slate-400 shrink-0" />
        
        {children}

        <div className={pillClass}>
          <span className={labelClass}>From</span>
          <input
            type="month"
            lang="en-GB"
            value={fromMonth}
            onChange={(e) => applyFromMonth(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className={pillClass}>
          <span className={labelClass}>To</span>
          <input
            type="month"
            lang="en-GB"
            value={toMonth}
            onChange={(e) => applyToMonth(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-none border border-slate-200 shrink-0">
          {[
            { label: '3M', months: 3 },
            { label: '6M', months: 6 },
            { label: '12M', months: 12 },
            { label: 'Year', months: 'year' },
          ].map(({ label, months }) => {
            const preset = buildMonthChartPreset(months);
            const active = filters.fromDate === preset.fromDate && filters.toDate === preset.toDate;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange(preset)}
                className={`px-2 py-1 text-[10px] font-bold rounded-none transition-all duration-150 ${
                  active ? 'bg-white text-[#1A55E3] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {(filters.fromDate || filters.toDate) && (
          <button
            type="button"
            onClick={() => onChange(lastNCalendarMonthsFilter(6))}
            className="text-[10px] font-bold px-1.5 py-1 rounded-none transition-colors whitespace-nowrap text-red-500 hover:bg-red-50"
          >
            Reset
          </button>
        )}
      </div>
      {loading && (
        <div
          className="w-3.5 h-3.5 border-2 border-t-transparent border-blue-600 rounded-none animate-spin ml-auto shrink-0"
        />
      )}
    </div>
  );
}

function buildWeeklyChartData(salesList, days) {
  const range = lastNPkDaysInclusive(days);
  const slots = eachPkWeekInRange(range.fromDate, range.toDate).map((week) => ({
    from: week.from,
    to: week.to,
    dateStr: week.label || formatPkWeekLabel(week.from, week.to),
    billAmt: 0,
    orderAmt: 0,
    totalCount: 0,
    orderCount: 0,
  }));
  (salesList || []).forEach((sale) => {
    const day = getPkDateString(sale.created_at);
    const slot = slots.find((item) => day >= item.from && day <= item.to);
    if (!slot) return;
    const amt = parseFloat(sale.total_amount || 0);
    slot.totalCount += 1;
    if (sale.bill_type === 'ORDER') {
      slot.orderAmt += amt;
      slot.orderCount += 1;
    } else if (sale.bill_type !== 'QUOTATION') {
      slot.billAmt += amt;
    }
  });
  return {
    labels: slots.map((d) => d.dateStr),
    billAmounts: slots.map((d) => d.billAmt),
    orderAmounts: slots.map((d) => d.orderAmt),
    totalCounts: slots.map((d) => d.totalCount),
    orderCounts: slots.map((d) => d.orderCount),
  };
}

function ReportWidgetShell({ accent, title = 'Report', children, className = '' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const neon = getReportNeonStyles(accent);

  const viewCtx = useMemo(
    () => ({
      isFullscreen,
      expand: () => setIsFullscreen(true),
      collapse: () => setIsFullscreen(false),
      accent,
      title,
    }),
    [isFullscreen, accent, title]
  );

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('report-fullscreen-open');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('report-fullscreen-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [isFullscreen]);

  const card = (
    <ReportViewContext.Provider value={viewCtx}>
      <div
        className={`${REPORT.cardBase} ${className} ${isFullscreen ? 'h-full flex flex-col min-h-0' : ''}`}
        style={isFullscreen ? { border: 'none', boxShadow: 'none' } : neon.card}
      >
        {children}
      </div>
    </ReportViewContext.Provider>
  );

  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(
      <div
        className="fixed inset-0 flex flex-col bg-slate-50"
        style={{ zIndex: 9999, width: '100vw', height: '100vh', maxWidth: '100vw' }}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} full screen`}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 bg-white border-b shrink-0"
          style={{ borderColor: neon.divider }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: neon.text }}>
              {title}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Full screen report view · Esc to close</p>
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-none border transition-colors hover:bg-slate-50 shrink-0"
            style={{ borderColor: neon.primary, color: neon.text }}
          >
            <Minimize2 className="w-4 h-4" strokeWidth={2.25} />
            Exit full screen
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6 min-h-0">{card}</div>
      </div>,
      document.body
    );
  }

  return card;
}

function WidgetDateFilter({ filters, onChange, loading = false, accent, type = 'days', children }) {
  const pillClass = 'flex items-center gap-1.5 bg-white border border-slate-200 rounded-none px-2 py-1 shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.02)]';
  const labelClass = 'text-[9px] font-bold text-slate-500 uppercase tracking-wider';
  const inputClass = 'text-[11px] font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer';

  const presets = type === 'months' 
    ? [
        { label: '3M', val: 3 },
        { label: '6M', val: 6 },
        { label: '12M', val: 12 },
        { label: 'Year', val: 'year' },
      ]
    : [
        { label: '30D', val: 30 },
        { label: '3M', val: 90 },
        { label: '6M', val: 180 },
        { label: 'Year', val: 'year' },
      ];

  return (
    <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-[#fafbfd]">
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        <Filter className="w-3 h-3 text-slate-400 shrink-0" />
        <div className={pillClass}>
          <span className={labelClass}>From</span>
          <input type="date" lang="en-GB"
            value={filters.fromDate}
            onChange={(e) => onChange({ ...filters, fromDate: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className={pillClass}>
          <span className={labelClass}>To</span>
          <input type="date" lang="en-GB"
            value={filters.toDate}
            onChange={(e) => onChange({ ...filters, toDate: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-none border border-slate-200 shrink-0">
          {presets.map(({ label, val }) => {
            const preset = type === 'months' ? buildMonthChartPreset(val) : buildDatePreset(val);
            const active = filters.fromDate === preset.fromDate && filters.toDate === preset.toDate;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange(preset)}
                className={`px-2 py-1 text-[10px] font-bold rounded-none transition-all duration-150 ${
                  active ? 'bg-white text-[#1A55E3] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {(filters.fromDate || filters.toDate) && (
          <button
            type="button"
            onClick={() => onChange(type === 'months' ? buildMonthChartPreset(6) : buildDatePreset(30))}
            className="text-[10px] font-bold px-1.5 py-1 rounded-none transition-colors whitespace-nowrap text-red-500 hover:bg-red-50"
          >
            Reset
          </button>
        )}
        {children}
      </div>
      {loading && (
        <div
          className="w-3.5 h-3.5 border-2 border-t-transparent border-blue-600 rounded-none animate-spin ml-auto shrink-0"
        />
      )}
    </div>
  );
}

/** Category / type pills aligned with dashboard date filter bar. */
function WidgetCustomerScopeFilter({
  cusCatId,
  cusTypeId,
  categories = [],
  types = [],
  onCategoryChange,
  onTypeChange,
  onClearScope,
  accent,
  trailing = null,
}) {
  const hasScope = Boolean(cusCatId || cusTypeId);
  const selectClass =
    'text-[11px] font-semibold text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer max-w-[100px] truncate py-0.5';
  const pillClass = 'flex items-center gap-1.5 bg-white border border-slate-200 rounded-none px-2 py-1 shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.02)]';

  return (
    <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-[#fafbfd]">
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        <Users className="w-3 h-3 text-slate-400 shrink-0" />
        
        <div className={pillClass}>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Cat</span>
          <select
            value={cusCatId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.cus_cat_id} value={c.cus_cat_id}>
                {c.cus_cat_title}
              </option>
            ))}
          </select>
        </div>
        <div className={pillClass}>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Type</span>
          <select
            value={cusTypeId}
            onChange={(e) => onTypeChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t.cus_type_id} value={t.cus_type_id}>
                {t.cus_type_title}
              </option>
            ))}
          </select>
        </div>
        {hasScope && (
          <button
            type="button"
            onClick={onClearScope}
            className="text-[10px] font-bold px-1.5 py-1 rounded-none transition-colors whitespace-nowrap text-red-500 hover:bg-red-50"
          >
            Reset
          </button>
        )}
      </div>
      {trailing && <div className="flex items-center gap-1.5 ml-auto shrink-0">{trailing}</div>}
    </div>
  );
}

function WidgetDayFilter({ days, onChange, loading = false, accent }) {
  return (
    <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-[#fafbfd]">
      <div className="flex items-center gap-1.5 shrink-0">
        <Filter className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Period</span>
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-none border border-slate-200 shrink-0">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className={`px-2 py-1 text-[10px] font-bold rounded-none transition-all duration-150 ${
                days === d ? 'bg-white text-[#1A55E3] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>
      {loading && (
        <div
          className="w-3.5 h-3.5 border-2 border-t-transparent border-blue-600 rounded-none animate-spin ml-auto shrink-0"
        />
      )}
    </div>
  );
}

function ReportChartArea({ accent, children }) {
  const ctx = useContext(ReportViewContext);
  return (
    <Box
      className={`${ctx?.isFullscreen ? 'flex-1 min-h-[calc(100vh-220px)] !mx-4 md:!mx-6 !mb-4 [&_svg]:!min-h-[min(560px,calc(100vh-280px))]' : ''}`}
      sx={{
        p: { xs: 1.5, md: 2.5 },
        bgcolor: '#ffffff',
        minHeight: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Box>
  );
}

function ChartEmptyState() {
  return (
    <div className="h-[240px] flex flex-col items-center justify-center text-slate-400">
      <div className="w-14 h-14 rounded-none bg-slate-100/80 flex items-center justify-center mb-3 border border-slate-200">
        <BarChart3 className="w-7 h-7 text-slate-300" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-slate-600">No chart data for this range</p>
      <p className="text-xs text-slate-400 mt-0.5">Try adjusting the date filter above</p>
    </div>
  );
}

function ReportWidgetHeader({ title, subtitle, icon: Icon, tint, primary, accent, trailing }) {
  const neon = getReportNeonStyles(accent || { primary, tint });
  const ctx = useContext(ReportViewContext);
  return (
    <Box
      sx={{
        px: { xs: 2.5, md: 3 },
        py: 1.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        borderBottom: '1px solid #f1f5f9',
        bgcolor: '#ffffff',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, minWidth: 0 }}>
        {Icon && (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              bgcolor: tint || '#f8fafc',
              border: `1px solid ${tint ? 'transparent' : '#e2e8f0'}`,
            }}
          >
            <Icon className="w-4 h-4" style={{ color: primary }} strokeWidth={2.25} />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.2, fontWeight: 500 }} noWrap>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, shrink: 0 }}>
        {trailing}
        {ctx && !ctx.isFullscreen && <ReportFullscreenExpandButton />}
      </Box>
    </Box>
  );
}

/** Thin footer row: formula (gray) + total badge (clean styling) */
function ReportWidgetFooter({ formula, total, totalLabel = 'Total', accent }) {
  if (total == null && !formula) return null;
  const neon = getReportNeonStyles(accent);
  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.25,
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        bgcolor: '#ffffff',
      }}
    >
      {formula && (
        <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
          {formula}
        </Typography>
      )}
      {total != null && (
        <Box
          sx={{
            ml: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            borderRadius: 0,
            border: '1px solid #e2e8f0',
            bgcolor: '#f8fafc',
          }}
        >
          <Typography component="span" sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {totalLabel}:
          </Typography>
          <Typography component="span" sx={{ fontSize: '0.775rem', fontWeight: 800, color: neon.primary, fontVariantNumeric: 'tabular-nums' }}>
            {total}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function ReportLegendRow({ accent, children }) {
  return (
    <div className="px-5 py-2 flex flex-wrap items-center gap-4 border-b border-slate-100 bg-[#fafbfd]">
      {children}
    </div>
  );
}

function renderSmoothBarChart({
  data,
  getValue,
  colorPrimary,
  colorGradientStop,
  barId,
  labelKey = 'period',
  hoverUnit = 'PKR',
  formatLabel = formatMonthLabel,
}) {
  if (!data?.length) return <ChartEmptyState />;

  const pL = 58;
  const pR = 20;
  const pT = 32;
  const pB = 46;
  const W = 640;
  const H = 250;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const n = data.length;
  const grpW = cW / n;
  const barW = Math.min(grpW * 0.48, 38);
  const values = data.map(getValue);
  const rawMax = Math.max(...values.map((v) => Math.abs(v || 0)), 0);
  const isAllZero = rawMax === 0;
  const maxV = isAllZero ? 100 : getNiceMax(rawMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="min-h-[250px] select-none">
      <defs>
        <linearGradient id={barId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorPrimary} stopOpacity="1" />
          <stop offset="65%" stopColor={colorGradientStop || colorPrimary} stopOpacity="0.85" />
          <stop offset="100%" stopColor={colorGradientStop || colorPrimary} stopOpacity="0.45" />
        </linearGradient>
        <filter id={`${barId}-shadow`} x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={colorPrimary} floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Modern translucent chart canvas */}
      <rect x={pL} y={pT} width={cW} height={cH} rx="0" fill="#fafbfd" stroke="#f1f5f9" strokeWidth="1" />

      {/* Grid horizontal guidelines */}
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = pT + cH * (1 - f);
        return (
          <g key={f}>
            <line
              x1={pL}
              y1={y}
              x2={W - pR}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {!isAllZero && (
              <text x={pL - 10} y={y + 3.5} fontSize="10.5" fill="#94a3b8" textAnchor="end" fontWeight="500">
                {fmtK(maxV * f)}
              </text>
            )}
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={pL} y1={pT + cH} x2={W - pR} y2={pT + cH} stroke="#cbd5e1" strokeWidth="1.25" strokeLinecap="square" />
      <text x={pL - 10} y={pT + cH + 3.5} fontSize="10.5" fill="#94a3b8" textAnchor="end" fontWeight="500">
        0
      </text>

      {/* Zero activity indicator watermark */}
      {isAllZero && (
        <g>
          <rect
            x={pL + (cW - 220) / 2}
            y={pT + (cH - 30) / 2}
            width="220"
            height="30"
            rx="0"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <text
            x={pL + cW / 2}
            y={pT + cH / 2 + 4}
            fontSize="11"
            fill="#94a3b8"
            textAnchor="middle"
            fontWeight="500"
          >
            No activity recorded in period
          </text>
        </g>
      )}

      {/* Bars & Labels */}
      {data.map((item, i) => {
        const val = getValue(item);
        const cx = pL + grpW * i + grpW / 2;
        const bx = cx - barW / 2;
        const bH = !isAllZero && val !== 0 ? Math.max((Math.abs(val) / maxV) * cH, 6) : 0;
        const lbl = item.label || formatLabel(item[labelKey]);
        const yTop = pT + cH - bH;
        return (
          <g key={i} className="cursor-pointer group">
            {!isAllZero && val !== 0 ? (
              <>
                {/* Main bar */}
                <rect
                  x={bx}
                  y={yTop}
                  width={barW}
                  height={bH}
                  rx="0"
                  fill={`url(#${barId})`}
                  filter={`url(#${barId}-shadow)`}
                >
                  <title>{`${lbl}: ${hoverUnit} ${val.toLocaleString()}`}</title>
                </rect>

                {/* Top illuminated highlight cap */}
                {bH > 6 && (
                  <rect
                    x={bx + 2}
                    y={yTop}
                    width={Math.max(barW - 4, 1)}
                    height="3"
                    rx="0"
                    fill="#ffffff"
                    opacity="0.65"
                  />
                )}

                {/* Value text badge */}
                <text
                  x={cx}
                  y={yTop - 6}
                  fontSize="10"
                  fill={colorPrimary}
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {fmtK(val)}
                </text>
              </>
            ) : (
              <line x1={cx} y1={pT + cH - 3} x2={cx} y2={pT + cH + 3} stroke="#cbd5e1" strokeWidth="1.25" />
            )}

            {/* X-axis label */}
            <text x={cx} y={H - 12} fontSize="10.5" fill="#64748b" textAnchor="middle" fontWeight="600">
              {lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function renderGroupedBarChart({ chartId, labels, series, formatValue = fmtK }) {
  if (!labels?.length) return <ChartEmptyState />;

  const pL = 58;
  const pR = 16;
  const pT = 32;
  const pB = 46;
  const W = 640;
  const H = 250;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const n = labels.length;
  const grpW = cW / n;
  const barW = Math.min(grpW / (series.length + 1.2), 22);
  const rawMax = Math.max(...series.flatMap((s) => s.values.map((v) => Math.abs(v || 0))), 0);
  const isAllZero = rawMax === 0;
  const maxV = isAllZero ? 100 : getNiceMax(rawMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="min-h-[250px] select-none">
      <defs>
        {series.map((s) => (
          <linearGradient key={s.key} id={`${chartId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.primary} stopOpacity="1" />
            <stop offset="100%" stopColor={s.gradient || s.primary} stopOpacity="0.5" />
          </linearGradient>
        ))}
      </defs>

      {/* Modern translucent chart canvas */}
      <rect x={pL} y={pT} width={cW} height={cH} rx="0" fill="#fafbfd" stroke="#f1f5f9" strokeWidth="1" />

      {/* Grid horizontal guidelines */}
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = pT + cH * (1 - f);
        return (
          <g key={f}>
            <line
              x1={pL}
              y1={y}
              x2={W - pR}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {!isAllZero && (
              <text x={pL - 10} y={y + 3.5} fontSize="10.5" fill="#94a3b8" textAnchor="end" fontWeight="500">
                {formatValue(maxV * f)}
              </text>
            )}
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={pL} y1={pT + cH} x2={W - pR} y2={pT + cH} stroke="#cbd5e1" strokeWidth="1.25" strokeLinecap="square" />
      <text x={pL - 10} y={pT + cH + 3.5} fontSize="10.5" fill="#94a3b8" textAnchor="end" fontWeight="500">
        0
      </text>

      {/* Zero activity indicator watermark */}
      {isAllZero && (
        <g>
          <rect
            x={pL + (cW - 220) / 2}
            y={pT + (cH - 30) / 2}
            width="220"
            height="30"
            rx="0"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <text
            x={pL + cW / 2}
            y={pT + cH / 2 + 4}
            fontSize="11"
            fill="#94a3b8"
            textAnchor="middle"
            fontWeight="500"
          >
            No activity recorded in period
          </text>
        </g>
      )}

      {/* Grouped series bars */}
      {labels.map((lbl, i) => {
        const cx = pL + grpW * i + grpW / 2;
        const groupW = series.length * barW + (series.length - 1) * 4;
        let x = cx - groupW / 2;
        return (
          <g key={lbl} className="cursor-pointer">
            {series.map((s) => {
              const val = s.values[i] || 0;
              const bH = !isAllZero && val > 0 ? Math.max((val / maxV) * cH, 5) : 0;
              const yTop = pT + cH - bH;
              const rect = (
                <g key={s.key}>
                  {bH > 0 ? (
                    <>
                      <rect
                        x={x}
                        y={yTop}
                        width={barW}
                        height={bH}
                        rx="0"
                        fill={`url(#${chartId}-${s.key})`}
                      >
                        <title>{`${s.name} ${lbl}: ${formatValue(val)}`}</title>
                      </rect>
                      {bH > 5 && (
                        <rect
                          x={x + 1}
                          y={yTop}
                          width={Math.max(barW - 2, 1)}
                          height="2.5"
                          rx="0"
                          fill="#ffffff"
                          opacity="0.6"
                        />
                      )}
                    </>
                  ) : (
                    <line x1={x + barW / 2} y1={pT + cH - 3} x2={x + barW / 2} y2={pT + cH + 3} stroke="#cbd5e1" strokeWidth="1" />
                  )}
                </g>
              );
              x += barW + 4;
              return rect;
            })}
            <text x={cx} y={H - 12} fontSize="10.5" fill="#64748b" textAnchor="middle" fontWeight="600">
              {lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function renderRankingBarChart({ rows, color, gradient, gradId, loading, emptyLabel = 'No data available' }) {
  const n = Math.min(rows.length, 15);
  if (n === 0) {
    return (
      <div className="h-[270px] flex items-center justify-center text-slate-400 text-sm">
        {loading ? (
          <div className="w-8 h-8 border-2 border-[#1A55E3] border-t-transparent rounded-full animate-spin" />
        ) : (
          emptyLabel
        )}
      </div>
    );
  }

  const pL = 58;
  const pR = 20;
  const pT = 28;
  const pB = 96;
  const W = 1200;
  const H = 290;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const grpW = cW / n;
  const barW = Math.min(grpW * 0.52, 52);
  const rawMax = Math.max(...rows.slice(0, n).map((r) => Math.abs(r.balance || 0)), 0);
  const isAllZero = rawMax === 0;
  const maxV = isAllZero ? 100 : getNiceMax(rawMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="min-h-[270px] select-none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="70%" stopColor={gradient || color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={gradient || color} stopOpacity="0.4" />
        </linearGradient>
        <filter id={`${gradId}-shadow`} x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor={color} floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Modern translucent chart canvas */}
      <rect x={pL} y={pT} width={cW} height={cH} rx="0" fill="#fafbfd" stroke="#f1f5f9" strokeWidth="1" />

      {/* Guidelines */}
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = pT + cH * (1 - f);
        return (
          <g key={f}>
            <line
              x1={pL}
              y1={y}
              x2={W - pR}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {!isAllZero && (
              <text x={pL - 10} y={y + 3.5} fontSize="11" fill="#94a3b8" textAnchor="end" fontWeight="500">
                {fmtK(maxV * f)}
              </text>
            )}
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={pL} y1={pT + cH} x2={W - pR} y2={pT + cH} stroke="#cbd5e1" strokeWidth="1.25" strokeLinecap="square" />
      <text x={pL - 10} y={pT + cH + 3.5} fontSize="10.5" fill="#94a3b8" textAnchor="end" fontWeight="500">
        0
      </text>

      {/* Zero activity indicator watermark */}
      {isAllZero && (
        <g>
          <rect
            x={pL + (cW - 220) / 2}
            y={pT + (cH - 30) / 2}
            width="220"
            height="30"
            rx="0"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <text
            x={pL + cW / 2}
            y={pT + cH / 2 + 4}
            fontSize="11"
            fill="#94a3b8"
            textAnchor="middle"
            fontWeight="500"
          >
            No activity recorded in period
          </text>
        </g>
      )}

      {/* Ranking Bars */}
      {rows.slice(0, n).map((r, i) => {
        const cx = pL + grpW * i + grpW / 2;
        const bH = !isAllZero && r.balance > 0 ? Math.max((r.balance / maxV) * cH, 5) : 0;
        const bx = cx - barW / 2;
        const yTop = pT + cH - bH;
        const shortName = r.name.length > 15 ? `${r.name.slice(0, 14)}…` : r.name;
        const isTop3 = i < 3;

        return (
          <g key={i} className="cursor-pointer group">
            {bH > 0 ? (
              <>
                <rect
                  x={bx}
                  y={yTop}
                  width={barW}
                  height={bH}
                  rx="0"
                  fill={`url(#${gradId})`}
                  filter={`url(#${gradId}-shadow)`}
                >
                  <title>{`${r.name}: PKR ${Number(r.balance || 0).toLocaleString()}${r.qty != null ? ` · Qty ${formatQty(r.qty)}` : ''}${r.invoices != null ? ` · ${r.invoices} bills` : ''}`}</title>
                </rect>

                {/* Top illuminated highlight cap */}
                {bH > 6 && (
                  <rect
                    x={bx + 2}
                    y={yTop}
                    width={Math.max(barW - 4, 1)}
                    height="3"
                    rx="0"
                    fill="#ffffff"
                    opacity="0.65"
                  />
                )}

                {/* Value above bar */}
                <text
                  x={cx}
                  y={yTop - 6}
                  fontSize="10"
                  fill={color}
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {fmtK(r.balance)}
                </text>

                {/* Top 3 rank badge marker */}
                {isTop3 && (
                  <g>
                    <circle cx={cx} cy={yTop + 14} r="8" fill="#ffffff" opacity="0.85" />
                    <text x={cx} y={yTop + 17.5} fontSize="9" fill={color} textAnchor="middle" fontWeight="800">
                      {i + 1}
                    </text>
                  </g>
                )}
              </>
            ) : (
              <line x1={cx} y1={pT + cH - 3} x2={cx} y2={pT + cH + 3} stroke="#cbd5e1" strokeWidth="1.25" />
            )}

            {/* Angled account label */}
            <text
              x={cx}
              y={pT + cH + 14}
              fontSize="11"
              fill="#475569"
              fontWeight="600"
              textAnchor="end"
              transform={`rotate(-36,${cx},${pT + cH + 14})`}
            >
              {shortName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Responsive grid: 1 = full width, 2 = half/half, 3+ = pairs with last row full width when odd */
function renderAnalyticsGrid(items) {
  const list = items.filter(Boolean);
  const count = list.length;
  if (count === 0) return null;
  const gridClass = count <= 1 ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-4';
  const lastSpansFull = count > 1 && count % 2 === 1;
  return (
    <div className={gridClass}>
      {list.map((item, i) => (
        <div key={item.key} className={lastSpansFull && i === count - 1 ? 'lg:col-span-2' : undefined}>
          {item.node}
        </div>
      ))}
    </div>
  );
}

const ALL_QUICK_ACTIONS = [
  { title: 'New Sale', icon: ShoppingCart, palette: 'green', path: '/dashboard/sales?view=create' },
  { title: 'New Purchase', icon: ShoppingBag, palette: 'blue', path: '/dashboard/purchases' },
  { title: 'Orders List', icon: ListOrdered, palette: 'yellow', path: '/dashboard/orders' },
  { title: 'Add Product', icon: Package, palette: 'cyan', path: '/dashboard/products' },
  { title: 'Add Customer', icon: Users, palette: 'periwinkle', path: '/dashboard/customers' },
  { title: 'Hold Bills', icon: ClipboardList, palette: 'orange', path: '/dashboard/hold-bills' },
  { title: 'Stock Transfer', icon: ArrowLeftRight, palette: 'cyan', path: '/dashboard/stock-transfer' },
  { title: 'Store Stock', icon: Warehouse, palette: 'slate', path: '/dashboard/store-stock' },
  { title: 'Expenses', icon: DollarSign, palette: 'pink', path: '/dashboard/expenses' },
  { title: 'Ledger', icon: FileText, palette: 'periwinkle', path: '/dashboard/finance' },
  { title: 'View Reports', icon: TrendingUp, palette: 'pink', path: '/dashboard/reports' },
  { title: 'Sale Return', icon: RotateCcw, palette: 'green', path: '/dashboard/sales?view=create&type=return' },
  { title: 'Purchase Return', icon: TrendingDown, palette: 'blue', path: '/dashboard/purchases?view=create&type=return' },
  { title: 'Quotations', icon: ScrollText, palette: 'blue', path: '/dashboard/quotations' },
  { title: 'Sales List', icon: Receipt, palette: 'green', path: '/dashboard/sales' },
  { title: 'Journal', icon: BookOpen, palette: 'periwinkle', path: '/dashboard/journal' },
  { title: 'Day End', icon: Clock, palette: 'cyan', path: '/dashboard/day-end' },
];

const ALL_QUICK_ENTRY_ACTIONS = [
  { title: 'New Purchase Bill', subtitle: 'Record supplier purchase', icon: ShoppingBag, tone: 'blue', path: '/dashboard/purchases' },
  { title: 'Direct Sale Invoice', subtitle: 'Create customer sale', icon: ShoppingCart, tone: 'green', path: '/dashboard/sales?view=create' },
  { title: 'Day End / Closing', subtitle: 'Close business day', icon: Clock, tone: 'neutral', path: '/dashboard/day-end' },
  { title: 'Inventory Check', subtitle: 'View store stock levels', icon: Warehouse, tone: 'neutral', path: '/dashboard/store-stock' },
];

function readDashboardUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function DashboardContent({ activeTab }) {
  const router = useRouter();
  const [dashboardUser, setDashboardUser] = useState(null);
  const [permVersion, setPermVersion] = useState(0);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivityData, setRecentActivityData] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allCustomerTypes, setAllCustomerTypes] = useState([]);

  const [kpiFilters, setKpiFilters] = useState(last30DaysFilter);

  const [monthEndReceiveFilters, setMonthEndReceiveFilters] = useState(() => ({ ...lastNCalendarMonthsFilter(6), cusTypeId: '' }));
  const [monthEndPayFilters, setMonthEndPayFilters] = useState(() => ({ ...lastNCalendarMonthsFilter(6), cusTypeId: '' }));
  const [monthlyProfitFilters, setMonthlyProfitFilters] = useState(() => buildMonthChartPreset(3));
  const [monthlySalesFilters, setMonthlySalesFilters] = useState(() => buildMonthChartPreset(3));
  const [monthlyCreditData, setMonthlyCreditData] = useState([]);
  const [monthlyDebitData, setMonthlyDebitData] = useState([]);
  const [monthlyProfitData, setMonthlyProfitData] = useState([]);
  const [monthlySalesData, setMonthlySalesData] = useState([]);
  const [monthEndReceiveLoading, setMonthEndReceiveLoading] = useState(false);
  const [monthEndPayLoading, setMonthEndPayLoading] = useState(false);
  const [monthlyProfitLoading, setMonthlyProfitLoading] = useState(false);
  const [monthlySalesLoading, setMonthlySalesLoading] = useState(false);

  const [customerBalanceFilters, setCustomerBalanceFilters] = useState({ ...last30DaysFilter(), cusCatId: '' });
  const [supplierBalanceFilters, setSupplierBalanceFilters] = useState({ ...last30DaysFilter(), supCatId: '' });
  const [customerBalanceData, setCustomerBalanceData] = useState([]);
  const [supplierBalanceData, setSupplierBalanceData] = useState([]);
  const [customerBalanceLoading, setCustomerBalanceLoading] = useState(false);
  const [supplierBalanceLoading, setSupplierBalanceLoading] = useState(false);

  const [topCustomersSaleFilters, setTopCustomersSaleFilters] = useState(() => ({
    ...last30DaysFilter(),
    cusCatId: '',
    cusTypeId: '',
  }));
  const [topProductsSaleFilters, setTopProductsSaleFilters] = useState(last30DaysFilter);
  const [topCustomersSaleData, setTopCustomersSaleData] = useState([]);
  const [topProductsSaleData, setTopProductsSaleData] = useState([]);
  const [topCustomersSaleLoading, setTopCustomersSaleLoading] = useState(false);
  const [topProductsSaleLoading, setTopProductsSaleLoading] = useState(false);

  const [rawSalesList, setRawSalesList] = useState([]);
  const [weeklyDataLoading, setWeeklyDataLoading] = useState(false);
  const [salesOverviewDays, setSalesOverviewDays] = useState(30);
  const [transactionsOverviewDays, setTransactionsOverviewDays] = useState(30);

  const [recentActivityLimit, setRecentActivityLimit] = useState(5);
  const [lowStockData, setLowStockData] = useState({
    items: [],
    count: 0,
    out_of_stock: 0,
    low_stock: 0,
  });
  const [lowStockLoading, setLowStockLoading] = useState(true);

  useEffect(() => {
    setDashboardUser(readDashboardUser());
    const onUserUpdated = () => setDashboardUser(readDashboardUser());
    const onPermissionsUpdated = (e) => {
      const next = e?.detail || readDashboardUser();
      if (next?.user_id) setDashboardUser(next);
      setPermVersion((v) => v + 1);
    };
    const onRoleMapUpdated = () => {
      setDashboardUser(readDashboardUser());
      setPermVersion((v) => v + 1);
    };
    window.addEventListener('storage', onUserUpdated);
    window.addEventListener('branch-changed', onUserUpdated);
    window.addEventListener('user-permissions-updated', onPermissionsUpdated);
    window.addEventListener('role-permissions-updated', onRoleMapUpdated);
    return () => {
      window.removeEventListener('storage', onUserUpdated);
      window.removeEventListener('branch-changed', onUserUpdated);
      window.removeEventListener('user-permissions-updated', onPermissionsUpdated);
      window.removeEventListener('role-permissions-updated', onRoleMapUpdated);
    };
  }, []);

  const analyticsWidgets = useMemo(() => {
    if (!dashboardUser) {
      return {
        kpi: false,
        monthlyCredit: false,
        monthlyDebit: false,
        monthlyProfit: false,
        monthlySales: false,
        salesOverview: false,
        transactionsOverview: false,
        customerBalance: false,
        supplierBalance: false,
        topCustomersSale: false,
        topProductsSale: false,
        recentActivity: false,
        any: false,
        anyMonthlyChart: false,
        anyWeeklyChart: false,
        anyBalanceChart: false,
        anyTopSaleChart: false,
      };
    }
    const w = (id) => hasDashboardWidgetAccess(dashboardUser, id);
    const monthlyCredit = w('dashboard-monthly-credit');
    const monthlyDebit = w('dashboard-monthly-debit');
    const monthlyProfit = w('dashboard-monthly-profit');
    const monthlySales = w('dashboard-monthly-sales');
    const salesOverview = w('dashboard-sales-overview');
    const transactionsOverview = w('dashboard-transactions-overview');
    const customerBalance = w('dashboard-customer-balance');
    const supplierBalance = w('dashboard-supplier-balance');
    const topCustomersSale = w('dashboard-top-customers-sale');
    const topProductsSale = w('dashboard-top-products-sale');
    const recentActivity = w('dashboard-recent-activity');
    const kpi = w('dashboard-kpi');
    return {
      kpi,
      monthlyCredit,
      monthlyDebit,
      monthlyProfit,
      monthlySales,
      salesOverview,
      transactionsOverview,
      customerBalance,
      supplierBalance,
      topCustomersSale,
      topProductsSale,
      recentActivity,
      any: canViewAnyDashboardAnalytics(dashboardUser),
      anyMonthlyChart: monthlyCredit || monthlyDebit || monthlyProfit || monthlySales,
      anyWeeklyChart: salesOverview || transactionsOverview,
      anyBalanceChart: customerBalance || supplierBalance,
      anyTopSaleChart: topCustomersSale || topProductsSale,
    };
  }, [dashboardUser, permVersion]);

  const showLowStockSection = useMemo(
    () => canViewDashboardLowStock(dashboardUser),
    [dashboardUser, permVersion]
  );

  const quickActions = useMemo(
    () => filterDashboardShortcuts(dashboardUser, ALL_QUICK_ACTIONS),
    [dashboardUser, permVersion]
  );

  const quickEntryActions = useMemo(
    () => filterDashboardShortcuts(dashboardUser, ALL_QUICK_ENTRY_ACTIONS),
    [dashboardUser, permVersion]
  );

  const fetchMonthlyWidget = async (filters, setRows, setLoading, key) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);
      if (filters.cusTypeId) params.set('cusTypeId', filters.cusTypeId);
      if (key === 'monthlyProfit' || key === 'monthlySales') {
        params.set('chartGrain', 'month');
      }
      if (key === 'monthlyCredit' || key === 'monthlyDebit') {
        params.set('ledgerGrain', 'month');
        params.set('ledgerSeries', 'outstanding');
      }
      const res = await fetch(`/api/dashboard/monthly-analytics?${params}`);
      const text = await res.text();
      if (!text?.trim()) {
        console.error(`Error fetching ${key}: empty response (HTTP ${res.status})`);
        return;
      }
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.error(`Error fetching ${key}: invalid JSON (HTTP ${res.status})`, text.slice(0, 120));
        return;
      }
      if (!res.ok || !json?.success) {
        console.warn(`[Dashboard] Could not fetch ${key}:`, json?.error || `HTTP ${res.status}`);
        setRows([]);
        return;
      }
      setRows(json.data?.[key] || []);
    } catch (err) {
      console.warn(`[Dashboard] Error fetching ${key}:`, err?.message || err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch KPI summary cards (own date filter)
  useEffect(() => {
    if (activeTab !== 'dashboard' || !analyticsWidgets.kpi) return;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (kpiFilters.fromDate) params.set('fromDate', kpiFilters.fromDate);
        if (kpiFilters.toDate) params.set('toDate', kpiFilters.toDate);
        const qs = params.toString();
        const response = await fetch(`/api/dashboard${qs ? `?${qs}` : ''}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) setAnalyticsData(result.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [activeTab, analyticsWidgets.kpi, kpiFilters]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !analyticsWidgets.monthlyCredit) return;

    const loadMonthEndReceive = async () => {
      setMonthEndReceiveLoading(true);
      try {
        const params = new URLSearchParams();
        if (monthEndReceiveFilters.fromDate) params.set('fromDate', monthEndReceiveFilters.fromDate);
        if (monthEndReceiveFilters.toDate) params.set('toDate', monthEndReceiveFilters.toDate);
        if (monthEndReceiveFilters.cusTypeId) params.set('cusTypeId', monthEndReceiveFilters.cusTypeId);
        params.set('ledgerGrain', 'month');
        params.set('ledgerSeries', 'outstanding');
        const res = await fetch(`/api/dashboard/monthly-analytics?${params}`);
        const json = res.ok ? await res.json() : null;
        if (json?.success) {
          setMonthlyCreditData(json.data?.monthEndToReceive || json.data?.monthlyCredit || []);
        }
      } catch (err) {
        console.error('Error fetching month-end receive:', err);
      } finally {
        setMonthEndReceiveLoading(false);
      }
    };

    loadMonthEndReceive();
  }, [activeTab, analyticsWidgets.monthlyCredit, monthEndReceiveFilters]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !analyticsWidgets.monthlyDebit) return;

    const loadMonthEndPay = async () => {
      setMonthEndPayLoading(true);
      try {
        const params = new URLSearchParams();
        if (monthEndPayFilters.fromDate) params.set('fromDate', monthEndPayFilters.fromDate);
        if (monthEndPayFilters.toDate) params.set('toDate', monthEndPayFilters.toDate);
        params.set('ledgerGrain', 'month');
        params.set('ledgerSeries', 'outstanding');
        const res = await fetch(`/api/dashboard/monthly-analytics?${params}`);
        const json = res.ok ? await res.json() : null;
        if (json?.success) {
          setMonthlyDebitData(json.data?.monthEndToPay || json.data?.monthlyDebit || []);
        }
      } catch (err) {
        console.error('Error fetching month-end pay:', err);
      } finally {
        setMonthEndPayLoading(false);
      }
    };

    loadMonthEndPay();
  }, [activeTab, analyticsWidgets.monthlyDebit, monthEndPayFilters]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !analyticsWidgets.monthlyProfit) return;
    fetchMonthlyWidget(monthlyProfitFilters, setMonthlyProfitData, setMonthlyProfitLoading, 'monthlyProfit');
  }, [activeTab, analyticsWidgets.monthlyProfit, monthlyProfitFilters]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !analyticsWidgets.monthlySales) return;
    fetchMonthlyWidget(monthlySalesFilters, setMonthlySalesData, setMonthlySalesLoading, 'monthlySales');
  }, [activeTab, analyticsWidgets.monthlySales, monthlySalesFilters]);

  // Fetch low stock alerts
  useEffect(() => {
    if (activeTab !== 'dashboard' || !showLowStockSection) return;

    const fetchLowStock = async () => {
      try {
        setLowStockLoading(true);
        const res = await fetch('/api/dashboard/low-stock', { cache: 'no-store' });
        const json = res.ok ? await res.json() : null;
        if (json?.success) {
          setLowStockData({
            items: json.items || [],
            count: json.count || 0,
            out_of_stock: json.out_of_stock || 0,
            low_stock: json.low_stock || 0,
          });
        }
      } catch (err) {
        console.error('Error fetching low stock alerts:', err);
      } finally {
        setLowStockLoading(false);
      }
    };

    fetchLowStock();
    const interval = setInterval(fetchLowStock, 60000);
    return () => clearInterval(interval);
  }, [activeTab, showLowStockSection]);

  // Fetch sales for weekly charts + recent activity
  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    if (!analyticsWidgets.recentActivity && !analyticsWidgets.anyWeeklyChart) return;

    const fetchRecentData = async () => {
      setWeeklyDataLoading(true);
      try {
        const salesRes = await fetch('/api/sales?list=true&slim=true&limit=3000');
        const salesDataRaw = salesRes.ok ? await salesRes.json() : [];
        const salesList = Array.isArray(salesDataRaw) ? salesDataRaw : (salesDataRaw.data || []);
        setRawSalesList(salesList);

        if (analyticsWidgets.recentActivity) {
          const purchasesRes = await fetch('/api/purchases?limit=20');
          const purchasesData = purchasesRes.ok ? await purchasesRes.json() : [];
          const activities = [];

          salesList.slice(0, Math.ceil(recentActivityLimit * 0.6)).forEach((sale) => {
            activities.push({
              id: `sale-${sale.sale_id}`,
              action: `Sale #${sale.sale_id}`,
              customer: sale.customer?.cus_name || 'Customer',
              amount: fmtAmt(sale.total_amount),
              time: formatDatePK(sale.created_at),
              status: 'success',
              ts: new Date(sale.created_at).getTime(),
            });
          });

          const purchases = Array.isArray(purchasesData) ? purchasesData : (purchasesData.data || []);
          purchases.slice(0, Math.ceil(recentActivityLimit * 0.4)).forEach((purchase) => {
            activities.push({
              id: `purchase-${purchase.pur_id}`,
              action: `Purchase #${purchase.pur_id}`,
              customer: purchase.customer?.cus_name || 'Supplier',
              amount: fmtAmt(purchase.total_amount),
              time: formatDatePK(purchase.created_at),
              status: 'info',
              ts: new Date(purchase.created_at).getTime(),
            });
          });

          activities.sort((a, b) => b.ts - a.ts);
          setRecentActivityData(activities.slice(0, recentActivityLimit));
        }
      } catch (error) {
        console.error('Error fetching recent data:', error);
      } finally {
        setWeeklyDataLoading(false);
      }
    };

    fetchRecentData();
    const interval = setInterval(fetchRecentData, 60000);
    return () => clearInterval(interval);
  }, [
    activeTab,
    analyticsWidgets.recentActivity,
    analyticsWidgets.anyWeeklyChart,
    analyticsWidgets.salesOverview,
    analyticsWidgets.transactionsOverview,
    recentActivityLimit,
    salesOverviewDays,
    transactionsOverviewDays,
  ]);

  const salesOverviewChart = useMemo(
    () => buildWeeklyChartData(rawSalesList, salesOverviewDays),
    [rawSalesList, salesOverviewDays]
  );

  const transactionsOverviewChart = useMemo(
    () => buildWeeklyChartData(rawSalesList, transactionsOverviewDays),
    [rawSalesList, transactionsOverviewDays]
  );

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    const needCategories =
      analyticsWidgets.anyBalanceChart || analyticsWidgets.topCustomersSale;
    const needTypes = analyticsWidgets.topCustomersSale || analyticsWidgets.monthlyCredit;
    if (!needCategories && !needTypes) return;

    if (needCategories) {
      fetch('/api/customer-category')
        .then((r) => (r.ok ? r.json() : []))
        .then((cats) => setAllCategories(Array.isArray(cats) ? cats : []))
        .catch(() => {});
    }
    if (needTypes) {
      fetch('/api/customer-types')
        .then((r) => (r.ok ? r.json() : []))
        .then((types) => setAllCustomerTypes(Array.isArray(types) ? types : []))
        .catch(() => {});
    }
  }, [activeTab, analyticsWidgets.anyBalanceChart, analyticsWidgets.topCustomersSale]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !analyticsWidgets.customerBalance) return;
    const fetchCustomerBalance = async () => {
      setCustomerBalanceLoading(true);
      try {
        const params = new URLSearchParams();
        if (customerBalanceFilters.fromDate) params.set('fromDate', customerBalanceFilters.fromDate);
        if (customerBalanceFilters.toDate) params.set('toDate', customerBalanceFilters.toDate);
        if (customerBalanceFilters.cusCatId) params.set('cusCatId', customerBalanceFilters.cusCatId);
        const res = await fetch(`/api/dashboard/balance-chart?${params}`);
        const json = res.ok ? await res.json() : null;
        if (json?.success) setCustomerBalanceData(json.customers || []);
      } catch (err) {
        console.error('Error fetching customer balance:', err);
      } finally {
        setCustomerBalanceLoading(false);
      }
    };
    fetchCustomerBalance();
  }, [activeTab, analyticsWidgets.customerBalance, customerBalanceFilters]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !analyticsWidgets.supplierBalance) return;
    const fetchSupplierBalance = async () => {
      setSupplierBalanceLoading(true);
      try {
        const params = new URLSearchParams();
        if (supplierBalanceFilters.fromDate) params.set('fromDate', supplierBalanceFilters.fromDate);
        if (supplierBalanceFilters.toDate) params.set('toDate', supplierBalanceFilters.toDate);
        if (supplierBalanceFilters.supCatId) params.set('supCatId', supplierBalanceFilters.supCatId);
        const res = await fetch(`/api/dashboard/balance-chart?${params}`);
        const json = res.ok ? await res.json() : null;
        if (json?.success) setSupplierBalanceData(json.suppliers || []);
      } catch (err) {
        console.error('Error fetching supplier balance:', err);
      } finally {
        setSupplierBalanceLoading(false);
      }
    };
    fetchSupplierBalance();
  }, [activeTab, analyticsWidgets.supplierBalance, supplierBalanceFilters]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !analyticsWidgets.topCustomersSale) return;
    const fetchTopCustomers = async () => {
      setTopCustomersSaleLoading(true);
      try {
        const params = new URLSearchParams();
        if (topCustomersSaleFilters.fromDate) params.set('fromDate', topCustomersSaleFilters.fromDate);
        if (topCustomersSaleFilters.toDate) params.set('toDate', topCustomersSaleFilters.toDate);
        if (topCustomersSaleFilters.cusCatId) params.set('cusCatId', topCustomersSaleFilters.cusCatId);
        if (topCustomersSaleFilters.cusTypeId) params.set('cusTypeId', topCustomersSaleFilters.cusTypeId);
        const res = await fetch(`/api/dashboard/top-sales?${params}`);
        const json = res.ok ? await res.json() : null;
        if (json?.success) setTopCustomersSaleData(json.customers || []);
      } catch (err) {
        console.error('Error fetching top customers by sale:', err);
      } finally {
        setTopCustomersSaleLoading(false);
      }
    };
    fetchTopCustomers();
  }, [activeTab, analyticsWidgets.topCustomersSale, topCustomersSaleFilters]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !analyticsWidgets.topProductsSale) return;
    const fetchTopProducts = async () => {
      setTopProductsSaleLoading(true);
      try {
        const params = new URLSearchParams();
        if (topProductsSaleFilters.fromDate) params.set('fromDate', topProductsSaleFilters.fromDate);
        if (topProductsSaleFilters.toDate) params.set('toDate', topProductsSaleFilters.toDate);
        const res = await fetch(`/api/dashboard/top-sales?${params}`);
        const json = res.ok ? await res.json() : null;
        if (json?.success) setTopProductsSaleData(json.products || []);
      } catch (err) {
        console.error('Error fetching top products by sale:', err);
      } finally {
        setTopProductsSaleLoading(false);
      }
    };
    fetchTopProducts();
  }, [activeTab, analyticsWidgets.topProductsSale, topProductsSaleFilters]);

  useEffect(() => {
    if (activeTab === 'usermanagement') {
      router.push('/dashboard/usermanagement');
    } else if (activeTab === 'customercategory') {
      router.push('/dashboard/customercategory');
    } else if (activeTab === 'activity-logs') {
      router.push('/dashboard/activity-logs');
    }
  }, [activeTab, router]);

  if (activeTab === 'usermanagement' || activeTab === 'customercategory' || activeTab === 'activity-logs') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return fmtAmt(num);
  };

  const kpiData = analyticsData ? [
    {
      title: 'Total Sales',
      value: formatNumber(analyticsData.totalSales.value),
      change: `${analyticsData.totalSales.changeType === 'positive' ? '+' : ''}${analyticsData.totalSales.change}%`,
      changeType: analyticsData.totalSales.changeType,
      icon: DollarSign,
      theme: 'green',
    },
    {
      title: 'Total Orders',
      value: analyticsData.totalOrders.value,
      change: `${analyticsData.totalOrders.changeType === 'positive' ? '+' : ''}${analyticsData.totalOrders.change}%`,
      changeType: analyticsData.totalOrders.changeType,
      icon: ShoppingCart,
      theme: 'blue',
    },
    {
      title: 'Active Customers',
      value: analyticsData.activeCustomers.value,
      change: `${analyticsData.activeCustomers.changeType === 'positive' ? '+' : ''}${analyticsData.activeCustomers.change}%`,
      changeType: analyticsData.activeCustomers.changeType,
      icon: Users,
      theme: 'periwinkle',
    },
    {
      title: 'Total Products',
      value: analyticsData.totalProducts.value,
      change: `${analyticsData.totalProducts.changeType === 'positive' ? '+' : ''}${analyticsData.totalProducts.change}%`,
      changeType: analyticsData.totalProducts.changeType,
      icon: Package,
      theme: 'cyan',
    }
  ] : [
    {
      title: 'Total Sales',
      value: '0.00',
      change: '0.0%',
      changeType: 'positive',
      icon: DollarSign,
      theme: 'green',
    },
    {
      title: 'Total Orders',
      value: '0',
      change: '0.0%',
      changeType: 'positive',
      icon: ShoppingCart,
      theme: 'blue',
    },
    {
      title: 'Active Customers',
      value: '0',
      change: '0.0%',
      changeType: 'positive',
      icon: Users,
      theme: 'periwinkle',
    },
    {
      title: 'Total Products',
      value: '0',
      change: '0.0%',
      changeType: 'positive',
      icon: Package,
      theme: 'cyan',
    }
  ];

  const handleQuickActionClick = (path) => {
    if (!path) return;
    try {
      router.push(path);
    } catch (error) {
      window.location.href = path;
    }
  };

  const monthEndReceiveRows = useMemo(
    () =>
      monthlyCreditData.map((row) => ({
        period: row.period,
        label: row.label || row.period,
        asOfDate: row.asOfDate || '',
        amount: row.amount ?? row.toReceive ?? 0,
      })),
    [monthlyCreditData]
  );

  const monthEndPayRows = useMemo(
    () =>
      monthlyDebitData.map((row) => ({
        period: row.period,
        label: row.label || row.period,
        asOfDate: row.asOfDate || '',
        amount: row.amount ?? row.toPay ?? 0,
      })),
    [monthlyDebitData]
  );

  if (activeTab === 'dashboard') {
    const monthlySalesList = monthlySalesData;
    const monthlyProfitList = monthlyProfitData;

    const latestReceiveRow = monthEndReceiveRows[monthEndReceiveRows.length - 1];
    const latestPayRow = monthEndPayRows[monthEndPayRows.length - 1];
    const totalCreditVal = latestReceiveRow?.amount ?? 0;
    const totalDebitVal = latestPayRow?.amount ?? 0;
    const totalSalesVal = monthlySalesList.reduce((s, i) => s + i.amount, 0);
    const totalProfitVal = monthlyProfitList.reduce((s, i) => s + i.profit, 0);
    const totalBillsOverview = salesOverviewChart.billAmounts.reduce((s, v) => s + v, 0);
    const totalOrdersOverview = salesOverviewChart.orderAmounts.reduce((s, v) => s + v, 0);
    const totalTxCount = transactionsOverviewChart.totalCounts.reduce((s, v) => s + v, 0);
    const totalOrderTxCount = transactionsOverviewChart.orderCounts.reduce((s, v) => s + v, 0);
    const customerBalanceTotal = customerBalanceData.slice(0, 15).reduce((s, r) => s + r.balance, 0);
    const supplierBalanceTotal = supplierBalanceData.slice(0, 15).reduce((s, r) => s + r.balance, 0);
    const topCustomersSaleTotal = topCustomersSaleData.slice(0, 15).reduce((s, r) => s + Number(r.amount || r.balance || 0), 0);
    const topProductsSaleTotal = topProductsSaleData.slice(0, 15).reduce((s, r) => s + Number(r.amount || r.balance || 0), 0);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
        {/* Welcome Hero Banner */}
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 0,
            background: 'linear-gradient(135deg, #090d16 0%, #0f172a 45%, #1e3a8a 100%)',
            color: '#ffffff',
            p: { xs: 2.5, md: 3.5 },
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15)',
          }}
        >
          <Box sx={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: 0, bgcolor: 'rgba(26, 85, 227, 0.22)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: 0, bgcolor: 'rgba(13, 202, 240, 0.16)', filter: 'blur(60px)', pointerEvents: 'none' }} />

          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2.5 }}>
            <Box>
              <Chip
                icon={<Box sx={{ width: 8, height: 8, borderRadius: 0, bgcolor: '#34d399', boxShadow: '0 0 8px #34d399', mr: -0.5 }} />}
                label="Zain Traders · Glass, Mirror & Aluminium Solutions"
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  color: '#bfdbfe',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 0,
                  backdropFilter: 'blur(8px)',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  mb: 1.5,
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.85rem' }, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Welcome back,{' '}
                <Box component="span" sx={{ background: 'linear-gradient(90deg, #93c5fd, #67e8f9, #ffffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {dashboardUser?.full_name || 'Administrator'}
                </Box>{' '}👋
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, maxWidth: 620, fontSize: '0.85rem', lineHeight: 1.5 }}>
                Real-time operations, inventory control, accounts & financial performance for Main Branch.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<ShoppingCart className="w-4 h-4" />}
                onClick={() => handleQuickActionClick('/dashboard/sales')}
                sx={{
                  background: 'linear-gradient(135deg, #1A55E3 0%, #2563EB 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  borderRadius: 0,
                  px: 2.5,
                  py: 1.1,
                  boxShadow: '0 4px 14px rgba(26, 85, 227, 0.35)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1347c4 0%, #1d4ed8 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 18px rgba(26, 85, 227, 0.45)',
                  },
                }}
              >
                New POS Sale
              </Button>
              <Button
                variant="outlined"
                startIcon={<BookOpen className="w-4 h-4" />}
                onClick={() => handleQuickActionClick('/dashboard/finance')}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  borderRadius: 0,
                  px: 2.2,
                  py: 1.1,
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.14)',
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Ledger & Accounts
              </Button>
            </Box>
          </Box>
        </Paper>

        {!analyticsWidgets.any && !analyticsWidgets.kpi && (
          <div className={`${CARD} p-5 md:p-6`}>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Overview</h3>
            <p className="text-sm text-slate-500 mt-1">
              Use the shortcuts below for your assigned modules. Analytics widgets can be assigned in User Management.
            </p>
          </div>
        )}

        {/* Modules + Quick Entry */}
        <Box sx={{ display: 'grid', gridTemplateColumns: quickEntryActions.length > 0 ? { xs: '1fr', xl: '1fr 300px' } : '1fr', gap: 2.5 }}>
          {/* Business Modules */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 0,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03), 0 6px 20px rgba(15, 23, 42, 0.04)',
            }}
          >
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #f1f5f9', bgcolor: '#fafbfd' }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                Business Modules
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.25, fontWeight: 500 }}>
                Shortcuts allowed for your role
              </Typography>
            </Box>
            <Box sx={{ p: { xs: 2, md: 2.5 }, bgcolor: '#ffffff' }}>
              {quickActions.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>No modules assigned to your account.</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.5 }}>Contact your administrator for access.</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)', xl: 'repeat(6, 1fr)', '2xl': 'repeat(7, 1fr)' }, gap: 1.5 }}>
                  {quickActions.map((action, index) => {
                    const p = SHORTCUT_PALETTE[action.palette] || SHORTCUT_PALETTE.blue;
                    return (
                      <Box
                        key={index}
                        onClick={() => handleQuickActionClick(action.path)}
                        sx={{
                          p: 2,
                          borderRadius: 0,
                          border: '1px solid #e2e8f0',
                          bgcolor: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1.25,
                          minHeight: 104,
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                          '&:hover': {
                            borderColor: '#93c5fd',
                            boxShadow: '0 8px 22px rgba(26, 85, 227, 0.08)',
                            transform: 'translateY(-3px)',
                            bgcolor: '#f8fafc',
                          },
                          '&:active': {
                            transform: 'scale(0.98)',
                          },
                        }}
                      >
                        <Box
                          className={p.iconBg}
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s ease',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                          }}
                        >
                          <action.icon className={`w-5 h-5 ${p.icon}`} strokeWidth={2.25} />
                        </Box>
                        <Typography sx={{ fontSize: '0.775rem', fontWeight: 700, color: '#334155', textAlign: 'center', lineHeight: 1.3 }}>
                          {action.title}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Card>

          {/* Quick Entry Panel */}
          {quickEntryActions.length > 0 && (
            <Card
              elevation={0}
              sx={{
                borderRadius: 0,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03), 0 6px 20px rgba(15, 23, 42, 0.04)',
              }}
            >
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9', bgcolor: '#fafbfd' }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Quick Entry
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.25, fontWeight: 500 }}>
                  High-priority actions
                </Typography>
              </Box>
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#ffffff' }}>
                {quickEntryActions.map((action, index) => {
                  const isPrimary = action.tone === 'blue' || action.tone === 'green';
                  const toneStyle = QUICK_ENTRY_TONES[action.tone] || QUICK_ENTRY_TONES.neutral;
                  return (
                    <Box
                      key={index}
                      onClick={() => handleQuickActionClick(action.path)}
                      className={toneStyle.className}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.75,
                        px: 2,
                        py: 1.6,
                        borderRadius: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          bgcolor: isPrimary ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                        }}
                      >
                        <action.icon className={`w-4 h-4 ${isPrimary ? 'text-white' : 'text-slate-600'}`} strokeWidth={2.25} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, lineHeight: 1.2, color: isPrimary ? '#ffffff' : '#0f172a' }}>
                          {action.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', mt: 0.25, color: isPrimary ? 'rgba(255, 255, 255, 0.85)' : '#64748b', noWrap: true }}>
                          {action.subtitle}
                        </Typography>
                      </Box>
                      {!isPrimary && (
                        <ArrowForwardIcon sx={{ fontSize: 16, color: '#94a3b8', flexShrink: 0 }} />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Card>
          )}
        </Box>

        {/* Low stock alert — below shortcuts */}
        {showLowStockSection && lowStockLoading ? (
          <Card elevation={0} sx={{ borderRadius: 0, border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', p: 2 }}>
            <Skeleton variant="text" width={180} height={24} />
            <Skeleton variant="rectangular" height={60} sx={{ mt: 1 }} />
          </Card>
        ) : showLowStockSection && lowStockData.count > 0 ? (
          <Card
            elevation={0}
            sx={{
              borderRadius: 0,
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #f59e0b',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            }}
          >
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 0, bgcolor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle className="w-4 h-4 text-amber-600" strokeWidth={2.25} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                    Low Stock Items
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {lowStockData.count} item{lowStockData.count !== 1 ? 's' : ''} require attention
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {lowStockData.low_stock > 0 && (
                  <Chip size="small" label={`Low: ${lowStockData.low_stock}`} sx={{ bgcolor: '#fef3c7', color: '#b45309', borderRadius: 0, fontWeight: 700, fontSize: '0.72rem' }} />
                )}
                {lowStockData.out_of_stock > 0 && (
                  <Chip size="small" label={`Out: ${lowStockData.out_of_stock}`} sx={{ bgcolor: '#fee2e2', color: '#b91c1c', borderRadius: 0, fontWeight: 700, fontSize: '0.72rem' }} />
                )}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Package className="w-3.5 h-3.5" />}
                  onClick={() => handleQuickActionClick('/dashboard/reports/stock-report')}
                  sx={{
                    borderColor: '#1A55E3',
                    color: '#1A55E3',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    borderRadius: 0,
                    '&:hover': { bgcolor: 'rgba(26, 85, 227, 0.06)', borderColor: '#1347c4' },
                  }}
                >
                  Stock Report
                </Button>
              </Box>
            </Box>

            <TableContainer sx={{ maxHeight: 220, borderRadius: 0 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 700, fontSize: '0.75rem', color: '#475569', borderBottom: '1px solid #e2e8f0' } }}>
                    <TableCell align="center" sx={{ width: 50 }}>S#</TableCell>
                    <TableCell sx={{ width: 140 }}>Category</TableCell>
                    <TableCell>Item Name</TableCell>
                    <TableCell align="center" sx={{ width: 70 }}>Unit</TableCell>
                    <TableCell align="right" sx={{ width: 100 }}>Current Qty</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>Threshold</TableCell>
                    <TableCell align="center" sx={{ width: 100 }}>Status</TableCell>
                    <TableCell sx={{ width: 180 }}>Store Breakdown</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStockData.items.map((item, index) => (
                    <TableRow key={item.pro_id} hover sx={{ '& td': { fontSize: '0.775rem', borderBottom: '1px solid #f1f5f9' } }}>
                      <TableCell align="center" sx={{ color: '#94a3b8' }}>{index + 1}</TableCell>
                      <TableCell sx={{ color: '#475569' }}>{item.category || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{item.pro_title}</TableCell>
                      <TableCell align="center" sx={{ color: '#64748b' }}>{item.pro_unit}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: item.status === 'OUT' ? '#dc2626' : '#d97706' }}>
                        {formatQty(item.total_qty)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#64748b' }}>{formatQty(item.threshold)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={stockStatusLabel(item.status)}
                          sx={{
                            height: 20,
                            borderRadius: 0,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            bgcolor: item.status === 'OUT' ? '#fee2e2' : '#fef3c7',
                            color: item.status === 'OUT' ? '#b91c1c' : '#b45309',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#64748b' }}>{item.store_breakdown || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {lowStockData.count > 3 && (
              <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Showing 3 of {lowStockData.count} · scroll table for more
                </Typography>
                <Button
                  size="small"
                  onClick={() => handleQuickActionClick('/dashboard/reports/stock-report')}
                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', color: '#1A55E3' }}
                >
                  Full report →
                </Button>
              </Box>
            )}
          </Card>
        ) : null}

        {/* Monthly Analytics & Financial Performance — per-widget access */}
        {(analyticsWidgets.any || analyticsWidgets.kpi) && (() => {
          const sectionAccent = CHART_COLORS.kpi;
          const sectionNeon = getReportNeonStyles(sectionAccent);
          return (
        <div className={REPORT.section}>
          <div className={REPORT.sectionHeader}>
            <div className={REPORT.sectionIcon}>
              <BarChart3 className="w-5 h-5 text-white" strokeWidth={2.25} />
            </div>
            <div>
              <h3 className="text-base md:text-[1.05rem] font-bold text-slate-900 tracking-tight">
                Monthly Analytics & Financial Performance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Bar charts with individual filters per report</p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          {analyticsWidgets.kpi && (
          <ReportWidgetShell accent={sectionAccent} title="KPI Summary" className={REPORT.kpiWrap}>
            <WidgetDateFilter filters={kpiFilters} onChange={setKpiFilters} loading={loading} accent={sectionAccent} />
          {loading ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, p: { xs: 2, md: 2.5 } }}>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} elevation={0} sx={{ p: 2.5, borderRadius: 0, border: '1px solid #e2e8f0' }}>
                  <Skeleton variant="text" width="40%" height={16} />
                  <Skeleton variant="text" width="70%" height={38} sx={{ my: 0.5 }} />
                  <Skeleton variant="rectangular" width="50%" height={20} />
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, p: { xs: 2, md: 2.5 } }}>
              {kpiData.map((kpi, index) => {
                const p = KPI_PALETTE[kpi.theme] || KPI_PALETTE.blue;
                const accent = KPI_NEON[kpi.theme] || CHART_COLORS.sales;
                const kpiNeon = getReportNeonStyles(accent);
                const isPositive = kpi.changeType === 'positive';
                return (
                  <Card
                    key={index}
                    elevation={0}
                    sx={{
                      borderRadius: 0,
                      border: `1px solid ${kpiNeon.iconBorder || '#e2e8f0'}`,
                      bgcolor: '#ffffff',
                      p: 2.5,
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                      '&:hover': {
                        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
                        transform: 'translateY(-3px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: kpiNeon.text, mb: 0.75 }}>
                          {kpi.title}
                        </Typography>
                        <Typography sx={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                          {kpi.value}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}>
                          <Chip
                            size="small"
                            icon={isPositive ? <TrendingUpMui sx={{ fontSize: '13px !important', color: '#059669 !important' }} /> : <TrendingDownMui sx={{ fontSize: '13px !important', color: '#dc2626 !important' }} />}
                            label={kpi.change}
                            sx={{
                              height: 22,
                              borderRadius: 0,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              bgcolor: isPositive ? '#ecfdf5' : '#fef2f2',
                              color: isPositive ? '#059669' : '#dc2626',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                          <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                            vs prior period
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        className={p.iconBg}
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: `1px solid ${kpiNeon.iconBorder}`,
                          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                        }}
                      >
                        <kpi.icon className={`w-5 h-5 ${p.icon}`} strokeWidth={2.25} />
                      </Box>
                    </Box>
                  </Card>
                );
              })}
            </Box>
          )}
          </ReportWidgetShell>
          )}

          {/* Monthly charts grid */}
          {analyticsWidgets.anyMonthlyChart && renderAnalyticsGrid([
            analyticsWidgets.monthlyCredit && {
              key: 'month-end-receive',
              node: (
            <ReportWidgetShell accent={CHART_COLORS.credit} title="To Receive (closing)">
              <ReportWidgetHeader
                title="To Receive"
                subtitle="Month-end closing balance to collect · party accounts (excl. cash/bank)"
                icon={Banknote}
                tint={CHART_COLORS.credit.tint}
                primary={CHART_COLORS.credit.primary}
                accent={CHART_COLORS.credit}
              />
              <WidgetMonthRangeFilter filters={monthEndReceiveFilters} onChange={setMonthEndReceiveFilters} loading={monthEndReceiveLoading} accent={CHART_COLORS.credit}>
                <div 
                  className="flex items-center gap-1 bg-white border border-slate-200 rounded-none px-1.5 py-1 shrink-0" 
                >
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Type</span>
                  <select
                    value={monthEndReceiveFilters.cusTypeId || ''}
                    onChange={(e) => setMonthEndReceiveFilters(f => ({ ...f, cusTypeId: e.target.value }))}
                    className="text-[11px] font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[70px] truncate"
                  >
                    <option value="">All</option>
                    {allCustomerTypes.map(t => (
                      <option key={t.cus_type_id} value={t.cus_type_id}>{t.cus_type_title}</option>
                    ))}
                  </select>
                </div>
              </WidgetMonthRangeFilter>
              <ReportChartArea accent={CHART_COLORS.credit}>
                {renderSmoothBarChart({
                  data: monthEndReceiveRows,
                  getValue: (d) => d.amount,
                  colorPrimary: CHART_COLORS.credit.primary,
                  colorGradientStop: CHART_COLORS.credit.gradient,
                  barId: 'gMonthEndReceive',
                })}
              </ReportChartArea>
              <ReportWidgetFooter
                accent={CHART_COLORS.credit}
                formula={
                  latestReceiveRow
                    ? `Closing to collect · ${latestReceiveRow.label} (as of ${latestReceiveRow.asOfDate ? formatDatePK(latestReceiveRow.asOfDate) : latestReceiveRow.label})`
                    : `${monthEndReceiveRows.length} month(s) in range`
                }
                total={`To receive: PKR ${fmtAmt(totalCreditVal)}`}
              />
            </ReportWidgetShell>
              ),
            },
            analyticsWidgets.monthlyDebit && {
              key: 'month-end-pay',
              node: (
            <ReportWidgetShell accent={CHART_COLORS.debit} title="To Pay (closing)">
              <ReportWidgetHeader
                title="To Pay"
                subtitle="Month-end closing balance to pay · party accounts (excl. cash/bank)"
                icon={CreditCard}
                tint={CHART_COLORS.debit.tint}
                primary={CHART_COLORS.debit.primary}
                accent={CHART_COLORS.debit}
              />
              <WidgetMonthRangeFilter filters={monthEndPayFilters} onChange={setMonthEndPayFilters} loading={monthEndPayLoading} accent={CHART_COLORS.debit} />
              <ReportChartArea accent={CHART_COLORS.debit}>
                {renderSmoothBarChart({
                  data: monthEndPayRows,
                  getValue: (d) => d.amount,
                  colorPrimary: CHART_COLORS.debit.primary,
                  colorGradientStop: CHART_COLORS.debit.gradient,
                  barId: 'gMonthEndPay',
                })}
              </ReportChartArea>
              <ReportWidgetFooter
                accent={CHART_COLORS.debit}
                formula={
                  latestPayRow
                    ? `Closing to pay · ${latestPayRow.label} (as of ${latestPayRow.asOfDate ? formatDatePK(latestPayRow.asOfDate) : latestPayRow.label})`
                    : `${monthEndPayRows.length} month(s) in range`
                }
                total={`To pay: PKR ${fmtAmt(totalDebitVal)}`}
              />
            </ReportWidgetShell>
              ),
            },
            analyticsWidgets.monthlyProfit && {
              key: 'monthly-profit',
              node: (
            <ReportWidgetShell accent={CHART_COLORS.profit} title="Monthly Profit">
              <ReportWidgetHeader
                title="Monthly Profit"
                subtitle="Net profit · month by month"
                icon={TrendingUp}
                tint={CHART_COLORS.profit.tint}
                primary={CHART_COLORS.profit.primary}
                accent={CHART_COLORS.profit}
              />
              <WidgetDateFilter filters={monthlyProfitFilters} onChange={setMonthlyProfitFilters} loading={monthlyProfitLoading} accent={CHART_COLORS.profit} type="months" />
              <ReportChartArea accent={CHART_COLORS.profit}>
                {renderSmoothBarChart({
                  data: monthlyProfitList,
                  getValue: d => d.profit,
                  colorPrimary: CHART_COLORS.profit.primary,
                  colorGradientStop: CHART_COLORS.profit.gradient,
                  barId: 'gMonthlyProfit'
                })}
              </ReportChartArea>
              <ReportWidgetFooter
                accent={CHART_COLORS.profit}
                formula={`Revenue − cost − expenses · ${monthlyProfitList.length} month(s)`}
                total={`PKR ${fmtAmt(totalProfitVal)}`}
              />
            </ReportWidgetShell>
              ),
            },
            analyticsWidgets.monthlySales && {
              key: 'monthly-sales',
              node: (
            <ReportWidgetShell accent={CHART_COLORS.sales} title="Monthly Sales">
              <ReportWidgetHeader
                title="Monthly Sales"
                subtitle="Total sales volume · month by month"
                icon={ShoppingCart}
                tint={CHART_COLORS.sales.tint}
                primary={CHART_COLORS.sales.primary}
                accent={CHART_COLORS.sales}
              />
              <WidgetDateFilter filters={monthlySalesFilters} onChange={setMonthlySalesFilters} loading={monthlySalesLoading} accent={CHART_COLORS.sales} type="months" />
              <ReportChartArea accent={CHART_COLORS.sales}>
                {renderSmoothBarChart({
                  data: monthlySalesList,
                  getValue: d => d.amount,
                  colorPrimary: CHART_COLORS.sales.primary,
                  colorGradientStop: CHART_COLORS.sales.gradient,
                  barId: 'gMonthlySale'
                })}
              </ReportChartArea>
              <ReportWidgetFooter
                accent={CHART_COLORS.sales}
                formula={`Sale totals excluding quotations · ${monthlySalesList.length} month(s)`}
                total={`PKR ${fmtAmt(totalSalesVal)}`}
              />
            </ReportWidgetShell>
              ),
            },
          ])}

        {analyticsWidgets.anyTopSaleChart && renderAnalyticsGrid([
          analyticsWidgets.topCustomersSale && {
            key: 'top-customers-sale',
            node: (() => {
              const rows = topCustomersSaleData;
              const color = CHART_COLORS.bills.primary;
              const n = Math.min(rows.length, 15);
              const neon = getReportNeonStyles(CHART_COLORS.bills);
              const custCats = allCategories.filter(
                (c) =>
                  !c.cus_cat_title.toLowerCase().includes('supplier') &&
                  !c.cus_cat_title.toLowerCase().includes('cash') &&
                  !c.cus_cat_title.toLowerCase().includes('bank')
              );
              const selectedCustCat = custCats.find(
                (c) => String(c.cus_cat_id) === String(topCustomersSaleFilters.cusCatId)
              );
              const custTypes = [...allCustomerTypes].sort((a, b) =>
                (a.cus_type_title || '').localeCompare(b.cus_type_title || '', undefined, {
                  sensitivity: 'base',
                })
              );
              const selectedCustType = custTypes.find(
                (t) => String(t.cus_type_id) === String(topCustomersSaleFilters.cusTypeId)
              );
              const saleFilterLabel = [selectedCustCat?.cus_cat_title, selectedCustType?.cus_type_title]
                .filter(Boolean)
                .join(' · ');
              return (
                <ReportWidgetShell accent={CHART_COLORS.bills} title="Top Customers by Sale">
                  <ReportWidgetHeader
                    title="Top Customers by Sale"
                    subtitle="Confirmed bills · each item qty × sale rate · minus returns"
                    icon={Users}
                    tint={CHART_COLORS.bills.tint}
                    primary={CHART_COLORS.bills.primary}
                    accent={CHART_COLORS.bills}
                    trailing={
                      <span
                        className={REPORT.badge}
                        style={{ color, background: CHART_COLORS.bills.tint, borderColor: neon.badgeBorder }}
                      >
                        Top {n}
                      </span>
                    }
                  />
                  <WidgetDateFilter
                    filters={topCustomersSaleFilters}
                    onChange={(f) => setTopCustomersSaleFilters((prev) => ({ ...prev, ...f }))}
                    loading={topCustomersSaleLoading}
                    accent={CHART_COLORS.bills}
                  />
                  <WidgetCustomerScopeFilter
                    accent={CHART_COLORS.bills}
                    cusCatId={topCustomersSaleFilters.cusCatId}
                    cusTypeId={topCustomersSaleFilters.cusTypeId}
                    categories={custCats}
                    types={custTypes}
                    onCategoryChange={(value) =>
                      setTopCustomersSaleFilters((f) => ({ ...f, cusCatId: value }))
                    }
                    onTypeChange={(value) =>
                      setTopCustomersSaleFilters((f) => ({ ...f, cusTypeId: value }))
                    }
                    onClearScope={() =>
                      setTopCustomersSaleFilters((f) => ({ ...f, cusCatId: '', cusTypeId: '' }))
                    }
                  />
                  <ReportChartArea accent={CHART_COLORS.bills}>
                    {renderRankingBarChart({
                      rows,
                      color,
                      gradient: CHART_COLORS.bills.gradient,
                      gradId: 'topCustSaleG',
                      loading: topCustomersSaleLoading,
                      emptyLabel: 'No confirmed bill sales in this period',
                    })}
                  </ReportChartArea>
                  <ReportWidgetFooter
                    accent={CHART_COLORS.bills}
                    formula={
                      saleFilterLabel
                        ? `${saleFilterLabel} · BILL invoices only · item qty × rate, minus returns · top ${n} customers`
                        : `BILL invoices only · item qty × rate, then minus sale-return qty × rate · top ${n} customers`
                    }
                    total={`PKR ${fmtAmt(topCustomersSaleTotal)}`}
                  />
                </ReportWidgetShell>
              );
            })(),
          },
          analyticsWidgets.topProductsSale && {
            key: 'top-products-sale',
            node: (() => {
              const rows = topProductsSaleData;
              const color = CHART_COLORS.sales.primary;
              const n = Math.min(rows.length, 15);
              const neon = getReportNeonStyles(CHART_COLORS.sales);
              return (
                <ReportWidgetShell accent={CHART_COLORS.sales} title="Top Products by Sale">
                  <ReportWidgetHeader
                    title="Top Products by Sale"
                    subtitle="Confirmed bills · each item qty × sale rate · minus returns"
                    icon={ShoppingCart}
                    tint={CHART_COLORS.sales.tint}
                    primary={CHART_COLORS.sales.primary}
                    accent={CHART_COLORS.sales}
                    trailing={
                      <span className={REPORT.badge} style={{ color, background: CHART_COLORS.sales.tint, borderColor: neon.badgeBorder }}>
                        Top {n}
                      </span>
                    }
                  />
                  <WidgetDateFilter
                    filters={topProductsSaleFilters}
                    onChange={(f) => setTopProductsSaleFilters((prev) => ({ ...prev, ...f }))}
                    loading={topProductsSaleLoading}
                    accent={CHART_COLORS.sales}
                  />
                  <ReportChartArea accent={CHART_COLORS.sales}>
                    {renderRankingBarChart({
                      rows,
                      color,
                      gradient: CHART_COLORS.sales.gradient,
                      gradId: 'topProdSaleG',
                      loading: topProductsSaleLoading,
                      emptyLabel: 'No confirmed bill product sales in this period',
                    })}
                  </ReportChartArea>
                  <ReportWidgetFooter
                    accent={CHART_COLORS.sales}
                    formula={`BILL invoices only · item qty × rate, then minus sale-return qty × rate · top ${n} products`}
                    total={`PKR ${fmtAmt(topProductsSaleTotal)}`}
                  />
                </ReportWidgetShell>
              );
            })(),
          },
        ])}

        {/* Weekly Overview Charts */}
        {analyticsWidgets.anyWeeklyChart && renderAnalyticsGrid([
          analyticsWidgets.salesOverview && {
            key: 'sales-overview',
            node: (
          <ReportWidgetShell accent={CHART_COLORS.sales} title="Sales Overview">
            <ReportWidgetHeader
              title="Sales Overview"
              subtitle={`Bills vs Orders · week by week · last ${salesOverviewDays} days`}
              icon={TrendingUp}
              tint={CHART_COLORS.sales.tint}
              primary={CHART_COLORS.sales.primary}
              accent={CHART_COLORS.sales}
            />
            <WidgetDayFilter days={salesOverviewDays} onChange={setSalesOverviewDays} loading={weeklyDataLoading} accent={CHART_COLORS.sales} />
            <ReportLegendRow accent={CHART_COLORS.sales}>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-none border" style={{ background: CHART_COLORS.bills.primary, borderColor: CHART_COLORS.bills.primary }} /><span className="text-[11px] text-slate-500 font-medium">Bills</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-none border" style={{ background: CHART_COLORS.orders.primary, borderColor: CHART_COLORS.orders.primary }} /><span className="text-[11px] text-slate-500 font-medium">Orders</span></div>
            </ReportLegendRow>
            <ReportChartArea accent={CHART_COLORS.sales}>
              {renderGroupedBarChart({
                chartId: 'salesOverview',
                labels: salesOverviewChart.labels,
                series: [
                  { key: 'bills', name: 'Bills', values: salesOverviewChart.billAmounts, primary: CHART_COLORS.bills.primary, gradient: CHART_COLORS.bills.gradient },
                  { key: 'orders', name: 'Orders', values: salesOverviewChart.orderAmounts, primary: CHART_COLORS.orders.primary, gradient: CHART_COLORS.orders.gradient },
                ],
              })}
            </ReportChartArea>
            <ReportWidgetFooter
              accent={CHART_COLORS.sales}
              formula={`Bills PKR ${fmtAmt(totalBillsOverview)} + Orders PKR ${fmtAmt(totalOrdersOverview)} · weekly totals · last ${salesOverviewDays} days`}
              total={`PKR ${fmtAmt(totalBillsOverview + totalOrdersOverview)}`}
            />
          </ReportWidgetShell>
            ),
          },
          analyticsWidgets.transactionsOverview && {
            key: 'transactions-overview',
            node: (
          <ReportWidgetShell accent={CHART_COLORS.profit} title="Transactions Overview">
            <ReportWidgetHeader
              title="Transactions Overview"
              subtitle={`All transactions vs Orders · week by week · last ${transactionsOverviewDays} days`}
              icon={ShoppingCart}
              tint={CHART_COLORS.profit.tint}
              primary={CHART_COLORS.profit.primary}
              accent={CHART_COLORS.profit}
            />
            <WidgetDayFilter days={transactionsOverviewDays} onChange={setTransactionsOverviewDays} loading={weeklyDataLoading} accent={CHART_COLORS.profit} />
            <ReportLegendRow accent={CHART_COLORS.profit}>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-none border" style={{ background: CHART_COLORS.sales.primary, borderColor: CHART_COLORS.sales.primary }} /><span className="text-[11px] text-slate-500 font-medium">Total</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-none border" style={{ background: CHART_COLORS.profit.primary, borderColor: CHART_COLORS.profit.primary }} /><span className="text-[11px] text-slate-500 font-medium">Orders</span></div>
            </ReportLegendRow>
            <ReportChartArea accent={CHART_COLORS.profit}>
              {renderGroupedBarChart({
                chartId: 'transactionsOverview',
                labels: transactionsOverviewChart.labels,
                formatValue: (v) => (v > 0 ? String(Math.round(v)) : '0'),
                series: [
                  { key: 'total', name: 'Total', values: transactionsOverviewChart.totalCounts, primary: CHART_COLORS.sales.primary, gradient: CHART_COLORS.sales.gradient },
                  { key: 'orders', name: 'Orders', values: transactionsOverviewChart.orderCounts, primary: CHART_COLORS.profit.primary, gradient: CHART_COLORS.profit.gradient },
                ],
              })}
            </ReportChartArea>
            <ReportWidgetFooter
              accent={CHART_COLORS.profit}
              formula={`All sales count + order count · last ${transactionsOverviewDays} days`}
              total={`${totalTxCount} transactions · ${totalOrderTxCount} orders`}
              totalLabel="Sum"
            />
          </ReportWidgetShell>
            ),
          },
        ])}

        {/* Customer & Supplier Balance Charts */}
        {analyticsWidgets.anyBalanceChart && renderAnalyticsGrid([
          analyticsWidgets.customerBalance && {
            key: 'customer-balance',
            node: (() => {
            const rows = customerBalanceData;
            const color = CHART_COLORS.customer.primary;
            const n = Math.min(rows.length, 15);
            const custCats = allCategories.filter(c =>
              !c.cus_cat_title.toLowerCase().includes('supplier') &&
              !c.cus_cat_title.toLowerCase().includes('cash') &&
              !c.cus_cat_title.toLowerCase().includes('bank')
            );
            const custNeon = getReportNeonStyles(CHART_COLORS.customer);
            return (
              <ReportWidgetShell accent={CHART_COLORS.customer} title="Top Customers by Balance">
                <ReportWidgetHeader
                  title="Top Customers by Balance"
                  subtitle={customerBalanceFilters.toDate ? `Outstanding as of ${formatDatePK(customerBalanceFilters.toDate)}` : 'Current outstanding balance'}
                  icon={Users}
                  tint={CHART_COLORS.customer.tint}
                  primary={CHART_COLORS.customer.primary}
                  accent={CHART_COLORS.customer}
                  trailing={
                    <span className={REPORT.badge} style={{ color, background: CHART_COLORS.customer.tint, borderColor: custNeon.badgeBorder }}>
                      Top {n}
                    </span>
                  }
                />
                <WidgetDateFilter
                  filters={customerBalanceFilters}
                  onChange={(f) => setCustomerBalanceFilters((prev) => ({ ...prev, ...f }))}
                  loading={customerBalanceLoading}
                  accent={CHART_COLORS.customer}
                >
                  <select
                    value={customerBalanceFilters.cusCatId}
                    onChange={e => setCustomerBalanceFilters(f => ({ ...f, cusCatId: e.target.value }))}
                    className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-none px-2 py-1 focus:outline-none focus:border-[#1A55E3] cursor-pointer"
                  >
                    <option value="">All Customer Categories</option>
                    {custCats.map(c => (
                      <option key={c.cus_cat_id} value={c.cus_cat_id}>{c.cus_cat_title}</option>
                    ))}
                  </select>
                </WidgetDateFilter>
                <ReportChartArea accent={CHART_COLORS.customer}>
                  {renderRankingBarChart({
                    rows,
                    color,
                    gradient: CHART_COLORS.customer.gradient,
                    gradId: 'balCustG',
                    loading: customerBalanceLoading,
                  })}
                </ReportChartArea>
                <ReportWidgetFooter
                  accent={CHART_COLORS.customer}
                  formula={
                    customerBalanceFilters.toDate
                      ? `Combined outstanding balance for top ${n} customers as of ${formatDatePK(customerBalanceFilters.toDate)}`
                      : `Combined outstanding balance for top ${n} customers`
                  }
                  total={`PKR ${fmtAmt(customerBalanceTotal)}`}
                />
              </ReportWidgetShell>
            );
          })(),
          },
          analyticsWidgets.supplierBalance && {
            key: 'supplier-balance',
            node: (() => {
            const rows = supplierBalanceData;
            const color = CHART_COLORS.supplier.primary;
            const n = Math.min(rows.length, 15);
            const supCats = allCategories.filter(c => c.cus_cat_title.toLowerCase().includes('supplier'));
            const suppNeon = getReportNeonStyles(CHART_COLORS.supplier);
            return (
              <ReportWidgetShell accent={CHART_COLORS.supplier} title="Top Suppliers by Balance">
                <ReportWidgetHeader
                  title="Top Suppliers by Balance"
                  subtitle={supplierBalanceFilters.toDate ? `Outstanding as of ${formatDatePK(supplierBalanceFilters.toDate)}` : 'Current outstanding balance'}
                  icon={Warehouse}
                  tint={CHART_COLORS.supplier.tint}
                  primary={CHART_COLORS.supplier.primary}
                  accent={CHART_COLORS.supplier}
                  trailing={
                    <span className={REPORT.badge} style={{ color, background: CHART_COLORS.supplier.tint, borderColor: suppNeon.badgeBorder }}>
                      Top {n}
                    </span>
                  }
                />
                <WidgetDateFilter
                  filters={supplierBalanceFilters}
                  onChange={(f) => setSupplierBalanceFilters((prev) => ({ ...prev, ...f }))}
                  loading={supplierBalanceLoading}
                  accent={CHART_COLORS.supplier}
                >
                  <select
                    value={supplierBalanceFilters.supCatId}
                    onChange={e => setSupplierBalanceFilters(f => ({ ...f, supCatId: e.target.value }))}
                    className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-none px-2 py-1 focus:outline-none focus:border-[#1A55E3] cursor-pointer"
                  >
                    <option value="">All Supplier Categories</option>
                    {supCats.map(c => (
                      <option key={c.cus_cat_id} value={c.cus_cat_id}>{c.cus_cat_title}</option>
                    ))}
                  </select>
                </WidgetDateFilter>
                <ReportChartArea accent={CHART_COLORS.supplier}>
                  {renderRankingBarChart({
                    rows,
                    color,
                    gradient: CHART_COLORS.supplier.gradient,
                    gradId: 'balSuppG',
                    loading: supplierBalanceLoading,
                  })}
                </ReportChartArea>
                <ReportWidgetFooter
                  accent={CHART_COLORS.supplier}
                  formula={
                    supplierBalanceFilters.toDate
                      ? `Combined outstanding balance for top ${n} suppliers as of ${formatDatePK(supplierBalanceFilters.toDate)}`
                      : `Combined outstanding balance for top ${n} suppliers`
                  }
                  total={`PKR ${fmtAmt(supplierBalanceTotal)}`}
                />
              </ReportWidgetShell>
            );
          })(),
          },
        ])}

        {/* Recent Activity */}
        {analyticsWidgets.recentActivity && (() => {
          const actNeon = getReportNeonStyles(CHART_COLORS.activity);
          return (
        <ReportWidgetShell accent={CHART_COLORS.activity} title="Recent Activity">
          <div className={REPORT.filterBody} style={{ background: actNeon.filterBg, borderColor: actNeon.divider }}>
            <Filter className="w-3.5 h-3.5 shrink-0" style={{ color: actNeon.primary }} />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Show</span>
            <div className={REPORT.presetWrap} style={{ borderColor: actNeon.chartBorder }}>
              {[5, 10, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRecentActivityLimit(n)}
                  className={`${REPORT.presetBtn}${recentActivityLimit === n ? ` ${REPORT.presetBtnActive}` : ''}`}
                  style={recentActivityLimit === n ? { color: actNeon.primary } : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {weeklyDataLoading && (
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: `${actNeon.primary}33`, borderTopColor: 'transparent', borderRightColor: actNeon.primary, borderBottomColor: actNeon.primary, borderLeftColor: actNeon.primary }}
                />
              )}
              <ReportFullscreenExpandButton />
            </div>
          </div>
          <ReportWidgetHeader
            title="Recent Activity"
            subtitle={`Latest ${recentActivityLimit} sales & purchases`}
            icon={Clock}
            tint={CHART_COLORS.activity.tint}
            primary={CHART_COLORS.activity.primary}
            accent={CHART_COLORS.activity}
          />
          <div className="p-4 md:p-5">
            <div className="space-y-2">
              {recentActivityData && recentActivityData.length > 0 ? (
                recentActivityData.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-none hover:bg-white transition-colors duration-150 border"
                    style={{ borderColor: actNeon.chartBorder }}
                  >
                    <div
                      className="w-2 h-2 rounded-none flex-shrink-0"
                      style={{
                        background: activity.status === 'success' ? CHART_COLORS.credit.primary
                          : activity.status === 'warning' ? CHART_COLORS.orders.primary
                          : CHART_COLORS.sales.primary,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{activity.action}</p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                    {(activity.amount || activity.customer) && (
                      <div className="text-right flex-shrink-0">
                        {activity.amount && <p className="text-sm font-semibold text-slate-900">PKR {activity.amount}</p>}
                        {activity.customer && <p className="text-xs text-slate-500">{activity.customer}</p>}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-slate-500">No recent activities</p>
                </div>
              )}
            </div>
          </div>
        </ReportWidgetShell>
          );
        })()}
        </div>
          );
        })()}
      </Box>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white rounded-none shadow-lg border border-gray-100/50 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {activeTab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h3>
          <p className="text-gray-600 mb-8">
            This page is under development. More features will be added soon.
          </p>
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatDatePK } from '@/lib/date-helper';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Tag, 
  Search, 
  DollarSign, 
  Receipt,
  Layers,
  ArrowLeft,
  ArrowRight,
  Filter,
  CheckCircle2,
  FolderTree,
  ListPlus,
  FolderOpen
} from 'lucide-react';
import {
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import DashboardLayout from '../components/dashboard-layout';

function ExpenseSubTitlesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTitleId = searchParams.get('title_id') || 'ALL';

  const [subTitles, setSubTitles] = useState([]);
  const [expenseTitles, setExpenseTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSubTitle, setEditingSubTitle] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'

  // Filter states
  const [selectedTitleFilter, setSelectedTitleFilter] = useState(initialTitleId);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form data
  const [formData, setFormData] = useState({
    expense_title_id: '',
    title: '',
    batchMode: false,
    batchTitles: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const urlTitleId = searchParams.get('title_id');
    if (urlTitleId) {
      setSelectedTitleFilter(urlTitleId);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, titlesRes] = await Promise.all([
        fetch('/api/expense-sub-titles'),
        fetch('/api/expense-titles')
      ]);

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubTitles(subsData);
      }
      if (titlesRes.ok) {
        const titlesData = await titlesRes.json();
        setExpenseTitles(titlesData);
      }
    } catch (error) {
      console.error('Error fetching expense sub-titles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered list
  const filteredSubTitles = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return subTitles.filter((st) => {
      if (selectedTitleFilter !== 'ALL' && String(st.expense_title_id) !== String(selectedTitleFilter)) {
        return false;
      }
      if (q) {
        const titleMatch = st.title.toLowerCase().includes(q);
        const parentMatch = st.expense_title?.title?.toLowerCase().includes(q);
        if (!titleMatch && !parentMatch) return false;
      }
      return true;
    });
  }, [subTitles, selectedTitleFilter, searchTerm]);

  const sortedSubTitles = useMemo(() => {
    return [...filteredSubTitles].sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'title') {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      } else if (sortBy === 'parent') {
        aVal = (a.expense_title?.title || '').toLowerCase();
        bVal = (b.expense_title?.title || '').toLowerCase();
      } else if (sortBy === 'created_at') {
        aVal = new Date(a.created_at);
        bVal = new Date(b.created_at);
      } else if (sortBy === 'expenses') {
        aVal = a._count?.expenses || 0;
        bVal = b._count?.expenses || 0;
      } else {
        aVal = a[sortBy];
        bVal = b[sortBy];
      }

      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [filteredSubTitles, sortBy, sortOrder]);

  const finalSubTitles = useMemo(() => {
    return sortedSubTitles.map((st, idx) => ({
      ...st,
      sequentialId: idx + 1
    }));
  }, [sortedSubTitles]);

  // Stats
  const totalSubTitlesCount = subTitles.length;
  const uniqueParentsCount = new Set(subTitles.map((s) => s.expense_title_id)).size;
  const totalExpensesLinked = subTitles.reduce((sum, s) => sum + (s._count?.expenses || 0), 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (sub) => {
    setEditingSubTitle(sub);
    setFormData({
      expense_title_id: sub.expense_title_id.toString(),
      title: sub.title,
      batchMode: false,
      batchTitles: ''
    });
    setCurrentView('create');
  };

  const handleDelete = async (subId, subName) => {
    if (window.confirm(`Are you sure you want to delete sub-title "${subName}"?`)) {
      try {
        const response = await fetch(`/api/expense-sub-titles?id=${subId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await fetchData();
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete sub-title');
        }
      } catch (error) {
        console.error('Error deleting sub-title:', error);
        alert('Failed to delete sub-title');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.expense_title_id) {
      alert('Please select a parent expense title');
      return;
    }

    try {
      const isEditing = Boolean(editingSubTitle);

      if (isEditing) {
        if (!formData.title.trim()) {
          alert('Please enter a sub-title name');
          return;
        }

        const res = await fetch('/api/expense-sub-titles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSubTitle.id,
            expense_title_id: parseInt(formData.expense_title_id, 10),
            title: formData.title.trim()
          })
        });

        if (res.ok) {
          await fetchData();
          setCurrentView('list');
          setEditingSubTitle(null);
          setFormData({ expense_title_id: '', title: '', batchMode: false, batchTitles: '' });
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to update sub-title');
        }
      } else {
        // Create mode: Single or Batch
        if (formData.batchMode) {
          const lines = formData.batchTitles
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          if (lines.length === 0) {
            alert('Please enter at least one sub-title in the batch list');
            return;
          }

          let successCount = 0;
          for (const line of lines) {
            const res = await fetch('/api/expense-sub-titles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                expense_title_id: parseInt(formData.expense_title_id, 10),
                title: line
              })
            });
            if (res.ok) successCount++;
          }

          await fetchData();
          setCurrentView('list');
          setFormData({ expense_title_id: '', title: '', batchMode: false, batchTitles: '' });
          alert(`Successfully added ${successCount} sub-title(s)!`);
        } else {
          if (!formData.title.trim()) {
            alert('Please enter a sub-title name');
            return;
          }

          const res = await fetch('/api/expense-sub-titles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              expense_title_id: parseInt(formData.expense_title_id, 10),
              title: formData.title.trim()
            })
          });

          if (res.ok) {
            await fetchData();
            setCurrentView('list');
            setEditingSubTitle(null);
            setFormData({ expense_title_id: '', title: '', batchMode: false, batchTitles: '' });
          } else {
            const err = await res.json();
            alert(err.error || 'Failed to create sub-title');
          }
        }
      }
    } catch (error) {
      console.error('Error saving sub-title:', error);
      alert('Failed to save sub-title');
    }
  };

  const clearFilters = () => {
    setSelectedTitleFilter('ALL');
    setSearchTerm('');
    setSortBy('title');
    setSortOrder('asc');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Render Sub-Titles List View
  const renderSubTitlesListView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="flex-shrink-0 mb-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Finance Management
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                  <Layers className="w-5 h-5" />
                </div>
                Expense Sub-Titles
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage specific line items and sub-categories linked to parent expense titles
              </p>
            </div>

            {/* Page Navigation Switcher & Add Button */}
            <div className="flex items-center gap-3">
              {/* Tab Switcher */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <Link
                  href="/dashboard/expense-titles"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  Main Titles ({expenseTitles.length})
                </Link>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm bg-white text-indigo-700 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Sub-Titles ({subTitles.length})
                </button>
              </div>

              {/* Add New Sub-Title Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingSubTitle(null);
                  setFormData({
                    expense_title_id: selectedTitleFilter !== 'ALL' ? selectedTitleFilter : (expenseTitles[0]?.id?.toString() || ''),
                    title: '',
                    batchMode: false,
                    batchTitles: ''
                  });
                  setCurrentView('create');
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-bold text-sm shadow-md shadow-indigo-200 flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add New Sub-Title
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards Section */}
        <div className="flex-shrink-0 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sub-Titles</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{totalSubTitlesCount}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtered View</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{finalSubTitles.length}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <Filter className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parent Categories</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{expenseTitles.length}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <FolderOpen className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Linked Expenses</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{totalExpensesLinked}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex-shrink-0 mb-4 bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Filter by Main Title */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Category:</span>
              <select
                value={selectedTitleFilter}
                onChange={(e) => setSelectedTitleFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Categories ({totalSubTitlesCount})</option>
                {expenseTitles.map((t) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.title} ({t.sub_titles?.length || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="flex-1 min-w-[220px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sub-titles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition text-slate-900"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="title-asc">Sub-Title A-Z</option>
                <option value="title-desc">Sub-Title Z-A</option>
                <option value="parent-asc">Category A-Z</option>
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="expenses-desc">Most Expenses</option>
              </select>

              {(searchTerm || selectedTitleFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/70 shadow-xs flex flex-col overflow-hidden">
          {finalSubTitles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-500 mb-3">
                  <Layers className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No expense sub-titles found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchTerm || selectedTitleFilter !== 'ALL'
                    ? 'No sub-titles matched your current search or category filter.'
                    : 'Get started by creating your first expense sub-title.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Table Column Headers */}
              <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3">
                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Sub-Title Name</div>
                  <div className="col-span-4">Parent Main Title / Category</div>
                  <div className="col-span-1 text-center">Expenses</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {finalSubTitles.map((sub) => {
                  const expenseCount = sub._count?.expenses || 0;

                  return (
                    <div
                      key={sub.id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/70 transition-colors"
                    >
                      {/* # */}
                      <div className="col-span-1">
                        <span className="text-xs font-mono font-bold text-slate-400">#{sub.sequentialId}</span>
                      </div>

                      {/* Sub-Title Name */}
                      <div className="col-span-4">
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{sub.title}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Created {formatDatePK(sub.created_at)}
                        </div>
                      </div>

                      {/* Parent Main Title Badge */}
                      <div className="col-span-4">
                        <Link
                          href={`/dashboard/expense-titles`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
                          title="View parent title in Titles page"
                        >
                          <Tag className="w-3 h-3 text-purple-600" />
                          <span>{sub.expense_title?.title || 'Unknown Title'}</span>
                        </Link>
                      </div>

                      {/* Linked Expenses */}
                      <div className="col-span-1 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                          {expenseCount}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(sub)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Sub-Title"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sub.id, sub.title)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Sub-Title"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );

  // Render Sub-Title Create / Edit View (Clean & Dedicated)
  const renderSubTitleCreateView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center">
            <button
              onClick={() => setCurrentView('list')}
              className="mr-4 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingSubTitle ? 'Edit Expense Sub-Title' : 'Create New Expense Sub-Title'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {editingSubTitle ? 'Update sub-title details and parent category' : 'Attach a specific sub-title to a main expense category'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col max-w-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Sub-Title Details
            </h3>
            <span className="text-xs font-semibold text-slate-400">Step 2 of 2: Line Item</span>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Parent Main Title Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Parent Expense Title / Category <span className="text-red-500">*</span>
                </label>
                <Autocomplete
                  options={expenseTitles}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.title || ''}
                  value={expenseTitles.find((t) => String(t.id) === String(formData.expense_title_id)) || null}
                  onChange={(event, newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      expense_title_id: newValue ? newValue.id.toString() : ''
                    }));
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Select parent title..."
                      required
                      fullWidth
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          backgroundColor: '#f8fafc',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          '& fieldset': { borderColor: '#e2e8f0' },
                          '&:hover fieldset': { borderColor: '#cbd5e1' },
                          '&.Mui-focused fieldset': { borderColor: '#6366f1', borderWidth: '2px' }
                        }
                      }}
                    />
                  )}
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  The primary category under which this sub-title will be grouped.
                </p>
              </div>

              {/* Single vs Batch Mode (only available when creating) */}
              {!editingSubTitle && (
                <div className="flex items-center gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, batchMode: false }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      !formData.batchMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Single Sub-Title
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, batchMode: true }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                      formData.batchMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ListPlus className="w-3.5 h-3.5" /> Batch Add Multiple
                  </button>
                </div>
              )}

              {/* Sub-Title Name Input (Single Mode) */}
              {!formData.batchMode ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Sub-Title Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required={!formData.batchMode}
                    autoFocus
                    placeholder="e.g. Electricity Bill, Stationery, Fuel, Toll Taxes"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-base focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    This sub-title will be available when choosing this parent category in the Expense Management page.
                  </p>
                </div>
              ) : (
                /* Batch Add Mode */
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Sub-Title Names (One Per Line) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={formData.batchTitles}
                    onChange={(e) => setFormData((prev) => ({ ...prev, batchTitles: e.target.value }))}
                    placeholder={'Electricity Bill\nInternet Bill\nWater Bill\nGas Bill'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    Enter multiple sub-titles separated by new lines. They will all be created under the selected parent title.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-8">
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm rounded-xl hover:from-indigo-700 hover:to-purple-700 transition shadow-md shadow-indigo-200"
              >
                {editingSubTitle
                  ? 'Update Sub-Title'
                  : formData.batchMode
                  ? 'Add Batch Sub-Titles'
                  : 'Create Sub-Title'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <>
      {currentView === 'list' ? renderSubTitlesListView() : renderSubTitleCreateView()}
    </>
  );
}

export default function ExpenseSubTitlesPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    }>
      <ExpenseSubTitlesContent />
    </Suspense>
  );
}


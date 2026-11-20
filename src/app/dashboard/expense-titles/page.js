'use client';

import { useState, useEffect } from 'react';
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
  FolderTree,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function ExpenseTitlesPage() {
  const [expenseTitles, setExpenseTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form data - purely for Main Title
  const [formData, setFormData] = useState({
    title: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/expense-titles');
      if (response.ok) {
        const data = await response.json();
        setExpenseTitles(data);
      }
    } catch (error) {
      console.error('Error fetching expense titles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort logic
  const filteredTitles = expenseTitles.filter(title => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return title.title.toLowerCase().includes(q);
  });

  const sortedTitles = [...filteredTitles].sort((a, b) => {
    let aValue, bValue;
    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at);
      bValue = new Date(b.created_at);
    } else if (sortBy === 'title') {
      aValue = a.title.toLowerCase();
      bValue = b.title.toLowerCase();
    } else if (sortBy === 'sub_titles_count') {
      aValue = a.sub_titles?.length || 0;
      bValue = b.sub_titles?.length || 0;
    } else if (sortBy === 'expense_count') {
      aValue = a.expenses?.length || 0;
      bValue = b.expenses?.length || 0;
    } else {
      aValue = a[sortBy];
      bValue = b[sortBy];
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const finalTitles = sortedTitles.map((title, index) => ({
    ...title,
    sequentialId: index + 1
  }));

  // Stats calculations
  const totalTitles = expenseTitles.length;
  const totalSubTitles = expenseTitles.reduce((sum, title) => sum + (title.sub_titles?.length || 0), 0);
  const totalExpenses = expenseTitles.reduce((sum, title) => sum + (title.expenses?.length || 0), 0);
  const totalExpenseAmount = expenseTitles.reduce((sum, title) => {
    const titleExpenses = title.expenses || [];
    return sum + titleExpenses.reduce((titleSum, expense) => titleSum + parseFloat(expense.exp_amount || 0), 0);
  }, 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.title.trim()) {
        alert('Please enter a title');
        return;
      }
      
      const url = '/api/expense-titles';
      const method = editingTitle ? 'PUT' : 'POST';
      const body = editingTitle 
        ? { id: editingTitle.id, title: formData.title.trim() } 
        : { title: formData.title.trim() };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setCurrentView('list');
        setEditingTitle(null);
        setFormData({ title: '' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save expense title');
      }
    } catch (error) {
      console.error('Error saving expense title:', error);
      alert('Failed to save expense title');
    }
  };

  const handleEdit = (title) => {
    setEditingTitle(title);
    setFormData({ title: title.title });
    setCurrentView('create');
  };

  const handleDelete = async (titleId) => {
    if (window.confirm('Are you sure you want to delete this expense title? This will also remove any attached sub-titles.')) {
      try {
        const response = await fetch(`/api/expense-titles?id=${titleId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          await fetchData();
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to delete expense title');
        }
      } catch (error) {
        console.error('Error deleting expense title:', error);
        alert('Failed to delete expense title');
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Render Expense Titles List View
  const renderExpenseTitlesListView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="flex-shrink-0 mb-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Finance Management
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-200">
                  <Tag className="w-5 h-5" />
                </div>
                Expense Titles
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage top-level expense categories for business ledger categorization
              </p>
            </div>

            {/* Page Navigation Switcher & Add Button */}
            <div className="flex items-center gap-3">
              {/* Tab Switcher */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm bg-white text-purple-700 flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  Main Titles ({expenseTitles.length})
                </button>
                <Link
                  href="/dashboard/expense-sub-titles"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Sub-Titles ({totalSubTitles})
                </Link>
              </div>

              {/* Add New Title Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingTitle(null);
                  setFormData({ title: '' });
                  setCurrentView('create');
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition font-bold text-sm shadow-md shadow-purple-200 flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add New Title
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
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Main Titles</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{totalTitles}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <Tag className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Linked Sub-Titles</p>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{totalSubTitles}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expense Records</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{totalExpenses}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expense Sum</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">Rs. {totalExpenseAmount.toLocaleString()}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex-shrink-0 mb-4 bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search expense titles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition text-slate-900"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:border-purple-500"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="sub_titles_count-desc">Most Sub-Titles</option>
                <option value="sub_titles_count-asc">Least Sub-Titles</option>
                <option value="expense_count-desc">Most Expenses</option>
                <option value="expense_count-asc">Least Expenses</option>
              </select>

              {searchTerm && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/70 shadow-xs flex flex-col overflow-hidden">
          {finalTitles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto text-purple-500 mb-3">
                  <Tag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No expense titles found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchTerm ? 'No titles matched your search query.' : 'Create your first main expense title to categorize business disbursements.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3">
                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Title Name</div>
                  <div className="col-span-3">Sub-Titles</div>
                  <div className="col-span-2">Expense Records</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {finalTitles.map((title) => {
                  const subCount = title.sub_titles?.length || 0;
                  const expenseCount = title.expenses?.length || 0;
                  const expenseSum = (title.expenses || []).reduce((sum, e) => sum + parseFloat(e.exp_amount || 0), 0);

                  return (
                    <div
                      key={title.id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/70 transition-colors"
                    >
                      {/* # */}
                      <div className="col-span-1">
                        <span className="text-xs font-mono font-bold text-slate-400">#{title.sequentialId}</span>
                      </div>

                      {/* Title Name */}
                      <div className="col-span-4">
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{title.title}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Created {formatDatePK(title.created_at)}
                        </div>
                      </div>

                      {/* Sub-Titles Link / Pill */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            subCount > 0 
                              ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <Layers className="w-3 h-3 mr-1" />
                            {subCount} {subCount === 1 ? 'Sub-Title' : 'Sub-Titles'}
                          </span>

                          <Link
                            href={`/dashboard/expense-sub-titles?title_id=${title.id}`}
                            className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition"
                            title="Manage sub-titles for this category"
                          >
                            Manage Sub-Titles
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Link>
                        </div>
                      </div>

                      {/* Expenses */}
                      <div className="col-span-2">
                        <div className="text-xs font-bold text-slate-800">
                          {expenseCount} {expenseCount === 1 ? 'record' : 'records'}
                        </div>
                        <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                          Rs. {expenseSum.toLocaleString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(title)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Title"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(title.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Title"
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

  // Render Expense Title Create / Edit View (Clean, focused on Main Title only!)
  const renderExpenseTitleCreateView = () => (
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
                {editingTitle ? 'Edit Expense Title' : 'Create New Expense Title'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {editingTitle ? 'Update main expense category title' : 'Define a top-level expense category for tracking expenditures'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col max-w-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-600" />
              Main Title Details
            </h3>
            <span className="text-xs font-semibold text-slate-400">Step 1 of 2: Main Category</span>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Expense Title Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  autoFocus
                  placeholder="e.g. Utility Bills, Office Supplies, Transport, Maintenance"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-base focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition"
                />
                <p className="text-xs text-slate-400 mt-2">
                  This will appear as the parent category when recording business expenses and financial vouchers.
                </p>
              </div>

              {/* Informative Tip Box */}
              <div className="bg-indigo-50/60 rounded-xl border border-indigo-100 p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-900">Need specific sub-titles for this category?</h4>
                  <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                    Sub-titles (e.g. &quot;Electricity Bill&quot;, &quot;Stationery&quot;, &quot;Fuel&quot;) are managed on the dedicated <strong>Expense Sub-Titles</strong> page. You can add them immediately after saving this title.
                  </p>
                </div>
              </div>
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
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:from-purple-700 hover:to-indigo-700 transition shadow-md shadow-purple-200"
              >
                {editingTitle ? 'Update Expense Title' : 'Create Expense Title'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <>
      {currentView === 'list' ? renderExpenseTitlesListView() : renderExpenseTitleCreateView()}
    </>
  );
}

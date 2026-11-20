'use client';

import { useState, useEffect } from 'react';
import { formatDatePK } from '@/lib/date-helper';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Tag, 
  Search, 
  Filter,
  DollarSign,
  Hash,
  Calendar,
  AlertCircle,
  Eye,
  BarChart3,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  FileText,
  Receipt,
  Layers,
  ChevronDown,
  ChevronRight,
  FolderTree
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  IconButton
} from '@mui/material';
import DashboardLayout from '../components/dashboard-layout';

export default function ExpenseTitlesPage() {
  // State management
  const [expenseTitles, setExpenseTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form data for Title + Sub-titles
  const [formData, setFormData] = useState({
    title: '',
    sub_titles: []
  });
  const [newSubTitleInput, setNewSubTitleInput] = useState('');

  // Quick Sub-Title Dialog state (for adding/editing a sub-title directly from list)
  const [quickSubModal, setQuickSubModal] = useState({
    open: false,
    titleId: null,
    titleName: '',
    subTitleId: null,
    subTitleText: '',
    isSaving: false
  });

  // Expanded rows in list view
  const [expandedTitles, setExpandedTitles] = useState({});

  const toggleExpand = (titleId) => {
    setExpandedTitles(prev => ({
      ...prev,
      [titleId]: !prev[titleId]
    }));
  };

  // Fetch data
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
    const titleMatch = title.title.toLowerCase().includes(q);
    const subTitleMatch = (title.sub_titles || []).some(st => 
      st.title.toLowerCase().includes(q)
    );
    return titleMatch || subTitleMatch;
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

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubTitleToForm = () => {
    const text = newSubTitleInput.trim();
    if (!text) return;
    
    // Check if duplicate in form
    const exists = formData.sub_titles.some(st => 
      (typeof st === 'string' ? st.toLowerCase() : st.title.toLowerCase()) === text.toLowerCase()
    );
    if (exists) {
      alert('This sub-title is already in the list');
      return;
    }

    setFormData(prev => ({
      ...prev,
      sub_titles: [...prev.sub_titles, { title: text }]
    }));
    setNewSubTitleInput('');
  };

  const handleRemoveSubTitleFromForm = async (index, subTitleObj) => {
    // If it's an existing saved sub_title with an id and we are editing, ask to delete it
    if (subTitleObj?.id) {
      if (!window.confirm(`Delete sub-title "${subTitleObj.title}"?`)) return;
      try {
        const res = await fetch(`/api/expense-sub-titles?id=${subTitleObj.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to delete sub-title');
          return;
        }
      } catch (err) {
        console.error('Error deleting sub-title:', err);
        alert('Failed to delete sub-title');
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      sub_titles: prev.sub_titles.filter((_, i) => i !== index)
    }));
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
        ? { 
            id: editingTitle.id, 
            title: formData.title.trim(),
            sub_titles: formData.sub_titles
          } 
        : {
            title: formData.title.trim(),
            sub_titles: formData.sub_titles
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchData();
        setCurrentView('list');
        setEditingTitle(null);
        setFormData({ title: '', sub_titles: [] });
        setNewSubTitleInput('');
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
    setFormData({
      title: title.title,
      sub_titles: title.sub_titles ? [...title.sub_titles] : []
    });
    setNewSubTitleInput('');
    setCurrentView('create');
  };

  const handleDelete = async (titleId) => {
    if (window.confirm('Are you sure you want to delete this expense title? This will also remove its sub-titles.')) {
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

  // Quick sub-title modal actions
  const openQuickSubModal = (title, subTitle = null) => {
    setQuickSubModal({
      open: true,
      titleId: title.id,
      titleName: title.title,
      subTitleId: subTitle ? subTitle.id : null,
      subTitleText: subTitle ? subTitle.title : '',
      isSaving: false
    });
  };

  const handleSaveQuickSub = async () => {
    const text = quickSubModal.subTitleText.trim();
    if (!text) {
      alert('Please enter a sub-title name');
      return;
    }

    try {
      setQuickSubModal(prev => ({ ...prev, isSaving: true }));
      const isEdit = Boolean(quickSubModal.subTitleId);
      const url = '/api/expense-sub-titles';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit 
        ? { id: quickSubModal.subTitleId, title: text, expense_title_id: quickSubModal.titleId }
        : { expense_title_id: quickSubModal.titleId, title: text };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        await fetchData();
        setQuickSubModal({ open: false, titleId: null, titleName: '', subTitleId: null, subTitleText: '', isSaving: false });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save sub-title');
      }
    } catch (err) {
      console.error('Error saving sub-title:', err);
      alert('Failed to save sub-title');
    } finally {
      setQuickSubModal(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handleDeleteSubTitleDirect = async (subTitleId, subTitleText) => {
    if (!window.confirm(`Delete sub-title "${subTitleText}"?`)) return;
    try {
      const res = await fetch(`/api/expense-sub-titles?id=${subTitleId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete sub-title');
      }
    } catch (err) {
      console.error('Error deleting sub-title:', err);
      alert('Failed to delete sub-title');
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Render Expense Titles List View
  const renderExpenseTitlesListView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Fixed Header Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FolderTree className="w-7 h-7 text-purple-600" />
                Expense Titles &amp; Sub-Titles
              </h2>
              <p className="text-gray-600 mt-1">Manage main expense categories and their sub-titles for structured expense tracking</p>
            </div>
            <button
              onClick={() => {
                setEditingTitle(null);
                setFormData({ title: '', sub_titles: [] });
                setNewSubTitleInput('');
                setCurrentView('create');
              }}
              className="group bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="flex items-center">
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                Add New Title &amp; Sub-Titles
              </span>
            </button>
          </div>
        </div>

        {/* Fixed Filters Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters &amp; Sorting</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Clear All Filters
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Titles or Sub-Titles</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by title or sub-title name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black"
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
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Stats Cards Section */}
        <div className="flex-shrink-0 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-5">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                  <Tag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Main Titles</p>
                  <p className="text-2xl font-bold text-gray-900">{totalTitles}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-5">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sub-Titles</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSubTitles}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-5">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">{totalExpenses}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 p-5">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">Rs. {totalExpenseAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flexible Table Section - Only This Scrolls */}
        <div className="flex-1 min-h-0">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
            {/* Fixed Table Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Expense Titles &amp; Sub-Titles List</h3>
                <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                  {expenseTitles.length} Titles
                </span>
              </div>
              <span className="text-sm text-gray-500">
                Showing {finalTitles.length} of {expenseTitles.length} titles
              </span>
            </div>
            
            {finalTitles.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Tag className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No expense titles found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm
                      ? 'Try adjusting your search to see more results.'
                      : 'Get started by adding your first expense title with sub-titles.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Fixed Column Headers */}
                <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">Main Title</div>
                    <div className="col-span-4">Sub-Titles</div>
                    <div className="col-span-2">Expenses</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                </div>
                
                {/* Scrollable Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-gray-100">
                    {finalTitles.map((title) => {
                      const subList = title.sub_titles || [];
                      const isExpanded = Boolean(expandedTitles[title.id]);
                      const expenseSum = (title.expenses || []).reduce((sum, e) => sum + parseFloat(e.exp_amount || 0), 0);

                      return (
                        <div key={title.id} className="hover:bg-purple-50/20 transition-colors duration-150">
                          <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                            {/* # / ID */}
                            <div className="col-span-1 flex items-center gap-1.5">
                              <button 
                                type="button" 
                                onClick={() => toggleExpand(title.id)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded transition"
                                title={isExpanded ? 'Collapse sub-titles' : 'Expand sub-titles'}
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-purple-600" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <div>
                                <span className="text-sm font-bold text-gray-900">#{title.sequentialId}</span>
                              </div>
                            </div>

                            {/* Main Title */}
                            <div className="col-span-3">
                              <div className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-purple-500 shrink-0" />
                                <span>{title.title}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Created: {formatDatePK(title.created_at)}
                              </div>
                            </div>

                            {/* Sub-Titles Preview */}
                            <div className="col-span-4">
                              <div className="flex items-center flex-wrap gap-1.5">
                                {subList.length === 0 ? (
                                  <span className="text-xs text-gray-400 italic">No sub-titles defined</span>
                                ) : (
                                  <>
                                    {subList.slice(0, 3).map((st) => (
                                      <span
                                        key={st.id}
                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                                      >
                                        {st.title}
                                      </span>
                                    ))}
                                    {subList.length > 3 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpand(title.id)}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                                      >
                                        +{subList.length - 3} more
                                      </button>
                                    )}
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openQuickSubModal(title)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 bg-purple-50/80 hover:bg-purple-100 px-2 py-0.5 rounded border border-dashed border-purple-300 ml-1 transition"
                                  title="Add new sub-title under this title"
                                >
                                  <Plus className="w-3 h-3" /> Sub-Title
                                </button>
                              </div>
                            </div>

                            {/* Expenses Stats */}
                            <div className="col-span-2">
                              <div className="text-sm font-bold text-gray-900">
                                {title.expenses?.length || 0} <span className="text-xs font-normal text-gray-500">records</span>
                              </div>
                              <div className="text-xs font-semibold text-emerald-600">
                                Rs. {expenseSum.toLocaleString()}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="col-span-2 flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(title)}
                                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="Edit Title and Sub-Titles"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(title.id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete Title"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Drawer for Sub-Titles List */}
                          {isExpanded && (
                            <div className="px-12 py-3 bg-slate-50/80 border-t border-b border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                                  Sub-Titles for &quot;{title.title}&quot; ({subList.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openQuickSubModal(title)}
                                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add Sub-Title
                                </button>
                              </div>

                              {subList.length === 0 ? (
                                <p className="text-xs text-gray-500 py-1">No sub-titles yet. Click &quot;Add Sub-Title&quot; to create one.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {subList.map((st) => (
                                    <div
                                      key={st.id}
                                      className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-2xs hover:border-purple-300 transition"
                                    >
                                      <span className="text-xs font-semibold text-gray-800 truncate mr-2">
                                        • {st.title}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => openQuickSubModal(title, st)}
                                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                          title="Edit sub-title"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSubTitleDirect(st.id, st.title)}
                                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                                          title="Delete sub-title"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Add/Edit Sub-Title Dialog */}
        <Dialog 
          open={quickSubModal.open} 
          onClose={() => setQuickSubModal(prev => ({ ...prev, open: false }))}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', pb: 1 }}>
            {quickSubModal.subTitleId ? 'Edit Sub-Title' : 'Add New Sub-Title'}
          </DialogTitle>
          <DialogContent>
            <p className="text-xs text-gray-500 mb-3">
              Main Title: <strong className="text-purple-700">{quickSubModal.titleName}</strong>
            </p>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Sub-Title Name"
              placeholder="e.g. Electricity Bill, Stationery, Fuel"
              value={quickSubModal.subTitleText}
              onChange={(e) => setQuickSubModal(prev => ({ ...prev, subTitleText: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveQuickSub();
                }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button 
              onClick={() => setQuickSubModal(prev => ({ ...prev, open: false }))}
              disabled={quickSubModal.isSaving}
              sx={{ color: '#64748b', textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveQuickSub}
              disabled={quickSubModal.isSaving}
              sx={{ 
                background: 'linear-gradient(135deg, #a855f7, #ec4899)', 
                textTransform: 'none', 
                fontWeight: 700 
              }}
            >
              {quickSubModal.isSaving ? 'Saving...' : quickSubModal.subTitleId ? 'Update' : 'Add Sub-Title'}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </DashboardLayout>
  );

  // Render Expense Title Create View (with Title + Sub-Titles Management)
  const renderExpenseTitleCreateView = () => (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentView('list')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingTitle ? 'Edit Expense Title & Sub-Titles' : 'Create New Expense Title & Sub-Titles'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editingTitle ? 'Update expense category title and manage its sub-titles' : 'Add a new main expense category and its sub-titles'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/50 h-full flex flex-col">
            {/* Form Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Expense Category &amp; Sub-Titles</h3>
            </div>
            
            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                {/* 1. Main Title Section */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                    <Tag className="w-5 h-5 mr-2 text-purple-600" />
                    Main Title / Category Information
                  </h4>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Main Expense Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-black font-semibold"
                      placeholder="e.g. Utility Bills, Office Supplies, Transport, Maintenance"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      The top-level category used to group related business expenses.
                    </p>
                  </div>
                </div>

                {/* 2. Sub-Titles Section */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h4 className="text-base font-bold text-gray-900 mb-2 flex items-center">
                    <Layers className="w-5 h-5 mr-2 text-indigo-600" />
                    Sub-Titles (Sub-Categories)
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Add specific sub-titles belonging to this main title. When entering expenses, you will select the Main Title and then choose from these Sub-Titles.
                  </p>

                  {/* Add Sub-Title Input Group */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newSubTitleInput}
                      onChange={(e) => setNewSubTitleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubTitleToForm();
                        }
                      }}
                      placeholder="Type a sub-title name (e.g. Electricity Bill, Stationery, Fuel) and press Add"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubTitleToForm}
                      className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-semibold text-sm flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add Sub-Title
                    </button>
                  </div>

                  {/* List of sub-titles added */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200 min-h-[100px]">
                    {formData.sub_titles.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        No sub-titles added yet. Type a name above and click &quot;Add Sub-Title&quot;.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {formData.sub_titles.map((st, idx) => {
                          const titleText = typeof st === 'string' ? st : st.title;
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg text-sm font-medium shadow-2xs"
                            >
                              <span>{titleText}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubTitleFromForm(idx, st)}
                                className="text-purple-400 hover:text-red-600 rounded-full p-0.5 hover:bg-purple-100 transition"
                                title="Remove sub-title"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setCurrentView('list')}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    {editingTitle ? 'Update Title & Sub-Titles' : 'Create Title & Sub-Titles'}
                  </button>
                </div>
              </form>
            </div>
          </div>
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

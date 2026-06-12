import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Filter, Plus, Pencil, Eye, Download, ChevronLeft, ChevronRight,
  SlidersHorizontal, X, Trash2
} from 'lucide-react';
import { memberService } from '@/services/memberService';
import { divisionService } from '@/services/divisionService';
import { categoryService } from '@/services/categoryService';
import { TableRowSkeleton } from '@/components/common/Skeleton';
import { formatDate, formatNumber } from '@/utils/dateUtils';
import type { MemberFilters } from '@/types';
import toast from 'react-hot-toast';


const PAGE_SIZE = 25;

const MembersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<MemberFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['members', filters, page],
    queryFn: () => memberService.getMembers(filters, page, PAGE_SIZE),
    staleTime: 30000,
  });

  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => divisionService.getAll(),
    staleTime: 300000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
    staleTime: 300000,
  });


  const deleteMutation = useMutation({
    mutationFn: (id: string) => memberService.deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member deleted');
      setDeletingId(null);
    },
    onError: () => {
      toast.error('Failed to delete member');
      setDeletingId(null);
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete member "${name}"? This cannot be undone.`)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  const handleSearch = useCallback(() => {
    setFilters((f) => ({ ...f, search: searchInput || undefined }));
    setPage(1);
  }, [searchInput]);

  const handleFilterChange = (key: keyof MemberFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput('');
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">Members</h1>
          <p className="text-sm text-gray-400 mt-1">
            සාමාජිකයන් — {formatNumber(data?.count ?? 0)} total records
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/members/import')}
            className="flex items-center gap-2 border border-primary text-primary hover:bg-primary hover:text-white
              px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
          >
            <Download size={16} /> Import
          </button>
          <button
            onClick={() => navigate('/members/add')}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white
              px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm"
          >
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-60 flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by member no, name, NIC..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-xl text-sm
                font-medium transition-all"
            >
              Search
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium
              transition-all ${showFilters || hasActiveFilters
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {hasActiveFilters && (
              <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100"
          >
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Electoral Division</label>
              <select
                value={filters.division_id || ''}
                onChange={(e) => handleFilterChange('division_id', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Divisions</option>
                {(divisions || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.division_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={filters.category_id || ''}
                onChange={(e) => handleFilterChange('category_id', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Categories</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.category_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Member No', 'Name / නම', 'NIC', 'Address', 'Division', 'Category', 'Joined Date', 'Share Amount', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={9} />)
                : (data?.data || []).length === 0
                  ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                        <Filter size={32} className="mx-auto mb-2 opacity-30" />
                        <p>No members found / සාමාජිකයන් හමු නොවීය</p>
                      </td>
                    </tr>
                  )
                  : (data?.data || []).map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{m.member_no}</td>
                      <td className="px-4 py-3 font-medium text-text dark:text-text-dark">{m.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.nic}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate" title={m.address}>{m.address}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-medium">
                          {m.electoral_division?.division_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg text-xs font-medium">
                          {m.category?.category_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(m.joined_date)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">
                        Rs. {formatNumber(m.share_amount || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/members/${m.id}/edit`)}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            title="View / Edit"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/members/${m.id}/edit`)}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id, m.name)}
                            disabled={deletingId === m.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600 text-xs font-semibold transition-colors disabled:opacity-40"
                            title="Delete Member"
                          >
                            <Trash2 size={13} />
                            {deletingId === m.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.count)} of {formatNumber(data.count)} members
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-primary
                  hover:text-primary transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                const pageNum = start + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all
                      ${pageNum === page ? 'bg-primary text-white' : 'border border-gray-200 hover:border-primary hover:text-primary'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-primary
                  hover:text-primary transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default MembersPage;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, Tag } from 'lucide-react';
import { categoryService } from '@/services/categoryService';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TableRowSkeleton } from '@/components/common/Skeleton';
import { formatNumber } from '@/utils/dateUtils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => categoryService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created / කාණ්ඩය සාර්ථකව සෑදිණ');
      setNewName('');
      setShowAddForm(false);
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      categoryService.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated');
      setEditId(null);
    },
    onError: () => toast.error('Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
      setDeletingId(null);
    },
    onError: () => {
      toast.error('Cannot delete category with existing members');
      setDeletingId(null);
    },
  });

  const filtered = (categories || []).filter((c) =>
    c.category_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">Categories</h1>
          <p className="text-sm text-gray-400 mt-1">කාණ්ඩ — {(categories || []).length} categories</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white
              px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-5"
        >
          <h3 className="font-semibold text-text dark:text-text-dark mb-3">New Category / නව කාණ්ඩය</h3>
          <div className="flex gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newName.trim() && createMutation.mutate(newName.trim())}
              placeholder="Category name / කාණ්ඩ නාමය"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none
                focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              autoFocus
            />
            <button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(newName.trim())}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-xl text-sm
                font-medium disabled:opacity-40 transition-all"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewName(''); }}
              className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white dark:bg-surface-dark
            text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
            dark:border-gray-600 dark:text-white shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                  <Tag size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No categories found</p>
                </td>
              </tr>
            ) : (
              filtered.map((cat, i) => (
                <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    {editId === cat.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-primary text-sm focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => updateMutation.mutate({ id: cat.id, name: editName })}
                          disabled={updateMutation.isPending}
                          className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Tag size={14} className="text-purple-500" />
                        </span>
                        <span className="font-medium text-text dark:text-text-dark">{cat.category_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {formatNumber(cat.member_count || 0)} members
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditId(cat.id); setEditName(cat.category_name); }}
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingId(cat.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600 text-xs font-semibold"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Category"
        message="Are you sure? Members assigned to this category will lose their category assignment."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        onCancel={() => setDeletingId(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default CategoriesPage;

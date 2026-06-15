import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Pencil, MapPin, Trash2 } from 'lucide-react';
import { divisionService } from '@/services/divisionService';
import { TableRowSkeleton } from '@/components/common/Skeleton';
import { formatNumber } from '@/utils/dateUtils';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

const DivisionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: divisions, isLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => divisionService.getAll(),
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => divisionService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      toast.success('Division created successfully!');
      setNewName('');
      setShowAddForm(false);
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message || 'Unknown error';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('Division name already exists!');
      } else if (msg.includes('JWT') || msg.includes('auth') || msg.includes('401')) {
        toast.error('Session expired. Please logout and login again.');
      } else {
        toast.error(`Failed to create division: ${msg}`);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      divisionService.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      toast.success('Division updated');
      setEditId(null);
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message || 'Unknown error';
      toast.error(`Failed to update: ${msg}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => divisionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      toast.success('Division deleted');
      setDeletingId(null);
    },
    onError: () => {
      toast.error('Failed to delete division');
      setDeletingId(null);
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">Electoral Divisions</h1>
          <p className="text-sm text-gray-400 mt-1">ගරු ආසන — {(divisions || []).length} divisions</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white
              px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <Plus size={16} /> Add Division
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
          <h3 className="font-semibold text-text dark:text-text-dark mb-3">New Division / නව ආසනය</h3>
          <div className="flex gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newName.trim() && createMutation.mutate(newName.trim())}
              placeholder="Division name / ආසන නාමය"
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

      {/* Table */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Division Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
            ) : (divisions || []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                  <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No divisions found</p>
                </td>
              </tr>
            ) : (
              (divisions || []).map((div, i) => (
                <tr key={div.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    {editId === div.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-primary text-sm focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => updateMutation.mutate({ id: div.id, name: editName })}
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
                        <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                          <MapPin size={14} className="text-blue-500" />
                        </span>
                        <span className="font-medium text-text dark:text-text-dark">{div.division_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {formatNumber(div.member_count || 0)} members
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => { setEditId(div.id); setEditName(div.division_name); }}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                            title="Edit Division"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(div.id, div.division_name)}
                            disabled={deletingId === div.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600 text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm"
                            title="Delete Division"
                          >
                            <Trash2 size={13} />
                            {deletingId === div.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


    </div>
  );
};

export default DivisionsPage;

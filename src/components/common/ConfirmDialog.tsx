import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const colors = {
    danger: { icon: <AlertTriangle size={24} className="text-red-500" />, btn: 'bg-red-600 hover:bg-red-700' },
    warning: { icon: <AlertTriangle size={24} className="text-amber-500" />, btn: 'bg-amber-600 hover:bg-amber-700' },
    info: { icon: <CheckCircle size={24} className="text-blue-500" />, btn: 'bg-blue-600 hover:bg-blue-700' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          onClick={onCancel}
        />
      )}
      {isOpen && (
        <motion.div
          key="confirm-content"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-modal w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {colors[variant].icon}
                <h3 className="text-lg font-semibold text-text dark:text-text-dark">{title}</h3>
              </div>
              <button
                onClick={onCancel}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">{message}</p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50
                  text-sm font-medium transition-all disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-4 py-2 rounded-xl text-white text-sm font-medium transition-all
                  disabled:opacity-50 flex items-center gap-2 ${colors[variant].btn}`}
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {confirmLabel}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

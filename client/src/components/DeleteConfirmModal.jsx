import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, itemName, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0F1420] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 text-gray-200">
        <div className="flex items-start justify-between border-b border-white/5 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {title || 'Confirm Deletion'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Permanent action warning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-300 leading-relaxed">
            {message || 'Are you sure you want to delete this record?'}
          </p>

          {itemName && (
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl font-mono text-xs text-amber-300 break-all">
              {itemName}
            </div>
          )}

          <p className="text-[11px] text-gray-500">
            This action cannot be undone and will be permanently removed from your active ledgers.
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 size={13} />
                <span>Yes, Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;

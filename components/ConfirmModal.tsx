import React from 'react';
import { Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen, onClose, onConfirm, title = "DELETE DATA?", message = "Are you sure? This cannot be undone."
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-xs bg-[#FEFAE0] border-4 border-[#2a1d1a] rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-200">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-black transition-colors bg-white rounded-full p-1"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center border-2 border-red-200 text-red-500 mb-2">
            <Trash2 size={28} />
          </div>

          <h3 className="text-xl font-black text-[#2a1d1a] font-pixel tracking-tight leading-none">
            {title}
          </h3>

          <p className="text-xs font-bold text-gray-500 font-sans leading-relaxed px-2">
            {message}
          </p>

          <div className="flex gap-3 w-full pt-4">
            <button 
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-500 font-black text-xs hover:bg-gray-50 transition-colors uppercase"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-3.5 rounded-xl bg-[#FF3366] text-white font-black text-xs shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-[#e02e5a] border-2 border-transparent uppercase"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
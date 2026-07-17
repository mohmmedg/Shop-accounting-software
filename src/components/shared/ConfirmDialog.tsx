import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  // منع الضغط المتكرر على زر التأكيد أثناء تنفيذ العملية (يحمي كل نوافذ الحذف/التأكيد في التطبيق دفعة واحدة)
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsConfirming(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const colors = {
    danger: { bg: 'bg-red-600', hover: 'hover:bg-red-700', icon: 'text-red-500', border: 'border-red-500/20' },
    warning: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', icon: 'text-amber-500', border: 'border-amber-500/20' },
    info: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', icon: 'text-blue-500', border: 'border-blue-500/20' },
  }[variant];

  const handleConfirmClick = async () => {
    if (isConfirming) return; // تجاهل أي ضغطة إضافية أثناء التنفيذ
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className={`bg-slate-900 border ${colors.border} rounded-2xl p-6 max-w-sm w-full shadow-2xl transition-all scale-100`}>
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-2 rounded-xl bg-slate-800 shrink-0 ${colors.icon}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-100 text-lg">{title}</h3>
            <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="px-4 py-2.5 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 font-bold text-xs transition border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={isConfirming}
            className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-lg ${colors.bg} ${colors.hover} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isConfirming ? 'جاري التنفيذ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

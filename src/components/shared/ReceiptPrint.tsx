import React from 'react';
import { Printer, X } from 'lucide-react';
import { Invoice, Settings } from '../../types';

interface ReceiptPrintProps {
  isOpen: boolean;
  invoice: Invoice;
  settings: Settings;
  onClose: () => void;
}

export function ReceiptPrint({ isOpen, invoice, settings, onClose }: ReceiptPrintProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" dir="rtl">
      {/* Container holding Receipt Visualizer and Print Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header bar */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center text-slate-100">
          <h3 className="font-black text-sm">معاينة وطباعة الفاتورة الحرارية</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex justify-center">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>اطبع الآن (A4 أو حراري)</span>
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 flex justify-center">
          
          {/* Printable Element with id="receipt-print-area" */}
          <div 
            id="receipt-print-area" 
            className="w-[80mm] min-h-[120mm] bg-white text-black p-4 font-mono text-[11px] leading-relaxed shadow-lg rounded"
            style={{ fontFamily: 'monospace' }}
          >
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #receipt-print-area, #receipt-print-area * {
                  visibility: visible;
                }
                #receipt-print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 80mm !important;
                  margin: 0 !important;
                  padding: 4mm !important;
                  box-shadow: none !important;
                  background: white !important;
                  color: black !important;
                }
              }
            `}</style>

            {/* Header branding */}
            <div className="text-center space-y-1 mb-4 border-b border-dashed border-black pb-3">
              <h1 className="text-[15px] font-black tracking-tight" style={{ fontWeight: 900 }}>{settings.store_name}</h1>
              <p className="text-[9px]">بوابة التاجر الدمشقي لإدارة الأعمال الذكية</p>
              {settings.store_address && <p className="text-[9px]">{settings.store_address}</p>}
              {settings.store_phone && <p className="text-[9px]">هاتف: {settings.store_phone}</p>}
            </div>

            {/* Receipt metadata */}
            <div className="space-y-1 mb-4 border-b border-dashed border-black pb-3 text-right">
              <div className="flex justify-between">
                <span>رقم الفاتورة:</span>
                <span className="font-bold">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span>{new Date(invoice.sale_date).toLocaleString('ar-SY', { hour12: false })}</span>
              </div>
              <div className="flex justify-between">
                <span>العميل:</span>
                <span>{invoice.customer_name || 'زبون نقدي'}</span>
              </div>
              <div className="flex justify-between">
                <span>طريقة الدفع:</span>
                <span>
                  {invoice.payment_method === 'cash' ? 'نقدي' : invoice.payment_method === 'debt' ? 'دَين كامل' : 'جزئي'}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-4">
              <div className="flex font-bold border-b border-black pb-1 mb-1.5 text-right">
                <span className="w-1/2">الصنف</span>
                <span className="w-1/6 text-center">الكمية</span>
                <span className="w-1/6 text-left">السعر</span>
                <span className="w-1/6 text-left">الإجمالي</span>
              </div>
              <div className="space-y-1.5">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="flex text-right">
                    <span className="w-1/2 break-words leading-tight">{item.product_name}</span>
                    <span className="w-1/6 text-center">
                      {item.quantity} {item.is_weight ? 'كغ' : 'ق'}
                    </span>
                    <span className="w-1/6 text-left">${item.price_usd.toFixed(2)}</span>
                    <span className="w-1/6 text-left">${(item.quantity * item.price_usd).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Section */}
            <div className="border-t border-dashed border-black pt-3 space-y-1 text-right">
              <div className="flex justify-between font-bold text-[12px]" style={{ fontWeight: 800 }}>
                <span>الإجمالي بالدولار:</span>
                <span>${invoice.total_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-[12px]" style={{ fontWeight: 800 }}>
                <span>الإجمالي بالليرة:</span>
                <span>{invoice.total_syp.toLocaleString()} ل.س</span>
              </div>
              
              <div className="border-t border-dashed border-black/40 my-1.5"></div>

              <div className="flex justify-between text-[10px]">
                <span>سعر الصرف المستخدم:</span>
                <span>{settings.usd_to_syp_rate.toLocaleString()} ل.س</span>
              </div>
              
              <div className="flex justify-between text-[10px]">
                <span>المسدد بالدولار:</span>
                <span>${invoice.paid_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>المسدد بالليرة:</span>
                <span>{invoice.paid_syp.toLocaleString()} ل.س</span>
              </div>

              {(invoice.remaining_debt_usd > 0) && (
                <div className="flex justify-between text-[11px] font-bold text-red-600" style={{ fontWeight: 800 }}>
                  <span>المتبقي ذمة دين:</span>
                  <span>${invoice.remaining_debt_usd.toFixed(2)} (${(invoice.remaining_debt_usd * settings.usd_to_syp_rate).toLocaleString()} ل.س)</span>
                </div>
              )}
            </div>

            {/* Footer message */}
            <div className="text-center space-y-1 mt-6 pt-3 border-t border-dashed border-black">
              <p className="text-[10px] font-bold">نشكر زيارتكم وثقتكم بنا!</p>
              <p className="text-[8px] text-gray-500">البضاعة التي تباع لا ترد ولا تبدل إلا خلال 24 ساعة</p>
              <p className="text-[7px] text-gray-400 mt-2">نظام كاشير التاجر الدمشقي v2.5</p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

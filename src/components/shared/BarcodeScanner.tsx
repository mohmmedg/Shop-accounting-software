import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product } from '../../types';
import { X, Camera, Upload, Settings2, Sparkles, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  products: Product[];
}

export function BarcodeScanner({ isOpen, onClose, onScan, products }: BarcodeScannerProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'file' | 'simulator'>('camera');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [simulatedSearch, setSimulatedSearch] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerSessionRef = useRef<number>(0);

  // Play a beautiful synthetic supermarket scanner beep sound on successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 1200; // Crisp supermarket scanner pitch
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.12);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (err) {
      console.warn('AudioContext beep failed:', err);
    }
  };

  // Lifecycle control for camera scanner
  useEffect(() => {
    scannerSessionRef.current += 1;
    const currentSession = scannerSessionRef.current;

    if (!isOpen) {
      stopScanner();
      return;
    }

    if (activeTab === 'camera') {
      setIsInitializing(true);
      setCameraError(null);
      
      const timer = setTimeout(() => {
        initializeScanner(currentSession);
      }, 300);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, selectedCameraId]);

  const initializeScanner = async (sessionNumber: number) => {
    try {
      const container = document.getElementById('camera-scanner-reader');
      if (!container || sessionNumber !== scannerSessionRef.current) return;

      // Ensure any previous scanner is stopped first
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      if (sessionNumber !== scannerSessionRef.current) return;

      const html5QrCode = new Html5Qrcode('camera-scanner-reader');
      html5QrCodeRef.current = html5QrCode;

      // Request camera devices to populate camera list
      try {
        const devices = await Html5Qrcode.getCameras();
        if (sessionNumber !== scannerSessionRef.current) return;
        
        setCameras(devices);
        if (devices.length > 0 && !selectedCameraId) {
          // Select environment (rear) camera by default if available
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment') || 
            device.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      } catch (devErr) {
        console.warn('Failed listing cameras:', devErr);
      }

      if (sessionNumber !== scannerSessionRef.current) return;

      const cameraConfig = selectedCameraId 
        ? { deviceId: { exact: selectedCameraId } } 
        : { facingMode: 'environment' };

      // Ensure the container is still present and has a valid parent before starting
      const elementCheck = document.getElementById('camera-scanner-reader');
      if (!elementCheck || !elementCheck.parentElement) {
        console.warn('camera-scanner-reader container or parent was unmounted before start');
        return;
      }

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.75;
            return { width: size, height: size * 0.5 }; // Horizontal barcode box
          },
          aspectRatio: 1.333333
        },
        (decodedText) => {
          if (sessionNumber !== scannerSessionRef.current) return;
          playBeep();
          onScan(decodedText);
          toast.success(`تمت القراءة بنجاح: ${decodedText}`);
          onClose();
        },
        (errorMessage) => {
          // Silent frame matching errors
        }
      );
      
      if (sessionNumber !== scannerSessionRef.current) {
        stopScanner();
        return;
      }
      
      setCameraError(null);
    } catch (err: any) {
      if (sessionNumber !== scannerSessionRef.current) return;
      console.error('Camera Scanner start failed:', err);
      setCameraError(
        err.message || 
        'تعذر تشغيل الكاميرا. يرجى السماح للمتصفح بالوصول للكاميرا أو فتح الموقع من بروتوكول آمن HTTPS.'
      );
    } finally {
      if (sessionNumber === scannerSessionRef.current) {
        setIsInitializing(false);
      }
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error('Failed stopping camera scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  };

  // Handle barcode image file scanning
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    try {
      const dummyContainer = document.getElementById('camera-scanner-reader-dummy');
      if (!dummyContainer) {
        toast.error('خطأ في تهيئة مساحة المعالجة');
        return;
      }

      const scanner = new Html5Qrcode('camera-scanner-reader-dummy');
      const decodedText = await scanner.scanFile(file, true);
      
      playBeep();
      onScan(decodedText);
      toast.success(`تم فك الرمز من الصورة بنجاح: ${decodedText}`);
      onClose();
    } catch (err: any) {
      console.error('File scan error:', err);
      toast.error('تعذر التعرف على باركود أو رمز QR في هذه الصورة. يرجى تجربة صورة أوضح وبإضاءة جيدة.');
    } finally {
      setIsScanningFile(false);
    }
  };

  // Manual simulator submit
  const handleSimulatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = scannedBarcode.trim();
    if (!barcode) {
      toast.error('يرجى كتابة أو اختيار باركود أولاً');
      return;
    }
    
    playBeep();
    onScan(barcode);
    onClose();
  };

  // Filter products for simulator quick selection
  const filteredProducts = products.filter(p => 
    p.barcode && (
      p.name.toLowerCase().includes(simulatedSearch.toLowerCase()) ||
      p.barcode.toLowerCase().includes(simulatedSearch.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(simulatedSearch.toLowerCase()))
    )
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fade-in" dir="rtl">
      {/* Dummy container for file scanner processing */}
      <div id="camera-scanner-reader-dummy" className="hidden" style={{ display: 'none' }} />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-950 border-b border-slate-850 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-slate-100 text-sm">ماسح وفاحص الباركود الصوري</h3>
              <p className="text-[10px] text-slate-400 font-medium">فحص الباركود عبر الكاميرا الحية، رفع صورة، أو محاكي النظام</p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopScanner();
              onClose();
            }} 
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-850 bg-slate-950/50 p-1">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-slate-900 border border-slate-800 text-indigo-400 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>كاميرا الجوال / الجهاز</span>
          </button>
          
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'file'
                ? 'bg-slate-900 border border-slate-800 text-indigo-400 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>رفع ملف صورة باركود</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-slate-900 border border-slate-800 text-indigo-400 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>محاكي الفحص المكتبي</span>
          </button>
        </div>

        {/* Content Container */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* TAB 1: LIVE CAMERA SCANNING */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {/* Camera Picker */}
              {cameras.length > 1 && (
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 p-2 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">اختر الكاميرا:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="flex-1 bg-slate-900 text-slate-200 text-[11px] font-bold p-1 px-2 border border-slate-800 rounded-lg focus:outline-none"
                  >
                    {cameras.map((cam, idx) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `كاميرا ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scanner Screen Stage */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-850 flex flex-col justify-center items-center">
                
                {/* HTML5 Qrcode Viewport */}
                <div id="camera-scanner-reader" className="w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

                {/* Nice holographic laser scanning animation overlay when scanning is active */}
                {!cameraError && !isInitializing && (
                  <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-xl overflow-hidden pointer-events-none z-10">
                    {/* Glowing scanning laser line */}
                    <div className="absolute left-0 w-full h-0.5 bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-bounce" style={{ animationDuration: '3s' }} />
                    
                    {/* Retro Crosshair Corners */}
                    <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-indigo-500" />
                    <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-indigo-500" />
                    <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-indigo-500" />
                    <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-indigo-500" />

                    {/* Scanner Guide Text */}
                    <div className="absolute bottom-4 inset-x-0 text-center">
                      <span className="bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] font-bold text-slate-300 px-3 py-1 rounded-full shadow">
                        وجّه الكاميرا نحو باركود الصنف ليتم مسحه تلقائياً
                      </span>
                    </div>
                  </div>
                )}

                {/* Initializing Spinner */}
                {isInitializing && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center gap-3 bg-slate-950 z-25 text-center px-4">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-xs text-slate-400 font-bold">جاري فتح الكاميرا وتهيئة الفاحص الصوري...</p>
                  </div>
                )}

                {/* Error Banner */}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center gap-3 bg-slate-950/95 z-25 text-center p-6 border-2 border-rose-500/10">
                    <AlertCircle className="w-10 h-10 text-rose-500 animate-pulse" />
                    <p className="text-xs text-rose-400 font-black leading-relaxed max-w-sm">{cameraError}</p>
                    <button
                      onClick={() => initializeScanner(scannerSessionRef.current)}
                      className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-4 py-2 rounded-lg cursor-pointer transition shadow"
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                )}
              </div>

              <div className="text-center">
                <span className="text-[10px] text-slate-500 leading-relaxed">
                  * يعمل فك الرمز الصوري محلياً 100% داخل المتصفح بشكل آمن وفوري دون إرسال أي صورة للخادم.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE SCANNING */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-8 cursor-pointer transition text-center group min-h-[220px]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isScanningFile}
                />
                
                {isScanningFile ? (
                  <div className="space-y-3">
                    <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                    <p className="text-xs text-slate-300 font-black">جاري تحليل وفحص صورة الباركود...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/20 w-fit mx-auto transition shadow">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-200">اضغط لرفع صورة الباركود من الهاتف أو الكمبيوتر</p>
                      <p className="text-[10px] text-slate-400 font-bold">يدعم صور الباركود والـ QR Code من الكاميرا مباشرة</p>
                    </div>
                  </div>
                )}
              </label>

              <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-850 text-[10px] text-slate-400 leading-relaxed space-y-1">
                <p className="font-black text-slate-300">💡 تلميحات سريعة للقراءة الصحيحة:</p>
                <p>• تأكد من أن الباركود يظهر كاملاً وبشكل أفقي مستوٍ في الصورة المرفوعة.</p>
                <p>• تجنب الإضاءة المنعكسة الشديدة أو الظلال الداكنة على ملصق الباركود.</p>
              </div>
            </div>
          )}

          {/* TAB 3: SIMULATOR / TESTING */}
          {activeTab === 'simulator' && (
            <form onSubmit={handleSimulatorSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400">تلقين رمز باركود يدوي للمحاكي:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    placeholder="اكتب الباركود هنا (مثال: 6281001014526)"
                    className="flex-1 text-center text-lg font-mono font-black text-indigo-400 bg-slate-950 border border-slate-850 rounded-xl p-2.5 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-550 text-white font-black text-xs px-5 rounded-xl cursor-pointer transition shadow"
                  >
                    فحص ومحاكاة
                  </button>
                </div>
              </div>

              {/* Quick Products Picker */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400">انقر على منتج أدناه لتلقين الباركود الخاص به تلقائياً:</span>
                </div>
                
                <input
                  type="text"
                  value={simulatedSearch}
                  onChange={(e) => setSimulatedSearch(e.target.value)}
                  placeholder="ابحث عن منتج بالاسم أو الباركود..."
                  className="w-full bg-slate-950 border border-slate-850 text-slate-300 text-xs font-bold rounded-xl p-2 focus:outline-none"
                />

                <div className="border border-slate-850 rounded-xl max-h-48 overflow-y-auto bg-slate-950/80 divide-y divide-slate-850/40">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-[10px]">لا يوجد منتجات بباركو د مطابق للبحث</div>
                  ) : (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setScannedBarcode(p.barcode || '');
                          toast.info(`تم تلقين باركود: ${p.name}`);
                        }}
                        className={`w-full text-right p-2 hover:bg-slate-900 flex justify-between items-center text-[11px] font-bold cursor-pointer transition ${
                          scannedBarcode === p.barcode ? 'bg-indigo-600/10 border-r-2 border-indigo-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-mono text-slate-400 text-[10px]">
                          <span>{p.barcode}</span>
                          {scannedBarcode === p.barcode && <Check className="w-3 h-3 text-indigo-400" />}
                        </div>
                        <div className="text-right">
                          <p className="text-slate-200">{p.name}</p>
                          <p className="text-[9px] text-slate-500 font-medium">{p.category || 'عام'}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-850 px-5 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>يدعم قراءة رموز QR وكافة أنواع الباركودات التجارية</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl border border-slate-800 cursor-pointer transition"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
}


import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, XCircle, CheckCircle, RefreshCw, AlertTriangle, Loader2, Scan } from 'lucide-react';
import { validateAndEnter } from '../services/storageService';
import { TicketRecord, QRCodeData } from '../types';
import { generateWelcomeMessage } from '../services/geminiService';

export const Scanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; record?: TicketRecord } | null>(null);
  const [aiGreeting, setAiGreeting] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');

  const handleScan = useCallback(async (code: string) => {
    // Prevent multiple scans
    setScanning(false);
    setProcessing(true);
    
    try {
      // Attempt to parse the QR code
      let data: QRCodeData;
      try {
        data = JSON.parse(code);
      } catch (e) {
        setScanResult({ success: false, message: "Invalid Format. Not a secure event ticket." });
        setProcessing(false);
        return;
      }

      if (!data.id) {
         setScanResult({ success: false, message: "Invalid Ticket: Missing Security ID." });
         setProcessing(false);
         return;
      }
      
      const result = await validateAndEnter(data.id);
      setScanResult(result);

      if (result.success && result.record) {
        setLoadingAi(true);
        generateWelcomeMessage(result.record).then(msg => {
            setAiGreeting(msg);
            setLoadingAi(false);
        });
      }

    } catch (e) {
      console.error("Scan Error:", e);
      setScanResult({ success: false, message: "System Error. Please try again." });
    } finally {
        setProcessing(false);
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    let active = true;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!scanning || !video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    const tick = () => {
      if (!active) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (code && code.data && !processing) {
          handleScan(code.data);
          return;
        }
      }
      
      if (scanning && !processing) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        stream = mediaStream;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        
        video.play().catch(e => {
            console.error("Video play failed", e);
            setCameraError("Unable to access camera stream.");
        });

        animationFrameId = requestAnimationFrame(tick);
      })
      .catch((err) => {
        console.error("Camera access error:", err);
        if (active) {
          setCameraError("Camera access denied. Please verify permissions.");
        }
      });

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanning, handleScan, processing]);

  const resetScanner = () => {
    setScanResult(null);
    setAiGreeting('');
    setScanning(true);
    setProcessing(false);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-4">
      <div className="w-full glass-panel rounded-3xl overflow-hidden shadow-2xl relative border border-slate-600/50">
        
        {/* Header HUD */}
        <div className="bg-slate-900/80 backdrop-blur-md p-4 border-b border-slate-700/50 flex justify-between items-center z-20 relative">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500/20 p-1.5 rounded-lg">
               <Scan className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Optical Scanner</h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-slate-700/50">
             <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${scanning && !processing ? 'bg-emerald-500 shadow-emerald-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'}`}></div>
             <span className="text-[10px] font-mono text-slate-400 uppercase">{scanning && !processing ? 'Live Feed' : 'Standby'}</span>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative aspect-[4/5] bg-black overflow-hidden">
          
          {/* Default State Overlay */}
          {scanning && !cameraError && !processing && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                {/* HUD Corners */}
                <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-indigo-500/80 rounded-tl-2xl"></div>
                <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-indigo-500/80 rounded-tr-2xl"></div>
                <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-indigo-500/80 rounded-bl-2xl"></div>
                <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-indigo-500/80 rounded-br-2xl"></div>
                
                {/* Laser Scan Line */}
                <div className="scan-line top-1/2"></div>
                
                <p className="text-white/70 text-xs font-mono bg-black/40 backdrop-blur px-3 py-1 rounded-full border border-white/10 mt-32">
                  [ WAITING FOR TICKET ]
                </p>
             </div>
          )}
          
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-30 bg-slate-900">
               <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
               </div>
               <h3 className="text-white font-bold text-lg mb-2">Camera Error</h3>
               <p className="text-slate-400 text-sm">{cameraError}</p>
            </div>
          ) : (
            <>
                <video 
                    ref={videoRef} 
                    className="absolute inset-0 w-full h-full object-cover" 
                    playsInline 
                    muted 
                />
                <canvas ref={canvasRef} className="hidden" />
            </>
          )}

          {/* Processing Overlay */}
          {processing && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-indigo-500/20 rounded-full animate-pulse"></div>
                   </div>
                </div>
                <p className="text-indigo-400 font-mono mt-6 animate-pulse tracking-widest text-xs">DECRYPTING...</p>
            </div>
          )}

          {/* Result Overlay */}
          {!scanning && scanResult && (
             <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                {scanResult.success ? (
                  <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.3)] ring-1 ring-red-500/50">
                    <XCircle className="w-12 h-12 text-red-400" />
                  </div>
                )}
                
                <h3 className={`text-3xl font-black mb-2 tracking-tight ${scanResult.success ? 'text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 to-emerald-500' : 'text-red-500'}`}>
                  {scanResult.success ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </h3>
                
                <p className="text-slate-300 mb-8 font-medium text-lg leading-relaxed max-w-[280px]">
                  {scanResult.message}
                </p>

                {scanResult.record && (
                  <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-5 rounded-2xl w-full mb-6 border border-slate-700/50 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
                    
                    <div className="relative z-10 text-left">
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-2">Guest Identity</p>
                        <p className="text-2xl font-bold text-white mb-1">{scanResult.record.name}</p>
                        <div className="flex items-center gap-2">
                           <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs font-mono border border-indigo-500/20">{scanResult.record.className}</span>
                           <span className="text-slate-500 text-sm">•</span>
                           <span className="text-slate-400 text-sm font-mono">{scanResult.record.admissionNumber}</span>
                        </div>
                    </div>
                  </div>
                )}

                {/* AI Greeting Section */}
                {scanResult.success && (
                  <div className="w-full mb-8 min-h-[60px]">
                    {loadingAi ? (
                      <div className="flex items-center justify-center gap-3 text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-dashed border-slate-700">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        <span className="text-xs font-mono">Connecting to AI Host...</span>
                      </div>
                    ) : (
                      aiGreeting && (
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4 rounded-xl border border-indigo-500/20 relative">
                           <div className="absolute -top-2 left-4 px-2 bg-slate-900 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">AI Announcement</div>
                           <p className="text-indigo-200 text-sm font-medium italic leading-relaxed">"{aiGreeting}"</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                <button 
                  onClick={resetScanner}
                  className="w-full bg-white text-slate-950 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RefreshCw className="w-5 h-5" />
                  Scan Next Ticket
                </button>
             </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

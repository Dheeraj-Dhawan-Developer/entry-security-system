import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, XCircle, CheckCircle, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
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
        setScanResult({ success: false, message: "Invalid QR format. Not a valid event ticket." });
        setProcessing(false);
        return;
      }

      if (!data.id) {
         setScanResult({ success: false, message: "Invalid Ticket: Missing ID." });
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
      setScanResult({ success: false, message: "Error reading ticket data or connecting to database." });
    } finally {
        setProcessing(false);
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    let active = true; // Prevents race conditions in strict mode

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!scanning || !video || !canvas) return;

    // Optimize for frequent reads
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    const tick = () => {
      if (!active) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        // Match canvas size to video stream
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Scan for QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth", // Robustness over speed
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
        video.setAttribute("playsinline", "true"); // Critical for iOS
        video.setAttribute("webkit-playsinline", "true"); // Critical for iOS
        
        // Ensure video plays
        video.play().catch(e => {
            console.error("Video play failed", e);
            setCameraError("Camera stream failed to start.");
        });

        animationFrameId = requestAnimationFrame(tick);
      })
      .catch((err) => {
        console.error("Camera access error:", err);
        if (active) {
          setCameraError("Camera access denied. Please allow camera permissions.");
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
      <div className="w-full bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 relative">
        
        {/* Header */}
        <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            Security Scanner
          </h2>
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${scanning && !processing ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
             <span className="text-xs text-slate-400">{scanning && !processing ? 'Active' : 'Paused'}</span>
          </div>
        </div>

        {/* Camera Viewport */}
        <div className="relative aspect-square bg-black overflow-hidden">
          {scanning && !cameraError && !processing && (
             <div className="absolute inset-0 border-2 border-indigo-500/50 z-10 m-12 rounded-xl animate-pulse flex items-center justify-center">
                <p className="text-indigo-400/80 text-xs font-mono bg-black/50 px-2 py-1 rounded">Align QR Code</p>
             </div>
          )}
          
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-30">
               <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
               <p className="text-red-400 text-sm">{cameraError}</p>
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                <p className="text-white font-medium">Verifying Ticket...</p>
            </div>
          )}

          {/* Result Overlay */}
          {!scanning && scanResult && (
             <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                {scanResult.success ? (
                  <CheckCircle className="w-20 h-20 text-green-500 mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                ) : (
                  <XCircle className="w-20 h-20 text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                )}
                
                <h3 className={`text-2xl font-bold mb-2 ${scanResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {scanResult.success ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </h3>
                
                <p className="text-slate-300 mb-6 font-medium text-lg">
                  {scanResult.message}
                </p>

                {scanResult.record && (
                  <div className="bg-slate-800 p-4 rounded-lg w-full mb-6 border border-slate-700">
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Guest Identity</p>
                    <p className="text-xl font-bold text-white">{scanResult.record.name}</p>
                    <p className="text-indigo-400">{scanResult.record.className} • {scanResult.record.admissionNumber}</p>
                  </div>
                )}

                {/* AI Greeting Section */}
                {scanResult.success && (
                  <div className="w-full mb-6 min-h-[60px]">
                    {loadingAi ? (
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Generating welcome...</span>
                      </div>
                    ) : (
                      aiGreeting && (
                        <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-3 rounded border border-indigo-500/30">
                           <p className="text-indigo-200 text-sm italic">"{aiGreeting}"</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                <button 
                  onClick={resetScanner}
                  className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg hover:scale-105 transform duration-150"
                >
                  <RefreshCw className="w-5 h-5" />
                  Scan Next
                </button>
             </div>
          )}
        </div>
        
      </div>
      <p className="mt-4 text-slate-500 text-xs text-center">
        Ensure good lighting for faster scanning. <br/> 
        Data is synced with Firebase Cloud.
      </p>
    </div>
  );
};
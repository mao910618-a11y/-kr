import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Zap, ZapOff, Aperture, Save, Repeat } from 'lucide-react';
import { Photo } from '../types';

interface PhotoViewProps {
  user: { name: string; avatar: string | null } | null;
  onSavePhoto: (photo: Photo) => void;
}

export const PhotoView: React.FC<PhotoViewProps> = ({ user, onSavePhoto }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashMode, setFlashMode] = useState(false);
  const [hasTorch, setHasTorch] = useState(false); // Track if hardware flash is available
  const [error, setError] = useState<string>('');
  
  // UI States
  const [isFlashing, setIsFlashing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Preview State (After taking photo)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Camera
  useEffect(() => {
    if (!previewImage) {
      startCamera();
    }
    return () => stopCamera();
  }, [facingMode, previewImage]);

  const startCamera = async () => {
    try {
      setError('');
      if (stream) stopCamera();
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          aspectRatio: { ideal: 0.75 } // 3:4 aspect ratio
        },
        audio: false,
      });
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Check for hardware torch support
      const track = newStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any; // Cast to any to access torch
      if (capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
      // Reset flash state when camera changes
      setFlashMode(false);

    } catch (err) {
      console.error("Camera Error:", err);
      setError('無法存取相機');
    }
  };

  const stopCamera = () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      // Turn off torch before stopping if it was on
      if (flashMode && hasTorch) {
         try {
            // @ts-ignore
            track.applyConstraints({ advanced: [{ torch: false }] });
         } catch(e) {}
      }
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Handle Flash Toggle (Real Torch vs Screen Flash)
  const toggleFlash = async () => {
    const newMode = !flashMode;
    setFlashMode(newMode);

    // If hardware torch is available (Back camera), toggle it immediately
    if (hasTorch && stream) {
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          // @ts-ignore
          advanced: [{ torch: newMode }]
        });
      } catch (e) {
        console.error("Torch failed", e);
        // Fallback to UI toggle only if hardware fails
      }
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Visual Screen Flash Logic:
    // 1. If using Front Camera and Flash is ON -> Trigger Screen Flash
    // 2. If using Back Camera and NO hardware torch, but Flash ON -> Trigger Screen Flash
    // 3. Always trigger a quick flash for feedback
    
    // Determine flash duration
    const shouldUseScreenFlash = (!hasTorch && flashMode) || facingMode === 'user';
    
    setIsFlashing(true);
    // If it's a "simulated flash" (front camera), make it last longer to light up the face
    const flashDuration = shouldUseScreenFlash && flashMode ? 400 : 150; 
    
    setTimeout(() => setIsFlashing(false), flashDuration);

    // Add a tiny delay to capture AFTER the screen lights up (if using screen flash)
    const captureDelay = shouldUseScreenFlash && flashMode ? 100 : 0;

    setTimeout(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Use video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Flip if user facing
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Create Preview
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewImage(dataUrl);
        
        // Turn off torch after capture if we want "Flash" behavior, 
        // OR keep it on if we want "Torch" behavior. 
        // For travel convenience, let's keep it ON if user toggled it ON, 
        // until they navigate away or toggle OFF.
        
        // Stop camera stream only after image is captured
        stopCamera();
    }, captureDelay);
  };

  const handleRetake = () => {
    setPreviewImage(null);
    // Camera will restart via useEffect
  };

  const handleSave = () => {
    if (!previewImage) return;

    const newPhoto: Photo = {
      id: Date.now().toString(),
      url: previewImage,
      date: formatDate(currentTime)
    };
    
    onSavePhoto(newPhoto);
    setPreviewImage(null);
  };

  const formatDate = (date: Date) => {
    // Format: YYYY.MM.DD HH:MM
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col items-center px-4 pt-2 pb-24 font-sans relative h-full">
      
      {/* 1. POLAROID FRAME (Serves as Viewfinder OR Preview) */}
      <div className="relative w-[65vw] max-w-[250px] bg-white p-2 pb-8 shadow-xl rounded-[2px] transition-transform duration-300 transform hover:rotate-0 rotate-1 shrink-0 z-10 border border-gray-100">
        
        {/* Inner Area */}
        <div className="relative bg-[#18181b] w-full aspect-[3/4] overflow-hidden rounded-sm ring-1 ring-black/5">
          
          {previewImage ? (
            // PREVIEW IMAGE
            <img src={previewImage} className="w-full h-full object-cover" alt="Preview" />
          ) : (
            // LIVE CAMERA
            <>
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 z-20 space-y-1 p-4 text-center">
                  <span className="text-xs font-sans tracking-wider opacity-80">{error}</span>
                  <span className="text-[9px] opacity-40">(請確認瀏覽器權限)</span>
                </div>
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              )}
              
              {/* Grid Lines (Only in Camera Mode) */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="w-full h-full border border-white/30 relative">
                    <div className="absolute top-1/3 left-0 w-full h-px bg-white/30"></div>
                    <div className="absolute top-2/3 left-0 w-full h-px bg-white/30"></div>
                    <div className="absolute left-1/3 top-0 h-full w-px bg-white/30"></div>
                    <div className="absolute left-2/3 top-0 h-full w-px bg-white/30"></div>
                </div>
              </div>
              
              {/* Recording Dot (Only in Camera Mode) */}
              {!error && (
                <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse z-20"></div>
              )}
            </>
          )}

          {/* Flash Effect Overlay */}
          <div 
            className={`absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-100 ${isFlashing ? 'opacity-100' : 'opacity-0'}`}
          ></div>
        </div>

        {/* Caption Area */}
        <div className="mt-3 px-1 flex justify-center items-center">
            <span className="font-hand text-base text-gray-500 tracking-wide transform -rotate-1 truncate">
              KR-SEOUL / {formatDate(currentTime)}
            </span>
        </div>

        {/* Texture */}
        <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
      </div>

      {/* 2. CONTROLS */}
      <div className="mt-8 flex items-center justify-center gap-6 z-20 shrink-0 w-full px-8">
         
         {previewImage ? (
           // PREVIEW CONTROLS (Retake / Save)
           <>
              <button 
                onClick={handleRetake}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-14 h-14 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm active:scale-95 transition-all group-hover:bg-white group-hover:text-red-500">
                  <Repeat size={24} />
                </div>
                <span className="text-[10px] font-bold text-gray-400">RETAKE</span>
              </button>

              <button 
                onClick={handleSave}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-20 h-20 rounded-full bg-[#00A86B] border-[4px] border-white shadow-lg flex items-center justify-center active:scale-95 transition-all group-hover:bg-[#00c982]">
                   <Save size={32} className="text-white" />
                </div>
                <span className="text-[10px] font-bold text-gray-400">SAVE</span>
              </button>

              <div className="w-14 opacity-0"></div> {/* Spacer to balance layout if needed, or remove */}
           </>
         ) : (
           // CAMERA CONTROLS (Switch / Shutter / Flash)
           <>
             {/* Switch Camera */}
             <button 
               onClick={toggleCamera}
               className="w-12 h-12 rounded-full bg-gray-200/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-600 active:scale-95 transition-all hover:bg-white"
             >
                <RefreshCw size={20} className={facingMode === 'user' ? 'rotate-180 transition-transform' : 'transition-transform'} />
             </button>

             {/* Shutter Button */}
             <button 
               onClick={takePhoto}
               disabled={!!error}
               className="w-20 h-20 rounded-full bg-[#FF4444] border-[4px] border-white shadow-[0_4px_12px_rgba(255,68,68,0.3)] flex items-center justify-center active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
             >
                 <Aperture size={36} className="text-white opacity-90 group-hover:rotate-45 transition-transform duration-300" strokeWidth={1.5} />
             </button>

             {/* Flash Toggle */}
             <button 
               onClick={toggleFlash}
               className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center active:scale-95 transition-all hover:bg-white ${flashMode ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200/80 text-gray-600'}`}
             >
                {flashMode ? <Zap size={20} className="fill-current" /> : <ZapOff size={20} />}
             </button>
           </>
         )}
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
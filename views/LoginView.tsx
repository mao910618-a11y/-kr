import React, { useState, useRef } from 'react';
import { Camera, ArrowRight, Plane } from 'lucide-react';

interface LoginViewProps {
  onLogin: (name: string, avatar: string | null) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Resize image to avoid LocalStorage quota limits (5MB)
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 250; // Limit avatar size
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Compress to JPEG 0.7 quality
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       try {
         const resizedDataUrl = await resizeImage(file);
         setAvatar(resizedDataUrl);
       } catch (err) {
         console.error("Image processing failed", err);
       }
    }
  };

  const handleCheckIn = () => {
    if (!name) return;
    
    // 1. Immediate Save (Backup)
    // Save to LocalStorage RIGHT NOW so if user closes app during animation, they are still logged in next time.
    try {
        const payload = { name, avatar };
        localStorage.setItem('seoul-trip-user', JSON.stringify(payload));
    } catch (e) {
        console.warn("LocalStorage full or error. Trying to save without avatar.");
        // Fallback: Save name only if avatar is too big
        try {
            localStorage.setItem('seoul-trip-user', JSON.stringify({ name, avatar: null }));
        } catch (e2) {}
    }

    setIsPrinting(true);
    
    setTimeout(() => {
      onLogin(name, avatar);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-retro-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-dot-pattern opacity-50 pointer-events-none"></div>
      <div className="absolute top-10 left-10 text-9xl text-retro-accent/5 font-pixel pointer-events-none rotate-12">2026</div>

      {/* --- FORM STATE --- */}
      <div className={`w-full max-w-sm transition-all duration-700 ${isPrinting ? 'opacity-0 scale-90 translate-y-20' : 'opacity-100 scale-100'}`}>
        
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-full bg-retro-card border-4 border-retro-text mb-4 shadow-[4px_4px_0px_0px_rgba(40,54,24,1)]">
            <Plane size={40} className="text-retro-text" />
          </div>
          <h1 className="text-3xl font-pixel text-retro-text mb-2">CHECK-IN</h1>
          <p className="text-xs font-bold font-sans text-retro-accent tracking-widest uppercase">Seoul Trip 2026</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-retro-text/10 space-y-6 relative">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-retro-accent hover:bg-retro-light transition-all overflow-hidden relative group"
              >
                {avatar ? (
                  <img src={avatar} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-retro-accent">
                    <Camera size={24} className="mb-1"/>
                    {name ? (
                       <span className="text-3xl font-black text-gray-300 group-hover:text-retro-accent/50 absolute opacity-20">{name.charAt(0).toUpperCase()}</span>
                    ) : null}
                  </div>
                )}
                {!avatar && <span className="absolute bottom-4 text-[8px] font-bold text-gray-400">OPTIONAL</span>}
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Passenger Photo</span>
            </div>

            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-black text-retro-text ml-2">PASSENGER NAME</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="YOUR NAME" 
                className="w-full bg-retro-bg border-b-2 border-retro-text/20 p-4 text-center text-lg font-black text-retro-text focus:outline-none focus:border-retro-accent placeholder:text-gray-300 uppercase font-mono"
              />
            </div>

            {/* Submit Button */}
            <button 
              onClick={handleCheckIn}
              disabled={!name}
              className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-lg transition-all ${
                name
                  ? 'bg-retro-text text-retro-bg hover:scale-[1.02] active:scale-95' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>PRINT TICKET</span>
              <ArrowRight size={20} />
            </button>
        </div>
      </div>

      {/* --- PRINTING ANIMATION STATE --- */}
      {isPrinting && (
        <div className="absolute inset-0 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-sm z-50">
          
          {/* Printer Slot (Visual only) */}
          <div className="absolute top-0 w-64 h-4 bg-gray-800 rounded-b-xl z-20 shadow-2xl"></div>

          {/* The Ticket / Baggage Tag Design - REALISTIC VERSION */}
          <div className="w-72 bg-[#E3D5CA] relative rounded-xl shadow-2xl overflow-hidden animate-[ticket-print_3s_ease-out_forwards] origin-top border-[2px] border-[#3E2723] flex flex-col font-sans">
            
            {/* Paper Texture Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#3E2723_1px,transparent_1px)] bg-[length:16px_16px]"></div>

            {/* Top Header Row (Small) */}
            <div className="flex justify-between items-center px-3 py-1.5 border-b-[2px] border-[#3E2723] text-[#3E2723] bg-[#D7CCC8]/30">
                <span className="text-[7px] font-black uppercase tracking-widest opacity-80">ISSUED BY: LUYOGEMAO</span>
                <span className="text-[7px] font-black uppercase tracking-widest opacity-80">BAGGAGE TAG</span>
            </div>

            {/* Top Grommet (Absolute) */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#B71C1C] border-[3px] border-[#E3D5CA] z-30 shadow-md flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#2a1d1a]"></div>
            </div>

            {/* Row 1: User Info & Photo */}
            <div className="flex h-24 border-b-[2px] border-[#3E2723]">
                {/* Name Cell */}
                <div className="w-2/3 border-r-[2px] border-[#3E2723] p-3 flex flex-col justify-center relative bg-[#E3D5CA]">
                    <span className="text-[8px] font-bold text-[#3E2723]/60 uppercase tracking-wide mb-1">PASSENGER NAME</span>
                    <div className="relative z-10">
                        <span className="text-xl font-black text-[#2a1d1a] font-mono leading-none uppercase -rotate-1 block transform origin-left opacity-90">{name}</span>
                        {/* Fake marker underline */}
                        <div className="h-0.5 w-full bg-[#2a1d1a]/20 mt-1 rounded-full transform rotate-1"></div>
                    </div>
                </div>
                
                {/* Photo Cell */}
                <div className="w-1/3 p-0 relative overflow-hidden bg-[#D7CCC8] flex items-center justify-center group">
                     {avatar ? (
                         <div className="w-full h-full relative">
                            <img src={avatar} className="w-full h-full object-cover filter sepia contrast-125 grayscale-[0.3]" />
                            <div className="absolute inset-0 bg-[#3E2723]/10 mix-blend-multiply"></div>
                         </div>
                     ) : (
                         <span className="text-4xl font-black text-[#3E2723]/20">{name.charAt(0)}</span>
                     )}
                     <span className="absolute bottom-1 right-1 text-[6px] font-bold text-white/80 bg-black/20 px-1 rounded">PHOTO</span>
                </div>
            </div>

            {/* Row 2: Destination SEOUL */}
            <div className="h-40 relative flex flex-col items-center justify-center border-b-[2px] border-[#3E2723] bg-[#E3D5CA] overflow-hidden">
                <span className="text-[9px] font-black tracking-[0.4em] text-[#3E2723]/70 mb-0 z-10 absolute top-3">FINAL DESTINATION</span>
                <h1 className="text-[5.5rem] font-black text-[#2a1d1a] tracking-tighter leading-none scale-y-[1.2] z-10 font-sans relative drop-shadow-sm">
                    SEOUL
                </h1>
                
                {/* Grunge/Stamp overlay */}
                <div className="absolute left-3 bottom-3 w-16 h-16 rounded-full border-[3px] border-[#3E2723]/30 flex items-center justify-center transform -rotate-12 mix-blend-multiply pointer-events-none">
                    <div className="text-[7px] font-black text-[#3E2723]/40 text-center leading-tight">
                        ICN<br/>AIRPORT<br/>CHECKED
                    </div>
                </div>
                <div className="absolute right-2 top-8 text-[#2a1d1a]/5 text-6xl font-black pointer-events-none select-none">KR</div>
            </div>

            {/* Row 3: Dates */}
            <div className="grid grid-cols-2 divide-x-[2px] divide-[#3E2723] border-b-[2px] border-[#3E2723] bg-[#E3D5CA]">
                {/* Start Date */}
                <div className="p-2 h-16 flex flex-col relative justify-center">
                    <span className="text-[7px] font-bold text-[#3E2723]/60 uppercase tracking-wide text-center mb-1">DEPARTURE</span>
                    <div className="flex items-center justify-center">
                        <span className="text-lg font-bold text-[#2a1d1a] font-mono tracking-tighter">2026.01.16</span>
                    </div>
                </div>
                {/* End Date */}
                <div className="p-2 h-16 flex flex-col relative justify-center">
                    <span className="text-[7px] font-bold text-[#3E2723]/60 uppercase tracking-wide text-center mb-1">RETURN</span>
                    <div className="flex items-center justify-center">
                        <span className="text-lg font-bold text-[#2a1d1a] font-mono tracking-tighter">2026.01.20</span>
                    </div>
                </div>
            </div>
            
            {/* Bottom Footer Area - READY TO GO */}
            <div className="flex-1 min-h-[60px] flex items-center justify-center bg-[#E3D5CA] relative">
                 <span className="text-lg font-pixel text-[#2a1d1a] tracking-widest animate-pulse whitespace-nowrap">
                    READY TO GO!
                 </span>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes ticket-print {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          20% {
             opacity: 1;
          }
          100% {
            transform: translateY(0%);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
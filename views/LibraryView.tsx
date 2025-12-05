import React, { useState } from 'react';
import { Photo } from '../types';
import { Trash2, Download, X } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface LibraryViewProps {
  photos: Photo[];
  onDeletePhoto: (id: string) => void;
  isSharedGallery: boolean; // New prop to indicate sync status
}

export const LibraryView: React.FC<LibraryViewProps> = ({ photos, onDeletePhoto, isSharedGallery }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      // Calls indexedDB delete via App.tsx prop
      onDeletePhoto(deleteTargetId);
      if (selectedPhoto?.id === deleteTargetId) {
        setSelectedPhoto(null);
      }
      setDeleteTargetId(null);
    }
  };

  // Helper: Force browser download from Blob
  const forceDownload = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownload = async (photo: Photo) => {
    setIsProcessing(true);
    const filename = `SEOUL_${photo.date.replace(/[: .]/g, '')}.jpg`;

    try {
      // --- Method 1: Try creating a fancy Polaroid with Canvas ---
      // This requires the image server to support CORS (Access-Control-Allow-Origin: *)
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No Context");

      // Configuration for high-res output
      const padding = 60;
      const bottomPadding = 200;
      const targetWidth = 1080;
      const imgWidth = targetWidth - (padding * 2);
      const imgHeight = imgWidth * (4/3);
      const targetHeight = padding + imgHeight + bottomPadding;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // 1. Draw Paper Background (White)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Load Image
      const img = new Image();
      // Add timestamp to prevent caching issues with CORS headers
      const cacheBuster = photo.url.includes('?') ? '&t=' : '?t=';
      img.src = photo.url + cacheBuster + new Date().getTime();
      
      // IMPORTANT: Request CORS permission
      img.crossOrigin = "anonymous"; 
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        // If server doesn't send CORS header, this triggers error
        img.onerror = () => reject(new Error("CORS_BLOCK"));
      });

      // Maintain aspect ratio cover/fit
      ctx.drawImage(img, padding, padding, imgWidth, imgHeight);

      // 3. Draw Text
      ctx.fillStyle = '#666666';
      ctx.font = '60px "Nanum Pen Script", cursive'; 
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const captionY = padding + imgHeight + (bottomPadding / 2);
      const captionText = photo.author ? `Photo by ${photo.author}` : `KR-SEOUL / ${photo.date}`;
      ctx.fillText(captionText, canvas.width / 2, captionY);

      // 4. Trigger Download of Canvas
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (e: any) {
      console.warn("Polaroid generation failed (likely CORS), falling back to direct download.", e);
      
      // --- Method 2: Fallback - Download Original File ---
      // If canvas failed (CORS), we try to fetch the blob directly.
      
      try {
        const response = await fetch(photo.url);
        if (!response.ok) throw new Error("Network response was not ok");
        const blob = await response.blob();
        forceDownload(blob, `RAW_${filename}`);
        alert("Note: Saved original photo (Cloud security prevented adding the frame).");
      } catch (fetchError) {
        console.error("Direct fetch failed", fetchError);
        // --- Method 3: Last Resort - Open in New Tab ---
        // If fetch also fails due to strict CORS, just open it
        window.open(photo.url, '_blank');
        alert("Image opened in new tab. Please long-press to save.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="px-4 py-6 relative">
       {/* Header */}
       <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-pixel text-retro-text">GALLERY</h1>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Memories ({photos.length})
                </span>
            </div>
          </div>
       </div>

       {photos.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
               <span className="text-2xl">📷</span>
            </div>
            <p className="text-gray-400 text-sm font-bold">No photos yet.</p>
            <p className="text-gray-300 text-[10px] mt-1">Go to Photo tab to snap some!</p>
         </div>
       ) : (
         <div className="grid grid-cols-2 gap-4 pb-20">
            {photos.map((photo, idx) => (
              <div 
                key={photo.id} 
                onClick={() => setSelectedPhoto(photo)}
                className={`bg-white p-2 pb-6 shadow-md rounded-[2px] border border-gray-100 relative group transition-transform active:scale-95 duration-200 cursor-pointer ${idx % 2 === 0 ? '-rotate-1 hover:rotate-0' : 'rotate-1 hover:rotate-0'}`}
              >
                 {/* Photo */}
                 <div className="aspect-[3/4] bg-gray-100 w-full overflow-hidden mb-2 relative pointer-events-none">
                    <img src={photo.url} className="w-full h-full object-cover" alt="Memory" loading="lazy" />
                 </div>
                 
                 {/* Caption */}
                 <div className="px-1 text-center pointer-events-none">
                    <span className="font-hand text-sm text-gray-500 block leading-none truncate w-full">
                        {photo.author ? `by ${photo.author}` : 'Seoul'}
                    </span>
                    <span className="font-mono text-[8px] text-gray-300 block mt-1">{photo.date}</span>
                 </div>

                 {/* Tape/Paper effect */}
                 <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-yellow-100/80 rotate-2 shadow-sm opacity-60"></div>
              </div>
            ))}
         </div>
       )}

       {/* Confirmation Modal */}
       <ConfirmModal 
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="DELETE PHOTO?"
        message="This memory will be lost forever. Continue?"
      />

       {/* === LIGHTBOX MODAL === */}
       {selectedPhoto && (
         <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 safe-area-inset-bottom">
            
            {/* Close Button - Moved to corner with background for visibility */}
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-50 bg-black/20 rounded-full backdrop-blur-sm active:scale-90 transition-transform"
            >
              <X size={24} />
            </button>

            {/* The Polaroid Preview - Responsive Sizing */}
            <div className="w-full max-w-[300px] max-h-[65vh] flex flex-col items-center justify-center shrink-0">
               <div className="bg-white p-3 pb-8 rounded-[2px] shadow-2xl w-full h-auto transform transition-all duration-300 relative">
                  <div className="aspect-[3/4] bg-gray-100 w-full overflow-hidden mb-3 relative ring-1 ring-black/5">
                      <img src={selectedPhoto.url} className="w-full h-full object-cover" alt="Full size" />
                  </div>
                  <div className="text-center">
                      <span className="font-hand text-xl text-gray-600 tracking-wide">
                        {selectedPhoto.author ? `Photo by ${selectedPhoto.author}` : `KR-SEOUL / ${selectedPhoto.date}`}
                      </span>
                  </div>
                  {/* Texture Overlay */}
                  <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
               </div>
            </div>

            {/* Actions Bar - Positioned closer to image */}
            <div className="flex items-center gap-10 mt-6 shrink-0">
               <button 
                 onClick={() => handleDeleteClick(selectedPhoto.id)}
                 className="flex flex-col items-center gap-2 text-white/80 hover:text-red-400 transition-colors group"
               >
                 <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-red-500/20 group-active:scale-95 transition-all backdrop-blur-sm border border-white/5">
                    <Trash2 size={20} />
                 </div>
                 <span className="text-[10px] font-bold tracking-widest">DELETE</span>
               </button>

               <button 
                 onClick={() => handleDownload(selectedPhoto)}
                 disabled={isProcessing}
                 className="flex flex-col items-center gap-2 text-white hover:text-retro-light transition-colors group"
               >
                 <div className="w-14 h-14 rounded-full bg-retro-accent flex items-center justify-center shadow-[0_0_20px_rgba(212,163,115,0.4)] group-hover:scale-110 group-active:scale-95 transition-all border border-white/10">
                    {isProcessing ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Download size={24} />
                    )}
                 </div>
                 <span className="text-[10px] font-bold tracking-widest">SAVE</span>
               </button>
            </div>
         </div>
       )}
    </div>
  );
};
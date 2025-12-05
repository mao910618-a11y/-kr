import React, { useState, useRef } from 'react';
import { X, Camera, Trash2, User, Users, Plus, Minus } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { CloudConfigModal } from './CloudConfigModal';

// Custom 4-point star SVG component to match the reference image
const PixelStar = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke="none" />
  </svg>
);

interface HeaderProps {
  user: {
    name: string;
    avatar: string | null;
  };
  tripUsers: string[];
  onDeleteUser?: () => void;
  onUpdateAvatar?: (newAvatar: string) => void;
  onAddUser: (name: string) => void;
  onRemoveUser: (name: string) => void;
  isCloudConnected?: boolean;
  onRefreshCloud?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, tripUsers, onDeleteUser, onUpdateAvatar, onAddUser, onRemoveUser, isCloudConnected = false, onRefreshCloud }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  
  // Generic Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  const [newUserName, setNewUserName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateAvatar) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger Reset App Confirmation
  const triggerResetApp = () => {
    setConfirmState({
      isOpen: true,
      title: "RESET APP?",
      message: "This will log you out and DELETE ALL DATA on this device.",
      action: () => {
        if (onDeleteUser) onDeleteUser();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        setIsProfileOpen(false);
      }
    });
  };

  // Trigger Remove Friend Confirmation
  const triggerRemoveFriend = (friendName: string) => {
    setConfirmState({
      isOpen: true,
      title: `REMOVE ${friendName}?`,
      message: "This only removes them from your list. It does not affect their phone.",
      action: () => {
        onRemoveUser(friendName);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
        onAddUser(newUserName.trim());
        setNewUserName('');
    }
  };

  return (
    <>
      <div className="relative z-20 bg-retro-bg px-5 pt-6 pb-4">
        {/* Header */}
        <div className="flex justify-between items-end">
          
          {/* Left: App Logo/Title */}
          <div className="relative pl-1">
            <PixelStar className="absolute -top-3 -left-3 w-4 h-4 text-black animate-pulse" />
            <div className="flex flex-col leading-none">
              <h1 className="text-xl sm:text-2xl font-pixel text-black uppercase tracking-tighter">
                LUYOGEMAO
              </h1>
            </div>
            <PixelStar className="absolute -bottom-2 -right-3 w-3 h-3 text-black animate-pulse delay-75" />
          </div>
          
          {/* Right: Actions & User Info */}
          <div className="flex items-center gap-2">
            
            {/* User Info (Clickable) */}
            <button 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 group active:scale-95 transition-transform ml-1"
            >
              <div className="text-right flex flex-col items-end">
                <div className="text-[9px] font-bold text-gray-400 font-sans tracking-widest uppercase group-hover:text-retro-accent transition-colors">PASSENGER</div>
                <div className="text-xs font-bold text-gray-800 font-sans bg-yellow-100/50 px-1 rounded border border-transparent group-hover:border-retro-accent/30 transition-all">{user.name || 'GUEST'}</div>
              </div>
              
              {/* User Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#E5E5E5] flex items-center justify-center font-bold text-gray-500 border-2 border-white shadow-sm text-lg overflow-hidden relative group-hover:ring-2 ring-retro-accent/50 transition-all">
                {user.avatar ? (
                  <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400">{user.name ? user.name.charAt(0).toUpperCase() : 'G'}</span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.action}
        title={confirmState.title}
        message={confirmState.message}
      />

      <CloudConfigModal 
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onConnect={() => onRefreshCloud && onRefreshCloud()}
      />

      {/* === PASSENGER LIST MODAL === */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#FEFAE0] p-5 rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-white relative flex flex-col max-h-[80vh]">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsProfileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1.5 shadow-sm active:scale-90 transition-transform z-10"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2 text-retro-text mb-2 pb-3 border-b-2 border-dashed border-gray-300">
              <Users size={18} className="fill-current" />
              <h3 className="text-base font-pixel">PASSENGER LIST</h3>
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 py-2">
              
              {/* --- Current Logged-in User Item (App Holder) --- */}
              <div className="bg-white p-2.5 rounded-xl border border-retro-text/10 shadow-sm flex items-center justify-between group relative overflow-hidden mb-3">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-retro-accent"></div>
                 
                 <div className="flex items-center gap-3">
                    {/* Avatar (Click to Edit) */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-10 h-10 rounded-full bg-gray-200 border border-gray-100 shadow-inner overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                    >
                        {user.avatar ? (
                          <img src={user.avatar} className="w-full h-full object-cover filter sepia-[.2]" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-300">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        {/* Camera Overlay */}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Camera size={14} className="text-white drop-shadow-md" />
                        </div>
                    </div>
                    
                    {/* Info */}
                    <div>
                        <div className="text-[8px] font-bold text-retro-accent uppercase tracking-wider mb-0.5">APP HOLDER (YOU)</div>
                        <div className="text-sm font-black text-retro-text font-mono leading-none">{user.name}</div>
                    </div>
                 </div>

                 {/* Reset Action */}
                 <button 
                    onClick={triggerResetApp}
                    className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors active:scale-95 flex flex-col items-center gap-0.5"
                    title="Reset App Data"
                 >
                    <Trash2 size={14} />
                    <span className="text-[6px] font-bold">RESET</span>
                 </button>

                 <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              {/* Separator */}
              <div className="flex items-center gap-2 py-1">
                 <div className="h-px bg-gray-200 flex-1"></div>
                 <span className="text-[9px] font-bold text-gray-400 uppercase">Friends / Group</span>
                 <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              {/* --- Virtual Users List --- */}
              {tripUsers.filter(u => u !== 'Me' && u !== user.name).length === 0 ? (
                 <div className="text-center py-4 text-[10px] text-gray-300 font-bold italic">
                    No friends added yet.
                 </div>
              ) : (
                tripUsers.filter(u => u !== 'Me' && u !== user.name).map((u) => (
                    <div key={u} className="bg-white/60 p-2 rounded-lg border border-transparent hover:border-retro-text/10 flex items-center justify-between group transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#E5E5E5] flex items-center justify-center text-[10px] font-bold text-gray-500">
                               {u.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs text-gray-600">{u}</span>
                        </div>
                        <button 
                           onClick={() => triggerRemoveFriend(u)}
                           className="p-1.5 text-gray-300 hover:text-red-400 transition-colors hover:bg-red-50 rounded-md"
                        >
                           <Minus size={12} />
                        </button>
                    </div>
                ))
              )}
              
              {/* --- Add New User Input --- */}
              <form onSubmit={handleAddNewUser} className="pt-2 mt-2 border-t border-dashed border-gray-200">
                 <div className="flex gap-2">
                    <input 
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Add friend's name..."
                        className="flex-1 p-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-retro-accent outline-none text-[10px] font-bold"
                    />
                    <button 
                       type="submit"
                       className="bg-retro-accent text-white px-3 rounded-lg hover:bg-[#c29363] active:scale-95 transition-transform"
                    >
                       <Plus size={14} />
                    </button>
                 </div>
              </form>

            </div>

            <div className="pt-2 text-center">
                 <p className="text-[8px] text-gray-400 font-sans font-bold leading-tight px-4">
                    {isCloudConnected 
                      ? "✅ Cloud Sync Active: Changes update everyone." 
                      : "* Local Mode: Changes only affect this device."}
                 </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
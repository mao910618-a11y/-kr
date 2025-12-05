import React from 'react';
import { CircleDollarSign, PenTool, Map, Camera, Images } from 'lucide-react';
import { Tab } from '../types';

interface NavBarProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ currentTab, onTabChange }) => {
  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'settle', label: 'Settle', icon: <CircleDollarSign size={20} /> },
    { id: 'tool', label: 'Tool', icon: <PenTool size={20} /> },
    { id: 'plan', label: 'Plan', icon: <Map size={20} /> },
    { id: 'photo', label: 'Photo', icon: <Camera size={20} /> },
    { id: 'library', label: 'Gallery', icon: <Images size={20} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-retro-bg border-t-2 border-retro-text/10 pb-safe pt-2 px-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-end pb-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                isActive 
                  ? 'text-retro-text -translate-y-1' 
                  : 'text-retro-text/50 hover:text-retro-text/80'
              }`}
            >
              <div className={`p-2 rounded-2xl ${isActive ? 'bg-retro-light shadow-sm' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
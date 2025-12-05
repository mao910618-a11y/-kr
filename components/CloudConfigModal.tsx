import React, { useState } from 'react';
import { X, Cloud, Check, AlertCircle, Lock } from 'lucide-react';
import { FirebaseConfig } from '../types';
import { initFirebase, YOUR_FIREBASE_CONFIG } from '../services/firebase';

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({ isOpen, onClose, onConnect }) => {
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if keys are hardcoded in source
  const isPreConfigured = YOUR_FIREBASE_CONFIG.apiKey !== "";

  // Load existing config if available for editing (only if not pre-configured)
  React.useEffect(() => {
    if (!isPreConfigured) {
        const saved = localStorage.getItem('seoul-firebase-config');
        if (saved) setConfigJson(saved);
    }
  }, [isPreConfigured]);

  const handleConnect = () => {
    try {
      setError('');
      // Flexible parsing: allows pasting the whole object or just the JSON
      const cleanJson = configJson.replace(/const firebaseConfig = /, '').replace(/;/, '');
      const config: FirebaseConfig = JSON.parse(cleanJson);
      
      if (!config.apiKey || !config.projectId) {
        throw new Error("Invalid Config: Missing apiKey or projectId");
      }

      const initialized = initFirebase(config);
      if (initialized) {
        localStorage.setItem('seoul-firebase-config', JSON.stringify(config));
        setIsSuccess(true);
        setTimeout(() => {
           onConnect();
           onClose();
        }, 1500);
      } else {
        throw new Error("Failed to initialize Firebase SDK");
      }

    } catch (e) {
      setError('Invalid JSON Configuration. Please copy the "firebaseConfig" object from Firebase Console.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#FEFAE0] p-6 rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-white relative">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-white rounded-full p-2"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors ${isSuccess || isPreConfigured ? 'bg-green-100 text-green-600' : 'bg-retro-accent/20 text-retro-accent'}`}>
                {isSuccess || isPreConfigured ? <Check size={32} /> : <Cloud size={32} />}
            </div>
            <h3 className="text-xl font-pixel text-retro-text">SYNC WITH FRIENDS</h3>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Connect to Cloud Database</p>
        </div>

        {isPreConfigured ? (
             <div className="text-center py-6 space-y-4">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center gap-2">
                    <Lock size={20} className="text-green-600"/>
                    <p className="text-xs font-bold text-green-800">App Pre-Configured</p>
                    <p className="text-[10px] text-green-600 leading-tight">
                        You have embedded the API keys in the code.<br/>
                        Everyone using this app is automatically connected to:
                    </p>
                    <code className="text-[10px] bg-white px-2 py-1 rounded border border-green-200 font-mono text-green-700">
                        {YOUR_FIREBASE_CONFIG.projectId}
                    </code>
                </div>
                <p className="text-[10px] text-gray-400 font-bold">You don't need to do anything else!</p>
            </div>
        ) : isSuccess ? (
            <div className="text-center py-8">
                <p className="text-lg font-bold text-green-600">CONNECTED!</p>
                <p className="text-xs text-gray-500 mt-2">Your app is now syncing in real-time.</p>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs text-orange-800 leading-relaxed">
                    <strong>Note:</strong> To enable real-time sharing with friends, you need a Firebase project.
                    <ol className="list-decimal ml-4 mt-2 space-y-1 opacity-80 text-[10px]">
                        <li>Create free project at console.firebase.google.com</li>
                        <li>Create Firestore & Storage (Test mode)</li>
                        <li>Paste your <code>firebaseConfig</code> JSON below</li>
                    </ol>
                </div>

                <textarea
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    placeholder='{ "apiKey": "...", "projectId": "..." }'
                    className="w-full h-32 p-3 rounded-xl bg-white border-2 border-transparent focus:border-retro-accent outline-none text-[10px] font-mono"
                />

                {error && (
                    <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold px-1">
                        <AlertCircle size={12} />
                        {error}
                    </div>
                )}

                <button 
                    onClick={handleConnect}
                    className="w-full bg-retro-text text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
                >
                    CONNECT & SYNC
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
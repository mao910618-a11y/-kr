import React, { useState, useEffect } from 'react';
import { Tab, ItineraryItem, ExpenseItem, Photo, DEFAULT_TRIP_USERS, FirebaseConfig } from './types';
import { NavBar } from './components/NavBar';
import { Header } from './components/Header';
import { SettleView } from './views/SettleView';
import { ToolView } from './views/ToolView';
import { PlanView } from './views/PlanView';
import { PhotoView } from './views/PhotoView';
import { LibraryView } from './views/LibraryView';
import { LoginView } from './views/LoginView';
import { getPhotosFromDB, addPhotoToDB, deletePhotoFromDB, clearPhotosFromDB } from './utils/db';
import { initFirebase, isFirebaseInitialized, isStorageInitialized, subscribeToUsers, subscribeToExpenses, subscribeToItinerary, subscribeToPhotos, syncAddUser, syncRemoveUser, syncAddExpense, syncDeleteExpense, syncUpdateItinerary, syncDeleteItinerary, uploadPhotoToCloud, deletePhotoFromCloud, YOUR_FIREBASE_CONFIG } from './services/firebase';

interface UserData {
  name: string;
  avatar: string | null;
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<Tab>('plan');
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  
  // User State
  const [user, setUser] = useState<UserData | null>(() => {
    try {
      const savedUser = localStorage.getItem('seoul-trip-user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) { return null; }
  });

  // --- DATA STATES ---
  const [tripUsers, setTripUsers] = useState<string[]>(DEFAULT_TRIP_USERS);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
    let connected = false;

    // 1. Priority: Check if User added keys in source code (YOUR_FIREBASE_CONFIG)
    if (YOUR_FIREBASE_CONFIG.apiKey !== "") {
        console.log("Auto-connecting using pre-configured keys...");
        if (initFirebase(YOUR_FIREBASE_CONFIG)) {
            setIsCloudConnected(true);
            connected = true;
        }
    }

    // 2. Fallback: Check for saved Firebase Config in LocalStorage (Manual Entry)
    if (!connected) {
        const savedConfig = localStorage.getItem('seoul-firebase-config');
        if (savedConfig) {
            try {
                const config: FirebaseConfig = JSON.parse(savedConfig);
                if (initFirebase(config)) {
                    setIsCloudConnected(true);
                    connected = true;
                }
            } catch (e) {
                console.error("Failed to auto-connect cloud from localstorage", e);
            }
        }
    }
    
    // 3. If NOT connected to cloud, Load Local Data
    if (!connected) {
      loadLocalData();
    }
  }, []);

  const loadLocalData = () => {
     try {
       const u = localStorage.getItem('seoul-trip-users');
       if(u) setTripUsers(JSON.parse(u));

       const i = localStorage.getItem('seoul-trip-itinerary');
       if(i) setItinerary(JSON.parse(i));
       
       const e = localStorage.getItem('seoul-tool-expenses');
       if(e) setExpenses(JSON.parse(e));

       getPhotosFromDB().then(setPhotos);
     } catch(e) {}
  };

  // --- CLOUD SYNC SUBSCRIPTIONS ---
  useEffect(() => {
    if (!isCloudConnected) return;
    
    // Subscribe to Firestore Data
    const unsubUsers = subscribeToUsers(setTripUsers);
    const unsubExpenses = subscribeToExpenses(setExpenses);
    const unsubItinerary = subscribeToItinerary(setItinerary);
    
    // Subscribe to Photos ONLY if Storage is available
    let unsubPhotos = () => {};
    if (isStorageInitialized()) {
        unsubPhotos = subscribeToPhotos(setPhotos);
    } else {
        // Fallback: If cloud is connected (DB) but Storage is not, use Local Photos
        console.log("Cloud connected but Storage missing: Using local photos.");
        getPhotosFromDB().then(setPhotos);
    }

    return () => {
      unsubUsers();
      unsubExpenses();
      unsubItinerary();
      unsubPhotos();
    };
  }, [isCloudConnected]);

  // --- LOCAL PERSISTENCE (Only if NOT Cloud) ---
  useEffect(() => {
    if (!isCloudConnected && itinerary.length > 0) 
      localStorage.setItem('seoul-trip-itinerary', JSON.stringify(itinerary));
  }, [itinerary, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected && expenses.length > 0)
      localStorage.setItem('seoul-tool-expenses', JSON.stringify(expenses));
  }, [expenses, isCloudConnected]);

  useEffect(() => {
    if (!isCloudConnected && tripUsers.length > 0)
      localStorage.setItem('seoul-trip-users', JSON.stringify(tripUsers));
  }, [tripUsers, isCloudConnected]);


  // --- HANDLERS (HYBRID: Check Cloud ? Cloud : Local) ---

  const handleManualRefreshCloud = () => {
    if (isFirebaseInitialized()) {
      setIsCloudConnected(true);
    }
  };

  const handleAddTripUser = (name: string) => {
    if (!name.trim()) return;
    if (isCloudConnected) {
      syncAddUser(name);
    } else {
      if (!tripUsers.includes(name)) setTripUsers(prev => [...prev, name]);
    }
  };

  const handleRemoveTripUser = (name: string) => {
    if (name === 'Me') return;
    if (isCloudConnected) {
      syncRemoveUser(name);
    } else {
      setTripUsers(prev => prev.filter(u => u !== name));
    }
  };

  // --- Wrapper Handlers for Views ---
  
  // 1. Itinerary Wrapper
  const handleItineraryChange = (action: 'add' | 'update' | 'delete', item: ItineraryItem) => {
     if (isCloudConnected) {
        if (action === 'delete') syncDeleteItinerary(item.id);
        else syncUpdateItinerary(item);
     } else {
        setItinerary(prev => {
           if (action === 'delete') return prev.filter(i => i.id !== item.id);
           if (action === 'add') return [...prev, item];
           return prev.map(i => i.id === item.id ? item : i);
        });
     }
  };

  // 2. Expenses Wrapper
  const handleExpensesChange = (action: 'add' | 'delete', item: ExpenseItem) => {
    if (isCloudConnected) {
       if (action === 'delete') syncDeleteExpense(item.id);
       else syncAddExpense(item);
    } else {
       setExpenses(prev => {
          if (action === 'delete') return prev.filter(e => e.id !== item.id);
          return [...prev, item];
       });
    }
  };

  // 3. Photos Wrapper
  const handleSavePhoto = async (newPhoto: Photo) => {
    // Inject Author
    const photoWithAuthor = { 
        ...newPhoto, 
        author: user?.name || 'Anonymous' 
    };

    let savedToCloud = false;
    
    if (isCloudConnected && isStorageInitialized()) {
      try {
        await uploadPhotoToCloud(photoWithAuthor);
        savedToCloud = true;
      } catch (e) {
        console.warn("Cloud upload failed, falling back to local", e);
      }
    }

    // If not connected OR if cloud upload failed/skipped
    if (!savedToCloud) {
       setPhotos(prev => [photoWithAuthor, ...prev]);
       await addPhotoToDB(photoWithAuthor);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    try {
      if (isCloudConnected && isStorageInitialized() && photo.uploaded) {
        await deletePhotoFromCloud(photo);
      } else {
        setPhotos(prev => prev.filter(p => p.id !== id));
        await deletePhotoFromDB(id);
      }
    } catch (e) {
      console.error("Delete photo failed", e);
    }
  };

  // --- LOGIN / LOGOUT ---

  const handleLogin = (name: string, avatar: string | null) => {
    const newUser = { name, avatar };
    setUser(newUser);
    localStorage.setItem('seoul-trip-user', JSON.stringify(newUser));
  };

  const handleDeleteUser = async () => {
    // Reset Everything
    localStorage.clear();
    await clearPhotosFromDB();
    setUser(null);
    setItinerary([]);
    setExpenses([]);
    setPhotos([]);
    setTripUsers(DEFAULT_TRIP_USERS);
    setIsCloudConnected(false);
    // Reload to clear memory states cleanly
    window.location.reload();
  };
  
  const handleUpdateAvatar = (newAvatar: string) => {
    if (!user) return;
    const updatedUser = { ...user, avatar: newAvatar };
    setUser(updatedUser);
    localStorage.setItem('seoul-trip-user', JSON.stringify(updatedUser));
  };

  const renderView = () => {
    switch (currentTab) {
      case 'settle': return <SettleView expenses={expenses} tripUsers={tripUsers} />;
      case 'tool': 
        // Adapting ToolView to new handler pattern requires small refactor or wrapper
        return <ToolView 
          expenses={expenses} 
          setExpenses={(val) => {
             // Hack support for legacy dispatch if needed
          }} 
          onAdd={(item) => handleExpensesChange('add', item)}
          onDelete={(id) => handleExpensesChange('delete', { id } as ExpenseItem)}
          tripUsers={tripUsers} 
        />;
      case 'plan': 
        return <PlanView 
          items={itinerary} 
          onAdd={(item) => handleItineraryChange('add', item)}
          onUpdate={(item) => handleItineraryChange('update', item)}
          onDelete={(id) => handleItineraryChange('delete', { id } as ItineraryItem)}
        />;
      case 'photo': return <PhotoView user={user} onSavePhoto={handleSavePhoto} />;
      case 'library': return <LibraryView 
          photos={photos} 
          onDeletePhoto={handleDeletePhoto} 
          isSharedGallery={isCloudConnected && isStorageInitialized()} 
      />;
      default: return <SettleView expenses={expenses} tripUsers={tripUsers} />;
    }
  };

  if (!user) {
    return (
       <div className="min-h-screen bg-gray-200 font-sans text-retro-text flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-retro-bg relative shadow-2xl overflow-hidden flex flex-col border-x border-black/5">
           <LoginView onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 font-sans text-retro-text selection:bg-retro-accent selection:text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-retro-bg relative shadow-2xl overflow-hidden flex flex-col border-x border-black/5">
        <div className="absolute inset-0 z-0 pointer-events-none bg-dot-pattern"></div>
        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10 pb-24">
          <Header 
            user={user}
            tripUsers={tripUsers}
            onDeleteUser={handleDeleteUser}
            onUpdateAvatar={handleUpdateAvatar}
            onAddUser={handleAddTripUser}
            onRemoveUser={handleRemoveTripUser}
            isCloudConnected={isCloudConnected}
            onRefreshCloud={handleManualRefreshCloud}
          />
          {renderView()}
        </main>
        <NavBar currentTab={currentTab} onTabChange={setCurrentTab} />
      </div>
    </div>
  );
};

export default App;
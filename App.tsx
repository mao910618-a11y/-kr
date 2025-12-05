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

// Define safely outside component to avoid recreation
const safeMigrateExpenses = (items: any[]): ExpenseItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    // Defensive check for payer
    const payer = item.payer || 'Me';
    // Fallback logic for splitBy
    const splitBy = Array.isArray(item.splitBy) && item.splitBy.length > 0
        ? item.splitBy 
        : (item.isShared ? DEFAULT_TRIP_USERS : [payer]);
    
    return {
      ...item,
      payer,
      splitBy
    };
  });
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<Tab>('plan');
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  
  // User State - Added try-catch and extra validation
  const [user, setUser] = useState<UserData | null>(() => {
    try {
      const savedUser = localStorage.getItem('seoul-trip-user');
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      // Validate structure
      if (parsed && typeof parsed.name === 'string') {
        return parsed;
      }
      return null;
    } catch (e) { return null; }
  });

  // --- DATA STATES ---
  const [tripUsers, setTripUsers] = useState<string[]>(DEFAULT_TRIP_USERS);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  // Exchange Rate State
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      const savedRate = localStorage.getItem('seoul-exchange-rate');
      const parsed = savedRate ? parseFloat(savedRate) : 0.0235;
      return isNaN(parsed) ? 0.0235 : parsed;
    } catch { return 0.0235; }
  });

  // Fetch Live Exchange Rate on mount
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/KRW');
        const data = await res.json();
        if (data && data.rates && data.rates.TWD) {
           const rate = data.rates.TWD;
           setExchangeRate(rate);
           localStorage.setItem('seoul-exchange-rate', rate.toString());
        }
      } catch (e) {
        console.warn("Failed to fetch exchange rate, using default/saved.", e);
      }
    };
    fetchRate();
  }, []);

  const handleRateChange = (newRate: number) => {
    setExchangeRate(newRate);
    localStorage.setItem('seoul-exchange-rate', newRate.toString());
  };


  // --- INITIALIZATION ---
  useEffect(() => {
    let connected = false;

    // 1. Priority: Check if User added keys in source code (YOUR_FIREBASE_CONFIG)
    if (YOUR_FIREBASE_CONFIG && YOUR_FIREBASE_CONFIG.apiKey !== "") {
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
       if(u) {
          const parsed = JSON.parse(u);
          if (Array.isArray(parsed)) setTripUsers(parsed);
       }

       const i = localStorage.getItem('seoul-trip-itinerary');
       if(i) {
          const parsed = JSON.parse(i);
          if (Array.isArray(parsed)) setItinerary(parsed);
       }
       
       const e = localStorage.getItem('seoul-tool-expenses');
       if(e) {
          try {
            const parsed = JSON.parse(e);
            setExpenses(safeMigrateExpenses(parsed));
          } catch(err) {
            console.error("Error migrating expenses", err);
            setExpenses([]);
          }
       }

       getPhotosFromDB().then(setPhotos);
     } catch(e) {
        console.error("Error loading local data", e);
     }
  };

  // --- CLOUD SYNC SUBSCRIPTIONS ---
  useEffect(() => {
    if (!isCloudConnected) return;
    
    // Subscribe to Firestore Data
    const unsubUsers = subscribeToUsers(setTripUsers);
    const unsubExpenses = subscribeToExpenses((data) => {
        // Ensure incoming cloud data also gets migrated if missing splitBy
        setExpenses(safeMigrateExpenses(data));
    });
    const unsubItinerary = subscribeToItinerary(setItinerary);
    
    // Subscribe to Photos ONLY if Storage is available
    let unsubPhotos = () => {};
    if (isStorageInitialized()) {
        unsubPhotos = subscribeToPhotos(setPhotos);
    } else {
        // Fallback: If cloud is connected (DB) but Storage is not, use Local Photos
        getPhotosFromDB().then(setPhotos);
    }

    return () => {
      unsubUsers();
      unsubExpenses();
      unsubItinerary();
      unsubPhotos();
    };
  }, [isCloudConnected]);

  // --- CRITICAL FIX: Announce Self on Connect ---
  useEffect(() => {
    if (isCloudConnected && user?.name) {
       const timer = setTimeout(() => {
          syncAddUser(user.name);
          // Also cleanup 'Me' from cloud if it's there
          syncRemoveUser('Me');
       }, 1500);
       return () => clearTimeout(timer);
    }
  }, [isCloudConnected, user?.name]);

  // --- NEW: AUTO-KICK LOGIC ---
  // If cloud is connected, and we have a valid list, but I am NOT in it -> Logout.
  useEffect(() => {
    if (isCloudConnected && user?.name && tripUsers.length > 0) {
      
      const amIInList = tripUsers.includes(user.name);
      
      // Ignore if the list is just the default ["Me"] (initial state before sync)
      const isDefaultList = tripUsers.length === 1 && tripUsers[0] === 'Me';

      if (!amIInList && !isDefaultList) {
        console.warn("User is not in the Trip List. Initiating auto-logout sequence...");
        
        // Give a grace period (3 seconds) for "Add User" sync to happen if this is a fresh login,
        // or for temporary glitches.
        const timer = setTimeout(async () => {
             alert("Access Revoked: You have been removed from this trip.");
             localStorage.clear();
             await clearPhotosFromDB();
             window.location.reload();
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [tripUsers, isCloudConnected, user?.name]);


  // --- LOCAL PERSISTENCE ---
  
  // Persist User whenever it changes
  useEffect(() => {
    if (user) {
        try {
            localStorage.setItem('seoul-trip-user', JSON.stringify(user));
        } catch (e) {
            console.error("Failed to persist user state", e);
        }
    }
  }, [user]);

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


  // --- HANDLERS ---
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
    // NOTE: Removed the 'Me' guard here to allow cleanup during login
    if (isCloudConnected) {
      syncRemoveUser(name);
    } else {
      setTripUsers(prev => prev.filter(u => u !== name));
    }
  };

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

  // 2. Expenses Wrapper (With Optimistic UI)
  const handleExpensesChange = (action: 'add' | 'delete', item: ExpenseItem) => {
    const finalizedItem = {
        ...item,
        splitBy: item.splitBy && item.splitBy.length > 0 ? item.splitBy : (item.isShared ? tripUsers : [item.payer])
    };

    // OPTIMISTIC UPDATE: Update local state IMMEDIATELY, regardless of cloud connection.
    // This ensures SettleView recalculates instantly without waiting for network round-trip.
    setExpenses(prev => {
        if (action === 'delete') return prev.filter(e => e.id !== finalizedItem.id);
        // Avoid adding duplicate if it already exists (prevent race condition flickering)
        if (prev.some(e => e.id === finalizedItem.id)) return prev;
        return [...prev, finalizedItem];
    });

    // Then Sync to Cloud if connected
    if (isCloudConnected) {
       if (action === 'delete') syncDeleteExpense(finalizedItem.id);
       else syncAddExpense(finalizedItem);
    }
  };

  // 3. Photos Wrapper
  const handleSavePhoto = async (newPhoto: Photo) => {
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
    // Redundant but safe: save immediately (also covered by useEffect)
    try {
      localStorage.setItem('seoul-trip-user', JSON.stringify(newUser));
    } catch (e) { console.error("Quota exceeded on login", e); }
    
    // CLEANUP: If "Me" exists in the list, remove it and add the real user
    if (isCloudConnected) {
        syncAddUser(name);
        syncRemoveUser('Me');
    } else {
        setTripUsers(prev => {
            const listWithoutMe = prev.filter(u => u !== 'Me');
            if (!listWithoutMe.includes(name)) {
                return [...listWithoutMe, name];
            }
            return listWithoutMe;
        });
    }
  };

  const handleDeleteUser = async () => {
    // 1. If connected to cloud, remove my name from the global list
    if (isCloudConnected && user?.name) {
      try {
        await syncRemoveUser(user.name);
      } catch (e) {
        console.error("Failed to remove user from cloud", e);
      }
    }
    
    // 2. Clear Local Data
    localStorage.clear();
    await clearPhotosFromDB();
    setUser(null);
    setItinerary([]);
    setExpenses([]);
    setPhotos([]);
    setTripUsers(DEFAULT_TRIP_USERS);
    setIsCloudConnected(false);
    window.location.reload();
  };
  
  const handleUpdateAvatar = (newAvatar: string) => {
    if (!user) return;
    const updatedUser = { ...user, avatar: newAvatar };
    setUser(updatedUser);
    // useEffect will handle persistence
  };

  const renderView = () => {
    switch (currentTab) {
      case 'settle': return <SettleView expenses={expenses} tripUsers={tripUsers} exchangeRate={exchangeRate} />;
      case 'tool': 
        return <ToolView 
          expenses={expenses} 
          onAdd={(item) => handleExpensesChange('add', item)}
          onDelete={(id) => handleExpensesChange('delete', { id } as ExpenseItem)}
          tripUsers={tripUsers}
          exchangeRate={exchangeRate}
          onRateChange={handleRateChange}
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
      default: return <SettleView expenses={expenses} tripUsers={tripUsers} exchangeRate={exchangeRate} />;
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
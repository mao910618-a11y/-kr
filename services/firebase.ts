import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { FirebaseConfig, ExpenseItem, ItineraryItem, Photo } from '../types';

// ============================================================================
// 👇👇👇 請將 Firebase Console 的設定複製到這裡 👇👇👇
// 
// 1. 去 Firebase Console -> Project Settings -> General -> Your apps
// 2. 找到 const firebaseConfig = { ... }
// 3. 把裡面的值對應填入下方：
// ============================================================================
export const YOUR_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyB-v-ByQscsqDadhkAo0TLXcNy9DmHwj-0",
  authDomain: "koreafinalhope.firebaseapp.com",
  projectId: "koreafinalhope",
  storageBucket: "koreafinalhope.firebasestorage.app",
  messagingSenderId: "760562297894",
  appId: "1:760562297894:web:ed05cf95f76bb7f2d34ae7"
};
// ============================================================================

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Unique Trip ID for sync (In a real app, this would be dynamic)
const TRIP_ID = 'seoul_2026_jan'; 

export const initFirebase = (config: FirebaseConfig): boolean => {
  // Simple check to ensure config is not empty or default placeholder
  if (!config.apiKey || config.apiKey === "") return false;

  try {
    // Prevent double initialization
    if (!app) {
        app = initializeApp(config);
        db = getFirestore(app);
        
        // Try to init storage
        if (config.storageBucket && config.storageBucket !== "") {
            try {
                storage = getStorage(app);
                console.log("Firebase Storage initialized.");
            } catch (storageError) {
                console.warn("Firebase Storage failed to init:", storageError);
                storage = null;
            }
        } else {
            console.log("No Storage Bucket provided. Photos will be local only.");
            storage = null;
        }
    }
    return true;
  } catch (e) {
    console.error("Firebase init error:", e);
    return false;
  }
};

export const isFirebaseInitialized = () => !!db;
export const isStorageInitialized = () => !!storage;

// --- FIRESTORE SYNC HOOKS ---

// 1. SYNC USERS
export const subscribeToUsers = (callback: (users: string[]) => void) => {
  if (!db) return () => {};
  // Listen to the 'trip_data' document, field 'users'
  const unsub = onSnapshot(doc(db, 'trips', TRIP_ID), (docSnap) => {
    if (docSnap.exists() && docSnap.data().users) {
      callback(docSnap.data().users);
    } else {
        // Init if empty. 
        setDoc(doc(db, 'trips', TRIP_ID), { users: ['Me'] }, { merge: true });
    }
  });
  return unsub;
};

export const syncAddUser = async (name: string) => {
  if (!db) return;
  await updateDoc(doc(db, 'trips', TRIP_ID), {
    users: arrayUnion(name)
  });
};

export const syncRemoveUser = async (name: string) => {
  if (!db) return;
  await updateDoc(doc(db, 'trips', TRIP_ID), {
    users: arrayRemove(name)
  });
};

// 2. SYNC EXPENSES
export const subscribeToExpenses = (callback: (expenses: ExpenseItem[]) => void) => {
  if (!db) return () => {};
  const unsub = onSnapshot(collection(db, 'trips', TRIP_ID, 'expenses'), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseItem));
    callback(data);
  });
  return unsub;
};

export const syncAddExpense = async (expense: ExpenseItem) => {
  if (!db) return;
  await setDoc(doc(db, 'trips', TRIP_ID, 'expenses', expense.id), expense);
};

export const syncDeleteExpense = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'trips', TRIP_ID, 'expenses', id));
};

// 3. SYNC ITINERARY
export const subscribeToItinerary = (callback: (items: ItineraryItem[]) => void) => {
  if (!db) return () => {};
  const unsub = onSnapshot(collection(db, 'trips', TRIP_ID, 'itinerary'), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItineraryItem));
    callback(data);
  });
  return unsub;
};

export const syncUpdateItinerary = async (item: ItineraryItem) => {
  if (!db) return;
  await setDoc(doc(db, 'trips', TRIP_ID, 'itinerary', item.id), item);
};

export const syncDeleteItinerary = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'trips', TRIP_ID, 'itinerary', id));
};

// 4. SYNC PHOTOS (Gallery)
export const subscribeToPhotos = (callback: (photos: Photo[]) => void) => {
  // Only subscribe if storage is enabled to avoid broken image links
  if (!db || !storage) return () => {};
  
  const unsub = onSnapshot(collection(db, 'trips', TRIP_ID, 'photos'), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo));
    // Sort by ID (timestamp) desc
    data.sort((a, b) => Number(b.id) - Number(a.id));
    callback(data);
  });
  return unsub;
};

export const uploadPhotoToCloud = async (photo: Photo): Promise<void> => {
  if (!db || !storage) {
      throw new Error("Storage not configured");
  }

  try {
    // 1. Upload Base64 to Storage
    const storageRef = ref(storage, `photos/${TRIP_ID}/${photo.id}.jpg`);
    await uploadString(storageRef, photo.url, 'data_url');
    
    // 2. Get Public URL
    const downloadUrl = await getDownloadURL(storageRef);

    // 3. Save Metadata to Firestore (including author)
    const cloudPhoto: Photo = { ...photo, url: downloadUrl, uploaded: true };
    await setDoc(doc(db, 'trips', TRIP_ID, 'photos', photo.id), cloudPhoto);
    
  } catch (e) {
    console.error("Cloud upload failed", e);
    throw e;
  }
};

export const deletePhotoFromCloud = async (photo: Photo) => {
  if (!db || !storage) return;
  
  // Delete from Firestore
  await deleteDoc(doc(db, 'trips', TRIP_ID, 'photos', photo.id));
  
  // Delete from Storage (if it was uploaded)
  if (photo.uploaded || photo.url.includes('firebasestorage')) {
     try {
       const storageRef = ref(storage, `photos/${TRIP_ID}/${photo.id}.jpg`);
       await deleteObject(storageRef);
     } catch (e) {
         console.warn("Storage file might already be gone", e);
     }
  }
};
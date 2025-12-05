
import { Photo } from '../types';

const DB_NAME = 'SeoulTripDB';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

// Open Database
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", request.error);
      reject("Database error");
    };

    request.onsuccess = (event) => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Add Photo
export const addPhotoToDB = async (photo: Photo): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(photo);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get All Photos
export const getPhotosFromDB = async (): Promise<Photo[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by date descending (newest first) implicitly by ID or Date if needed
      // Here we return raw list, sorting can happen in UI or here.
      // Since IDs are timestamps, higher ID = newer.
      const result = request.result as Photo[];
      resolve(result.sort((a, b) => Number(b.id) - Number(a.id)));
    };
    request.onerror = () => reject(request.error);
  });
};

// Delete Photo
export const deletePhotoFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Clear All Photos
export const clearPhotosFromDB = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

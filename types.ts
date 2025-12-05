
export type Tab = 'settle' | 'tool' | 'plan' | 'photo' | 'library';

export type Category = 'shopping' | 'dining' | 'transport' | 'sightseeing' | 'other';

export interface ItineraryItem {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  location: string;
  category: Category;
  notes?: string;
  completed: boolean;
}

export interface ExpenseItem {
  id: string;
  name: string;
  cost: number;
  payer: string; // Who paid
  // Deprecated: isShared (keep for backward compatibility if needed, but logic moves to splitBy)
  isShared?: boolean; 
  // New: List of names who share this expense
  splitBy: string[]; 
}

export interface WeatherInfo {
  date: string;
  label: string; // MM/DD
  dayNum: number;
  condition: 'sunny' | 'cloudy' | 'rain' | 'snow';
  temp: string;
}

export interface Photo {
  id: string;
  url: string;
  date: string;
  uploaded?: boolean; // Track if uploaded to cloud
  author?: string;    // Name of the user who took the photo
}

// Fixed Date Range for the trip
export const TRIP_START = '2026-01-16';
export const TRIP_END = '2026-01-20';
export const SEOUL_LOCATION = { lat: 37.5665, lng: 126.9780 };

// Default Initial Users (State will be managed in App.tsx)
export const DEFAULT_TRIP_USERS = ['Me'];

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

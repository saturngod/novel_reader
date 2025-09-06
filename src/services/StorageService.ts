/**
 * Storage Service for Novel Reading Application
 * Provides comprehensive local storage management for user preferences,
 * reading state, UI state, and session data with validation and error handling.
 */

import StorageErrorHandler from '../utils/ErrorHandler';

// Enhanced TypeScript Interfaces
export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  font: 'system' | 'myanmarsanpya' | 'myanmartagu' | 'masterpiecestadium' | 'pyidaungsu';
  fontSize: 'small' | 'medium' | 'large';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  textAlign: 'left' | 'center' | 'justify';
  pageWidth: 'narrow' | 'normal' | 'wide';
}

export interface ChapterProgress {
  scrollPosition: number;
  lastVisited: string;
  timeSpent: number; // in seconds
}

export interface ReadingState {
  currentChapterIndex: number;
  scrollPosition: number;
  lastReadTime: string;
  readingProgress: {
    [chapterIndex: number]: ChapterProgress;
  };
  totalReadingTime: number; // in seconds
  sessionStartTime: string;
}

export interface UIState {
  showTOC: boolean;
  showSettings: boolean;
  lastActivePanel: 'toc' | 'settings' | null;
  contentAreaWidth: number;
  navigationPreference: 'buttons' | 'keyboard' | 'swipe';
  panelAnimationDuration: number;
}

export interface BookmarkPosition {
  chapterIndex: number;
  scrollPosition: number;
  timestamp: string;
  note?: string;
  id: string;
}

export interface SessionData {
  sessionId: string;
  lastVisitTime: string;
  totalReadingTime: number;
  chaptersRead: number[];
  bookmarkPositions: BookmarkPosition[];
  visitCount: number;
  averageReadingSpeed: number; // characters per minute
}

export interface AppData {
  preferences: UserPreferences;
  readingState: ReadingState;
  uiState: UIState;
  sessionData: SessionData;
  version: string;
  lastSavedAt: string;
}

// Storage Keys Configuration
export const STORAGE_KEYS = {
  PREFERENCES: 'novel-preferences',
  READING_STATE: 'novel-reading-state',
  UI_STATE: 'novel-ui-state',
  SESSION_DATA: 'novel-session-data',
  APP_DATA: 'novel-app-data'
} as const;

// Default Values
export const defaultPreferences: UserPreferences = {
  theme: 'system',
  font: 'system',
  fontSize: 'medium',
  lineHeight: 'normal',
  textAlign: 'left',
  pageWidth: 'normal'
};

export const defaultReadingState: ReadingState = {
  currentChapterIndex: 0,
  scrollPosition: 0,
  lastReadTime: new Date().toISOString(),
  readingProgress: {},
  totalReadingTime: 0,
  sessionStartTime: new Date().toISOString()
};

export const defaultUIState: UIState = {
  showTOC: false,
  showSettings: false,
  lastActivePanel: null,
  contentAreaWidth: 800,
  navigationPreference: 'buttons',
  panelAnimationDuration: 300
};

export const defaultSessionData: SessionData = {
  sessionId: generateSessionId(),
  lastVisitTime: new Date().toISOString(),
  totalReadingTime: 0,
  chaptersRead: [],
  bookmarkPositions: [],
  visitCount: 1,
  averageReadingSpeed: 0
};

// Utility Functions
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateBookmarkId(): string {
  return `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validation Service
export class ValidationService {
  static validatePreferences(data: any): data is UserPreferences {
    if (!data || typeof data !== 'object') return false;
    
    const validThemes = ['system', 'light', 'dark'];
    const validFonts = ['system', 'myanmarsanpya', 'myanmartagu', 'masterpiecestadium', 'pyidaungsu'];
    const validFontSizes = ['small', 'medium', 'large'];
    const validLineHeights = ['compact', 'normal', 'relaxed'];
    const validTextAligns = ['left', 'center', 'justify'];
    const validPageWidths = ['narrow', 'normal', 'wide'];
    
    return (
      validThemes.includes(data.theme) &&
      validFonts.includes(data.font) &&
      validFontSizes.includes(data.fontSize) &&
      validLineHeights.includes(data.lineHeight) &&
      validTextAligns.includes(data.textAlign) &&
      validPageWidths.includes(data.pageWidth)
    );
  }

  static validateReadingState(data: any): data is ReadingState {
    if (!data || typeof data !== 'object') return false;
    
    return (
      typeof data.currentChapterIndex === 'number' &&
      data.currentChapterIndex >= 0 &&
      typeof data.scrollPosition === 'number' &&
      data.scrollPosition >= 0 &&
      typeof data.lastReadTime === 'string' &&
      typeof data.readingProgress === 'object' &&
      typeof data.totalReadingTime === 'number' &&
      typeof data.sessionStartTime === 'string'
    );
  }

  static validateUIState(data: any): data is UIState {
    if (!data || typeof data !== 'object') return false;
    
    const validNavPrefs = ['buttons', 'keyboard', 'swipe'];
    const validPanels = ['toc', 'settings', null];
    
    return (
      typeof data.showTOC === 'boolean' &&
      typeof data.showSettings === 'boolean' &&
      validPanels.includes(data.lastActivePanel) &&
      typeof data.contentAreaWidth === 'number' &&
      validNavPrefs.includes(data.navigationPreference) &&
      typeof data.panelAnimationDuration === 'number'
    );
  }

  static validateSessionData(data: any): data is SessionData {
    if (!data || typeof data !== 'object') return false;
    
    return (
      typeof data.sessionId === 'string' &&
      typeof data.lastVisitTime === 'string' &&
      typeof data.totalReadingTime === 'number' &&
      Array.isArray(data.chaptersRead) &&
      Array.isArray(data.bookmarkPositions) &&
      typeof data.visitCount === 'number' &&
      typeof data.averageReadingSpeed === 'number'
    );
  }

  static sanitizeData<T>(data: any, defaultValue: T): T {
    try {
      return data && typeof data === 'object' ? { ...defaultValue, ...data } : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}

// Main Storage Service Class
export class StorageService {
  private static readonly VERSION = '1.0.0';
  private static debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Core Storage Operations with Error Handling
  static saveToStorage<T>(key: string, data: T): boolean {
    try {
      const serializedData = StorageErrorHandler.safeJSONStringify({
        data,
        version: this.VERSION,
        timestamp: new Date().toISOString()
      });
      
      if (!serializedData) {
        throw new Error('Failed to serialize data');
      }
      
      localStorage.setItem(key, serializedData);
      return true;
    } catch {
      return false;
    }
  }

  static loadFromStorage<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;

      const parsed = StorageErrorHandler.safeJSONParse(item, { data: defaultValue });
      return parsed.data || defaultValue;
    } catch (error) {
      console.error(`Failed to load from localStorage for key: ${key}`, error);
      return defaultValue;
    }
  }

  // Debounced save operations
  static debouncedSave<T>(key: string, data: T, delay: number = 1000): void {
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.saveToStorage(key, data);
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  // User Preferences Management with Validation
  static saveUserPreferences(preferences: UserPreferences): boolean {
    if (!StorageErrorHandler.validateStorageData(
      STORAGE_KEYS.PREFERENCES, 
      preferences, 
      ValidationService.validatePreferences
    )) {
      return false;
    }
    return this.saveToStorage(STORAGE_KEYS.PREFERENCES, preferences);
  }

  static loadUserPreferences(): UserPreferences {
    const stored = this.loadFromStorage(STORAGE_KEYS.PREFERENCES, defaultPreferences);
    const isValid = ValidationService.validatePreferences(stored);
    return isValid 
      ? stored 
      : ValidationService.sanitizeData(stored, defaultPreferences);
  }

  // Reading State Management with Validation
  static saveReadingState(state: ReadingState): boolean {
    if (!StorageErrorHandler.validateStorageData(
      STORAGE_KEYS.READING_STATE, 
      state, 
      ValidationService.validateReadingState
    )) {
      return false;
    }
    return this.saveToStorage(STORAGE_KEYS.READING_STATE, state);
  }

  static loadReadingState(): ReadingState {
    const stored = this.loadFromStorage(STORAGE_KEYS.READING_STATE, defaultReadingState);
    return ValidationService.validateReadingState(stored)
      ? stored
      : ValidationService.sanitizeData(stored, defaultReadingState);
  }

  // UI State Management with Validation
  static saveUIState(state: UIState): boolean {
    if (!StorageErrorHandler.validateStorageData(
      STORAGE_KEYS.UI_STATE, 
      state, 
      ValidationService.validateUIState
    )) {
      return false;
    }
    return this.saveToStorage(STORAGE_KEYS.UI_STATE, state);
  }

  static loadUIState(): UIState {
    const stored = this.loadFromStorage(STORAGE_KEYS.UI_STATE, defaultUIState);
    return ValidationService.validateUIState(stored)
      ? stored
      : ValidationService.sanitizeData(stored, defaultUIState);
  }

  // Session Data Management with Validation
  static saveSessionData(data: SessionData): boolean {
    if (!StorageErrorHandler.validateStorageData(
      STORAGE_KEYS.SESSION_DATA, 
      data, 
      ValidationService.validateSessionData
    )) {
      return false;
    }
    return this.saveToStorage(STORAGE_KEYS.SESSION_DATA, data);
  }

  static loadSessionData(): SessionData {
    const stored = this.loadFromStorage(STORAGE_KEYS.SESSION_DATA, defaultSessionData);
    return ValidationService.validateSessionData(stored)
      ? stored
      : ValidationService.sanitizeData(stored, defaultSessionData);
  }

  // Bookmark Management
  static addBookmark(chapterIndex: number, scrollPosition: number, note?: string): BookmarkPosition {
    const bookmark: BookmarkPosition = {
      id: generateBookmarkId(),
      chapterIndex,
      scrollPosition,
      timestamp: new Date().toISOString(),
      note
    };

    const sessionData = this.loadSessionData();
    sessionData.bookmarkPositions.push(bookmark);
    this.saveSessionData(sessionData);

    return bookmark;
  }

  static removeBookmark(bookmarkId: string): boolean {
    const sessionData = this.loadSessionData();
    const initialLength = sessionData.bookmarkPositions.length;
    sessionData.bookmarkPositions = sessionData.bookmarkPositions.filter(b => b.id !== bookmarkId);
    
    if (sessionData.bookmarkPositions.length < initialLength) {
      this.saveSessionData(sessionData);
      return true;
    }
    return false;
  }

  static getBookmarks(): BookmarkPosition[] {
    return this.loadSessionData().bookmarkPositions;
  }

  // Debounced scroll position update
  static updateScrollPosition(chapterIndex: number, scrollPosition: number): void {
    const readingState = this.loadReadingState();
    readingState.scrollPosition = scrollPosition;
    // DO NOT update currentChapterIndex here - it should only be updated by navigation functions
    readingState.lastReadTime = new Date().toISOString();

    // Update chapter progress with just scroll position
    const currentProgress = readingState.readingProgress[chapterIndex] || {
      scrollPosition: 0,
      lastVisited: new Date().toISOString(),
      timeSpent: 0
    };

    readingState.readingProgress[chapterIndex] = {
      ...currentProgress,
      scrollPosition,
      lastVisited: new Date().toISOString()
    };

    this.debouncedSave(STORAGE_KEYS.READING_STATE, readingState, 1000);
  }

  // Data Export/Import
  static exportUserData(): string {
    const data: AppData = {
      preferences: this.loadUserPreferences(),
      readingState: this.loadReadingState(),
      uiState: this.loadUIState(),
      sessionData: this.loadSessionData(),
      version: this.VERSION,
      lastSavedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  static importUserData(jsonData: string): boolean {
    try {
      const data: AppData = JSON.parse(jsonData);
      
      if (data.preferences) this.saveUserPreferences(data.preferences);
      if (data.readingState) this.saveReadingState(data.readingState);
      if (data.uiState) this.saveUIState(data.uiState);
      if (data.sessionData) this.saveSessionData(data.sessionData);
      
      return true;
    } catch (error) {
      console.error('Failed to import user data:', error);
      return false;
    }
  }

  // Clear all data
  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Storage quota monitoring
  static getStorageUsage(): { used: number; quota: number; percentage: number } {
    let used = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) used += item.length;
    });

    // Estimate quota (varies by browser, typically 5-10MB)
    const quota = 5 * 1024 * 1024; // 5MB estimate
    const percentage = (used / quota) * 100;

    return { used, quota, percentage };
  }

  // Initialize session
  static initializeSession(): SessionData {
    const sessionData = this.loadSessionData();
    const newSessionData: SessionData = {
      ...sessionData,
      sessionId: generateSessionId(),
      lastVisitTime: new Date().toISOString(),
      visitCount: sessionData.visitCount + 1
    };
    
    this.saveSessionData(newSessionData);
    return newSessionData;
  }
}

export default StorageService;
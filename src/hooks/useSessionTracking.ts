/**
 * Custom React Hook for Session and Analytics Tracking
 * Manages reading session data, analytics, bookmarks, and user engagement metrics
 * with automatic persistence to local storage.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import StorageService, { 
  type SessionData, 
  type BookmarkPosition, 
  defaultSessionData 
} from '../services/StorageService';

export interface UseSessionTrackingOptions {
  enableAnalytics?: boolean;
  enableBookmarks?: boolean;
  autoSaveInterval?: number; // in milliseconds
  onSessionUpdate?: (sessionData: SessionData) => void;
  onBookmarkAdded?: (bookmark: BookmarkPosition) => void;
  onBookmarkRemoved?: (bookmarkId: string) => void;
}

export interface SessionManager {
  // Session data
  sessionData: SessionData;
  
  // Session management
  initializeSession: () => void;
  updateSessionTime: () => void;
  endSession: () => void;
  
  // Reading analytics
  totalReadingTime: number;
  averageReadingSpeed: number;
  chaptersRead: number[];
  visitCount: number;
  addChapterToRead: (chapterIndex: number) => void;
  updateReadingSpeed: (speed: number) => void;
  
  // Bookmark management
  bookmarks: BookmarkPosition[];
  addBookmark: (chapterIndex: number, scrollPosition: number, note?: string) => BookmarkPosition;
  removeBookmark: (bookmarkId: string) => boolean;
  updateBookmark: (bookmarkId: string, updates: Partial<BookmarkPosition>) => boolean;
  getBookmarksForChapter: (chapterIndex: number) => BookmarkPosition[];
  
  // Reading streaks and achievements
  calculateReadingStreak: () => number;
  getDailyReadingTime: () => number;
  getWeeklyReadingTime: () => number;
  getMonthlyReadingTime: () => number;
  
  // Export/Import
  exportSessionData: () => string;
  importSessionData: (data: string) => boolean;
}

export const useSessionTracking = ({
  enableAnalytics = true,
  enableBookmarks = true,
  autoSaveInterval = 30000, // 30 seconds
  onSessionUpdate,
  onBookmarkAdded,
  onBookmarkRemoved
}: UseSessionTrackingOptions = {}): SessionManager => {
  const [sessionData, setSessionData] = useState<SessionData>(defaultSessionData);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const lastSaveTimeRef = useRef<number>(Date.now());
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
    
    // Set up auto-save interval
    if (enableAnalytics) {
      const interval = setInterval(() => {
        updateSessionTime();
      }, autoSaveInterval);

      return () => clearInterval(interval);
    }
  }, [enableAnalytics, autoSaveInterval]);

  // Save session data when it changes
  useEffect(() => {
    if (enableAnalytics) {
      StorageService.saveSessionData(sessionData);
      onSessionUpdate?.(sessionData);
    }
  }, [sessionData, enableAnalytics, onSessionUpdate]);

  // Session management
  const initializeSession = useCallback(() => {
    const newSessionData = StorageService.initializeSession();
    
    setSessionData(newSessionData);
    sessionStartTimeRef.current = Date.now();
    lastSaveTimeRef.current = Date.now();
  }, []);

  const updateSessionTime = useCallback(() => {
    if (!enableAnalytics) return;

    const currentTime = Date.now();
    const timeSinceLastSave = Math.round((currentTime - lastSaveTimeRef.current) / 1000);

    setSessionData(prev => {
      const updated = {
        ...prev,
        totalReadingTime: prev.totalReadingTime + timeSinceLastSave,
        lastVisitTime: new Date().toISOString()
      };
      return updated;
    });

    lastSaveTimeRef.current = currentTime;
  }, [enableAnalytics]);

  const endSession = useCallback(() => {
    updateSessionTime();
    
    // Clear any pending timeouts
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
  }, [updateSessionTime]);

  // Reading analytics
  const addChapterToRead = useCallback((chapterIndex: number) => {
    if (!enableAnalytics) return;

    setSessionData(prev => {
      if (!prev.chaptersRead.includes(chapterIndex)) {
        return {
          ...prev,
          chaptersRead: [...prev.chaptersRead, chapterIndex]
        };
      }
      return prev;
    });
  }, [enableAnalytics]);

  const updateReadingSpeed = useCallback((speed: number) => {
    if (!enableAnalytics || speed <= 0) return;

    setSessionData(prev => {
      // Calculate weighted average (give more weight to recent readings)
      const currentSpeed = prev.averageReadingSpeed;
      const newSpeed = currentSpeed === 0 ? speed : Math.round((currentSpeed * 0.7) + (speed * 0.3));
      
      return {
        ...prev,
        averageReadingSpeed: newSpeed
      };
    });
  }, [enableAnalytics]);

  // Bookmark management
  const addBookmark = useCallback((chapterIndex: number, scrollPosition: number, note?: string): BookmarkPosition => {
    if (!enableBookmarks) {
      throw new Error('Bookmarks are disabled');
    }

    const bookmark = StorageService.addBookmark(chapterIndex, scrollPosition, note);
    
    setSessionData(prev => ({
      ...prev,
      bookmarkPositions: [...prev.bookmarkPositions, bookmark]
    }));

    onBookmarkAdded?.(bookmark);
    return bookmark;
  }, [enableBookmarks, onBookmarkAdded]);

  const removeBookmark = useCallback((bookmarkId: string): boolean => {
    if (!enableBookmarks) return false;

    const success = StorageService.removeBookmark(bookmarkId);
    
    if (success) {
      setSessionData(prev => ({
        ...prev,
        bookmarkPositions: prev.bookmarkPositions.filter(b => b.id !== bookmarkId)
      }));

      onBookmarkRemoved?.(bookmarkId);
    }

    return success;
  }, [enableBookmarks, onBookmarkRemoved]);

  const updateBookmark = useCallback((bookmarkId: string, updates: Partial<BookmarkPosition>): boolean => {
    if (!enableBookmarks) return false;

    setSessionData(prev => {
      const updatedBookmarks = prev.bookmarkPositions.map(bookmark => 
        bookmark.id === bookmarkId ? { ...bookmark, ...updates } : bookmark
      );

      // Only update if bookmark was found
      const bookmarkExists = prev.bookmarkPositions.some(b => b.id === bookmarkId);
      if (!bookmarkExists) return prev;

      return {
        ...prev,
        bookmarkPositions: updatedBookmarks
      };
    });

    return true;
  }, [enableBookmarks]);

  const getBookmarksForChapter = useCallback((chapterIndex: number): BookmarkPosition[] => {
    return sessionData.bookmarkPositions.filter(b => b.chapterIndex === chapterIndex);
  }, [sessionData.bookmarkPositions]);

  // Reading streaks and time analytics
  const calculateReadingStreak = useCallback((): number => {
    // Simple streak calculation based on daily reading activity
    // This would be enhanced with more sophisticated logic in a real app
    
    // For now, return a simple calculation based on visit count
    return Math.min(sessionData.visitCount, 7);
  }, [sessionData.visitCount]);

  const getDailyReadingTime = useCallback((): number => {
    // Return today's reading time (simplified - would need date tracking in real app)
    const currentTime = Date.now();
    const sessionDuration = Math.round((currentTime - sessionStartTimeRef.current) / 1000);
    return sessionDuration;
  }, []);

  const getWeeklyReadingTime = useCallback((): number => {
    // Simplified calculation - in real app would track daily reading times
    return sessionData.totalReadingTime;
  }, [sessionData.totalReadingTime]);

  const getMonthlyReadingTime = useCallback((): number => {
    // Simplified calculation - in real app would track historical data
    return sessionData.totalReadingTime;
  }, [sessionData.totalReadingTime]);

  // Export/Import functionality
  const exportSessionData = useCallback((): string => {
    return JSON.stringify({
      ...sessionData,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }, [sessionData]);

  const importSessionData = useCallback((data: string): boolean => {
    try {
      const parsedData = JSON.parse(data);
      
      // Validate the imported data structure
      if (parsedData && typeof parsedData === 'object') {
        setSessionData(prev => ({
          ...prev,
          ...parsedData,
          sessionId: prev.sessionId, // Keep current session ID
          lastVisitTime: new Date().toISOString() // Update visit time
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import session data:', error);
      return false;
    }
  }, []);

  // Auto-save and cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      endSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateSessionTime();
      } else if (document.visibilityState === 'visible') {
        lastSaveTimeRef.current = Date.now();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      endSession();
    };
  }, [endSession, updateSessionTime]);

  return {
    // Session data
    sessionData,
    
    // Session management
    initializeSession,
    updateSessionTime,
    endSession,
    
    // Reading analytics
    totalReadingTime: sessionData.totalReadingTime,
    averageReadingSpeed: sessionData.averageReadingSpeed,
    chaptersRead: sessionData.chaptersRead,
    visitCount: sessionData.visitCount,
    addChapterToRead,
    updateReadingSpeed,
    
    // Bookmark management
    bookmarks: sessionData.bookmarkPositions,
    addBookmark,
    removeBookmark,
    updateBookmark,
    getBookmarksForChapter,
    
    // Reading streaks and achievements
    calculateReadingStreak,
    getDailyReadingTime,
    getWeeklyReadingTime,
    getMonthlyReadingTime,
    
    // Export/Import
    exportSessionData,
    importSessionData
  };
};

export default useSessionTracking;
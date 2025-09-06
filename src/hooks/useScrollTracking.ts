/**
 * Custom React Hook for Scroll Position Tracking
 * Provides debounced scroll position tracking with automatic persistence
 * to local storage and reading progress calculation.
 */

import { useEffect, useRef, useCallback } from 'react';
import StorageService from '../services/StorageService';

export interface UseScrollTrackingOptions {
  chapterIndex: number;
  contentElementRef: React.RefObject<HTMLDivElement | null>;
  debounceDelay?: number;
  enableAutoSave?: boolean;
  onScrollPositionChange?: (position: number, percentage: number) => void;
  onReadingProgressUpdate?: (chapterIndex: number, percentage: number) => void;
}

export interface ScrollPosition {
  position: number;
  percentage: number;
  timestamp: string;
}

export const useScrollTracking = ({
  chapterIndex,
  contentElementRef,
  debounceDelay = 1000,
  enableAutoSave = true,
  onScrollPositionChange,
  onReadingProgressUpdate: _onReadingProgressUpdate
}: UseScrollTrackingOptions) => {
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastScrollPositionRef = useRef<number>(0);


  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    const element = contentElementRef.current;
    if (!element) return;

    const scrollTop = element.scrollTop;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Call immediate callback if provided
    onScrollPositionChange?.(scrollTop, 0); // No percentage calculation

    // Set new timeout for debounced save
    scrollTimeoutRef.current = setTimeout(() => {
      if (enableAutoSave) {
        // Just save scroll position, no progress tracking
        StorageService.updateScrollPosition(chapterIndex, scrollTop);
      }

      lastScrollPositionRef.current = scrollTop;
    }, debounceDelay);
  }, [
    chapterIndex,
    contentElementRef,
    debounceDelay,
    enableAutoSave,
    onScrollPositionChange
  ]);

  // Restore scroll position from storage
  const restoreScrollPosition = useCallback(() => {
    const element = contentElementRef.current;
    if (!element) return;

    const readingState = StorageService.loadReadingState();
    const chapterProgress = readingState.readingProgress[chapterIndex];
    
    if (chapterProgress && chapterProgress.scrollPosition > 0) {
      // Use requestAnimationFrame to ensure the element is fully rendered
      requestAnimationFrame(() => {
        element.scrollTop = chapterProgress.scrollPosition;
        lastScrollPositionRef.current = chapterProgress.scrollPosition;
      });
    }
  }, [chapterIndex, contentElementRef]);

  // Get current scroll position
  const getCurrentPosition = useCallback((): ScrollPosition => {
    const element = contentElementRef.current;
    if (!element) {
      return { position: 0, percentage: 0, timestamp: new Date().toISOString() };
    }

    const position = element.scrollTop;
    
    return {
      position,
      percentage: 0, // No percentage calculation
      timestamp: new Date().toISOString()
    };
  }, [contentElementRef]);

  // Manually save current position
  const saveCurrentPosition = useCallback(() => {
    const { position } = getCurrentPosition();
    StorageService.updateScrollPosition(chapterIndex, position);
  }, [chapterIndex, getCurrentPosition]);

  // Jump to specific position
  const jumpToPosition = useCallback((position: number) => {
    const element = contentElementRef.current;
    if (!element) return;

    element.scrollTop = position;
    lastScrollPositionRef.current = position;
    
    // Immediately save the new position
    if (enableAutoSave) {
      setTimeout(() => saveCurrentPosition(), 100);
    }
  }, [contentElementRef, enableAutoSave, saveCurrentPosition]);

  // Jump to percentage
  const jumpToPercentage = useCallback((percentage: number) => {
    const element = contentElementRef.current;
    if (!element) return;

    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    const targetPosition = Math.round((percentage / 100) * maxScroll);
    
    jumpToPosition(targetPosition);
  }, [jumpToPosition]);

  // Setup scroll tracking
  useEffect(() => {
    const element = contentElementRef.current;
    if (!element) return;

    // Add scroll event listener
    element.addEventListener('scroll', handleScroll, { passive: true });

    // Restore scroll position after a short delay to ensure content is loaded
    const restoreTimeout = setTimeout(restoreScrollPosition, 100);

    return () => {
      element.removeEventListener('scroll', handleScroll);
      clearTimeout(restoreTimeout);
      
      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [contentElementRef, handleScroll, restoreScrollPosition]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Save current position when component unmounts
      if (enableAutoSave && contentElementRef.current) {
        saveCurrentPosition();
      }
      
      // Clear timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [enableAutoSave, saveCurrentPosition]);

  // Update chapter reading analytics when chapter changes
  useEffect(() => {
    const sessionData = StorageService.loadSessionData();
    if (!sessionData.chaptersRead.includes(chapterIndex)) {
      sessionData.chaptersRead.push(chapterIndex);
      StorageService.saveSessionData(sessionData);
    }
  }, [chapterIndex]);

  return {
    getCurrentPosition,
    saveCurrentPosition,
    jumpToPosition,
    jumpToPercentage,
    restoreScrollPosition
  };
};

export default useScrollTracking;
/**
 * Custom React Hook for UI State Management
 * Manages panel visibility, layout preferences, and UI interactions
 * with automatic persistence to local storage.
 */

import { useState, useEffect, useCallback } from 'react';
import StorageService, { type UIState, defaultUIState } from '../services/StorageService';

export interface UseUIStateOptions {
  enableAutoSave?: boolean;
  animationDuration?: number;
  onPanelToggle?: (panel: 'toc' | 'settings', isVisible: boolean) => void;
  onLayoutChange?: (layout: Partial<UIState>) => void;
}

export interface UIStateManager {
  // Current state
  uiState: UIState;
  
  // Panel management
  showTOC: boolean;
  showSettings: boolean;
  toggleTOC: () => void;
  toggleSettings: () => void;
  closeAllPanels: () => void;
  openPanel: (panel: 'toc' | 'settings') => void;
  
  // Layout management
  contentAreaWidth: number;
  setContentAreaWidth: (width: number) => void;
  navigationPreference: UIState['navigationPreference'];
  setNavigationPreference: (preference: UIState['navigationPreference']) => void;
  
  // Animation control
  panelAnimationDuration: number;
  setPanelAnimationDuration: (duration: number) => void;
  
  // State persistence
  saveUIState: () => void;
  restoreUIState: () => void;
  resetUIState: () => void;
}

export const useUIState = ({
  enableAutoSave = true,
  animationDuration = 300,
  onPanelToggle,
  onLayoutChange
}: UseUIStateOptions = {}): UIStateManager => {
  const [uiState, setUIState] = useState<UIState>(defaultUIState);

  // Load UI state from storage on mount
  useEffect(() => {
    const savedUIState = StorageService.loadUIState();
    setUIState({
      ...savedUIState,
      panelAnimationDuration: animationDuration // Override with prop value
    });
  }, [animationDuration]);

  // Auto-save UI state when it changes
  useEffect(() => {
    if (enableAutoSave) {
      StorageService.saveUIState(uiState);
    }
  }, [uiState, enableAutoSave]);

  // Panel management functions
  const toggleTOC = useCallback(() => {
    setUIState(prev => {
      const newShowTOC = !prev.showTOC;
      const newState = {
        ...prev,
        showTOC: newShowTOC,
        showSettings: newShowTOC ? false : prev.showSettings, // Close settings if opening TOC
        lastActivePanel: newShowTOC ? 'toc' as const : prev.lastActivePanel
      };
      
      onPanelToggle?.('toc', newShowTOC);
      return newState;
    });
  }, [onPanelToggle]);

  const toggleSettings = useCallback(() => {
    setUIState(prev => {
      const newShowSettings = !prev.showSettings;
      const newState = {
        ...prev,
        showSettings: newShowSettings,
        showTOC: newShowSettings ? false : prev.showTOC, // Close TOC if opening settings
        lastActivePanel: newShowSettings ? 'settings' as const : prev.lastActivePanel
      };
      
      onPanelToggle?.('settings', newShowSettings);
      return newState;
    });
  }, [onPanelToggle]);

  const closeAllPanels = useCallback(() => {
    setUIState(prev => {
      const newState = {
        ...prev,
        showTOC: false,
        showSettings: false,
        lastActivePanel: null
      };
      
      if (prev.showTOC) onPanelToggle?.('toc', false);
      if (prev.showSettings) onPanelToggle?.('settings', false);
      
      return newState;
    });
  }, [onPanelToggle]);

  const openPanel = useCallback((panel: 'toc' | 'settings') => {
    setUIState(prev => {
      const newState = {
        ...prev,
        showTOC: panel === 'toc',
        showSettings: panel === 'settings',
        lastActivePanel: panel
      };
      
      // Close the other panel if it was open
      if (panel === 'toc' && prev.showSettings) {
        onPanelToggle?.('settings', false);
      } else if (panel === 'settings' && prev.showTOC) {
        onPanelToggle?.('toc', false);
      }
      
      onPanelToggle?.(panel, true);
      return newState;
    });
  }, [onPanelToggle]);

  // Layout management functions
  const setContentAreaWidth = useCallback((width: number) => {
    setUIState(prev => {
      const newState = { ...prev, contentAreaWidth: width };
      onLayoutChange?.(newState);
      return newState;
    });
  }, [onLayoutChange]);

  const setNavigationPreference = useCallback((preference: UIState['navigationPreference']) => {
    setUIState(prev => {
      const newState = { ...prev, navigationPreference: preference };
      onLayoutChange?.(newState);
      return newState;
    });
  }, [onLayoutChange]);

  const setPanelAnimationDuration = useCallback((duration: number) => {
    setUIState(prev => ({ ...prev, panelAnimationDuration: duration }));
  }, []);

  // State persistence functions
  const saveUIState = useCallback(() => {
    StorageService.saveUIState(uiState);
  }, [uiState]);

  const restoreUIState = useCallback(() => {
    const savedUIState = StorageService.loadUIState();
    setUIState(savedUIState);
  }, []);

  const resetUIState = useCallback(() => {
    setUIState(defaultUIState);
    if (enableAutoSave) {
      StorageService.saveUIState(defaultUIState);
    }
  }, [enableAutoSave]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Only handle if navigation preference allows keyboard
      if (uiState.navigationPreference !== 'keyboard') return;

      switch (event.key) {
        case 'Escape':
          if (uiState.showTOC || uiState.showSettings) {
            event.preventDefault();
            closeAllPanels();
          }
          break;
        case 't':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleTOC();
          }
          break;
        case 's':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleSettings();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [uiState.navigationPreference, uiState.showTOC, uiState.showSettings, closeAllPanels, toggleTOC, toggleSettings]);

  // Touch/swipe gesture support (basic implementation)
  useEffect(() => {
    if (uiState.navigationPreference !== 'swipe') return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Only handle horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0 && touchStartX < 50) {
          // Swipe right from left edge - open TOC
          openPanel('toc');
        } else if (deltaX < 0 && touchStartX > window.innerWidth - 50) {
          // Swipe left from right edge - open settings
          openPanel('settings');
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [uiState.navigationPreference, openPanel]);

  // Auto-close panels after timeout (optional feature)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    // Auto-close panels after 30 seconds of inactivity
    const autoCloseTimeout = 30000;
    
    if (uiState.showTOC || uiState.showSettings) {
      timeout = setTimeout(() => {
        closeAllPanels();
      }, autoCloseTimeout);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [uiState.showTOC, uiState.showSettings, closeAllPanels]);

  return {
    // Current state
    uiState,
    
    // Panel management
    showTOC: uiState.showTOC,
    showSettings: uiState.showSettings,
    toggleTOC,
    toggleSettings,
    closeAllPanels,
    openPanel,
    
    // Layout management
    contentAreaWidth: uiState.contentAreaWidth,
    setContentAreaWidth,
    navigationPreference: uiState.navigationPreference,
    setNavigationPreference,
    
    // Animation control
    panelAnimationDuration: uiState.panelAnimationDuration,
    setPanelAnimationDuration,
    
    // State persistence
    saveUIState,
    restoreUIState,
    resetUIState
  };
};

export default useUIState;
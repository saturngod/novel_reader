import { useState, useEffect, useRef } from 'react'
import './App.css'
import StorageService, { type UserPreferences, defaultPreferences } from './services/StorageService'
import useUIState from './hooks/useUIState'
import useSessionTracking from './hooks/useSessionTracking'
import DataMigration from './utils/DataMigration'
import StorageErrorHandler from './utils/ErrorHandler'

// TypeScript interfaces
interface Chapter {
  chapterTitle: string;
  subTitle: string;
  path: string;
}

// UserPreferences interface now imported from StorageService

interface FontConfig {
  fonts: {
    [key: string]: {
      name: string;
      family: string;
      weights: string[];
      fallback: string[];
    };
  };
  defaultFont: string;
  fontSizes: {
    [key: string]: {
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
  };
  defaultFontSize: string;
}

// defaultPreferences now imported from StorageService

function App() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [chapterContent, setChapterContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontConfig, setFontConfig] = useState<FontConfig | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(defaultPreferences);
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [isStateRestored, setIsStateRestored] = useState(false);
  
  // Refs for scroll tracking
  const contentElementRef = useRef<HTMLDivElement>(null);
  
  // Custom hooks for state management
  const {
    showTOC,
    showSettings,
    toggleTOC,
    toggleSettings,
    closeAllPanels
  } = useUIState({
    onPanelToggle: (panel, isVisible) => {
      console.log(`Panel ${panel} ${isVisible ? 'opened' : 'closed'}`);
    }
  });
  
  
  const sessionManager = useSessionTracking({
    onBookmarkAdded: (bookmark) => {
      console.log('Bookmark added:', bookmark);
    },
    onBookmarkRemoved: (bookmarkId) => {
      console.log('Bookmark removed:', bookmarkId);
    }
  });

  // Initialize data migration and error handling
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize migration system
        const migrationSuccess = await DataMigration.initialize();
        
        if (migrationSuccess) {
          setMigrationStatus('success');
          
          // Load user preferences after successful migration
          const savedPreferences = StorageService.loadUserPreferences();
          setUserPreferences(savedPreferences);
          // Apply preferences immediately
          applyUserPreferences(savedPreferences);
        } else {
          setMigrationStatus('failed');
          setError('Failed to migrate data. Using default settings.');
        }
        
        // Set up error listener
        const removeErrorListener = StorageErrorHandler.addErrorListener((error) => {
          console.error('Storage error occurred:', error);
          // Could show user notification here
        });
        
        return () => {
          removeErrorListener();
        };
      } catch (err) {
        console.error('App initialization failed:', err);
        setMigrationStatus('failed');
        setError('Failed to initialize application');
      }
    };
    
    initializeApp();
  }, []);

  // Save user preferences to storage service (only when user changes them)
  useEffect(() => {
    if (migrationStatus === 'success') {
      StorageService.saveUserPreferences(userPreferences);
      applyUserPreferences(userPreferences);
    }
  }, [userPreferences, migrationStatus]);

  // Apply user preferences to document
  const applyUserPreferences = (preferences: UserPreferences) => {
    const { theme, font, fontSize } = preferences;
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    
    // Apply font
    document.documentElement.setAttribute('data-font', font);
    
    // Apply font size
    document.documentElement.setAttribute('data-font-size', fontSize);
  };

  // Load font configuration
  useEffect(() => {
    loadFontConfig();
  }, []);

  // Load TOC on component mount
  useEffect(() => {
    loadTOC();
  }, []);

  // Load chapter content when current chapter changes
  useEffect(() => {
    if (chapters.length > 0 && migrationStatus === 'success' && isStateRestored) {
      loadChapterContent(chapters[currentChapterIndex]);
      // Track chapter navigation
      sessionManager.addChapterToRead(currentChapterIndex);
    }
  }, [currentChapterIndex, chapters, sessionManager, migrationStatus, isStateRestored]);
  
  // Restore reading state immediately after migration and TOC load
  useEffect(() => {
    if (chapters.length > 0 && migrationStatus === 'success' && !isStateRestored) {
      const readingState = StorageService.loadReadingState();
      if (readingState.currentChapterIndex >= 0 && readingState.currentChapterIndex < chapters.length) {
        setCurrentChapterIndex(readingState.currentChapterIndex);
      }
      setIsStateRestored(true);
    }
  }, [chapters, migrationStatus, isStateRestored]);

  const loadFontConfig = async () => {
    try {
      const response = await fetch('/config/fonts.json');
      if (!response.ok) {
        throw new Error('Failed to load font configuration');
      }
      const config: FontConfig = await response.json();
      setFontConfig(config);
    } catch (err) {
      console.error('Error loading font config:', err);
    }
  };

  const loadTOC = async () => {
    try {
      setLoading(true);
      const response = await fetch('/toc.json');
      if (!response.ok) {
        throw new Error('Failed to load table of contents');
      }
      const tocData: Chapter[] = await response.json();
      setChapters(tocData);
      setError(null);
    } catch (err) {
      setError('Failed to load table of contents');
      console.error('Error loading TOC:', err);
    }
  };

  const loadChapterContent = async (chapter: Chapter) => {
    try {
      setLoading(true);
      const response = await fetch(`/${chapter.path}`);
      if (!response.ok) {
        throw new Error(`Failed to load chapter: ${chapter.chapterTitle}`);
      }
      const content = await response.text();
      setChapterContent(content);
      setError(null);
    } catch (err) {
      setError(`Failed to load chapter content`);
      console.error('Error loading chapter:', err);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      const newIndex = currentChapterIndex - 1;
      setCurrentChapterIndex(newIndex);
      
      // Save the chapter navigation immediately
      const readingState = StorageService.loadReadingState();
      readingState.currentChapterIndex = newIndex;
      readingState.lastReadTime = new Date().toISOString();
      StorageService.saveReadingState(readingState);
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const newIndex = currentChapterIndex + 1;
      setCurrentChapterIndex(newIndex);
      
      // Save the chapter navigation immediately
      const readingState = StorageService.loadReadingState();
      readingState.currentChapterIndex = newIndex;
      readingState.lastReadTime = new Date().toISOString();
      StorageService.saveReadingState(readingState);
    }
  };

  const selectChapter = (index: number) => {
    setCurrentChapterIndex(index);
    closeAllPanels(); // Use the UI state manager
    
    // Save the chapter selection immediately
    const readingState = StorageService.loadReadingState();
    readingState.currentChapterIndex = index;
    readingState.lastReadTime = new Date().toISOString();
    StorageService.saveReadingState(readingState);
  };

  // TOC and Settings toggle functions now handled by useUIState hook

  const updateUserPreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setUserPreferences(prev => ({ ...prev, [key]: value }));
  };

  const SettingsIcon = () => (
    <svg className="settings-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8ZM12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14Z"
        fill="currentColor"
      />
      <path
        d="M19.14 12.94C19.18 12.64 19.2 12.33 19.2 12C19.2 11.67 19.18 11.36 19.14 11.06L21.16 9.48C21.34 9.34 21.39 9.07 21.28 8.87L19.36 5.55C19.24 5.33 18.99 5.26 18.77 5.33L16.38 6.29C15.88 5.91 15.35 5.59 14.76 5.35L14.4 2.81C14.36 2.57 14.16 2.4 13.92 2.4H10.08C9.84 2.4 9.64 2.57 9.6 2.81L9.24 5.35C8.65 5.59 8.12 5.92 7.62 6.29L5.23 5.33C5.01 5.25 4.76 5.33 4.64 5.55L2.72 8.87C2.61 9.08 2.66 9.34 2.84 9.48L4.86 11.06C4.82 11.36 4.8 11.67 4.8 12C4.8 12.33 4.82 12.64 4.86 12.94L2.84 14.52C2.66 14.66 2.61 14.93 2.72 15.13L4.64 18.45C4.76 18.67 5.01 18.74 5.23 18.67L7.62 17.71C8.12 18.09 8.65 18.41 9.24 18.65L9.6 21.19C9.64 21.43 9.84 21.6 10.08 21.6H13.92C14.16 21.6 14.36 21.43 14.4 21.19L14.76 18.65C15.35 18.41 15.88 18.08 16.38 17.71L18.77 18.67C18.99 18.75 19.24 18.67 19.36 18.45L21.28 15.13C21.39 14.92 21.34 14.66 21.16 14.52L19.14 12.94Z"
        fill="currentColor"
      />
    </svg>
  );

  const currentChapter = chapters[currentChapterIndex];
  const isFirstChapter = currentChapterIndex === 0;
  const isLastChapter = currentChapterIndex === chapters.length - 1;

  // Don't render main app until migration is complete
  if (migrationStatus === 'pending') {
    return (
      <div className="app-container">
        <div className="loading">
          <p>Initializing application...</p>
        </div>
      </div>
    );
  }
  
  if (migrationStatus === 'failed') {
    return (
      <div className="app-container">
        <div className="error-message">
          <h2>Initialization Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={loadTOC}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header with TOC toggle and Settings */}
      <header className="header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={toggleTOC} aria-label="Toggle Table of Contents">
            <div className="hamburger-icon">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
        <div className="header-center">
          <h1 className="app-title">ဘဝ ၏ အရသာ</h1>
        </div>
        <div className="header-right">
         
          <button className="settings-btn" onClick={toggleSettings} aria-label="Open Settings">
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-overlay" onClick={toggleSettings}>
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Settings</h2>
              <button className="settings-close-btn" onClick={toggleSettings}>
                ×
              </button>
            </div>
            <div className="settings-content">
              {/* Theme Selection */}
              <div className="settings-section">
                <h3 className="settings-section-title">Theme</h3>
                <div className="settings-options">
                  {(['system', 'light', 'dark'] as const).map((theme) => (
                    <div
                      key={theme}
                      className={`settings-option ${userPreferences.theme === theme ? 'active' : ''}`}
                      onClick={() => updateUserPreference('theme', theme)}
                    >
                      <div className="settings-option-radio"></div>
                      <div className="settings-option-content">
                        <div className="settings-option-label">
                          {theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
                        </div>
                        <div className="settings-option-description">
                          {theme === 'system'
                            ? 'Follow system preference'
                            : theme === 'light'
                            ? 'Light theme'
                            : 'Dark theme'
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font Selection */}
              <div className="settings-section">
                <h3 className="settings-section-title">Font</h3>
                <div className="settings-options">
                  {fontConfig && Object.entries(fontConfig.fonts).map(([fontKey, fontData]) => (
                    <div
                      key={fontKey}
                      className={`settings-option ${userPreferences.font === fontKey ? 'active' : ''}`}
                      onClick={() => updateUserPreference('font', fontKey as UserPreferences['font'])}
                    >
                      <div className="settings-option-radio"></div>
                      <div className="settings-option-content">
                        <div className="settings-option-label">{fontData.name}</div>
                        <div className="font-preview" style={{ fontFamily: fontData.family }}>
                          နမူနာ Sample ABC 123
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font Size Selection */}
              <div className="settings-section">
                <h3 className="settings-section-title">Font Size</h3>
                <div className="settings-options">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <div
                      key={size}
                      className={`settings-option ${userPreferences.fontSize === size ? 'active' : ''}`}
                      onClick={() => updateUserPreference('fontSize', size)}
                    >
                      <div className="settings-option-radio"></div>
                      <div className="settings-option-content">
                        <div className="settings-option-label">
                          {size === 'small' ? 'Small' : size === 'medium' ? 'Medium' : 'Large'}
                        </div>
                        <div className="settings-option-description">
                          {size === 'small'
                            ? 'Compact text size'
                            : size === 'medium'
                            ? 'Default text size'
                            : 'Large text size'
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOC Sidebar */}
      {showTOC && (
        <div className="toc-overlay" onClick={toggleTOC}>
          <div className="toc-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="toc-header">
              <h2>Table of Contents</h2>
              <button className="close-btn" onClick={toggleTOC}>
                ×
              </button>
            </div>
            <div className="toc-content">
              {chapters.map((chapter, index) => {
                const chapterBookmarks = sessionManager.getBookmarksForChapter(index);
                
                return (
                  <div
                    key={index}
                    className={`chapter-item ${index === currentChapterIndex ? 'active' : ''}`}
                    onClick={() => selectChapter(index)}
                  >
                    <div className="chapter-header">
                      <div className="chapter-title">{chapter.chapterTitle}</div>
                      <div className="chapter-indicators">
                        {chapterBookmarks.length > 0 && (
                          <span className="bookmark-count">{chapterBookmarks.length}</span>
                        )}
                      </div>
                    </div>
                    <div className="chapter-subtitle">{chapter.subTitle}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="content-area">
        {loading ? (
          <div className="loading">
            <p>Loading...</p>
          </div>
        ) : currentChapter ? (
          <div
            ref={contentElementRef}
            className="chapter-content"
            dangerouslySetInnerHTML={{ __html: chapterContent }}
          />
        ) : (
          <div className="no-content">
            <p>No chapter content available</p>
          </div>
        )}
      </main>

      {/* Navigation controls */}
      <nav className="navigation-controls">
        {!isFirstChapter && (
          <button className="nav-btn prev-btn" onClick={goToPreviousChapter}>
            ← Previous
          </button>
        )}
        {!isLastChapter && (
          <button className="nav-btn next-btn" onClick={goToNextChapter}>
            Next →
          </button>
        )}
      </nav>
    </div>
  )
}

export default App

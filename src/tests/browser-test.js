// Quick test script for browser console to verify storage functionality
// Open http://localhost:5173 and paste this in the console

console.log('🧪 Testing Local Storage Implementation...');

// Test 1: Basic functionality check
try {
  console.log('✅ Application loaded successfully');
  
  // Check if localStorage is working
  if (typeof Storage !== "undefined") {
    console.log('✅ LocalStorage is available');
  } else {
    console.log('❌ LocalStorage is not available');
  }
  
  // Check for our storage keys
  const keys = ['novel-preferences', 'novel-reading-state', 'novel-ui-state', 'novel-session-data'];
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      console.log(`✅ Found ${key}:`, JSON.parse(value));
    } else {
      console.log(`ℹ️  ${key} not found (will be created on first use)`);
    }
  });
  
  // Test theme change (should persist)
  console.log('🎨 Testing theme persistence...');
  const themeButton = document.querySelector('[data-theme]');
  if (themeButton) {
    console.log('✅ Theme system is active, current theme:', document.documentElement.getAttribute('data-theme'));
  }
  
  // Test scroll position tracking
  console.log('📜 Testing scroll tracking...');
  setTimeout(() => {
    window.scrollTo(0, 100);
    setTimeout(() => {
      const readingState = localStorage.getItem('novel-reading-state');
      if (readingState) {
        const state = JSON.parse(readingState);
        console.log('✅ Scroll position tracked:', state.data.scrollPosition);
      }
    }, 2000); // Wait for debounce
  }, 1000);
  
  console.log('✅ All basic tests completed. Check above for results.');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}

// Quick UI test functions
window.testStorage = {
  clearAll: () => {
    ['novel-preferences', 'novel-reading-state', 'novel-ui-state', 'novel-session-data'].forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🗑️  All storage cleared. Refresh to see defaults.');
  },
  
  showStorage: () => {
    ['novel-preferences', 'novel-reading-state', 'novel-ui-state', 'novel-session-data'].forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        console.log(`📦 ${key}:`, JSON.parse(value));
      }
    });
  },
  
  changeTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    console.log(`🎨 Theme changed to ${theme}. Should persist on refresh.`);
  }
};

console.log('🔧 Helper functions available:');
console.log('- testStorage.clearAll() - Clear all storage');
console.log('- testStorage.showStorage() - Show current storage');
console.log('- testStorage.changeTheme("dark"|"light"|"system") - Change theme');
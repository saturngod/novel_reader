// Navigation persistence debugging script
// Open http://localhost:5174 and paste this in the console

console.log('🔍 Debugging Navigation Persistence Issue...');

function debugNavigationPersistence() {
  console.log('=== NAVIGATION PERSISTENCE DEBUG ===');
  
  // Helper function to log current state
  function logCurrentState(action) {
    const state = localStorage.getItem('novel-reading-state');
    if (state) {
      const parsed = JSON.parse(state);
      console.log(`${action} - Current state:`, {
        currentChapterIndex: parsed.data?.currentChapterIndex,
        scrollPosition: parsed.data?.scrollPosition,
        lastReadTime: parsed.data?.lastReadTime,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`${action} - No state found`);
    }
  }
  
  // Log initial state
  logCurrentState('🏁 INITIAL');
  
  // Test navigation functions
  console.log('\n📝 Manual Test Instructions:');
  console.log('1. Click "Next" button and run: debugNav.testNext()');
  console.log('2. Click "Previous" button and run: debugNav.testPrev()');
  console.log('3. Click TOC chapter and run: debugNav.testTOC()');
  console.log('4. Refresh page and run: debugNav.testReload()');
}

// Global debug object
window.debugNav = {
  testNext: () => {
    console.log('\n🔼 TESTING NEXT BUTTON');
    const stateBefore = localStorage.getItem('novel-reading-state');
    const beforeIndex = stateBefore ? JSON.parse(stateBefore).data?.currentChapterIndex : 'none';
    console.log('Before Next click - Chapter:', beforeIndex);
    
    setTimeout(() => {
      const stateAfter = localStorage.getItem('novel-reading-state');
      const afterIndex = stateAfter ? JSON.parse(stateAfter).data?.currentChapterIndex : 'none';
      console.log('After Next click - Chapter:', afterIndex);
      
      if (afterIndex === beforeIndex + 1) {
        console.log('✅ Next button persistence: WORKING');
      } else {
        console.log('❌ Next button persistence: FAILED');
      }
    }, 500);
  },
  
  testPrev: () => {
    console.log('\n🔽 TESTING PREVIOUS BUTTON');
    const stateBefore = localStorage.getItem('novel-reading-state');
    const beforeIndex = stateBefore ? JSON.parse(stateBefore).data?.currentChapterIndex : 'none';
    console.log('Before Previous click - Chapter:', beforeIndex);
    
    setTimeout(() => {
      const stateAfter = localStorage.getItem('novel-reading-state');
      const afterIndex = stateAfter ? JSON.parse(stateAfter).data?.currentChapterIndex : 'none';
      console.log('After Previous click - Chapter:', afterIndex);
      
      if (afterIndex === beforeIndex - 1) {
        console.log('✅ Previous button persistence: WORKING');
      } else {
        console.log('❌ Previous button persistence: FAILED');
        console.log('Expected:', beforeIndex - 1, 'Got:', afterIndex);
      }
    }, 500);
  },
  
  testTOC: () => {
    console.log('\n📚 TESTING TOC SELECTION');
    const stateBefore = localStorage.getItem('novel-reading-state');
    const beforeIndex = stateBefore ? JSON.parse(stateBefore).data?.currentChapterIndex : 'none';
    console.log('Before TOC selection - Chapter:', beforeIndex);
    console.log('💡 Click on a different chapter in TOC, then run debugNav.afterTOC()');
  },
  
  afterTOC: () => {
    const stateAfter = localStorage.getItem('novel-reading-state');
    const afterIndex = stateAfter ? JSON.parse(stateAfter).data?.currentChapterIndex : 'none';
    console.log('After TOC selection - Chapter:', afterIndex);
    console.log('✅ TOC selection persistence: Check if chapter matches your selection');
  },
  
  testReload: () => {
    console.log('\n🔄 TESTING PAGE RELOAD');
    const currentState = localStorage.getItem('novel-reading-state');
    if (currentState) {
      const parsed = JSON.parse(currentState);
      console.log('Before reload - Stored chapter:', parsed.data?.currentChapterIndex);
      console.log('💡 Now refresh the page and check if it loads the same chapter');
    } else {
      console.log('❌ No state to test reload with');
    }
  },
  
  // Check for potential conflicts
  checkConflicts: () => {
    console.log('\n🔍 CHECKING FOR CONFLICTS');
    
    // Check if scroll position updates might interfere
    const originalUpdate = window.StorageService?.updateScrollPosition;
    if (originalUpdate) {
      console.log('⚠️  updateScrollPosition is available - this might cause conflicts');
    }
    
    // Monitor localStorage changes
    let changeCount = 0;
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      if (key === 'novel-reading-state') {
        changeCount++;
        console.log(`📝 localStorage change #${changeCount}:`, JSON.parse(value).data?.currentChapterIndex);
      }
      return originalSetItem.call(this, key, value);
    };
    
    console.log('✅ Monitoring localStorage changes. Perform navigation actions now.');
  },
  
  // Force save current chapter
  forceSave: (chapterIndex) => {
    const state = JSON.parse(localStorage.getItem('novel-reading-state') || '{"data":{"currentChapterIndex":0}}');
    state.data.currentChapterIndex = chapterIndex;
    state.data.lastReadTime = new Date().toISOString();
    localStorage.setItem('novel-reading-state', JSON.stringify(state));
    console.log(`🔧 Forced save chapter ${chapterIndex}`);
  }
};

// Auto-run initial debug
debugNavigationPersistence();

console.log('\n🔧 Debug functions available:');
console.log('- debugNav.testNext() - Test next button after clicking');
console.log('- debugNav.testPrev() - Test previous button after clicking');
console.log('- debugNav.testTOC() - Test TOC selection');
console.log('- debugNav.afterTOC() - Run after TOC selection');
console.log('- debugNav.testReload() - Test page reload');
console.log('- debugNav.checkConflicts() - Monitor for conflicts');
console.log('- debugNav.forceSave(5) - Force save specific chapter');
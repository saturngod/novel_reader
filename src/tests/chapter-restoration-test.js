// Test script for chapter state restoration
// Open http://localhost:5175 and paste this in the console

console.log('🧪 Testing Chapter State Restoration...');

async function testChapterRestoration() {
  console.log('📖 Testing chapter state restoration fix...');
  
  // Clear localStorage to start fresh
  localStorage.removeItem('novel-reading-state');
  console.log('✅ Cleared previous reading state');
  
  // Test sequence:
  // 1. Navigate to chapter 8 (index 7)
  // 2. Save state
  // 3. Simulate page reload by checking if state is restored
  
  console.log('🔄 Step 1: Simulating navigation to chapter 8...');
  
  // Check if we can find navigation buttons
  const nextButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Next') || btn.textContent.includes('→') || 
    btn.getAttribute('aria-label')?.includes('Next'));
  
  if (nextButton) {
    // Click next button multiple times to reach chapter 8
    for (let i = 0; i < 7; i++) {
      console.log(`📄 Navigating to chapter ${i + 2}...`);
      nextButton.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const currentState = localStorage.getItem('novel-reading-state');
      if (currentState) {
        const parsedState = JSON.parse(currentState);
        console.log(`✅ Chapter ${i + 2} saved:`, parsedState.data?.currentChapterIndex);
      }
    }
    
    // Verify we're at chapter 8 (index 7)
    const finalState = localStorage.getItem('novel-reading-state');
    if (finalState) {
      const parsedState = JSON.parse(finalState);
      const currentChapter = parsedState.data?.currentChapterIndex;
      
      if (currentChapter === 7) {
        console.log('✅ Successfully navigated to chapter 8 (index 7)');
        console.log('📄 Final state:', parsedState.data);
        
        // Now test page reload simulation
        console.log('🔄 Step 2: Testing state restoration after reload...');
        
        // Refresh the page to test restoration
        console.log('⚠️  To complete the test: Please refresh the page manually and run this check:');
        console.log('   testChapterRestoration.checkAfterReload()');
        
      } else {
        console.log(`❌ Expected chapter 8 (index 7), but got chapter ${currentChapter + 1} (index ${currentChapter})`);
      }
    } else {
      console.log('❌ No reading state found in localStorage');
    }
  } else {
    console.log('⚠️  Next button not found. Try manual navigation.');
    console.log('🔧 Manual test: Click next button 7 times to reach chapter 8, then refresh page');
  }
}

function checkStateAfterReload() {
  console.log('🔍 Checking state after page reload...');
  
  const savedState = localStorage.getItem('novel-reading-state');
  if (savedState) {
    const parsedState = JSON.parse(savedState);
    const savedChapter = parsedState.data?.currentChapterIndex;
    
    console.log('📄 Saved chapter in localStorage:', savedChapter + 1, '(index:', savedChapter + ')');
    
    // Wait for app to fully load and check current chapter
    setTimeout(() => {
      // Try to detect current chapter from UI
      const chapterTitle = document.querySelector('.app-title')?.textContent || 
                          document.querySelector('h1')?.textContent ||
                          document.querySelector('.chapter-title')?.textContent;
      
      // Check if current URL or any indicators show the right chapter
      console.log('📖 Current page chapter indicators:');
      console.log('  - Title:', chapterTitle);
      
      // Check if localStorage state matches displayed chapter
      const currentDisplayedState = localStorage.getItem('novel-reading-state');
      if (currentDisplayedState) {
        const currentParsed = JSON.parse(currentDisplayedState);
        const currentChapter = currentParsed.data?.currentChapterIndex;
        
        if (currentChapter === savedChapter) {
          console.log('✅ SUCCESS: Chapter state correctly restored!');
          console.log(`📄 Both saved and current show chapter ${currentChapter + 1} (index ${currentChapter})`);
        } else {
          console.log('❌ FAILURE: Chapter state not correctly restored!');
          console.log(`📄 Saved: chapter ${savedChapter + 1} (index ${savedChapter})`);
          console.log(`📄 Current: chapter ${currentChapter + 1} (index ${currentChapter})`);
        }
      }
    }, 2000); // Wait 2 seconds for app to fully load
    
  } else {
    console.log('❌ No saved state found after reload');
  }
}

// Make functions globally available
window.testChapterRestoration = {
  test: testChapterRestoration,
  checkAfterReload: checkStateAfterReload,
  
  // Quick check current state
  checkCurrent: () => {
    const state = localStorage.getItem('novel-reading-state');
    if (state) {
      const parsed = JSON.parse(state);
      console.log('📄 Current chapter:', parsed.data?.currentChapterIndex + 1, '(index:', parsed.data?.currentChapterIndex + ')');
    } else {
      console.log('❌ No reading state found');
    }
  },
  
  // Navigate to specific chapter for testing
  goToChapter: (chapterIndex) => {
    const state = localStorage.getItem('novel-reading-state') || '{"data":{"currentChapterIndex":0}}';
    const parsed = JSON.parse(state);
    parsed.data.currentChapterIndex = chapterIndex;
    parsed.data.lastReadTime = new Date().toISOString();
    localStorage.setItem('novel-reading-state', JSON.stringify(parsed));
    console.log(`📄 Set chapter to ${chapterIndex + 1} (index ${chapterIndex}). Refresh to see effect.`);
  }
};

// Auto-run test
console.log('🔧 Starting automatic test...');
testChapterRestoration();

console.log('🔧 Manual test functions available:');
console.log('- testChapterRestoration.test() - Run full test');
console.log('- testChapterRestoration.checkAfterReload() - Check after page refresh');
console.log('- testChapterRestoration.checkCurrent() - Check current state');
console.log('- testChapterRestoration.goToChapter(7) - Set to chapter 8 and refresh');
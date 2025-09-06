// Test script to verify Previous button navigation persistence fix
// Open http://localhost:5175 and paste this in the console

console.log('🧪 Testing Previous Button Navigation Persistence Fix...');

async function testPreviousButtonFix() {
  console.log('=== PREVIOUS BUTTON PERSISTENCE FIX TEST ===');
  
  // Step 1: Clear storage and set initial state
  console.log('🧹 Step 1: Clearing localStorage and setting up test...');
  localStorage.removeItem('novel-reading-state');
  
  // Wait for app to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: Navigate to chapter 3 first
  console.log('🔼 Step 2: Navigating to chapter 3 using Next button...');
  const nextButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Next') || btn.textContent.includes('→'));
  
  if (nextButton) {
    // Click next twice to get to chapter 3
    nextButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    nextButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const stateAfterNext = localStorage.getItem('novel-reading-state');
    if (stateAfterNext) {
      const parsed = JSON.parse(stateAfterNext);
      console.log('✅ After Next navigation - Chapter:', parsed.data?.currentChapterIndex + 1);
    }
  }
  
  // Step 3: Simulate some scrolling to trigger scroll tracking
  console.log('📜 Step 3: Simulating scroll activity...');
  const contentArea = document.querySelector('.chapter-content') || 
                     document.querySelector('.content-area') ||
                     document.querySelector('main');
  
  if (contentArea) {
    contentArea.scrollTop = 200;
    console.log('✅ Scrolled content area to position 200px');
    
    // Wait for scroll tracking debounce (1 second)
    console.log('⏱️  Waiting for scroll tracking to save (1 second debounce)...');
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const stateAfterScroll = localStorage.getItem('novel-reading-state');
    if (stateAfterScroll) {
      const parsed = JSON.parse(stateAfterScroll);
      console.log('📊 After scroll tracking - Chapter:', parsed.data?.currentChapterIndex + 1);
      console.log('📊 Scroll position saved:', parsed.data?.scrollPosition);
    }
  }
  
  // Step 4: Test Previous button navigation
  console.log('🔽 Step 4: Testing Previous button navigation...');
  const prevButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Previous') || btn.textContent.includes('←'));
  
  if (prevButton) {
    const stateBefore = localStorage.getItem('novel-reading-state');
    const beforeChapter = stateBefore ? JSON.parse(stateBefore).data?.currentChapterIndex : 'unknown';
    
    console.log(`📄 Before Previous click - Chapter: ${beforeChapter + 1}`);
    
    // Click Previous button
    prevButton.click();
    
    // Wait for navigation to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const stateAfterPrev = localStorage.getItem('novel-reading-state');
    if (stateAfterPrev) {
      const parsed = JSON.parse(stateAfterPrev);
      const afterChapter = parsed.data?.currentChapterIndex;
      console.log(`📄 After Previous click - Chapter: ${afterChapter + 1}`);
      
      if (afterChapter === beforeChapter - 1) {
        console.log('✅ Previous navigation saved correctly!');
      } else {
        console.log('❌ Previous navigation save failed!');
        console.log('Expected:', beforeChapter, 'Got:', afterChapter);
      }
    }
    
    // Step 5: Wait for scroll tracking and verify it doesn't override navigation
    console.log('⏱️  Step 5: Waiting to verify scroll tracking doesn\'t override navigation...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const finalState = localStorage.getItem('novel-reading-state');
    if (finalState) {
      const parsed = JSON.parse(finalState);
      const finalChapter = parsed.data?.currentChapterIndex;
      console.log(`📄 Final state after scroll debounce - Chapter: ${finalChapter + 1}`);
      
      if (finalChapter === beforeChapter - 1) {
        console.log('🎉 SUCCESS: Previous button navigation persists correctly!');
        console.log('✅ Scroll tracking no longer overrides navigation state');
      } else {
        console.log('❌ FAILED: Navigation state was overridden');
        console.log('Expected chapter:', beforeChapter, 'Final chapter:', finalChapter);
      }
    }
  } else {
    console.log('⚠️  Previous button not found');
  }
  
  console.log('\n🔍 Test completed! Results:');
  const finalTestState = localStorage.getItem('novel-reading-state');
  if (finalTestState) {
    const parsed = JSON.parse(finalTestState);
    console.log('📊 Final storage state:', {
      currentChapterIndex: parsed.data?.currentChapterIndex,
      scrollPosition: parsed.data?.scrollPosition,
      lastReadTime: parsed.data?.lastReadTime
    });
  }
}

// Test helper functions
window.prevButtonTest = {
  test: testPreviousButtonFix,
  
  // Quick test for Previous button only
  quickTestPrev: async () => {
    console.log('🔽 Quick Previous Button Test');
    const stateBefore = localStorage.getItem('novel-reading-state');
    const beforeChapter = stateBefore ? JSON.parse(stateBefore).data?.currentChapterIndex : 0;
    
    const prevBtn = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Previous') || btn.textContent.includes('←'));
    
    if (prevBtn) {
      prevBtn.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const stateAfter = localStorage.getItem('novel-reading-state');
      const afterChapter = stateAfter ? JSON.parse(stateAfter).data?.currentChapterIndex : 0;
      
      console.log('Before:', beforeChapter + 1, 'After:', afterChapter + 1);
      console.log(afterChapter === beforeChapter - 1 ? '✅ Working' : '❌ Failed');
    }
  },
  
  // Monitor localStorage changes
  monitorChanges: () => {
    const originalSetItem = localStorage.setItem;
    let changeCount = 0;
    
    localStorage.setItem = function(key, value) {
      if (key === 'novel-reading-state') {
        changeCount++;
        const parsed = JSON.parse(value);
        console.log(`📝 Storage change #${changeCount}:`, {
          chapter: parsed.data?.currentChapterIndex + 1,
          scroll: parsed.data?.scrollPosition,
          time: new Date().toLocaleTimeString()
        });
      }
      return originalSetItem.call(this, key, value);
    };
    
    console.log('🔍 Monitoring localStorage changes. Perform navigation actions now.');
  }
};

// Auto-run test
testPreviousButtonFix();

console.log('\n🔧 Test functions available:');
console.log('- prevButtonTest.test() - Run full test');
console.log('- prevButtonTest.quickTestPrev() - Quick previous button test');
console.log('- prevButtonTest.monitorChanges() - Monitor storage changes');
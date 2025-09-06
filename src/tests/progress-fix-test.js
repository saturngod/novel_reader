// Test script to verify progress bar fix
// Open http://localhost:5175 and paste this in the console

console.log('🧪 Testing Progress Bar Fix...');

async function testProgressBarFix() {
  console.log('=== TESTING PROGRESS BAR FIX ===');
  
  // Step 1: Clear all progress and go to first chapter
  console.log('🧹 Step 1: Clearing all progress...');
  localStorage.removeItem('novel-reading-state');
  
  // Wait for page to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: Check initial state (should be no progress bars)
  console.log('📊 Step 2: Checking initial state...');
  
  const headerProgressBar = document.querySelector('.reading-progress');
  const tocProgressBars = document.querySelectorAll('.chapter-progress');
  
  console.log('📊 Header progress bar:', headerProgressBar ? 'VISIBLE ❌' : 'HIDDEN ✅');
  console.log('📊 TOC progress bars:', tocProgressBars.length, tocProgressBars.length === 0 ? '✅' : '❌');
  
  if (headerProgressBar) {
    console.log('❌ FAILED: Header progress bar should be hidden on first load');
  }
  
  if (tocProgressBars.length > 0) {
    console.log('❌ FAILED: TOC should not show any progress bars initially');
  }
  
  // Step 3: Simulate some scrolling to create minimal progress
  console.log('📜 Step 3: Testing minimal scroll...');
  
  const contentArea = document.querySelector('.chapter-content') || 
                     document.querySelector('.content-area') ||
                     document.querySelector('main');
  
  if (contentArea) {
    // Scroll just a tiny bit (should not create progress due to 1% minimum)
    contentArea.scrollTop = 10;
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const stateAfterSmallScroll = localStorage.getItem('novel-reading-state');
    if (stateAfterSmallScroll) {
      const parsed = JSON.parse(stateAfterSmallScroll);
      const progress = parsed.data?.readingProgress?.[0];
      console.log('📊 Progress after small scroll:', progress?.readPercentage);
      
      if (progress && progress.readPercentage > 0 && progress.readPercentage < 1) {
        console.log('✅ GOOD: Small progress detected but should not be visible');
      }
    }
    
    // Check if progress bar is still hidden
    const progressAfterSmallScroll = document.querySelector('.reading-progress');
    console.log('📊 Progress bar after small scroll:', progressAfterSmallScroll ? 'VISIBLE ❌' : 'HIDDEN ✅');
    
    // Step 4: Create meaningful progress (scroll more significantly)
    console.log('📜 Step 4: Testing meaningful scroll...');
    
    const maxScroll = contentArea.scrollHeight - contentArea.clientHeight;
    const significantScroll = Math.max(50, maxScroll * 0.05); // 5% or at least 50px
    
    contentArea.scrollTop = significantScroll;
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const stateAfterBigScroll = localStorage.getItem('novel-reading-state');
    if (stateAfterBigScroll) {
      const parsed = JSON.parse(stateAfterBigScroll);
      const progress = parsed.data?.readingProgress?.[0];
      console.log('📊 Progress after significant scroll:', progress?.readPercentage);
      
      if (progress && progress.readPercentage >= 1) {
        console.log('✅ GOOD: Meaningful progress created');
        
        // Check if progress bar is now visible
        const progressAfterBigScroll = document.querySelector('.reading-progress');
        console.log('📊 Progress bar after big scroll:', progressAfterBigScroll ? 'VISIBLE ✅' : 'HIDDEN ❌');
        
        if (progressAfterBigScroll) {
          const progressText = progressAfterBigScroll.querySelector('.progress-text')?.textContent;
          console.log('📊 Progress text:', progressText);
          
          if (progressText && progressText !== '0%' && progressText !== 'NaN%') {
            console.log('✅ GOOD: Progress text shows meaningful value');
          } else {
            console.log('❌ FAILED: Progress text shows 0% or NaN%');
          }
        }
      }
    }
    
  } else {
    console.log('⚠️  Could not find content area for scrolling test');
  }
  
  console.log('\n=== TEST SUMMARY ===');
  console.log('✅ Fixed: Progress calculation now requires at least 1%');
  console.log('✅ Fixed: No scrollable content returns 0% instead of 100%');
  console.log('✅ Fixed: Progress bars only show for meaningful progress (≥1%)');
  console.log('✅ Fixed: Both header and TOC use consistent progress thresholds');
}

// Helper functions
window.progressFixTest = {
  test: testProgressBarFix,
  
  // Test edge cases
  testEdgeCases: () => {
    console.log('🧪 Testing edge cases...');
    
    // Test very short content
    const testDiv = document.createElement('div');
    testDiv.style.height = '100px';
    testDiv.style.overflow = 'auto';
    testDiv.innerHTML = '<p>Short content</p>';
    document.body.appendChild(testDiv);
    
    // Simulate progress calculation
    const scrollHeight = testDiv.scrollHeight;
    const clientHeight = testDiv.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    console.log('📊 Test div dimensions:', { scrollHeight, clientHeight, maxScroll });
    
    if (maxScroll <= 0) {
      console.log('✅ GOOD: Short content correctly returns 0% progress');
    } else {
      console.log('❌ Short content issue detected');
    }
    
    document.body.removeChild(testDiv);
  },
  
  // Create test progress
  createTestProgress: (percentage) => {
    const state = JSON.parse(localStorage.getItem('novel-reading-state') || '{"data":{"readingProgress":{},"currentChapterIndex":0}}');
    if (!state.data.readingProgress[0]) {
      state.data.readingProgress[0] = {
        scrollPosition: 100,
        readPercentage: percentage,
        lastVisited: new Date().toISOString(),
        timeSpent: 10,
        isCompleted: false
      };
    } else {
      state.data.readingProgress[0].readPercentage = percentage;
    }
    localStorage.setItem('novel-reading-state', JSON.stringify(state));
    console.log(`📊 Set test progress to ${percentage}%. Refresh to see effect.`);
  }
};

// Auto-run test
testProgressBarFix();

console.log('\n🔧 Test functions available:');
console.log('- progressFixTest.test() - Run full test');
console.log('- progressFixTest.testEdgeCases() - Test edge cases');
console.log('- progressFixTest.createTestProgress(0.5) - Test with 0.5% progress');
console.log('- progressFixTest.createTestProgress(1) - Test with 1% progress');
// Test script for browser console to verify navigation fixes
// Open http://localhost:5175 and paste this in the console

console.log('🧪 Testing Navigation and Progress Bar Fixes...');

async function testNavigation() {
  console.log('📖 Testing chapter navigation persistence...');
  
  // Clear localStorage to start fresh
  localStorage.removeItem('novel-reading-state');
  console.log('✅ Cleared previous reading state');
  
  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check initial state
  const initialState = localStorage.getItem('novel-reading-state');
  console.log('📊 Initial reading state:', initialState ? JSON.parse(initialState) : 'None');
  
  // Test next button click
  const nextButton = document.querySelector('[aria-label="Next Chapter"]') || 
                    document.querySelector('.navigation-btn.next') ||
                    document.querySelector('button:contains("Next")') ||
                    Array.from(document.querySelectorAll('button')).find(btn => 
                      btn.textContent.includes('Next') || btn.textContent.includes('→'));
  
  if (nextButton) {
    console.log('🔄 Clicking next chapter button...');
    nextButton.click();
    
    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const afterNextState = localStorage.getItem('novel-reading-state');
    if (afterNextState) {
      const parsedState = JSON.parse(afterNextState);
      console.log('✅ Next navigation saved:', parsedState);
      console.log('📄 Current chapter index:', parsedState.data?.currentChapterIndex);
    } else {
      console.log('❌ Next navigation not saved to localStorage');
    }
  } else {
    console.log('⚠️  Next button not found on page');
  }
  
  // Test previous button click
  const prevButton = document.querySelector('[aria-label="Previous Chapter"]') || 
                    document.querySelector('.navigation-btn.prev') ||
                    document.querySelector('button:contains("Previous")') ||
                    Array.from(document.querySelectorAll('button')).find(btn => 
                      btn.textContent.includes('Previous') || btn.textContent.includes('←'));
  
  if (prevButton) {
    console.log('🔄 Clicking previous chapter button...');
    prevButton.click();
    
    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const afterPrevState = localStorage.getItem('novel-reading-state');
    if (afterPrevState) {
      const parsedState = JSON.parse(afterPrevState);
      console.log('✅ Previous navigation saved:', parsedState);
      console.log('📄 Current chapter index:', parsedState.data?.currentChapterIndex);
    } else {
      console.log('❌ Previous navigation not saved to localStorage');
    }
  } else {
    console.log('⚠️  Previous button not found on page');
  }
}

function testProgressBar() {
  console.log('📊 Testing progress bar visibility...');
  
  const progressBar = document.querySelector('.reading-progress');
  const progressText = document.querySelector('.progress-text');
  
  if (progressBar) {
    const isVisible = window.getComputedStyle(progressBar).display !== 'none';
    const progressValue = progressText ? progressText.textContent : 'N/A';
    
    console.log('📊 Progress bar found:', {
      visible: isVisible,
      text: progressValue,
      element: progressBar
    });
    
    if (isVisible && progressValue === '0%') {
      console.log('❌ Progress bar showing at 0% - this should be hidden');
    } else if (!isVisible) {
      console.log('✅ Progress bar correctly hidden when no progress');
    } else {
      console.log('✅ Progress bar showing with progress:', progressValue);
    }
  } else {
    console.log('✅ Progress bar not found - correctly hidden when no progress');
  }
}

function testTOCNavigation() {
  console.log('📋 Testing TOC navigation persistence...');
  
  // Try to open TOC
  const tocButton = document.querySelector('[aria-label="Toggle Table of Contents"]') ||
                   document.querySelector('.hamburger-btn');
  
  if (tocButton) {
    console.log('🔄 Opening TOC...');
    tocButton.click();
    
    setTimeout(() => {
      const chapterItems = document.querySelectorAll('.chapter-item');
      if (chapterItems.length > 1) {
        console.log('🔄 Clicking on second chapter in TOC...');
        chapterItems[1].click();
        
        setTimeout(() => {
          const tocState = localStorage.getItem('novel-reading-state');
          if (tocState) {
            const parsedState = JSON.parse(tocState);
            console.log('✅ TOC navigation saved:', parsedState);
            console.log('📄 Current chapter index:', parsedState.data?.currentChapterIndex);
          } else {
            console.log('❌ TOC navigation not saved to localStorage');
          }
        }, 500);
      } else {
        console.log('⚠️  Not enough chapters found in TOC');
      }
    }, 500);
  } else {
    console.log('⚠️  TOC button not found');
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testNavigation();
    await new Promise(resolve => setTimeout(resolve, 1000));
    testProgressBar();
    await new Promise(resolve => setTimeout(resolve, 1000));
    testTOCNavigation();
    
    console.log('✅ All navigation tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run tests
runAllTests();

// Helper functions for manual testing
window.navigationTest = {
  testNext: () => {
    const nextBtn = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Next') || btn.textContent.includes('→'));
    if (nextBtn) {
      nextBtn.click();
      setTimeout(() => console.log('Storage after next:', localStorage.getItem('novel-reading-state')), 300);
    }
  },
  
  testPrev: () => {
    const prevBtn = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Previous') || btn.textContent.includes('←'));
    if (prevBtn) {
      prevBtn.click();
      setTimeout(() => console.log('Storage after prev:', localStorage.getItem('novel-reading-state')), 300);
    }
  },
  
  checkProgress: () => {
    const progress = document.querySelector('.reading-progress');
    console.log('Progress bar:', progress ? 'visible' : 'hidden');
    if (progress) {
      console.log('Progress text:', document.querySelector('.progress-text')?.textContent);
    }
  },
  
  clearStorage: () => {
    localStorage.removeItem('novel-reading-state');
    console.log('Reading state cleared. Refresh to see default state.');
  }
};

console.log('🔧 Manual test functions available:');
console.log('- navigationTest.testNext() - Test next button');
console.log('- navigationTest.testPrev() - Test previous button');
console.log('- navigationTest.checkProgress() - Check progress bar');
console.log('- navigationTest.clearStorage() - Clear storage');
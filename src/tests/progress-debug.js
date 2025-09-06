// Debug script to investigate progress bar issue
// Open http://localhost:5175 and paste this in the console

console.log('🔍 Debugging Progress Bar Issue...');

function debugProgressBarIssue() {
  console.log('=== DEBUGGING PROGRESS BAR ===');
  
  // 1. Check localStorage content
  const readingState = localStorage.getItem('novel-reading-state');
  console.log('📦 Raw localStorage content:', readingState);
  
  if (readingState) {
    try {
      const parsed = JSON.parse(readingState);
      console.log('📊 Parsed reading state:', parsed);
      
      if (parsed.data && parsed.data.readingProgress) {
        console.log('📖 Reading progress for all chapters:');
        Object.keys(parsed.data.readingProgress).forEach(chapterIndex => {
          const progress = parsed.data.readingProgress[chapterIndex];
          console.log(`  Chapter ${parseInt(chapterIndex) + 1} (index ${chapterIndex}):`, progress);
        });
      }
      
      console.log('📄 Current chapter index:', parsed.data?.currentChapterIndex);
    } catch (error) {
      console.error('❌ Failed to parse reading state:', error);
    }
  }
  
  // 2. Check what getCurrentChapterProgress returns
  console.log('\n=== CURRENT CHAPTER PROGRESS ===');
  
  // Simulate getCurrentChapterProgress function
  function simulateGetCurrentChapterProgress() {
    const readingState = JSON.parse(localStorage.getItem('novel-reading-state') || '{"data":{"readingProgress":{},"currentChapterIndex":0}}');
    const currentChapterIndex = readingState.data?.currentChapterIndex || 0;
    
    const progress = readingState.data?.readingProgress?.[currentChapterIndex] || {
      scrollPosition: 0,
      readPercentage: 0,
      lastVisited: new Date().toISOString(),
      timeSpent: 0,
      isCompleted: false
    };
    
    console.log(`📊 Current chapter ${currentChapterIndex + 1} progress:`, progress);
    console.log(`📊 readPercentage > 0:`, progress.readPercentage > 0);
    console.log(`📊 Math.round(readPercentage) > 0:`, Math.round(progress.readPercentage) > 0);
    console.log(`📊 Should show progress bar:`, progress.readPercentage > 0 && Math.round(progress.readPercentage) > 0);
    
    return progress;
  }
  
  const currentProgress = simulateGetCurrentChapterProgress();
  
  // 3. Check actual DOM elements
  console.log('\n=== DOM ELEMENTS ===');
  const progressBar = document.querySelector('.reading-progress');
  const progressText = document.querySelector('.progress-text');
  
  if (progressBar) {
    const isVisible = window.getComputedStyle(progressBar).display !== 'none';
    const progressValue = progressText ? progressText.textContent : 'N/A';
    
    console.log('📊 Progress bar element found:', progressBar);
    console.log('📊 Progress bar visible:', isVisible);
    console.log('📊 Progress text:', progressValue);
    
    if (isVisible && (progressValue === '0%' || progressValue === 'NaN%')) {
      console.log('❌ PROBLEM: Progress bar showing at 0% or NaN%');
    }
  } else {
    console.log('✅ Progress bar not found in DOM (correctly hidden)');
  }
  
  // 4. Check TOC progress bars
  console.log('\n=== TOC PROGRESS BARS ===');
  const chapterProgressBars = document.querySelectorAll('.chapter-progress');
  console.log(`📊 Found ${chapterProgressBars.length} chapter progress bars in TOC`);
  
  chapterProgressBars.forEach((progressBar, index) => {
    const progressText = progressBar.querySelector('.chapter-progress-text');
    const progressValue = progressText ? progressText.textContent : 'N/A';
    console.log(`📊 TOC Chapter ${index + 1} progress: ${progressValue}`);
    
    if (progressValue === '0%' || progressValue === 'NaN%') {
      console.log(`❌ PROBLEM: TOC showing 0% or NaN% for chapter ${index + 1}`);
    }
  });
  
  // 5. Check if there are any erroneous values in storage
  console.log('\n=== CHECKING FOR ERRORS ===');
  
  if (readingState) {
    const parsed = JSON.parse(readingState);
    if (parsed.data && parsed.data.readingProgress) {
      Object.keys(parsed.data.readingProgress).forEach(chapterIndex => {
        const progress = parsed.data.readingProgress[chapterIndex];
        if (progress.readPercentage > 0 && progress.readPercentage < 1) {
          console.log(`⚠️  Chapter ${parseInt(chapterIndex) + 1} has very small progress: ${progress.readPercentage}%`);
        }
        if (isNaN(progress.readPercentage)) {
          console.log(`❌ Chapter ${parseInt(chapterIndex) + 1} has NaN progress!`);
        }
      });
    }
  }
}

// Helper functions
window.progressDebug = {
  debug: debugProgressBarIssue,
  
  clearProgress: () => {
    const state = JSON.parse(localStorage.getItem('novel-reading-state') || '{"data":{"readingProgress":{}}}');
    state.data.readingProgress = {};
    localStorage.setItem('novel-reading-state', JSON.stringify(state));
    console.log('🧹 Cleared all reading progress. Refresh to see effect.');
  },
  
  clearCurrentChapter: () => {
    const state = JSON.parse(localStorage.getItem('novel-reading-state') || '{"data":{"readingProgress":{},"currentChapterIndex":0}}');
    const currentIndex = state.data?.currentChapterIndex || 0;
    if (state.data.readingProgress[currentIndex]) {
      delete state.data.readingProgress[currentIndex];
      localStorage.setItem('novel-reading-state', JSON.stringify(state));
      console.log(`🧹 Cleared progress for chapter ${currentIndex + 1}. Refresh to see effect.`);
    }
  },
  
  setProgress: (chapterIndex, percentage) => {
    const state = JSON.parse(localStorage.getItem('novel-reading-state') || '{"data":{"readingProgress":{}}}');
    if (!state.data.readingProgress[chapterIndex]) {
      state.data.readingProgress[chapterIndex] = {
        scrollPosition: 0,
        readPercentage: 0,
        lastVisited: new Date().toISOString(),
        timeSpent: 0,
        isCompleted: false
      };
    }
    state.data.readingProgress[chapterIndex].readPercentage = percentage;
    localStorage.setItem('novel-reading-state', JSON.stringify(state));
    console.log(`📊 Set chapter ${chapterIndex + 1} progress to ${percentage}%. Refresh to see effect.`);
  }
};

// Auto-run debug
debugProgressBarIssue();

console.log('\n🔧 Debug functions available:');
console.log('- progressDebug.debug() - Run full debug');
console.log('- progressDebug.clearProgress() - Clear all progress');
console.log('- progressDebug.clearCurrentChapter() - Clear current chapter progress');
console.log('- progressDebug.setProgress(chapterIndex, percentage) - Set specific progress');
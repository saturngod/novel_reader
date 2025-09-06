// Comprehensive test for all navigation persistence (Next/Prev/TOC)
// Open http://localhost:5175 and paste this in the console

console.log('🧪 Testing All Navigation Methods Persistence...');

async function testAllNavigationPersistence() {
  console.log('=== COMPREHENSIVE NAVIGATION PERSISTENCE TEST ===');
  
  // Clear storage and start fresh
  console.log('🧹 Clearing localStorage for fresh test...');
  localStorage.removeItem('novel-reading-state');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results = {
    next: { save: false, reload: false },
    prev: { save: false, reload: false },
    toc: { save: false, reload: false }
  };
  
  // Test 1: Next Button Navigation
  console.log('\n🔼 TEST 1: NEXT BUTTON NAVIGATION');
  const nextButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Next') || btn.textContent.includes('→'));
  
  if (nextButton) {
    const stateBefore = localStorage.getItem('novel-reading-state');
    const beforeChapter = stateBefore ? JSON.parse(stateBefore).data?.currentChapterIndex : 0;
    
    console.log(`📄 Before Next - Chapter: ${beforeChapter + 1}`);
    nextButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const stateAfter = localStorage.getItem('novel-reading-state');
    const afterChapter = stateAfter ? JSON.parse(stateAfter).data?.currentChapterIndex : 0;
    console.log(`📄 After Next - Chapter: ${afterChapter + 1}`);
    
    if (afterChapter === beforeChapter + 1) {
      console.log('✅ Next button saves state correctly');
      results.next.save = true;
    } else {
      console.log('❌ Next button failed to save state');
    }
    
    // Wait for scroll tracking to ensure it doesn't interfere
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const finalNext = localStorage.getItem('novel-reading-state');
    const finalNextChapter = finalNext ? JSON.parse(finalNext).data?.currentChapterIndex : 0;
    
    if (finalNextChapter === afterChapter) {
      console.log('✅ Next state persists after scroll tracking');
      results.next.reload = true;
    } else {
      console.log('❌ Next state was overridden by scroll tracking');
    }
  }
  
  // Test 2: Previous Button Navigation
  console.log('\n🔽 TEST 2: PREVIOUS BUTTON NAVIGATION');
  const prevButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Previous') || btn.textContent.includes('←'));
  
  if (prevButton) {
    const stateBefore = localStorage.getItem('novel-reading-state');
    const beforeChapter = stateBefore ? JSON.parse(stateBefore).data?.currentChapterIndex : 0;
    
    console.log(`📄 Before Previous - Chapter: ${beforeChapter + 1}`);
    prevButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const stateAfter = localStorage.getItem('novel-reading-state');
    const afterChapter = stateAfter ? JSON.parse(stateAfter).data?.currentChapterIndex : 0;
    console.log(`📄 After Previous - Chapter: ${afterChapter + 1}`);
    
    if (afterChapter === beforeChapter - 1) {
      console.log('✅ Previous button saves state correctly');
      results.prev.save = true;
    } else {
      console.log('❌ Previous button failed to save state');
    }
    
    // Wait for scroll tracking to ensure it doesn't interfere
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const finalPrev = localStorage.getItem('novel-reading-state');
    const finalPrevChapter = finalPrev ? JSON.parse(finalPrev).data?.currentChapterIndex : 0;
    
    if (finalPrevChapter === afterChapter) {
      console.log('✅ Previous state persists after scroll tracking');
      results.prev.reload = true;
    } else {
      console.log('❌ Previous state was overridden by scroll tracking');
    }
  }
  
  // Test 3: TOC Navigation
  console.log('\n📚 TEST 3: TOC NAVIGATION');
  const tocButton = document.querySelector('[aria-label=\"Toggle Table of Contents\"]') ||
                   document.querySelector('.hamburger-btn') ||
                   Array.from(document.querySelectorAll('button')).find(btn => 
                     btn.textContent.includes('☰') || btn.innerHTML.includes('hamburger'));
  
  if (tocButton) {
    console.log('🔄 Opening TOC...');
    tocButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const chapterItems = document.querySelectorAll('.chapter-item');
    if (chapterItems.length > 3) {
      const targetChapter = 3; // Select 4th chapter (index 3)
      const targetItem = chapterItems[targetChapter];
      
      const stateBefore = localStorage.getItem('novel-reading-state');
      const beforeChapter = stateBefore ? JSON.parse(stateBefore).data?.currentChapterIndex : 0;
      
      console.log(`📄 Before TOC selection - Chapter: ${beforeChapter + 1}`);
      console.log(`🎯 Selecting chapter ${targetChapter + 1} from TOC...`);
      
      targetItem.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const stateAfter = localStorage.getItem('novel-reading-state');
      const afterChapter = stateAfter ? JSON.parse(stateAfter).data?.currentChapterIndex : 0;
      console.log(`📄 After TOC selection - Chapter: ${afterChapter + 1}`);
      
      if (afterChapter === targetChapter) {
        console.log('✅ TOC selection saves state correctly');
        results.toc.save = true;
      } else {
        console.log('❌ TOC selection failed to save state');
      }
      
      // Wait for scroll tracking to ensure it doesn't interfere
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const finalToc = localStorage.getItem('novel-reading-state');
      const finalTocChapter = finalToc ? JSON.parse(finalToc).data?.currentChapterIndex : 0;
      
      if (finalTocChapter === targetChapter) {
        console.log('✅ TOC state persists after scroll tracking');
        results.toc.reload = true;
      } else {
        console.log('❌ TOC state was overridden by scroll tracking');
      }
    } else {
      console.log('⚠️  Not enough chapters found in TOC for testing');
    }
  } else {
    console.log('⚠️  TOC button not found');
  }
  
  // Final Results
  console.log('\n🏁 FINAL TEST RESULTS:');
  console.log('================================');
  
  const allPassed = Object.values(results).every(test => test.save && test.reload);
  
  Object.entries(results).forEach(([method, result]) => {
    const icon = (result.save && result.reload) ? '✅' : '❌';
    console.log(`${icon} ${method.toUpperCase()} Navigation:`, {
      'State Save': result.save ? '✅' : '❌',
      'Persistence': result.reload ? '✅' : '❌'
    });
  });
  
  console.log('================================');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Navigation persistence is working correctly!');
    console.log('✅ Next button: Working');
    console.log('✅ Previous button: Working');
    console.log('✅ TOC selection: Working');
    console.log('✅ Scroll tracking: Not interfering with navigation');
  } else {
    console.log('❌ Some tests failed. Check individual results above.');
  }
  
  // Show current final state
  const finalState = localStorage.getItem('novel-reading-state');
  if (finalState) {
    const parsed = JSON.parse(finalState);
    console.log('\\n📊 Final state:', {
      currentChapterIndex: parsed.data?.currentChapterIndex,
      scrollPosition: parsed.data?.scrollPosition,
      lastReadTime: parsed.data?.lastReadTime
    });
  }
  
  return results;
}

// Helper functions for manual testing
window.navigationTest = {
  testAll: testAllNavigationPersistence,
  
  testReloadBehavior: () => {
    console.log('🔄 RELOAD BEHAVIOR TEST');
    const currentState = localStorage.getItem('novel-reading-state');
    if (currentState) {
      const parsed = JSON.parse(currentState);
      const storedChapter = parsed.data?.currentChapterIndex;
      console.log(`📄 Stored chapter: ${storedChapter + 1}`);
      console.log('💡 Now refresh the page and check if it loads chapter', storedChapter + 1);
      console.log('💡 After refresh, run navigationTest.verifyReload() to check result');
      
      // Store expected chapter for verification
      sessionStorage.setItem('expected-chapter', storedChapter.toString());
    } else {
      console.log('❌ No reading state found');
    }
  },
  
  verifyReload: () => {
    const expectedChapter = sessionStorage.getItem('expected-chapter');
    if (expectedChapter) {
      const currentState = localStorage.getItem('novel-reading-state');
      if (currentState) {
        const parsed = JSON.parse(currentState);
        const actualChapter = parsed.data?.currentChapterIndex;
        
        console.log(`📊 Expected chapter: ${parseInt(expectedChapter) + 1}`);
        console.log(`📊 Actual chapter: ${actualChapter + 1}`);
        
        if (actualChapter === parseInt(expectedChapter)) {
          console.log('✅ Reload behavior: PASSED');
        } else {
          console.log('❌ Reload behavior: FAILED');
        }
        
        sessionStorage.removeItem('expected-chapter');
      }
    } else {
      console.log('⚠️  No expected chapter stored. Run testReloadBehavior() first.');
    }
  }
};

// Auto-run test
testAllNavigationPersistence();

console.log('\\n🔧 Test functions available:');
console.log('- navigationTest.testAll() - Run all navigation tests');
console.log('- navigationTest.testReloadBehavior() - Test reload persistence');
console.log('- navigationTest.verifyReload() - Verify reload after refresh');
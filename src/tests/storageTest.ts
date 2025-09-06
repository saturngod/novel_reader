/**
 * Basic Storage Functionality Tests
 * Simple tests to verify that the storage system works correctly.
 * This can be run in the browser console for manual testing.
 */

import StorageService, { 
  defaultPreferences, 
  defaultReadingState
} from '../services/StorageService';
import DataMigration from '../utils/DataMigration';
import StorageErrorHandler from '../utils/ErrorHandler';

export class StorageTests {
  
  static async runAllTests(): Promise<boolean> {
    console.log('Starting Storage Tests...');
    
    try {
      // Test 1: Storage availability
      const storageAvailable = this.testStorageAvailability();
      console.log('✓ Storage availability test:', storageAvailable ? 'PASS' : 'FAIL');
      
      // Test 2: Basic save/load operations
      const basicOperations = this.testBasicOperations();
      console.log('✓ Basic operations test:', basicOperations ? 'PASS' : 'FAIL');
      
      // Test 3: Data validation
      const validation = this.testDataValidation();
      console.log('✓ Data validation test:', validation ? 'PASS' : 'FAIL');
      
      // Test 4: Migration system
      const migration = await this.testMigrationSystem();
      console.log('✓ Migration system test:', migration ? 'PASS' : 'FAIL');
      
      // Test 5: Error handling
      const errorHandling = this.testErrorHandling();
      console.log('✓ Error handling test:', errorHandling ? 'PASS' : 'FAIL');
      
      // Test 6: Performance (debouncing)
      const performance = await this.testPerformance();
      console.log('✓ Performance test:', performance ? 'PASS' : 'FAIL');
      
      const allPassed = storageAvailable && basicOperations && validation && 
                       migration && errorHandling && performance;
      
      console.log(allPassed ? '✅ All tests PASSED!' : '❌ Some tests FAILED!');
      return allPassed;
      
    } catch (error) {
      console.error('Test suite failed:', error);
      return false;
    }
  }
  
  static testStorageAvailability(): boolean {
    return StorageErrorHandler.isStorageAvailable();
  }
  
  static testBasicOperations(): boolean {
    try {
      // Test preferences
      const testPreferences = {
        ...defaultPreferences,
        theme: 'dark' as const,
        fontSize: 'large' as const
      };
      
      const saveSuccess = StorageService.saveUserPreferences(testPreferences);
      if (!saveSuccess) return false;
      
      const loadedPreferences = StorageService.loadUserPreferences();
      if (loadedPreferences.theme !== 'dark' || loadedPreferences.fontSize !== 'large') {
        return false;
      }
      
      // Test reading state
      const testReadingState = {
        ...defaultReadingState,
        currentChapterIndex: 5,
        scrollPosition: 1500
      };
      
      StorageService.saveReadingState(testReadingState);
      const loadedState = StorageService.loadReadingState();
      
      return loadedState.currentChapterIndex === 5 && loadedState.scrollPosition === 1500;
      
    } catch (error) {
      console.error('Basic operations test failed:', error);
      return false;
    }
  }
  
  static testDataValidation(): boolean {
    try {
      // Test invalid preferences
      const invalidPreferences = {
        theme: 'invalid-theme',
        font: 'invalid-font',
        fontSize: 'invalid-size'
      } as any;
      
      const saveResult = StorageService.saveUserPreferences(invalidPreferences);
      // Should return false for invalid data
      return !saveResult;
      
    } catch (error) {
      console.error('Data validation test failed:', error);
      return false;
    }
  }
  
  static async testMigrationSystem(): Promise<boolean> {
    try {
      const migrationStatus = DataMigration.getMigrationStatus();
      console.log('Migration status:', migrationStatus);
      
      // Test initialization
      const initResult = await DataMigration.initialize();
      return initResult;
      
    } catch (error) {
      console.error('Migration test failed:', error);
      return false;
    }
  }
  
  static testErrorHandling(): boolean {
    try {
      // Test error creation and logging
      const initialErrorCount = StorageErrorHandler.getErrorLog().length;
      
      // This should create a validation error
      StorageService.saveUserPreferences({ theme: 'invalid' } as any);
      
      const newErrorCount = StorageErrorHandler.getErrorLog().length;
      return newErrorCount > initialErrorCount;
      
    } catch (error) {
      console.error('Error handling test failed:', error);
      return false;
    }
  }
  
  static async testPerformance(): Promise<boolean> {
    try {
      const startTime = performance.now();
      
      // Perform multiple storage operations
      for (let i = 0; i < 10; i++) {
        const testState = {
          ...defaultReadingState,
          scrollPosition: i * 100
        };
        StorageService.saveReadingState(testState);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Operations should complete within reasonable time (< 100ms)
      console.log(`Performance test duration: ${duration.toFixed(2)}ms`);
      return duration < 100;
      
    } catch (error) {
      console.error('Performance test failed:', error);
      return false;
    }
  }
  
  static async getStorageReport(): Promise<void> {
    console.log('=== Storage Health Report ===');
    
    const healthReport = await StorageErrorHandler.getStorageHealthReport();
    console.log('Storage Available:', healthReport.available);
    console.log('Storage Usage:', {
      used: (healthReport.quota.used / 1024).toFixed(2) + ' KB',
      total: (healthReport.quota.total / 1024).toFixed(2) + ' KB',
      percentage: healthReport.quota.percentage.toFixed(1) + '%'
    });
    console.log('Error Count:', healthReport.errors);
    
    if (healthReport.lastError) {
      console.log('Last Error:', healthReport.lastError.message);
    }
    
    const migrationStatus = DataMigration.getMigrationStatus();
    console.log('Migration Status:', migrationStatus);
    
    console.log('=== End Report ===');
  }
  
  static clearTestData(): void {
    console.log('Clearing test data...');
    StorageService.clearAllData();
    StorageErrorHandler.clearErrorLog();
    console.log('Test data cleared.');
  }
}

// For browser console usage
(window as any).StorageTests = StorageTests;

export default StorageTests;
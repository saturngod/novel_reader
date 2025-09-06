/**
 * Error Handling Utilities for Local Storage Operations
 * Provides comprehensive error handling, logging, and recovery mechanisms
 * for storage-related operations in the novel reading application.
 */

export interface ErrorContext {
  operation: string;
  component?: string;
  data?: any;
  timestamp: string;
  userAgent: string;
  url: string;
}

export interface StorageError extends Error {
  code: ErrorCode;
  context: ErrorContext;
  recoverable: boolean;
}

export const ErrorCodes = {
  STORAGE_NOT_AVAILABLE: 'STORAGE_NOT_AVAILABLE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
  DESERIALIZATION_ERROR: 'DESERIALIZATION_ERROR',
  MIGRATION_FAILED: 'MIGRATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export class StorageErrorHandler {
  private static errorLog: StorageError[] = [];
  private static maxLogSize = 50;
  private static listeners: ((error: StorageError) => void)[] = [];

  // Check if localStorage is available
  static isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Check storage quota
  static async checkStorageQuota(): Promise<{ used: number; quota: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const used = estimate.usage || 0;
        const available = quota - used;
        return { used, quota, available };
      } catch {
        // Fallback estimation
        const used = this.calculateUsedStorage();
        const quota = 5 * 1024 * 1024; // 5MB estimate
        return { used, quota, available: quota - used };
      }
    }
    
    // Fallback for older browsers
    const used = this.calculateUsedStorage();
    const quota = 5 * 1024 * 1024; // 5MB estimate
    return { used, quota, available: quota - used };
  }

  // Calculate used storage size
  private static calculateUsedStorage(): number {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        total += key.length + value.length;
      }
    }
    return total;
  }

  // Create a storage error
  static createError(
    code: ErrorCode,
    message: string,
    operation: string,
    originalError?: Error,
    data?: any
  ): StorageError {
    const context: ErrorContext = {
      operation,
      data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const error = new Error(message) as StorageError;
    error.code = code;
    error.context = context;
    error.recoverable = this.isRecoverable(code);
    
    if (originalError) {
      error.stack = originalError.stack;
    }

    this.logError(error);
    return error;
  }

  // Determine if error is recoverable
  private static isRecoverable(code: ErrorCode): boolean {
    const recoverableCodes: ErrorCode[] = [
      ErrorCodes.QUOTA_EXCEEDED,
      ErrorCodes.NETWORK_ERROR,
      ErrorCodes.SERIALIZATION_ERROR,
      ErrorCodes.DESERIALIZATION_ERROR
    ];
    return recoverableCodes.includes(code);
  }

  // Log error
  private static logError(error: StorageError): void {
    console.error('Storage Error:', error);
    
    this.errorLog.push(error);
    
    // Limit log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
    
    // Store critical errors for debugging
    if (!error.recoverable) {
      this.storeCriticalError(error);
    }
  }

  // Store critical errors in a separate storage key
  private static storeCriticalError(error: StorageError): void {
    try {
      const criticalErrors = JSON.parse(localStorage.getItem('novel-critical-errors') || '[]');
      criticalErrors.push({
        code: error.code,
        message: error.message,
        context: error.context
      });
      
      // Keep only last 10 critical errors
      if (criticalErrors.length > 10) {
        criticalErrors.shift();
      }
      
      localStorage.setItem('novel-critical-errors', JSON.stringify(criticalErrors));
    } catch {
      // If we can't even store critical errors, log to console
      console.error('Failed to store critical error:', error);
    }
  }

  // Add error listener
  static addErrorListener(listener: (error: StorageError) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get error log
  static getErrorLog(): StorageError[] {
    return [...this.errorLog];
  }

  // Clear error log
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  // Handle storage operation with error recovery
  static async handleStorageOperation<T>(
    operation: () => T,
    operationName: string,
    fallback?: () => T,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return operation();
      } catch (error) {
        lastError = error as Error;
        
        // Determine error type and handle accordingly
        if (error instanceof DOMException) {
          if (error.code === 22 || error.name === 'QuotaExceededError') {
            // Storage quota exceeded
            this.createError(
              ErrorCodes.QUOTA_EXCEEDED,
              'Storage quota exceeded',
              operationName,
              error
            );
            
            if (attempt === maxRetries && fallback) {
              console.warn('Using fallback after quota exceeded');
              return fallback();
            }
            
            // Try to free up space
            await this.freeUpStorage();
          } else {
            // Other storage errors
            this.createError(
              ErrorCodes.STORAGE_NOT_AVAILABLE,
              'Storage operation failed',
              operationName,
              error
            );
            
            if (fallback) {
              return fallback();
            }
          }
        } else {
          // Other types of errors
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.createError(
            ErrorCodes.UNKNOWN_ERROR,
            `Operation failed: ${errorMessage}`,
            operationName,
            error instanceof Error ? error : undefined
          );
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }
    
    // If all retries failed and no fallback, throw the last error
    if (lastError) {
      throw lastError;
    }
    
    throw new Error(`Operation ${operationName} failed after ${maxRetries} attempts`);
  }

  // Free up storage space
  private static async freeUpStorage(): Promise<void> {
    try {
      // Remove old session data (keep only current session)
      
      // Remove old critical errors (keep only last 5)
      const criticalErrors = JSON.parse(localStorage.getItem('novel-critical-errors') || '[]');
      if (criticalErrors.length > 5) {
        const trimmed = criticalErrors.slice(-5);
        localStorage.setItem('novel-critical-errors', JSON.stringify(trimmed));
      }
      
      // Clean up any temporary keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('temp-') || key.startsWith('cache-'))) {
          localStorage.removeItem(key);
        }
      }
      
      console.log('Storage cleanup completed');
    } catch (error) {
      console.error('Failed to free up storage:', error);
    }
  }

  // Validate storage data
  static validateStorageData(key: string, data: any, validator: (data: any) => boolean): boolean {
    try {
      const isValid = validator(data);
      if (!isValid) {
        this.createError(
          ErrorCodes.VALIDATION_FAILED,
          `Data validation failed for key: ${key}`,
          'validateStorageData',
          undefined,
          data
        );
      }
      return isValid;
    } catch (error) {
      this.createError(
        ErrorCodes.VALIDATION_FAILED,
        `Validation error for key: ${key}`,
        'validateStorageData',
        error as Error,
        data
      );
      return false;
    }
  }

  // Safe JSON parse with error handling
  static safeJSONParse<T>(json: string, fallback: T): T {
    try {
      return JSON.parse(json);
    } catch (error) {
      this.createError(
        ErrorCodes.DESERIALIZATION_ERROR,
        'Failed to parse JSON data',
        'safeJSONParse',
        error as Error,
        { json: json.substring(0, 100) + '...' }
      );
      return fallback;
    }
  }

  // Safe JSON stringify with error handling
  static safeJSONStringify(data: any): string | null {
    try {
      return JSON.stringify(data);
    } catch (error) {
      this.createError(
        ErrorCodes.SERIALIZATION_ERROR,
        'Failed to stringify data',
        'safeJSONStringify',
        error as Error,
        { dataType: typeof data }
      );
      return null;
    }
  }

  // Get storage health report
  static async getStorageHealthReport(): Promise<{
    available: boolean;
    quota: { used: number; total: number; percentage: number };
    errors: number;
    lastError?: StorageError;
  }> {
    const available = this.isStorageAvailable();
    const quotaInfo = await this.checkStorageQuota();
    const errors = this.errorLog.length;
    const lastError = this.errorLog[this.errorLog.length - 1];
    
    return {
      available,
      quota: {
        used: quotaInfo.used,
        total: quotaInfo.quota,
        percentage: (quotaInfo.used / quotaInfo.quota) * 100
      },
      errors,
      lastError
    };
  }
}

export default StorageErrorHandler;
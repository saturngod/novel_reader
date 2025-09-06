/**
 * Data Migration System for Novel Reading Application
 * Handles schema changes, data migrations, and version compatibility
 * for local storage data structures.
 */

import StorageService, { 
  defaultPreferences,
  defaultReadingState,
  defaultUIState,
  defaultSessionData
} from '../services/StorageService';
import StorageErrorHandler, { ErrorCodes } from './ErrorHandler';

export interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => any;
  validate?: (data: any) => boolean;
  description: string;
}

export interface DataVersion {
  version: string;
  timestamp: string;
  migrationId?: string;
}

export class DataMigration {
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly VERSION_KEY = 'novel-data-version';
  
  private static migrationRules: MigrationRule[] = [
    // Example migration from hypothetical v0.9.0 to v1.0.0
    {
      fromVersion: '0.9.0',
      toVersion: '1.0.0',
      description: 'Add new preferences fields and restructure reading state',
      migrate: (data: any) => {
        // Add new preference fields if they don't exist
        if (data.preferences) {
          data.preferences = {
            ...data.preferences,
            lineHeight: data.preferences.lineHeight || 'normal',
            textAlign: data.preferences.textAlign || 'left',
            pageWidth: data.preferences.pageWidth || 'normal'
          };
        }
        
        // Restructure reading state
        if (data.readingState) {
          data.readingState = {
            ...data.readingState,
            totalReadingTime: data.readingState.totalReadingTime || 0,
            sessionStartTime: data.readingState.sessionStartTime || new Date().toISOString()
          };
        }
        
        return data;
      },
      validate: (data: any) => {
        return data.preferences && 
               data.preferences.lineHeight && 
               data.preferences.textAlign && 
               data.preferences.pageWidth;
      }
    },
    
    // Migration for fixing corrupted bookmark data
    {
      fromVersion: '1.0.0',
      toVersion: '1.0.1',
      description: 'Fix bookmark data structure and add missing IDs',
      migrate: (data: any) => {
        if (data.sessionData && data.sessionData.bookmarkPositions) {
          data.sessionData.bookmarkPositions = data.sessionData.bookmarkPositions.map((bookmark: any) => {
            if (!bookmark.id) {
              bookmark.id = `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            if (!bookmark.timestamp) {
              bookmark.timestamp = new Date().toISOString();
            }
            return bookmark;
          });
        }
        return data;
      },
      validate: (data: any) => {
        if (!data.sessionData || !data.sessionData.bookmarkPositions) return true;
        return data.sessionData.bookmarkPositions.every((bookmark: any) => 
          bookmark.id && bookmark.timestamp
        );
      }
    }
  ];

  // Get current data version
  static getCurrentVersion(): DataVersion {
    try {
      const versionData = localStorage.getItem(this.VERSION_KEY);
      if (versionData) {
        return JSON.parse(versionData);
      }
    } catch (error) {
      console.error('Failed to read version data:', error);
    }
    
    return {
      version: '0.0.0',
      timestamp: new Date().toISOString()
    };
  }

  // Set current data version
  static setCurrentVersion(version: string, migrationId?: string): void {
    const versionData: DataVersion = {
      version,
      timestamp: new Date().toISOString(),
      migrationId
    };
    
    try {
      localStorage.setItem(this.VERSION_KEY, JSON.stringify(versionData));
    } catch (error) {
      StorageErrorHandler.createError(
        ErrorCodes.STORAGE_NOT_AVAILABLE,
        'Failed to set version data',
        'setCurrentVersion',
        error as Error
      );
    }
  }

  // Check if migration is needed
  static needsMigration(): boolean {
    const currentVersion = this.getCurrentVersion();
    return this.versionCompare(currentVersion.version, this.CURRENT_VERSION) < 0;
  }

  // Compare version strings (returns -1, 0, or 1)
  private static versionCompare(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  // Get applicable migration rules
  private static getApplicableMigrations(fromVersion: string): MigrationRule[] {
    return this.migrationRules.filter(rule => {
      return this.versionCompare(fromVersion, rule.fromVersion) <= 0 &&
             this.versionCompare(rule.toVersion, this.CURRENT_VERSION) <= 0;
    }).sort((a, b) => this.versionCompare(a.fromVersion, b.fromVersion));
  }

  // Perform data migration
  static async performMigration(): Promise<boolean> {
    if (!this.needsMigration()) {
      return true;
    }

    const currentVersion = this.getCurrentVersion();
    const applicableMigrations = this.getApplicableMigrations(currentVersion.version);
    
    if (applicableMigrations.length === 0) {
      console.log('No applicable migrations found');
      this.setCurrentVersion(this.CURRENT_VERSION);
      return true;
    }

    console.log(`Starting migration from version ${currentVersion.version} to ${this.CURRENT_VERSION}`);
    
    try {
      // Create backup before migration
      const backupId = await this.createBackup();
      
      // Load all current data
      const allData = {
        preferences: StorageService.loadUserPreferences(),
        readingState: StorageService.loadReadingState(),
        uiState: StorageService.loadUIState(),
        sessionData: StorageService.loadSessionData()
      };

      // Apply migrations in sequence
      let migratedData = { ...allData };

      for (const migration of applicableMigrations) {
        console.log(`Applying migration: ${migration.description}`);
        
        try {
          migratedData = migration.migrate(migratedData);
          
          // Validate migration if validator is provided
          if (migration.validate && !migration.validate(migratedData)) {
            throw new Error(`Migration validation failed: ${migration.description}`);
          }
        } catch (error) {
          console.error(`Migration failed: ${migration.description}`, error);
          
          // Restore from backup
          await this.restoreFromBackup(backupId);
          
          StorageErrorHandler.createError(
            ErrorCodes.MIGRATION_FAILED,
            `Migration failed: ${migration.description}`,
            'performMigration',
            error as Error
          );
          
          return false;
        }
      }

      // Save migrated data
      await this.saveMigratedData(migratedData);
      
      // Update version
      this.setCurrentVersion(this.CURRENT_VERSION, backupId);
      
      console.log(`Migration completed successfully to version ${this.CURRENT_VERSION}`);
      return true;
      
    } catch (error) {
      console.error('Migration process failed:', error);
      
      StorageErrorHandler.createError(
        ErrorCodes.MIGRATION_FAILED,
        'Migration process failed',
        'performMigration',
        error as Error
      );
      
      return false;
    }
  }

  // Create data backup
  private static async createBackup(): Promise<string> {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const allData = {
        preferences: StorageService.loadUserPreferences(),
        readingState: StorageService.loadReadingState(),
        uiState: StorageService.loadUIState(),
        sessionData: StorageService.loadSessionData(),
        version: this.getCurrentVersion()
      };
      
      const backupKey = `novel-backup-${backupId}`;
      localStorage.setItem(backupKey, JSON.stringify(allData));
      
      // Keep only last 3 backups
      this.cleanupOldBackups();
      
      return backupId;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  // Restore from backup
  private static async restoreFromBackup(backupId: string): Promise<void> {
    try {
      const backupKey = `novel-backup-${backupId}`;
      const backupData = localStorage.getItem(backupKey);
      
      if (!backupData) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      const data = JSON.parse(backupData);
      await this.saveMigratedData(data);
      
      if (data.version) {
        this.setCurrentVersion(data.version.version, data.version.migrationId);
      }
      
      console.log(`Restored from backup: ${backupId}`);
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error}`);
    }
  }

  // Save migrated data
  private static async saveMigratedData(data: any): Promise<void> {
    const saveOperations = [
      () => StorageService.saveUserPreferences(data.preferences || defaultPreferences),
      () => StorageService.saveReadingState(data.readingState || defaultReadingState),
      () => StorageService.saveUIState(data.uiState || defaultUIState),
      () => StorageService.saveSessionData(data.sessionData || defaultSessionData)
    ];

    for (const operation of saveOperations) {
      await StorageErrorHandler.handleStorageOperation(
        operation,
        'saveMigratedData',
        undefined,
        3
      );
    }
  }

  // Clean up old backups
  private static cleanupOldBackups(): void {
    try {
      const backupKeys: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('novel-backup-')) {
          backupKeys.push(key);
        }
      }
      
      // Sort by timestamp (newest first)
      backupKeys.sort((a, b) => {
        const timestampA = a.split('_')[1];
        const timestampB = b.split('_')[1];
        return parseInt(timestampB) - parseInt(timestampA);
      });
      
      // Remove old backups (keep only 3 most recent)
      backupKeys.slice(3).forEach(key => {
        localStorage.removeItem(key);
      });
      
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  // Initialize data migration system
  static async initialize(): Promise<boolean> {
    try {
      // Check if data exists
      const hasData = this.hasExistingData();
      
      if (!hasData) {
        // First time initialization
        this.setCurrentVersion(this.CURRENT_VERSION);
        return true;
      }
      
      // Check if migration is needed
      if (this.needsMigration()) {
        return await this.performMigration();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize migration system:', error);
      return false;
    }
  }

  // Check if any storage data exists
  private static hasExistingData(): boolean {
    const keys = ['novel-preferences', 'novel-reading-state', 'novel-ui-state', 'novel-session-data'];
    return keys.some(key => localStorage.getItem(key) !== null);
  }

  // Get migration status
  static getMigrationStatus(): {
    currentVersion: string;
    latestVersion: string;
    needsMigration: boolean;
    availableMigrations: number;
  } {
    const currentVersion = this.getCurrentVersion();
    const needsMigration = this.needsMigration();
    const availableMigrations = this.getApplicableMigrations(currentVersion.version).length;
    
    return {
      currentVersion: currentVersion.version,
      latestVersion: this.CURRENT_VERSION,
      needsMigration,
      availableMigrations
    };
  }

  // Force migration (for testing or recovery)
  static async forceMigration(): Promise<boolean> {
    console.log('Forcing migration...');
    return await this.performMigration();
  }
}

export default DataMigration;
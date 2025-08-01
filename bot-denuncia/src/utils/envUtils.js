const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

/**
 * Utility functions for safely managing .env file
 */
class EnvUtils {
  constructor() {
    this.envPath = path.join(__dirname, '../../.env');
  }

  /**
   * Read current .env file content
   */
  async readEnvFile() {
    try {
      const content = await fs.readFile(this.envPath, 'utf8');
      return content;
    } catch (error) {
      logger.error('Failed to read .env file:', error.message);
      throw new Error('Unable to read .env file');
    }
  }

  /**
   * Parse .env content into key-value pairs
   */
  parseEnvContent(content) {
    const envVars = {};
    const lines = content.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }

      // Parse key=value pairs
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1);
        envVars[key] = value;
      }
    });

    return envVars;
  }

  /**
   * Build .env content from key-value pairs while preserving comments and structure
   */
  buildEnvContent(originalContent, updates) {
    const lines = originalContent.split('\n');
    const updatedLines = [];
    const processedKeys = new Set();

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Keep empty lines and comments as-is
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        updatedLines.push(line);
        return;
      }

      // Check if this line contains a key we want to update
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        
        if (updates.hasOwnProperty(key)) {
          // Replace with new value
          updatedLines.push(`${key}=${updates[key]}`);
          processedKeys.add(key);
        } else {
          // Keep original line
          updatedLines.push(line);
        }
      } else {
        // Keep original line if it doesn't match key=value pattern
        updatedLines.push(line);
      }
    });

    // Add any new keys that weren't in the original file
    Object.keys(updates).forEach(key => {
      if (!processedKeys.has(key)) {
        updatedLines.push(`${key}=${updates[key]}`);
      }
    });

    return updatedLines.join('\n');
  }

  /**
   * Update specific environment variables in .env file
   */
  async updateEnvVariables(updates) {
    try {
      logger.info('Updating .env file with new variables:', Object.keys(updates));

      // Read current .env content
      const originalContent = await this.readEnvFile();

      // Build updated content
      const updatedContent = this.buildEnvContent(originalContent, updates);

      // Create backup of original .env file
      const backupPath = `${this.envPath}.backup.${Date.now()}`;
      await fs.copyFile(this.envPath, backupPath);
      logger.info(`Created backup of .env file: ${backupPath}`);

      // Write updated content
      await fs.writeFile(this.envPath, updatedContent, 'utf8');
      logger.info('Successfully updated .env file');

      // Update process.env for immediate effect
      Object.keys(updates).forEach(key => {
        process.env[key] = updates[key];
      });

      return {
        success: true,
        message: 'Environment variables updated successfully',
        backupFile: backupPath
      };

    } catch (error) {
      logger.error('Failed to update .env file:', error.message);
      throw new Error(`Failed to update .env file: ${error.message}`);
    }
  }

  /**
   * Update Instagram credentials specifically
   */
  async updateInstagramCredentials(username, password) {
    const updates = {
      INSTAGRAM_USERNAME: username,
      INSTAGRAM_PASSWORD: password
    };

    return await this.updateEnvVariables(updates);
  }

  /**
   * Validate .env file structure
   */
  async validateEnvFile() {
    try {
      const content = await this.readEnvFile();
      const envVars = this.parseEnvContent(content);
      
      // Check for required variables
      const requiredVars = ['NODE_ENV', 'PORT', 'DATABASE_URL', 'JWT_SECRET'];
      const missingVars = requiredVars.filter(key => !envVars[key]);
      
      if (missingVars.length > 0) {
        logger.warn('Missing required environment variables:', missingVars);
      }

      return {
        isValid: missingVars.length === 0,
        missingVariables: missingVars,
        totalVariables: Object.keys(envVars).length
      };

    } catch (error) {
      logger.error('Failed to validate .env file:', error.message);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Get current Instagram credentials from .env
   */
  async getCurrentInstagramCredentials() {
    try {
      const content = await this.readEnvFile();
      const envVars = this.parseEnvContent(content);
      
      return {
        username: envVars.INSTAGRAM_USERNAME || '',
        password: envVars.INSTAGRAM_PASSWORD || '',
        hasCredentials: Boolean(envVars.INSTAGRAM_USERNAME && envVars.INSTAGRAM_PASSWORD)
      };

    } catch (error) {
      logger.error('Failed to get Instagram credentials:', error.message);
      return {
        username: '',
        password: '',
        hasCredentials: false,
        error: error.message
      };
    }
  }
}

module.exports = new EnvUtils();
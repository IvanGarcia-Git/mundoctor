import twilio from 'twilio';
import logger from '../utils/logger.js';

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER;
    this.initialize();
  }

  initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      logger.warn('Twilio credentials not configured. SMS service disabled.');
      return;
    }

    if (!this.fromNumber) {
      logger.warn('Twilio from number not configured. SMS service disabled.');
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      logger.info('SMS service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SMS service:', error);
    }
  }

  async sendSMS({ to, message }) {
    try {
      if (!this.client) {
        logger.warn('SMS service not configured. Skipping SMS send.');
        return { success: false, error: 'SMS service not configured' };
      }

      if (!to) {
        throw new Error('Recipient phone number is required');
      }

      if (!message) {
        throw new Error('Message content is required');
      }

      // Normalize phone number (add country code if not present)
      const phoneNumber = this.normalizePhoneNumber(to);

      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber
      });

      logger.info(`SMS sent successfully to ${phoneNumber}:`, result.sid);
      return { 
        success: true, 
        messageId: result.sid,
        status: result.status,
        to: phoneNumber
      };

    } catch (error) {
      logger.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkSMS({ recipients, message }) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS({
          to: recipient.phone,
          message: this.replaceVariables(message, recipient.variables || {})
        });
        results.push({ phone: recipient.phone, ...result });
      } catch (error) {
        logger.error(`Failed to send SMS to ${recipient.phone}:`, error);
        results.push({ phone: recipient.phone, success: false, error: error.message });
      }
    }

    return results;
  }

  normalizePhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it starts with a country code, keep it
    if (normalized.startsWith('+')) {
      return normalized;
    }
    
    // If it's a Mexican number starting with 52, keep it
    if (normalized.startsWith('52') && normalized.length === 12) {
      return `+${normalized}`;
    }
    
    // If it's a 10-digit number, assume it's Mexican
    if (normalized.length === 10) {
      return `+52${normalized}`;
    }
    
    // If it's a 11-digit number starting with 1, assume it's US/Canada
    if (normalized.startsWith('1') && normalized.length === 11) {
      return `+${normalized}`;
    }
    
    // Default to Mexico country code
    return `+52${normalized}`;
  }

  replaceVariables(message, variables) {
    if (!message || !variables) return message;
    
    return message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  // Validate phone number format
  isValidPhoneNumber(phoneNumber) {
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
    return phoneRegex.test(phoneNumber.replace(/[^\d+]/g, ''));
  }

  // Get SMS delivery status
  async getMessageStatus(messageId) {
    try {
      if (!this.client) {
        return { success: false, error: 'SMS service not configured' };
      }

      const message = await this.client.messages(messageId).fetch();
      
      return {
        success: true,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated
      };

    } catch (error) {
      logger.error('Failed to get message status:', error);
      return { success: false, error: error.message };
    }
  }

  // Test SMS configuration
  async testConnection() {
    try {
      if (!this.client) {
        return { success: false, error: 'SMS service not configured' };
      }

      // Test by fetching account info
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      logger.info('SMS service connection test passed');
      return { 
        success: true, 
        account: {
          sid: account.sid,
          friendlyName: account.friendlyName,
          status: account.status
        }
      };

    } catch (error) {
      logger.error('SMS service connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get account balance (if available)
  async getAccountBalance() {
    try {
      if (!this.client) {
        return { success: false, error: 'SMS service not configured' };
      }

      const balance = await this.client.balance.fetch();
      
      return {
        success: true,
        balance: balance.balance,
        currency: balance.currency
      };

    } catch (error) {
      logger.error('Failed to get account balance:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const smsService = new SMSService();

// Export functions for easy use
export const sendSMS = smsService.sendSMS.bind(smsService);
export const sendBulkSMS = smsService.sendBulkSMS.bind(smsService);
export const testSMSConnection = smsService.testConnection.bind(smsService);
export const getMessageStatus = smsService.getMessageStatus.bind(smsService);
export const isValidPhoneNumber = smsService.isValidPhoneNumber.bind(smsService);

export default smsService;
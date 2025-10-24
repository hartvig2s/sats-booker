require('dotenv').config();
const EmailListener = require('./src/email-listener');
const Logger = require('./src/logger');

async function testEmailBooking() {
  Logger.info('🧪 Testing email booking (one-time check)...');
  
  // Check configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    Logger.error('❌ Email configuration missing!');
    Logger.info('Please set EMAIL_USER and EMAIL_PASS in your .env file');
    return;
  }

  Logger.info(`📧 Checking inbox: ${process.env.EMAIL_USER}`);
  Logger.info('Looking for unread emails with BOOK or SATS in subject...');
  
  const emailListener = new EmailListener();
  
  // Override the continuous monitoring with a one-time check
  emailListener.openInbox = function() {
    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        Logger.error(`Failed to open inbox: ${err.message}`);
        process.exit(1);
        return;
      }

      Logger.info('📬 Inbox opened, checking for booking emails...');
      
      // Check for existing unread emails
      this.checkForBookingEmails();
      
      // Close after 5 seconds
      setTimeout(() => {
        Logger.info('✅ Email check completed');
        this.imap.end();
        process.exit(0);
      }, 5000);
    });
  };
  
  // Start the check
  emailListener.start();
  
  // Safety timeout
  setTimeout(() => {
    Logger.info('⏰ Test timeout reached');
    process.exit(0);
  }, 15000);
}

testEmailBooking().catch(error => {
  Logger.error(`Test failed: ${error.message}`);
  process.exit(1);
});
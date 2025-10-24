require('dotenv').config();
const EmailListener = require('./src/email-listener');
const Logger = require('./src/logger');

async function startEmailBookingService() {
  Logger.info('🚀 Starting SATS Email Booking Service...');
  Logger.info('📧 Send emails with subject like: "BOOK Pilates 16:00" or "SATS Yoga 18:00 Oslo City"');
  Logger.info('');
  
  // Check configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    Logger.error('❌ Email configuration missing!');
    Logger.info('Please set EMAIL_USER and EMAIL_PASS in your .env file');
    process.exit(1);
  }

  if (!process.env.SATS_EMAIL || !process.env.SATS_PASSWORD) {
    Logger.error('❌ SATS credentials missing!');
    Logger.info('Please set SATS_EMAIL and SATS_PASSWORD in your .env file');
    process.exit(1);
  }

  Logger.info('Configuration:');
  Logger.info(`📧 Monitoring email: ${process.env.EMAIL_USER}`);
  Logger.info(`🏋️ SATS account: ${process.env.SATS_EMAIL}`);
  Logger.info('');

  const emailListener = new EmailListener();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    Logger.info('');
    Logger.info('🛑 Shutting down email booking service...');
    emailListener.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    Logger.info('🛑 Shutting down email booking service...');
    emailListener.stop();
    process.exit(0);
  });

  // Start the service
  emailListener.start();
  
  Logger.info('✅ Email booking service is running!');
  Logger.info('💡 Send an email to trigger bookings:');
  Logger.info('   Subject: "BOOK Pilates 16:00"');
  Logger.info('   Subject: "SATS Yoga 18:00 Oslo City"');
  Logger.info('   Subject: "CrossFit 19:00"');
  Logger.info('');
  Logger.info('Press Ctrl+C to stop the service');
}

startEmailBookingService().catch(error => {
  Logger.error(`Failed to start email booking service: ${error.message}`);
  process.exit(1);
});
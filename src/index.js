const BookingScheduler = require('./scheduler');
const Logger = require('./logger');
const config = require('./config');

async function main() {
  Logger.info('🏋️  SATS Class Booker Starting...');
  
  // Validate configuration
  if (!config.sats.email || !config.sats.password) {
    Logger.error('Missing SATS credentials. Please check your .env file.');
    process.exit(1);
  }

  const scheduler = new BookingScheduler();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--now')) {
    // Run immediately for testing
    await scheduler.triggerNow();
    process.exit(0);
  } else {
    // Start scheduled booking
    scheduler.start();
    
    Logger.info('SATS Class Booker is running...');
    Logger.info('Press Ctrl+C to stop');
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      Logger.info('Shutting down...');
      scheduler.stop();
      process.exit(0);
    });
  }
}

main().catch(error => {
  Logger.error(`Application error: ${error.message}`);
  process.exit(1);
});
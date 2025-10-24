const cron = require('node-cron');
const SatsBooker = require('./sats-booker');
const Logger = require('./logger');
const config = require('./config');

class BookingScheduler {
  constructor() {
    this.task = null;
  }

  start() {
    Logger.info(`Starting booking scheduler with pattern: ${config.schedule.cronPattern}`);
    
    this.task = cron.schedule(config.schedule.cronPattern, async () => {
      Logger.info('Scheduled booking task triggered');
      const booker = new SatsBooker();
      await booker.runBookingProcess();
    }, {
      scheduled: false,
      timezone: "Europe/Oslo"
    });

    this.task.start();
    Logger.success('Booking scheduler started successfully');
  }

  stop() {
    if (this.task) {
      this.task.stop();
      Logger.info('Booking scheduler stopped');
    }
  }

  // Manual trigger for testing
  async triggerNow() {
    Logger.info('Manually triggering booking process...');
    const booker = new SatsBooker();
    await booker.runBookingProcess();
  }
}

module.exports = BookingScheduler;
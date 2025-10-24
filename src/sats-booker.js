const puppeteer = require('puppeteer');
const Logger = require('./logger');
const config = require('./config');

class SatsBooker {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    Logger.info('Initializing SATS booker...');
    
    const browserOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    };

    // Use system Chromium on Railway/Nixpacks
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      browserOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    this.browser = await puppeteer.launch(browserOptions);
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async login() {
    try {
      Logger.info('Logging into SATS...');
      await this.page.goto(`${config.sats.baseUrl}/login`);
      
      // Wait for login form and fill credentials
      await this.page.waitForSelector('input[type="email"]');
      await this.page.type('input[type="email"]', config.sats.email);
      await this.page.type('input[type="password"]', config.sats.password);
      
      // Submit login form
      await this.page.click('button[type="submit"]');
      await this.page.waitForNavigation();
      
      Logger.success('Successfully logged into SATS');
      return true;
    } catch (error) {
      Logger.error(`Login failed: ${error.message}`);
      return false;
    }
  }  asy
nc findAvailableClasses() {
    try {
      Logger.info('Searching for available classes...');
      
      // Calculate target date (7 days from now)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + config.booking.daysInAdvance);
      
      // Navigate to class booking page
      await this.page.goto(`${config.sats.baseUrl}/trening/gruppetimer`);
      await this.page.waitForSelector('.class-schedule');
      
      // Filter classes by date, preferences, and availability
      const availableClasses = await this.page.evaluate((targetDate, preferences) => {
        const classes = [];
        const classElements = document.querySelectorAll('.class-item');
        
        classElements.forEach(element => {
          const classDate = element.querySelector('.class-date')?.textContent;
          const className = element.querySelector('.class-name')?.textContent;
          const classTime = element.querySelector('.class-time')?.textContent;
          const location = element.querySelector('.class-location')?.textContent;
          const isAvailable = !element.classList.contains('fully-booked');
          
          if (isAvailable && this.matchesPreferences(className, classTime, location, preferences)) {
            classes.push({
              name: className,
              time: classTime,
              location: location,
              date: classDate,
              element: element
            });
          }
        });
        
        return classes;
      }, targetDate.toISOString().split('T')[0], config.booking);
      
      Logger.info(`Found ${availableClasses.length} matching classes`);
      return availableClasses;
    } catch (error) {
      Logger.error(`Error finding classes: ${error.message}`);
      return [];
    }
  }  async 
bookClass(classInfo) {
    try {
      Logger.info(`Attempting to book: ${classInfo.name} at ${classInfo.time}`);
      
      // Click on the class to open booking modal
      await this.page.click(`[data-class-id="${classInfo.id}"]`);
      await this.page.waitForSelector('.booking-modal');
      
      // Confirm booking
      await this.page.click('.confirm-booking-btn');
      await this.page.waitForSelector('.booking-success', { timeout: 5000 });
      
      Logger.success(`Successfully booked: ${classInfo.name} at ${classInfo.time}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to book class: ${error.message}`);
      return false;
    }
  }

  async runBookingProcess() {
    try {
      await this.initialize();
      
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Login failed');
      }
      
      const availableClasses = await this.findAvailableClasses();
      
      if (availableClasses.length === 0) {
        Logger.warning('No matching classes found for booking');
        return;
      }
      
      // Book the first available class that matches preferences
      const classToBook = availableClasses[0];
      await this.bookClass(classToBook);
      
    } catch (error) {
      Logger.error(`Booking process failed: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      Logger.info('Browser closed');
    }
  }
}

module.exports = SatsBooker;
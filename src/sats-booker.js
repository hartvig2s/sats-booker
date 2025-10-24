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
      headless: config.development.headless ? 'new' : false,
      slowMo: config.development.slowMo,
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

    // Local development: show browser window
    if (config.development.isLocal) {
      Logger.info('Running in local development mode - browser window will be visible');
      browserOptions.devtools = true;
    }

    this.browser = await puppeteer.launch(browserOptions);
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async login() {
    try {
      Logger.info('Logging into SATS...');
      await this.page.goto(`${config.sats.baseUrl}/login`, { 
        waitUntil: 'networkidle2' 
      });
      
      // Take screenshot for debugging (local only)
      if (config.development.isLocal) {
        await this.page.screenshot({ path: 'debug-login-page.png' });
        Logger.info('Login page screenshot saved as debug-login-page.png');
      }
      
      // Wait for login form and fill credentials
      await this.page.waitForSelector('input[type="email"], input[name="email"], #email');
      await this.page.type('input[type="email"], input[name="email"], #email', config.sats.email);
      await this.page.type('input[type="password"], input[name="password"], #password', config.sats.password);
      
      // Submit login form
      await this.page.click('button[type="submit"], input[type="submit"], .login-button');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      Logger.success('Successfully logged into SATS');
      return true;
    } catch (error) {
      Logger.error(`Login failed: ${error.message}`);
      return false;
    }
  }  async
 findAvailableClasses() {
    try {
      Logger.info('Searching for available classes...');
      
      // Calculate target date (7 days from now)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + config.booking.daysInAdvance);
      const targetDateStr = targetDate.toLocaleDateString('no-NO');
      
      Logger.info(`Looking for classes on: ${targetDateStr} (7 days from now)`);
      Logger.info(`Current time: ${new Date().toLocaleString('no-NO')}`);
      Logger.info(`Classes should be released at: ${config.booking.bookingTime} today for ${targetDateStr}`);
      
      // Navigate to class booking page
      await this.page.goto(`${config.sats.baseUrl}/trening/gruppetimer`, { 
        waitUntil: 'networkidle2' 
      });
      
      // Wait for page to load
      await this.page.waitForTimeout(3000);
      
      // Take screenshot for debugging (local only)
      if (config.development.isLocal) {
        await this.page.screenshot({ path: 'debug-classes-page.png', fullPage: true });
        Logger.info('Classes page screenshot saved as debug-classes-page.png');
      }
      
      // Try to find and click date picker or navigate to target date
      try {
        // Look for date navigation or calendar
        const dateSelector = await this.page.$('.date-picker, .calendar, [data-testid="date-picker"]');
        if (dateSelector) {
          Logger.info('Found date picker, navigating to target date...');
          // Implementation depends on SATS.no's actual UI structure
        }
      } catch (e) {
        Logger.warning('Could not find date picker, using current view');
      }
      
      // Extract available classes
      const availableClasses = await this.page.evaluate((targetDateStr, preferences) => {
        const classes = [];
        
        // Try multiple selectors that SATS might use
        const possibleSelectors = [
          '.class-item',
          '.group-class',
          '.workout-class',
          '[data-testid="class"]',
          '.schedule-item',
          '.class-card',
          '.booking-item'
        ];
        
        let classElements = [];
        for (const selector of possibleSelectors) {
          classElements = document.querySelectorAll(selector);
          if (classElements.length > 0) {
            console.log(`Found ${classElements.length} elements with selector: ${selector}`);
            break;
          }
        }
        
        console.log(`Total class elements found: ${classElements.length}`);
        
        classElements.forEach((element, index) => {
          try {
            // Try different ways to extract class information
            const className = element.querySelector('.class-name, .workout-name, h3, .title, .name')?.textContent?.trim();
            const classTime = element.querySelector('.class-time, .time, .start-time')?.textContent?.trim();
            const location = element.querySelector('.class-location, .location, .gym, .center')?.textContent?.trim();
            const classDate = element.querySelector('.class-date, .date')?.textContent?.trim();
            
            // Check if class is available (not fully booked)
            const isFullyBooked = element.classList.contains('fully-booked') || 
                                element.classList.contains('sold-out') ||
                                element.querySelector('.fully-booked, .sold-out');
            
            console.log(`Class ${index}: ${className} at ${classTime} (${location}) - Booked: ${isFullyBooked}`);
            
            if (className && classTime && !isFullyBooked) {
              // Check if matches preferences
              const matchesClass = preferences.preferredClasses.length === 0 || 
                                 preferences.preferredClasses.some(pref => 
                                   className.toLowerCase().includes(pref.toLowerCase()));
              
              const matchesTime = preferences.preferredTimes.length === 0 || 
                                preferences.preferredTimes.some(pref => 
                                  classTime.includes(pref));
              
              const matchesLocation = preferences.preferredLocations.length === 0 || 
                                    preferences.preferredLocations.some(pref => 
                                      location?.toLowerCase().includes(pref.toLowerCase()));
              
              if (matchesClass && matchesTime && matchesLocation) {
                classes.push({
                  name: className,
                  time: classTime,
                  location: location || 'Unknown location',
                  date: classDate || targetDateStr,
                  index: index,
                  element: element.outerHTML.substring(0, 200) // For debugging
                });
              }
            }
          } catch (e) {
            console.log(`Error processing class element ${index}:`, e);
          }
        });
        
        return classes;
      }, targetDateStr, config.booking);
      
      Logger.info(`Found ${availableClasses.length} matching classes`);
      
      if (config.development.isLocal && availableClasses.length > 0) {
        Logger.info('Available classes:');
        availableClasses.forEach((cls, i) => {
          Logger.info(`  ${i + 1}. ${cls.name} at ${cls.time} (${cls.location})`);
        });
      }
      
      return availableClasses;
    } catch (error) {
      Logger.error(`Error finding classes: ${error.message}`);
      return [];
    }
  }  as
ync bookClass(classInfo) {
    try {
      Logger.info(`Attempting to book: ${classInfo.name} at ${classInfo.time}`);
      
      if (config.development.isLocal) {
        Logger.warning('LOCAL MODE: Would book class but not actually clicking (set NODE_ENV=production to enable real booking)');
        return true;
      }
      
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
      if (!config.development.isLocal) {
        await this.cleanup();
      } else {
        Logger.info('LOCAL MODE: Keeping browser open for inspection');
        // Keep browser open for 30 seconds in local mode
        setTimeout(async () => {
          await this.cleanup();
        }, 30000);
      }
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
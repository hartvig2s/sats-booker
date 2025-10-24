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
  }  async nav
igateToBookingPage() {
    try {
      Logger.info('Navigating to group training booking page...');
      
      // Go directly to the booking page URL from the screenshot
      await this.page.goto(`${config.sats.baseUrl}/book?club-search=&clubIds=212&class-search=&groupExerciseTypeIds=242&groupExerciseTypeIds=242&instructor-search=`, { 
        waitUntil: 'networkidle2' 
      });
      
      // Wait for the page to load
      await this.page.waitForTimeout(3000);
      
      // Take screenshot for debugging
      if (config.development.isLocal) {
        await this.page.screenshot({ path: 'debug-booking-page.png', fullPage: true });
        Logger.info('Booking page screenshot saved as debug-booking-page.png');
      }
      
      return true;
    } catch (error) {
      Logger.error(`Failed to navigate to booking page: ${error.message}`);
      return false;
    }
  }

  async navigateToTargetDate() {
    try {
      // Calculate target date (7 days from now)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + config.booking.daysInAdvance);
      const targetDay = targetDate.getDate();
      
      Logger.info(`Looking for classes on day ${targetDay} (7 days from now)`);
      
      // Find and click the target date in the calendar
      const dateButton = await this.page.$(`button:has-text("${targetDay}")`);
      if (dateButton) {
        Logger.info(`Clicking on date ${targetDay}`);
        await dateButton.click();
        await this.page.waitForTimeout(2000);
        return true;
      } else {
        // Try alternative selector for date buttons
        const dateButtons = await this.page.$$('button');
        for (const button of dateButtons) {
          const text = await button.textContent();
          if (text && text.trim() === targetDay.toString()) {
            Logger.info(`Found and clicking date button: ${targetDay}`);
            await button.click();
            await this.page.waitForTimeout(2000);
            return true;
          }
        }
      }
      
      Logger.warning(`Could not find date ${targetDay} in calendar`);
      return false;
    } catch (error) {
      Logger.error(`Error navigating to target date: ${error.message}`);
      return false;
    }
  }

  async findAvailableClasses() {
    try {
      Logger.info('Searching for available classes...');
      
      // Navigate to booking page
      const navSuccess = await this.navigateToBookingPage();
      if (!navSuccess) {
        throw new Error('Failed to navigate to booking page');
      }
      
      // Try to navigate to target date
      await this.navigateToTargetDate();
      
      // Extract available classes based on the actual SATS.no structure
      const availableClasses = await this.page.evaluate((preferences) => {
        const classes = [];
        
        // Look for class rows in the schedule
        // Based on the screenshot, classes appear to be in rows with time, name, and location
        const classRows = document.querySelectorAll('div[class*="row"], tr, .class-item');
        
        console.log(`Found ${classRows.length} potential class rows`);
        
        classRows.forEach((row, index) => {
          try {
            // Extract time (looks like "11:00", "16:00" etc.)
            const timeElement = row.querySelector('*:contains(":")') || 
                              Array.from(row.querySelectorAll('*')).find(el => 
                                /^\d{1,2}:\d{2}$/.test(el.textContent?.trim()));
            const classTime = timeElement?.textContent?.trim();
            
            // Extract class name (like "Cycling Interval")
            const nameElements = row.querySelectorAll('*');
            let className = '';
            for (const el of nameElements) {
              const text = el.textContent?.trim();
              if (text && text.length > 3 && !text.includes(':') && !text.includes('min')) {
                className = text;
                break;
              }
            }
            
            // Extract location (like "Colosseum")
            const locationElement = row.querySelector('select, .location') || 
                                  Array.from(row.querySelectorAll('*')).find(el => 
                                    el.textContent?.includes('Colosseum') || 
                                    el.textContent?.includes('Oslo'));
            const location = locationElement?.textContent?.trim() || 'Unknown';
            
            // Check for "Book" button - indicates class is available
            const bookButton = row.querySelector('button:contains("Book"), .book-button, button[class*="book"]') ||
                             Array.from(row.querySelectorAll('button')).find(btn => 
                               btn.textContent?.toLowerCase().includes('book'));
            
            console.log(`Row ${index}: Time=${classTime}, Name=${className}, Location=${location}, HasBookButton=${!!bookButton}`);
            
            if (classTime && className && bookButton) {
              // Check if matches preferences
              const matchesClass = preferences.preferredClasses.length === 0 || 
                                 preferences.preferredClasses.some(pref => 
                                   className.toLowerCase().includes(pref.toLowerCase()));
              
              const matchesTime = preferences.preferredTimes.length === 0 || 
                                preferences.preferredTimes.some(pref => 
                                  classTime.includes(pref));
              
              const matchesLocation = preferences.preferredLocations.length === 0 || 
                                    preferences.preferredLocations.some(pref => 
                                      location.toLowerCase().includes(pref.toLowerCase()));
              
              if (matchesClass && matchesTime && matchesLocation) {
                classes.push({
                  name: className,
                  time: classTime,
                  location: location,
                  bookButton: bookButton,
                  index: index
                });
              }
            }
          } catch (e) {
            console.log(`Error processing row ${index}:`, e);
          }
        });
        
        return classes;
      }, config.booking);
      
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
  }  a
sync bookClass(classInfo) {
    try {
      Logger.info(`Attempting to book: ${classInfo.name} at ${classInfo.time}`);
      
      if (config.development.isLocal && process.env.NODE_ENV !== 'production') {
        Logger.warning('LOCAL MODE: Would book class but not actually clicking (set NODE_ENV=production to enable real booking)');
        Logger.info(`Would click the "Book" button for: ${classInfo.name} at ${classInfo.time}`);
        return true;
      }
      
      // Click the book button for this specific class
      await this.page.evaluate((index) => {
        const classRows = document.querySelectorAll('div[class*="row"], tr, .class-item');
        const targetRow = classRows[index];
        if (targetRow) {
          const bookButton = targetRow.querySelector('button:contains("Book"), .book-button, button[class*="book"]') ||
                           Array.from(targetRow.querySelectorAll('button')).find(btn => 
                             btn.textContent?.toLowerCase().includes('book'));
          if (bookButton) {
            bookButton.click();
            return true;
          }
        }
        return false;
      }, classInfo.index);
      
      // Wait for booking confirmation or modal
      await this.page.waitForTimeout(2000);
      
      // Look for confirmation modal or success message
      try {
        await this.page.waitForSelector('.booking-success, .success, .confirmation', { timeout: 5000 });
        Logger.success(`Successfully booked: ${classInfo.name} at ${classInfo.time}`);
        return true;
      } catch (e) {
        // Check if there's a confirmation button to click
        const confirmButton = await this.page.$('button:contains("Confirm"), button:contains("Bekreft"), .confirm-button');
        if (confirmButton) {
          await confirmButton.click();
          await this.page.waitForTimeout(2000);
          Logger.success(`Successfully booked: ${classInfo.name} at ${classInfo.time}`);
          return true;
        }
      }
      
      Logger.warning('Booking may have succeeded but no clear confirmation found');
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
      if (!config.development.isLocal || process.env.NODE_ENV === 'production') {
        await this.cleanup();
      } else {
        Logger.info('LOCAL MODE: Keeping browser open for inspection (30 seconds)');
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
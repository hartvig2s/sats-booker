const puppeteer = require('puppeteer');
const Logger = require('./logger');
const config = require('./config');
const EmailService = require('./email-service');

class SatsBooker {
  constructor(customPreferences = null) {
    this.browser = null;
    this.page = null;
    this.emailService = new EmailService();
    this.customPreferences = customPreferences;
  }

  // Helper function to replace deprecated waitForTimeout
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get effective preferences (custom or from config)
  getPreferences() {
    if (this.customPreferences) {
      return {
        preferredClasses: [this.customPreferences.class],
        preferredTimes: [this.customPreferences.time],
        preferredLocations: [this.customPreferences.location]
      };
    }
    return {
      preferredClasses: config.booking.preferredClasses,
      preferredTimes: config.booking.preferredTimes,
      preferredLocations: config.booking.preferredLocations
    };
  }

  async initialize() {
    Logger.info('Initializing SATS booker...');

    const browserOptions = {
      headless: config.development.headless ? 'new' : false,
      slowMo: config.development.slowMo || 0,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      timeout: 30000
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      browserOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.platform === 'darwin') {
      browserOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    if (config.development.isLocal) {
      Logger.info('Running in local development mode - browser window will be visible');
      browserOptions.devtools = false;
    }

    try {
      this.browser = await puppeteer.launch(browserOptions);
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 720 });
      Logger.success('Browser initialized successfully');
    } catch (error) {
      Logger.error(`Failed to initialize browser: ${error.message}`);
      throw error;
    }
  }

  async login() {
    try {
      Logger.info('Logging into SATS...');

      await this.page.goto(`${config.sats.baseUrl}/min-side`, {
        waitUntil: 'networkidle2'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      if (config.development.isLocal) {
        await this.page.screenshot({ path: 'debug-login-page.png' });
        Logger.info('Login page screenshot saved as debug-login-page.png');
      }

      await this.page.waitForSelector('input[type="email"], input[name="email"], input[name="username"], #email, #username', { timeout: 10000 });

      const emailField = await this.page.$('input[type="email"], input[name="email"], input[name="username"], #email, #username');
      if (emailField) {
        await emailField.type(config.sats.email, { delay: 0 });
        Logger.info('Email entered');
      }

      const passwordField = await this.page.$('input[type="password"], input[name="password"], #password');
      if (passwordField) {
        await passwordField.type(config.sats.password, { delay: 0 });
        Logger.info('Password entered');
      }

      let submitButton = await this.page.$('button[type="submit"]');
      if (!submitButton) {
        submitButton = await this.page.$('input[type="submit"]');
      }
      if (!submitButton) {
        submitButton = await this.page.$('.login-button');
      }
      if (!submitButton) {
        const buttons = await this.page.$$('button');
        for (const button of buttons) {
          const text = await this.page.evaluate(el => el.textContent, button);
          if (text && (text.toLowerCase().includes('logg inn') || text.toLowerCase().includes('login') || text.toLowerCase().includes('sign in'))) {
            submitButton = button;
            break;
          }
        }
      }

      if (submitButton) {
        await submitButton.click();
        Logger.info('Login form submitted');
      } else {
        Logger.warning('Could not find login submit button');
      }

      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

      const currentUrl = this.page.url();
      if (currentUrl.includes('min-side') || currentUrl.includes('sats.no')) {
        Logger.success('Successfully logged into SATS');
        return true;
      } else {
        Logger.error('Login may have failed - unexpected URL: ' + currentUrl);
        return false;
      }

    } catch (error) {
      Logger.error(`Login failed: ${error.message}`);
      if (config.development.isLocal) {
        await this.page.screenshot({ path: 'debug-login-error.png' });
        Logger.info('Error screenshot saved as debug-login-error.png');
      }
      return false;
    }
  }

  async navigateToBookingPage() {
    try {
      Logger.info('Navigating to SATS booking page...');

      const bookingUrl = `${config.sats.baseUrl}/booke`;
      await this.page.goto(bookingUrl, {
        waitUntil: 'networkidle2'
      });

      await this.wait(1000);

      await this.handleCookiePopup();
      await this.selectCenter();
      await this.selectClassType();

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

  async handleCookiePopup() {
    try {
      Logger.info('Checking for cookie popup...');
      await this.wait(500);

      const buttons = await this.page.$$('button');
      let foundCookieButton = false;

      for (const button of buttons) {
        const text = await this.page.evaluate(el => el.textContent, button);
        if (text && text.includes('Godta alle')) {
          Logger.info('Found and clicking "Godta alle" cookie button');
          await button.click();
          await this.wait(500);
          foundCookieButton = true;
          break;
        }
      }

      if (!foundCookieButton) {
        Logger.info('No cookie popup found or already handled');
      }

    } catch (error) {
      Logger.warning(`Cookie popup handling failed: ${error.message}`);
    }
  }

  async selectCenter() {
    try {
      Logger.info('Selecting center (location)...');

      const buttons = await this.page.$$('button');
      let senterClicked = false;

      for (const button of buttons) {
        const text = await this.page.evaluate(el => el.textContent, button);
        if (text && text.includes('Senter')) {
          await button.click();
          Logger.info('Clicked Senter button');
          senterClicked = true;
          break;
        }
      }

      if (!senterClicked) {
        Logger.warning('Could not find Senter button');
        return;
      }

      await this.wait(1000);

      const preferences = this.getPreferences();
      const preferredLocation = preferences.preferredLocations[0];
      Logger.info(`Typing location in search field: ${preferredLocation}`);

      const searchField = await this.page.$('input[placeholder*="Søk etter senter"]') ||
        await this.page.$('input[placeholder*="søk"]') ||
        await this.page.$('input[type="text"]');

      if (searchField) {
        await searchField.click();
        await searchField.type(preferredLocation, { delay: 0 });
        Logger.info(`Typed "${preferredLocation}" in search field`);
        await this.wait(1500);

        Logger.info('Using keyboard navigation: Tab → Tab → Space → Enter');
        await searchField.press('Tab'); // First tab from search field
        await this.wait(500);
        await this.page.keyboard.press('Tab'); // Second tab on page
        await this.wait(500);
        await this.page.keyboard.press('Space'); // Space to check checkbox
        await this.wait(500);
        await this.page.keyboard.press('Enter'); // Enter to confirm

        Logger.info('Completed keyboard navigation for location selection');
        await this.wait(4000);
      }

      const applyButtons = await this.page.$$('button');
      for (const button of applyButtons) {
        const text = await this.page.evaluate(el => el.textContent, button);
        if (text && text.includes('Vis søkeresultat')) {
          await button.click();
          Logger.info('Applied location selection');
          await this.wait(1000);
          break;
        }
      }

    } catch (error) {
      Logger.warning(`Center selection failed: ${error.message}`);
    }
  }

  async selectClassType() {
    try {
      Logger.info('Selecting class type (gruppetime)...');

      const buttons = await this.page.$$('button');
      let gruppeClicked = false;

      for (const button of buttons) {
        const text = await this.page.evaluate(el => el.textContent, button);
        if (text && text.includes('Gruppetime')) {
          await button.click();
          Logger.info('Clicked Gruppetime button');
          gruppeClicked = true;
          break;
        }
      }

      if (!gruppeClicked) {
        Logger.warning('Could not find Gruppetime button');
        return;
      }

      await this.wait(1000);

      const preferences = this.getPreferences();
      const preferredClass = preferences.preferredClasses[0];
      const classKeyword = preferredClass.split(' ')[0];
      Logger.info(`Typing class type in search field: ${classKeyword}`);

      const searchField = await this.page.$('input[placeholder*="Søk etter gruppetimer"]') ||
        await this.page.$('input[placeholder*="gruppetimer"]') ||
        await this.page.$('input[type="text"]');

      if (searchField) {
        await searchField.click();
        await searchField.type(classKeyword, { delay: 0 });
        Logger.info(`Typed "${classKeyword}" in search field`);
        await this.wait(1500);

        Logger.info('Using keyboard navigation for class type: Tab → Tab → Space → Enter');
        await searchField.press('Tab'); // First tab from search field
        await this.wait(500);
        await this.page.keyboard.press('Tab'); // Second tab on page
        await this.wait(500);
        await this.page.keyboard.press('Space'); // Space to check checkbox
        await this.wait(500);
        await this.page.keyboard.press('Enter'); // Enter to confirm

        Logger.info('Completed keyboard navigation for class type selection');
        await this.wait(1000);
      }

      const applyButtons = await this.page.$$('button');
      for (const button of applyButtons) {
        const text = await this.page.evaluate(el => el.textContent, button);
        if (text && text.includes('Vis søkeresultat')) {
          await button.click();
          Logger.info('Applied class type selection');
          await this.wait(6000);
          break;
        }
      }

    } catch (error) {
      Logger.warning(`Class type selection failed: ${error.message}`);
    }
  }

  async navigateToTargetDate() {
    try {
      Logger.info('Looking for target date...');

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + config.booking.daysInAdvance);
      const targetDay = targetDate.getDate();
      Logger.info(`Target day: ${targetDay} (7 days from now: ${targetDate.toLocaleDateString('no-NO')})`);

      const dateButtons = await this.page.$$('button');
      let foundDate = false;

      // Debug: log all date buttons found
      Logger.info('Available date buttons:');
      for (let i = 0; i < Math.min(dateButtons.length, 20); i++) {
        const text = await this.page.evaluate(el => el.textContent?.trim(), dateButtons[i]);
        if (text && /\d/.test(text)) { // Only log buttons with numbers
          Logger.info(`  Button ${i}: "${text}"`);
        }
      }

      for (const button of dateButtons) {
        const text = await this.page.evaluate(el => el.textContent?.trim(), button);
        // Match exact day number or day number at end of text (like "Tor31")
        if (text && (text === targetDay.toString() || text.endsWith(targetDay.toString()))) {
          Logger.info(`🎯 Found and clicking date button: "${text}"`);
          await button.click();
          await this.wait(1000);
          foundDate = true;
          break;
        }
      }

      if (!foundDate) {
        Logger.warning(`Could not find date ${targetDay} in calendar, using current view`);
      }

      if (config.development.isLocal) {
        await this.page.screenshot({ path: 'debug-after-date-click.png', fullPage: true });
        Logger.info('Screenshot after date selection saved');
      }

      return foundDate;
    } catch (error) {
      Logger.error(`Error navigating to target date: ${error.message}`);
      return false;
    }
  }

  async findAndBookClasses() {
    try {
      Logger.info('🚀 IMMEDIATE BOOKING - Searching for classes...');

      if (config.development.isLocal) {
        await this.page.screenshot({ path: 'debug-booking-moment.png', fullPage: true });
        Logger.info('Booking moment screenshot saved');
      }

      const preferences = this.getPreferences();
      const bookingResults = await this.page.evaluate((preferredClasses, preferredTimes, preferredLocations) => {
        const results = [];
        console.log(`Looking for classes: ${preferredClasses.join(', ')} at times: ${preferredTimes.join(', ')} in locations: ${preferredLocations.join(', ')}`);

        const allElements = document.querySelectorAll('*');
        let foundClass = false;

        // Helper function to check if text matches any of the preferred criteria
        const matchesPreferences = (text) => {
          const hasTime = preferredTimes.some(time => text.includes(time));
          const hasClass = preferredClasses.length === 0 || preferredClasses.some(className => 
            text.toLowerCase().includes(className.toLowerCase())
          );
          const hasLocation = preferredLocations.length === 0 || preferredLocations.some(location => 
            text.toLowerCase().includes(location.toLowerCase())
          );
          
          return hasTime && hasClass && hasLocation;
        };

        for (const element of allElements) {
          const text = element.textContent || '';

          if (matchesPreferences(text)) {
            console.log(`🎯 FOUND matching class: ${text.substring(0, 100)}...`);

            let container = element;
            let bookButton = null;

            while (container && !bookButton) {
              bookButton = container.querySelector('button');
              if (bookButton && bookButton.textContent?.includes('Book')) {
                break;
              }
              bookButton = null;
              container = container.parentElement;
            }

            if (!bookButton) {
              let sibling = element.nextElementSibling;
              while (sibling && !bookButton) {
                if (sibling.tagName === 'BUTTON' && sibling.textContent?.includes('Book')) {
                  bookButton = sibling;
                  break;
                }
                bookButton = sibling.querySelector('button');
                if (bookButton && bookButton.textContent?.includes('Book')) {
                  break;
                }
                bookButton = null;
                sibling = sibling.nextElementSibling;
              }
            }

            if (bookButton) {
              console.log(`🎯 CLICKING Book button for matching class!`);
              bookButton.click();

              // Extract class details from text
              const timeMatch = preferredTimes.find(time => text.includes(time));
              const classMatch = preferredClasses.find(className => 
                text.toLowerCase().includes(className.toLowerCase())
              ) || 'Unknown Class';
              const locationMatch = preferredLocations.find(location => 
                text.toLowerCase().includes(location.toLowerCase())
              ) || 'Unknown Location';

              results.push({
                name: classMatch,
                time: timeMatch,
                location: locationMatch,
                booked: true
              });
              foundClass = true;
              break;
            } else {
              console.log(`Found matching class but no Book button nearby`);
            }
          }
        }

        if (!foundClass) {
          console.log('Trying alternative approach: checking all Book buttons...');
          const bookButtons = document.querySelectorAll('button');

          for (const button of bookButtons) {
            if (button.textContent?.includes('Book')) {
              let parent = button.parentElement;
              while (parent) {
                const parentText = parent.textContent || '';
                if (matchesPreferences(parentText)) {
                  console.log(`🎯 FOUND Book button for matching class - CLICKING!`);
                  button.click();

                  // Extract class details from text
                  const timeMatch = preferredTimes.find(time => parentText.includes(time));
                  const classMatch = preferredClasses.find(className => 
                    parentText.toLowerCase().includes(className.toLowerCase())
                  ) || 'Unknown Class';
                  const locationMatch = preferredLocations.find(location => 
                    parentText.toLowerCase().includes(location.toLowerCase())
                  ) || 'Unknown Location';

                  results.push({
                    name: classMatch,
                    time: timeMatch,
                    location: locationMatch,
                    booked: true
                  });
                  foundClass = true;
                  break;
                }
                parent = parent.parentElement;
              }
              if (foundClass) break;
            }
          }
        }

        if (!foundClass) {
          console.log('No matching classes found for booking');
        }

        return results;
      }, preferences.preferredClasses, preferences.preferredTimes, preferences.preferredLocations);

      Logger.info(`Booking results: ${bookingResults.length} classes processed`);

      if (bookingResults.length > 0) {
        bookingResults.forEach((result, i) => {
          if (result.booked) {
            Logger.success(`✅ BOOKED: ${result.name} at ${result.time} (${result.location})`);
          }
        });
      } else {
        Logger.warning('No matching classes found for booking');
      }

      return bookingResults;
    } catch (error) {
      Logger.error(`Error finding/booking classes: ${error.message}`);
      return [];
    }
  }

  async waitUntilBookingTime() {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + config.booking.daysInAdvance);
    
    // Parse booking time (e.g., "19:00")
    const [bookingHour, bookingMinute] = config.booking.bookingTime.split(':').map(Number);
    
    // Set target booking time for today
    const bookingTime = new Date();
    bookingTime.setHours(bookingHour, bookingMinute, 0, 0);
    
    Logger.info(`⏰ Current time: ${now.toLocaleTimeString('no-NO')}`);
    Logger.info(`🎯 Target booking time: ${bookingTime.toLocaleTimeString('no-NO')}`);
    
    if (now < bookingTime) {
      const waitTime = bookingTime.getTime() - now.getTime();
      Logger.info(`⏳ Waiting ${Math.round(waitTime / 1000 / 60)} minutes until booking time...`);
      
      // Wait until booking time
      await new Promise(resolve => setTimeout(resolve, waitTime));
      Logger.info('🚀 Booking time reached!');
    } else {
      Logger.info('🚀 Booking time has passed - proceeding immediately!');
    }
  }

  async runBookingProcess() {
    try {
      await this.initialize();

      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      Logger.info('🎯 Preparing for booking - navigating to page...');
      const navSuccess = await this.navigateToBookingPage();
      if (!navSuccess) {
        throw new Error('Failed to navigate to booking page');
      }

      await this.navigateToTargetDate();
      await this.waitUntilBookingTime();

      Logger.info('🎯 BOOKING NOW!');
      const bookingResults = await this.findAndBookClasses();

      // Send email notification
      await this.emailService.sendBookingNotification(bookingResults);

      if (bookingResults.length === 0) {
        Logger.warning('No matching classes found for your preferences');
        Logger.info('Check your .env file settings:');
        const preferences = this.getPreferences();
        Logger.info(`- Classes: ${preferences.preferredClasses.join(', ')}`);
        Logger.info(`- Times: ${preferences.preferredTimes.join(', ')}`);
        Logger.info(`- Locations: ${preferences.preferredLocations.join(', ')}`);
      } else {
        Logger.success(`🎉 Booking process completed! Processed ${bookingResults.length} classes.`);
      }

    } catch (error) {
      Logger.error(`Booking process failed: ${error.message}`);
    } finally {
      if (!config.development.isLocal || process.env.NODE_ENV === 'production') {
        await this.cleanup();
      } else {
        Logger.info('LOCAL MODE: Keeping browser open for inspection (10 seconds)');
        setTimeout(async () => {
          await this.cleanup();
        }, 10000);
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
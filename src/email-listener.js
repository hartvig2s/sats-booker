const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');
const Logger = require('./logger');
const SatsBooker = require('./sats-booker');

class EmailListener {
  constructor() {
    this.imap = null;
    this.isConnected = false;
    this.initializeImap();
  }

  initializeImap() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      Logger.warning('Email credentials missing - email listener disabled');
      return;
    }

    this.imap = new Imap({
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASS,
      host: process.env.EMAIL_IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.EMAIL_IMAP_PORT) || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    this.imap.once('ready', () => {
      Logger.success('📧 Email listener connected to IMAP server');
      this.isConnected = true;
      this.openInbox();
    });

    this.imap.once('error', (err) => {
      Logger.error(`IMAP connection error: ${err.message}`);
      this.isConnected = false;
    });

    this.imap.once('end', () => {
      Logger.info('IMAP connection ended');
      this.isConnected = false;
    });
  }

  openInbox() {
    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        Logger.error(`Failed to open inbox: ${err.message}`);
        return;
      }

      Logger.info('📬 Monitoring inbox for booking requests...');
      
      // Listen for new emails
      this.imap.on('mail', (numNewMsgs) => {
        Logger.info(`📨 ${numNewMsgs} new email(s) received`);
        this.checkForBookingEmails();
      });

      // Check for existing unread emails
      this.checkForBookingEmails();
    });
  }

  checkForBookingEmails() {
    // Search for all unread emails (we'll filter by time pattern later)
    this.imap.search(['UNSEEN'], (err, results) => {
      if (err) {
        Logger.error(`Email search error: ${err.message}`);
        return;
      }

      if (!results || results.length === 0) {
        Logger.info('No new booking emails found');
        return;
      }

      Logger.info(`📧 Found ${results.length} potential booking email(s)`);
      
      const fetch = this.imap.fetch(results, { bodies: '' });
      
      fetch.on('message', (msg, seqno) => {
        msg.on('body', (stream, info) => {
          simpleParser(stream, (err, parsed) => {
            if (err) {
              Logger.error(`Failed to parse email: ${err.message}`);
              return;
            }
            
            this.processBookingEmail(parsed, seqno);
          });
        });
      });

      fetch.once('error', (err) => {
        Logger.error(`Fetch error: ${err.message}`);
      });
    });
  }

  async processBookingEmail(email, seqno) {
    const subject = email.subject || '';
    const from = email.from?.text || '';
    
    Logger.info(`📧 Processing email from: ${from}`);
    Logger.info(`📧 Subject: ${subject}`);

    // Parse booking request from subject
    const bookingRequest = this.parseBookingRequest(subject);
    
    if (!bookingRequest) {
      Logger.warning('❌ Could not parse booking request from email subject');
      Logger.info('Expected format: "BOOK Pilates 16:00" or "SATS Yoga 18:00 Oslo City"');
      return;
    }

    Logger.info(`🎯 Parsed booking request:`, bookingRequest);

    try {
      // Trigger booking with parsed parameters
      await this.triggerBooking(bookingRequest, from);
      
      // Mark email as read
      this.imap.addFlags(seqno, ['\\Seen'], (err) => {
        if (err) Logger.error(`Failed to mark email as read: ${err.message}`);
      });
      
    } catch (error) {
      Logger.error(`Booking failed: ${error.message}`);
    }
  }

  parseBookingRequest(subject) {
    // Valid SATS locations
    const validLocations = [
      'Akersgate', 'Asker', 'Bekkestua', 'Bekkestua stasjon', 'Billingstad', 'Bislett', 
      'Bjørvika', 'CC Vest', 'Carl Berner', 'Colosseum', 'Fagerborgr', 'Fornebu', 
      'Hasle', 'Hellerud', 'Hoff', 'Ila', 'Jessheim', 'Kalbakken', 'Kampen', 
      'Karlsrud', 'Kolbotn', 'Lambertseter', 'Lillestrøm', 'Linderud', 'Metro', 
      'Njård', 'Nydalen', 'Ringnes Park', 'Ryen', 'Røa', 'Sagene', 'Sandvika Panorama', 
      'Schous plass', 'Sjølyst', 'Skedsmokorset', 'Slemmestad', 'Solli', 'Storo', 
      'Triaden', 'Ullevaal', 'Vinderen', 'Yoga Aker Brygge', 'Yoga Majorstuen'
    ];

    // Remove common prefixes and clean up
    const cleanSubject = subject
      .replace(/^(RE:|FW:|BOOK|SATS)[\s:]/i, '')
      .trim();

    // Try to extract class, time, and location
    // Expected formats:
    // "hiit run 1345" -> "hiit run" at "13:45"
    // "Pilates 16:00"
    // "Yoga 1800 Oslo City" -> "Yoga" at "18:00" in "Oslo City"
    
    // First try standard time format (HH:MM)
    let timeRegex = /(\d{1,2}):(\d{2})/;
    let timeMatch = cleanSubject.match(timeRegex);
    
    // If no colon format, try 4-digit format (HHMM)
    if (!timeMatch) {
      timeRegex = /(\d{4})/;
      timeMatch = cleanSubject.match(timeRegex);
      
      if (timeMatch) {
        // Convert HHMM to HH:MM
        const timeStr = timeMatch[0];
        if (timeStr.length === 4) {
          const hours = timeStr.substring(0, 2);
          const minutes = timeStr.substring(2, 4);
          timeMatch[0] = `${hours}:${minutes}`;
        }
      }
    }
    
    if (!timeMatch) {
      return null; // No time found
    }

    const time = timeMatch[0];
    const beforeTime = cleanSubject.substring(0, timeMatch.index).trim();
    const afterTime = cleanSubject.substring(timeMatch.index + timeMatch[0].length).trim();

    // Handle both formats: "pilates 1400" and "1400 pilates"
    let location = process.env.PREFERRED_LOCATIONS || 'Colosseum'; // default from env
    let className = 'Any';

    if (beforeTime && afterTime) {
      // Both before and after time exist
      // Check if afterTime is a valid location
      const afterLocationMatch = validLocations.find(loc => 
        loc.toLowerCase() === afterTime.toLowerCase()
      );
      
      if (afterLocationMatch) {
        // Format: "class time location" (e.g., "pilates 1400 storo")
        className = beforeTime;
        location = afterLocationMatch;
      } else {
        // Check if beforeTime is a valid location
        const beforeLocationMatch = validLocations.find(loc => 
          loc.toLowerCase() === beforeTime.toLowerCase()
        );
        
        if (beforeLocationMatch) {
          // Format: "location time class" (e.g., "storo 1400 pilates")
          className = afterTime;
          location = beforeLocationMatch;
        } else {
          // Neither is a location, combine as class name
          // Format: "class1 time class2" (e.g., "hot 1400 yoga")
          className = `${beforeTime} ${afterTime}`;
        }
      }
    } else if (beforeTime) {
      // Only beforeTime exists: "class time" (e.g., "pilates 1400")
      const beforeLocationMatch = validLocations.find(loc => 
        loc.toLowerCase() === beforeTime.toLowerCase()
      );
      
      if (beforeLocationMatch) {
        // beforeTime is a location: "location time"
        location = beforeLocationMatch;
        className = 'Any';
      } else {
        // beforeTime is a class: "class time"
        className = beforeTime;
      }
    } else if (afterTime) {
      // Only afterTime exists: "time class" or "time location class" or "time class location"
      const words = afterTime.split(' ');
      
      if (words.length > 1) {
        // Multiple words after time, check if first word is a location
        const firstWord = words[0];
        const firstWordLocationMatch = validLocations.find(loc => 
          loc.toLowerCase() === firstWord.toLowerCase()
        );
        
        if (firstWordLocationMatch) {
          // First word is a location: "time location class"
          location = firstWordLocationMatch;
          className = words.slice(1).join(' ');
        } else {
          // Check if last word is a location
          const lastWord = words[words.length - 1];
          const lastWordLocationMatch = validLocations.find(loc => 
            loc.toLowerCase() === lastWord.toLowerCase()
          );
          
          if (lastWordLocationMatch) {
            // Last word is a location: "time class location"
            className = words.slice(0, -1).join(' ');
            location = lastWordLocationMatch;
          } else {
            // No location found, all words are class name
            className = afterTime;
          }
        }
      } else {
        // Single word after time
        const afterLocationMatch = validLocations.find(loc => 
          loc.toLowerCase() === afterTime.toLowerCase()
        );
        
        if (afterLocationMatch) {
          // afterTime is a location: "time location"
          location = afterLocationMatch;
          className = 'Any';
        } else {
          // afterTime is a class: "time class"
          className = afterTime;
        }
      }
    }

    return {
      class: className,
      time: time,
      location: location
    };
  }

  async triggerBooking(bookingRequest, fromEmail) {
    Logger.info(`🚀 Triggering booking for: ${bookingRequest.class} at ${bookingRequest.time}`);
    
    try {
      // Create booker with custom preferences (no need to modify .env file)
      const booker = new SatsBooker(bookingRequest);
      await booker.runBookingProcess();
      
      Logger.success(`✅ Email-triggered booking completed for "${fromEmail}"`);
      
    } catch (error) {
      Logger.error(`❌ Email-triggered booking failed: ${error.message}`);
      throw error;
    }
  }

  async updateEnvFile(bookingRequest) {
    const envPath = path.join(process.cwd(), '.env');
    const backupPath = path.join(process.cwd(), '.env.backup');
    
    try {
      // Read current .env file
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        
        // Create backup of original .env file
        fs.writeFileSync(backupPath, envContent);
        Logger.info('📋 Created backup of .env file as .env.backup');
      }

      // Add timestamp comment
      const timestamp = new Date().toLocaleString('no-NO');
      const emailComment = `\n# Updated by email booking at ${timestamp}`;
      
      // Update or add the booking preferences
      const updates = {
        'PREFERRED_CLASSES': bookingRequest.class,
        'PREFERRED_TIMES': bookingRequest.time,
        'PREFERRED_LOCATIONS': bookingRequest.location, // Always set location (defaults to Colosseum)
      };

      // Add comment before updates
      envContent += emailComment;

      // Process each update
      for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;
        
        if (regex.test(envContent)) {
          // Update existing line
          envContent = envContent.replace(regex, newLine);
          Logger.info(`📝 Updated ${key}=${value} in .env file`);
        } else {
          // Add new line
          envContent += `\n${newLine}`;
          Logger.info(`📝 Added ${key}=${value} to .env file`);
        }
      }

      // Write back to .env file
      fs.writeFileSync(envPath, envContent);
      Logger.success('✅ .env file updated with email booking preferences');
      
    } catch (error) {
      Logger.error(`Failed to update .env file: ${error.message}`);
      throw error;
    }
  }

  start() {
    if (!this.imap) {
      Logger.warning('Email listener not configured - skipping');
      return;
    }

    Logger.info('🚀 Starting email listener...');
    this.imap.connect();
  }

  stop() {
    if (this.imap && this.isConnected) {
      this.imap.end();
    }
  }
}

module.exports = EmailListener;
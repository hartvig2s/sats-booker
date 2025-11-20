# SATS Class Booker - Project Overview

## 🎯 Project Purpose
Automated booking system for SATS.no fitness classes that books classes exactly 7 days in advance when they become available at 19:00 daily.

## 🏗️ Architecture

### Two-Service Design
The system runs as two independent services:

1. **Main Scheduler Service** (`npm start`)
   - Runs scheduled bookings based on cron pattern
   - Uses preferences from `.env` file
   - Automatically calculates booking time (2 minutes before class release)

2. **Email Booking Service** (`npm run email-service`)
   - Monitors IMAP inbox for booking requests
   - Processes emails in real-time
   - Uses dynamic preferences from email subject

---

## 🚀 Key Features

### 1. Scheduled Automatic Booking
- **Cron-based scheduling** - Runs daily at calculated time
- **7-day advance booking** - Books classes exactly when they become available
- **Smart timing** - Automatically schedules 2 minutes before earliest preferred time
- **Multiple preferences** - Supports multiple classes, times, and locations

### 2. Email-Triggered Booking
- **IMAP monitoring** - Real-time email processing
- **Flexible formats** - Multiple email subject formats supported:
  - `BOOK Pilates 16:00`
  - `1030 zumba`
  - `SATS Yoga 18:00 Oslo City`
  - `hiit run 1345`
- **Dynamic preferences** - Email overrides .env settings
- **No file modifications** - Preferences passed directly to booker

### 3. Intelligent Date Navigation
- **Automatic date calculation** - Finds target date 7 days in advance
- **Calendar navigation** - Clicks correct date button (e.g., "Fre31")
- **Robust date matching** - Handles various date button formats

### 4. Web Automation
- **Puppeteer-based** - Automated browser interaction
- **Login handling** - Automatic SATS.no authentication
- **Cookie management** - Handles cookie popups
- **Location selection** - Keyboard navigation for dropdowns
- **Class type filtering** - Searches and selects specific class types

### 5. Notification System
- **Email notifications** - Sends booking confirmations
- **Success/failure reporting** - Detailed booking results
- **Error logging** - Comprehensive error tracking

---

## 🔑 Key Design Decisions

### 1. Dynamic Preferences Architecture
**Decision:** Pass preferences directly to SatsBooker instead of modifying .env file

**Rationale:**
- ✅ No file system writes during email bookings
- ✅ Faster processing (no config reload needed)
- ✅ Supports concurrent bookings without conflicts
- ✅ Cleaner separation of concerns
- ✅ Email preferences don't pollute .env file

**Implementation:**
```javascript
// SatsBooker accepts custom preferences
const booker = new SatsBooker(customPreferences);

// Falls back to config if no custom preferences
getPreferences() {
  return this.customPreferences || config.booking;
}
```

### 2. Two-Service Model
**Decision:** Separate main scheduler and email service

**Rationale:**
- ✅ Independent scaling (can run on different servers)
- ✅ Isolated failures (one service crash doesn't affect the other)
- ✅ Different resource requirements (email service needs IMAP connection)
- ✅ Easier debugging and monitoring

### 3. Email Parsing Strategy
**Decision:** Flexible, order-independent parsing with location validation

**Rationale:**
- ✅ User-friendly (multiple formats accepted)
- ✅ Robust (handles "1030 zumba" and "zumba 1030")
- ✅ Location-aware (validates against known SATS locations)
- ✅ Defaults to .env location if not specified

**Supported Formats:**
- Time first: `1030 pilates`, `1600 yoga storo`
- Class first: `pilates 1030`, `yoga 1600 storo`
- With prefix: `BOOK pilates 1600`, `SATS yoga 1800`

### 4. Date Calculation
**Decision:** Always book 7 days in advance

**Rationale:**
- ✅ Matches SATS booking window
- ✅ Maximizes booking success rate
- ✅ Simple, predictable behavior
- ✅ Configurable via `DAYS_IN_ADVANCE` env var

### 5. Browser Automation Approach
**Decision:** Visible browser in development, headless in production

**Rationale:**
- ✅ Easy debugging locally (see what's happening)
- ✅ Resource-efficient in production
- ✅ Screenshots saved for troubleshooting
- ✅ Configurable via `NODE_ENV`

---

## 📁 Project Structure

```
sats-class-booker/
├── src/
│   ├── index.js              # Main scheduler entry point
│   ├── scheduler.js          # Cron scheduling logic
│   ├── sats-booker.js        # Core booking automation
│   ├── email-listener.js     # IMAP email monitoring
│   ├── email-service.js      # Email notification sender
│   ├── config.js             # Configuration management
│   └── logger.js             # Logging utility
├── email-booking-service.js  # Email service entry point
├── test-local.js             # Local testing script
├── test-email-booking.js     # Email booking test
├── .env                      # Environment configuration
├── package.json              # Dependencies and scripts
└── EMAIL_BOOKING.md          # Email feature documentation
```

---

## 🔧 Configuration

### Environment Variables

#### Required
- `SATS_EMAIL` - SATS.no account email
- `SATS_PASSWORD` - SATS.no account password
- `EMAIL_USER` - Gmail account for monitoring
- `EMAIL_PASS` - Gmail app password
- `EMAIL_TO` - Notification recipient email

#### Booking Preferences
- `PREFERRED_CLASSES` - Comma-separated class names (e.g., "Pilates,Yoga")
- `PREFERRED_TIMES` - Comma-separated times (e.g., "16:00,18:00")
- `PREFERRED_LOCATIONS` - Comma-separated locations (e.g., "Colosseum,Storo")
- `DAYS_IN_ADVANCE` - Days ahead to book (default: 7)

#### Optional
- `BOOKING_SCHEDULE` - Override automatic cron calculation
- `BOOKING_RELEASE_TIME` - Override booking release time
- `NODE_ENV` - Environment (development/production)

---

## 🎨 User Experience Flow

### Scheduled Booking Flow
1. System starts and calculates next booking time
2. Waits until scheduled time (e.g., 15:58 for 16:00 class)
3. Logs into SATS.no
4. Navigates to booking page
5. Selects location and class type
6. Navigates to target date (7 days ahead)
7. Searches for matching classes
8. Books first available match
9. Sends email notification

### Email Booking Flow
1. User sends email to monitored inbox
2. Email service detects new unread email
3. Parses subject for class, time, location
4. Creates SatsBooker with custom preferences
5. Immediately triggers booking process
6. Marks email as read
7. Sends confirmation email

---

## 🛠️ Technical Stack

- **Node.js** - Runtime environment
- **Puppeteer** - Browser automation
- **node-cron** - Scheduling
- **IMAP** - Email monitoring
- **Nodemailer** - Email sending
- **Mailparser** - Email parsing
- **dotenv** - Configuration management
- **Chalk** - Terminal colors

---

## 🔒 Security Considerations

1. **Credentials Storage**
   - Uses environment variables (never committed)
   - Gmail app passwords (not main password)
   - .env file in .gitignore

2. **Email Security**
   - TLS/SSL for IMAP connection
   - Marks processed emails as read
   - Only processes unread emails

3. **Browser Security**
   - Headless mode in production
   - No browser data persistence
   - Clean session per booking

---

## 📊 Monitoring & Debugging

### Logging Levels
- `INFO` - General operation info
- `SUCCESS` - Successful operations
- `WARNING` - Non-critical issues
- `ERROR` - Critical failures

### Debug Screenshots
Saved in development mode:
- `debug-login-page.png` - Login page state
- `debug-booking-page.png` - Booking page after navigation
- `debug-after-date-click.png` - After date selection
- `debug-booking-moment.png` - At booking time

### Log Monitoring
- Timestamps in ISO format
- Color-coded by level (chalk)
- Detailed error stack traces
- Email processing logs

---

## 🚀 Deployment Options

### Local Development
```bash
npm start              # Main scheduler
npm run email-service  # Email monitoring
npm run test          # Test booking flow
```

### Railway (Production)
- Two separate services required
- Set all environment variables in Railway dashboard
- Main service: `npm start`
- Email service: `npm run email-service`

---

## 🎯 Future Enhancement Ideas

1. **Multi-user Support** - Handle bookings for multiple SATS accounts
2. **Booking History** - Database to track booking attempts
3. **Web Dashboard** - UI for managing preferences
4. **SMS Notifications** - Alternative to email
5. **Retry Logic** - Automatic retry on booking failure
6. **Waitlist Management** - Auto-book when spots open
7. **Calendar Integration** - Sync with Google Calendar
8. **Analytics** - Success rate tracking

---

## 📝 Testing

### Manual Testing
```bash
npm run test           # Full booking flow test
npm run test-now       # Immediate booking test
npm run test-email-booking  # Email parsing test
```

### Test Scenarios
- ✅ Date navigation to correct day
- ✅ Email parsing (multiple formats)
- ✅ Dynamic preferences override
- ✅ Login and authentication
- ✅ Location and class selection
- ✅ Email notification sending

---

## 🐛 Known Issues & Limitations

1. **SATS Website Changes** - May break if SATS updates their UI
2. **IMAP Connection** - Can drop and require restart
3. **Browser Resources** - Puppeteer requires significant memory
4. **Single Booking** - Only books first matching class
5. **No Conflict Detection** - Doesn't check for existing bookings

---

## 📚 Key Learnings

1. **Dynamic Configuration** - Passing preferences directly is cleaner than file modification
2. **Service Separation** - Independent services are more robust
3. **Email Parsing** - Flexible parsing improves user experience
4. **Browser Automation** - Screenshots are essential for debugging
5. **Error Handling** - Graceful degradation prevents total failures

---

## 🎓 Code Quality Principles Applied

1. **Single Responsibility** - Each class has one clear purpose
2. **Dependency Injection** - SatsBooker accepts custom preferences
3. **Configuration Management** - Centralized in config.js
4. **Error Handling** - Try-catch blocks with detailed logging
5. **Code Reusability** - Shared utilities (Logger, EmailService)
6. **Documentation** - Inline comments and external docs

---

## 📞 Support & Maintenance

### Common Issues

**Email service not receiving emails:**
- Check IMAP credentials
- Verify Gmail app password
- Check IMAP connection logs

**Booking fails:**
- Check SATS credentials
- Verify class/time/location exist
- Review debug screenshots

**Date navigation fails:**
- Check if target date is available
- Verify 7-day advance booking window
- Review date button logs

---

## 🏆 Success Metrics

- ✅ Automated booking 7 days in advance
- ✅ Email-triggered bookings working
- ✅ Dynamic preferences system implemented
- ✅ Date navigation fixed (October 31st)
- ✅ No .env file modifications needed
- ✅ Comprehensive error handling
- ✅ Email notifications working
- ✅ Multiple email formats supported

---

**Last Updated:** October 24, 2025  
**Version:** 1.0.0  
**Status:** Production Ready

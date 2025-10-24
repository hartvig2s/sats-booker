require('dotenv').config();

const config = {
  sats: {
    email: process.env.SATS_EMAIL,
    password: process.env.SATS_PASSWORD,
    baseUrl: 'https://sats.no'
  },
  
  booking: {
    preferredClasses: process.env.PREFERRED_CLASSES?.split(',').map(c => c.trim()) || [],
    preferredTimes: process.env.PREFERRED_TIMES?.split(',').map(t => t.trim()) || [],
    preferredLocations: process.env.PREFERRED_LOCATIONS?.split(',').map(l => l.trim()) || [],
    daysInAdvance: parseInt(process.env.DAYS_IN_ADVANCE) || 7,
    bookingTime: (() => {
      if (process.env.BOOKING_RELEASE_TIME) {
        return process.env.BOOKING_RELEASE_TIME;
      }
      // Use earliest preferred time as booking release time
      const times = process.env.PREFERRED_TIMES?.split(',').map(t => t.trim()) || ['19:00'];
      return times.sort()[0];
    })()
  },
  
  schedule: {
    // Calculate schedule dynamically: 2 minutes before earliest preferred time
    cronPattern: (() => {
      if (process.env.BOOKING_SCHEDULE) {
        return process.env.BOOKING_SCHEDULE;
      }
      
      // Get earliest preferred time
      const times = process.env.PREFERRED_TIMES?.split(',').map(t => t.trim()) || ['13:00'];
      const earliestTime = times.sort()[0]; // Sort to get earliest time
      
      // Parse time (e.g., "13:00" -> hour: 13, minute: 0)
      const [hour, minute] = earliestTime.split(':').map(Number);
      
      // Calculate 2 minutes before
      let scheduleMinute = minute - 2;
      let scheduleHour = hour;
      
      if (scheduleMinute < 0) {
        scheduleMinute += 60;
        scheduleHour -= 1;
      }
      
      // Return cron pattern: "minute hour * * *"
      return `${scheduleMinute} ${scheduleHour} * * *`;
    })()
  },
  
  notifications: {
    enabled: process.env.ENABLE_NOTIFICATIONS === 'true',
    email: {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      to: process.env.EMAIL_TO
    }
  },
  
  // Local development settings
  development: {
    isLocal: !process.env.RAILWAY_ENVIRONMENT,
    headless: process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT,
    slowMo: 0 // No delay for maximum speed
  }
};

module.exports = config;
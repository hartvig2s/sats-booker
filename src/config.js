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
    daysInAdvance: 7, // SATS releases classes 7 days in advance
    bookingTime: '19:00' // Classes are released at 19:00 (7 PM)
  },
  
  schedule: {
    // Default: Daily at 19:05 (5 minutes after classes are released)
    cronPattern: process.env.BOOKING_SCHEDULE || '5 19 * * *'
  },
  
  notifications: {
    enabled: process.env.ENABLE_NOTIFICATIONS === 'true'
  },
  
  // Local development settings
  development: {
    isLocal: !process.env.RAILWAY_ENVIRONMENT,
    headless: process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT,
    slowMo: process.env.NODE_ENV !== 'production' ? 100 : 0
  }
};

module.exports = config;
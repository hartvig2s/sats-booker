require('dotenv').config();

const config = {
  sats: {
    email: process.env.SATS_EMAIL,
    password: process.env.SATS_PASSWORD,
    baseUrl: 'https://sats.no'
  },
  
  booking: {
    preferredClasses: process.env.PREFERRED_CLASSES?.split(',') || [],
    preferredTimes: process.env.PREFERRED_TIMES?.split(',') || [],
    preferredLocations: process.env.PREFERRED_LOCATIONS?.split(',') || [],
    daysInAdvance: 7 // SATS releases classes 7 days in advance
  },
  
  schedule: {
    cronPattern: process.env.BOOKING_SCHEDULE || '0 10 * * *' // Daily at 10 AM
  },
  
  notifications: {
    enabled: process.env.ENABLE_NOTIFICATIONS === 'true'
  }
};

module.exports = config;
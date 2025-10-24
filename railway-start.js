#!/usr/bin/env node

// Railway startup script with better error handling
const Logger = require('./src/logger');

async function startRailwayServices() {
  try {
    Logger.info('🚂 Starting Railway deployment...');
    
    // Check required environment variables
    const requiredEnvVars = [
      'SATS_EMAIL',
      'SATS_PASSWORD',
      'EMAIL_USER', 
      'EMAIL_PASS'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      Logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      Logger.info('Please set these variables in your Railway project settings');
      process.exit(1);
    }
    
    Logger.info('✅ All required environment variables found');
    
    // Determine which service to run based on environment variable
    const serviceType = process.env.RAILWAY_SERVICE_TYPE || 'main';
    
    if (serviceType === 'email') {
      Logger.info('🚀 Starting Email Booking Service...');
      require('./email-booking-service.js');
    } else {
      Logger.info('🚀 Starting Main Booking Scheduler...');
      require('./src/index.js');
    }
    
  } catch (error) {
    Logger.error(`❌ Railway startup failed: ${error.message}`);
    Logger.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

startRailwayServices();
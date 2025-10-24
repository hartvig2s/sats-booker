#!/usr/bin/env node

// Quick local test script
require('dotenv').config();
const SatsBooker = require('./src/sats-booker');
const Logger = require('./src/logger');

async function testLocal() {
  Logger.info('🧪 Testing SATS booker locally...');
  
  if (!process.env.SATS_EMAIL || !process.env.SATS_PASSWORD) {
    Logger.error('Please create a .env file with your SATS credentials');
    Logger.info('Copy .env.example to .env and fill in your details');
    process.exit(1);
  }
  
  Logger.info('Configuration:');
  Logger.info(`- Email: ${process.env.SATS_EMAIL}`);
  Logger.info(`- Classes: ${process.env.PREFERRED_CLASSES || 'Any'}`);
  Logger.info(`- Times: ${process.env.PREFERRED_TIMES || 'Any'}`);
  Logger.info(`- Locations: ${process.env.PREFERRED_LOCATIONS || 'Any'}`);
  
  const booker = new SatsBooker();
  await booker.runBookingProcess();
}

testLocal().catch(error => {
  Logger.error(`Test failed: ${error.message}`);
  process.exit(1);
});
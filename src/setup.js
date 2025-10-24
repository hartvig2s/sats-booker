const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Logger = require('./logger');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  Logger.info('🏋️  SATS Class Booker Setup');
  console.log('Let\'s configure your automatic class booking!\n');

  const email = await question('Enter your SATS email: ');
  const password = await question('Enter your SATS password: ');
  
  console.log('\nClass preferences (comma-separated):');
  const classes = await question('Preferred classes (e.g., Yoga,Spinning,CrossFit): ');
  
  console.log('\nTime preferences (comma-separated, 24h format):');
  const times = await question('Preferred times (e.g., 18:00,19:00,20:00): ');
  
  console.log('\nLocation preferences (comma-separated):');
  const locations = await question('Preferred locations (e.g., Oslo City,Colosseum): ');

  const envContent = `# SATS Login Credentials
SATS_EMAIL=${email}
SATS_PASSWORD=${password}

# Booking Configuration
PREFERRED_CLASSES=${classes}
PREFERRED_TIMES=${times}
PREFERRED_LOCATIONS=${locations}

# Schedule (cron format - default: every day at 10:00 AM)
BOOKING_SCHEDULE=0 10 * * *

# Notification settings
ENABLE_NOTIFICATIONS=true`;

  fs.writeFileSync('.env', envContent);
  
  Logger.success('Configuration saved to .env file');
  Logger.info('You can now run: npm start');
  
  rl.close();
}

setup().catch(error => {
  Logger.error(`Setup failed: ${error.message}`);
  process.exit(1);
});
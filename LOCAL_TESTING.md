# Local Testing Guide 🧪

## Quick Setup for Local Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual SATS credentials
# Use your favorite editor (nano, vim, code, etc.)
nano .env
```

### 3. Test Immediately
```bash
# Run a quick test (shows browser window)
npm test

# Or test the scheduled version immediately
npm run test-now
```

## What Happens During Local Testing

### Browser Behavior
- **Development Mode**: Browser window opens so you can see what's happening
- **Screenshots**: Saves debug screenshots (`debug-login-page.png`, `debug-classes-page.png`)
- **Slow Motion**: Adds 100ms delay between actions for easier debugging
- **No Real Booking**: Won't actually book classes (safety feature)

### Timing Logic
- **Target Date**: Always looks 7 days ahead from today
- **Release Time**: Classes are released at 19:00 (7 PM) exactly 7 days before
- **Example**: Friday 19:00 class → Available for booking on previous Friday at 19:00

### What You'll See
```
[INFO] 2024-10-24T16:00:00.000Z: 🏋️  SATS Class Booker Starting...
[INFO] 2024-10-24T16:00:00.000Z: Running in local development mode - browser window will be visible
[INFO] 2024-10-24T16:00:00.000Z: Looking for classes on: 31.10.2024 (7 days from now)
[INFO] 2024-10-24T16:00:00.000Z: Current time: 24.10.2024, 18:00:00
[INFO] 2024-10-24T16:00:00.000Z: Classes should be released at: 19:00 today for 31.10.2024
```

## Configuration Tips

### Class Names
Use exact names from SATS.no:
```
PREFERRED_CLASSES=Yoga,Hot Yoga,Spinning,CrossFit,Body Pump
```

### Times
Use 24-hour format:
```
PREFERRED_TIMES=18:00,19:00,20:00
```

### Locations
Use partial gym names:
```
PREFERRED_LOCATIONS=Oslo City,Colosseum,Storo
```

## Troubleshooting

### Login Issues
- Check your email/password in `.env`
- Make sure you can log in manually at sats.no
- Check the `debug-login-page.png` screenshot

### No Classes Found
- Check if it's the right time (classes released at 19:00)
- Verify your preferences match actual class names
- Look at `debug-classes-page.png` to see the page structure

### Browser Issues
- Make sure you have Chrome installed
- Try running with `NODE_ENV=production` for headless mode

## Production Mode
To test real booking behavior (careful!):
```bash
NODE_ENV=production npm test
```

This will:
- Run headless (no browser window)
- Actually attempt to book classes
- Close browser immediately after
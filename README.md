# SATS Class Booker 🏋️

Automatic fitness class booking system for SATS.no that books classes exactly 7 days before they start.

## Features

- ✅ Automatic login to SATS.no
- ✅ Books classes 7 days in advance (when they become available)
- ✅ Configurable class, time, and location preferences
- ✅ Scheduled execution with cron
- ✅ Easy setup process
- ✅ Cloud deployment ready

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run setup:**
   ```bash
   npm run setup
   ```

3. **Start the scheduler:**
   ```bash
   npm start
   ```

## Configuration

The setup script will create a `.env` file with your preferences:

- `SATS_EMAIL` - Your SATS login email
- `SATS_PASSWORD` - Your SATS password
- `PREFERRED_CLASSES` - Comma-separated list of class types
- `PREFERRED_TIMES` - Comma-separated list of preferred times (24h format)
- `PREFERRED_LOCATIONS` - Comma-separated list of preferred gym locations
- `BOOKING_SCHEDULE` - Cron pattern for when to run (default: daily at 10 AM)

## Usage

### Run Scheduled Booking
```bash
npm start
```

### Test Booking Now
```bash
npm start -- --now
```

### Development Mode
```bash
npm run dev
```

## Railway Deployment (Recommended) 🚂

This project is optimized for Railway deployment:

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "SATS booker setup"
   git push origin main
   ```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repo
   - Set environment variables in dashboard

3. **Configure Variables:**
   ```
   SATS_EMAIL=your-email@example.com
   SATS_PASSWORD=your-password
   PREFERRED_CLASSES=Yoga,Spinning,CrossFit
   PREFERRED_TIMES=18:00,19:00,20:00
   PREFERRED_LOCATIONS=Oslo City,Colosseum
   ```

**See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for detailed instructions.**

**Cost**: ~$1-2/month (well within Railway's $5 free tier)

## How It Works

1. **Scheduling**: Runs daily at 10 AM (configurable)
2. **Target Date**: Calculates date 7 days from now
3. **Login**: Authenticates with SATS.no
4. **Search**: Finds available classes matching your preferences
5. **Book**: Automatically books the first matching class
6. **Cleanup**: Closes browser and logs results

## Troubleshooting

- Ensure your SATS credentials are correct
- Check that your preferred classes/locations exist on SATS.no
- Verify the cron schedule format if using custom timing
- Check logs for detailed error information

## Legal Notice

This tool is for personal use only. Respect SATS terms of service and don't abuse their booking system.
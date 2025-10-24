# Railway Deployment Guide 🚂

## Step-by-Step Railway Deployment

### 1. Prepare Your Code
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial SATS booker setup"

# Push to GitHub
git remote add origin https://github.com/yourusername/sats-booker.git
git push -u origin main
```

### 2. Deploy to Railway

1. **Go to [railway.app](https://railway.app)**
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your sats-booker repository**

### 3. Configure Environment Variables

In Railway dashboard, go to **Variables** tab and add:

```
SATS_EMAIL=your-email@example.com
SATS_PASSWORD=your-password
PREFERRED_CLASSES=Yoga,Spinning,CrossFit
PREFERRED_TIMES=18:00,19:00,20:00
PREFERRED_LOCATIONS=Oslo City,Colosseum
BOOKING_SCHEDULE=0 10 * * *
ENABLE_NOTIFICATIONS=true
```

### 4. Deploy Settings

Railway will automatically:
- ✅ Detect Node.js project
- ✅ Install Chromium via Nixpacks
- ✅ Run `npm start` 
- ✅ Keep the service running 24/7

### 5. Monitor Your Deployment

- **Logs**: Check the "Deployments" tab for real-time logs
- **Metrics**: Monitor CPU/memory usage
- **Settings**: Adjust restart policies if needed

## Railway Benefits for This Project

- **Always Running**: Perfect for cron jobs
- **Built-in Chromium**: No browser setup needed
- **Auto-scaling**: Handles traffic spikes
- **Free Tier**: $5/month credit (enough for this use case)
- **Easy Updates**: Push to GitHub = auto-deploy

## Cost Estimate

- **Free Tier**: $5/month credit
- **This App**: ~$1-2/month (very lightweight)
- **Execution**: Runs for ~30 seconds daily

## Troubleshooting

### If deployment fails:
1. Check logs in Railway dashboard
2. Verify all environment variables are set
3. Ensure GitHub repo is public or Railway has access

### If booking fails:
1. Check SATS credentials in variables
2. Verify class names match SATS.no exactly
3. Check logs for specific error messages

## Testing Your Deployment

Once deployed, you can trigger a test run by temporarily changing the cron schedule to run every minute:

```
BOOKING_SCHEDULE=* * * * *
```

Remember to change it back to daily after testing!
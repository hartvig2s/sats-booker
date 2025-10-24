# 📧 Email-Triggered SATS Booking

You can now trigger SATS class bookings by sending emails! 

## 🚀 How to Use

### 1. Start the Email Service
```bash
npm run email-service
```

### 2. Send Booking Emails
Send an email to your configured email address with the class and time in the subject:

**Email Subject Examples:**
- `BOOK Pilates 16:00`
- `SATS Yoga 18:00 Oslo City`
- `CrossFit 19:00`
- `Body Pump 20:00 Colosseum`

### 3. Automatic Booking
The service will:
- ✅ Monitor your inbox for booking emails
- ✅ Parse the class, time, and location from the subject
- ✅ Automatically trigger a SATS booking
- ✅ Send you a confirmation email with results

## 📧 Subject Format

The email parser supports flexible formats:

| Format | Example | Result |
|--------|---------|--------|
| `BOOK [Class] [Time]` | `BOOK Pilates 16:00` | Books Pilates at 16:00 |
| `SATS [Class] [Time] [Location]` | `SATS Yoga 18:00 Oslo City` | Books Yoga at 18:00 at Oslo City |
| `[Class] [Time] [Location]` | `CrossFit 19:00 Colosseum` | Books CrossFit at 19:00 at Colosseum |

**Time Format:** Use 24-hour format (e.g., `16:00`, `18:30`)

## ⚙️ Configuration

Make sure your `.env` file includes:

```env
# Email Configuration (for both sending and receiving)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_TO=your-notification-email@gmail.com

# SATS Credentials
SATS_EMAIL=your-sats-email@gmail.com
SATS_PASSWORD=your-sats-password
```

## 🔐 Gmail Setup

1. **Enable 2-Step Verification** in your Google Account
2. **Generate an App Password** for Mail
3. **Use the App Password** in `EMAIL_PASS` (not your regular password)

## 🎯 Features

- ✅ **Real-time monitoring** - Instantly processes new emails
- ✅ **Flexible parsing** - Handles various subject formats
- ✅ **Location support** - Optional location specification
- ✅ **Confirmation emails** - Get notified of booking results
- ✅ **Error handling** - Graceful handling of invalid requests
- ✅ **Automatic cleanup** - Marks processed emails as read

## 🛑 Stopping the Service

Press `Ctrl+C` to stop the email booking service.

## 📱 Use Cases

- **Quick bookings** - Send email from your phone
- **Scheduled bookings** - Use email scheduling features
- **Remote bookings** - Book classes while away from computer
- **Integration** - Connect with other apps/services that can send emails

## 🧪 Testing

Test the email parsing with:
```bash
node test-email-parsing.js
```

## 📝 Logs

The service provides detailed logs:
- 📧 Email monitoring status
- 🎯 Parsed booking requests
- 🚀 Booking attempts
- ✅ Success/failure notifications
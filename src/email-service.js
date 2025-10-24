const nodemailer = require('nodemailer');
const config = require('./config');
const Logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!config.notifications.enabled) {
      Logger.info('Email notifications disabled');
      return;
    }

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      Logger.warning('Email configuration missing - notifications disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    Logger.info('Email service initialized');
  }

  async sendBookingNotification(bookingResults) {
    if (!this.transporter || !config.notifications.enabled) {
      Logger.info('Email notifications disabled - skipping email');
      return;
    }

    const emailTo = process.env.EMAIL_TO || config.sats.email;
    
    if (bookingResults.length === 0) {
      await this.sendNoClassesFoundEmail(emailTo);
    } else {
      await this.sendSuccessfulBookingEmail(emailTo, bookingResults);
    }
  }

  async sendSuccessfulBookingEmail(to, bookingResults) {
    const bookedClasses = bookingResults.filter(result => result.booked);
    const failedClasses = bookingResults.filter(result => !result.booked);

    let subject = `🎉 SATS Booking Success - ${bookedClasses.length} class(es) booked!`;
    let html = `
      <h2>🎉 SATS Class Booking Results</h2>
      <p><strong>Booking completed at:</strong> ${new Date().toLocaleString('no-NO')}</p>
    `;

    if (bookedClasses.length > 0) {
      html += `
        <h3>✅ Successfully Booked Classes:</h3>
        <ul>
      `;
      bookedClasses.forEach(result => {
        html += `<li><strong>${result.name}</strong> at ${result.time} - ${result.location}</li>`;
      });
      html += `</ul>`;
    }

    if (failedClasses.length > 0) {
      html += `
        <h3>❌ Failed to Book:</h3>
        <ul>
      `;
      failedClasses.forEach(result => {
        html += `<li><strong>${result.name}</strong> at ${result.time} - ${result.location}</li>`;
      });
      html += `</ul>`;
    }

    html += `
      <hr>
      <p><em>This is an automated message from your SATS Class Booker</em></p>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: html
      });

      Logger.success(`📧 Booking notification sent to ${to}`);
    } catch (error) {
      Logger.error(`Failed to send email notification: ${error.message}`);
    }
  }

  async sendNoClassesFoundEmail(to) {
    const subject = '⚠️ SATS Booking - No Classes Found';
    const html = `
      <h2>⚠️ SATS Class Booking Results</h2>
      <p><strong>Booking attempted at:</strong> ${new Date().toLocaleString('no-NO')}</p>
      
      <h3>No matching classes found</h3>
      <p>The booking system could not find any classes matching your preferences:</p>
      <ul>
        <li><strong>Classes:</strong> ${config.booking.preferredClasses.join(', ') || 'Any'}</li>
        <li><strong>Times:</strong> ${config.booking.preferredTimes.join(', ') || 'Any'}</li>
        <li><strong>Locations:</strong> ${config.booking.preferredLocations.join(', ') || 'Any'}</li>
      </ul>
      
      <p>Please check:</p>
      <ul>
        <li>Your preferences in the .env file</li>
        <li>If classes are available at your preferred times/locations</li>
        <li>If the class names match exactly (case-insensitive)</li>
      </ul>
      
      <hr>
      <p><em>This is an automated message from your SATS Class Booker</em></p>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: html
      });

      Logger.info(`📧 No classes found notification sent to ${to}`);
    } catch (error) {
      Logger.error(`Failed to send email notification: ${error.message}`);
    }
  }
}

module.exports = EmailService;
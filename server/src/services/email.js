import sgMail from '@sendgrid/mail';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import { EmailToken } from '../models/index.js';
import crypto from 'crypto';

const from = process.env.EMAIL_FROM || 'no-reply@example.com';
const appBaseUrl = process.env.PUBLIC_APP_URL || 'https://chicknneeds.shop';
const apiBaseUrl = process.env.PUBLIC_API_URL || 'https://api.chicknneeds.shop';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}
let brevoClient = null;
if (process.env.BREVO_API_KEY) {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
  brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
}

export async function sendVerificationEmail(user) {
  const token = crypto.randomBytes(24).toString('hex');
  await EmailToken.create({ token, purpose: 'verify', userId: user.id });
  const verifyUrl = `${apiBaseUrl}/api/auth/verify?token=${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification - Chick'N Needs</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .email-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #2c5530, #4a7c59);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .tagline {
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .welcome-title {
          font-size: 24px;
          color: #2c5530;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .message {
          font-size: 16px;
          color: #666;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .verify-button {
          display: inline-block;
          background: linear-gradient(135deg, #4a7c59, #2c5530);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .verify-button:hover {
          transform: translateY(-2px);
        }
        .alternative-link {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          font-size: 14px;
          color: #666;
        }
        .alternative-link code {
          background: #e9ecef;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          word-break: break-all;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer-text {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        .social-links {
          margin-top: 20px;
        }
        .social-links a {
          color: #4a7c59;
          text-decoration: none;
          margin: 0 10px;
          font-size: 14px;
        }
        .security-note {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        
        
        <div class="content">
          <h1 class="welcome-title">Welcome to Chick'N Needs!</h1>
          <p class="message">
            Thank you for registering with us! We're excited to have you join our community of poultry enthusiasts and farmers.
          </p>
          <p class="message">
            To complete your registration and start shopping for quality poultry supplies, please verify your email address by clicking the button below:
          </p>
          
          <a href="${verifyUrl}" class="verify-button">Verify My Email Address</a>
          
          <div class="security-note">
            <strong>🔒 Security Note:</strong> This verification link will expire in 24 hours for your security. If you didn't create an account with us, please ignore this email.
          </div>
          
          <div class="alternative-link">
            <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
            <code>${verifyUrl}</code>
          </div>
        </div>
        
        <div class="footer">
          <p class="footer-text">
            <strong>Chick'N Needs</strong><br>
            Your one-stop shop for all poultry supplies
          </p>
          <div class="social-links">
            <a href="#">Website</a>
            <a href="#">Support</a>
            <a href="#">Contact</a>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            This email was sent to ${user.email}. If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (brevoClient) {
    await brevoClient.sendTransacEmail({
      to: [{ email: user.email }],
      sender: { email: from, name: 'Chick\'N Needs' },
      subject: '🐔 Welcome to Chick\'N Needs - Verify Your Email',
      htmlContent: htmlContent
    });
  } else if (process.env.SENDGRID_API_KEY) {
    await sgMail.send({
      to: user.email,
      from,
      subject: '🐔 Welcome to Chick\'N Needs - Verify Your Email',
      html: htmlContent
    });
  } else {
    console.log('Email provider not configured. Verification URL:', verifyUrl);
  }
}

export async function sendLoginCode(user) {
  const token = crypto.randomBytes(6).toString('hex').slice(0, 6).toUpperCase();
  await EmailToken.create({ token, purpose: 'login', userId: user.id });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login Verification Code - Chick'N Needs</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .email-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #2c5530, #4a7c59);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .tagline {
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .title {
          font-size: 24px;
          color: #2c5530;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .message {
          font-size: 16px;
          color: #666;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .code-container {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border: 2px solid #4a7c59;
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
          text-align: center;
        }
        .code-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .verification-code {
          font-size: 36px;
          font-weight: bold;
          color: #2c5530;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 2px dashed #4a7c59;
          margin: 15px 0;
          display: inline-block;
          min-width: 200px;
        }
        .instructions {
          background: #e8f5e8;
          border: 1px solid #4a7c59;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          font-size: 14px;
          color: #2c5530;
        }
        .instructions ol {
          text-align: left;
          margin: 10px 0;
          padding-left: 20px;
        }
        .instructions li {
          margin: 8px 0;
        }
        .security-note {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer-text {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        .timer-note {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #0c5460;
        }
        .suspicious-activity {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          font-size: 14px;
          color: #721c24;
        }
        .suspicious-activity a {
          transition: background-color 0.3s ease;
        }
        .suspicious-activity a:hover {
          background: #c82333 !important;
        }
      </style>
    </head>
    <body>
      <!-- Hidden preheader to suppress inbox preview/snippet -->
      <div style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; max-height:0; max-width:0; overflow:hidden; mso-hide:all;">
        &#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;
      </div>
      <div class="email-container">
        
        
        <div class="content">
          <h1 class="title">Login Verification Code</h1>
          <p class="message">
            Someone is trying to log into your Chick'N Needs account. If this was you, use the verification code below to complete your login.
          </p>
          
          <div class="code-container">
            <div class="code-label">Your Verification Code</div>
            <div class="verification-code">${token}</div>
          </div>
          
          <div class="instructions">
            <strong>📱 How to use this code:</strong>
            <ol>
              <li>Return to the Chick'N Needs website</li>
              <li>Enter the verification code above in the login form</li>
              <li>Click "Verify" to complete your login</li>
            </ol>
          </div>
          
          <div class="timer-note">
            <strong>⏰ Time Sensitive:</strong> This code will expire in 5 minutes for your security.
          </div>
          
          <div class="security-note">
            <strong>🔒 Security Alert:</strong> If you didn't request this login code, please ignore this email and consider changing your password. Your account remains secure.
          </div>
          
          <div class="suspicious-activity">
            <strong>🚨 Suspicious Activity Detected?</strong>
            <p>If you suspect unauthorized access to your account, immediately reset your password to secure your account:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${appBaseUrl}/reset-password" 
                 style="display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                🔐 Reset My Password
              </a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              This will immediately secure your account by requiring a new password.
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p class="footer-text">
            <strong>Chick'N Needs</strong><br>
            Your one-stop shop for all poultry supplies
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            This verification code was sent to ${user.email}. If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (brevoClient) {
    await brevoClient.sendTransacEmail({
      to: [{ email: user.email }],
      sender: { email: from, name: 'Chick\'N Needs' },
      subject: '[ Login Verification Code ]- Chick\'N Needs',
      htmlContent: htmlContent
    });
  } else if (process.env.SENDGRID_API_KEY) {
    await sgMail.send({
      to: user.email,
      from,
      subject: '[ Login Verification Code ]- Chick\'N Needs',
      html: htmlContent
    });
  } else {
    console.log('Email provider not configured. Login code:', token);
  }
}

export async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${appBaseUrl}/reset-password?token=${resetToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Chick'N Needs</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .email-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #2c5530, #4a7c59);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .tagline {
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .title {
          font-size: 24px;
          color: #2c5530;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .message {
          font-size: 16px;
          color: #666;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .reset-button {
          display: inline-block;
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white !important;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .reset-button:hover {
          transform: translateY(-2px);
        }
        .security-note {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer-text {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        .timer-note {
          background: #d1ecf1;
          border: 1px solid #bee5eb;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #0c5460;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        
        
        <div class="content">
          <h1 class="title">Reset Your Password</h1>
          <p class="message">
            We received a request to reset your password for your Chick'N Needs account. If you made this request, click the button below to reset your password.
          </p>
          
          <a href="${resetUrl}" class="reset-button">Reset My Password</a>
          
          <div class="timer-note">
            <strong>⏰ Time Sensitive:</strong> This password reset link will expire in 15 minutes for your security.
          </div>
          
          <div class="security-note">
            <strong>🔒 Security Note:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.
          </div>
        </div>
        
        <div class="footer">
          <p class="footer-text">
            <strong>Chick'N Needs</strong><br>
            Your one-stop shop for all poultry supplies
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            This password reset email was sent to ${user.email}. If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (brevoClient) {
    await brevoClient.sendTransacEmail({
      to: [{ email: user.email }],
      sender: { email: from, name: 'Chick\'N Needs' },
      subject: '🔑 Reset Your Password - Chick\'N Needs',
      htmlContent: htmlContent
    });
  } else if (process.env.SENDGRID_API_KEY) {
    await sgMail.send({
      to: user.email,
      from,
      subject: '🔑 Reset Your Password - Chick\'N Needs',
      html: htmlContent
    });
  } else {
    console.log('Email provider not configured. Password reset URL:', resetUrl);
  }
}



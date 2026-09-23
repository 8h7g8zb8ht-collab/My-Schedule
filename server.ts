import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Persistent database for user authentication
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'users.json');

export interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  emailVerified: boolean;
  verificationToken?: string;
  verificationExpires?: number;
  resetToken?: string;
  resetExpires?: number;
  createdAt: number;
}

interface DatabaseSchema {
  users: StoredUser[];
}

function readDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading auth database:', err);
  }
  return { users: [] };
}

function writeDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing auth database:', err);
  }
}

// Password hashing helper
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// Setup email transport
function getMailTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // Fallback to json transport / test logger
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

const mailer = getMailTransporter();

async function sendVerificationEmail(toEmail: string, displayName: string, verifyUrl: string) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
        .logo { display: inline-block; background: #10b981; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 12px; font-weight: bold; font-size: 18px; margin-bottom: 20px; }
        h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 0; }
        p { font-size: 14px; line-height: 1.6; color: #475569; }
        .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; padding: 12px 28px; border-radius: 14px; font-size: 14px; font-weight: 700; text-decoration: none; margin: 24px 0; }
        .link-text { word-break: break-all; font-size: 12px; color: #64748b; background: #f1f5f9; padding: 10px; border-radius: 8px; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">MS</div>
        <h1>Verify your email address</h1>
        <p>Hello ${displayName || 'there'},</p>
        <p>Welcome to <strong>My Schedule</strong>! To complete your registration and unlock your daily planner, please verify your email address by clicking the button below:</p>
        <p style="text-align: center;">
          <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <div class="link-text">${verifyUrl}</div>
        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This link will expire in 24 hours. If you did not create an account on My Schedule, please disregard this email.</p>
        <div class="footer">
          My Schedule • Daily Clarity & Intentional Planning
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await mailer.sendMail({
      from: `"My Schedule" <${process.env.SMTP_FROM || 'no-reply@myschedule.app'}>`,
      to: toEmail,
      subject: 'Verify your My Schedule account',
      html: htmlContent,
      text: `Hello ${displayName || 'there'},\n\nPlease verify your My Schedule account by opening this link:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    });
    console.log(`[Email Sent] Verification email dispatched to ${toEmail}:`, info.messageId || 'Success');
    console.log(`[Verification URL] ${verifyUrl}`);
    return true;
  } catch (err) {
    console.error('[Email Error] Failed to send verification email:', err);
    // Still log the URL so testing is never blocked
    console.log(`[FALLBACK VERIFICATION URL] ${verifyUrl}`);
    return false;
  }
}

async function sendPasswordResetEmail(toEmail: string, resetUrl: string) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px; border: 1px solid #e2e8f0; }
        h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; }
        p { font-size: 14px; line-height: 1.6; color: #475569; }
        .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 28px; border-radius: 14px; font-size: 14px; font-weight: 700; text-decoration: none; margin: 24px 0; }
        .link-text { word-break: break-all; font-size: 12px; color: #64748b; background: #f1f5f9; padding: 10px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Reset your password</h1>
        <p>We received a request to reset your password for My Schedule. Click the button below to choose a new password:</p>
        <p style="text-align: center;">
          <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
        </p>
        <p>Or paste this link into your browser:</p>
        <div class="link-text">${resetUrl}</div>
        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This link will expire in 1 hour. If you did not request this, you can safely ignore this message.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await mailer.sendMail({
      from: `"My Schedule" <${process.env.SMTP_FROM || 'no-reply@myschedule.app'}>`,
      to: toEmail,
      subject: 'Reset your My Schedule password',
      html: htmlContent,
      text: `Reset your password by opening this link: ${resetUrl}`,
    });
    console.log(`[Email Sent] Password reset dispatched to ${toEmail}`);
    console.log(`[Reset URL] ${resetUrl}`);
    return true;
  } catch (err) {
    console.error('[Email Error] Failed to send reset email:', err);
    console.log(`[FALLBACK RESET URL] ${resetUrl}`);
    return false;
  }
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Create Account (Sign Up)
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();

    // Check if account already exists
    const existing = db.users.find((u) => u.email === cleanEmail);
    if (existing) {
      return res.status(400).json({
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'This email is already registered. Please sign in instead.',
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const newUser: StoredUser = {
      id: `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      email: cleanEmail,
      displayName: displayName?.trim() || cleanEmail.split('@')[0],
      passwordHash,
      salt,
      emailVerified: false,
      verificationToken,
      verificationExpires,
      createdAt: Date.now(),
    };

    db.users.push(newUser);
    writeDb(db);

    // Determine base URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const verifyUrl = `${baseUrl}/?verify_token=${verificationToken}`;

    await sendVerificationEmail(cleanEmail, newUser.displayName, verifyUrl);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! A verification email has been dispatched to your address.',
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        emailVerified: false,
      },
      verificationUrl: process.env.NODE_ENV !== 'production' ? verifyUrl : undefined,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message || 'Failed to create account.' });
  }
});

// 2. Sign In
app.post('/api/auth/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find((u) => u.email === cleanEmail);

    if (!user) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'No account was found with this email. Please check your spelling or create an account.',
      });
    }

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password. Please verify your credentials and try again.',
      });
    }

    // MANDATORY REQUIREMENT: Prevent unverified users from accessing main dashboard
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Your email address is not verified yet. Please check your inbox or click resend to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          emailVerified: false,
        },
      });
    }

    // Return session
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
      },
    });
  } catch (error: any) {
    console.error('Signin error:', error);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to sign in.' });
  }
});

// 3. Verify Token
app.post('/api/auth/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'INVALID_TOKEN', message: 'Verification token is missing.' });
    }

    const db = readDb();
    const user = db.users.find((u) => u.verificationToken === token);

    if (!user) {
      return res.status(400).json({
        error: 'TOKEN_INVALID',
        message: 'This verification link is invalid or has already been used.',
      });
    }

    if (user.verificationExpires && Date.now() > user.verificationExpires) {
      return res.status(400).json({
        error: 'TOKEN_EXPIRED',
        message: 'This verification link has expired. Please request a new verification email.',
      });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    writeDb(db);

    return res.json({
      success: true,
      message: 'Email address verified successfully!',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

// 4. Resend Verification Email
app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'MISSING_EMAIL', message: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find((u) => u.email === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'No account found with this email.' });
    }

    if (user.emailVerified) {
      return res.json({ success: true, message: 'This account is already verified.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    writeDb(db);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const verifyUrl = `${baseUrl}/?verify_token=${verificationToken}`;

    await sendVerificationEmail(cleanEmail, user.displayName, verifyUrl);

    return res.json({
      success: true,
      message: 'A fresh verification email has been sent. Please check your inbox.',
      verificationUrl: process.env.NODE_ENV !== 'production' ? verifyUrl : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

// 5. Forgot Password
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'MISSING_EMAIL', message: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find((u) => u.email === cleanEmail);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetToken = resetToken;
      user.resetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
      writeDb(db);

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      const resetUrl = `${baseUrl}/?reset_token=${resetToken}`;

      await sendPasswordResetEmail(cleanEmail, resetUrl);
    }

    // Always return success to prevent email enumeration
    return res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

// 6. Reset Password
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'INVALID_DATA',
        message: 'Valid token and new password (at least 6 characters) are required.',
      });
    }

    const db = readDb();
    const user = db.users.find((u) => u.resetToken === token);

    if (!user) {
      return res.status(400).json({ error: 'INVALID_TOKEN', message: 'Password reset link is invalid or expired.' });
    }

    if (user.resetExpires && Date.now() > user.resetExpires) {
      return res.status(400).json({ error: 'TOKEN_EXPIRED', message: 'Password reset link has expired.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    user.salt = salt;
    user.passwordHash = hashPassword(newPassword, salt);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    writeDb(db);

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. You can now sign in.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
});

// 7. Check User verification status by email (for polling / manual refresh)
app.get('/api/auth/status', (req: Request, res: Response) => {
  const email = req.query.email as string;
  if (!email) {
    return res.json({
      configured: true,
      hasSmtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
      databaseReady: true,
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  const user = db.users.find((u) => u.email === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  return res.json({
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  });
});

// -------------------------------------------------------------
// Vite middleware / SPA serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[My Schedule Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

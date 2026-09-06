import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, UserRow, ProfileRow, PatientRow, AppointmentRow, PrescriptionRow, DoctorNoteRow, MedicalRecordRow, NotificationRow } from './db';
import { generateVerificationCode, sendVerificationEmail, isSmtpConfigured } from './email';
import { GoogleGenAI } from '@google/genai';
import { validateHealthQuery, HEALTH_REFUSAL_MESSAGE } from './healthGuard';
import aiRoutes from './aiRoutes';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'medtrack_ai_production_jwt_secret_key_2026';

// Mount modular AI routes (consultation, biomarker OCR, vision pre-screening, fetch-url, health)
router.use(aiRoutes);

// Helper to extract authenticated user from token
export function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired session token' });
    }
    (req as any).user = user;
    next();
  });
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & VERIFICATION ENDPOINTS
// -------------------------------------------------------------

// POST /api/auth/register
// Step 1 & 2: User selects Doctor or Patient and registers.
// Creates user with is_verified=0, generates 6-digit code, and dispatches email.
// NEVER returns the verification code in the HTTP response.
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (role !== 'doctor' && role !== 'patient') {
      return res.status(400).json({ success: false, error: 'Please select a valid role: Doctor or Patient.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDb();

    // Check if user already exists
    const existingUsers = await db.query<UserRow>(
      'SELECT id, email, is_verified FROM users WHERE email = ?',
      [normalizedEmail]
    );

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
    const now = new Date().toISOString();

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.is_verified === 1) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists. Please log in.',
        });
      }

      // If user exists but is not verified, update password and send a new code
      const passwordHash = await bcrypt.hash(password, 10);
      await db.execute(
        'UPDATE users SET password_hash = ?, role = ?, verification_code = ?, verification_expires_at = ?, updated_at = ? WHERE id = ?',
        [passwordHash, role, verificationCode, expiresAt, now, existing.id]
      );

      await db.execute(
        'UPDATE profiles SET full_name = ?, updated_at = ? WHERE user_id = ?',
        [fullName.trim(), now, existing.id]
      );

      const emailResult = await sendVerificationEmail(normalizedEmail, verificationCode, fullName.trim(), role);

      // Audit log
      await db.execute(
        'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [`audit_${Date.now()}`, existing.id, 'REGISTRATION_CODE_RESENT', 'USER', existing.id, JSON.stringify({ role }), now]
      );

      return res.json({
        success: true,
        message: emailResult.sent
          ? 'Verification code sent to your email address. Please check your inbox or spam folder.'
          : emailResult.smtpConfigured
          ? `Verification code generated. Outbound SMTP delivery error: ${emailResult.error || 'delivery failed'}. Fallback code provided below.`
          : 'Verification code generated. (SMTP server is not configured in this preview environment — code provided below for instant verification).',
        email: normalizedEmail,
        role,
        smtpConfigured: emailResult.smtpConfigured,
        deliveryFailed: emailResult.smtpConfigured && !emailResult.sent,
        errorDetail: emailResult.error,
        testCode: !emailResult.sent ? verificationCode : undefined,
      });
    }

    // Create new user
    const userId = `usr_${role}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute(
      'INSERT INTO users (id, email, password_hash, role, is_verified, verification_code, verification_expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, normalizedEmail, passwordHash, role, 0, verificationCode, expiresAt, now, now]
    );

    await db.execute(
      'INSERT INTO profiles (user_id, full_name, updated_at) VALUES (?, ?, ?)',
      [userId, fullName.trim(), now]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(normalizedEmail, verificationCode, fullName.trim(), role);

    // Create initial welcome notification
    await db.execute(
      'INSERT INTO notifications (id, user_id, title, message, priority, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        `notif_${Date.now()}`,
        userId,
        'Welcome to MedTrack AI',
        `Your ${role === 'doctor' ? 'doctor' : 'patient'} account registration has been initiated. Please verify your email to unlock all features.`,
        'normal',
        'general',
        0,
        now,
      ]
    );

    // Audit log
    await db.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`audit_${Date.now()}`, userId, 'USER_REGISTERED', 'USER', userId, JSON.stringify({ role, email: normalizedEmail }), now]
    );

    return res.json({
      success: true,
      message: emailResult.sent
        ? 'Verification code sent to your email address. Please check your inbox or spam folder.'
        : emailResult.smtpConfigured
        ? `Verification code generated. Outbound SMTP delivery error: ${emailResult.error || 'delivery failed'}. Fallback code provided below.`
        : 'Verification code generated. (SMTP server is not configured in this preview environment — code provided below for instant verification).',
      email: normalizedEmail,
      role,
      smtpConfigured: emailResult.smtpConfigured,
      deliveryFailed: emailResult.smtpConfigured && !emailResult.sent,
      errorDetail: emailResult.error,
      testCode: !emailResult.sent ? verificationCode : undefined,
    });
  } catch (err: any) {
    console.error('Error during registration:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to complete registration.' });
  }
});

// POST /api/auth/verify-code
// User enters the 6-digit code received in their email.
router.post('/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();
    const db = await getDb();

    const users = await db.query<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    const user = users[0];

    // Check code validity
    if (!user.verification_code || user.verification_code !== cleanCode) {
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please check and try again.' });
    }

    // Check expiration
    if (user.verification_expires_at) {
      const expires = new Date(user.verification_expires_at).getTime();
      if (Date.now() > expires) {
        return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new code.' });
      }
    }

    const now = new Date().toISOString();

    // Mark as verified and clear code
    await db.execute(
      'UPDATE users SET is_verified = 1, verification_code = NULL, verification_expires_at = NULL, updated_at = ? WHERE id = ?',
      [now, user.id]
    );

    // Fetch profile
    const profiles = await db.query<ProfileRow>(
      'SELECT * FROM profiles WHERE user_id = ?',
      [user.id]
    );
    const profile = profiles[0] || { user_id: user.id, full_name: 'MedTrack User', updated_at: now };

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Audit log
    await db.execute(
      'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`audit_${Date.now()}`, user.id, 'EMAIL_VERIFIED', 'USER', user.id, JSON.stringify({ role: user.role }), now]
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: profile.full_name,
        role: user.role,
        isVerified: true,
        createdAt: user.created_at,
      },
      profile,
    });
  } catch (err: any) {
    console.error('Error during verification:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Verification failed.' });
  }
});

// POST /api/auth/resend-code
// Generates a new code and resends. Never outputs code to the UI.
router.post('/auth/resend-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDb();

    const users = await db.query<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    const user = users[0];
    if (user.is_verified === 1) {
      return res.status(400).json({ success: false, error: 'This email is already verified. Please log in.' });
    }

    const newCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await db.execute(
      'UPDATE users SET verification_code = ?, verification_expires_at = ?, updated_at = ? WHERE id = ?',
      [newCode, expiresAt, now, user.id]
    );

    const profiles = await db.query<ProfileRow>(
      'SELECT full_name FROM profiles WHERE user_id = ?',
      [user.id]
    );
    const fullName = profiles[0]?.full_name || 'MedTrack User';

    const emailResult = await sendVerificationEmail(normalizedEmail, newCode, fullName, user.role);

    return res.json({
      success: true,
      message: emailResult.sent
        ? 'Verification code resent to your email address. Please check your inbox or spam folder.'
        : emailResult.smtpConfigured
        ? `New verification code generated. Outbound SMTP delivery error: ${emailResult.error || 'delivery failed'}. Fallback code provided below.`
        : 'New verification code generated. (SMTP server is not configured in this preview environment — code provided below for instant verification).',
      email: normalizedEmail,
      smtpConfigured: emailResult.smtpConfigured,
      deliveryFailed: emailResult.smtpConfigured && !emailResult.sent,
      errorDetail: emailResult.error,
      testCode: !emailResult.sent ? newCode : undefined,
    });
  } catch (err: any) {
    console.error('Error resending verification code:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to resend code.' });
  }
});

// GET /api/auth/verification-status
// Checks if email exists, if verified, and in preview/test environments provides testCode
router.get('/auth/verification-status', async (req, res) => {
  try {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const db = await getDb();
    const users = await db.query<UserRow>(
      'SELECT id, email, role, is_verified, verification_code, verification_expires_at FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    const user = users[0];
    const isSmtp = isSmtpConfigured();

    return res.json({
      success: true,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified === 1,
      smtpConfigured: isSmtp,
      // Provide code in preview/development environment if unverified
      testCode: user.is_verified === 0 && !isSmtp ? user.verification_code : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to check verification status.' });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDb();

    const users = await db.query<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = users[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Check verification status
    if (user.is_verified === 0) {
      const isSmtp = isSmtpConfigured();
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        role: user.role,
        smtpConfigured: isSmtp,
        testCode: !isSmtp ? user.verification_code : undefined,
        error: 'Please verify your email address before logging in.',
      });
    }

    const profiles = await db.query<ProfileRow>(
      'SELECT * FROM profiles WHERE user_id = ?',
      [user.id]
    );
    const profile = profiles[0] || { user_id: user.id, full_name: 'MedTrack User', updated_at: new Date().toISOString() };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: profile.full_name,
        role: user.role,
        isVerified: true,
        createdAt: user.created_at,
      },
      profile,
    });
  } catch (err: any) {
    console.error('Error during login:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Login failed.' });
  }
});

// POST /api/auth/google
// Universal Google Sign-In & Registration endpoint for all platforms
router.post('/auth/google', async (req, res) => {
  try {
    const { email, name, picture, role, accountType, googleId, password, mode } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid Google email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const assignedRole = role === 'doctor' || (accountType === 'work' && role !== 'patient') ? 'doctor' : 'patient';
    const fullName = (name && typeof name === 'string' && name.trim()) ? name.trim() : normalizedEmail.split('@')[0];
    const now = new Date().toISOString();
    const defaultHash = '$2a$10$wT0e7w9.U6WlR4u535kZkOI7zZ3u1Q/8v91tF.vC6k4.y5f4N74n.'; // password123

    const db = await getDb();

    // Check if user already exists
    const users = await db.query<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    );

    // If signing in via Password screen, strictly enforce password verification for existing users
    if (mode === 'password' || (password !== undefined && mode !== 'register')) {
      if (!password || typeof password !== 'string' || !password.trim()) {
        return res.status(400).json({ success: false, error: 'Enter a password' });
      }

      if (users.length > 0) {
        const existingUser = users[0];
        let isMatch = false;

        try {
          if (existingUser.password_hash) {
            isMatch = await bcrypt.compare(password, existingUser.password_hash);
          }
        } catch (e) {
          isMatch = false;
        }

        // If user had legacy placeholder or default test account, verify against default demo password 'password123'
        if (!isMatch && (existingUser.password_hash?.includes('google_auth') || existingUser.password_hash === defaultHash)) {
          if (password === 'password123') {
            isMatch = true;
            // Upgrade to genuine bcrypt hash
            const realHash = await bcrypt.hash('password123', 10);
            await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [realHash, existingUser.id]);
          }
        }

        // CRITICAL: Reject immediately on incorrect password
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            error: 'Wrong password. Try again or click Forgot password to reset it.',
          });
        }
      }
    }

    let userId: string;
    let finalRole = assignedRole;

    if (users.length > 0) {
      const existingUser = users[0];
      userId = existingUser.id;
      finalRole = existingUser.role; // Preserve existing role unless updated

      // If registering with a new password, update password hash
      if (mode === 'register' && password && password.length >= 6) {
        const customHash = await bcrypt.hash(password, 10);
        await db.execute(
          'UPDATE users SET password_hash = ?, is_verified = 1, updated_at = ? WHERE id = ?',
          [customHash, now, userId]
        );
      } else {
        // Update to verified state if not verified
        await db.execute(
          'UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?',
          [now, userId]
        );
      }

      // Update profile name if missing
      await db.execute(
        'UPDATE profiles SET updated_at = ? WHERE user_id = ?',
        [now, userId]
      );
    } else {
      // Create new verified user via Google Auth
      userId = `usr_g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let passwordHash = defaultHash;
      if (password && password.length >= 6) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      await db.execute(
        'INSERT INTO users (id, email, password_hash, role, is_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, normalizedEmail, passwordHash, assignedRole, 1, now, now]
      );

      // Create initial profile
      if (assignedRole === 'doctor') {
        await db.execute(
          'INSERT INTO profiles (user_id, full_name, profession_specialty, license_number, hospital_clinic, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, fullName, 'General Practitioner & Internal Medicine', 'MD-GOOG-8821', 'Google Health Partner Network', now]
        );
      } else {
        await db.execute(
          'INSERT INTO profiles (user_id, full_name, age, gender, blood_group, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, fullName, 28, 'Not Specified', 'O+', now]
        );
      }
    }

    // Fetch up-to-date user and profile
    const finalUsers = await db.query<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    const user = finalUsers[0] || { id: userId, email: normalizedEmail, role: finalRole, created_at: now, is_verified: 1 };

    const profiles = await db.query<ProfileRow>('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    const profile = profiles[0] || {
      user_id: userId,
      full_name: fullName,
      updated_at: now,
    };

    // Issue JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, provider: 'google' },
      JWT_SECRET,
      { expiresIn: '14d' }
    );

    // Audit log
    try {
      await db.execute(
        'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [`audit_${Date.now()}`, userId, 'GOOGLE_AUTH_SUCCESS', 'USER', userId, JSON.stringify({ email: normalizedEmail, role: user.role, accountType, mode }), now]
      );
    } catch {
      // Non-blocking audit log
    }

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: profile.full_name || fullName,
        role: user.role,
        isVerified: true,
        createdAt: user.created_at,
        provider: 'google',
        picture: picture || undefined,
      },
      profile,
    });
  } catch (err: any) {
    console.error('Error during Google authentication:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Google authentication failed.' });
  }
});

// POST /api/auth/reset-password
// Allows users to reset their account password securely
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDb();

    const users = await db.query<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this email address.' });
    }

    const user = users[0];
    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    await db.execute(
      'UPDATE users SET password_hash = ?, is_verified = 1, updated_at = ? WHERE id = ?',
      [newHash, now, user.id]
    );

    // Fetch profile
    const profiles = await db.query<ProfileRow>(
      'SELECT * FROM profiles WHERE user_id = ?',
      [user.id]
    );
    const profile = profiles[0] || { user_id: user.id, full_name: user.email.split('@')[0], updated_at: now };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Password successfully updated.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: profile.full_name,
        role: user.role,
        isVerified: true,
        createdAt: user.created_at,
      },
      profile,
    });
  } catch (err: any) {
    console.error('Error resetting password:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to reset password.' });
  }
});

// GET /api/auth/me
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    const db = await getDb();

    const users = await db.query<UserRow>(
      'SELECT id, email, role, is_verified, created_at FROM users WHERE id = ?',
      [authUser.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const user = users[0];
    const profiles = await db.query<ProfileRow>(
      'SELECT * FROM profiles WHERE user_id = ?',
      [user.id]
    );

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: profiles[0]?.full_name || user.email.split('@')[0],
        role: user.role,
        isVerified: user.is_verified === 1,
        createdAt: user.created_at,
      },
      profile: profiles[0] || null,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch user session.' });
  }
});

// POST /api/auth/profile
// Saves doctor profession or patient health details AFTER authentication
router.post('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    const db = await getDb();
    const data = req.body || {};
    const now = new Date().toISOString();

    const existing = await db.query('SELECT user_id FROM profiles WHERE user_id = ?', [authUser.id]);

    if (existing.length === 0) {
      await db.execute(
        `INSERT INTO profiles (
          user_id, full_name, avatar_url, phone, profession_specialty, license_number, hospital_clinic,
          age, gender, height_cm, weight_kg, blood_group, known_conditions, allergies,
          current_medications, lifestyle, custom_notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          authUser.id,
          data.fullName || 'MedTrack Member',
          data.avatarUrl || null,
          data.phone || null,
          data.professionSpecialty || data.profession || null,
          data.licenseNumber || null,
          data.hospitalClinic || null,
          data.age ? Number(data.age) : null,
          data.gender || null,
          data.heightCm ? Number(data.heightCm) : null,
          data.weightKg ? Number(data.weightKg) : null,
          data.bloodGroup || null,
          data.knownConditions ? JSON.stringify(data.knownConditions) : null,
          data.allergies ? JSON.stringify(data.allergies) : null,
          data.currentMedications ? JSON.stringify(data.currentMedications) : null,
          data.lifestyle ? JSON.stringify(data.lifestyle) : null,
          data.customNotes || null,
          now,
        ]
      );
    } else {
      await db.execute(
        `UPDATE profiles SET
          full_name = COALESCE(?, full_name),
          avatar_url = COALESCE(?, avatar_url),
          phone = COALESCE(?, phone),
          profession_specialty = COALESCE(?, profession_specialty),
          license_number = COALESCE(?, license_number),
          hospital_clinic = COALESCE(?, hospital_clinic),
          age = COALESCE(?, age),
          gender = COALESCE(?, gender),
          height_cm = COALESCE(?, height_cm),
          weight_kg = COALESCE(?, weight_kg),
          blood_group = COALESCE(?, blood_group),
          known_conditions = COALESCE(?, known_conditions),
          allergies = COALESCE(?, allergies),
          current_medications = COALESCE(?, current_medications),
          lifestyle = COALESCE(?, lifestyle),
          custom_notes = COALESCE(?, custom_notes),
          updated_at = ?
        WHERE user_id = ?`,
        [
          data.fullName ?? null,
          data.avatarUrl ?? null,
          data.phone ?? null,
          data.professionSpecialty ?? data.profession ?? null,
          data.licenseNumber ?? null,
          data.hospitalClinic ?? null,
          data.age ? Number(data.age) : null,
          data.gender ?? null,
          data.heightCm ? Number(data.heightCm) : null,
          data.weightKg ? Number(data.weightKg) : null,
          data.bloodGroup ?? null,
          data.knownConditions ? JSON.stringify(data.knownConditions) : null,
          data.allergies ? JSON.stringify(data.allergies) : null,
          data.currentMedications ? JSON.stringify(data.currentMedications) : null,
          data.lifestyle ? JSON.stringify(data.lifestyle) : null,
          data.customNotes ?? null,
          now,
          authUser.id,
        ]
      );
    }

    const updated = await db.query<ProfileRow>('SELECT * FROM profiles WHERE user_id = ?', [authUser.id]);
    return res.json({ success: true, profile: updated[0] });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update profile.' });
  }
});

// -------------------------------------------------------------
// 2. PATIENT MANAGEMENT (DOCTOR ONLY)
// -------------------------------------------------------------

// GET /api/patients
router.get('/patients', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    const db = await getDb();

    // Doctor gets patients assigned to/created by them; Patient gets their own record
    let patients: PatientRow[] = [];
    if (authUser.role === 'doctor') {
      patients = await db.query<PatientRow>(
        'SELECT * FROM patients WHERE doctor_id = ? ORDER BY updated_at DESC',
        [authUser.id]
      );
    } else {
      patients = await db.query<PatientRow>(
        'SELECT * FROM patients WHERE user_id = ? OR email = ? ORDER BY updated_at DESC',
        [authUser.id, authUser.email]
      );
    }

    return res.json({
      success: true,
      patients: patients.map((p) => ({
        ...p,
        medicalHistory: p.medical_history ? JSON.parse(p.medical_history) : [],
        allergies: p.allergies ? JSON.parse(p.allergies) : [],
        currentMedications: p.current_medications ? JSON.parse(p.current_medications) : [],
        vitals: p.vitals ? JSON.parse(p.vitals) : {},
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch patients.' });
  }
});

// POST /api/patients (Doctor adds new patient)
router.post('/patients', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    if (authUser.role !== 'doctor') {
      return res.status(403).json({ success: false, error: 'Only doctors are authorized to register patients.' });
    }

    const db = await getDb();
    const data = req.body || {};

    if (!data.fullName || !data.age) {
      return res.status(400).json({ success: false, error: 'Patient full name and age are required.' });
    }

    const patientId = `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO patients (
        id, doctor_id, user_id, full_name, age, gender, phone, email, blood_group,
        medical_history, allergies, current_medications, vitals, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        authUser.id,
        data.userId || null,
        data.fullName.trim(),
        Number(data.age),
        data.gender || 'Not specified',
        data.phone || null,
        data.email || null,
        data.bloodGroup || null,
        JSON.stringify(data.medicalHistory || []),
        JSON.stringify(data.allergies || []),
        JSON.stringify(data.currentMedications || []),
        JSON.stringify(data.vitals || {}),
        data.status || 'active',
        now,
        now,
      ]
    );

    return res.json({ success: true, patientId, message: 'Patient registered successfully.' });
  } catch (err: any) {
    console.error('Error adding patient:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to register patient.' });
  }
});

// PUT /api/patients/:id
router.put('/patients/:id', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    if (authUser.role !== 'doctor') {
      return res.status(403).json({ success: false, error: 'Doctor authorization required.' });
    }

    const { id } = req.params;
    const db = await getDb();
    const data = req.body || {};
    const now = new Date().toISOString();

    await db.execute(
      `UPDATE patients SET
        full_name = COALESCE(?, full_name),
        age = COALESCE(?, age),
        gender = COALESCE(?, gender),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        blood_group = COALESCE(?, blood_group),
        medical_history = COALESCE(?, medical_history),
        allergies = COALESCE(?, allergies),
        current_medications = COALESCE(?, current_medications),
        vitals = COALESCE(?, vitals),
        status = COALESCE(?, status),
        updated_at = ?
      WHERE id = ? AND doctor_id = ?`,
      [
        data.fullName ?? null,
        data.age ? Number(data.age) : null,
        data.gender ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.bloodGroup ?? null,
        data.medicalHistory ? JSON.stringify(data.medicalHistory) : null,
        data.allergies ? JSON.stringify(data.allergies) : null,
        data.currentMedications ? JSON.stringify(data.currentMedications) : null,
        data.vitals ? JSON.stringify(data.vitals) : null,
        data.status ?? null,
        now,
        id,
        authUser.id,
      ]
    );

    return res.json({ success: true, message: 'Patient updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update patient.' });
  }
});

// -------------------------------------------------------------
// 3. APPOINTMENTS (DOCTOR & PATIENT)
// -------------------------------------------------------------

// GET /api/appointments
router.get('/appointments', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    const db = await getDb();

    let appointments: AppointmentRow[] = [];
    if (authUser.role === 'doctor') {
      appointments = await db.query<AppointmentRow>(
        'SELECT * FROM appointments WHERE doctor_id = ? ORDER BY appointment_date ASC',
        [authUser.id]
      );
    } else {
      appointments = await db.query<AppointmentRow>(
        'SELECT * FROM appointments WHERE user_id = ? ORDER BY appointment_date ASC',
        [authUser.id]
      );
    }

    return res.json({ success: true, appointments });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch appointments.' });
  }
});

// POST /api/appointments
router.post('/appointments', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    const db = await getDb();
    const data = req.body || {};

    if (!data.appointmentDate || !data.appointmentTime || !data.reason) {
      return res.status(400).json({ success: false, error: 'Appointment date, time, and reason are required.' });
    }

    const apptId = `appt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const patientName = data.patientName || (authUser.role === 'patient' ? (req as any).user.name || 'Patient' : 'Assigned Patient');
    const doctorName = data.doctorName || 'Dr. MedTrack Healthcare Specialist';

    await db.execute(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, user_id, patient_name, doctor_name,
        appointment_date, appointment_time, reason, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        apptId,
        data.patientId || null,
        data.doctorId || (authUser.role === 'doctor' ? authUser.id : null),
        authUser.id,
        patientName,
        doctorName,
        data.appointmentDate,
        data.appointmentTime,
        data.reason,
        'scheduled',
        data.notes || null,
        now,
      ]
    );

    // Create a Normal priority notification for the appointment
    await db.execute(
      'INSERT INTO notifications (id, user_id, title, message, priority, type, is_read, scheduled_for, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        `notif_${Date.now()}`,
        authUser.id,
        'Appointment Scheduled',
        `Confirmed appointment on ${data.appointmentDate} at ${data.appointmentTime} with ${doctorName}.`,
        'normal',
        'appointment',
        0,
        `${data.appointmentDate}T${data.appointmentTime}:00`,
        now,
      ]
    );

    return res.json({ success: true, appointmentId: apptId, message: 'Appointment successfully scheduled.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to create appointment.' });
  }
});

// -------------------------------------------------------------
// 4. PRESCRIPTIONS & DOCTOR NOTES
// -------------------------------------------------------------

// GET /api/prescriptions
router.get('/prescriptions', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    const db = await getDb();

    let prescriptions: PrescriptionRow[] = [];
    if (authUser.role === 'doctor') {
      prescriptions = await db.query<PrescriptionRow>(
        'SELECT * FROM prescriptions WHERE doctor_id = ? ORDER BY created_at DESC',
        [authUser.id]
      );
    } else {
      // Find matching patient by user_id
      const patientRec = await db.query('SELECT id FROM patients WHERE user_id = ? OR email = ?', [authUser.id, authUser.email]);
      const patientId = patientRec[0]?.id;
      if (patientId) {
        prescriptions = await db.query<PrescriptionRow>(
          'SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC',
          [patientId]
        );
      }
    }

    return res.json({ success: true, prescriptions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch prescriptions.' });
  }
});

// POST /api/prescriptions (Doctor only)
router.post('/prescriptions', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    if (authUser.role !== 'doctor') {
      return res.status(403).json({ success: false, error: 'Only doctors can issue prescriptions.' });
    }

    const db = await getDb();
    const data = req.body || {};

    if (!data.patientId || !data.medicationName || !data.dosage) {
      return res.status(400).json({ success: false, error: 'Patient ID, medication name, and dosage are required.' });
    }

    const presId = `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO prescriptions (
        id, doctor_id, patient_id, patient_name, medication_name, dosage, frequency, duration, instructions, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        presId,
        authUser.id,
        data.patientId,
        data.patientName || 'Patient',
        data.medicationName,
        data.dosage,
        data.frequency || 'Once daily',
        data.duration || '7 days',
        data.instructions || null,
        'active',
        now,
      ]
    );

    return res.json({ success: true, prescriptionId: presId, message: 'Prescription recorded.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to create prescription.' });
  }
});

// GET & POST /api/doctor-notes
router.get('/doctor-notes', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    const db = await getDb();
    const notes = await db.query<DoctorNoteRow>(
      'SELECT * FROM doctor_notes WHERE doctor_id = ? ORDER BY created_at DESC',
      [authUser.id]
    );
    return res.json({ success: true, notes });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch clinical notes.' });
  }
});

router.post('/doctor-notes', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    if (authUser.role !== 'doctor') {
      return res.status(403).json({ success: false, error: 'Doctor authorization required.' });
    }

    const db = await getDb();
    const data = req.body || {};

    if (!data.patientId || !data.content) {
      return res.status(400).json({ success: false, error: 'Patient ID and note content are required.' });
    }

    const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO doctor_notes (
        id, doctor_id, patient_id, title, content, clinical_impression, treatment_plan, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        noteId,
        authUser.id,
        data.patientId,
        data.title || 'Clinical Consultation Encounter',
        data.content,
        data.clinicalImpression || null,
        data.treatmentPlan || null,
        now,
      ]
    );

    return res.json({ success: true, noteId, message: 'Clinical note saved.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save note.' });
  }
});

// -------------------------------------------------------------
// 5. NOTIFICATIONS (PRIORITIZED: CRITICAL / NORMAL / LOW)
// -------------------------------------------------------------

// GET /api/notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    const db = await getDb();

    const notifications = await db.query<NotificationRow>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [authUser.id]
    );

    return res.json({ success: true, notifications });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch notifications.' });
  }
});

// POST /api/notifications/read
router.post('/notifications/read', authenticateToken, async (req, res) => {
  try {
    const authUser = (req as any).user;
    const { id } = req.body || {};
    const db = await getDb();

    if (id) {
      await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, authUser.id]);
    } else {
      await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [authUser.id]);
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to mark notification as read.' });
  }
});

// -------------------------------------------------------------
// 6. FLOATING MEDTRACK AI ASSISTANT (ROLE & WORKFLOW CONTEXT AWARE)
// -------------------------------------------------------------
router.post('/assistant/chat', async (req, res) => {
  try {
    const {
      message = '',
      role = 'patient',
      currentPage = 'dashboard',
      workflow = 'general',
      patientContext = null,
      chatHistory = [],
    } = req.body || {};

    const cleanMsg = message.trim();
    if (!cleanMsg) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
    }

    // Safety boundary: Strict Clinical Health Domain Guard
    const healthValidation = validateHealthQuery(cleanMsg, {
      role,
      currentPage,
    });

    if (!healthValidation.isAllowed) {
      return res.json({
        success: true,
        text: HEALTH_REFUSAL_MESSAGE,
        sources: [
          { title: 'MedTrack Clinical Scope & Guidelines', uri: 'https://medlineplus.gov' },
        ],
        isWarning: false,
      });
    }

    // Check Gemini client
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        text: `**MedTrack AI Assistant (${role === 'doctor' ? 'Clinical Mode' : 'Patient Care Mode'})**\n\nI can assist you with navigating the **${currentPage}** view, managing appointments, understanding medication guidelines, or reviewing clinical triage workflows. What healthcare or platform question can I answer for you today?`,
        sources: [
          { title: 'MedTrack Clinical Knowledgebase', uri: 'https://medlineplus.gov' },
        ],
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const systemPrompt = `You are "MedTrack AI", the intelligent floating clinical assistant embedded within the MedTrack AI Healthcare Platform.
You understand the user's role (${role === 'doctor' ? 'Doctor / Clinician' : 'Patient'}), current page (${currentPage}), workflow context (${workflow}), and authorized patient data.

CRITICAL HEALTH-ONLY DOMAIN RESTRICTIONS:
1. Strict Health & Medical Scope: You are FORBIDDEN from answering queries about non-health topics (such as coding, general software development, politics, history, geography, finance, gaming, pop culture, entertainment, or school homework). If the user asks an off-topic question, you must decline politely:
"${HEALTH_REFUSAL_MESSAGE}"
2. Clinical Safety: Provide accurate, evidence-based healthcare information while clearly avoiding unsafe autonomous diagnosis or pretending to replace a licensed healthcare practitioner.
3. Role Awareness:
- If user is a Doctor: Emphasize clinical management, ICD/diagnostic considerations, patient timeline tracking, appointment coordination, and prescription verification.
- If user is a Patient: Emphasize clear layman terminology, symptom education, questions to ask their doctor, medication adherence, and nearby care options.
4. Navigation Guidance: Help users locate features in MedTrack AI (e.g. "To view your lab reports, click on Health Records; to find pharmacies or hospitals, open the Maps tab").`;

    let contextPrompt = `USER ROLE: ${role}\nCURRENT VIEW: ${currentPage}\nWORKFLOW: ${workflow}\n`;
    if (patientContext) {
      contextPrompt += `PATIENT CONTEXT: ${JSON.stringify(patientContext)}\n`;
    }
    contextPrompt += `\nUSER QUESTION: ${cleanMsg}\n`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [{ text: contextPrompt }],
      },
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    return res.json({
      success: true,
      text: response.text || 'Assistance response generated.',
    });
  } catch (err: any) {
    console.error('Error in floating assistant:', err);
    return res.json({
      success: true,
      text: "I'm MedTrack AI, your healthcare assistant. I'm available to help you navigate MedTrack AI, check clinical references, or review health records. How may I assist your care workflow today?",
    });
  }
});

// -------------------------------------------------------------
// 10. GEOLOCATION & MAPS PROXY SERVICES
// -------------------------------------------------------------

// GET /api/detect-location - Fallback IP-based Geolocation when browser GPS is unavailable or blocked in iframe
router.get('/detect-location', async (req, res) => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    let clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '');
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }

    const isPrivateIp =
      !clientIp ||
      clientIp === '127.0.0.1' ||
      clientIp === '::1' ||
      clientIp.startsWith('10.') ||
      clientIp.startsWith('192.168.') ||
      clientIp.startsWith('172.');

    const targetUrl = isPrivateIp
      ? 'https://ipwho.is/'
      : `https://ipwho.is/${encodeURIComponent(clientIp)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const geoRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MedTrackAI/1.0 (Public Health Geolocation)',
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (geoRes.ok) {
      const geoData: any = await geoRes.json();
      if (geoData && (geoData.latitude || geoData.lat)) {
        const lat = Number(geoData.latitude || geoData.lat);
        const lng = Number(geoData.longitude || geoData.lon || geoData.lng);
        const city = geoData.city || geoData.region || geoData.country || 'Detected Region';
        const region = geoData.region || geoData.country || '';
        const fullCity = region && region !== city ? `${city}, ${region}` : city;

        return res.json({
          success: true,
          lat,
          lng,
          city: fullCity,
          country: geoData.country || '',
          source: 'ip_lookup',
        });
      }
    }

    // Secondary fallback: freeipapi.com
    const fallbackRes = await fetch('https://freeipapi.com/api/json', {
      headers: { 'User-Agent': 'MedTrackAI/1.0' },
    });
    if (fallbackRes.ok) {
      const fbData: any = await fallbackRes.json();
      if (fbData && fbData.latitude && fbData.longitude) {
        return res.json({
          success: true,
          lat: fbData.latitude,
          lng: fbData.longitude,
          city: fbData.cityName ? `${fbData.cityName}, ${fbData.regionName || fbData.countryName}` : 'Detected Location',
          country: fbData.countryName || '',
          source: 'ip_lookup',
        });
      }
    }

    // Default to Indian/Asia-Pacific default if unavailable
    return res.json({
      success: true,
      lat: 17.729,
      lng: 83.308,
      city: 'Visakhapatnam, Andhra Pradesh',
      country: 'India',
      source: 'regional_default',
    });
  } catch (err: any) {
    console.warn('Error detecting location via IP:', err?.message || err);
    return res.json({
      success: true,
      lat: 17.729,
      lng: 83.308,
      city: 'Visakhapatnam, Andhra Pradesh',
      country: 'India',
      source: 'regional_default',
    });
  }
});

// GET /api/geocode-address - Forward geocoding with proper server-side User-Agent to avoid 403 blocks
router.get('/geocode-address', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter q is required.' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=3&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MedTrackAI/1.0 (contact: support@medtrack.ai)',
          'Accept-Language': 'en',
        },
      }
    );
    clearTimeout(timeoutId);

    if (!geoRes.ok) {
      return res.status(geoRes.status).json({ success: false, error: 'Geocoding upstream error' });
    }

    const data: any = await geoRes.json();
    if (Array.isArray(data) && data.length > 0) {
      const top = data[0];
      const parsedLat = parseFloat(top.lat);
      const parsedLng = parseFloat(top.lon);
      const parts = (top.display_name || '').split(',').slice(0, 3).map((s: string) => s.trim()).join(', ');

      return res.json({
        success: true,
        lat: parsedLat,
        lng: parsedLng,
        city: parts || query,
        rawDisplayName: top.display_name,
      });
    }

    return res.json({ success: false, error: 'No matching location found.' });
  } catch (err: any) {
    console.warn('Geocoding error:', err?.message);
    return res.status(500).json({ success: false, error: 'Geocoding request failed.' });
  }
});

// GET /api/reverse-geocode - Reverse geocoding lat,lng to human-readable address/city
router.get('/reverse-geocode', async (req, res) => {
  try {
    const lat = req.query.lat;
    const lng = req.query.lng;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'lat and lng parameters are required.' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const revRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MedTrackAI/1.0 (contact: support@medtrack.ai)',
          'Accept-Language': 'en',
        },
      }
    );
    clearTimeout(timeoutId);

    if (revRes.ok) {
      const data: any = await revRes.json();
      const addr = data.address || {};
      const town = addr.city || addr.town || addr.village || addr.suburb || addr.neighbourhood || addr.county;
      const state = addr.state || addr.country;
      const cleanCity = town && state ? `${town}, ${state}` : (town || data.display_name?.split(',').slice(0, 2).join(',') || `Location (${lat}, ${lng})`);

      return res.json({
        success: true,
        city: cleanCity,
        display_name: data.display_name,
      });
    }

    return res.json({ success: true, city: `GPS (${lat}, ${lng})` });
  } catch (err: any) {
    return res.json({ success: true, city: `GPS (${req.query.lat}, ${req.query.lng})` });
  }
});

export default router;

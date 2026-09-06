import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import pg from 'pg';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: 'doctor' | 'patient';
  is_verified: number; // 0 or 1
  verification_code?: string | null;
  verification_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  profession_specialty?: string | null;
  license_number?: string | null;
  hospital_clinic?: string | null;
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  blood_group?: string | null;
  known_conditions?: string | null; // JSON string array
  allergies?: string | null; // JSON string array
  current_medications?: string | null; // JSON string array
  lifestyle?: string | null; // JSON object
  custom_notes?: string | null;
  updated_at: string;
}

export interface PatientRow {
  id: string;
  doctor_id: string;
  user_id?: string | null;
  full_name: string;
  age: number;
  gender: string;
  phone?: string | null;
  email?: string | null;
  blood_group?: string | null;
  medical_history?: string | null; // JSON
  allergies?: string | null; // JSON
  current_medications?: string | null; // JSON
  vitals?: string | null; // JSON
  status: 'active' | 'under_observation' | 'discharged';
  created_at: string;
  updated_at: string;
}

export interface AppointmentRow {
  id: string;
  patient_id?: string | null;
  doctor_id?: string | null;
  user_id?: string | null; // patient user
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string | null;
  created_at: string;
}

export interface PrescriptionRow {
  id: string;
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
  status: 'active' | 'completed' | 'discontinued';
  created_at: string;
}

export interface DoctorNoteRow {
  id: string;
  doctor_id: string;
  patient_id: string;
  title: string;
  content: string;
  clinical_impression?: string | null;
  treatment_plan?: string | null;
  created_at: string;
}

export interface MedicalRecordRow {
  id: string;
  patient_id?: string | null;
  user_id?: string | null;
  title: string;
  category: 'lab_report' | 'rash_vision' | 'prescription' | 'doctor_brief' | 'general';
  report_date: string;
  file_url?: string | null;
  file_name?: string | null;
  summary?: string | null;
  biomarkers?: string | null; // JSON
  vision_data?: string | null; // JSON
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  priority: 'critical' | 'normal' | 'low';
  type: 'emergency' | 'appointment' | 'medication' | 'vitals' | 'general';
  is_read: number; // 0 or 1
  scheduled_for?: string | null;
  created_at: string;
}

export interface TriageLogRow {
  id: string;
  user_id?: string | null;
  patient_id?: string | null;
  symptoms: string;
  triage_level: string;
  assessment: string;
  recommendations?: string | null; // JSON
  sources?: string | null; // JSON
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: string | null; // JSON
  ip_address?: string | null;
  created_at: string;
}

// Database Engine interface
export interface MedTrackDb {
  init(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
}

// SQLite implementation using sql.js with local persistence
class SqliteMedTrackDb implements MedTrackDb {
  private db: Database | null = null;
  private dbFilePath: string;

  constructor() {
    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NOW_REGION ||
      process.env.LAMBDA_TASK_ROOT
    );
    const dataDir = isServerless ? '/tmp' : path.join(process.cwd(), 'data');
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.dbFilePath = path.join(dataDir, 'medtrack.sqlite');
    } catch {
      this.dbFilePath = path.join('/tmp', 'medtrack.sqlite');
    }
  }

  async init(): Promise<void> {
    const SQL = await initSqlJs();
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const buffer = fs.readFileSync(this.dbFilePath);
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
      }
    } catch {
      this.db = new SQL.Database();
    }
    await this.createSchema();
    this.persist();
  }

  private persist() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbFilePath, buffer);
    } catch (err) {
      // Non-fatal if filesystem is read-only in serverless/edge runtime
      console.warn('SQLite persist notice (in-memory mode retained):', err);
    }
  }

  private async createSchema(): Promise<void> {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('doctor', 'patient')),
        is_verified INTEGER NOT NULL DEFAULT 0,
        verification_code TEXT,
        verification_expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        avatar_url TEXT,
        phone TEXT,
        profession_specialty TEXT,
        license_number TEXT,
        hospital_clinic TEXT,
        age INTEGER,
        gender TEXT,
        height_cm REAL,
        weight_kg REAL,
        blood_group TEXT,
        known_conditions TEXT,
        allergies TEXT,
        current_medications TEXT,
        lifestyle TEXT,
        custom_notes TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        user_id TEXT,
        full_name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        blood_group TEXT,
        medical_history TEXT,
        allergies TEXT,
        current_medications TEXT,
        vitals TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(doctor_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        doctor_id TEXT,
        user_id TEXT,
        patient_name TEXT NOT NULL,
        doctor_name TEXT NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prescriptions (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        medication_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        duration TEXT NOT NULL,
        instructions TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS doctor_notes (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        clinical_impression TEXT,
        treatment_plan TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS medical_records (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        user_id TEXT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        report_date TEXT NOT NULL,
        file_url TEXT,
        file_name TEXT,
        summary TEXT,
        biomarkers TEXT,
        vision_data TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('critical', 'normal', 'low')),
        type TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        scheduled_for TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS triage_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        patient_id TEXT,
        symptoms TEXT NOT NULL,
        triage_level TEXT NOT NULL,
        assessment TEXT NOT NULL,
        recommendations TEXT,
        sources TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // Seed default verified test/demo accounts if not yet created
    try {
      const now = new Date().toISOString();
      const defaultHash = '$2a$10$wT0e7w9.U6WlR4u535kZkOI7zZ3u1Q/8v91tF.vC6k4.y5f4N74n.'; // password123
      this.db.run(`
        INSERT OR IGNORE INTO users (id, email, password_hash, role, is_verified, created_at, updated_at)
        VALUES ('usr_doc_sarah', 'doctor@medtrack.ai', '${defaultHash}', 'doctor', 1, '${now}', '${now}');
        
        INSERT OR IGNORE INTO profiles (user_id, full_name, profession_specialty, license_number, hospital_clinic, updated_at)
        VALUES ('usr_doc_sarah', 'Dr. Sarah Chen, MD', 'Cardiology & Internal Medicine', 'MD-77492-US', 'Metropolitan Medical Center', '${now}');

        INSERT OR IGNORE INTO users (id, email, password_hash, role, is_verified, created_at, updated_at)
        VALUES ('usr_pat_alex', 'patient@medtrack.ai', '${defaultHash}', 'patient', 1, '${now}', '${now}');

        INSERT OR IGNORE INTO profiles (user_id, full_name, age, gender, blood_group, updated_at)
        VALUES ('usr_pat_alex', 'Alex Rivera', 32, 'Male', 'O+', '${now}');

        INSERT OR IGNORE INTO users (id, email, password_hash, role, is_verified, created_at, updated_at)
        VALUES ('usr_pat_alex_dev', 'alex.rivera@techpulse.io', '${defaultHash}', 'patient', 1, '${now}', '${now}');

        INSERT OR IGNORE INTO profiles (user_id, full_name, age, gender, blood_group, updated_at)
        VALUES ('usr_pat_alex_dev', 'Alex Rivera', 32, 'Male', 'O+', '${now}');
      `);
    } catch (seedErr) {
      console.warn('Notice: seed accounts check skipped:', seedErr);
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    try {
      const stmt = this.db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      stmt.free();
      return results;
    } catch (e) {
      console.error('SQLite query error:', e, sql);
      throw e;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    try {
      this.db.run(sql, params);
      this.persist();
    } catch (e) {
      console.error('SQLite execute error:', e, sql);
      throw e;
    }
  }
}

// PostgreSQL implementation for Production environment
class PostgresMedTrackDb implements MedTrackDb {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }

  async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role VARCHAR(20) NOT NULL CHECK(role IN ('doctor', 'patient')),
          is_verified INTEGER NOT NULL DEFAULT 0,
          verification_code VARCHAR(16),
          verification_expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS profiles (
          user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          full_name VARCHAR(255) NOT NULL,
          avatar_url TEXT,
          phone VARCHAR(50),
          profession_specialty VARCHAR(100),
          license_number VARCHAR(100),
          hospital_clinic VARCHAR(255),
          age INTEGER,
          gender VARCHAR(30),
          height_cm NUMERIC,
          weight_kg NUMERIC,
          blood_group VARCHAR(10),
          known_conditions TEXT,
          allergies TEXT,
          current_medications TEXT,
          lifestyle TEXT,
          custom_notes TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS patients (
          id VARCHAR(64) PRIMARY KEY,
          doctor_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_id VARCHAR(64),
          full_name VARCHAR(255) NOT NULL,
          age INTEGER NOT NULL,
          gender VARCHAR(30) NOT NULL,
          phone VARCHAR(50),
          email VARCHAR(255),
          blood_group VARCHAR(10),
          medical_history TEXT,
          allergies TEXT,
          current_medications TEXT,
          vitals TEXT,
          status VARCHAR(30) NOT NULL DEFAULT 'active',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS appointments (
          id VARCHAR(64) PRIMARY KEY,
          patient_id VARCHAR(64),
          doctor_id VARCHAR(64),
          user_id VARCHAR(64),
          patient_name VARCHAR(255) NOT NULL,
          doctor_name VARCHAR(255) NOT NULL,
          appointment_date VARCHAR(30) NOT NULL,
          appointment_time VARCHAR(30) NOT NULL,
          reason TEXT NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
          id VARCHAR(64) PRIMARY KEY,
          doctor_id VARCHAR(64) NOT NULL,
          patient_id VARCHAR(64) NOT NULL,
          patient_name VARCHAR(255) NOT NULL,
          medication_name VARCHAR(255) NOT NULL,
          dosage VARCHAR(100) NOT NULL,
          frequency VARCHAR(100) NOT NULL,
          duration VARCHAR(100) NOT NULL,
          instructions TEXT,
          status VARCHAR(30) NOT NULL DEFAULT 'active',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS doctor_notes (
          id VARCHAR(64) PRIMARY KEY,
          doctor_id VARCHAR(64) NOT NULL,
          patient_id VARCHAR(64) NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          clinical_impression TEXT,
          treatment_plan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS medical_records (
          id VARCHAR(64) PRIMARY KEY,
          patient_id VARCHAR(64),
          user_id VARCHAR(64),
          title VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL,
          report_date VARCHAR(30) NOT NULL,
          file_url TEXT,
          file_name VARCHAR(255),
          summary TEXT,
          biomarkers TEXT,
          vision_data TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          priority VARCHAR(20) NOT NULL CHECK(priority IN ('critical', 'normal', 'low')),
          type VARCHAR(50) NOT NULL,
          is_read INTEGER NOT NULL DEFAULT 0,
          scheduled_for VARCHAR(50),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS triage_logs (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          patient_id VARCHAR(64),
          symptoms TEXT NOT NULL,
          triage_level VARCHAR(100) NOT NULL,
          assessment TEXT NOT NULL,
          recommendations TEXT,
          sources TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(64),
          details TEXT,
          ip_address VARCHAR(100),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    } finally {
      client.release();
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    // Convert ? to $1, $2 for Postgres
    let pgSql = sql;
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await this.pool.query(pgSql, params);
    return res.rows as T[];
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    let pgSql = sql;
    let paramIndex = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
    await this.pool.query(pgSql, params);
  }
}

// In-Memory Fallback Implementation for serverless edge environments
class InMemoryMedTrackDb implements MedTrackDb {
  private users: Map<string, UserRow> = new Map();
  private profiles: Map<string, ProfileRow> = new Map();
  private notifications: any[] = [];
  private auditLogs: any[] = [];

  async init(): Promise<void> {
    const now = new Date().toISOString();
    const defaultHash = '$2a$10$wT0e7w9.U6WlR4u535kZkOI7zZ3u1Q/8v91tF.vC6k4.y5f4N74n.'; // password123

    // Seed doctor
    const docUser: UserRow = {
      id: 'usr_doc_sarah',
      email: 'doctor@medtrack.ai',
      password_hash: defaultHash,
      role: 'doctor',
      is_verified: 1,
      created_at: now,
      updated_at: now,
    };
    this.users.set(docUser.id, docUser);
    this.profiles.set(docUser.id, {
      user_id: docUser.id,
      full_name: 'Dr. Sarah Chen, MD',
      profession_specialty: 'Cardiology & Internal Medicine',
      license_number: 'MD-77492-US',
      hospital_clinic: 'Metropolitan Medical Center',
      updated_at: now,
    });

    // Seed patient
    const patUser: UserRow = {
      id: 'usr_pat_alex',
      email: 'patient@medtrack.ai',
      password_hash: defaultHash,
      role: 'patient',
      is_verified: 1,
      created_at: now,
      updated_at: now,
    };
    this.users.set(patUser.id, patUser);
    this.profiles.set(patUser.id, {
      user_id: patUser.id,
      full_name: 'Alex Rivera',
      age: 32,
      gender: 'Male',
      blood_group: 'O+',
      updated_at: now,
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const s = sql.toLowerCase();
    if (s.includes('from users')) {
      const allUsers = Array.from(this.users.values());
      if (params.length > 0 && typeof params[0] === 'string') {
        const needle = params[0].toLowerCase();
        const matched = allUsers.filter((u) => u.email.toLowerCase() === needle || u.id === needle);
        return matched as any;
      }
      return allUsers as any;
    }
    if (s.includes('from profiles')) {
      const allProfiles = Array.from(this.profiles.values());
      if (params.length > 0 && typeof params[0] === 'string') {
        const needle = params[0];
        const matched = allProfiles.filter((p) => p.user_id === needle);
        return matched as any;
      }
      return allProfiles as any;
    }
    if (s.includes('from notifications')) {
      return this.notifications as any;
    }
    return [] as any;
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    const s = sql.toLowerCase();
    const now = new Date().toISOString();
    if (s.startsWith('insert into users')) {
      if (params.length >= 4) {
        const user: UserRow = {
          id: params[0],
          email: params[1],
          password_hash: params[2],
          role: params[3],
          is_verified: params[4] ?? 0,
          verification_code: params[5] ?? null,
          verification_expires_at: params[6] ?? null,
          created_at: params[7] || now,
          updated_at: params[8] || now,
        };
        this.users.set(user.id, user);
      }
    } else if (s.startsWith('update users set')) {
      if (s.includes('is_verified = 1')) {
        const userId = params[params.length - 1];
        const u = this.users.get(userId);
        if (u) {
          u.is_verified = 1;
          u.updated_at = now;
        }
      }
    } else if (s.startsWith('insert into profiles')) {
      if (params.length >= 2) {
        this.profiles.set(params[0], {
          user_id: params[0],
          full_name: params[1],
          updated_at: now,
        });
      }
    } else if (s.startsWith('insert into notifications')) {
      if (params.length >= 4) {
        this.notifications.push({
          id: params[0],
          user_id: params[1],
          title: params[2],
          message: params[3],
          priority: params[4] || 'normal',
          type: params[5] || 'general',
          is_read: params[6] || 0,
          created_at: now,
        });
      }
    }
  }
}

// Global DB Singleton instance
let dbInstance: MedTrackDb | null = null;

export async function getDb(): Promise<MedTrackDb> {
  if (!dbInstance) {
    const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (postgresUrl && postgresUrl.startsWith('postgres')) {
      try {
        console.log('Connecting to PostgreSQL Production Database...');
        dbInstance = new PostgresMedTrackDb(postgresUrl);
        await dbInstance.init();
        return dbInstance;
      } catch (err) {
        console.warn('Postgres connection failed, falling back to SQLite:', err);
      }
    }

    try {
      console.log('Using SQLite for local development/testing...');
      dbInstance = new SqliteMedTrackDb();
      await dbInstance.init();
    } catch (sqliteErr) {
      console.warn('SQLite init failed (fallback to in-memory store):', sqliteErr);
      dbInstance = new InMemoryMedTrackDb();
      await dbInstance.init();
    }
  }
  return dbInstance;
}

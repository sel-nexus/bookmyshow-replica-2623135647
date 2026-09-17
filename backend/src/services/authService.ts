import jwt from 'jsonwebtoken';
import type Database from 'better-sqlite3';
import type { AuthTokenPayload, User } from '../types/domain';

/** Provide SQLite-backed one-time-password authentication operations. */
export class AuthService {
  /** Construct the service with its database and token-signing secret. */
  public constructor(
    private readonly database: Database.Database,
    private readonly signingSecret: string,
  ) {}

  /** Confirm that a mobile number may continue to the OTP step. */
  public acceptLogin(mobileNumber: string): { accepted: true; mobileNumber: string } {
    return { accepted: true, mobileNumber };
  }

  /** Find or create a user, then issue a signed token for that identity. */
  public verifyOtp(mobileNumber: string): { token: string; user: User } {
    const existing = this.findUser(mobileNumber);
    const user = existing ?? this.createUser(mobileNumber);
    const payload: AuthTokenPayload = { sub: String(user.id), mobileNumber: user.mobileNumber };
    const token = jwt.sign(payload, this.signingSecret, { expiresIn: '24h' });
    return { token, user };
  }

  /** Locate a user by their unique mobile number. */
  private findUser(mobileNumber: string): User | null {
    const record = this.database
      .prepare('SELECT id, mobile_number AS mobileNumber FROM users WHERE mobile_number = ?')
      .get(mobileNumber) as User | undefined;
    return record ?? null;
  }

  /** Persist a new user and return its generated identity. */
  private createUser(mobileNumber: string): User {
    const result = this.database.prepare('INSERT INTO users (mobile_number) VALUES (?)').run(mobileNumber);
    return { id: Number(result.lastInsertRowid), mobileNumber };
  }
}

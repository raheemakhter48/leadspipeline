import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { db, ensureSchema } from "@/lib/db";

export type AuthUser = {
  email: string;
  id: string;
  name: string;
  provider: string;
};

export async function createEmailUser(input: { email: string; name: string; password: string }) {
  await ensureSchema();
  const email = normalizeEmail(input.email);
  const existing = await db.query(`select id from auth_users where email = $1`, [email]);
  if (existing.rowCount) {
    throw new Error("Account already exists.");
  }

  const result = await db.query(
    `
    insert into auth_users (id, name, email, password_hash, provider, created_at)
    values ($1, $2, $3, $4, 'email', now())
    returning id, name, email, provider
    `,
    [crypto.randomUUID(), input.name.trim(), email, hashPassword(input.password)],
  );

  return rowToUser(result.rows[0]);
}

export async function loginEmailUser(input: { email: string; password: string }) {
  await ensureSchema();
  const result = await db.query(`select * from auth_users where email = $1`, [normalizeEmail(input.email)]);
  const row = result.rows[0];

  if (!row?.password_hash || !verifyPassword(input.password, String(row.password_hash))) {
    throw new Error("Invalid email or password.");
  }

  return rowToUser(row);
}

export async function createResetToken(emailInput: string) {
  await ensureSchema();
  const email = normalizeEmail(emailInput);
  const token = randomBytes(24).toString("hex");

  await db.query(
    `
    insert into password_reset_tokens (id, email, token, expires_at)
    values ($1, $2, $3, now() + interval '30 minutes')
    `,
    [crypto.randomUUID(), email, token],
  );

  return token;
}

export async function upsertGoogleUser(input: { email: string; name?: string }) {
  await ensureSchema();
  const email = normalizeEmail(input.email);
  const result = await db.query(
    `
    insert into auth_users (id, name, email, provider, created_at)
    values ($1, $2, $3, 'google', now())
    on conflict (email) do update set provider = 'google'
    returning id, name, email, provider
    `,
    [crypto.randomUUID(), input.name?.trim() || email.split("@")[0], email],
  );

  return rowToUser(result.rows[0]);
}

export async function createLoginOtp(emailInput: string) {
  await ensureSchema();
  const email = normalizeEmail(emailInput);
  const code = String(Math.floor(100000 + Math.random() * 900000));

  await db.query(
    `
    insert into login_otps (id, email, code_hash, expires_at)
    values ($1, $2, $3, now() + interval '10 minutes')
    `,
    [crypto.randomUUID(), email, hashPassword(code)],
  );

  return { code, email };
}

export async function verifyLoginOtp(input: { code: string; email: string }) {
  await ensureSchema();
  const email = normalizeEmail(input.email);
  const result = await db.query(
    `
    select *
    from login_otps
    where email = $1 and used_at is null and expires_at > now()
    order by created_at desc
    limit 1
    `,
    [email],
  );
  const otp = result.rows[0];

  if (!otp?.code_hash || !verifyPassword(input.code.trim(), String(otp.code_hash))) {
    throw new Error("Invalid or expired OTP.");
  }

  await db.query(`update login_otps set used_at = now() where id = $1`, [otp.id]);

  const userResult = await db.query(
    `
    insert into auth_users (id, name, email, provider, created_at)
    values ($1, $2, $3, 'otp', now())
    on conflict (email) do update set provider = auth_users.provider
    returning id, name, email, provider
    `,
    [crypto.randomUUID(), email.split("@")[0], email],
  );

  return rowToUser(userResult.rows[0]);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [algorithm, iterations, salt, hash] = stored.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !hash) return false;
  const candidate = pbkdf2Sync(password, salt, Number(iterations), 32, "sha256");
  const storedBuffer = Buffer.from(hash, "hex");
  return storedBuffer.length === candidate.length && timingSafeEqual(storedBuffer, candidate);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function rowToUser(row: Record<string, unknown>): AuthUser {
  return {
    email: String(row.email ?? ""),
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    provider: String(row.provider ?? "email"),
  };
}

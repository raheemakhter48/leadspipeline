import { Pool } from "pg";
import type { Campaign, Lead, MailLog } from "@/lib/types";

const globalForDb = globalThis as typeof globalThis & {
  leadEngineDbPool?: Pool;
  leadEngineSchemaReady?: Promise<void>;
};

function getDbPool() {
  if (globalForDb.leadEngineDbPool) return globalForDb.leadEngineDbPool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  globalForDb.leadEngineDbPool = new Pool({
    connectionString,
    max: 5,
    ssl: { rejectUnauthorized: false },
  });

  return globalForDb.leadEngineDbPool;
}

export const db = {
  query: (text: string, params?: unknown[]) => getDbPool().query(text, params),
};

export function ensureSchema() {
  globalForDb.leadEngineSchemaReady ??= db.query(`
    create table if not exists leads (
      id text primary key,
      business_name text not null,
      category text not null default '',
      address text not null default '',
      phone text not null default '',
      email text,
      website text not null default '',
      social_links jsonb not null default '[]'::jsonb,
      google_maps_url text not null default '',
      rating numeric not null default 0,
      review_count integer not null default 0,
      location text not null default '',
      country text not null default '',
      source text not null default 'web_search',
      ai_score integer not null default 0,
      temperature text not null default 'Cold',
      status text not null default 'new',
      created_at timestamptz not null default now()
    );

    create table if not exists campaigns (
      id text primary key,
      name text not null,
      subject text not null,
      template text not null,
      status text not null default 'draft',
      lead_count integer not null default 0,
      opens integer not null default 0,
      clicks integer not null default 0,
      bounces integer not null default 0,
      created_at timestamptz not null default now()
    );

    create table if not exists messages (
      id text primary key,
      user_email text not null default 'unknown',
      recipient_email text not null,
      subject text not null,
      body text not null,
      status text not null default 'queued',
      backend_response text not null default '',
      error_message text not null default '',
      sent_at timestamptz,
      created_at timestamptz not null default now()
    );

    alter table messages add column if not exists user_email text not null default 'unknown';
    alter table messages add column if not exists backend_response text not null default '';
    alter table messages add column if not exists error_message text not null default '';

    create table if not exists auth_users (
      id text primary key,
      name text not null,
      email text not null unique,
      password_hash text,
      provider text not null default 'email',
      created_at timestamptz not null default now()
    );

    create table if not exists password_reset_tokens (
      id text primary key,
      email text not null,
      token text not null,
      expires_at timestamptz not null,
      used_at timestamptz,
      created_at timestamptz not null default now()
    );

    create table if not exists login_otps (
      id text primary key,
      email text not null,
      code_hash text not null,
      expires_at timestamptz not null,
      used_at timestamptz,
      created_at timestamptz not null default now()
    );
  `).then(() => undefined);

  return globalForDb.leadEngineSchemaReady;
}

export async function getLeads() {
  await ensureSchema();
  const result = await db.query(`
    select *
    from leads
    order by created_at desc
  `);

  return result.rows.map(rowToLead);
}

export async function saveLeadsToDb(incoming: Lead[]) {
  await ensureSchema();

  for (const lead of incoming) {
    await db.query(
      `
      insert into leads (
        id, business_name, category, address, phone, email, website, social_links,
        google_maps_url, rating, review_count, location, country, source,
        ai_score, temperature, status, created_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18
      )
      on conflict (id) do update set
        business_name = excluded.business_name,
        category = excluded.category,
        address = excluded.address,
        phone = excluded.phone,
        email = excluded.email,
        website = excluded.website,
        social_links = excluded.social_links,
        google_maps_url = excluded.google_maps_url,
        rating = excluded.rating,
        review_count = excluded.review_count,
        location = excluded.location,
        country = excluded.country,
        source = excluded.source,
        ai_score = excluded.ai_score,
        temperature = excluded.temperature,
        status = 'saved'
      `,
      [
        lead.id,
        lead.businessName,
        lead.category,
        lead.address,
        lead.phone,
        lead.email ?? null,
        lead.website,
        JSON.stringify(lead.socialLinks ?? []),
        lead.googleMapsUrl,
        lead.rating,
        lead.reviewCount,
        lead.location,
        lead.country,
        lead.source,
        lead.aiScore,
        lead.temperature,
        "saved",
        lead.createdAt,
      ],
    );
  }

  return incoming.length;
}

export async function getCampaigns() {
  await ensureSchema();
  const result = await db.query(`
    select *
    from campaigns
    order by created_at desc
  `);

  return result.rows.map(rowToCampaign);
}

export async function createCampaignInDb(input: Pick<Campaign, "name" | "subject" | "template">) {
  await ensureSchema();
  const id = crypto.randomUUID();
  const leadCountResult = await db.query(`select count(*)::int as count from leads`);
  const leadCount = Number(leadCountResult.rows[0]?.count ?? 0);

  const result = await db.query(
    `
    insert into campaigns (id, name, subject, template, status, lead_count, opens, clicks, bounces, created_at)
    values ($1, $2, $3, $4, 'draft', $5, 0, 0, 0, now())
    returning *
    `,
    [id, input.name, input.subject, input.template, leadCount],
  );

  return rowToCampaign(result.rows[0]);
}

export async function saveMailLogToDb(input: Omit<MailLog, "id" | "createdAt">) {
  await ensureSchema();
  const id = crypto.randomUUID();
  const result = await db.query(
    `
    insert into messages (
      id, user_email, recipient_email, subject, body, status,
      backend_response, error_message, sent_at, created_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
    returning *
    `,
    [
      id,
      input.userEmail,
      input.recipientEmail,
      input.subject,
      input.body,
      input.status,
      input.backendResponse,
      input.errorMessage,
      input.sentAt ?? null,
    ],
  );

  return rowToMailLog(result.rows[0]);
}

export async function getMailLogs(limit = 100) {
  await ensureSchema();
  const result = await db.query(
    `
    select *
    from messages
    order by created_at desc
    limit $1
    `,
    [limit],
  );

  return result.rows.map(rowToMailLog);
}

export async function getMailUserStats() {
  await ensureSchema();
  const result = await db.query(`
    select
      user_email,
      count(*)::int as total,
      count(*) filter (where status = 'sent')::int as sent,
      count(*) filter (where status = 'failed')::int as failed,
      max(created_at) as last_activity
    from messages
    group by user_email
    order by max(created_at) desc
  `);

  return result.rows.map((row) => ({
    failed: Number(row.failed ?? 0),
    lastActivity: row.last_activity ? new Date(String(row.last_activity)).toISOString() : "",
    sent: Number(row.sent ?? 0),
    total: Number(row.total ?? 0),
    userEmail: String(row.user_email ?? "unknown"),
  }));
}

function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    businessName: String(row.business_name ?? ""),
    category: String(row.category ?? ""),
    address: String(row.address ?? ""),
    phone: String(row.phone ?? ""),
    email: row.email ? String(row.email) : undefined,
    website: String(row.website ?? ""),
    socialLinks: Array.isArray(row.social_links) ? (row.social_links as string[]) : [],
    googleMapsUrl: String(row.google_maps_url ?? ""),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    location: String(row.location ?? ""),
    country: String(row.country ?? ""),
    source: row.source as Lead["source"],
    aiScore: Number(row.ai_score ?? 0),
    temperature: row.temperature as Lead["temperature"],
    status: row.status as Lead["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function rowToCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    subject: String(row.subject ?? ""),
    template: String(row.template ?? ""),
    status: row.status as Campaign["status"],
    leadCount: Number(row.lead_count ?? 0),
    opens: Number(row.opens ?? 0),
    clicks: Number(row.clicks ?? 0),
    bounces: Number(row.bounces ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function rowToMailLog(row: Record<string, unknown>): MailLog {
  return {
    id: String(row.id),
    userEmail: String(row.user_email ?? "unknown"),
    recipientEmail: String(row.recipient_email ?? ""),
    subject: String(row.subject ?? ""),
    body: String(row.body ?? ""),
    status: row.status === "sent" ? "sent" : "failed",
    backendResponse: String(row.backend_response ?? ""),
    errorMessage: String(row.error_message ?? ""),
    sentAt: row.sent_at ? new Date(String(row.sent_at)).toISOString() : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

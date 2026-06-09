create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  business_name text not null,
  category text,
  address text,
  phone text,
  website text,
  google_maps_url text,
  rating numeric,
  review_count integer,
  location text,
  country text,
  source text not null default 'google_maps',
  ai_score integer not null default 0,
  temperature text not null default 'Cold',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  template text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id),
  lead_id uuid references leads(id),
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

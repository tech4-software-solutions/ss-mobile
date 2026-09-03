-- SS Mobile Weligama — Full database schema
-- Run in Supabase SQL Editor or via: supabase db push

-- Extensions
create extension if not exists "uuid-ossp";

-- Admin profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

-- Categories
create table if not exists public.categories (
  id text primary key,
  name text not null,
  icon text not null default 'smartphone',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Brands (with optional background image for partner cards)
create table if not exists public.brands (
  id text primary key,
  name text not null,
  color text not null default '#1A1A1A',
  text_color text default '#FFFFFF',
  bg_image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Products
create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text not null,
  category text not null references public.categories(id),
  price numeric(12,2) not null check (price >= 0),
  original_price numeric(12,2),
  discount int check (discount >= 0 and discount <= 100),
  image text not null,
  description text not null default '',
  specs jsonb not null default '{}',
  colors text[] default '{}',
  trending boolean not null default false,
  views int not null default 0,
  in_stock boolean not null default true,
  is_offer boolean not null default false,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Promo codes (never exposed to public SELECT)
create table if not exists public.promo_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  discount numeric(12,2) not null check (discount > 0),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  active boolean not null default true,
  uses int not null default 0,
  max_uses int,
  min_order numeric(12,2) default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Store hours
create table if not exists public.store_hours (
  id uuid primary key default uuid_generate_v4(),
  day text not null unique,
  open_time text not null,
  close_time text not null,
  closed boolean not null default false,
  sort_order int not null default 0
);

-- Reviews
create table if not exists public.reviews (
  id text primary key,
  name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  image_key text not null,
  product text not null,
  review_date text not null,
  sort_order int not null default 0
);

-- Orders
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_method text not null check (delivery_method in ('pickup', 'delivery')),
  address text,
  subtotal numeric(12,2) not null,
  delivery_fee numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  promo_code text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'in_progress', 'completed', 'cancelled', 'fulfilled')),
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null
);

-- Helper: check admin role
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Secure promo validation (no direct table access needed)
create or replace function public.validate_promo_code(p_code text, p_subtotal numeric)
returns table (
  valid boolean,
  code text,
  discount numeric,
  discount_type text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  promo record;
  calc_discount numeric;
begin
  select * into promo
  from public.promo_codes
  where upper(promo_codes.code) = upper(trim(p_code))
    and active = true
    and (max_uses is null or uses < max_uses)
    and (expires_at is null or expires_at > now())
  limit 1;

  if promo is null then
    return query select false, null::text, null::numeric, null::text, 'Invalid or expired promo code'::text;
    return;
  end if;

  if p_subtotal < coalesce(promo.min_order, 0) then
    return query select false, null::text, null::numeric, null::text,
      format('Minimum order Rs. %s required', promo.min_order)::text;
    return;
  end if;

  if promo.discount_type = 'percent' then
    calc_discount := round(p_subtotal * promo.discount / 100);
  else
    calc_discount := promo.discount;
  end if;

  return query select true, promo.code, calc_discount, promo.discount_type, null::text;
end;
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated on public.products;
drop trigger if exists brands_updated on public.brands;
drop trigger if exists categories_updated on public.categories;

create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger brands_updated before update on public.brands
  for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.promo_codes enable row level security;
alter table public.store_hours enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profiles: users read own, admins read all
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admins read all profiles" on public.profiles
  for select using (public.is_admin());

-- Public read for storefront
create policy "Public read categories" on public.categories for select using (true);
create policy "Public read brands" on public.brands for select using (true);
create policy "Public read products" on public.products for select using (true);
create policy "Public read reviews" on public.reviews for select using (true);
create policy "Public read store hours" on public.store_hours for select using (true);

-- Admin write
create policy "Admin manage categories" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin manage brands" on public.brands
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin manage products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin manage promos" on public.promo_codes
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin manage hours" on public.store_hours
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin manage reviews" on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- Promo codes: NO public select (validation only via RPC)
-- Orders: admin read + manual updates for fulfillment flow
create policy "Admin read orders" on public.orders
  for select using (public.is_admin());
create policy "Admin update orders" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());
create policy "Admin insert orders" on public.orders
  for insert with check (public.is_admin() or auth.uid() is null);
create policy "Admin read order items" on public.order_items
  for select using (public.is_admin());
create policy "Admin update order items" on public.order_items
  for update using (public.is_admin()) with check (public.is_admin());

-- Storage bucket for brand card backgrounds
insert into storage.buckets (id, name, public)
values ('brand-images', 'brand-images', true)
on conflict (id) do nothing;

create policy "Public read brand images" on storage.objects
  for select using (bucket_id = 'brand-images');
create policy "Admin upload brand images" on storage.objects
  for insert with check (bucket_id = 'brand-images' and public.is_admin());
create policy "Admin update brand images" on storage.objects
  for update using (bucket_id = 'brand-images' and public.is_admin());
create policy "Admin delete brand images" on storage.objects
  for delete using (bucket_id = 'brand-images' and public.is_admin());

-- Grant RPC to anon and authenticated
grant execute on function public.validate_promo_code(text, numeric) to anon, authenticated;

-- Increment promo usage after successful payment
create or replace function public.increment_promo_use(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.promo_codes
  set uses = uses + 1
  where upper(code) = upper(trim(p_code));
end;
$$;

grant execute on function public.increment_promo_use(text) to service_role;

-- Seed data
insert into public.categories (id, name, icon, sort_order) values
  ('all', 'All', 'store', 0),
  ('smartphones', 'Smartphones', 'smartphone', 1),
  ('feature-phones', 'Feature Phones', 'phone', 2),
  ('accessories', 'Accessories', 'headphones', 3),
  ('cases', 'Cases & Covers', 'shield', 4),
  ('chargers', 'Chargers & Cables', 'plug', 5),
  ('earbuds', 'Earbuds', 'music', 6),
  ('repairs', 'Repairs', 'wrench', 7)
on conflict (id) do nothing;

insert into public.brands (id, name, color, text_color, sort_order) values
  ('samsung', 'Samsung', '#1428A0', '#FFFFFF', 1),
  ('apple', 'Apple', '#555555', '#FFFFFF', 2),
  ('xiaomi', 'Xiaomi', '#FF6900', '#FFFFFF', 3),
  ('oppo', 'OPPO', '#1D8348', '#FFFFFF', 4),
  ('vivo', 'vivo', '#415FFF', '#FFFFFF', 5),
  ('nokia', 'Nokia', '#124191', '#FFFFFF', 6),
  ('huawei', 'Huawei', '#CF0A2C', '#FFFFFF', 7),
  ('dialog', 'Dialog', '#e31837', '#FFFFFF', 8)
on conflict (id) do nothing;

insert into public.promo_codes (code, discount, discount_type, active, max_uses) values
  ('SSMOBILE10', 10, 'percent', true, 1000),
  ('WELCOME500', 500, 'fixed', true, 500),
  ('NEWPHONE15', 15, 'percent', true, 200)
on conflict (code) do nothing;

insert into public.store_hours (day, open_time, close_time, closed, sort_order) values
  ('Monday', '8:00 AM', '9:00 PM', false, 1),
  ('Tuesday', '8:00 AM', '9:00 PM', false, 2),
  ('Wednesday', '8:00 AM', '9:00 PM', false, 3),
  ('Thursday', '8:00 AM', '9:00 PM', false, 4),
  ('Friday', '8:00 AM', '9:00 PM', false, 5),
  ('Saturday', '8:00 AM', '10:00 PM', false, 6),
  ('Sunday', '9:00 AM', '8:00 PM', false, 7)
on conflict (day) do nothing;

-- Promote first admin (replace email after creating auth user):
-- update public.profiles set role = 'admin' where email = 'your-admin@email.com';

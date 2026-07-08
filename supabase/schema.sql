-- EatThis: credits ledger for hosted deployments.
-- Run once in the Supabase SQL editor (Dashboard -> SQL Editor).

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text,
    credits integer not null default 10,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
    on public.profiles for select
    using (auth.uid() = id);

-- Create a profile (with starter credits) for every new signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email) values (new.id, new.email);
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Atomic conditional spend; called by the backend with the service-role key.
create or replace function public.spend_credits(p_user uuid, p_amount integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
    updated integer;
begin
    update public.profiles
    set credits = credits - p_amount
    where id = p_user and credits >= p_amount;
    get diagnostics updated = row_count;
    return updated = 1;
end;
$$;

-- Credit top-up; call only after verified payment (or from the dev stub).
create or replace function public.add_credits(p_user uuid, p_amount integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
    new_balance integer;
begin
    update public.profiles
    set credits = credits + p_amount
    where id = p_user
    returning credits into new_balance;
    return new_balance;
end;
$$;

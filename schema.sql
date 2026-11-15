-- =====================================================================
-- Dilek Ağacı: Supabase şeması
-- Supabase Dashboard > SQL Editor içinde BİR KEZ çalıştır (tekrar çalıştırmak güvenlidir).
-- =====================================================================

-- ---------- 1) Ayarlar (tek satır) ----------
create table if not exists public.settings (
  id              int primary key default 1 check (id = 1),
  moderation_mode text not null default 'auto' check (moderation_mode in ('auto', 'manual')),
  slot_count      int  not null default 59 check (slot_count between 1 and 500),
  blocklist       text[] not null default '{}',          -- bu kelimeleri içeren dilekler onaya düşer
  ip_salt         text not null default gen_random_uuid()::text
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- 2) Dilekler (herkese açık sütunlar) ----------
create table if not exists public.wishes (
  id           uuid primary key default gen_random_uuid(),
  author_name  text check (author_name is null or char_length(author_name) between 1 and 32),
  wish_text    text not null check (char_length(wish_text) between 1 and 200),
  ribbon_color text not null check (ribbon_color in
                 ('#10b981','#0ea5e9','#ef4444','#8b5cf6','#f59e0b','#ec4899','#f8fafc','#f97316','#06b6d4')),
  created_at   timestamptz not null default now(),
  like_count   integer not null default 0 check (like_count >= 0),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_approved  boolean generated always as (status = 'approved') stored,
  slot         integer,        -- ağaçtaki sabit kurdele noktası (NULL = ağaçta değil)
  approved_at  timestamptz
);
create unique index if not exists wishes_slot_uidx on public.wishes (slot) where slot is not null;
create index if not exists wishes_status_created_idx on public.wishes (status, created_at desc);

-- ---------- 3) Gizli bilgiler (kimse okuyamaz; sadece fonksiyonlar kullanır) ----------
create table if not exists public.wish_private (
  wish_id    uuid primary key references public.wishes (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index if not exists wish_private_user_idx on public.wish_private (user_id, created_at desc);
create index if not exists wish_private_ip_idx   on public.wish_private (ip_hash, created_at desc);

-- ---------- 4) Beğeniler ----------
create table if not exists public.wish_likes (
  wish_id    uuid not null references public.wishes (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wish_id, user_id)
);

-- ---------- 5) Yöneticiler ----------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- 6) Yetki kontrolü ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- 7) Slot atama: onaylanan dilek ağaçta boş bir noktaya asılır ----------
-- Ağaç doluysa en eski kurdele "düşer" (dilek veritabanında kalır, ağaçtan kalkar).
create or replace function public.wishes_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_slots  int;
  v_free   int;
  v_victim uuid;
  v_assign boolean;
begin
  if new.status = 'approved' then
    if tg_op = 'INSERT' then
      v_assign := true;
    else
      v_assign := old.status is distinct from 'approved';
    end if;
    if v_assign then
      perform pg_advisory_xact_lock(727001);
      select slot_count into v_slots from public.settings where id = 1;

      select g.s into v_free
        from generate_series(0, v_slots - 1) as g(s)
       where not exists (select 1 from public.wishes w where w.slot = g.s)
       order by random()
       limit 1;

      if v_free is null then
        select w.id, w.slot into v_victim, v_free
          from public.wishes w
         where w.slot is not null
         order by w.approved_at asc nulls first, w.created_at asc
         limit 1;
        update public.wishes set slot = null where id = v_victim;
      end if;

      new.slot := v_free;
      new.approved_at := now();
    end if;
  else
    new.slot := null;
    new.approved_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists wishes_before_write on public.wishes;
create trigger wishes_before_write
  before insert or update of status on public.wishes
  for each row execute function public.wishes_before_write();

-- ---------- 8) Beğeni sayacı ----------
create or replace function public.wish_likes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.wishes set like_count = like_count + 1 where id = new.wish_id;
  else
    update public.wishes set like_count = greatest(like_count - 1, 0) where id = old.wish_id;
  end if;
  return null;
end;
$$;

drop trigger if exists wish_likes_count on public.wish_likes;
create trigger wish_likes_count
  after insert or delete on public.wish_likes
  for each row execute function public.wish_likes_count();

-- ---------- 9) Dilek gönderme (tek giriş noktası) ----------
-- Doğrulama, temizleme, hız sınırı ve moderasyon kararı burada, sunucu tarafında yapılır.
create or replace function public.submit_wish(p_author text, p_text text, p_color text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c_zero_width constant text := E'\u200b\u200c\u200d\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2060\ufeff';
  v_uid      uuid := auth.uid();
  v_author   text;
  v_text     text;
  v_ip       text;
  v_ip_hash  text;
  v_set      public.settings%rowtype;
  v_status   text := 'approved';
  v_word     text;
  v_id       uuid;
  v_created  timestamptz;
begin
  if v_uid is null then
    raise exception 'auth_required';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  v_text   := btrim(regexp_replace(translate(coalesce(p_text, ''), c_zero_width, ''), '[[:cntrl:][:space:]]+', ' ', 'g'));
  v_author := nullif(btrim(regexp_replace(translate(coalesce(p_author, ''), c_zero_width, ''), '[[:cntrl:][:space:]]+', ' ', 'g')), '');

  if v_text = '' then raise exception 'empty_wish'; end if;
  if char_length(v_text) > 200 then raise exception 'wish_too_long'; end if;
  if v_author is not null and char_length(v_author) > 32 then raise exception 'author_too_long'; end if;
  if p_color is null or p_color not in
     ('#10b981','#0ea5e9','#ef4444','#8b5cf6','#f59e0b','#ec4899','#f8fafc','#f97316','#06b6d4') then
    raise exception 'invalid_color';
  end if;

  select * into v_set from public.settings where id = 1;

  begin
    v_ip := nullif(btrim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1)), '');
  exception when others then
    v_ip := null;
  end;
  v_ip_hash := case when v_ip is null then null else md5(v_ip || v_set.ip_salt) end;

  -- hız sınırları: kullanıcı başına 20 sn bekleme + saatte 5 dilek, IP başına saatte 30 dilek
  if exists (select 1 from public.wish_private where user_id = v_uid and created_at > now() - interval '20 seconds') then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.wish_private where user_id = v_uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited';
  end if;
  if v_ip_hash is not null
     and (select count(*) from public.wish_private where ip_hash = v_ip_hash and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited';
  end if;

  -- moderasyon kararı
  if v_set.moderation_mode = 'manual' then
    v_status := 'pending';
  elsif lower(v_text) ~ '(https?://|www\.|t\.me/|[[:alnum:]]@[[:alnum:]]|\.(com|net|org|ru|xyz|ly)([^[:alpha:]]|$))' then
    v_status := 'pending';
  else
    foreach v_word in array v_set.blocklist loop
      if btrim(v_word) <> ''
         and position(lower(btrim(v_word)) in lower(v_text || ' ' || coalesce(v_author, ''))) > 0 then
        v_status := 'pending';
        exit;
      end if;
    end loop;
  end if;

  insert into public.wishes (author_name, wish_text, ribbon_color, status)
  values (v_author, v_text, p_color, v_status)
  returning id, created_at into v_id, v_created;

  insert into public.wish_private (wish_id, user_id, ip_hash) values (v_id, v_uid, v_ip_hash);

  return jsonb_build_object('id', v_id, 'status', v_status, 'created_at', v_created);
end;
$$;
revoke all on function public.submit_wish(text, text, text) from public, anon;
grant execute on function public.submit_wish(text, text, text) to authenticated;

-- ---------- 10) Yönetici istatistikleri ----------
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return (
    select jsonb_build_object(
      'total',    count(*),
      'pending',  count(*) filter (where status = 'pending'),
      'approved', count(*) filter (where status = 'approved'),
      'rejected', count(*) filter (where status = 'rejected'),
      'on_tree',  count(*) filter (where slot is not null)
    ) from public.wishes
  );
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- ---------- 11) Yetkiler (varsayılanları kapat, sadece gerekeni aç) ----------
revoke all on public.settings, public.wishes, public.wish_private, public.wish_likes, public.admins
  from anon, authenticated;

grant select on public.wishes to anon, authenticated;
grant update (status) on public.wishes to authenticated;   -- RLS: sadece yönetici
grant delete on public.wishes to authenticated;            -- RLS: sadece yönetici
grant select, insert, delete on public.wish_likes to authenticated;
grant select (id, moderation_mode, slot_count) on public.settings to authenticated;
grant update (moderation_mode) on public.settings to authenticated;

-- ---------- 12) Row Level Security ----------
alter table public.settings     enable row level security;
alter table public.wishes       enable row level security;
alter table public.wish_private enable row level security;   -- politika yok = kimse erişemez
alter table public.wish_likes   enable row level security;
alter table public.admins       enable row level security;   -- politika yok = kimse erişemez

drop policy if exists wishes_public_read   on public.wishes;
drop policy if exists wishes_admin_read    on public.wishes;
drop policy if exists wishes_admin_update  on public.wishes;
drop policy if exists wishes_admin_delete  on public.wishes;
create policy wishes_public_read  on public.wishes for select to anon, authenticated using (status = 'approved');
create policy wishes_admin_read   on public.wishes for select to authenticated using (public.is_admin());
create policy wishes_admin_update on public.wishes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy wishes_admin_delete on public.wishes for delete to authenticated using (public.is_admin());

drop policy if exists likes_select_own on public.wish_likes;
drop policy if exists likes_insert_own on public.wish_likes;
drop policy if exists likes_delete_own on public.wish_likes;
create policy likes_select_own on public.wish_likes for select to authenticated
  using (user_id = (select auth.uid()));
create policy likes_insert_own on public.wish_likes for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.wishes w where w.id = wish_id and w.status = 'approved'));
create policy likes_delete_own on public.wish_likes for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists settings_admin_read   on public.settings;
drop policy if exists settings_admin_update on public.settings;
create policy settings_admin_read   on public.settings for select to authenticated using (public.is_admin());
create policy settings_admin_update on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- 13) Canlı güncelleme (Realtime) ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wishes'
  ) then
    alter publication supabase_realtime add table public.wishes;
  end if;
end;
$$;

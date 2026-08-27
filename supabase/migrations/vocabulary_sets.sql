-- Vocab sets
create table vocab_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  language text not null,
  created_at timestamptz not null default now()
);

create index vocab_sets_user_id_idx on vocab_sets(user_id);

alter table vocab_sets enable row level security;

create policy "Users manage own sets"
  on vocab_sets for all
  using (auth.uid() = user_id);

-- Vocab items
create table vocab_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references vocab_sets(id) on delete cascade,
  target_word text not null,
  native_prompt text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index vocab_items_set_id_idx on vocab_items(set_id);

alter table vocab_items enable row level security;

create policy "Users manage items in own sets"
  on vocab_items for all
  using (
    exists (
      select 1 from vocab_sets
      where vocab_sets.id = vocab_items.set_id
      and vocab_sets.user_id = auth.uid()
    )
  );
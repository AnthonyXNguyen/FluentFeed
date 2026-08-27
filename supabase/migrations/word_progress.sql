-- word progress
create table word_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references vocabulary_items(id) on delete cascade,
  mastery_score int not null default 0,
  attempt_count int not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index word_progress_user_id_idx on word_progress(user_id);
create index word_progress_next_review_at_idx on word_progress(next_review_at);

alter table word_progress enable row level security;

create policy "Users manage own progress"
  on word_progress for all
  using (auth.uid() = user_id);
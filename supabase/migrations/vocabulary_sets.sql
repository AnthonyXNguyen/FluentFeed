-- Vocab sets
create table vocab_sets (
  -- Primary key marks a column (or set of columns) as the unique 
  -- identifier for every row in the table. Primary key has 2 unique properties:
  -- Uniqueness, no two rows can ever have the same value in the id uuid column 
  -- Not null, a primary key can never be empty, every row must have one

  -- default explanation: Whenever the app does insert into vocab_sets(title, language, user_id) ... 
  -- id is never mentioned, because Postgres automatically calls gen_random_uuid() at insert time and 
  -- fills id in for you. 

  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  language text not null,
  created_at timestamptz not null default now()
);

  -- create index - creates a auxillary data structure (typically a B-Tree) that
  -- speeds up data retrieval from tables, functioning like an index at the back of a
  -- textbook. It is a separate data structure stored alongside the table, proportional 
  -- in size to the indexed column (plus row pointers). 
  -- this ends up creating a B-Tree of user_ids that come from vocab_sets. 
  -- So future look-ups for a user_id in vocab_sets is much faster.

  -- Drawbacks of using an index however:
  -- Extra disk space of B-Tree
  -- Slower writes - every insert/update/delete on the table now has to update the index to
  -- keep it in sync
  
  -- Overall worth it though because the table gets read more than its get written to
  -- A vocab_set is made once, and then it is constantly shown
create index vocab_sets_user_id_idx on vocab_sets(user_id);

alter table vocab_sets enable row level security;

create policy "Users manage own sets"
  on vocab_sets for all
  using (auth.uid() = user_id); --auth.uid() gets the uid of the user making the query

-- A Vocab set has muliple vocab words
create table vocab_words (
  id uuid primary key default gen_random_uuid(),
  -- Each vocab_word has a foreign key that points back to its parent, (a vocab_set)
  -- references vocab_sets(id) means that to insert a word into table vocab_words, it must 
  -- reference a set_id that is actually in the vocab_sets table
  -- Else, you would be adding a vocab_word to a set that doesn't exist. This should be impossible. 
  -- On delete cascade means that if a vocab set is deleted, all of the vocab words 
  -- for that set get deleted too
  set_id uuid not null references vocab_sets(id) on delete cascade,
  target_word text not null,
  native_prompt text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index vocab_words_set_id_idx on vocab_words(set_id);

alter table vocab_words enable row level security;

create policy "Users manage words in own sets"
  on vocab_words for all
  using (
    exists (
      select 1 from vocab_sets
      where vocab_sets.id = vocab_words.set_id
      and vocab_sets.user_id = auth.uid()
    )
  );
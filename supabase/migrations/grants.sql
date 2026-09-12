-- Without the grant, authenticated users would be blocked from the table entirely 
-- ,a hard permission error, regardless of how permissive the RLS policies are. 

-- Analogy:
-- Grant = "Is this door unlocked"
-- RLS = "Which rooms behind that door can you actually enter."
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.vocab_sets to authenticated;
grant select, insert, update, delete on public.vocab_words to authenticated;

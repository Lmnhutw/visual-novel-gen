create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

do $$
begin
  create type "StoryStatus" as enum ('DRAFT', 'ACTIVE', 'ARCHIVED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type "CharacterRole" as enum ('PROTAGONIST', 'ANTAGONIST', 'SUPPORTING', 'BACKGROUND');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type "CharacterStatus" as enum ('ACTIVE', 'ABSENT', 'INJURED', 'UNCONSCIOUS', 'DEAD', 'UNKNOWN');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type "RelationshipStatus" as enum ('NEUTRAL', 'ALLIED', 'ROMANTIC', 'CONFLICTED', 'ESTRANGED', 'HOSTILE', 'UNKNOWN');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type "ChapterStatus" as enum ('OUTLINE', 'DRAFT', 'REVISING', 'CANON', 'ARCHIVED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type "GenerationStatus" as enum ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type "ContinuitySeverity" as enum ('P0', 'P1', 'P2', 'P3');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type "ContinuityStatus" as enum ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
exception when duplicate_object then null;
end $$;

create table if not exists stories (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid,
  title text not null,
  description text,
  status "StoryStatus" not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists story_settings (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null unique references stories(id) on delete cascade,
  genre text[] not null default '{}',
  tone text,
  pov text,
  tense text,
  nsfw_policy jsonb not null default '{}'::jsonb,
  style_guide text,
  model_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists characters (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  name text not null,
  role "CharacterRole" not null default 'SUPPORTING',
  status "CharacterStatus" not null default 'ACTIVE',
  age_confirmed boolean not null default false,
  visibility text not null default 'canon',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint characters_story_name_unique unique (story_id, name)
);

create table if not exists character_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  character_id uuid not null unique references characters(id) on delete cascade,
  personality jsonb not null default '{}'::jsonb,
  voice_rules text,
  backstory text,
  appearance jsonb not null default '{}'::jsonb,
  boundaries jsonb not null default '{}'::jsonb,
  motivations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chapters (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  number integer not null,
  title text not null,
  summary text,
  content text,
  status "ChapterStatus" not null default 'OUTLINE',
  token_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapters_story_number_unique unique (story_id, number)
);

create table if not exists scenes (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  number integer not null,
  title text,
  summary text,
  content text,
  pov_character_id uuid references characters(id) on delete set null,
  location text,
  started_at_story_time timestamptz,
  is_flashback boolean not null default false,
  token_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scenes_chapter_number_unique unique (chapter_id, number)
);

create table if not exists character_states (
  id uuid primary key default extensions.gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  chapter_id uuid references chapters(id) on delete set null,
  scene_id uuid references scenes(id) on delete set null,
  location text,
  emotional_state jsonb not null default '{}'::jsonb,
  physical_state jsonb not null default '{}'::jsonb,
  goals jsonb not null default '{}'::jsonb,
  valid_from timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists relationships (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  character_a_id uuid not null references characters(id) on delete cascade,
  character_b_id uuid not null references characters(id) on delete cascade,
  type text not null,
  trust integer not null default 0,
  intimacy integer not null default 0,
  conflict integer not null default 0,
  status "RelationshipStatus" not null default 'NEUTRAL',
  boundaries jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relationships_unique_pair unique (story_id, character_a_id, character_b_id),
  constraint relationships_distinct_characters check (character_a_id <> character_b_id),
  constraint relationships_trust_range check (trust between -100 and 100),
  constraint relationships_intimacy_range check (intimacy between 0 and 100),
  constraint relationships_conflict_range check (conflict between 0 and 100)
);

create table if not exists events (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  scene_id uuid references scenes(id) on delete set null,
  chapter_id uuid references chapters(id) on delete set null,
  event_time timestamptz,
  summary text not null,
  event_type text not null,
  participants jsonb not null default '[]'::jsonb,
  salience double precision not null default 0.5,
  created_at timestamptz not null default now(),
  constraint events_salience_range check (salience between 0 and 1)
);

create table if not exists relationship_history (
  id uuid primary key default extensions.gen_random_uuid(),
  relationship_id uuid not null references relationships(id) on delete cascade,
  scene_id uuid references scenes(id) on delete set null,
  event_id uuid references events(id) on delete set null,
  change_summary text not null,
  delta jsonb not null default '{}'::jsonb,
  emotional_weight double precision not null default 0,
  created_at timestamptz not null default now(),
  constraint relationship_history_emotional_weight_range check (emotional_weight between 0 and 1)
);

create table if not exists event_impacts (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  impact_type text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table if not exists lore_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  category text not null,
  name text not null,
  content text not null,
  canon_level integer not null default 1,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lore_entries_unique_name unique (story_id, category, name),
  constraint lore_entries_canon_level_range check (canon_level between 1 and 5)
);

create table if not exists secrets (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  name text not null,
  content text not null,
  truth_status text not null default 'hidden',
  holder_character_id uuid references characters(id) on delete set null,
  revealed_at_scene_id uuid references scenes(id) on delete set null,
  salience double precision not null default 0.7,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint secrets_salience_range check (salience between 0 and 1)
);

create table if not exists knowledge_tracking (
  id uuid primary key default extensions.gen_random_uuid(),
  secret_id uuid not null references secrets(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  knowledge_state text not null,
  learned_at_scene_id uuid references scenes(id) on delete set null,
  evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_tracking_unique unique (secret_id, character_id)
);

create table if not exists memories (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  memory_type text not null,
  content text not null,
  summary text,
  salience double precision not null default 0.5,
  emotional_weight double precision not null default 0,
  entities jsonb not null default '{}'::jsonb,
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memories_salience_range check (salience between 0 and 1),
  constraint memories_emotional_weight_range check (emotional_weight between 0 and 1)
);

create table if not exists embeddings (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  owner_type text not null,
  owner_id uuid not null,
  model text not null,
  dimensions integer not null,
  chunk_text text not null,
  embedding extensions.vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists generation_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  type text not null,
  status "GenerationStatus" not null default 'QUEUED',
  input jsonb not null default '{}'::jsonb,
  prompt text,
  output text,
  model text not null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists retrieval_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  generation_run_id uuid references generation_runs(id) on delete set null,
  query text not null,
  filters jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  token_budget integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists continuity_issues (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  scene_id uuid references scenes(id) on delete set null,
  chapter_id uuid references chapters(id) on delete set null,
  generation_run_id uuid references generation_runs(id) on delete set null,
  severity "ContinuitySeverity" not null,
  category text not null,
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  confidence double precision not null default 0.5,
  status "ContinuityStatus" not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint continuity_confidence_range check (confidence between 0 and 1)
);

create index if not exists stories_owner_id_idx on stories(owner_id);
create index if not exists stories_status_updated_at_idx on stories(status, updated_at);
create index if not exists characters_story_id_status_idx on characters(story_id, status);
create index if not exists character_profiles_personality_gin_idx on character_profiles using gin(personality jsonb_path_ops);
create index if not exists character_profiles_boundaries_gin_idx on character_profiles using gin(boundaries jsonb_path_ops);
create index if not exists character_states_character_id_valid_from_idx on character_states(character_id, valid_from desc);
create index if not exists character_states_chapter_id_idx on character_states(chapter_id);
create index if not exists character_states_scene_id_idx on character_states(scene_id);
create index if not exists relationships_story_id_status_idx on relationships(story_id, status);
create index if not exists relationships_character_a_id_idx on relationships(character_a_id);
create index if not exists relationships_character_b_id_idx on relationships(character_b_id);
create index if not exists relationship_history_relationship_id_created_at_idx on relationship_history(relationship_id, created_at desc);
create index if not exists relationship_history_scene_id_idx on relationship_history(scene_id);
create index if not exists relationship_history_event_id_idx on relationship_history(event_id);
create index if not exists chapters_story_id_status_idx on chapters(story_id, status);
create index if not exists scenes_story_id_started_at_story_time_idx on scenes(story_id, started_at_story_time);
create index if not exists scenes_pov_character_id_idx on scenes(pov_character_id);
create index if not exists events_story_id_event_time_idx on events(story_id, event_time);
create index if not exists events_scene_id_idx on events(scene_id);
create index if not exists events_chapter_id_idx on events(chapter_id);
create index if not exists events_participants_gin_idx on events using gin(participants jsonb_path_ops);
create index if not exists event_impacts_event_id_idx on event_impacts(event_id);
create index if not exists event_impacts_target_idx on event_impacts(target_type, target_id);
create index if not exists lore_entries_story_id_category_idx on lore_entries(story_id, category);
create index if not exists lore_entries_tags_gin_idx on lore_entries using gin(tags);
create index if not exists secrets_story_id_truth_status_idx on secrets(story_id, truth_status);
create index if not exists secrets_holder_character_id_idx on secrets(holder_character_id);
create index if not exists secrets_revealed_at_scene_id_idx on secrets(revealed_at_scene_id);
create index if not exists knowledge_tracking_character_id_idx on knowledge_tracking(character_id);
create index if not exists knowledge_tracking_learned_at_scene_id_idx on knowledge_tracking(learned_at_scene_id);
create index if not exists memories_story_id_memory_type_salience_idx on memories(story_id, memory_type, salience desc);
create index if not exists memories_source_idx on memories(source_type, source_id);
create index if not exists memories_entities_gin_idx on memories using gin(entities jsonb_path_ops);
create index if not exists memories_embedding_hnsw_idx on memories using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;
create index if not exists embeddings_story_id_owner_type_idx on embeddings(story_id, owner_type);
create index if not exists embeddings_owner_idx on embeddings(owner_type, owner_id);
create index if not exists embeddings_embedding_hnsw_idx on embeddings using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;
create index if not exists generation_runs_story_id_created_at_idx on generation_runs(story_id, created_at desc);
create index if not exists generation_runs_status_idx on generation_runs(status);
create index if not exists retrieval_logs_story_id_created_at_idx on retrieval_logs(story_id, created_at desc);
create index if not exists retrieval_logs_generation_run_id_idx on retrieval_logs(generation_run_id);
create index if not exists continuity_issues_story_id_status_severity_idx on continuity_issues(story_id, status, severity);
create index if not exists continuity_issues_scene_id_idx on continuity_issues(scene_id);
create index if not exists continuity_issues_chapter_id_idx on continuity_issues(chapter_id);
create index if not exists continuity_issues_generation_run_id_idx on continuity_issues(generation_run_id);


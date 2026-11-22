-- SPEC 06 — Catálogo de juegos y leaderboard real.
--
-- Crea las tablas `games` y `scores`, las vistas de lectura `game_catalog` y
-- `global_leaderboard`, la función `submit_score` como único camino de
-- escritura y el seed de demostración (9 juegos + 108 puntuaciones).

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.games (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null check (cover in (
    'cover-bricks', 'cover-tetro', 'cover-snake', 'cover-glot',
    'cover-invaders', 'cover-rocas', 'cover-rana', 'cover-duelo',
    'cover-asteroides'
  )),
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  plays text not null,
  sort_order integer not null unique check (sort_order > 0),
  created_at timestamptz not null default now()
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  player_name text not null check (
    player_name = upper(player_name)
    and char_length(player_name) between 1 and 10
  ),
  score bigint not null check (score > 0 and score <= 100000000),
  created_at timestamptz not null default now(),
  constraint scores_game_player_unique unique (game_id, player_name)
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_created_at_idx on public.scores (created_at desc);

-- ---------------------------------------------------------------------------
-- Vistas de lectura
-- ---------------------------------------------------------------------------

create view public.game_catalog
with (security_invoker = true)
as
select
  g.id, g.title, g.short, g.long, g.cat, g.cover, g.color, g.plays,
  g.sort_order,
  coalesce(max(s.score), 0)::bigint as best
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id, g.title, g.short, g.long, g.cat, g.cover, g.color, g.plays, g.sort_order;

create view public.global_leaderboard
with (security_invoker = true)
as
select
  player_name,
  max(score)::bigint as score
from public.scores
group by player_name
order by score desc, player_name asc;

-- ---------------------------------------------------------------------------
-- Función de escritura
-- ---------------------------------------------------------------------------

create or replace function public.submit_score(
  p_game_id text,
  p_player_name text,
  p_score bigint
)
returns table (best_score bigint, improved boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := upper(btrim(coalesce(p_player_name, '')));
  v_best bigint;
begin
  if v_name is null or char_length(v_name) < 1 or char_length(v_name) > 10 then
    raise exception 'invalid_player_name';
  end if;

  if p_score is null or p_score <= 0 or p_score > 100000000 then
    raise exception 'invalid_score';
  end if;

  if not exists (select 1 from public.games g where g.id = p_game_id) then
    raise exception 'unknown_game';
  end if;

  insert into public.scores (game_id, player_name, score, created_at)
  values (p_game_id, v_name, p_score, now())
  on conflict (game_id, player_name) do update
    set score = excluded.score,
        created_at = now()
    where excluded.score > public.scores.score
  returning score into v_best;

  if v_best is null then
    select s.score into v_best
    from public.scores s
    where s.game_id = p_game_id and s.player_name = v_name;

    return query select v_best, false;
  else
    return query select v_best, true;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_public_read" on public.games for select using (true);
create policy "scores_public_read" on public.scores for select using (true);

revoke all on public.games from anon, authenticated;
revoke all on public.scores from anon, authenticated;
grant select on public.games to anon, authenticated;
grant select on public.scores to anon, authenticated;

grant select on public.game_catalog to anon, authenticated;
grant select on public.global_leaderboard to anon, authenticated;

revoke all on function public.submit_score(text, text, bigint) from public;
grant execute on function public.submit_score(text, text, bigint) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed del catálogo (idempotente)
-- ---------------------------------------------------------------------------

insert into public.games (id, title, short, long, cat, cover, color, plays, sort_order)
values
  (
    'bloque-buster', 'BLOQUE BUSTER',
    'Rebota la pelota y destruye muros de neón.',
    'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
    'ARCADE', 'cover-bricks', 'cyan', '12.4K', 1
  ),
  (
    'caida', 'CAÍDA',
    'Encaja las piezas antes de que el techo te aplaste.',
    'Piezas geométricas descienden desde la oscuridad. Rótales, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
    'PUZZLE', 'cover-tetro', 'magenta', '31.8K', 2
  ),
  (
    'serpentina', 'SERPENTINA',
    'Crece sin morder tu propia cola.',
    'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
    'ARCADE', 'cover-snake', 'green', '9.1K', 3
  ),
  (
    'gloton', 'GLOTÓN',
    'Devora puntos y escapa de los fantasmas.',
    'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
    'ARCADE', 'cover-glot', 'yellow', '27.2K', 4
  ),
  (
    'invasores', 'INVASORES',
    'Defiende el planeta de filas alienígenas.',
    'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
    'SHOOTER', 'cover-invaders', 'green', '18.0K', 5
  ),
  (
    'rocas', 'ROCAS',
    'Pulveriza asteroides en gravedad cero.',
    'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
    'SHOOTER', 'cover-rocas', 'yellow', '15.6K', 6
  ),
  (
    'ranaria', 'RANARIA',
    'Cruza la autopista de pixeles.',
    'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
    'ARCADE', 'cover-rana', 'green', '6.4K', 7
  ),
  (
    'duelo-pixel', 'DUELO PIXEL',
    'Dos paletas. Una pelota. Reflejos máximos.',
    'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
    'VERSUS', 'cover-duelo', 'cyan', '4.2K', 8
  ),
  (
    'asteroides', 'ASTEROIDES',
    'Rota, propulsa y parte rocas antes de que te alcancen.',
    'Tu nave triangular deriva en un campo de rocas toroidal: lo que sale por un borde entra por el otro. Dispara para partir los asteroides grandes en fragmentos cada vez más pequeños y recoge el power-up 3x para abrir fuego triple durante cinco segundos. Tres vidas, niveles sin techo y ninguna fricción.',
    'SHOOTER', 'cover-asteroides', 'yellow', '8.7K', 9
  )
on conflict (id) do update set
  title = excluded.title,
  short = excluded.short,
  long = excluded.long,
  cat = excluded.cat,
  cover = excluded.cover,
  color = excluded.color,
  plays = excluded.plays,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Seed de puntuaciones de demostración (idempotente)
--
-- 12 jugadores por juego, con scores deterministas y distintos. Los valores
-- son datos de demo: no representan partidas reales.
-- ---------------------------------------------------------------------------

insert into public.scores (game_id, player_name, score, created_at)
select
  g.id,
  p.player_name,
  (
    255000
    - (p.player_index - 1) * 19000
    - (g.sort_order * 431) % 6000
  )::bigint,
  timestamptz '2026-09-01 08:00:00+00'
    + make_interval(
        days => (g.sort_order * 13 + p.player_index * 29) % 80,
        hours => (g.sort_order * 5 + p.player_index * 7) % 24
      )
from public.games g
cross join (values
  ('PX_KAI', 1),
  ('NEONFOX', 2),
  ('Z3R0COOL', 3),
  ('M00NRYU', 4),
  ('VAULT_07', 5),
  ('GLITCHA', 6),
  ('ATARI_KID', 7),
  ('CYBER_LU', 8),
  ('MAGENTA88', 9),
  ('SCANLINE', 10),
  ('BIT_LORD', 11),
  ('ARKADYA', 12)
) as p(player_name, player_index)
where g.sort_order between 1 and 9
on conflict (game_id, player_name) do nothing;

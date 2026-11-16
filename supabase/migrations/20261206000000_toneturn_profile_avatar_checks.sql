-- Profile saves were failing ("Your profile could not be saved"): the app's avatar colours are uppercase hex
-- (#A78BFA) and the 0.61 avatar symbols have hyphenated ids (av-violin, av-electric-guitar), both rejected by the
-- original checks. Relax the shapes to what the client sends; values stay bounded and safe to render.
alter table public.toneturn_profiles drop constraint if exists toneturn_profiles_avatar_color_check;
alter table public.toneturn_profiles add constraint toneturn_profiles_avatar_color_check
  check (avatar_color is null or avatar_color ~ '^#[0-9a-fA-F]{6}$');
alter table public.toneturn_profiles drop constraint if exists toneturn_profiles_avatar_icon_check;
alter table public.toneturn_profiles add constraint toneturn_profiles_avatar_icon_check
  check (avatar_icon is null or avatar_icon ~ '^[a-z][a-z0-9-]{1,31}$');

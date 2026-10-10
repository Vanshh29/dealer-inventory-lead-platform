-- Make fuel and gearbox full-text searchable ("golf diesel", "tesla automatic").
--
-- Generated columns require IMMUTABLE expressions, but enum->text casts are only STABLE.
-- Enum labels never change at runtime, so wrapping the cast in an IMMUTABLE function is safe.
-- Underscores become spaces so PLUGIN_HYBRID matches "plugin hybrid".
CREATE FUNCTION enum_label(e anyenum) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT replace(e::text, '_', ' ') $$;

-- A generated column's expression cannot be altered in place: drop (its GIN index goes with it) and re-add.
ALTER TABLE "Vehicle" DROP COLUMN "searchVector";

-- Weights: A make/model, B variant, C colour/fuel/gearbox, D description. 'simple' config: no stemming,
-- because make/model names are not natural language and listings mix German and English.
ALTER TABLE "Vehicle" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("make", '') || ' ' || coalesce("model", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("variant", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("color", '') || ' ' || enum_label("fuel") || ' ' || enum_label("gearbox")), 'C') ||
    setweight(to_tsvector('simple', coalesce("description", '')), 'D')
) STORED;

CREATE INDEX "Vehicle_searchVector_idx" ON "Vehicle" USING GIN ("searchVector");

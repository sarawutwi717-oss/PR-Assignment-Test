INSERT INTO "PRNumberSequence" ("date", "lastSequence")
SELECT
    substr("prNumber", 4, 8),
    MAX(CAST(substr("prNumber", 13) AS INTEGER))
FROM "PRDocument"
WHERE substr("prNumber", 1, 3) = 'PR-'
  AND substr("prNumber", 12, 1) = '-'
  AND substr("prNumber", 4, 8) <> ''
  AND substr("prNumber", 4, 8) NOT GLOB '*[^0-9]*'
  AND substr("prNumber", 13) <> ''
  AND substr("prNumber", 13) NOT GLOB '*[^0-9]*'
GROUP BY substr("prNumber", 4, 8)
ON CONFLICT("date") DO UPDATE
SET "lastSequence" = MAX("lastSequence", excluded."lastSequence");

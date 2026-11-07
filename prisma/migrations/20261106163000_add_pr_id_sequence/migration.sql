CREATE TABLE "PRIdSequence" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "lastSequence" INTEGER NOT NULL
);

INSERT INTO "PRIdSequence" ("key", "lastSequence")
SELECT 'global', MAX(CAST(substr("id", 3) AS INTEGER))
FROM "PRDocument"
WHERE "id" GLOB 'PR[0-9]*'
  AND substr("id", 3) <> ''
  AND substr("id", 3) NOT GLOB '*[^0-9]*'
HAVING COUNT(*) > 0;

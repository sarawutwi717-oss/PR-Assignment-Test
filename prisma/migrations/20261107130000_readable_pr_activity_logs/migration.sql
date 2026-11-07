ALTER TABLE "PRActivityLog" ADD COLUMN "oldData" TEXT;
ALTER TABLE "PRActivityLog" ADD COLUMN "newData" TEXT;

CREATE TABLE "PRActivityLogIdSequence" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "lastSequence" INTEGER NOT NULL
);

INSERT INTO "PRActivityLogIdSequence" ("key", "lastSequence")
SELECT 'global', MAX(CAST(substr("id", 4) AS INTEGER))
FROM "PRActivityLog"
WHERE "id" GLOB 'LOG[0-9]*'
  AND substr("id", 4) <> ''
  AND substr("id", 4) NOT GLOB '*[^0-9]*'
HAVING COUNT(*) > 0;

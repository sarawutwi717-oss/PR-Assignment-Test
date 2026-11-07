CREATE TEMP TABLE "_PRActivityLogIdMigrationMap" (
    "oldId" TEXT NOT NULL PRIMARY KEY,
    "temporaryId" TEXT NOT NULL UNIQUE,
    "newId" TEXT NOT NULL UNIQUE
);

INSERT INTO "_PRActivityLogIdMigrationMap" ("oldId", "temporaryId", "newId")
SELECT
    "id",
    '__PR_LOG_ID_MIGRATION__' || printf('%012d', ROW_NUMBER() OVER (ORDER BY "createdAt", "id")),
    'LOG' || printf('%04d', ROW_NUMBER() OVER (ORDER BY "createdAt", "id"))
FROM "PRActivityLog";

UPDATE "PRActivityLog"
SET "id" = (
    SELECT "temporaryId"
    FROM "_PRActivityLogIdMigrationMap"
    WHERE "_PRActivityLogIdMigrationMap"."oldId" = "PRActivityLog"."id"
);

UPDATE "PRActivityLog"
SET "id" = (
    SELECT "newId"
    FROM "_PRActivityLogIdMigrationMap"
    WHERE "_PRActivityLogIdMigrationMap"."temporaryId" = "PRActivityLog"."id"
);

DROP TABLE "_PRActivityLogIdMigrationMap";

INSERT OR REPLACE INTO "PRActivityLogIdSequence" ("key", "lastSequence")
SELECT 'global', COUNT(*)
FROM "PRActivityLog";

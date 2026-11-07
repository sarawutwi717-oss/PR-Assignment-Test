CREATE TEMP TABLE "_PRIdMigrationMap" (
    "oldId" TEXT NOT NULL PRIMARY KEY,
    "temporaryId" TEXT NOT NULL UNIQUE,
    "newId" TEXT NOT NULL UNIQUE
);

INSERT INTO "_PRIdMigrationMap" ("oldId", "temporaryId", "newId")
SELECT
    "id",
    '__PR_ID_MIGRATION__' || printf('%012d', ROW_NUMBER() OVER (ORDER BY "createdAt", "id")),
    'PR' || printf('%04d', ROW_NUMBER() OVER (ORDER BY "createdAt", "id"))
FROM "PRDocument";

UPDATE "PRDocument"
SET "id" = (
    SELECT "temporaryId"
    FROM "_PRIdMigrationMap"
    WHERE "_PRIdMigrationMap"."oldId" = "PRDocument"."id"
);

UPDATE "PRDocument"
SET "id" = (
    SELECT "newId"
    FROM "_PRIdMigrationMap"
    WHERE "_PRIdMigrationMap"."temporaryId" = "PRDocument"."id"
);

DROP TABLE "_PRIdMigrationMap";

INSERT OR REPLACE INTO "PRIdSequence" ("key", "lastSequence")
SELECT 'global', COUNT(*)
FROM "PRDocument"

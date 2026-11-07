CREATE TABLE "PRItemIdSequence" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "lastSequence" INTEGER NOT NULL
);

CREATE TEMP TABLE "_PRItemIdMigrationMap" (
    "oldId" TEXT NOT NULL PRIMARY KEY,
    "temporaryId" TEXT NOT NULL UNIQUE,
    "newId" TEXT NOT NULL UNIQUE
);

INSERT INTO "_PRItemIdMigrationMap" ("oldId", "temporaryId", "newId")
SELECT
    "PRItem"."id",
    '__PR_ITEM_ID_MIGRATION__' || printf('%012d', ROW_NUMBER() OVER (ORDER BY "PRDocument"."createdAt", "PRDocument"."id", "PRItem"."id")),
    'item-' || printf('%04d', ROW_NUMBER() OVER (ORDER BY "PRDocument"."createdAt", "PRDocument"."id", "PRItem"."id"))
FROM "PRItem"
JOIN "PRDocument" ON "PRDocument"."id" = "PRItem"."prId";

UPDATE "PRItem"
SET "id" = (
    SELECT "temporaryId"
    FROM "_PRItemIdMigrationMap"
    WHERE "_PRItemIdMigrationMap"."oldId" = "PRItem"."id"
);

UPDATE "PRItem"
SET "id" = (
    SELECT "newId"
    FROM "_PRItemIdMigrationMap"
    WHERE "_PRItemIdMigrationMap"."temporaryId" = "PRItem"."id"
);

DROP TABLE "_PRItemIdMigrationMap";

INSERT INTO "PRItemIdSequence" ("key", "lastSequence")
SELECT 'global', COUNT(*)
FROM "PRItem"
HAVING COUNT(*) > 0;

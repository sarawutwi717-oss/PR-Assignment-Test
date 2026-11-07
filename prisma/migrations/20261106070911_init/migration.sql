
CREATE TABLE "PRDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "subtotalCents" BIGINT NOT NULL,
    "vatCents" BIGINT NOT NULL,
    "grandTotalCents" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejectReason" TEXT
);

CREATE TABLE "PRItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" BIGINT NOT NULL,
    "totalPriceCents" BIGINT NOT NULL,
    CONSTRAINT "PRItem_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PRDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PRDocument_prNumber_key" ON "PRDocument"("prNumber");

CREATE INDEX "PRDocument_status_idx" ON "PRDocument"("status");

CREATE INDEX "PRItem_prId_idx" ON "PRItem"("prId");

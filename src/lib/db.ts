import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import {
  formatPRId,
  formatPRActivityLogId,
  formatPRItemId,
  formatPRNumber,
  nextPRActivityLogIdSequence,
  nextPRIdSequence,
  nextPRItemIdSequence,
  nextPRSequence,
} from '@/lib/pr-service';
import { PR_SEED_DATA } from '@/lib/seed-data';
import type {
  PRActivityAction,
  PRDocument,
  PRDraftInput,
  PRItem,
  PRItemInput,
  PRStatus,
  Role,
} from '@/type/pr';

type StoredPR = {
  id: string;
  prNumber: string;
  department: string;
  requesterName: string;
  subtotalCents: bigint;
  vatCents: bigint;
  grandTotalCents: bigint;
  status: string;
  createdAt: Date;
  rejectReason: string | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPriceCents: bigint;
    totalPriceCents: bigint;
  }>;
};

function toCents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

function fromCents(amount: bigint): number {
  return Number(amount) / 100;
}

function toPRDocument(record: StoredPR): PRDocument {
  return {
    id: record.id,
    prNumber: record.prNumber,
    department: record.department,
    requesterName: record.requesterName,
    items: record.items.map((item): PRItem => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: fromCents(item.unitPriceCents),
      totalPrice: fromCents(item.totalPriceCents),
    })),
    subtotal: fromCents(record.subtotalCents),
    vat: fromCents(record.vatCents),
    grandTotal: fromCents(record.grandTotalCents),
    status: record.status as PRStatus,
    createdAt: record.createdAt.toISOString(),
    ...(record.rejectReason ? { rejectReason: record.rejectReason } : {}),
  };
}

function toCreateData(pr: PRDocument) {
  return {
    id: pr.id,
    prNumber: pr.prNumber,
    department: pr.department,
    requesterName: pr.requesterName,
    subtotalCents: toCents(pr.subtotal),
    vatCents: toCents(pr.vat),
    grandTotalCents: toCents(pr.grandTotal),
    status: pr.status,
    createdAt: new Date(pr.createdAt),
    rejectReason: pr.rejectReason ?? null,
    items: {
      create: pr.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: toCents(item.unitPrice),
        totalPriceCents: toCents(item.totalPrice),
      })),
    },
  };
}

const includeItems = { items: true } as const;

async function createPRActivityLog(
  transaction: Prisma.TransactionClient,
  data: Omit<Prisma.PRActivityLogCreateInput, 'id'>,
): Promise<void> {
  const sequence = await transaction.pRActivityLogIdSequence.upsert({
    where: { key: 'global' },
    create: { key: 'global', lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
    select: { lastSequence: true },
  });
  const existingLogs = await transaction.pRActivityLog.findMany({
    where: { id: { startsWith: 'LOG' } },
    select: { id: true },
  });
  const nextSequence = nextPRActivityLogIdSequence(
    sequence.lastSequence,
    existingLogs.map((log) => log.id),
  );
  if (nextSequence !== sequence.lastSequence) {
    await transaction.pRActivityLogIdSequence.update({
      where: { key: 'global' },
      data: { lastSequence: nextSequence },
    });
  }

  await transaction.pRActivityLog.create({
    data: {
      id: formatPRActivityLogId(nextSequence),
      ...data,
    },
  });
}

async function assignPRItemIds(
  transaction: Prisma.TransactionClient,
  items: readonly PRItemInput[],
): Promise<PRItem[]> {
  const sequence = await transaction.pRItemIdSequence.upsert({
    where: { key: 'global' },
    create: { key: 'global', lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
    select: { lastSequence: true },
  });
  const existingItems = await transaction.pRItem.findMany({
    where: { id: { startsWith: 'item-' } },
    select: { id: true },
  });
  const firstSequence = nextPRItemIdSequence(
    sequence.lastSequence,
    existingItems.map((item) => item.id),
  );
  const lastSequence = firstSequence + items.length - 1;
  if (!Number.isSafeInteger(lastSequence)) {
    throw new RangeError('PR item id sequence must be a positive safe integer');
  }
  if (lastSequence !== sequence.lastSequence) {
    await transaction.pRItemIdSequence.update({
      where: { key: 'global' },
      data: { lastSequence },
    });
  }

  return items.map((item, index) => ({
    ...item,
    id: formatPRItemId(firstSequence + index),
  }));
}

export async function listPRs(status?: PRStatus): Promise<PRDocument[]> {
  const records = await prisma.pRDocument.findMany({
    where: status ? { status } : undefined,
    include: includeItems,
    orderBy: { createdAt: 'desc' },
  });

  return records.map((record) => toPRDocument(record));
}

export async function getPR(id: string): Promise<PRDocument | null> {
  const record = await prisma.pRDocument.findUnique({
    where: { id },
    include: includeItems,
  });

  return record ? toPRDocument(record) : null;
}

export async function createPR(
  pr: Omit<PRDocument, 'id' | 'prNumber' | 'items'> & { items: PRItemInput[] },
  actorRole: Role,
): Promise<PRDocument> {
  return prisma.$transaction(async (transaction) => {
    const date = pr.createdAt.slice(0, 10).replace(/-/g, '');
    const sequence = await transaction.pRNumberSequence.upsert({
      where: { date },
      create: { date, lastSequence: 1 },
      update: { lastSequence: { increment: 1 } },
      select: { lastSequence: true },
    });
    const createdAt = new Date(pr.createdAt);
    const prefix = formatPRNumber(1, createdAt).replace(/001$/, '');
    const existingNumbers = await transaction.pRDocument.findMany({
      where: { prNumber: { startsWith: prefix } },
      select: { prNumber: true },
    });
    const nextSequence = nextPRSequence(
      sequence.lastSequence,
      existingNumbers.map((record) => record.prNumber),
      createdAt,
    );
    if (nextSequence !== sequence.lastSequence) {
      await transaction.pRNumberSequence.update({
        where: { date },
        data: { lastSequence: nextSequence },
      });
    }

    const idSequence = await transaction.pRIdSequence.upsert({
      where: { key: 'global' },
      create: { key: 'global', lastSequence: 1 },
      update: { lastSequence: { increment: 1 } },
      select: { lastSequence: true },
    });
    const existingIds = await transaction.pRDocument.findMany({
      where: { id: { startsWith: 'PR' } },
      select: { id: true },
    });
    const nextIdSequence = nextPRIdSequence(
      idSequence.lastSequence,
      existingIds.map((record) => record.id),
    );
    if (nextIdSequence !== idSequence.lastSequence) {
      await transaction.pRIdSequence.update({
        where: { key: 'global' },
        data: { lastSequence: nextIdSequence },
      });
    }

    const items = await assignPRItemIds(transaction, pr.items);
    const record = await transaction.pRDocument.create({
      data: toCreateData({
        ...pr,
        id: formatPRId(nextIdSequence),
        prNumber: formatPRNumber(nextSequence, createdAt),
        items,
      }),
      include: includeItems,
    });

    await createPRActivityLog(transaction, {
      prId: record.id,
      prNumber: record.prNumber,
      actorRole,
      action: 'CREATE',
      newData: JSON.stringify(toPRDocument(record)),
      toStatus: record.status,
    });

    return toPRDocument(record);
  });
}

export async function updateDraftPR(
  id: string,
  draft: PRDraftInput,
  items: PRItemInput[],
  totals: { subtotal: number; vat: number; grandTotal: number },
  actorRole: Role,
): Promise<PRDocument | null> {
  return prisma.$transaction(async (transaction) => {
    const previousRecord = await transaction.pRDocument.findFirst({
      where: { id, status: 'DRAFT' },
      include: includeItems,
    });
    if (!previousRecord) return null;

    const updated = await transaction.pRDocument.updateMany({
      where: { id, status: 'DRAFT' },
      data: {
        department: draft.department,
        requesterName: draft.requesterName,
        subtotalCents: toCents(totals.subtotal),
        vatCents: toCents(totals.vat),
        grandTotalCents: toCents(totals.grandTotal),
      },
    });

    if (updated.count === 0) return null;

    const itemsWithIds = await assignPRItemIds(transaction, items);
    await transaction.pRItem.deleteMany({ where: { prId: id } });
    await transaction.pRItem.createMany({
      data: itemsWithIds.map((item) => ({
        id: item.id,
        prId: id,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: toCents(item.unitPrice),
        totalPriceCents: toCents(item.totalPrice),
      })),
    });

    const record = await transaction.pRDocument.findUniqueOrThrow({
      where: { id },
      include: includeItems,
    });
    await createPRActivityLog(transaction, {
      prId: record.id,
      prNumber: record.prNumber,
      actorRole,
      action: 'UPDATE',
      oldData: JSON.stringify(toPRDocument(previousRecord)),
      newData: JSON.stringify(toPRDocument(record)),
      fromStatus: 'DRAFT',
      toStatus: record.status,
    });
    return toPRDocument(record);
  });
}

export async function deleteDraftPR(id: string, actorRole: Role): Promise<boolean> {
  return prisma.$transaction(async (transaction) => {
    const record = await transaction.pRDocument.findFirst({
      where: { id, status: 'DRAFT' },
      include: includeItems,
    });
    if (!record) return false;

    await createPRActivityLog(transaction, {
      prId: record.id,
      prNumber: record.prNumber,
      actorRole,
      action: 'DELETE',
      oldData: JSON.stringify(toPRDocument(record)),
      fromStatus: record.status,
    });
    await transaction.pRItem.deleteMany({ where: { prId: id } });
    await transaction.pRDocument.delete({ where: { id } });
    return true;
  });
}

export async function transitionPR(
  id: string,
  currentStatus: PRStatus,
  targetStatus: PRStatus,
  actorRole: Role,
  action: PRActivityAction,
  rejectReason?: string,
): Promise<PRDocument | null> {
  return prisma.$transaction(async (transaction) => {
    const previousRecord = await transaction.pRDocument.findFirst({
      where: { id, status: currentStatus },
      include: includeItems,
    });
    if (!previousRecord) return null;

    const updated = await transaction.pRDocument.updateMany({
      where: { id, status: currentStatus },
      data: {
        status: targetStatus,
        ...(targetStatus === 'DRAFT' ? { rejectReason: null } : {}),
        ...(targetStatus === 'REJECTED' ? { rejectReason } : {}),
      },
    });

    if (updated.count === 0) return null;

    const record = await transaction.pRDocument.findUniqueOrThrow({
      where: { id },
      include: includeItems,
    });
    await createPRActivityLog(transaction, {
      prId: record.id,
      prNumber: record.prNumber,
      actorRole,
      action,
      oldData: JSON.stringify(toPRDocument(previousRecord)),
      newData: JSON.stringify(toPRDocument(record)),
      fromStatus: currentStatus,
      toStatus: targetStatus,
      ...(action === 'REJECT' ? {
        reason: rejectReason,
      } : {}),
    });

    return toPRDocument(record);
  });
}

export async function listPRActivityLogs(prId: string) {
  const records = await prisma.pRActivityLog.findMany({
    where: { prId },
    orderBy: { createdAt: 'asc' },
  });

  return records.map((record) => ({
    ...record,
    createdAt: record.createdAt.toISOString(),
  }));
}

export async function seedPRs(): Promise<number> {
  return prisma.$transaction(async (transaction) => {
    if (await transaction.pRDocument.count() > 0) return 0;

    for (const pr of PR_SEED_DATA) {
      await transaction.pRDocument.create({ data: toCreateData(pr) });
      const date = pr.createdAt.slice(0, 10).replace(/-/g, '');
      const sequence = Number(pr.prNumber.slice(pr.prNumber.lastIndexOf('-') + 1));
      const current = await transaction.pRNumberSequence.findUnique({
        where: { date },
        select: { lastSequence: true },
      });

      if (!current || sequence > current.lastSequence) {
        await transaction.pRNumberSequence.upsert({
          where: { date },
          create: { date, lastSequence: sequence },
          update: { lastSequence: sequence },
        });
      }
    }

    const seededIdSequence = nextPRIdSequence(
      0,
      PR_SEED_DATA.map((pr) => pr.id),
    ) - 1;
    await transaction.pRIdSequence.upsert({
      where: { key: 'global' },
      create: { key: 'global', lastSequence: seededIdSequence },
      update: { lastSequence: seededIdSequence },
    });

    const seededItemIdSequence = nextPRItemIdSequence(
      0,
      PR_SEED_DATA.flatMap((pr) => pr.items.map((item) => item.id)),
    ) - 1;
    await transaction.pRItemIdSequence.upsert({
      where: { key: 'global' },
      create: { key: 'global', lastSequence: seededItemIdSequence },
      update: { lastSequence: seededItemIdSequence },
    });

    return PR_SEED_DATA.length;
  });
}

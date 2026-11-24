// The work list of groomers ("Hàng đợi spa") and vets ("Hàng đợi khám"), 24/11: services the receptionist
// assigned at check-in and tasks a vet handed over during an exam, in one list.
// Relative imports only, so node:test can load this file directly.
import type { MyQueueItem } from '../../../types/api/appointment-service.api.ts';
import type { SubtaskRequest } from '../../../services/SubtaskRequestService/types.ts';

export type WorkSource = 'booked' | 'assigned';
export type WorkState = 'waiting' | 'doing' | 'done' | 'other';
export type WorkView = 'active' | 'done' | 'all';
export type WorkSourceFilter = 'all' | WorkSource;

export interface WorkRange {
  from: string;
  to: string;
}

export type WorkRow =
  | {
      kind: 'service';
      key: string;
      source: 'booked';
      state: WorkState;
      /** Appointment date, YYYY-MM-DD */
      date?: string;
      item: MyQueueItem;
    }
  | {
      kind: 'subtask';
      key: string;
      source: 'assigned';
      state: WorkState;
      date?: string;
      task: SubtaskRequest & { createdAt?: string };
    };

const SERVICE_STATE: Record<string, WorkState> = {
  Waiting: 'waiting',
  InProgress: 'doing',
  Done: 'done',
};

const SUBTASK_STATE: Record<string, WorkState> = {
  Pending: 'waiting',
  InProgress: 'doing',
  Completed: 'done',
};

const objectRef = <T>(ref: unknown): T | undefined =>
  ref && typeof ref === 'object' ? (ref as T) : undefined;

/** YYYY-MM-DD of an instant in Vietnam time */
export const toVietnamDay = (iso?: string | null): string | undefined => {
  if (!iso) return undefined;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return undefined;
  return new Date(time + 7 * 3_600_000).toISOString().slice(0, 10);
};

/** The appointment date of a handed-over task, else the day it was handed over */
export const getSubtaskDay = (
  task: SubtaskRequest & { createdAt?: string }
): string | undefined => {
  const service = objectRef<{ orderId?: unknown }>(task.appointmentServiceId);
  const order = objectRef<{ date?: string }>(service?.orderId);
  return order?.date || toVietnamDay(task.createdAt);
};

/**
 * Both lists as rows, spa services first in the order the BE gives (emergencies
 * first), then handed-over tasks oldest first, sorted by date (stable). Services
 * still Booked are left out: their order is not checked in yet (nghiệp vụ 5).
 */
export const buildWorkRows = (
  services: readonly MyQueueItem[],
  subtasks: readonly (SubtaskRequest & { createdAt?: string })[]
): WorkRow[] => {
  const rows: WorkRow[] = [
    ...services
      .filter(item => item.status !== 'Booked')
      .map(
        (item): WorkRow => ({
          kind: 'service',
          key: `service:${item._id}`,
          source: 'booked',
          state: SERVICE_STATE[item.status] || 'other',
          date: objectRef<{ date?: string }>(item.orderId)?.date,
          item,
        })
      ),
    ...[...subtasks]
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      .map(
        (task): WorkRow => ({
          kind: 'subtask',
          key: `subtask:${task._id}`,
          source: 'assigned',
          state: SUBTASK_STATE[task.status] || 'other',
          date: getSubtaskDay(task),
          task,
        })
      ),
  ];
  // Undated rows last; a stable sort keeps each list's own order within a day
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const da = a.row.date || '9999-12-31';
      const db = b.row.date || '9999-12-31';
      return da === db ? a.index - b.index : da.localeCompare(db);
    })
    .map(({ row }) => row);
};

const inRange = (row: WorkRow, range?: WorkRange) =>
  !range || Boolean(row.date && row.date >= range.from && row.date <= range.to);

const inView = (row: WorkRow, view: WorkView) =>
  view === 'all' ||
  (view === 'active'
    ? row.state === 'waiting' || row.state === 'doing'
    : row.state === 'done');

export const filterWorkRows = (
  rows: readonly WorkRow[],
  {
    view,
    source,
    range,
  }: { view: WorkView; source: WorkSourceFilter; range?: WorkRange }
): WorkRow[] =>
  rows.filter(
    row =>
      inRange(row, range) &&
      inView(row, view) &&
      (source === 'all' || row.source === source)
  );

/** Figures of the period: per state, per view (for the switch) and per source */
export const summarizeWork = (
  rows: readonly WorkRow[],
  range: WorkRange | undefined,
  source: WorkSourceFilter
) => {
  const inPeriod = rows.filter(row => inRange(row, range));
  const scoped = inPeriod.filter(
    row => source === 'all' || row.source === source
  );
  const count = (list: readonly WorkRow[], test: (row: WorkRow) => boolean) =>
    list.filter(test).length;
  return {
    total: scoped.length,
    waiting: count(scoped, row => row.state === 'waiting'),
    doing: count(scoped, row => row.state === 'doing'),
    done: count(scoped, row => row.state === 'done'),
    views: {
      active: count(scoped, row => inView(row, 'active')),
      done: count(scoped, row => inView(row, 'done')),
      all: scoped.length,
    } as Record<WorkView, number>,
    sources: {
      all: inPeriod.length,
      booked: count(inPeriod, row => row.source === 'booked'),
      assigned: count(inPeriod, row => row.source === 'assigned'),
    } as Record<WorkSourceFilter, number>,
  };
};

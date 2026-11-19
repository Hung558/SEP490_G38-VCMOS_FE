import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPetTimelineQuery,
  formatTimelineDate,
  getPetTimelineRefName,
  getSafeTimelineHttpUrl,
  getPetTimelineStatusLabel,
  PET_TIMELINE_TYPE_LABELS,
  sanitizeTimelineInvoices,
} from '../src/services/PetTimelineService/helpers.ts';

const makeTimeline = () => ({
  pet: {
    _id: 'pet',
    code: 'PET-1',
    name: 'Milo',
    status: 'Active',
    owner: null,
  },
  summary: {
    totalVisits: 1,
    completedVisits: 1,
    activeVisits: 0,
    totalMedicalRecords: 1,
    totalGroomingNotes: 0,
    totalInpatientStays: 1,
    hasActiveInpatient: false,
  },
  activeInpatient: {
    _id: 'stay',
    orderId: 'order',
    status: 'Discharged',
    initialDiagnosis: 'Dx',
    treatmentPlan: '',
    admittedAt: '2026-01-01',
    daysAdmitted: 1,
    attendingVet: null,
    cage: null,
    dailyLogsCount: 0,
    dailyLogs: [],
    invoice: {
      _id: 'inv-inpatient',
      code: 'INV-I',
      totalAmount: 500,
      paymentStatus: 'Paid',
      items: [],
    },
  },
  sharedPosts: [
    {
      _id: 'post',
      status: 'Published',
      content: 'Shared history',
      timelineItems: [],
      likeCount: 1,
      commentCount: 0,
      createdAt: '2026-01-01',
    },
  ],
  timeline: [
    {
      id: 'order',
      orderId: 'order',
      code: 'APT-1',
      date: '2026-01-01',
      isOnline: false,
      derivedStatus: 'Done',
      statusLabel: 'Hoàn tất',
      categories: ['Examination'],
      currentCage: null,
      services: [],
      inpatientRecord: {
        _id: 'stay',
        orderId: 'order',
        status: 'Discharged',
        admittedAt: '2026-01-01',
        daysAdmitted: 1,
        attendingVet: null,
        cage: null,
        dailyLogsCount: 0,
        dailyLogs: [],
        invoice: {
          _id: 'inv-embedded',
          code: 'INV-E',
          totalAmount: 500,
          paymentStatus: 'Paid',
          items: [],
        },
      },
      invoice: {
        _id: 'inv-order',
        code: 'INV-O',
        totalAmount: 500,
        paymentStatus: 'Paid',
        items: [],
      },
      canShareToCommunity: true,
      createdAt: '2026-01-01',
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
});

test('timeline query defaults to the contract page size and preserves filters', () => {
  assert.deepEqual(
    buildPetTimelineQuery({
      type: 'Inpatient',
      status: 'Done',
      from: '2026-11-01',
      to: '2026-11-20',
    }),
    {
      type: 'Inpatient',
      status: 'Done',
      from: '2026-11-01',
      to: '2026-11-20',
      page: 1,
      limit: 20,
    }
  );
  assert.deepEqual(buildPetTimelineQuery({ page: 2, limit: 50 }), {
    page: 2,
    limit: 50,
  });
});

test('timeline privacy removes every invoice for roles outside BE allowlist', () => {
  const source = makeTimeline();
  const sanitized = sanitizeTimelineInvoices(source, 'Veterinarian');
  assert.equal(sanitized.activeInpatient?.invoice, null);
  assert.equal(sanitized.timeline[0].invoice, null);
  assert.equal(sanitized.timeline[0].inpatientRecord?.invoice, null);
  assert.equal(source.timeline[0].invoice?.code, 'INV-O');
  for (const role of ['PetOwner', 'Receptionist', 'Admin']) {
    assert.equal(
      sanitizeTimelineInvoices(source, role).timeline[0].invoice?.code,
      'INV-O'
    );
  }
  assert.equal(sanitizeTimelineInvoices(source).timeline[0].invoice, null);
  assert.equal(
    sanitizeTimelineInvoices(source, 'admin').timeline[0].invoice,
    null
  );
});

test('timeline formats calendar dates without timezone shifts', () => {
  assert.equal(formatTimelineDate('2026-11-19'), '19/11/2026');
  assert.equal(formatTimelineDate('2026-11-19T22:00:00.000Z'), '19/11/2026');
  assert.equal(formatTimelineDate(undefined), '—');
  assert.equal(formatTimelineDate('bad-date'), '—');
});

test('nested refs support populated and ID-only contracts', () => {
  assert.equal(getPetTimelineRefName({ fullName: 'BS. An' }), 'BS. An');
  assert.equal(getPetTimelineRefName({ name: 'Khám' }), 'Khám');
  assert.equal(getPetTimelineRefName({ label: 'W-01' }), 'W-01');
  assert.equal(getPetTimelineRefName('id'), undefined);
  assert.equal(getPetTimelineRefName(null), undefined);
});

test('timeline media links allow HTTP(S) and reject script, data and credential URLs', () => {
  assert.equal(
    getSafeTimelineHttpUrl('https://res.cloudinary.com/demo/image.jpg'),
    'https://res.cloudinary.com/demo/image.jpg'
  );
  assert.equal(
    getSafeTimelineHttpUrl('http://127.0.0.1:9999/image.jpg'),
    'http://127.0.0.1:9999/image.jpg'
  );
  assert.equal(getSafeTimelineHttpUrl('javascript:alert(1)'), undefined);
  assert.equal(getSafeTimelineHttpUrl('data:image/svg+xml,<svg/>'), undefined);
  assert.equal(
    getSafeTimelineHttpUrl('https://user:pass@example.test/image.png'),
    undefined
  );
  assert.equal(getSafeTimelineHttpUrl('/relative/image.png'), undefined);
});

test('timeline filter enums have Vietnamese labels', () => {
  assert.equal(getPetTimelineStatusLabel('CheckedIn'), 'Đã tiếp đón');
  assert.equal(getPetTimelineStatusLabel('WaitOwner'), 'Chờ chủ đón');
  assert.equal(PET_TIMELINE_TYPE_LABELS.Paraclinical, 'Cận lâm sàng');
  assert.equal(getPetTimelineStatusLabel('Unknown'), 'Khác');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_BUSY_MESSAGE,
  AI_DISCLAIMER,
  AI_HISTORY_PAGE_SIZE,
  AI_MAX_PHOTO_BYTES,
  AI_MAX_SYMPTOMS,
  AI_REQUEST_TIMEOUT_MS,
  AI_SYMPTOM_OPTIONS,
  addCustomSymptom,
  aiUrgencyMeta,
  assessmentPetId,
  assessmentPetName,
  buildAiAssessmentFormData,
  buildAiHistoryQuery,
  describeClinicalContext,
  mergeSymptoms,
  pickBookingServiceId,
  readAiAssessmentError,
  safeAiImageUrls,
  symptomLabel,
  validateAiAssessmentInput,
  validateAiPhoto,
} from '../src/services/AiAssessmentService/helpers.ts';
import {
  apiAiAssessment,
  apiAiAssessments,
} from '../src/services/AiAssessmentService/urls.ts';

const PET = '6741a2b3c4d5e6f708090001';
const png = (size = 1000, name = 'a.png') => ({
  name,
  type: 'image/png',
  size,
});

test('AI routes match the BE (PR #59) and encode the id', () => {
  assert.equal(apiAiAssessments, '/ai-assessments');
  assert.equal(apiAiAssessment('abc'), '/ai-assessments/abc');
  assert.equal(apiAiAssessment('a/b?c'), '/ai-assessments/a%2Fb%3Fc');
  // The BE gives the providers 30 s in all; its doc asks the FE for 35 s
  assert.equal(AI_REQUEST_TIMEOUT_MS, 35000);
});

test('the 7 symptom codes are the BE ones; typed symptoms show as typed', () => {
  assert.deepEqual(
    AI_SYMPTOM_OPTIONS.map(option => option.code),
    [
      'lethargy',
      'vomiting',
      'diarrhoea',
      'loss_of_appetite',
      'scratching',
      'coughing',
      'limping',
    ]
  );
  assert.equal(symptomLabel('vomiting'), 'Nôn mửa (Vomiting)');
  assert.equal(symptomLabel('Chảy nước dãi'), 'Chảy nước dãi');
});

test('mergeSymptoms keeps codes first and drops blanks and case duplicates', () => {
  assert.deepEqual(
    mergeSymptoms(
      ['vomiting'],
      ['  Chảy   nước dãi ', 'chảy nước dãi', '', 'VOMITING']
    ),
    ['vomiting', 'Chảy nước dãi']
  );
});

test('addCustomSymptom checks empty, length, duplicates and the 20 cap', () => {
  assert.deepEqual(addCustomSymptom([], [], '   '), {
    ok: false,
    error: 'Nhập triệu chứng trước khi thêm',
  });
  assert.equal(addCustomSymptom([], [], 'x'.repeat(101)).ok, false);
  assert.deepEqual(addCustomSymptom(['Ho'], [], ' ho '), {
    ok: false,
    error: 'Triệu chứng này đã có trong danh sách',
  });
  // A ticked chip, by code or by its label, counts as a duplicate too
  assert.equal(addCustomSymptom([], ['vomiting'], 'Vomiting').ok, false);
  assert.equal(
    addCustomSymptom([], ['vomiting'], 'nôn mửa (vomiting)').ok,
    false
  );
  const full = Array.from(
    { length: AI_MAX_SYMPTOMS - 1 },
    (_, i) => `Dấu hiệu ${i}`
  );
  assert.deepEqual(addCustomSymptom(full, ['lethargy'], 'Mới'), {
    ok: false,
    error: `Chỉ được nhập tối đa ${AI_MAX_SYMPTOMS} triệu chứng`,
  });
  assert.deepEqual(addCustomSymptom(['Ho'], [], '  Chảy  nước dãi '), {
    ok: true,
    custom: ['Ho', 'Chảy nước dãi'],
  });
});

test('validateAiPhoto: JPG/PNG up to 5 MB only (MSG35)', () => {
  assert.equal(validateAiPhoto(png()), null);
  assert.equal(
    validateAiPhoto({
      name: 'b.jpg',
      type: 'image/jpeg',
      size: AI_MAX_PHOTO_BYTES,
    }),
    null
  );
  assert.match(
    validateAiPhoto({ name: 'c.webp', type: 'image/webp', size: 10 }),
    /^Chỉ chấp nhận ảnh định dạng JPG hoặc PNG$/
  );
  assert.match(
    validateAiPhoto({ name: 'd.gif', type: 'image/gif', size: 10 }),
    /JPG hoặc PNG/
  );
  assert.match(validateAiPhoto(png(AI_MAX_PHOTO_BYTES + 1)), /5MB/);
  assert.match(validateAiPhoto(png(0)), /rỗng/);
  // No MIME type from the browser: the extension decides
  assert.equal(validateAiPhoto({ name: 'e.JPEG', type: '', size: 10 }), null);
  assert.match(
    validateAiPhoto({ name: 'f.heic', type: '', size: 10 }),
    /JPG hoặc PNG/
  );
});

test('validateAiAssessmentInput mirrors the BE validator', () => {
  assert.deepEqual(
    validateAiAssessmentInput({
      petId: PET,
      description: 'Bé nôn 2 lần sáng nay',
      symptoms: [],
      photos: [],
    }),
    {}
  );
  const errors = validateAiAssessmentInput({
    petId: '',
    description: '   ngắn   ',
    symptoms: Array.from({ length: 21 }, (_, i) => `s${i}`),
    photos: [png(), png(), png(), png()],
  });
  assert.equal(errors.petId, 'Vui lòng chọn thú cưng cần đánh giá');
  // Trimmed length is what counts (BE trims first)
  assert.equal(
    errors.description,
    'Mô tả triệu chứng phải từ 10 đến 1000 ký tự'
  );
  assert.match(errors.symptoms, /tối đa 20/);
  assert.equal(errors.photos, 'Chỉ được tải lên tối đa 3 ảnh');
  assert.equal(
    validateAiAssessmentInput({
      petId: PET,
      description: '   ',
      symptoms: [],
      photos: [],
    }).description,
    'Mô tả chi tiết triệu chứng là bắt buộc'
  );
  assert.match(
    validateAiAssessmentInput({
      petId: PET,
      description: 'x'.repeat(1001),
      symptoms: [],
      photos: [],
    }).description,
    /10 đến 1000/
  );
  assert.match(
    validateAiAssessmentInput({
      petId: PET,
      description: 'Mô tả đủ dài',
      symptoms: [],
      photos: [png(), { name: 'x.webp', type: 'image/webp', size: 5 }],
    }).photos,
    /^Chỉ chấp nhận ảnh định dạng JPG hoặc PNG$/
  );
});

test('buildAiAssessmentFormData sends the fields the BE reads', () => {
  const photo = new File([new Uint8Array([0x89, 0x50])], 'milo.png', {
    type: 'image/png',
  });
  const body = buildAiAssessmentFormData({
    petId: PET,
    description: '  Bé nôn sau khi ăn  ',
    symptoms: ['vomiting', 'Chảy nước dãi'],
    photos: [photo, photo],
  });
  assert.equal(body.get('petId'), PET);
  assert.equal(body.get('description'), 'Bé nôn sau khi ăn');
  // A JSON string: the BE parses arrays sent through FormData this way
  assert.deepEqual(JSON.parse(body.get('symptoms')), [
    'vomiting',
    'Chảy nước dãi',
  ]);
  const files = body.getAll('photos');
  assert.equal(files.length, 2);
  assert.equal(files[0].name, 'milo.png');
  assert.deepEqual(
    JSON.parse(
      buildAiAssessmentFormData({
        petId: PET,
        description: 'x',
        symptoms: [],
        photos: [],
      }).get('symptoms')
    ),
    []
  );
});

test('urgency labels and colours; unknown values do not crash', () => {
  assert.deepEqual(aiUrgencyMeta('Urgent'), {
    label: 'Khẩn cấp (Urgent)',
    color: 'red',
    tone: 'urgent',
  });
  assert.equal(aiUrgencyMeta('Monitor').color, 'orange');
  assert.equal(aiUrgencyMeta('Routine').tone, 'routine');
  assert.equal(aiUrgencyMeta('Weird').label, 'Weird');
  assert.equal(aiUrgencyMeta(undefined).label, 'Chưa rõ');
});

test('buildAiHistoryQuery: one pet, "All" sends no urgency, fixed page size', () => {
  assert.deepEqual(buildAiHistoryQuery(PET, 'All', 2), {
    petId: PET,
    page: 2,
    limit: AI_HISTORY_PAGE_SIZE,
  });
  assert.deepEqual(buildAiHistoryQuery(PET, 'Urgent', 0), {
    petId: PET,
    urgency: 'Urgent',
    page: 1,
    limit: AI_HISTORY_PAGE_SIZE,
  });
});

test('readAiAssessmentError: 503/504 and timeouts keep the form (MSG34)', () => {
  const busy = readAiAssessmentError(
    { response: { status: 503, data: { message: AI_BUSY_MESSAGE } } },
    'fb'
  );
  assert.deepEqual(busy, {
    status: 503,
    message: AI_BUSY_MESSAGE,
    fields: {},
    retryable: true,
  });
  assert.equal(
    readAiAssessmentError({ response: { status: 504, data: {} } }, 'fb')
      .message,
    AI_BUSY_MESSAGE
  );
  assert.deepEqual(readAiAssessmentError({ code: 'ECONNABORTED' }, 'fb'), {
    status: undefined,
    message: AI_BUSY_MESSAGE,
    fields: {},
    retryable: true,
  });
  const offline = readAiAssessmentError({ code: 'ERR_NETWORK' }, 'fb');
  assert.equal(offline.retryable, true);
  assert.match(offline.message, /Không kết nối/);
});

test('readAiAssessmentError: 400 field errors, 403/404 messages, fallback', () => {
  const invalid = readAiAssessmentError(
    {
      response: {
        status: 400,
        data: {
          message: 'Mô tả triệu chứng phải từ 10 đến 1000 ký tự',
          errors: {
            description: 'Mô tả triệu chứng phải từ 10 đến 1000 ký tự',
            photos: 'Chỉ chấp nhận ảnh định dạng JPG hoặc PNG (MSG35)',
            other: 'x',
          },
        },
      },
    },
    'fb'
  );
  assert.equal(invalid.retryable, false);
  assert.deepEqual(Object.keys(invalid.fields), ['description', 'photos']);
  assert.equal(invalid.message, 'Mô tả triệu chứng phải từ 10 đến 1000 ký tự');
  const forbidden = readAiAssessmentError(
    {
      response: {
        status: 403,
        data: {
          message:
            'Bạn chỉ được gửi đánh giá AI cho thú cưng thuộc sở hữu của mình',
        },
      },
    },
    'fb'
  );
  assert.equal(
    forbidden.message,
    'Bạn chỉ được gửi đánh giá AI cho thú cưng thuộc sở hữu của mình'
  );
  assert.equal(
    readAiAssessmentError({ response: { status: 500, data: {} } }, 'fb')
      .message,
    'fb'
  );
});

test('describeClinicalContext says what the AI compared with', () => {
  assert.deepEqual(describeClinicalContext(undefined), []);
  assert.deepEqual(
    describeClinicalContext({
      recentVisitsCount: 0,
      recentMedicalRecordsCount: 0,
      recentInpatientStaysCount: 0,
      hasActiveInpatient: false,
      lastDiagnosis: null,
      knownAllergiesOrNotes: null,
    }),
    [
      'Bé chưa có bệnh án ở phòng khám; AI dựa trên hồ sơ thú cưng và mô tả của bạn',
    ]
  );
  assert.deepEqual(
    describeClinicalContext({
      recentVisitsCount: 2,
      recentMedicalRecordsCount: 1,
      recentInpatientStaysCount: 0,
      hasActiveInpatient: true,
      lastDiagnosis: 'Viêm dạ dày',
      knownAllergiesOrNotes: 'Dị ứng thịt gà',
    }),
    [
      'Đã đối chiếu 2 lượt khám, 1 bệnh án và 0 lần nội trú gần đây của bé',
      'Bé đang nội trú tại phòng khám',
      'Chẩn đoán gần nhất: Viêm dạ dày',
      'Lưu ý trên hồ sơ: Dị ứng thịt gà',
    ]
  );
});

test('pet of a result: plain id from POST, populated from GET, snapshot fallback', () => {
  const base = { recommendedServices: [], petSnapshot: { name: 'Milo' } };
  assert.equal(assessmentPetId({ ...base, petId: PET }), PET);
  assert.equal(
    assessmentPetId({ ...base, petId: { _id: PET, name: 'Mun' } }),
    PET
  );
  assert.equal(
    assessmentPetName({ ...base, petId: { _id: PET, name: 'Mun' } }),
    'Mun'
  );
  assert.equal(assessmentPetName({ ...base, petId: PET }), 'Milo');
  assert.equal(assessmentPetName({ recommendedServices: [] }), 'thú cưng');
});

test('booking uses the first suggested service that exists in the catalog', () => {
  assert.equal(pickBookingServiceId({ recommendedServices: [] }), undefined);
  assert.equal(
    pickBookingServiceId({
      recommendedServices: [
        {
          serviceId: null,
          code: null,
          name: 'Lạ',
          category: null,
          basePrice: null,
          reason: '',
        },
        {
          serviceId: 's2',
          code: 'SRV-2',
          name: 'Khám',
          category: 'Examination',
          basePrice: 150000,
          reason: '',
        },
      ],
    }),
    's2'
  );
});

test('only plain http(s) photo links are shown', () => {
  assert.deepEqual(
    safeAiImageUrls([
      'https://res.cloudinary.com/x/a.png',
      'http://localhost:3100/b.jpg',
      'javascript:alert(1)',
      'https://user:pw@evil.test/c.png',
      'not a url',
    ]),
    ['https://res.cloudinary.com/x/a.png', 'http://localhost:3100/b.jpg']
  );
  assert.deepEqual(safeAiImageUrls(undefined), []);
  assert.match(AI_DISCLAIMER, /không thay thế chẩn đoán của bác sĩ thú y/);
});

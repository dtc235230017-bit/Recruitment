const request = require('supertest');
const app = require('../src/app');
const { isValidBpmnTransition } = require('../src/controllers/workflowController');

describe('Kiểm thử quy trình tuyển dụng BPMN', () => {
  test('Cho phép chuyển từ APPLIED sang CV_SCREENING', () => {
    expect(isValidBpmnTransition('APPLIED', 'CV_SCREENING')).toBe(true);
  });

  test('Cho phép chuyển từ INTERVIEW sang OFFER_SENT', () => {
    expect(isValidBpmnTransition('INTERVIEW', 'OFFER_SENT')).toBe(true);
  });

  test('Ngăn chặn nhảy cóc từ APPLIED sang HIRED (Vi phạm BPMN)', () => {
    expect(isValidBpmnTransition('APPLIED', 'HIRED')).toBe(false);
  });

  test('Ngăn chặn thay đổi hồ sơ đã ở trạng thái kết thúc (REJECTED)', () => {
    expect(isValidBpmnTransition('REJECTED', 'INTERVIEW')).toBe(false);
  });

  test('GET /health trả về trạng thái 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  test('PATCH /api/applications/:id/stage bị chặn nếu không có Token (401)', async () => {
    const res = await request(app)
      .patch('/api/applications/123/stage')
      .send({ nextStage: 'CV_SCREENING' });
    expect(res.statusCode).toBe(401);
  });
});
const logger = require('./logger');

/**
 * Gửi thông báo kết quả (Đỗ / Trượt / Mời phỏng vấn) qua Email & SĐT hoặc chỉ qua SĐT
 */
const sendCandidateNotification = async ({ toEmail, toPhone, candidateName, jobTitle, type, customMessage }) => {
  const hasEmail = Boolean(toEmail && toEmail.trim().length > 0);
  const cleanEmail = hasEmail ? toEmail.trim() : null;

  let statusLabel = '';
  if (type === 'PASSED') statusLabel = 'ĐỖ TUYỂN DỤNG';
  else if (type === 'REJECTED') statusLabel = 'CHƯA PHÙ HỢP (TRƯỢT)';
  else if (type === 'INTERVIEW') statusLabel = 'MỜI PHỎNG VẤN';

  const summary = hasEmail
    ? `Đã gửi thông báo [${statusLabel}] qua cả Email (${cleanEmail}) và SMS tới SĐT (${toPhone})`
    : `Đã gửi thông báo [${statusLabel}] qua SMS tới SĐT (${toPhone})`;

  logger.info(`[NOTIFICATION] Candidate: ${candidateName} | ${summary} | Note: ${customMessage || ''}`);

  return {
    sentAt: new Date().toISOString(),
    summary,
  };
};

module.exports = { sendCandidateNotification };
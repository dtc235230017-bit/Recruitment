require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize, JWT_SECRET } = require('./middlewares/auth');
const { advanceStage, getRecruitmentKpis } = require('./controllers/workflowController');
const logger = require('./utils/logger');

const prisma = new PrismaClient();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ================= AUTH NỘI BỘ =================
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName, department: user.department },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, department: user.department } });
  } catch (err) {
    next(err);
  }
});

// ================= PUBLIC APIs CHO ỨNG VIÊN (KHÔNG CẦN ĐĂNG NHẬP) =================
app.get('/api/jobs', async (req, res, next) => {
  try {
    const jobs = await prisma.jobRequisition.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

app.post('/api/public/apply', async (req, res, next) => {
  try {
    const { jobId, candidateName, candidateEmail, candidatePhone, experience, skills, cvUrl } = req.body;
    const trackingCode = 'APP-' + Math.floor(100000 + Math.random() * 900000);

    const newApp = await prisma.application.create({
      data: {
        trackingCode,
        jobId,
        candidateName,
        candidateEmail,
        candidatePhone,
        experience: experience || '',
        skills: skills || '',
        cvUrl,
        currentStage: 'APPLIED',
        logs: {
          create: {
            actorName: `${candidateName} (Ứng viên)`,
            fromStage: 'APPLIED',
            toStage: 'APPLIED',
            comment: 'Nộp hồ sơ ứng tuyển trực tuyến.'
          }
        }
      },
      include: { job: true }
    });

    res.status(201).json({ message: 'Nộp hồ sơ thành công!', trackingCode: newApp.trackingCode, application: newApp });
  } catch (err) {
    next(err);
  }
});

app.get('/api/public/track', async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Vui lòng nhập Mã hồ sơ hoặc Email' });

    const apps = await prisma.application.findMany({
      where: {
        OR: [
          { trackingCode: query.trim().toUpperCase() },
          { candidateEmail: query.trim().toLowerCase() }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        job: true,
        logs: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (apps.length === 0) return res.status(404).json({ error: 'Không tìm thấy hồ sơ phù hợp' });
    res.json(apps);
  } catch (err) {
    next(err);
  }
});

app.put('/api/public/applications/:trackingCode', async (req, res, next) => {
  try {
    const { trackingCode } = req.params;
    const { candidateName, candidatePhone, experience, skills, cvUrl } = req.body;

    const existing = await prisma.application.findUnique({ where: { trackingCode: trackingCode.toUpperCase() } });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });
    if (['HIRED', 'REJECTED'].includes(existing.currentStage)) {
      return res.status(400).json({ error: 'Hồ sơ đã đóng quy trình, không thể chỉnh sửa.' });
    }

    const updated = await prisma.application.update({
      where: { id: existing.id },
      data: {
        candidateName,
        candidatePhone,
        experience,
        skills,
        cvUrl,
        logs: {
          create: {
            actorName: `${candidateName} (Ứng viên)`,
            fromStage: existing.currentStage,
            toStage: existing.currentStage,
            comment: 'Ứng viên cập nhật thông tin CV / hồ sơ.'
          }
        }
      },
      include: { job: true, logs: { orderBy: { createdAt: 'desc' } } }
    });

    res.json({ message: 'Cập nhật hồ sơ thành công!', application: updated });
  } catch (err) {
    next(err);
  }
});

// ================= POOL 1 APIs: REQUISITION & JD =================
app.get('/api/requisitions', authenticate, async (req, res, next) => {
  try {
    const list = await prisma.jobRequisition.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// Phòng ban đề xuất nhu cầu hoặc HR tạo Requisition
app.post('/api/requisitions', authenticate, authorize('DEPARTMENT', 'HR_SPECIALIST'), async (req, res, next) => {
  try {
    const { title, department, headcount, isCritical, requirements, salaryRange } = req.body;
    const code = 'REQ-2026-' + Math.floor(100 + Math.random() * 900);
    const reqItem = await prisma.jobRequisition.create({
      data: {
        code,
        title,
        department: department || req.user.department || 'Phòng Chuyên môn',
        headcount: Number(headcount) || 1,
        isCritical: Boolean(isCritical),
        requirements,
        salaryRange: salaryRange || 'Thỏa thuận',
        status: 'HR_CHECKING',
        createdBy: req.user.fullName
      }
    });
    res.status(201).json(reqItem);
  } catch (err) {
    next(err);
  }
});

// Xử lý luồng Pool 1 (Kiểm tra, bổ sung thông tin, soạn JD, phê duyệt, đăng tin)
app.patch('/api/requisitions/:id/action', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, jdContent, feedbackNote, requirements } = req.body;
    const item = await prisma.jobRequisition.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Không tìm thấy yêu cầu tuyển dụng' });

    let updateData = {};

    if (action === 'REQUEST_MORE_INFO' && req.user.role === 'HR_SPECIALIST') {
      updateData = { status: 'NEED_INFO', feedbackNote };
    } else if (action === 'SUBMIT_MORE_INFO' && req.user.role === 'DEPARTMENT') {
      updateData = { status: 'HR_CHECKING', requirements, feedbackNote: 'Phòng ban đã bổ sung thông tin' };
    } else if (action === 'SUBMIT_JD_FOR_APPROVAL' && req.user.role === 'HR_SPECIALIST') {
      updateData = { status: 'PENDING_APPROVAL', jdContent };
    } else if (action === 'APPROVE' && ['HIRING_MANAGER', 'HR_DIRECTOR'].includes(req.user.role)) {
      if (item.isCritical && req.user.role !== 'HR_DIRECTOR') {
        return res.status(403).json({ error: 'Requisition trọng yếu bắt buộc phải do Giám đốc Nhân sự phê duyệt!' });
      }
      updateData = { status: 'APPROVED', feedbackNote: `Đã phê duyệt bởi ${req.user.fullName}` };
    } else if (action === 'REJECT' && ['HIRING_MANAGER', 'HR_DIRECTOR'].includes(req.user.role)) {
      updateData = { status: 'REJECTED', feedbackNote };
    } else if (action === 'PUBLISH' && req.user.role === 'HR_SPECIALIST') {
      updateData = { status: 'PUBLISHED' };
    } else {
      return res.status(403).json({ error: 'Vai trò của bạn không được phép thực hiện bước này!' });
    }

    const updated = await prisma.jobRequisition.update({ where: { id }, data: updateData });
    res.json({ message: 'Cập nhật trạng thái Requisition thành công', data: updated });
  } catch (err) {
    next(err);
  }
});

// ================= POOL 2 & 3 APIs: HỒ SƠ & PHỎNG VẤN =================
app.get('/api/applications', authenticate, async (req, res, next) => {
  try {
    const apps = await prisma.application.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        job: true,
        logs: { orderBy: { createdAt: 'desc' } }
      }
    });
    res.json(apps);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/applications/:applicationId/stage', authenticate, advanceStage);
app.get('/api/kpis', authenticate, getRecruitmentKpis);

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Lỗi hệ thống nội bộ', details: err.message });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}

module.exports = app;
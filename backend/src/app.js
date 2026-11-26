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

// ================= ĐĂNG NHẬP NỘI BỘ =================
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
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

app.post('/api/auth/google', async (req, res, next) => {
  try {
    const { email, fullName, expectedRole } = req.body;
    if (!email || !expectedRole) return res.status(400).json({ error: 'Thiếu thông tin tài khoản Google' });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName: fullName || email.split('@')[0],
          googleId: `gg_${Date.now()}`,
          role: expectedRole,
          department: expectedRole === 'DEPARTMENT' ? 'Phòng Chuyên môn' : 'Phòng Nhân sự'
        }
      });
    } else if (user.role !== expectedRole) {
      return res.status(403).json({ error: 'Email Google này đã thuộc một vai trò khác trong hệ thống!' });
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

// ================= CỔNG ỨNG VIÊN =================
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
    if (!jobId) return res.status(400).json({ error: 'Vui lòng chọn vị trí ứng tuyển!' });
    if (!candidatePhone || !candidatePhone.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập Số điện thoại để nhận thông báo kết quả!' });
    }

    const cleanEmail = (candidateEmail && candidateEmail.trim()) ? candidateEmail.trim() : null;
    const trackingCode = 'HS-' + Math.floor(100000 + Math.random() * 900000);

    const newApp = await prisma.application.create({
      data: {
        trackingCode,
        jobId,
        candidateName,
        candidateEmail: cleanEmail,
        candidatePhone: candidatePhone.trim(),
        experience: experience || '',
        skills: skills || '',
        cvUrl,
        currentStage: 'APPLIED',
        logs: {
          create: {
            actorName: `${candidateName} (Ứng viên)`,
            fromStage: 'APPLIED',
            toStage: 'APPLIED',
            comment: cleanEmail
              ? `Ứng viên nộp hồ sơ (Nhận thông báo qua Email: ${cleanEmail} và SĐT: ${candidatePhone.trim()}).`
              : `Ứng viên nộp hồ sơ (Không nhập Email - Nhận thông báo qua SĐT: ${candidatePhone.trim()}).`
          }
        }
      },
      include: { job: true, logs: { orderBy: { createdAt: 'desc' } } }
    });

    res.status(201).json({ message: 'Nộp hồ sơ thành công!', application: newApp });
  } catch (err) {
    next(err);
  }
});
app.post('/api/public/my-applications', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.json([]);
    const apps = await prisma.application.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'desc' },
      include: { job: true, logs: { orderBy: { createdAt: 'desc' } } }
    });
    res.json(apps);
  } catch (err) {
    next(err);
  }
});

app.put('/api/public/applications/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { candidateName, candidatePhone, experience, skills, cvUrl } = req.body;
    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });

    const updated = await prisma.application.update({
      where: { id },
      data: {
        candidateName, candidatePhone, experience, skills, cvUrl,
        logs: {
          create: {
            actorName: `${candidateName} (Ứng viên)`,
            fromStage: existing.currentStage,
            toStage: existing.currentStage,
            comment: 'Ứng viên cập nhật hồ sơ.'
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

// ================= QUẢN LÝ YÊU CẦU TUYỂN DỤNG & MÃ NGHỀ =================
app.get('/api/requisitions', authenticate, async (req, res, next) => {
  try {
    const list = await prisma.jobRequisition.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

app.post('/api/requisitions', authenticate, authorize('DEPARTMENT'), async (req, res, next) => {
  try {
    const { code, title, department, headcount, isCritical, requirements, salaryRange } = req.body;
    const jobCode = (code && code.trim()) ? code.trim().toUpperCase() : ('MN-' + Math.floor(1000 + Math.random() * 9000));
    const reqItem = await prisma.jobRequisition.create({
      data: {
        code: jobCode,
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
      updateData = { status: 'HR_CHECKING', requirements, feedbackNote: 'Quản lý Phòng ban đã bổ sung thông tin' };
    } else if (action === 'SUBMIT_JD_FOR_APPROVAL' && req.user.role === 'HR_SPECIALIST') {
      updateData = { status: 'PENDING_APPROVAL', jdContent };
    } else if (action === 'APPROVE') {
      if (item.isCritical && req.user.role !== 'HR_DIRECTOR') {
        return res.status(403).json({ error: 'Vị trí trọng yếu phải do Giám đốc Nhân sự phê duyệt!' });
      }
      if (!item.isCritical && req.user.role !== 'HIRING_MANAGER') {
        return res.status(403).json({ error: 'Mô tả công việc thông thường do Quản lý Tuyển dụng phê duyệt!' });
      }
      updateData = { status: 'APPROVED', feedbackNote: `Đã phê duyệt bởi ${req.user.fullName}` };
    } else if (action === 'REJECT' && ['HIRING_MANAGER', 'HR_DIRECTOR'].includes(req.user.role)) {
      updateData = { status: 'REJECTED', feedbackNote };
    } else if (action === 'PUBLISH' && req.user.role === 'HR_SPECIALIST') {
      updateData = { status: 'PUBLISHED' };
    } else if (action === 'CLOSE_REGISTRATION' && req.user.role === 'HR_SPECIALIST') {
      updateData = { status: 'CLOSED' };
    } else {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này!' });
    }

    const updated = await prisma.jobRequisition.update({ where: { id }, data: updateData });
    res.json({ message: 'Cập nhật trạng thái thành công', data: updated });
  } catch (err) {
    next(err);
  }
});

// ================= GIẢ LẬP NHẬN 18-20 CV & API SÀNG LỌC XẾP HẠNG VÒNG ĐẦU =================
app.post('/api/requisitions/:id/simulate-cvs', authenticate, authorize('HR_SPECIALIST'), async (req, res, next) => {
  try {
    const job = await prisma.jobRequisition.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Không tìm thấy vị trí tuyển dụng' });

    const sampleCandidates = [
      { name: 'Nguyễn Minh Khôi', exp: '4 năm kinh nghiệm lập trình thực tế', skills: 'Node.js, React, Express, Prisma, SQL, Docker' },
      { name: 'Trần Thu Hà', exp: '3 năm kinh nghiệm phát triển hệ thống', skills: 'React, Node.js, SQL, HTML, CSS' },
      { name: 'Lê Quốc Bảo', exp: '5 năm kinh nghiệm kiến trúc phần mềm', skills: 'Node.js, React, Docker, BPMN 2.0, SRS, SQL' },
      { name: 'Phạm Ngọc Lan', exp: '2 năm kinh nghiệm phân tích nghiệp vụ', skills: 'BPMN 2.0, SRS, UML, SQL, Phân tích hệ thống' },
      { name: 'Hoàng Văn Đức', exp: '1 năm kinh nghiệm thực tập', skills: 'HTML, CSS, Word, Excel' },
      { name: 'Vũ Thị Mai Anh', exp: '3 năm kinh nghiệm chuyên môn', skills: 'Node.js, React, Docker, Git' },
      { name: 'Đặng Quang Huy', exp: '4 năm kinh nghiệm triển khai dự án', skills: 'BPMN 2.0, SRS, SQL, Quản lý dự án' },
      { name: 'Bùi Thanh Tùng', exp: '6 tháng kinh nghiệm', skills: 'Java cơ bản, Tin học văn phòng' },
      { name: 'Ngô Thị Phương Thảo', exp: '3 năm kinh nghiệm lập trình Web', skills: 'React, Node.js, Express, MongoDB' },
      { name: 'Đỗ Hoàng Nam', exp: '2 năm kinh nghiệm Backend', skills: 'Node.js, Express, Prisma, SQL' },
      { name: 'Dương Khánh Linh', exp: '4 năm kinh nghiệm BA & Thiết kế', skills: 'BPMN 2.0, UML, SRS, Phân tích hệ thống' },
      { name: 'Lý Tuấn Kiệt', exp: '1.5 năm kinh nghiệm Frontend', skills: 'React, Tailwind CSS, JavaScript' },
      { name: 'Trịnh Bảo Ngọc', exp: '3.5 năm kinh nghiệm Fullstack', skills: 'Node.js, React, SQL, Docker' },
      { name: 'Phan Văn Hải', exp: 'Mới tốt nghiệp đại học', skills: 'C++, Tin học văn phòng' },
      { name: 'Hồ Thị Kim Ngân', exp: '2.5 năm kinh nghiệm kiểm thử & BA', skills: 'SRS, SQL, Kiểm thử phần mềm' },
      { name: 'Võ Minh Quân', exp: '5 năm kinh nghiệm Senior', skills: 'Node.js, React, Express, Prisma, SQL, Docker' },
      { name: 'Tạ Thị Bích Ngọc', exp: '1 năm kinh nghiệm hỗ trợ', skills: 'Excel, Giao tiếp khách hàng' },
      { name: 'Chu Đức Mạnh', exp: '3 năm kinh nghiệm hệ thống', skills: 'SQL, Docker, Linux, Node.js' }
    ];

    const createdList = [];
    for (let i = 0; i < sampleCandidates.length; i++) {
      const c = sampleCandidates[i];
      const trackingCode = 'HS-' + Math.floor(100000 + Math.random() * 900000);
      const emailSlug = c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase();
      const appItem = await prisma.application.create({
        data: {
          trackingCode,
          jobId: job.id,
          candidateName: c.name,
          candidateEmail: `${emailSlug}${i + 1}@gmail.com`,
          candidatePhone: `098${Math.floor(1000000 + Math.random() * 8999999)}`,
          experience: c.exp,
          skills: c.skills,
          cvUrl: `https://drive.google.com/mau-cv-${emailSlug}.pdf`,
          currentStage: 'APPLIED',
          logs: {
            create: {
              actorName: `${c.name} (Ứng viên)`,
              fromStage: 'APPLIED',
              toStage: 'APPLIED',
              comment: 'Nộp hồ sơ theo mẫu chuẩn.'
            }
          }
        }
      });
      createdList.push(appItem);
    }

    res.json({
      message: `Đã nhận thành công ${createdList.length} hồ sơ ứng viên nộp vào vị trí "${job.title}"!`,
      count: createdList.length
    });
  } catch (err) {
    next(err);
  }
});

// API Sàng lọc vòng đầu: So sánh tiêu chí tuyển dụng & Xếp thứ tự (KHÔNG đưa ra nhận xét)
app.post('/api/requisitions/:id/ai-rank', authenticate, authorize('HR_SPECIALIST'), async (req, res, next) => {
  try {
    const job = await prisma.jobRequisition.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Không tìm thấy vị trí tuyển dụng' });

    const apps = await prisma.application.findMany({
      where: { jobId: job.id, currentStage: { in: ['APPLIED', 'CV_SCREENING'] } }
    });

    if (apps.length === 0) {
      return res.status(400).json({ error: 'Chưa có hồ sơ mới nào trong vị trí này để sàng lọc!' });
    }

    // Tách từ khóa tiêu chí tuyển dụng từ JD / Requirements
    const criteriaKeywords = job.requirements
      .toLowerCase()
      .split(/[,.;/()]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);

    // Chấm điểm đối chiếu tiêu chí khách quan
    const scoredApps = apps.map((app) => {
      const candidateText = `${app.skills} ${app.experience}`.toLowerCase();
      let matchedCount = 0;
      criteriaKeywords.forEach((kw) => {
        if (candidateText.includes(kw)) matchedCount++;
      });

      const keywordRatio = criteriaKeywords.length > 0 ? (matchedCount / criteriaKeywords.length) : 0.5;
      const expYearsMatch = app.experience.match(/(\d+(\.\d+)?)\s*năm/);
      const years = expYearsMatch ? parseFloat(expYearsMatch[1]) : 0.5;
      const expBonus = Math.min(years * 5, 20);

      const rawScore = Math.round(keywordRatio * 80 + expBonus);
      const finalScore = Math.min(Math.max(rawScore, 15), 99);
      return { ...app, computedScore: finalScore };
    });

    // Sắp xếp thứ tự từ cao xuống thấp
    scoredApps.sort((a, b) => b.computedScore - a.computedScore);

    // Cập nhật điểm, thứ hạng & chuyển sang bước Đang sàng lọc vòng đầu (KHÔNG ghi nhận xét)
    await prisma.$transaction(
      scoredApps.map((item, idx) =>
        prisma.application.update({
          where: { id: item.id },
          data: {
            aiMatchScore: item.computedScore,
            aiRank: idx + 1,
            currentStage: 'CV_SCREENING'
          }
        })
      )
    );

    res.json({
      message: `API Sàng lọc đã đối chiếu tiêu chí và xếp thứ tự xong ${scoredApps.length} hồ sơ!`
    });
  } catch (err) {
    next(err);
  }
});

// ================= QUẢN LÝ HỒ SƠ & PHỎNG VẤN =================
app.get('/api/applications', authenticate, async (req, res, next) => {
  try {
    const apps = await prisma.application.findMany({
      orderBy: [{ aiRank: 'asc' }, { updatedAt: 'desc' }],
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
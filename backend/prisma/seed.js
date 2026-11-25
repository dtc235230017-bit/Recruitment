const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobRequisition.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('123456', 10);

  // 4 Vai trò nội bộ (Ứng viên không cần tài khoản)
  const deptUser = await prisma.user.create({
    data: {
      email: 'phongban@company.com',
      passwordHash,
      fullName: 'Phạm Minh Tuấn (Trưởng Phòng IT)',
      role: 'DEPARTMENT',
      department: 'Phòng Công nghệ Thông tin',
    },
  });

  const hrSpec = await prisma.user.create({
    data: {
      email: 'hr@company.com',
      passwordHash,
      fullName: 'Nguyễn Thị Mai (Chuyên viên Nhân sự)',
      role: 'HR_SPECIALIST',
      department: 'Phòng Nhân sự',
    },
  });

  const hiringMgr = await prisma.user.create({
    data: {
      email: 'manager@company.com',
      passwordHash,
      fullName: 'Trần Văn Nam (Quản lý Tuyển dụng)',
      role: 'HIRING_MANAGER',
      department: 'Phòng Nhân sự',
    },
  });

  const hrDirector = await prisma.user.create({
    data: {
      email: 'director@company.com',
      passwordHash,
      fullName: 'Lê Thanh Hương (Giám đốc Nhân sự)',
      role: 'HR_DIRECTOR',
      department: 'Ban Giám đốc',
    },
  });

  // Requisition 1: Đã duyệt & Đăng tin công khai
  const jobPublished = await prisma.jobRequisition.create({
    data: {
      code: 'REQ-2026-001',
      title: 'Senior Fullstack Developer (Node.js / React)',
      department: 'Phòng Công nghệ Thông tin',
      headcount: 2,
      isCritical: true,
      requirements: 'Tốt nghiệp ĐH CNTT, 3+ năm kinh nghiệm Node.js, React, PostgreSQL.',
      jdContent: 'Xây dựng hệ thống lõi doanh nghiệp, thiết kế RESTful API, tối ưu hiệu năng và tham gia review code.',
      salaryRange: '30 - 45 Triệu VNĐ',
      status: 'PUBLISHED',
      createdBy: deptUser.fullName,
    },
  });

  // Requisition 2: Phòng ban mới đề xuất, đang chờ HR kiểm tra & soạn JD
  await prisma.jobRequisition.create({
    data: {
      code: 'REQ-2026-002',
      title: 'Chuyên viên Phân tích Nghiệp vụ (BA / BPMN 2.0)',
      department: 'Phòng Công nghệ Thông tin',
      headcount: 1,
      isCritical: false,
      requirements: 'Thành thạo vẽ quy trình BPMN 2.0, viết tài liệu SRS, giao tiếp tốt với các phòng ban.',
      salaryRange: '20 - 30 Triệu VNĐ',
      status: 'HR_CHECKING',
      createdBy: deptUser.fullName,
    },
  });

  // Hồ sơ ứng viên mẫu
  await prisma.application.create({
    data: {
      trackingCode: 'APP-100001',
      jobId: jobPublished.id,
      candidateName: 'Lê Hoàng Anh',
      candidateEmail: 'hoanganh@gmail.com',
      candidatePhone: '0912345678',
      experience: '4 năm lập trình Fullstack Node.js & React',
      skills: 'Node.js, Express, React, Docker, BPMN',
      cvUrl: 'https://drive.google.com/cv-le-hoang-anh.pdf',
      interviewSchedule: '09:30 Sáng Thứ 5 (27/11/2026) - Phòng họp Tầng 4',
      currentStage: 'INTERVIEW_SCHEDULED',
      logs: {
        create: [
          {
            actorName: 'Lê Hoàng Anh (Ứng viên)',
            fromStage: 'APPLIED',
            toStage: 'APPLIED',
            comment: 'Nộp hồ sơ ứng tuyển trực tuyến.',
          },
          {
            actorId: hrSpec.id,
            actorName: hrSpec.fullName,
            fromStage: 'APPLIED',
            toStage: 'CV_SCREENING',
            comment: 'Tiếp nhận và sàng lọc CV đạt yêu cầu.',
          },
          {
            actorId: hrSpec.id,
            actorName: hrSpec.fullName,
            fromStage: 'CV_SCREENING',
            toStage: 'INTERVIEW_SCHEDULED',
            comment: 'Đã liên hệ ứng viên và chốt lịch phỏng vấn với Phòng IT.',
          },
        ],
      },
    },
  });

  console.log('Seed dữ liệu 5 vai trò & 3 Pool BPMN thành công!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobRequisition.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('123456', 10);

  const deptUser = await prisma.user.create({
    data: {
      email: 'phongban@company.com',
      passwordHash,
      fullName: 'Phạm Minh Tuấn (Quản lý Phòng CNTT)',
      role: 'DEPARTMENT',
      department: 'Phòng Công nghệ Thông tin',
    },
  });

  await prisma.user.create({
    data: {
      email: 'hr@company.com',
      passwordHash,
      fullName: 'Nguyễn Thị Mai (Chuyên viên Nhân sự)',
      role: 'HR_SPECIALIST',
      department: 'Phòng Nhân sự',
    },
  });

  await prisma.user.create({
    data: {
      email: 'manager@company.com',
      passwordHash,
      fullName: 'Trần Văn Nam (Quản lý Tuyển dụng)',
      role: 'HIRING_MANAGER',
      department: 'Phòng Nhân sự',
    },
  });

  await prisma.user.create({
    data: {
      email: 'director@company.com',
      passwordHash,
      fullName: 'Lê Thanh Hương (Giám đốc Nhân sự)',
      role: 'HR_DIRECTOR',
      department: 'Ban Giám đốc',
    },
  });

  await prisma.jobRequisition.create({
    data: {
      code: 'MN-IT-01',
      title: 'Kỹ sư Phát triển Phần mềm Fullstack (Node.js / React)',
      department: 'Phòng Công nghệ Thông tin',
      headcount: 2,
      isCritical: true,
      requirements: 'Node.js, React, Express, Prisma, SQL, Docker, 3 năm kinh nghiệm',
      jdContent: 'Phát triển hệ thống phần mềm doanh nghiệp, xây dựng API RESTful và giao diện người dùng hiện đại.',
      salaryRange: '30 - 45 Triệu VNĐ',
      status: 'PUBLISHED',
      createdBy: deptUser.fullName,
    },
  });

  await prisma.jobRequisition.create({
    data: {
      code: 'MN-BA-02',
      title: 'Chuyên viên Phân tích Nghiệp vụ (BA / BPMN 2.0)',
      department: 'Phòng Công nghệ Thông tin',
      headcount: 1,
      isCritical: false,
      requirements: 'BPMN 2.0, SRS, UML, SQL, Phân tích hệ thống, 2 năm kinh nghiệm',
      jdContent: 'Khảo sát nghiệp vụ các phòng ban, chuẩn hóa quy trình BPMN 2.0 và viết tài liệu đặc tả hệ thống.',
      salaryRange: '20 - 30 Triệu VNĐ',
      status: 'PUBLISHED',
      createdBy: deptUser.fullName,
    },
  });

  console.log('Khởi tạo dữ liệu Mã nghề & Tin tuyển dụng thành công!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
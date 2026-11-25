const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

// Ma trận chuyển trạng thái chuẩn theo Pool 2 & Pool 3 của sơ đồ BPMN
const VALID_TRANSITIONS = {
  APPLIED: ['CV_SCREENING', 'REJECTED'],
  CV_SCREENING: ['INTERVIEW_SCHEDULED', 'REJECTED'],
  INTERVIEW_SCHEDULED: ['INTERVIEWED', 'REJECTED'],
  INTERVIEWED: ['OFFER_PENDING_APPROVAL', 'REJECTED'],
  OFFER_PENDING_APPROVAL: ['OFFER_SENT', 'REJECTED'],
  OFFER_SENT: ['ONBOARDING_DOCS', 'REJECTED'],
  ONBOARDING_DOCS: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: []
};

const isValidBpmnTransition = (currentStage, nextStage) => {
  const allowed = VALID_TRANSITIONS[currentStage] || [];
  return allowed.includes(nextStage);
};

const advanceStage = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { nextStage, comment, interviewSchedule, interviewScore } = req.body;
    const actor = await prisma.user.findUnique({ where: { id: req.user.id } });

    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) return res.status(404).json({ error: 'Không tìm thấy hồ sơ ứng tuyển' });

    if (!isValidBpmnTransition(application.currentStage, nextStage)) {
      return res.status(400).json({
        error: `Sai luồng BPMN: Không thể chuyển từ [${application.currentStage}] sang [${nextStage}]`
      });
    }

    // Kiểm tra quyền phê duyệt Offer cuối cùng (Chỉ Quản lý Tuyển dụng hoặc Giám đốc NS)
    if (application.currentStage === 'OFFER_PENDING_APPROVAL' && nextStage === 'OFFER_SENT') {
      if (!['HIRING_MANAGER', 'HR_DIRECTOR'].includes(actor.role)) {
        return res.status(403).json({
          error: 'Chỉ Quản lý Tuyển dụng hoặc Giám đốc Nhân sự mới có quyền phê duyệt Offer!'
        });
      }
    }

    const updateData = { currentStage: nextStage };
    if (interviewSchedule) updateData.interviewSchedule = interviewSchedule;
    if (interviewScore) updateData.interviewScore = interviewScore;

    const [updatedApp] = await prisma.$transaction([
      prisma.application.update({ where: { id: applicationId }, data: updateData }),
      prisma.auditLog.create({
        data: {
          applicationId,
          actorId: actor.id,
          actorName: actor.fullName,
          fromStage: application.currentStage,
          toStage: nextStage,
          comment: comment || `Chuyển bước sang ${nextStage}`
        }
      })
    ]);

    logger.info(`Application ${application.trackingCode}: ${application.currentStage} -> ${nextStage}`);
    res.json({ message: 'Cập nhật quy trình thành công', data: updatedApp });
  } catch (error) {
    next(error);
  }
};

const getRecruitmentKpis = async (req, res, next) => {
  try {
    const stageCounts = await prisma.application.groupBy({
      by: ['currentStage'],
      _count: { id: true }
    });
    const reqCounts = await prisma.jobRequisition.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    const totalApplications = await prisma.application.count();
    const totalRequisitions = await prisma.jobRequisition.count();

    res.json({ totalApplications, totalRequisitions, stageCounts, reqCounts });
  } catch (error) {
    next(error);
  }
};

module.exports = { VALID_TRANSITIONS, isValidBpmnTransition, advanceStage, getRecruitmentKpis };
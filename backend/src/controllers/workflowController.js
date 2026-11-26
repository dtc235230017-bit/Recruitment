const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendCandidateNotification } = require('../utils/emailService');

const STAGE_NAMES_VI = {
  APPLIED: 'Mới nộp hồ sơ',
  CV_SCREENING: 'Đã xếp hạng vòng đầu',
  INTERVIEW_SCHEDULED: 'Đã hẹn lịch phỏng vấn',
  INTERVIEWED: 'Đã phỏng vấn & Đánh giá',
  OFFER_PENDING_APPROVAL: 'Chờ duyệt thư mời nhận việc',
  OFFER_SENT: 'Đã gửi thư mời nhận việc (Đỗ)',
  ONBOARDING_DOCS: 'Hoàn thiện hồ sơ nhận việc',
  HIRED: 'Trúng tuyển chính thức (Đỗ)',
  REJECTED: 'Không đạt / Từ chối (Trượt)'
};

const VALID_TRANSITIONS = {
  APPLIED: ['CV_SCREENING', 'INTERVIEW_SCHEDULED', 'REJECTED'],
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
    const { nextStage, comment, interviewSchedule, interviewNotice, interviewScore } = req.body;
    const actor = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (actor.role === 'HR_DIRECTOR') {
      return res.status(403).json({
        error: 'Giám đốc Nhân sự chỉ giám sát tiến độ, không thực hiện thao tác chuyển bước hồ sơ!'
      });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true }
    });
    if (!application) return res.status(404).json({ error: 'Không tìm thấy hồ sơ ứng tuyển' });

    if (!isValidBpmnTransition(application.currentStage, nextStage)) {
      return res.status(400).json({
        error: `Sai luồng quy trình: Không thể chuyển từ "${STAGE_NAMES_VI[application.currentStage]}" sang "${STAGE_NAMES_VI[nextStage]}"`
      });
    }

    const updateData = { currentStage: nextStage };
    if (interviewSchedule) updateData.interviewSchedule = interviewSchedule;
    if (interviewNotice) updateData.interviewNotice = interviewNotice;
    if (interviewScore) updateData.interviewScore = interviewScore;

    // Gửi thông báo qua (Email & SĐT) nếu có Email, hoặc chỉ qua (SĐT) nếu không có Email
    let notifyInfo = null;
    if (nextStage === 'INTERVIEW_SCHEDULED') {
      notifyInfo = await sendCandidateNotification({
        toEmail: application.candidateEmail,
        toPhone: application.candidatePhone,
        candidateName: application.candidateName,
        jobTitle: application.job.title,
        type: 'INTERVIEW',
        customMessage: `${interviewSchedule} - ${interviewNotice}`
      });
      updateData.emailSentLog = notifyInfo.summary;
    } else if (['OFFER_SENT', 'HIRED'].includes(nextStage)) {
      notifyInfo = await sendCandidateNotification({
        toEmail: application.candidateEmail,
        toPhone: application.candidatePhone,
        candidateName: application.candidateName,
        jobTitle: application.job.title,
        type: 'PASSED',
        customMessage: comment
      });
      updateData.emailSentLog = notifyInfo.summary;
    } else if (nextStage === 'REJECTED') {
      notifyInfo = await sendCandidateNotification({
        toEmail: application.candidateEmail,
        toPhone: application.candidatePhone,
        candidateName: application.candidateName,
        jobTitle: application.job.title,
        type: 'REJECTED',
        customMessage: comment
      });
      updateData.emailSentLog = notifyInfo.summary;
    }

    const [updatedApp] = await prisma.$transaction([
      prisma.application.update({ where: { id: applicationId }, data: updateData }),
      prisma.auditLog.create({
        data: {
          applicationId,
          actorId: actor.id,
          actorName: actor.fullName,
          fromStage: application.currentStage,
          toStage: nextStage,
          comment: notifyInfo ? `${comment || STAGE_NAMES_VI[nextStage]} (${notifyInfo.summary})` : (comment || STAGE_NAMES_VI[nextStage])
        }
      })
    ]);

    res.json({
      message: notifyInfo
        ? `Cập nhật thành công! ${notifyInfo.summary}`
        : `Đã chuyển sang bước: ${STAGE_NAMES_VI[nextStage]}`,
      data: updatedApp
    });
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
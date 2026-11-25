import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const BPMN_APP_STAGES = [
  { key: 'APPLIED', label: '1. Nộp hồ sơ', lane: 'Ứng viên', color: 'border-slate-400' },
  { key: 'CV_SCREENING', label: '2. Sàng lọc CV', lane: 'Chuyên viên NS', color: 'border-blue-500' },
  { key: 'INTERVIEW_SCHEDULED', label: '3. Hẹn phỏng vấn', lane: 'Chuyên viên NS', color: 'border-indigo-500' },
  { key: 'INTERVIEWED', label: '4. Đã phỏng vấn & Đánh giá', lane: 'Phòng ban / QL', color: 'border-amber-500' },
  { key: 'OFFER_PENDING_APPROVAL', label: '5. Chờ duyệt Offer', lane: 'QL Tuyển dụng / GĐ', color: 'border-orange-500' },
  { key: 'OFFER_SENT', label: '6. Đã gửi Offer', lane: 'Chuyên viên NS', color: 'border-purple-500' },
  { key: 'ONBOARDING_DOCS', label: '7. Hoàn thiện giấy tờ', lane: 'Ứng viên / HR', color: 'border-cyan-500' },
  { key: 'HIRED', label: '8. Đã tuyển dụng (End)', lane: 'Lưu trữ hệ thống', color: 'border-emerald-600' },
  { key: 'REJECTED', label: 'Từ chối (End)', lane: 'Kết thúc', color: 'border-rose-500' },
];

const REQ_STATUS_LABELS = {
  HR_CHECKING: { text: 'HR đang kiểm tra', badge: 'bg-blue-100 text-blue-800' },
  NEED_INFO: { text: 'Cần Phòng ban bổ sung', badge: 'bg-amber-100 text-amber-800' },
  PENDING_APPROVAL: { text: 'Chờ phê duyệt JD/Req', badge: 'bg-purple-100 text-purple-800' },
  APPROVED: { text: 'Đã duyệt - Chờ đăng tin', badge: 'bg-indigo-100 text-indigo-800' },
  PUBLISHED: { text: 'Đang đăng tuyển', badge: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { text: 'Từ chối yêu cầu', badge: 'bg-rose-100 text-rose-800' },
};

export default function App() {
  const [viewMode, setViewMode] = useState('candidate'); // 'candidate' | 'login' | 'staff'
  const [candidateTab, setCandidateTab] = useState('jobs');
  const [staffTab, setStaffTab] = useState('requisitions'); // 'requisitions' | 'pipeline' | 'kpi'

  const [auth, setAuth] = useState(null);
  const [email, setEmail] = useState('hr@company.com');
  const [password, setPassword] = useState('123456');
  const [alert, setAlert] = useState(null);

  // Public Data
  const [publicJobs, setPublicJobs] = useState([]);
  const [applyingJob, setApplyingJob] = useState(null);
  const [cvForm, setCvForm] = useState({
    candidateName: '', candidateEmail: '', candidatePhone: '', experience: '', skills: '', cvUrl: ''
  });
  const [submittedCode, setSubmittedCode] = useState('');
  const [trackQuery, setTrackQuery] = useState('APP-100001');
  const [trackedApps, setTrackedApps] = useState([]);
  const [editingApp, setEditingApp] = useState(null);

  // Staff Data
  const [requisitions, setRequisitions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [newReq, setNewReq] = useState({
    title: '', department: 'Phòng Công nghệ Thông tin', headcount: 1, isCritical: false, requirements: '', salaryRange: ''
  });

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 6000);
  };

  const fetchPublicJobs = async () => {
    const res = await fetch(`${API_URL}/jobs`);
    if (res.ok) setPublicJobs(await res.json());
  };

  useEffect(() => {
    fetchPublicJobs();
  }, []);

  const fetchStaffData = async () => {
    if (!auth) return;
    const headers = { Authorization: `Bearer ${auth.token}` };
    const [reqRes, appRes, kpiRes] = await Promise.all([
      fetch(`${API_URL}/requisitions`, { headers }),
      fetch(`${API_URL}/applications`, { headers }),
      fetch(`${API_URL}/kpis`, { headers }),
    ]);
    if (reqRes.ok) setRequisitions(await reqRes.json());
    if (appRes.ok) {
      const apps = await appRes.json();
      setApplications(apps);
      if (selectedApp) {
        const refreshed = apps.find((a) => a.id === selectedApp.id);
        if (refreshed) setSelectedApp(refreshed);
      }
    }
    if (kpiRes.ok) setKpis(await kpiRes.json());
  };

  useEffect(() => {
    if (auth) fetchStaffData();
  }, [auth]);

  // Ứng viên nộp CV
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/public/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: applyingJob.id, ...cvForm }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);

    setSubmittedCode(data.trackingCode);
    setTrackQuery(data.trackingCode);
    setApplyingJob(null);
    setCvForm({ candidateName: '', candidateEmail: '', candidatePhone: '', experience: '', skills: '', cvUrl: '' });
    showAlert('success', `Nộp CV thành công! Mã tra cứu của bạn: ${data.trackingCode}`);
  };

  // Ứng viên tra cứu
  const handleTrackSearch = async (e) => {
    if (e) e.preventDefault();
    const res = await fetch(`${API_URL}/public/track?query=${encodeURIComponent(trackQuery)}`);
    const data = await res.json();
    if (!res.ok) {
      setTrackedApps([]);
      return showAlert('error', data.error);
    }
    setTrackedApps(data);
    setEditingApp(null);
  };

  // Ứng viên cập nhật hồ sơ
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/public/applications/${editingApp.trackingCode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingApp),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    showAlert('success', data.message);
    setEditingApp(null);
    handleTrackSearch();
  };

  // Đăng nhập nội bộ
  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    setAuth(data);
    setViewMode('staff');
    setStaffTab(data.user.role === 'HR_DIRECTOR' ? 'kpi' : 'requisitions');
  };

  // Pool 1: Tạo Requisition
  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/requisitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(newReq),
    });
    if (res.ok) {
      showAlert('success', 'Đã gửi đề xuất nhu cầu tuyển dụng (Requisition) tới phòng Nhân sự!');
      setNewReq({ title: '', department: auth.user.department || 'Phòng Công nghệ Thông tin', headcount: 1, isCritical: false, requirements: '', salaryRange: '' });
      fetchStaffData();
    }
  };

  // Pool 1: Xử lý bước duyệt Requisition / JD
  const handleReqAction = async (id, action) => {
    let payload = { action };
    if (action === 'REQUEST_MORE_INFO') {
      const feedbackNote = prompt('Nhập nội dung yêu cầu Phòng ban bổ sung:');
      if (!feedbackNote) return;
      payload.feedbackNote = feedbackNote;
    } else if (action === 'SUBMIT_MORE_INFO') {
      const requirements = prompt('Nhập lại yêu cầu công việc đã bổ sung:');
      if (!requirements) return;
      payload.requirements = requirements;
    } else if (action === 'SUBMIT_JD_FOR_APPROVAL') {
      const jdContent = prompt('Soạn nội dung Mô tả công việc (JD) chuẩn để trình duyệt:', 'Mô tả chi tiết trách nhiệm công việc, quyền lợi và yêu cầu kỹ năng...');
      if (!jdContent) return;
      payload.jdContent = jdContent;
    } else if (action === 'REJECT') {
      const feedbackNote = prompt('Nhập lý do từ chối:');
      if (!feedbackNote) return;
      payload.feedbackNote = feedbackNote;
    }

    const res = await fetch(`${API_URL}/requisitions/${id}/action`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    showAlert('success', data.message);
    fetchStaffData();
    fetchPublicJobs();
  };

  // Pool 2 & 3: Chuyển trạng thái ứng viên
  const handleAppTransition = async (applicationId, nextStage) => {
    let interviewSchedule = null;
    let interviewScore = null;

    if (nextStage === 'INTERVIEW_SCHEDULED') {
      interviewSchedule = prompt('Nhập thời gian & địa điểm phỏng vấn:', '14:00 Thứ 6 - Phòng họp Tầng 3');
      if (!interviewSchedule) return;
    }
    if (nextStage === 'INTERVIEWED') {
      interviewScore = prompt('Nhập kết quả đánh giá phỏng vấn từ Hội đồng/Phòng ban:', 'Đạt 8.5/10 - Đề xuất tuyển dụng');
      if (!interviewScore) return;
    }

    const comment = prompt(`Ghi chú chuyển bước sang [${nextStage}]:`, interviewScore || interviewSchedule || `Chuyển sang ${nextStage}`);
    if (comment === null) return;

    const res = await fetch(`${API_URL}/applications/${applicationId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ nextStage, comment, interviewSchedule, interviewScore }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    showAlert('success', data.message);
    fetchStaffData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap justify-between items-center shadow">
        <div className="flex items-center space-x-6">
          <button onClick={() => setViewMode('candidate')} className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            <span className="font-bold text-lg">BPMN-RMS Enterprise</span>
          </button>

          {viewMode === 'candidate' && (
            <nav className="flex space-x-2">
              <button
                onClick={() => setCandidateTab('jobs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${candidateTab === 'jobs' ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Tin tuyển dụng ({publicJobs.length})
              </button>
              <button
                onClick={() => { setCandidateTab('track'); if (trackQuery) handleTrackSearch(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${candidateTab === 'track' ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Tra cứu & Cập nhật CV
              </button>
            </nav>
          )}

          {viewMode === 'staff' && auth && (
            <nav className="flex space-x-2">
              <button
                onClick={() => setStaffTab('requisitions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${staffTab === 'requisitions' ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Pool 1: Yêu cầu & JD ({requisitions.length})
              </button>
              <button
                onClick={() => setStaffTab('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${staffTab === 'pipeline' ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Pool 2 & 3: Hồ sơ & Phỏng vấn ({applications.length})
              </button>
              <button
                onClick={() => setStaffTab('kpi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${staffTab === 'kpi' ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Giám sát & Báo cáo KPI
              </button>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {viewMode === 'staff' && auth ? (
            <>
              <div className="text-right">
                <p className="font-semibold">{auth.user.fullName}</p>
                <p className="text-emerald-400 text-[11px]">{auth.user.role}</p>
              </div>
              <button onClick={() => { setAuth(null); setViewMode('candidate'); }} className="bg-rose-600 px-3 py-1.5 rounded-lg">
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              onClick={() => setViewMode(viewMode === 'login' ? 'candidate' : 'login')}
              className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-700"
            >
              {viewMode === 'login' ? '← Về trang Ứng viên' : 'Đăng nhập Nội bộ (4 Vai trò)'}
            </button>
          )}
        </div>
      </header>

      {alert && (
        <div className={`mx-6 mt-4 p-3 rounded-lg border text-sm font-medium ${alert.type === 'error' ? 'bg-rose-50 border-rose-400 text-rose-800' : 'bg-emerald-50 border-emerald-400 text-emerald-800'}`}>
          {alert.type === 'error' ? '⚠️ ' : '✅ '} {alert.message}
        </div>
      )}

      {/* ==================== 1. CỔNG ỨNG VIÊN (KHÔNG CẦN ĐĂNG NHẬP) ==================== */}
      {viewMode === 'candidate' && (
        <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
          {submittedCode && (
            <div className="bg-blue-50 border border-blue-300 p-4 rounded-xl flex justify-between items-center">
              <p className="text-xs text-blue-900">
                Mã tra cứu hồ sơ của bạn là: <b className="font-mono bg-white px-2 py-0.5 rounded border">{submittedCode}</b>
              </p>
              <button onClick={() => { setCandidateTab('track'); handleTrackSearch(); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                Theo dõi ngay →
              </button>
            </div>
          )}

          {candidateTab === 'jobs' && (
            <div className="grid md:grid-cols-2 gap-4">
              {publicJobs.map((job) => (
                <div key={job.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h2 className="font-bold text-base text-blue-700">{job.title}</h2>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">{job.salaryRange}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{job.department} • Số lượng: {job.headcount}</p>
                    <p className="text-xs text-slate-700 mt-3"><b>Mô tả:</b> {job.jdContent || job.requirements}</p>
                    <p className="text-xs text-slate-600 mt-1"><b>Yêu cầu:</b> {job.requirements}</p>
                  </div>
                  <div className="mt-5 pt-3 border-t flex justify-end">
                    <button onClick={() => setApplyingJob(job)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold">
                      Nộp CV ứng tuyển
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {candidateTab === 'track' && (
            <div className="space-y-5">
              <form onSubmit={handleTrackSearch} className="bg-white p-5 rounded-xl shadow-sm border flex gap-2">
                <input
                  type="text"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  placeholder="Nhập Mã hồ sơ (VD: APP-100001) hoặc Email..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  required
                />
                <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-semibold">Tra cứu</button>
              </form>

              {trackedApps.map((app) => (
                <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded border font-bold">{app.trackingCode}</span>
                      <h3 className="text-lg font-bold mt-1">{app.job?.title}</h3>
                      {app.interviewSchedule && (
                        <p className="text-xs text-indigo-700 font-semibold mt-1">📅 Lịch phỏng vấn: {app.interviewSchedule}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">{app.currentStage}</span>
                      {!['HIRED', 'REJECTED'].includes(app.currentStage) && (
                        <button onClick={() => setEditingApp({ ...app })} className="bg-amber-500 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                          ✏️ Cập nhật CV
                        </button>
                      )}
                    </div>
                  </div>

                  {editingApp?.id === app.id ? (
                    <form onSubmit={handleUpdateProfile} className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <input value={editingApp.candidateName} onChange={(e) => setEditingApp({ ...editingApp, candidateName: e.target.value })} className="border rounded p-2 bg-white" placeholder="Họ tên" required />
                        <input value={editingApp.candidatePhone} onChange={(e) => setEditingApp({ ...editingApp, candidatePhone: e.target.value })} className="border rounded p-2 bg-white" placeholder="SĐT" required />
                      </div>
                      <input value={editingApp.experience} onChange={(e) => setEditingApp({ ...editingApp, experience: e.target.value })} className="w-full border rounded p-2 bg-white" placeholder="Kinh nghiệm" />
                      <input value={editingApp.skills} onChange={(e) => setEditingApp({ ...editingApp, skills: e.target.value })} className="w-full border rounded p-2 bg-white" placeholder="Kỹ năng" />
                      <input value={editingApp.cvUrl} onChange={(e) => setEditingApp({ ...editingApp, cvUrl: e.target.value })} className="w-full border rounded p-2 bg-white" placeholder="Link CV" required />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingApp(null)} className="px-3 py-1.5 border rounded bg-white">Hủy</button>
                        <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded font-semibold">Lưu cập nhật</button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg text-xs">
                      <p><b>Ứng viên:</b> {app.candidateName} ({app.candidatePhone})</p>
                      <p><b>Link CV:</b> <a href={app.cvUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">{app.cvUrl}</a></p>
                      <p><b>Kinh nghiệm:</b> {app.experience}</p>
                      <p><b>Kỹ năng:</b> {app.skills}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs font-bold">Lịch sử xử lý BPMN:</p>
                    {app.logs?.map((log) => (
                      <div key={log.id} className="text-xs p-2 bg-slate-50 rounded flex justify-between">
                        <span><b>[{log.toStage}]</b> {log.comment}</span>
                        <span className="text-slate-400">{log.actorName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MODAL ĐIỀN THÔNG TIN NỘP CV */}
          {applyingJob && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <form onSubmit={handleApplySubmit} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-3 text-xs">
                <h3 className="font-bold text-base border-b pb-2">Nộp CV: {applyingJob.title}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Họ và tên *" value={cvForm.candidateName} onChange={(e) => setCvForm({ ...cvForm, candidateName: e.target.value })} className="border rounded-lg p-2" required />
                  <input placeholder="Số điện thoại *" value={cvForm.candidatePhone} onChange={(e) => setCvForm({ ...cvForm, candidatePhone: e.target.value })} className="border rounded-lg p-2" required />
                </div>
                <input type="email" placeholder="Email *" value={cvForm.candidateEmail} onChange={(e) => setCvForm({ ...cvForm, candidateEmail: e.target.value })} className="w-full border rounded-lg p-2" required />
                <textarea placeholder="Kinh nghiệm làm việc *" value={cvForm.experience} onChange={(e) => setCvForm({ ...cvForm, experience: e.target.value })} className="w-full border rounded-lg p-2 h-16" required />
                <input placeholder="Kỹ năng chuyên môn *" value={cvForm.skills} onChange={(e) => setCvForm({ ...cvForm, skills: e.target.value })} className="w-full border rounded-lg p-2" required />
                <input type="url" placeholder="Link tệp CV (Google Drive / PDF) *" value={cvForm.cvUrl} onChange={(e) => setCvForm({ ...cvForm, cvUrl: e.target.value })} className="w-full border rounded-lg p-2" required />
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button type="button" onClick={() => setApplyingJob(null)} className="px-4 py-2 border rounded-lg">Hủy</button>
                  <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold">Gửi hồ sơ</button>
                </div>
              </form>
            </div>
          )}
        </main>
      )}

      {/* ==================== 2. ĐĂNG NHẬP 4 VAI TRÒ NỘI BỘ ==================== */}
      {viewMode === 'login' && (
        <main className="flex-1 flex items-center justify-center p-4">
          <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-4 border">
            <h2 className="text-xl font-bold text-center">Đăng nhập Hệ thống Nội bộ</h2>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm" required />
            <button type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-semibold">Đăng nhập</button>

            <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1.5">
              <p className="font-bold">Chọn nhanh 4 Vai trò Demo (Mật khẩu: 123456):</p>
              <p>• <b>Phòng ban:</b> <button type="button" onClick={() => setEmail('phongban@company.com')} className="text-blue-600 underline">phongban@company.com</button></p>
              <p>• <b>Chuyên viên Nhân sự:</b> <button type="button" onClick={() => setEmail('hr@company.com')} className="text-blue-600 underline">hr@company.com</button></p>
              <p>• <b>Quản lý Tuyển dụng:</b> <button type="button" onClick={() => setEmail('manager@company.com')} className="text-blue-600 underline">manager@company.com</button></p>
              <p>• <b>Giám đốc Nhân sự:</b> <button type="button" onClick={() => setEmail('director@company.com')} className="text-blue-600 underline">director@company.com</button></p>
            </div>
          </form>
        </main>
      )}

      {/* ==================== 3. KHÔNG GIAN LÀM VIỆC NỘI BỘ ==================== */}
      {viewMode === 'staff' && auth && (
        <main className="flex-1 p-6">
          {/* POOL 1: QUẢN LÝ & PHÊ DUYỆT REQUISITION + JD */}
          {staffTab === 'requisitions' && (
            <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
              {/* Form tạo đề xuất (Dành cho Phòng ban & Chuyên viên NS) */}
              {['DEPARTMENT', 'HR_SPECIALIST'].includes(auth.user.role) && (
                <form onSubmit={handleCreateRequisition} className="bg-white p-5 rounded-xl shadow-sm border space-y-3 text-xs h-fit">
                  <h3 className="font-bold text-sm text-blue-700">Đề xuất Nhu cầu Tuyển dụng (Requisition)</h3>
                  <input placeholder="Vị trí cần tuyển *" value={newReq.title} onChange={(e) => setNewReq({ ...newReq, title: e.target.value })} className="w-full border rounded p-2" required />
                  <input placeholder="Phòng ban *" value={newReq.department} onChange={(e) => setNewReq({ ...newReq, department: e.target.value })} className="w-full border rounded p-2" required />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min="1" placeholder="Số lượng" value={newReq.headcount} onChange={(e) => setNewReq({ ...newReq, headcount: e.target.value })} className="border rounded p-2" />
                    <input placeholder="Mức lương dự kiến" value={newReq.salaryRange} onChange={(e) => setNewReq({ ...newReq, salaryRange: e.target.value })} className="border rounded p-2" />
                  </div>
                  <label className="flex items-center gap-2 font-semibold text-rose-700">
                    <input type="checkbox" checked={newReq.isCritical} onChange={(e) => setNewReq({ ...newReq, isCritical: e.target.checked })} />
                    Vị trí trọng yếu (Cần Giám đốc NS duyệt)
                  </label>
                  <textarea placeholder="Cung cấp yêu cầu công việc chi tiết *" value={newReq.requirements} onChange={(e) => setNewReq({ ...newReq, requirements: e.target.value })} className="w-full border rounded p-2 h-20" required />
                  <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold">Gửi yêu cầu tuyển dụng</button>
                </form>
              )}

              {/* Danh sách Requisition theo luồng Pool 1 */}
              <div className={['DEPARTMENT', 'HR_SPECIALIST'].includes(auth.user.role) ? 'md:col-span-2 space-y-3' : 'md:col-span-3 space-y-3'}>
                <h3 className="font-bold text-base">Luồng Phê duyệt Yêu cầu Tuyển dụng & JD (Pool 1 BPMN)</h3>
                {requisitions.map((req) => {
                  const st = REQ_STATUS_LABELS[req.status] || { text: req.status, badge: 'bg-slate-100' };
                  return (
                    <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded mr-2">{req.code}</span>
                          {req.isCritical && <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold mr-2">Trọng yếu (GĐ duyệt)</span>}
                          <span className={`px-2.5 py-0.5 rounded-full font-bold ${st.badge}`}>{st.text}</span>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">{req.title} ({req.headcount} nhân sự)</h4>
                          <p className="text-slate-500">{req.department} • Đề xuất bởi: {req.createdBy}</p>
                        </div>
                      </div>

                      <p className="text-slate-700"><b>Yêu cầu chuyên môn:</b> {req.requirements}</p>
                      {req.jdContent && <p className="text-indigo-800 bg-indigo-50 p-2 rounded"><b>JD đã soạn:</b> {req.jdContent}</p>}
                      {req.feedbackNote && <p className="text-amber-800 bg-amber-50 p-2 rounded"><b>Phản hồi:</b> {req.feedbackNote}</p>}

                      {/* Nút thao tác đúng theo vai trò trong Pool 1 */}
                      <div className="pt-2 border-t flex flex-wrap gap-2">
                        {auth.user.role === 'HR_SPECIALIST' && req.status === 'HR_CHECKING' && (
                          <>
                            <button onClick={() => handleReqAction(req.id, 'SUBMIT_JD_FOR_APPROVAL')} className="bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">
                              Soạn JD & Trình duyệt
                            </button>
                            <button onClick={() => handleReqAction(req.id, 'REQUEST_MORE_INFO')} className="bg-amber-500 text-white px-3 py-1.5 rounded font-semibold">
                              Yêu cầu Phòng ban bổ sung
                            </button>
                          </>
                        )}

                        {auth.user.role === 'DEPARTMENT' && req.status === 'NEED_INFO' && (
                          <button onClick={() => handleReqAction(req.id, 'SUBMIT_MORE_INFO')} className="bg-amber-600 text-white px-3 py-1.5 rounded font-semibold">
                            Bổ sung thông tin yêu cầu
                          </button>
                        )}

                        {['HIRING_MANAGER', 'HR_DIRECTOR'].includes(auth.user.role) && req.status === 'PENDING_APPROVAL' && (
                          <>
                            <button onClick={() => handleReqAction(req.id, 'APPROVE')} className="bg-emerald-600 text-white px-3 py-1.5 rounded font-semibold">
                              Phê duyệt Requisition & JD
                            </button>
                            <button onClick={() => handleReqAction(req.id, 'REJECT')} className="bg-rose-600 text-white px-3 py-1.5 rounded font-semibold">
                              Từ chối
                            </button>
                          </>
                        )}

                        {auth.user.role === 'HR_SPECIALIST' && req.status === 'APPROVED' && (
                          <button onClick={() => handleReqAction(req.id, 'PUBLISH')} className="bg-emerald-600 text-white px-3 py-1.5 rounded font-semibold">
                            Đăng tin tuyển dụng công khai
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* POOL 2 & 3: KANBAN HỒ SƠ & PHỎNG VẤN */}
          {staffTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-9 gap-2">
                {BPMN_APP_STAGES.map((stage) => (
                  <div key={stage.key} className={`rounded-xl border-t-4 p-2.5 shadow-sm bg-white ${stage.color}`}>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">{stage.lane}</span>
                    <h3 className="font-bold text-[11px] text-slate-800 mb-2">{stage.label}</h3>

                    <div className="space-y-2">
                      {applications.filter((a) => a.currentStage === stage.key).map((app) => (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          className={`p-2.5 rounded-lg border text-[11px] cursor-pointer bg-white hover:shadow ${selectedApp?.id === app.id ? 'ring-2 ring-blue-500' : 'border-slate-200'}`}
                        >
                          <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">{app.trackingCode}</span>
                          <p className="font-bold mt-1">{app.candidateName}</p>
                          <p className="text-slate-500 text-[10px] line-clamp-1">{app.job?.title}</p>

                          {!['HIRED', 'REJECTED'].includes(stage.key) && (
                            <select
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => { if (e.target.value) handleAppTransition(app.id, e.target.value); e.target.value = ''; }}
                              defaultValue=""
                              className="mt-2 w-full border rounded p-1 text-[10px] bg-slate-50"
                            >
                              <option value="" disabled>Chuyển bước...</option>
                              {BPMN_APP_STAGES.filter((s) => s.key !== stage.key).map((s) => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedApp && (
                <div className="bg-white p-5 rounded-xl shadow-sm border space-y-3 text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <div>
                      <h4 className="font-bold text-sm">{selectedApp.candidateName} ({selectedApp.trackingCode})</h4>
                      <p className="text-slate-500">Email: {selectedApp.candidateEmail} • SĐT: {selectedApp.candidatePhone} • <a href={selectedApp.cvUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Mở CV</a></p>
                      {selectedApp.interviewSchedule && <p className="text-indigo-700 font-semibold mt-1">📅 Lịch phỏng vấn: {selectedApp.interviewSchedule}</p>}
                      {selectedApp.interviewScore && <p className="text-emerald-700 font-semibold">⭐ Đánh giá phỏng vấn: {selectedApp.interviewScore}</p>}
                    </div>
                    <button onClick={() => setSelectedApp(null)} className="text-slate-400">Đóng</button>
                  </div>
                  <div className="space-y-1">
                    {selectedApp.logs?.map((log) => (
                      <div key={log.id} className="p-2 bg-slate-50 rounded flex justify-between">
                        <span><b>{log.fromStage} → {log.toStage}</b>: {log.comment}</span>
                        <span className="text-slate-400">{log.actorName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BÁO CÁO KPI (GIÁM ĐỐC NHÂN SỰ & QUẢN LÝ) */}
          {staffTab === 'kpi' && kpis && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border">
                  <p className="text-xs text-slate-500">Tổng Yêu cầu Tuyển dụng (Requisitions)</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-1">{kpis.totalRequisitions}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border">
                  <p className="text-xs text-slate-500">Tổng Hồ sơ Ứng viên</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{kpis.totalApplications}</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <h3 className="font-bold text-sm mb-3">Thống kê Tiến độ Hồ sơ (Pool 2 & Pool 3)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {kpis.stageCounts?.map((s) => (
                    <div key={s.currentStage} className="p-3 bg-slate-50 rounded-lg border">
                      <p className="text-xs font-bold text-slate-600">{s.currentStage}</p>
                      <p className="text-2xl font-bold mt-1">{s._count.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const STAGE_CONFIG = {
  APPLIED: { label: '1. Mới nộp hồ sơ', owner: 'Ứng viên', color: 'border-slate-400', badge: 'bg-slate-100 text-slate-800' },
  CV_SCREENING: { label: '2. Đã xếp hạng vòng đầu', owner: 'Chuyên viên Nhân sự', color: 'border-blue-500', badge: 'bg-blue-100 text-blue-800' },
  INTERVIEW_SCHEDULED: { label: '3. Đã hẹn phỏng vấn', owner: 'Chuyên viên Nhân sự', color: 'border-indigo-500', badge: 'bg-indigo-100 text-indigo-800' },
  INTERVIEWED: { label: '4. Đã phỏng vấn & Đánh giá', owner: 'Phòng ban / QL Tuyển dụng', color: 'border-amber-500', badge: 'bg-amber-100 text-amber-800' },
  OFFER_PENDING_APPROVAL: { label: '5. Chờ duyệt thư mời nhận việc', owner: 'Quản lý Tuyển dụng', color: 'border-orange-500', badge: 'bg-orange-100 text-orange-800' },
  OFFER_SENT: { label: '6. Đã gửi thư mời (Đỗ)', owner: 'Chuyên viên Nhân sự', color: 'border-purple-500', badge: 'bg-purple-100 text-purple-800' },
  ONBOARDING_DOCS: { label: '7. Hoàn thiện hồ sơ nhận việc', owner: 'Ứng viên / Nhân sự', color: 'border-cyan-500', badge: 'bg-cyan-100 text-cyan-800' },
  HIRED: { label: '8. Trúng tuyển chính thức (Đỗ)', owner: 'Hoàn tất', color: 'border-emerald-600', badge: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Không đạt / Từ chối (Trượt)', owner: 'Đã gửi thông báo trượt', color: 'border-rose-500', badge: 'bg-rose-100 text-rose-800' },
};

const REQ_STATUS_VI = {
  HR_CHECKING: { text: 'Nhân sự đang kiểm tra', badge: 'bg-blue-100 text-blue-800' },
  NEED_INFO: { text: 'Chờ Phòng ban bổ sung', badge: 'bg-amber-100 text-amber-800' },
  PENDING_APPROVAL: { text: 'Chờ phê duyệt', badge: 'bg-purple-100 text-purple-800' },
  APPROVED: { text: 'Đã phê duyệt - Chờ đăng tin', badge: 'bg-indigo-100 text-indigo-800' },
  PUBLISHED: { text: 'Đang mở nhận hồ sơ', badge: 'bg-emerald-100 text-emerald-800' },
  CLOSED: { text: 'Đã hết thời gian đăng ký', badge: 'bg-slate-200 text-slate-800' },
  REJECTED: { text: 'Đã từ chối', badge: 'bg-rose-100 text-rose-800' },
};

const ROLE_INFO = {
  DEPARTMENT: {
    name: 'Quản lý Phòng ban',
    desc: 'Đề xuất nhu cầu tuyển dụng (kèm Mã nghề), cung cấp yêu cầu công việc & tham gia đánh giá phỏng vấn',
    accent: 'bg-teal-800',
    email: 'phongban@company.com',
  },
  HR_SPECIALIST: {
    name: 'Chuyên viên Nhân sự',
    desc: 'Kiểm tra yêu cầu, soạn JD, đăng tin, nhận CV, chạy API sàng lọc xếp hạng, đánh giá thủ công & gửi thông báo Đỗ/Trượt',
    accent: 'bg-blue-800',
    email: 'hr@company.com',
  },
  HIRING_MANAGER: {
    name: 'Quản lý Tuyển dụng',
    desc: 'Phê duyệt mô tả công việc (JD), tham gia đánh giá ứng viên & phê duyệt thư mời nhận việc',
    accent: 'bg-indigo-800',
    email: 'manager@company.com',
  },
  HR_DIRECTOR: {
    name: 'Giám đốc Nhân sự',
    desc: 'Phê duyệt yêu cầu tuyển dụng trọng yếu, giám sát tiến độ & xem báo cáo thống kê',
    accent: 'bg-slate-900',
    email: 'director@company.com',
  },
};

// Hàm tạo và tải xuống file Mẫu CV chuẩn (.doc) trực tiếp cho ứng viên
const downloadStandardCvTemplate = () => {
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Mẫu CV Ứng Tuyển Chuẩn</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h1 style="text-align:center; color:#1e3a8a;">MẪU HỒ SƠ ỨNG VIÊN (CV CHUẨN DOANH NGHIỆP)</h1>
      <p style="text-align:center; font-style:italic;">(Ứng viên vui lòng điền đầy đủ thông tin theo đúng các mục bên dưới trước khi tải lên hệ thống)</p>
      <hr/>
      <h3>1. THÔNG TIN VỊ TRÍ ỨNG TUYỂN</h3>
      <p><b>Mã nghề ứng tuyển:</b> [Nhập Mã nghề, ví dụ: MN-IT-01]</p>
      <p><b>Tên vị trí ứng tuyển:</b> [Nhập tên vị trí]</p>
      <h3>2. THÔNG TIN CÁ NHÂN</h3>
      <p><b>Họ và tên:</b> .....................................................</p>
      <p><b>Số điện thoại (Bắt buộc):</b> ........................................</p>
      <p><b>Email liên hệ (Không bắt buộc):</b> .................................</p>
      <h3>3. TRÌNH ĐỘ HỌC VẤN</h3>
      <p>- Trường Đại học / Cao đẳng: .......................................</p>
      <p>- Chuyên ngành: ...................................................</p>
      <h3>4. KINH NGHIỆM LÀM VIỆC (Ghi rõ số năm kinh nghiệm)</h3>
      <p>- Số năm kinh nghiệm thực tế: [Ví dụ: 3 năm]</p>
      <p>- Chi tiết các dự án / công việc đã thực hiện: ....................</p>
      <h3>5. KỸ NĂNG CHUYÊN MÔN (Liệt kê các công nghệ / nghiệp vụ chính)</h3>
      <p>- Kỹ năng chính: [Ví dụ: Node.js, React, SQL, Docker, BPMN 2.0...]</p>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Mau_CV_Ung_Tuyen_Chuan.doc';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function App() {
  const [route, setRoute] = useState(window.location.pathname || '/');
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 6000);
  };

  if (route.startsWith('/admin')) {
    return <AdminWorkspace alert={alert} showAlert={showAlert} />;
  }

  return <CandidatePortal alert={alert} showAlert={showAlert} />;
}

/* ============================================================================
   1. TRANG ỨNG VIÊN ĐỘC LẬP (http://localhost:3000/)
============================================================================ */
function CandidatePortal({ alert, showAlert }) {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [cvForm, setCvForm] = useState({
    jobId: '',
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    experience: '',
    skills: '',
    cvUrl: ''
  });

  const getSavedAppIds = () => {
    try {
      return JSON.parse(localStorage.getItem('my_submitted_app_ids') || '[]');
    } catch {
      return [];
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/jobs`);
      if (res.ok) {
        const list = await res.json();
        setJobs(list);
        if (list.length > 0 && !cvForm.jobId) {
          setCvForm((prev) => ({ ...prev, jobId: list[0].id }));
        }
      }
    } catch {
      showAlert('error', 'Không kết nối được tới máy chủ tuyển dụng.');
    }
  };

  const fetchMyApplications = async () => {
    const ids = getSavedAppIds();
    if (ids.length === 0) {
      setMyApps([]);
      return;
    }
    const res = await fetch(`${API_URL}/public/my-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) setMyApps(await res.json());
  };

  useEffect(() => {
    fetchJobs();
    fetchMyApplications();
  }, []);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!cvForm.jobId) return showAlert('error', 'Vui lòng chọn vị trí muốn ứng tuyển!');

    const res = await fetch(`${API_URL}/public/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cvForm),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);

    const updatedIds = Array.from(new Set([data.application.id, ...getSavedAppIds()]));
    localStorage.setItem('my_submitted_app_ids', JSON.stringify(updatedIds));

    const hasEmail = Boolean(cvForm.candidateEmail && cvForm.candidateEmail.trim());
    setShowApplyModal(false);
    setCvForm({
      jobId: jobs[0]?.id || '',
      candidateName: '',
      candidateEmail: '',
      candidatePhone: '',
      experience: '',
      skills: '',
      cvUrl: ''
    });
    await fetchMyApplications();
    setTab('my-cv');
    showAlert(
      'success',
      hasEmail
        ? 'Nộp hồ sơ thành công! Kết quả Đỗ / Trượt sẽ được gửi qua cả Email và tin nhắn SMS tới SĐT của bạn.'
        : 'Nộp hồ sơ thành công! Kết quả Đỗ / Trượt sẽ được gửi qua tin nhắn SMS tới SĐT của bạn.'
    );
  };

  const handleUpdateMyCv = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/public/applications/${editingApp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingApp),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);

    setEditingApp(null);
    fetchMyApplications();
    showAlert('success', 'Cập nhật hồ sơ thành công!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative pb-24">
      <header className="bg-blue-900 text-white px-6 py-4 flex flex-wrap justify-between items-center shadow">
        <div className="flex items-center space-x-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
          <span className="font-bold text-lg tracking-tight">Cổng Tuyển Dụng Việc Làm Trực Tuyến</span>
        </div>

        <nav className="flex space-x-2">
          <button
            onClick={() => setTab('jobs')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${tab === 'jobs' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-100 hover:bg-blue-800'}`}
          >
            Vị trí đang tuyển ({jobs.length})
          </button>
          <button
            onClick={() => { setTab('my-cv'); fetchMyApplications(); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${tab === 'my-cv' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-100 hover:bg-blue-800'}`}
          >
            Hồ sơ của tôi ({myApps.length})
          </button>
        </nav>
      </header>

      {alert && (
        <div className="max-w-5xl w-full mx-auto mt-4 px-6">
          <div className={`p-3 rounded-lg border text-sm font-medium ${alert.type === 'error' ? 'bg-rose-50 border-rose-400 text-rose-800' : 'bg-emerald-50 border-emerald-400 text-emerald-800'}`}>
            {alert.message}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {tab === 'jobs' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-bold text-sm text-amber-900">Yêu cầu chuẩn bị hồ sơ theo mẫu doanh nghiệp</h2>
                <p className="text-xs text-amber-800">Ứng viên vui lòng tải Mẫu CV chuẩn dưới đây, điền đầy đủ thông tin và bấm nút <b>"Nộp hồ sơ ứng tuyển"</b> ở góc dưới bên phải màn hình.</p>
              </div>
              <button
                type="button"
                onClick={downloadStandardCvTemplate}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm"
              >
                Tải về Mẫu CV chuẩn (.doc)
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="inline-block font-mono text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded mb-1">
                        Mã nghề: {job.code}
                      </span>
                      <h3 className="font-bold text-base text-slate-900">{job.title}</h3>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                      {job.salaryRange}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{job.department} • Số lượng cần tuyển: {job.headcount}</p>
                  <p className="text-xs text-slate-700 pt-2 border-t"><b>Mô tả công việc:</b> {job.jdContent || job.requirements}</p>
                  <p className="text-xs text-slate-600"><b>Tiêu chí tuyển dụng:</b> {job.requirements}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'my-cv' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Hồ sơ ứng tuyển của tôi</h1>
              <p className="text-xs text-slate-500">Chỉ hiển thị hồ sơ do chính bạn đã nộp. Hệ thống sẽ gửi thông báo kết quả Đỗ / Trượt qua Email & SĐT (nếu có Email) hoặc qua tin nhắn SĐT.</p>
            </div>

            {myApps.length === 0 ? (
              <div className="bg-white p-10 rounded-xl border text-center space-y-3">
                <p className="text-sm text-slate-600">Bạn chưa nộp hồ sơ ứng tuyển nào.</p>
                <button onClick={() => setShowApplyModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold">
                  Nộp hồ sơ ngay
                </button>
              </div>
            ) : (
              myApps.map((app) => {
                const st = STAGE_CONFIG[app.currentStage] || { label: app.currentStage, badge: 'bg-slate-100' };
                return (
                  <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                    <div className="flex flex-wrap justify-between items-start gap-3 border-b pb-3">
                      <div>
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded mr-2">Mã nghề: {app.job?.code}</span>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">{app.job?.title}</h3>
                        <p className="text-xs text-slate-500">
                          {app.job?.department} • Kênh nhận thông báo kết quả:{' '}
                          <b>
                            {app.candidateEmail
                              ? `Email (${app.candidateEmail}) & SĐT (${app.candidatePhone})`
                              : `Tin nhắn SMS tới SĐT (${app.candidatePhone})`}
                          </b>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.badge}`}>
                          Trạng thái: {st.label}
                        </span>
                        {!['HIRED', 'REJECTED'].includes(app.currentStage) && (
                          <button onClick={() => setEditingApp({ ...app })} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                            Cập nhật hồ sơ
                          </button>
                        )}
                      </div>
                    </div>

                    {app.emailSentLog && (
                      <div className={`p-3.5 rounded-xl border text-xs font-semibold ${app.currentStage === 'REJECTED' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                        Thông báo kết quả tự động: {app.emailSentLog}
                      </div>
                    )}

                    {app.interviewSchedule && (
                      <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-indigo-900">Thông báo lịch phỏng vấn từ Phòng Nhân sự:</p>
                        <p className="text-indigo-800"><b>Thời gian & Địa điểm:</b> {app.interviewSchedule}</p>
                        {app.interviewNotice && <p className="text-indigo-700"><b>Lời nhắn:</b> {app.interviewNotice}</p>}
                      </div>
                    )}

                    {editingApp?.id === app.id ? (
                      <form onSubmit={handleUpdateMyCv} className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3 text-xs">
                        <p className="font-bold text-amber-900">Cập nhật thông tin hồ sơ của bạn</p>
                        <div className="grid grid-cols-2 gap-3">
                          <input value={editingApp.candidateName} onChange={(e) => setEditingApp({ ...editingApp, candidateName: e.target.value })} className="border rounded p-2 bg-white" placeholder="Họ và tên" required />
                          <input value={editingApp.candidatePhone} onChange={(e) => setEditingApp({ ...editingApp, candidatePhone: e.target.value })} className="border rounded p-2 bg-white" placeholder="Số điện thoại" required />
                        </div>
                        <input value={editingApp.experience} onChange={(e) => setEditingApp({ ...editingApp, experience: e.target.value })} className="w-full border rounded p-2 bg-white" placeholder="Kinh nghiệm làm việc" />
                        <input value={editingApp.skills} onChange={(e) => setEditingApp({ ...editingApp, skills: e.target.value })} className="w-full border rounded p-2 bg-white" placeholder="Kỹ năng chuyên môn" />
                        <input value={editingApp.cvUrl} onChange={(e) => setEditingApp({ ...editingApp, cvUrl: e.target.value })} className="w-full border rounded p-2 bg-white" placeholder="Đường dẫn tệp CV" required />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingApp(null)} className="px-3 py-1.5 border rounded bg-white">Hủy bỏ</button>
                          <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded font-semibold">Lưu thay đổi</button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-lg text-xs">
                        <p><b>Họ và tên:</b> {app.candidateName}</p>
                        <p><b>Số điện thoại:</b> {app.candidatePhone}</p>
                        <p><b>Email:</b> {app.candidateEmail || <span className="text-slate-400 italic">Không cung cấp</span>}</p>
                        <p><b>Tệp CV theo mẫu:</b> <a href={app.cvUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">{app.cvUrl}</a></p>
                        <p className="md:col-span-2"><b>Kinh nghiệm:</b> {app.experience}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* CHỈ CÓ 1 BUTTON NỘP HỒ SƠ DUY NHẤT Ở GÓC DƯỚI BÊN PHẢI */}
      <button
        type="button"
        onClick={() => setShowApplyModal(true)}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3.5 rounded-full shadow-xl flex items-center gap-2 transition transform hover:scale-105"
      >
        <span>+ Nộp hồ sơ ứng tuyển</span>
      </button>

      {/* FORM ĐIỀN THÔNG TIN NỘP HỒ SƠ */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleApplySubmit} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-base text-slate-900">Biểu mẫu Nộp hồ sơ Ứng tuyển</h3>
              <button
                type="button"
                onClick={downloadStandardCvTemplate}
                className="text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded font-semibold hover:bg-amber-100"
              >
                Tải CV mẫu (.doc)
              </button>
            </div>

            {/* Ô chọn vị trí muốn ứng tuyển (Dropdown mũi tên trỏ xuống) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Chọn vị trí muốn ứng tuyển *</label>
              <select
                value={cvForm.jobId}
                onChange={(e) => setCvForm({ ...cvForm, jobId: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-white font-semibold text-slate-800"
                required
              >
                <option value="" disabled>-- Bấm mũi tên để chọn vị trí đang tuyển dụng --</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    [{job.code}] {job.title} ({job.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Họ và tên *</label>
                <input placeholder="Nhập họ và tên" value={cvForm.candidateName} onChange={(e) => setCvForm({ ...cvForm, candidateName: e.target.value })} className="w-full border rounded-lg p-2.5" required />
              </div>
              <div>
                <label className="block font-semibold mb-1">Số điện thoại (Nhận SMS) *</label>
                <input placeholder="Nhập số điện thoại" value={cvForm.candidatePhone} onChange={(e) => setCvForm({ ...cvForm, candidatePhone: e.target.value })} className="w-full border rounded-lg p-2.5" required />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Email <span className="text-slate-400 font-normal">(Không bắt buộc — Có Email sẽ gửi kết quả cả Email & SĐT, bỏ trống sẽ gửi qua SĐT)</span>
              </label>
              <input
                type="email"
                placeholder="example@gmail.com (Có thể bỏ trống)"
                value={cvForm.candidateEmail}
                onChange={(e) => setCvForm({ ...cvForm, candidateEmail: e.target.value })}
                className="w-full border rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Kinh nghiệm làm việc *</label>
              <textarea placeholder="Ví dụ: 3 năm kinh nghiệm lập trình Node.js, React..." value={cvForm.experience} onChange={(e) => setCvForm({ ...cvForm, experience: e.target.value })} className="w-full border rounded-lg p-2.5 h-16" required />
            </div>

            <div>
              <label className="block font-semibold mb-1">Kỹ năng chuyên môn *</label>
              <input placeholder="Ví dụ: Node.js, React, SQL, Docker, BPMN 2.0..." value={cvForm.skills} onChange={(e) => setCvForm({ ...cvForm, skills: e.target.value })} className="w-full border rounded-lg p-2.5" required />
            </div>

            <div>
              <label className="block font-semibold mb-1">Đường dẫn tệp CV đã điền theo Mẫu chuẩn *</label>
              <input type="url" placeholder="https://drive.google.com/cv-cua-ban.doc" value={cvForm.cvUrl} onChange={(e) => setCvForm({ ...cvForm, cvUrl: e.target.value })} className="w-full border rounded-lg p-2.5" required />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setShowApplyModal(false)} className="px-4 py-2 border rounded-lg">Hủy bỏ</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold">Xác nhận nộp hồ sơ</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   2. CỔNG QUẢN TRỊ NỘI BỘ (/admin) - 4 NGHIỆP VỤ CÒN LẠI
============================================================================ */
function AdminWorkspace({ alert, showAlert }) {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_portal_auth') || 'null');
    } catch {
      return null;
    }
  });

  const [selectedRole, setSelectedRole] = useState('HR_SPECIALIST');
  const [email, setEmail] = useState('hr@company.com');
  const [password, setPassword] = useState('123456');
  const [tab, setTab] = useState('requisitions');

  const [requisitions, setRequisitions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJobFilter, setSelectedJobFilter] = useState('');
  const [kpis, setKpis] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  const [interviewModalApp, setInterviewModalApp] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    interviewSchedule: '09:30 Sáng Thứ 5 - Phòng họp Tầng 4',
    interviewNotice: 'Phòng Nhân sự trân trọng mời bạn tham dự buổi phỏng vấn chuyên môn. Vui lòng xác nhận tham dự.'
  });

  const [newReq, setNewReq] = useState({
    code: '', title: '', department: 'Phòng Công nghệ Thông tin', headcount: 1, isCritical: false, requirements: '', salaryRange: ''
  });

  const handleSelectRole = (roleKey) => {
    setSelectedRole(roleKey);
    setEmail(ROLE_INFO[roleKey].email);
  };

  const fetchData = async () => {
    if (!auth) return;
    const headers = { Authorization: `Bearer ${auth.token}` };
    const [reqRes, appRes, kpiRes] = await Promise.all([
      fetch(`${API_URL}/requisitions`, { headers }),
      fetch(`${API_URL}/applications`, { headers }),
      fetch(`${API_URL}/kpis`, { headers }),
    ]);
    if (reqRes.ok) {
      const reqList = await reqRes.json();
      setRequisitions(reqList);
      if (reqList.length > 0 && !selectedJobFilter) setSelectedJobFilter(reqList[0].id);
    }
    if (appRes.ok) {
      const list = await appRes.json();
      setApplications(list);
      if (selectedApp) {
        const refreshed = list.find((a) => a.id === selectedApp.id);
        if (refreshed) setSelectedApp(refreshed);
      }
    }
    if (kpiRes.ok) setKpis(await kpiRes.json());
  };

  useEffect(() => {
    if (auth) {
      setTab(auth.user.role === 'HR_DIRECTOR' ? 'kpi' : 'requisitions');
      fetchData();
    }
  }, [auth]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    localStorage.setItem('admin_portal_auth', JSON.stringify(data));
    setAuth(data);
  };

  const handleGoogleLogin = async () => {
    const roleMeta = ROLE_INFO[selectedRole];
    const googleEmail = prompt(`Nhập địa chỉ Gmail của bạn để đăng nhập [${roleMeta.name}]:`, `${selectedRole.toLowerCase()}@gmail.com`);
    if (!googleEmail) return;
    const fullName = prompt('Nhập họ và tên hiển thị trên Google:', `${roleMeta.name}`);

    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: googleEmail.trim(), fullName, expectedRole: selectedRole }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    localStorage.setItem('admin_portal_auth', JSON.stringify(data));
    setAuth(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_portal_auth');
    setAuth(null);
  };

  const handleCreateReq = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/requisitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(newReq),
    });
    if (res.ok) {
      showAlert('success', 'Đã gửi đề xuất nhu cầu tuyển dụng (kèm Mã nghề) tới Phòng Nhân sự!');
      setNewReq({ code: '', title: '', department: 'Phòng Công nghệ Thông tin', headcount: 1, isCritical: false, requirements: '', salaryRange: '' });
      fetchData();
    }
  };

  const handleReqAction = async (id, action) => {
    const payload = { action };
    if (action === 'REQUEST_MORE_INFO') {
      const note = prompt('Nhập nội dung yêu cầu Phòng ban bổ sung:');
      if (!note) return;
      payload.feedbackNote = note;
    } else if (action === 'SUBMIT_MORE_INFO') {
      const reqText = prompt('Cập nhật bổ sung tiêu chí yêu cầu công việc:');
      if (!reqText) return;
      payload.requirements = reqText;
    } else if (action === 'SUBMIT_JD_FOR_APPROVAL') {
      const jd = prompt('Soạn nội dung Mô tả công việc (JD) hoàn chỉnh để trình duyệt:', 'Mô tả chi tiết trách nhiệm công việc, quyền lợi và tiêu chuẩn tuyển dụng...');
      if (!jd) return;
      payload.jdContent = jd;
    } else if (action === 'REJECT') {
      const note = prompt('Nhập lý do từ chối:');
      if (!note) return;
      payload.feedbackNote = note;
    }

    const res = await fetch(`${API_URL}/requisitions/${id}/action`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    showAlert('success', data.message);
    fetchData();
  };

  const handleSimulateCvs = async (jobId) => {
    const res = await fetch(`${API_URL}/requisitions/${jobId}/simulate-cvs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    showAlert('success', data.message);
    setSelectedJobFilter(jobId);
    setTab('screening');
    fetchData();
  };

  const handleRunAiRanking = async (jobId) => {
    const res = await fetch(`${API_URL}/requisitions/${jobId}/ai-rank`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    showAlert('success', data.message);
    fetchData();
  };

  const handleAppStageChange = async (app, nextStage) => {
    if (nextStage === 'INTERVIEW_SCHEDULED') {
      setInterviewModalApp(app);
      return;
    }

    let interviewScore = null;
    if (nextStage === 'INTERVIEWED') {
      interviewScore = prompt('Nhập kết quả đánh giá phỏng vấn ứng viên:', 'Đạt yêu cầu chuyên môn (8.5/10) - Đề xuất tuyển dụng');
      if (!interviewScore) return;
    }

    const comment = prompt(`Ghi chú thực hiện bước "${STAGE_CONFIG[nextStage].label}":`, interviewScore || `Xác nhận ${STAGE_CONFIG[nextStage].label}`);
    if (comment === null) return;

    const res = await fetch(`${API_URL}/applications/${app.id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ nextStage, comment, interviewScore }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    showAlert('success', data.message);
    fetchData();
  };

  const handleSendInterviewInvite = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/applications/${interviewModalApp.id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({
        nextStage: 'INTERVIEW_SCHEDULED',
        interviewSchedule: interviewForm.interviewSchedule,
        interviewNotice: interviewForm.interviewNotice,
        comment: `Đã hẹn lịch phỏng vấn (${interviewForm.interviewSchedule}) và gửi thông báo tới ứng viên.`,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert('error', data.error);
    setInterviewModalApp(null);
    showAlert('success', data.message);
    fetchData();
  };

  if (!auth) {
    const activeMeta = ROLE_INFO[selectedRole];
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border">
          <div className="bg-slate-900 text-white p-6 text-center space-y-1">
            <h1 className="text-xl font-bold">Hệ Thống Quản Trị Tuyển Dụng Nội Bộ</h1>
            <p className="text-xs text-slate-300">Chọn vai trò nghiệp vụ để đăng nhập</p>
          </div>

          <div className="p-6 space-y-4">
            {alert && <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs">{alert.message}</div>}

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_INFO).map(([roleKey, info]) => (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => handleSelectRole(roleKey)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedRole === roleKey ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-xs text-slate-900">{info.name}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{info.email}</p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 border border-slate-300 hover:bg-slate-50 py-2.5 rounded-xl text-sm font-semibold text-slate-700"
            >
              Đăng nhập bằng tài khoản Google ({activeMeta.name})
            </button>

            <form onSubmit={handleLogin} className="space-y-3 pt-2 border-t">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm" required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm" required />
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-sm font-semibold">
                Đăng nhập vào Hệ thống Quản trị
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const currentRole = auth.user.role;
  const roleMeta = ROLE_INFO[currentRole] || ROLE_INFO.HR_SPECIALIST;
  const filteredScreeningApps = applications
    .filter((a) => (!selectedJobFilter || a.jobId === selectedJobFilter))
    .sort((a, b) => (a.aiRank || 999) - (b.aiRank || 999));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className={`${roleMeta.accent} text-white px-6 py-3.5 flex flex-wrap justify-between items-center shadow`}>
        <div className="flex items-center space-x-6">
          <div>
            <span className="font-bold text-base block">Quản Trị Tuyển Dụng • {roleMeta.name}</span>
            <span className="text-[11px] text-white/80">{auth.user.fullName}</span>
          </div>

          <nav className="flex space-x-2">
            <button
              onClick={() => setTab('requisitions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'requisitions' ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}
            >
              Yêu cầu Tuyển dụng & Mã nghề
            </button>
            {currentRole === 'HR_SPECIALIST' && (
              <button
                onClick={() => setTab('screening')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'screening' ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Sàng lọc & Xếp hạng Vòng đầu ({applications.length})
              </button>
            )}
            <button
              onClick={() => setTab('pipeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'pipeline' ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {currentRole === 'HR_DIRECTOR' ? 'Giám sát Tiến độ Ứng viên' : 'Phỏng vấn & Kết quả Đỗ/Trượt'}
            </button>
            {currentRole === 'HR_DIRECTOR' && (
              <button
                onClick={() => setTab('kpi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'kpi' ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Báo cáo Thống kê
              </button>
            )}
          </nav>
        </div>

        <button onClick={handleLogout} className="bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold">
          Đăng xuất
        </button>
      </header>

      {alert && (
        <div className={`mx-6 mt-4 p-3 rounded-lg border text-sm font-medium ${alert.type === 'error' ? 'bg-rose-50 border-rose-400 text-rose-800' : 'bg-emerald-50 border-emerald-400 text-emerald-800'}`}>
          {alert.message}
        </div>
      )}

      <main className="flex-1 p-6">
        {/* TAB 1: YÊU CẦU TUYỂN DỤNG & MÃ NGHỀ */}
        {tab === 'requisitions' && (
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
            {currentRole === 'DEPARTMENT' && (
              <form onSubmit={handleCreateReq} className="bg-white p-5 rounded-xl shadow-sm border space-y-3 text-xs h-fit">
                <h3 className="font-bold text-sm text-teal-800">Đề xuất Nhu cầu Tuyển dụng Mới</h3>
                <input placeholder="Mã nghề (VD: MN-IT-03) *" value={newReq.code} onChange={(e) => setNewReq({ ...newReq, code: e.target.value })} className="w-full border rounded-lg p-2.5 font-mono uppercase" required />
                <input placeholder="Tên vị trí cần tuyển *" value={newReq.title} onChange={(e) => setNewReq({ ...newReq, title: e.target.value })} className="w-full border rounded-lg p-2.5" required />
                <input placeholder="Phòng ban yêu cầu *" value={newReq.department} onChange={(e) => setNewReq({ ...newReq, department: e.target.value })} className="w-full border rounded-lg p-2.5" required />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="1" placeholder="Số lượng" value={newReq.headcount} onChange={(e) => setNewReq({ ...newReq, headcount: e.target.value })} className="border rounded-lg p-2.5" />
                  <input placeholder="Mức lương dự kiến" value={newReq.salaryRange} onChange={(e) => setNewReq({ ...newReq, salaryRange: e.target.value })} className="border rounded-lg p-2.5" />
                </div>
                <label className="flex items-center gap-2 font-semibold text-rose-700">
                  <input type="checkbox" checked={newReq.isCritical} onChange={(e) => setNewReq({ ...newReq, isCritical: e.target.checked })} />
                  Vị trí trọng yếu (Trình Giám đốc Nhân sự duyệt)
                </label>
                <textarea placeholder="Tiêu chí tuyển dụng (Từ khóa kỹ năng, số năm kinh nghiệm để đối chiếu CV) *" value={newReq.requirements} onChange={(e) => setNewReq({ ...newReq, requirements: e.target.value })} className="w-full border rounded-lg p-2.5 h-24" required />
                <button type="submit" className="w-full bg-teal-700 text-white py-2.5 rounded-lg font-semibold">Gửi đề xuất tuyển dụng</button>
              </form>
            )}

            <div className={currentRole === 'DEPARTMENT' ? 'md:col-span-2 space-y-3' : 'md:col-span-3 space-y-3'}>
              <h3 className="font-bold text-base">Danh sách Yêu cầu Tuyển dụng & Mã nghề</h3>
              {requisitions
                .filter((r) => (currentRole === 'HR_DIRECTOR' ? r.isCritical : true))
                .map((req) => {
                  const st = REQ_STATUS_VI[req.status] || { text: req.status, badge: 'bg-slate-100' };
                  return (
                    <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border space-y-2 text-xs">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <span className="font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded mr-2">Mã nghề: {req.code}</span>
                          {req.isCritical && <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold mr-2">Trọng yếu</span>}
                          <span className={`px-2.5 py-0.5 rounded-full font-bold ${st.badge}`}>{st.text}</span>
                          <h4 className="font-bold text-base text-slate-900 mt-1">{req.title} (Số lượng: {req.headcount})</h4>
                          <p className="text-slate-500">{req.department} • Đề xuất bởi: {req.createdBy}</p>
                        </div>
                      </div>

                      <p className="text-slate-700"><b>Tiêu chí tuyển dụng:</b> {req.requirements}</p>
                      {req.jdContent && <p className="text-indigo-900 bg-indigo-50 p-2.5 rounded-lg"><b>Mô tả công việc (JD):</b> {req.jdContent}</p>}

                      <div className="pt-3 border-t flex flex-wrap gap-2">
                        {currentRole === 'HR_SPECIALIST' && req.status === 'HR_CHECKING' && (
                          <>
                            <button onClick={() => handleReqAction(req.id, 'SUBMIT_JD_FOR_APPROVAL')} className="bg-blue-600 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                              Soạn JD & Trình phê duyệt
                            </button>
                            <button onClick={() => handleReqAction(req.id, 'REQUEST_MORE_INFO')} className="bg-amber-500 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                              Yêu cầu Phòng ban bổ sung
                            </button>
                          </>
                        )}

                        {currentRole === 'DEPARTMENT' && req.status === 'NEED_INFO' && (
                          <button onClick={() => handleReqAction(req.id, 'SUBMIT_MORE_INFO')} className="bg-amber-600 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                            Bổ sung tiêu chí công việc
                          </button>
                        )}

                        {currentRole === 'HIRING_MANAGER' && req.status === 'PENDING_APPROVAL' && !req.isCritical && (
                          <>
                            <button onClick={() => handleReqAction(req.id, 'APPROVE')} className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                              Phê duyệt JD
                            </button>
                            <button onClick={() => handleReqAction(req.id, 'REJECT')} className="bg-rose-600 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                              Từ chối
                            </button>
                          </>
                        )}

                        {currentRole === 'HR_DIRECTOR' && req.status === 'PENDING_APPROVAL' && req.isCritical && (
                          <>
                            <button onClick={() => handleReqAction(req.id, 'APPROVE')} className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                              Phê duyệt Yêu cầu Trọng yếu
                            </button>
                            <button onClick={() => handleReqAction(req.id, 'REJECT')} className="bg-rose-600 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                              Từ chối
                            </button>
                          </>
                        )}

                        {currentRole === 'HR_SPECIALIST' && req.status === 'APPROVED' && (
                          <button onClick={() => handleReqAction(req.id, 'PUBLISH')} className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                            Đăng tin tuyển dụng (Kèm CV mẫu)
                          </button>
                        )}

                        {currentRole === 'HR_SPECIALIST' && ['PUBLISHED', 'CLOSED'].includes(req.status) && (
                          <>
                            <button onClick={() => handleSimulateCvs(req.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                              Giả lập nhận 18 CV ứng viên
                            </button>
                            {req.status === 'PUBLISHED' && (
                              <button onClick={() => handleReqAction(req.id, 'CLOSE_REGISTRATION')} className="bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg font-semibold">
                                Kết thúc thời gian đăng ký & Chốt DS CV
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 2: SÀNG LỌC VÒNG ĐẦU & XẾP THỨ TỰ (KHÔNG NHẬN XÉT) + ĐÁNH GIÁ THỦ CÔNG */}
        {tab === 'screening' && currentRole === 'HR_SPECIALIST' && (
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border flex flex-wrap justify-between items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900">Sàng lọc Vòng đầu & Xếp thứ tự Ứng viên</h3>
                <p className="text-xs text-slate-500">
                  Bước 1: Chọn vị trí -> Bước 2: Chạy API đối chiếu tiêu chí & xếp thứ tự (không kèm nhận xét) -> Bước 3: Chuyên viên đánh giá thủ công từng hồ sơ.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedJobFilter}
                  onChange={(e) => setSelectedJobFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-xs font-semibold bg-slate-50"
                >
                  {requisitions.map((r) => (
                    <option key={r.id} value={r.id}>[{r.code}] {r.title}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleRunAiRanking(selectedJobFilter)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm"
                >
                  Chạy API Sàng lọc & Xếp thứ tự Vòng đầu
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b text-slate-700">
                  <tr>
                    <th className="p-3.5">Thứ tự xếp hạng</th>
                    <th className="p-3.5">Điểm đối chiếu</th>
                    <th className="p-3.5">Ứng viên & Kênh liên hệ</th>
                    <th className="p-3.5">Kinh nghiệm & Kỹ năng (Theo mẫu CV)</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5 text-right">Đánh giá thủ công của Chuyên viên</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredScreeningApps.map((app) => {
                    const st = STAGE_CONFIG[app.currentStage] || { label: app.currentStage, badge: 'bg-slate-100' };
                    return (
                      <tr key={app.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-sm">
                          {app.aiRank ? (
                            <span className={`px-2.5 py-1 rounded-lg ${app.aiRank <= 5 ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'}`}>
                              Hạng #{app.aiRank}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Chưa xếp hạng</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-blue-700">
                          {app.aiMatchScore !== null ? `${app.aiMatchScore}/100` : '--'}
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{app.candidateName}</p>
                          <p className="text-slate-500">
                            {app.candidateEmail ? `${app.candidateEmail} • ` : 'Không có Email • '}SĐT: {app.candidatePhone}
                          </p>
                          <a href={app.cvUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Xem CV mẫu</a>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <p className="font-medium text-slate-800">{app.experience}</p>
                          <p className="text-slate-500">{app.skills}</p>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full font-semibold ${st.badge}`}>{st.label}</span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {['APPLIED', 'CV_SCREENING'].includes(app.currentStage) ? (
                            <>
                              <button
                                onClick={() => handleAppStageChange(app, 'INTERVIEW_SCHEDULED')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold"
                              >
                                Đạt (Hẹn phỏng vấn)
                              </button>
                              <button
                                onClick={() => handleAppStageChange(app, 'REJECTED')}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-semibold"
                              >
                                Không đạt (Gửi TB trượt)
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">Đã đánh giá thủ công</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PHỎNG VẤN & KẾT QUẢ ĐỖ / TRƯỢT */}
        {tab === 'pipeline' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-9 gap-2">
              {Object.entries(STAGE_CONFIG).map(([stageKey, info]) => (
                <div key={stageKey} className={`rounded-xl border-t-4 p-2.5 shadow-sm bg-white ${info.color}`}>
                  <span className="text-[9px] font-bold text-slate-400 block">{info.owner}</span>
                  <h3 className="font-bold text-[11px] text-slate-800 mb-2">{info.label}</h3>

                  <div className="space-y-2">
                    {applications.filter((a) => a.currentStage === stageKey).map((app) => (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className={`p-2.5 rounded-lg border text-[11px] cursor-pointer bg-white hover:shadow ${selectedApp?.id === app.id ? 'ring-2 ring-blue-500' : 'border-slate-200'}`}
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-slate-900">{app.candidateName}</p>
                          {app.aiRank && <span className="text-[10px] font-bold text-blue-700">#{app.aiRank}</span>}
                        </div>
                        <p className="text-slate-500 text-[10px] line-clamp-1">{app.job?.title}</p>

                        {currentRole === 'HR_SPECIALIST' && (
                          <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                            {['APPLIED', 'CV_SCREENING'].includes(stageKey) && (
                              <>
                                <button onClick={() => handleAppStageChange(app, 'INTERVIEW_SCHEDULED')} className="w-full bg-indigo-600 text-white py-1 rounded text-[10px] font-semibold">
                                  Hẹn lịch & Gửi thông báo PV
                                </button>
                                <button onClick={() => handleAppStageChange(app, 'REJECTED')} className="w-full bg-rose-100 text-rose-700 py-1 rounded text-[10px] font-semibold">
                                  Loại & Gửi TB trượt
                                </button>
                              </>
                            )}
                            {stageKey === 'INTERVIEWED' && (
                              <button onClick={() => handleAppStageChange(app, 'OFFER_PENDING_APPROVAL')} className="w-full bg-orange-600 text-white py-1 rounded text-[10px] font-semibold">
                                Trình duyệt thư mời nhận việc
                              </button>
                            )}
                            {stageKey === 'OFFER_SENT' && (
                              <button onClick={() => handleAppStageChange(app, 'ONBOARDING_DOCS')} className="w-full bg-cyan-600 text-white py-1 rounded text-[10px] font-semibold">
                                Hướng dẫn hoàn thiện hồ sơ
                              </button>
                            )}
                            {stageKey === 'ONBOARDING_DOCS' && (
                              <button onClick={() => handleAppStageChange(app, 'HIRED')} className="w-full bg-emerald-600 text-white py-1 rounded text-[10px] font-semibold">
                                Xác nhận trúng tuyển (Gửi TB Đỗ)
                              </button>
                            )}
                          </div>
                        )}

                        {currentRole === 'DEPARTMENT' && stageKey === 'INTERVIEW_SCHEDULED' && (
                          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleAppStageChange(app, 'INTERVIEWED')} className="w-full bg-teal-700 text-white py-1 rounded text-[10px] font-semibold">
                              Đánh giá phỏng vấn
                            </button>
                          </div>
                        )}

                        {currentRole === 'HIRING_MANAGER' && (
                          <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                            {stageKey === 'INTERVIEW_SCHEDULED' && (
                              <button onClick={() => handleAppStageChange(app, 'INTERVIEWED')} className="w-full bg-indigo-600 text-white py-1 rounded text-[10px] font-semibold">
                                Đánh giá phỏng vấn
                              </button>
                            )}
                            {stageKey === 'OFFER_PENDING_APPROVAL' && (
                              <>
                                <button onClick={() => handleAppStageChange(app, 'OFFER_SENT')} className="w-full bg-emerald-600 text-white py-1 rounded text-[10px] font-semibold">
                                  Duyệt Offer & Gửi TB Đỗ
                                </button>
                                <button onClick={() => handleAppStageChange(app, 'REJECTED')} className="w-full bg-rose-100 text-rose-700 py-1 rounded text-[10px] font-semibold">
                                  Từ chối & Gửi TB Trượt
                                </button>
                              </>
                            )}
                          </div>
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
                    <h4 className="font-bold text-sm">Chi tiết hồ sơ: {selectedApp.candidateName}</h4>
                    <p className="text-slate-500">
                      {selectedApp.candidateEmail ? `Email: ${selectedApp.candidateEmail} • ` : 'Không có Email • '}SĐT: {selectedApp.candidatePhone} • <a href={selectedApp.cvUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Xem tệp CV</a>
                    </p>
                    {selectedApp.emailSentLog && <p className="text-emerald-700 font-semibold mt-1">Trạng thái thông báo: {selectedApp.emailSentLog}</p>}
                  </div>
                  <button onClick={() => setSelectedApp(null)} className="text-slate-400">Đóng</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BÁO CÁO THỐNG KÊ (GIÁM ĐỐC NHÂN SỰ) */}
        {tab === 'kpi' && kpis && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-xs text-slate-500">Tổng số Yêu cầu Tuyển dụng</p>
                <p className="text-3xl font-bold text-indigo-700 mt-1">{kpis.totalRequisitions}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-xs text-slate-500">Tổng số Hồ sơ Ứng viên</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{kpis.totalApplications}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border">
              <h3 className="font-bold text-sm mb-3">Phân bổ Hồ sơ Ứng viên theo Giai đoạn</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {kpis.stageCounts?.map((s) => (
                  <div key={s.currentStage} className="p-4 bg-slate-50 rounded-xl border">
                    <p className="text-xs font-bold text-slate-700">{STAGE_CONFIG[s.currentStage]?.label || s.currentStage}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{s._count.id} hồ sơ</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL HẸN PHỎNG VẤN */}
        {interviewModalApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSendInterviewInvite} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-3 text-xs">
              <h3 className="font-bold text-base border-b pb-2">Hẹn lịch & Gửi thông báo phỏng vấn</h3>
              <p className="text-slate-600">
                Ứng viên: <b>{interviewModalApp.candidateName}</b>{' '}
                ({interviewModalApp.candidateEmail ? `Email: ${interviewModalApp.candidateEmail} & SĐT: ${interviewModalApp.candidatePhone}` : `SĐT: ${interviewModalApp.candidatePhone}`})
              </p>
              <div>
                <label className="block font-semibold mb-1">Thời gian & Địa điểm phỏng vấn *</label>
                <input value={interviewForm.interviewSchedule} onChange={(e) => setInterviewForm({ ...interviewForm, interviewSchedule: e.target.value })} className="w-full border rounded-lg p-2.5" required />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nội dung thông báo gửi tới ứng viên *</label>
                <textarea value={interviewForm.interviewNotice} onChange={(e) => setInterviewForm({ ...interviewForm, interviewNotice: e.target.value })} className="w-full border rounded-lg p-2.5 h-24" required />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setInterviewModalApp(null)} className="px-4 py-2 border rounded-lg">Hủy bỏ</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold">Xác nhận & Gửi thông báo</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
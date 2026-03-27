/* =============================
   앱 메인 진입점 & 설정 모듈
   ============================= */

/* ----- 설정 모듈 ----- */
const Settings = {
  init() {
    this.load();
    this.bindEvents();
  },

  load() {
    const apiKey = localStorage.getItem('claudeApiKey') || '';
    const model = localStorage.getItem('claudeModel') || 'claude-sonnet-4-5';
    const orgName = localStorage.getItem('orgName') || '';
    const authorName = localStorage.getItem('authorName') || '';

    document.getElementById('claudeApiKey').value = apiKey;
    document.getElementById('claudeModel').value = model;
    document.getElementById('orgName').value = orgName;
    document.getElementById('authorName').value = authorName;

    // 기관명을 헤더에 표시
    if (orgName) {
      document.querySelector('.logo span').textContent = orgName + ' · 주간 업무 일정';
    }
  },

  save() {
    const apiKey = document.getElementById('claudeApiKey').value.trim();
    const model = document.getElementById('claudeModel').value;
    const orgName = document.getElementById('orgName').value.trim();
    const authorName = document.getElementById('authorName').value.trim();

    localStorage.setItem('claudeApiKey', apiKey);
    localStorage.setItem('claudeModel', model);
    localStorage.setItem('orgName', orgName);
    localStorage.setItem('authorName', authorName);

    if (orgName) {
      document.querySelector('.logo span').textContent = orgName + ' · 주간 업무 일정';
    } else {
      document.querySelector('.logo span').textContent = '주간 업무 일정 캘린더';
    }

    showToast('설정이 저장되었습니다.', 'success');
    this.closeModal();
  },

  openModal() {
    this.load();
    document.getElementById('settingsModal').classList.add('active');
  },

  closeModal() {
    document.getElementById('settingsModal').classList.remove('active');
  },

  bindEvents() {
    document.getElementById('openSettings').addEventListener('click', () => this.openModal());
    document.getElementById('saveSettings').addEventListener('click', () => this.save());
    document.getElementById('cancelSettings').addEventListener('click', () => this.closeModal());
    document.getElementById('closeSettings').addEventListener('click', () => this.closeModal());

    // API Key 보기/숨기기
    document.getElementById('toggleApiKey').addEventListener('click', () => {
      const input = document.getElementById('claudeApiKey');
      const icon = document.querySelector('#toggleApiKey i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
      }
    });

    // 전체 데이터 초기화
    document.getElementById('clearAllData').addEventListener('click', async () => {
      if (!confirm('모든 일정 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
      try {
        const all = await API.getAll();
        let count = 0;
        for (const s of all) {
          await API.delete(s.id);
          count++;
        }
        showToast(`${count}개 데이터가 삭제되었습니다.`, 'success');
        Calendar.render();
        this.closeModal();
      } catch (e) {
        showToast('데이터 초기화 중 오류가 발생했습니다.', 'error');
      }
    });
  }
};

/* ----- 키보드 단축키 ----- */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    switch(e.key) {
      case 'ArrowLeft':
        if (e.altKey) Calendar.prevWeek();
        break;
      case 'ArrowRight':
        if (e.altKey) Calendar.nextWeek();
        break;
      case 'n':
      case 'N':
        if (!e.ctrlKey && !e.metaKey) Calendar.openAddModal();
        break;
      case 'Escape':
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        break;
    }
  });
}

/* ----- 앱 초기화 ----- */
document.addEventListener('DOMContentLoaded', () => {
  // 모듈 초기화
  Settings.init();
  Calendar.init();
  Uploader.init();
  Exporter.init();
  initKeyboardShortcuts();

  // 환영 토스트 (처음 방문 시)
  const isFirstVisit = !localStorage.getItem('visited');
  if (isFirstVisit) {
    localStorage.setItem('visited', 'true');
    setTimeout(() => {
      showToast('📅 주간 업무 일정 캘린더에 오신 것을 환영합니다! AI 분석을 사용하려면 먼저 설정에서 Claude API Key를 입력해주세요.', 'info', 6000);
    }, 500);
  }

  // API Key 설정 여부 확인
  const hasApiKey = !!localStorage.getItem('claudeApiKey');
  if (!hasApiKey) {
    document.getElementById('openUpload').title = 'AI 분석 전 설정에서 API Key를 입력하세요';
  }
});

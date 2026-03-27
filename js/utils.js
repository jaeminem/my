/* =============================
   유틸리티 함수 모음
   ============================= */

// 카테고리 정보
const CATEGORIES = {
  fixed:         { label: '고정 일정',      icon: 'fa-thumbtack',     class: 'cat-fixed' },
  new:           { label: '신규 일정',      icon: 'fa-star',          class: 'cat-new' },
  inspection:    { label: '외부기관 현장점검', icon: 'fa-search',      class: 'cat-inspection' },
  harmony:       { label: '한마음 활동',    icon: 'fa-heart',         class: 'cat-harmony' },
  personnel:     { label: '인사발령',       icon: 'fa-user-tie',      class: 'cat-personnel' },
  business_trip: { label: '출장/연차',      icon: 'fa-plane',         class: 'cat-business_trip' },
  other:         { label: '기타현황',       icon: 'fa-ellipsis-h',    class: 'cat-other' }
};

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' };

/**
 * 특정 날짜가 속한 주의 월요일 반환
 */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 주차의 각 날짜 (월~금) 배열 반환
 */
function getWeekDays(monday) {
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * 연도의 몇 번째 주인지 계산 (ISO 주차)
 */
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/**
 * 월의 몇 번째 주인지 계산
 */
function getMonthWeekNumber(date) {
  const d = new Date(date);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const firstMonday = getMonday(firstDay);
  const diffDays = Math.floor((getMonday(d) - firstMonday) / (7 * 24 * 60 * 60 * 1000));
  return diffDays + 1;
}

/**
 * 주차 라벨 생성
 */
function getWeekLabel(monday) {
  const year = monday.getFullYear();
  const month = monday.getMonth() + 1;
  const weekNum = getMonthWeekNumber(monday);
  return `${year}년 ${month}월 ${weekNum}주차`;
}

/**
 * 날짜 포맷 YYYY-MM-DD
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 날짜 표시용 포맷 M/D
 */
function formatDateShort(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

/**
 * 날짜 표시용 포맷 YYYY.MM.DD
 */
function formatDateDot(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

/**
 * YYYY-MM-DD 문자열 → Date 객체
 */
function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 오늘 날짜인지 확인
 */
function isToday(date) {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
}

/**
 * 요일 인덱스 → dayKey 변환 (0=일요일 기준 제외, 1=mon...)
 */
function dayIndexToKey(jsDay) {
  const map = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };
  return map[jsDay] || null;
}

/**
 * 날짜 문자열 → dayKey 변환
 */
function dateToDayKey(dateStr) {
  if (!dateStr) return null;
  const d = parseDate(dateStr);
  if (!d) return null;
  return dayIndexToKey(d.getDay());
}

/**
 * 카테고리 라벨 반환
 */
function getCategoryLabel(cat) {
  return CATEGORIES[cat]?.label || cat;
}

/**
 * 카테고리 클래스 반환
 */
function getCategoryClass(cat) {
  return CATEGORIES[cat]?.class || 'cat-other';
}

/**
 * 카테고리 아이콘 반환
 */
function getCategoryIcon(cat) {
  return CATEGORIES[cat]?.icon || 'fa-circle';
}

/**
 * UUID 생성
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * 토스트 알림
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * 파일 크기 포맷
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 파일 확장자 반환
 */
function getFileExt(filename) {
  return filename.split('.').pop().toLowerCase();
}

/**
 * 현재 작성일 반환
 */
function getTodayLabel() {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `작성일: ${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

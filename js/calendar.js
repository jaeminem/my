/* =============================
   캘린더 핵심 로직
   ============================= */

const Calendar = {
  currentMonday: null,
  currentSchedules: [],
  currentEditId: null,

  /**
   * 초기화
   */
  init() {
    this.currentMonday = getMonday(new Date());
    this.updateHeader();
    this.render();
    this.bindEvents();
    document.getElementById('writtenDate').textContent = getTodayLabel();
  },

  /**
   * 헤더 업데이트 (주차 정보)
   */
  updateHeader() {
    const monday = this.currentMonday;
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    document.getElementById('weekLabel').textContent = getWeekLabel(monday);
    document.getElementById('weekDates').textContent =
      `${formatDateDot(monday)} ~ ${formatDateDot(friday)}`;

    // 요일별 날짜 업데이트
    const weekDays = getWeekDays(monday);
    DAYS.forEach((day, i) => {
      const el = document.getElementById(`date-${day}`);
      if (el) el.textContent = formatDateShort(weekDays[i]);
    });

    // 오늘 컬럼 하이라이트
    document.querySelectorAll('.today-col').forEach(el => el.classList.remove('today-col'));
    weekDays.forEach((day, i) => {
      if (isToday(day)) {
        const th = document.querySelector(`th[data-day="${DAYS[i]}"]`);
        if (th) th.classList.add('today-col');
      }
    });
  },

  /**
   * 현재 주차 정보 반환
   */
  getCurrentWeekInfo() {
    return {
      year: this.currentMonday.getFullYear(),
      weekNumber: getWeekNumber(this.currentMonday),
      monday: this.currentMonday
    };
  },

  /**
   * 캘린더 렌더링
   */
  async render() {
    const tbody = document.getElementById('calendarBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;"><i class="fas fa-circle-notch fa-spin"></i> 불러오는 중...</td></tr>';

    const { year, weekNumber } = this.getCurrentWeekInfo();
    this.currentSchedules = await API.getByWeek(year, weekNumber);

    // 주차의 날짜들
    const weekDays = getWeekDays(this.currentMonday);
    const dateMap = {};
    DAYS.forEach((day, i) => { dateMap[day] = formatDate(weekDays[i]); });

    tbody.innerHTML = '';

    // 카테고리별 행 생성
    Object.entries(CATEGORIES).forEach(([catKey, catInfo]) => {
      const tr = document.createElement('tr');

      // 구분 셀
      const tdCat = document.createElement('td');
      tdCat.className = 'category-cell';
      tdCat.innerHTML = `<div class="category-label cat-label-${catKey}">
        <i class="fas ${catInfo.icon}"></i>
        ${catInfo.label}
      </div>`;
      tr.appendChild(tdCat);

      // 요일별 셀
      DAYS.forEach(day => {
        const td = document.createElement('td');
        if (isToday(new Date(dateMap[day]))) td.classList.add('today-col');

        const cell = document.createElement('div');
        cell.className = 'schedule-cell';
        cell.dataset.day = day;
        cell.dataset.category = catKey;
        cell.dataset.date = dateMap[day];

        // 해당 요일+카테고리 일정 필터링
        const daySchedules = this.currentSchedules.filter(s =>
          s.category === catKey && s.day_of_week === day
        );

        // 일정 카드 렌더링
        daySchedules.forEach(s => {
          cell.appendChild(this.createScheduleCard(s));
        });

        // 추가 버튼
        const addBtn = document.createElement('button');
        addBtn.className = 'add-schedule-btn';
        addBtn.innerHTML = '<i class="fas fa-plus"></i> 추가';
        addBtn.addEventListener('click', () => this.openAddModal(catKey, day, dateMap[day]));
        cell.appendChild(addBtn);

        td.appendChild(cell);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  },

  /**
   * 일정 카드 DOM 생성
   */
  createScheduleCard(schedule) {
    const div = document.createElement('div');
    div.className = `schedule-item cat-${schedule.category}`;
    div.dataset.id = schedule.id;

    let html = `<strong>${schedule.title}</strong>`;
    if (schedule.time_start) {
      const timeStr = schedule.time_end
        ? `${schedule.time_start}~${schedule.time_end}`
        : schedule.time_start;
      html += `<span class="schedule-time"><i class="fas fa-clock"></i> ${timeStr}</span>`;
    }
    if (schedule.location) {
      html += `<span class="schedule-location"><i class="fas fa-map-marker-alt"></i> ${schedule.location}</span>`;
    }
    if (schedule.source && schedule.source !== 'manual') {
      html += `<span class="ai-source-tag"><i class="fas fa-robot"></i> AI 추출</span>`;
    }

    div.innerHTML = html;
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openDetailModal(schedule);
    });

    return div;
  },

  /**
   * 이전 주
   */
  prevWeek() {
    this.currentMonday = new Date(this.currentMonday);
    this.currentMonday.setDate(this.currentMonday.getDate() - 7);
    this.updateHeader();
    this.render();
  },

  /**
   * 다음 주
   */
  nextWeek() {
    this.currentMonday = new Date(this.currentMonday);
    this.currentMonday.setDate(this.currentMonday.getDate() + 7);
    this.updateHeader();
    this.render();
  },

  /**
   * 오늘 주차로 이동
   */
  goToday() {
    this.currentMonday = getMonday(new Date());
    this.updateHeader();
    this.render();
  },

  /**
   * 일정 추가 모달 열기
   */
  openAddModal(category = '', day = '', date = '') {
    this.currentEditId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-calendar-plus"></i> 일정 추가';
    document.getElementById('scheduleForm').reset();
    document.getElementById('scheduleId').value = '';
    if (category) document.getElementById('scheduleCategory').value = category;
    if (day) document.getElementById('scheduleDay').value = day;
    document.getElementById('addModal').classList.add('active');
  },

  /**
   * 일정 수정 모달 열기
   */
  openEditModal(schedule) {
    this.currentEditId = schedule.id;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> 일정 수정';
    document.getElementById('scheduleId').value = schedule.id;
    document.getElementById('scheduleCategory').value = schedule.category || '';
    document.getElementById('scheduleDay').value = schedule.day_of_week || '';
    document.getElementById('scheduleTitle').value = schedule.title || '';
    document.getElementById('scheduleTimeStart').value = schedule.time_start || '';
    document.getElementById('scheduleTimeEnd').value = schedule.time_end || '';
    document.getElementById('scheduleLocation').value = schedule.location || '';
    document.getElementById('scheduleParticipants').value = schedule.participants || '';
    document.getElementById('scheduleNote').value = schedule.note || '';

    document.getElementById('detailModal').classList.remove('active');
    document.getElementById('addModal').classList.add('active');
  },

  /**
   * 일정 저장 (추가/수정)
   */
  async saveSchedule() {
    const id = document.getElementById('scheduleId').value;
    const category = document.getElementById('scheduleCategory').value;
    const day = document.getElementById('scheduleDay').value;
    const title = document.getElementById('scheduleTitle').value.trim();
    const timeStart = document.getElementById('scheduleTimeStart').value;
    const timeEnd = document.getElementById('scheduleTimeEnd').value;
    const location = document.getElementById('scheduleLocation').value.trim();
    const participants = document.getElementById('scheduleParticipants').value.trim();
    const note = document.getElementById('scheduleNote').value.trim();

    if (!category || !day || !title) {
      showToast('구분, 요일, 제목은 필수 입력항목입니다.', 'error');
      return;
    }

    const weekDays = getWeekDays(this.currentMonday);
    const dayIndex = DAYS.indexOf(day);
    const date = dayIndex >= 0 ? formatDate(weekDays[dayIndex]) : '';

    const { year, weekNumber } = this.getCurrentWeekInfo();

    const data = {
      week_number: weekNumber,
      year,
      week_label: getWeekLabel(this.currentMonday),
      day_of_week: day,
      date,
      category,
      title,
      time_start: timeStart,
      time_end: timeEnd,
      location,
      participants,
      note,
      source: 'manual'
    };

    try {
      const btn = document.getElementById('saveSchedule');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 저장 중...';

      if (id) {
        await API.update(id, data);
        showToast('일정이 수정되었습니다.', 'success');
      } else {
        await API.create(data);
        showToast('일정이 추가되었습니다.', 'success');
      }

      document.getElementById('addModal').classList.remove('active');
      await this.render();
    } catch (e) {
      showToast('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      const btn = document.getElementById('saveSchedule');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> 저장';
    }
  },

  /**
   * 상세 모달 열기
   */
  openDetailModal(schedule) {
    this.currentEditId = schedule.id;
    const catInfo = CATEGORIES[schedule.category] || CATEGORIES.other;
    const body = document.getElementById('detailModalBody');

    let html = `<div class="detail-info">
      <div class="detail-row">
        <span class="label">구분</span>
        <span class="value">
          <span class="detail-category-badge cat-label-${schedule.category}">
            <i class="fas ${catInfo.icon}"></i> ${catInfo.label}
          </span>
        </span>
      </div>
      <div class="detail-row">
        <span class="label">요일</span>
        <span class="value">${DAY_LABELS[schedule.day_of_week] || ''} (${schedule.date || ''})</span>
      </div>
      <div class="detail-row">
        <span class="label">제목</span>
        <span class="value"><strong>${schedule.title}</strong></span>
      </div>`;

    if (schedule.time_start) {
      const timeStr = schedule.time_end
        ? `${schedule.time_start} ~ ${schedule.time_end}`
        : schedule.time_start;
      html += `<div class="detail-row">
        <span class="label">시간</span>
        <span class="value">${timeStr}</span>
      </div>`;
    }
    if (schedule.location) {
      html += `<div class="detail-row">
        <span class="label">장소</span>
        <span class="value">${schedule.location}</span>
      </div>`;
    }
    if (schedule.participants) {
      html += `<div class="detail-row">
        <span class="label">참석 인원</span>
        <span class="value">${schedule.participants}</span>
      </div>`;
    }
    if (schedule.note) {
      html += `<div class="detail-row">
        <span class="label">비고</span>
        <span class="value">${schedule.note}</span>
      </div>`;
    }
    if (schedule.source) {
      const sourceMap = {
        manual: '직접 입력',
        ai_image: 'AI (이미지)',
        ai_pdf: 'AI (PDF)',
        ai_excel: 'AI (엑셀)'
      };
      html += `<div class="detail-row">
        <span class="label">입력 방식</span>
        <span class="value">${sourceMap[schedule.source] || schedule.source}</span>
      </div>`;
    }

    html += '</div>';
    body.innerHTML = html;

    // 버튼에 현재 일정 바인딩
    document.getElementById('editScheduleBtn').onclick = () => this.openEditModal(schedule);
    document.getElementById('deleteScheduleBtn').onclick = () => this.deleteSchedule(schedule.id);

    document.getElementById('detailModal').classList.add('active');
  },

  /**
   * 일정 삭제
   */
  async deleteSchedule(id) {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
    try {
      await API.delete(id);
      document.getElementById('detailModal').classList.remove('active');
      showToast('일정이 삭제되었습니다.', 'success');
      await this.render();
    } catch (e) {
      showToast('삭제 중 오류가 발생했습니다.', 'error');
    }
  },

  /**
   * AI 추출 일정 캘린더에 추가
   */
  async addExtractedSchedules(schedules) {
    const { year, weekNumber } = this.getCurrentWeekInfo();
    const weekDays = getWeekDays(this.currentMonday);
    const dateMap = {};
    DAYS.forEach((day, i) => { dateMap[day] = formatDate(weekDays[i]); });

    const toCreate = schedules.map(s => ({
      week_number: weekNumber,
      year,
      week_label: getWeekLabel(this.currentMonday),
      day_of_week: s.day_of_week || 'mon',
      date: s.date || dateMap[s.day_of_week] || '',
      category: s.category || 'new',
      title: s.title,
      time_start: s.time_start || '',
      time_end: s.time_end || '',
      location: s.location || '',
      participants: s.participants || '',
      note: s.note || '',
      source: s.source || 'ai_image'
    }));

    await API.bulkCreate(toCreate);
    await this.render();
    showToast(`${toCreate.length}개 일정이 캘린더에 추가되었습니다.`, 'success');
  },

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    document.getElementById('prevWeek').addEventListener('click', () => this.prevWeek());
    document.getElementById('nextWeek').addEventListener('click', () => this.nextWeek());
    document.getElementById('goToday').addEventListener('click', () => this.goToday());
    document.getElementById('openAddModal').addEventListener('click', () => this.openAddModal());

    document.getElementById('saveSchedule').addEventListener('click', () => this.saveSchedule());
    document.getElementById('closeAddModal').addEventListener('click', () => {
      document.getElementById('addModal').classList.remove('active');
    });
    document.getElementById('cancelAddModal').addEventListener('click', () => {
      document.getElementById('addModal').classList.remove('active');
    });

    document.getElementById('closeDetailModal').addEventListener('click', () => {
      document.getElementById('detailModal').classList.remove('active');
    });
    document.getElementById('cancelDetailModal').addEventListener('click', () => {
      document.getElementById('detailModal').classList.remove('active');
    });

    // 모달 외부 클릭 닫기
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });

    // 폼 엔터키 제출
    document.getElementById('scheduleForm').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.saveSchedule();
      }
    });
  }
};

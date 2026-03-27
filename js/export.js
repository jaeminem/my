/* =============================
   내보내기 & 인쇄 모듈
   ============================= */

const Exporter = {
  init() {
    document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());
    document.getElementById('printPage').addEventListener('click', () => this.print());
  },

  /**
   * 엑셀 내보내기
   */
  async exportToExcel() {
    try {
      const { year, weekNumber } = Calendar.getCurrentWeekInfo();
      const schedules = await API.getByWeek(year, weekNumber);

      if (schedules.length === 0) {
        showToast('내보낼 일정이 없습니다.', 'warning');
        return;
      }

      const wb = XLSX.utils.book_new();

      // 1. 주간 캘린더 시트 (테이블 형식)
      const calSheet = this.buildCalendarSheet(schedules);
      XLSX.utils.book_append_sheet(wb, calSheet, '주간캘린더');

      // 2. 전체 목록 시트
      const listSheet = this.buildListSheet(schedules);
      XLSX.utils.book_append_sheet(wb, listSheet, '일정목록');

      const weekLabel = getWeekLabel(Calendar.currentMonday);
      const fileName = `주간업무일정_${weekLabel.replace(/\s/g, '_')}.xlsx`;

      XLSX.writeFile(wb, fileName);
      showToast('엑셀 파일이 다운로드되었습니다.', 'success');
    } catch (e) {
      console.error('엑셀 내보내기 오류:', e);
      showToast('엑셀 내보내기 중 오류가 발생했습니다.', 'error');
    }
  },

  /**
   * 캘린더 형식 시트 생성
   */
  buildCalendarSheet(schedules) {
    const weekLabel = getWeekLabel(Calendar.currentMonday);
    const weekDays = getWeekDays(Calendar.currentMonday);

    const rows = [];

    // 제목 행
    rows.push([weekLabel, '', '', '', '', '']);
    rows.push([`작성일: ${getTodayLabel().replace('작성일: ', '')}`, '', '', '', '', '']);
    rows.push([]);

    // 헤더 행
    const header = ['구분', '월', '화', '수', '목', '금'];
    rows.push(header);

    // 카테고리별 데이터
    Object.entries(CATEGORIES).forEach(([catKey, catInfo]) => {
      const row = [catInfo.label];
      DAYS.forEach(day => {
        const items = schedules
          .filter(s => s.category === catKey && s.day_of_week === day)
          .map(s => {
            let text = s.title;
            if (s.time_start) text += ` (${s.time_start}${s.time_end ? '~' + s.time_end : ''})`;
            if (s.location) text += ` [${s.location}]`;
            return text;
          });
        row.push(items.join('\n'));
      });
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 16 },
      { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 28 }
    ];

    // 행 높이 설정
    ws['!rows'] = rows.map(() => ({ hpt: 40 }));

    return ws;
  },

  /**
   * 목록 형식 시트 생성
   */
  buildListSheet(schedules) {
    const rows = [
      ['연도', '주차', '주차라벨', '구분', '요일', '날짜', '제목', '시작시간', '종료시간', '장소', '참석인원', '비고', '입력방식']
    ];

    schedules
      .sort((a, b) => {
        const dayOrder = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 };
        return (dayOrder[a.day_of_week] || 0) - (dayOrder[b.day_of_week] || 0);
      })
      .forEach(s => {
        rows.push([
          s.year,
          s.week_number,
          s.week_label,
          getCategoryLabel(s.category),
          DAY_LABELS[s.day_of_week] || s.day_of_week,
          s.date,
          s.title,
          s.time_start,
          s.time_end,
          s.location,
          s.participants,
          s.note,
          s.source
        ]);
      });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 6 }, { wch: 18 }, { wch: 16 }, { wch: 6 }, { wch: 12 },
      { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 12 }
    ];

    return ws;
  },

  /**
   * 인쇄
   */
  print() {
    window.print();
  }
};

/* =============================
   파일 업로드 & AI 분석 모듈
   ============================= */

const Uploader = {
  currentFile: null,
  extractedData: null,
  fileContent: null,   // 텍스트 내용 또는 base64
  fileType: null,      // 'image' | 'pdf' | 'excel'

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // 드래그앤드롭
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length > 0) this.handleFile(files[0]);
    });
    uploadZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
    });

    // 분석 버튼
    document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());

    // 캘린더 추가 버튼
    document.getElementById('addToCalendarBtn').addEventListener('click', () => this.addToCalendar());

    // 업로드 모달 열기/닫기
    document.getElementById('openUpload').addEventListener('click', () => this.openModal());
    document.getElementById('closeUploadModal').addEventListener('click', () => this.closeModal());
    document.getElementById('cancelUploadModal').addEventListener('click', () => this.closeModal());
  },

  openModal() {
    this.reset();
    document.getElementById('uploadModal').classList.add('active');
  },

  closeModal() {
    document.getElementById('uploadModal').classList.remove('active');
  },

  reset() {
    this.currentFile = null;
    this.extractedData = null;
    this.fileContent = null;
    this.fileType = null;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('aiStatus').style.display = 'none';
    document.getElementById('extractedSchedules').style.display = 'none';
    document.getElementById('analyzeBtn').style.display = 'none';
    document.getElementById('addToCalendarBtn').style.display = 'none';
    document.getElementById('fileInput').value = '';
  },

  /**
   * 파일 처리
   */
  async handleFile(file) {
    const ext = getFileExt(file.name);
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      showToast('파일 크기가 10MB를 초과합니다.', 'error');
      return;
    }

    const supportedExts = ['jpg', 'jpeg', 'png', 'pdf', 'xlsx', 'xls'];
    if (!supportedExts.includes(ext)) {
      showToast('지원하지 않는 파일 형식입니다.', 'error');
      return;
    }

    this.currentFile = file;

    // 파일 정보 표시
    const iconMap = { jpg: 'fa-image', jpeg: 'fa-image', png: 'fa-image', pdf: 'fa-file-pdf', xlsx: 'fa-file-excel', xls: 'fa-file-excel' };
    document.getElementById('fileInfo').innerHTML = `
      <i class="fas ${iconMap[ext] || 'fa-file'}" style="font-size:18px;"></i>
      <strong>${file.name}</strong>
      <span style="color:#64748b;">(${formatFileSize(file.size)})</span>
    `;

    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('filePreview').style.display = 'block';
    document.getElementById('aiStatus').style.display = 'none';
    document.getElementById('extractedSchedules').style.display = 'none';
    document.getElementById('addToCalendarBtn').style.display = 'none';

    // 파일 유형에 따라 처리
    if (['jpg', 'jpeg', 'png'].includes(ext)) {
      this.fileType = 'image';
      await this.previewImage(file);
    } else if (ext === 'pdf') {
      this.fileType = 'pdf';
      await this.previewPDF(file);
    } else if (['xlsx', 'xls'].includes(ext)) {
      this.fileType = 'excel';
      await this.previewExcel(file);
    }

    document.getElementById('analyzeBtn').style.display = 'inline-flex';
  },

  /**
   * 이미지 미리보기 & base64 변환
   */
  async previewImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result; // data:image/...;base64,...
        this.fileContent = base64;

        const previewEl = document.getElementById('previewContent');
        previewEl.innerHTML = `<img src="${base64}" style="max-width:100%;max-height:180px;border-radius:6px;display:block;margin:0 auto;" alt="미리보기" />`;
        resolve();
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * PDF 텍스트 추출
   */
  async previewPDF(file) {
    const previewEl = document.getElementById('previewContent');
    previewEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> PDF 텍스트 추출 중...';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

      // PDF.js 워커 설정
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let fullText = '';

        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(' ');
          fullText += `[페이지 ${i}]\n${pageText}\n\n`;
        }

        this.fileContent = fullText.trim();
        previewEl.innerHTML = `<pre style="font-size:11px;line-height:1.6;">${this.escapeHtml(fullText.substring(0, 1000))}${fullText.length > 1000 ? '\n...(생략)' : ''}</pre>`;
      } else {
        // PDF.js 없을 경우 base64로 처리
        const base64 = await this.fileToBase64(file);
        this.fileContent = base64;
        previewEl.innerHTML = '<p style="color:#64748b;">PDF 파일이 로드되었습니다. AI가 내용을 분석합니다.</p>';
      }
    } catch (e) {
      console.error('PDF 처리 오류:', e);
      // 오류시 base64로 대체
      const base64 = await this.fileToBase64(file);
      this.fileContent = base64;
      previewEl.innerHTML = '<p style="color:#64748b;">PDF 파일이 로드되었습니다. AI가 내용을 분석합니다.</p>';
    }
  },

  /**
   * 엑셀 파싱 및 미리보기
   */
  async previewExcel(file) {
    const previewEl = document.getElementById('previewContent');
    previewEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 엑셀 파일 파싱 중...';

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          let textContent = '';

          workbook.SheetNames.forEach(sheetName => {
            const ws = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            textContent += `[시트: ${sheetName}]\n`;
            jsonData.forEach(row => {
              if (row.some(cell => cell !== '')) {
                textContent += row.join('\t') + '\n';
              }
            });
            textContent += '\n';
          });

          this.fileContent = textContent.trim();
          previewEl.innerHTML = `<pre style="font-size:11px;line-height:1.6;">${this.escapeHtml(textContent.substring(0, 1500))}${textContent.length > 1500 ? '\n...(생략)' : ''}</pre>`;
        } catch (err) {
          console.error('엑셀 파싱 오류:', err);
          previewEl.innerHTML = '<p style="color:#ef4444;">엑셀 파일 파싱에 실패했습니다.</p>';
        }
        resolve();
      };
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * AI 분석 실행
   */
  async analyze() {
    const apiKey = localStorage.getItem('claudeApiKey');
    if (!apiKey) {
      showToast('Claude API Key를 설정해주세요. (우상단 설정 버튼)', 'warning');
      Settings.openModal();
      return;
    }

    document.getElementById('analyzeBtn').style.display = 'none';
    document.getElementById('aiStatus').style.display = 'block';
    document.getElementById('extractedSchedules').style.display = 'none';

    try {
      const result = await ClaudeAPI.analyzeSchedule(
        this.fileContent,
        this.fileType,
        this.currentFile?.name || ''
      );

      this.extractedData = result;
      this.renderExtractedSchedules(result);

      document.getElementById('aiStatus').style.display = 'none';
      document.getElementById('extractedSchedules').style.display = 'block';
      document.getElementById('addToCalendarBtn').style.display = 'inline-flex';

      showToast(`${result.length}개 일정을 추출했습니다.`, 'success');
    } catch (e) {
      console.error('AI 분석 오류:', e);
      document.getElementById('aiStatus').style.display = 'none';
      document.getElementById('analyzeBtn').style.display = 'inline-flex';

      if (e.message && e.message.includes('401')) {
        showToast('API Key가 유효하지 않습니다. 설정에서 확인해주세요.', 'error');
      } else if (e.message && e.message.includes('429')) {
        showToast('API 사용량 한도에 도달했습니다. 잠시 후 다시 시도하세요.', 'warning');
      } else {
        showToast('AI 분석 중 오류가 발생했습니다: ' + (e.message || '알 수 없는 오류'), 'error');
      }
    }
  },

  /**
   * 추출된 일정 렌더링
   */
  renderExtractedSchedules(schedules) {
    const list = document.getElementById('extractedList');
    list.innerHTML = '';

    if (!schedules || schedules.length === 0) {
      list.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">추출된 일정이 없습니다.</p>';
      return;
    }

    schedules.forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = 'extracted-item';
      item.dataset.idx = idx;

      const catOptions = Object.entries(CATEGORIES)
        .map(([k, v]) => `<option value="${k}" ${s.category === k ? 'selected' : ''}>${v.label}</option>`)
        .join('');

      const dayOptions = DAYS
        .map(d => `<option value="${d}" ${s.day_of_week === d ? 'selected' : ''}>${DAY_LABELS[d]}요일</option>`)
        .join('');

      item.innerHTML = `
        <div class="item-title">
          <span class="category-label cat-label-${s.category || 'new'}">
            <i class="fas ${getCategoryIcon(s.category)}"></i>
            ${getCategoryLabel(s.category)}
          </span>
          <input type="text" value="${this.escapeAttr(s.title)}" placeholder="일정 제목"
            onchange="Uploader.updateExtracted(${idx}, 'title', this.value)"
            style="flex:1;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px;font-weight:600;" />
        </div>
        <div class="item-field">
          <label>구분</label>
          <select onchange="Uploader.updateExtracted(${idx}, 'category', this.value)">
            ${catOptions}
          </select>
        </div>
        <div class="item-field">
          <label>요일</label>
          <select onchange="Uploader.updateExtracted(${idx}, 'day_of_week', this.value)">
            <option value="">미정</option>
            ${dayOptions}
          </select>
        </div>
        <div class="item-field">
          <label>시간</label>
          <input type="text" value="${s.time_start || ''}" placeholder="09:00"
            onchange="Uploader.updateExtracted(${idx}, 'time_start', this.value)"
          />
        </div>
        <div class="item-field">
          <label>장소</label>
          <input type="text" value="${s.location || ''}" placeholder="장소"
            onchange="Uploader.updateExtracted(${idx}, 'location', this.value)"
          />
        </div>
        <div class="item-field">
          <label>참석 인원</label>
          <input type="text" value="${s.participants || ''}" placeholder="참석 인원"
            onchange="Uploader.updateExtracted(${idx}, 'participants', this.value)"
          />
        </div>
        <button class="item-remove" onclick="Uploader.removeExtracted(${idx})" title="제거">
          <i class="fas fa-times"></i>
        </button>
      `;

      list.appendChild(item);
    });
  },

  /**
   * 추출된 일정 수정
   */
  updateExtracted(idx, field, value) {
    if (this.extractedData && this.extractedData[idx]) {
      this.extractedData[idx][field] = value;
      // 카테고리 변경시 뱃지 업데이트
      if (field === 'category') {
        const item = document.querySelector(`.extracted-item[data-idx="${idx}"]`);
        if (item) {
          const badge = item.querySelector('.category-label');
          if (badge) {
            badge.className = `category-label cat-label-${value}`;
            badge.innerHTML = `<i class="fas ${getCategoryIcon(value)}"></i> ${getCategoryLabel(value)}`;
          }
        }
      }
    }
  },

  /**
   * 추출된 일정 제거
   */
  removeExtracted(idx) {
    if (this.extractedData) {
      this.extractedData.splice(idx, 1);
      this.renderExtractedSchedules(this.extractedData);
    }
  },

  /**
   * 캘린더에 추가
   */
  async addToCalendar() {
    if (!this.extractedData || this.extractedData.length === 0) {
      showToast('추가할 일정이 없습니다.', 'warning');
      return;
    }

    const btn = document.getElementById('addToCalendarBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 추가 중...';

    try {
      // 소스 태그 설정
      const sourceMap = { image: 'ai_image', pdf: 'ai_pdf', excel: 'ai_excel' };
      const source = sourceMap[this.fileType] || 'ai_image';
      const withSource = this.extractedData.map(s => ({ ...s, source }));

      await Calendar.addExtractedSchedules(withSource);
      this.closeModal();
    } catch (e) {
      showToast('일정 추가 중 오류가 발생했습니다.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-calendar-check"></i> 캘린더에 추가';
    }
  },

  /**
   * File → base64 변환
   */
  fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
};

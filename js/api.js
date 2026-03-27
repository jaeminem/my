/* =============================
   API 연동 모듈 (Table API + OpenAI GPT)
   ============================= */

const TABLE_NAME = 'schedules';

/* ----- Table REST API ----- */
const API = {
  async getAll(page = 1, limit = 500) {
    try {
      const res = await fetch(`tables/${TABLE_NAME}?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('API 오류');
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.error('getAll error:', e);
      return [];
    }
  },

  async getByWeek(year, weekNumber) {
    try {
      const res = await fetch(`tables/${TABLE_NAME}?limit=500`);
      if (!res.ok) throw new Error('API 오류');
      const data = await res.json();
      return (data.data || []).filter(s =>
        Number(s.year) === Number(year) && Number(s.week_number) === Number(weekNumber)
      );
    } catch (e) {
      console.error('getByWeek error:', e);
      return [];
    }
  },

  async create(schedule) {
    try {
      const res = await fetch(`tables/${TABLE_NAME}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
      if (!res.ok) throw new Error('생성 실패');
      return await res.json();
    } catch (e) {
      console.error('create error:', e);
      throw e;
    }
  },

  async update(id, schedule) {
    try {
      const res = await fetch(`tables/${TABLE_NAME}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
      if (!res.ok) throw new Error('수정 실패');
      return await res.json();
    } catch (e) {
      console.error('update error:', e);
      throw e;
    }
  },

  async delete(id) {
    try {
      const res = await fetch(`tables/${TABLE_NAME}/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('삭제 실패');
      return true;
    } catch (e) {
      console.error('delete error:', e);
      throw e;
    }
  },

  async bulkCreate(schedules) {
    const results = [];
    for (const s of schedules) {
      try {
        const r = await this.create(s);
        results.push(r);
      } catch (e) {
        console.error('bulk create error:', s, e);
      }
    }
    return results;
  }
};

/* ----- OpenAI GPT API ----- */
const GPT_API = {
  async analyzeSchedule(content, fileType, fileName) {
    const apiKey = localStorage.getItem('openaiApiKey');

    if (!apiKey) throw new Error('OpenAI API Key가 설정되지 않았습니다.');

    const systemPrompt = `당신은 업무 일정 분석 전문가입니다.
주어진 파일에서 업무 일정 정보를 추출하여 반드시 JSON 배열로만 응답하세요.`;

    const userPrompt = `다음 파일(${fileName})에서 모든 업무 일정을 추출해주세요.\n\n${content}`;

    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2000
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API 오류 ${response.status}: ${err.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || '[]';

    return this.parseScheduleJSON(text);
  },

  parseScheduleJSON(text) {
    try {
      let cleaned = text.trim();
      cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');

      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }

      return JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON 파싱 오류:', e, '\n원본:', text);
      return [];
    }
  }
};
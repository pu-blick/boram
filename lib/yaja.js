// 2학년부 공용 업무 시트의 야자감독 탭(달력 모양 표)을 날짜별 감독 정보로 바꾼다.
//
// 표 모양:
//   "8월"  (월 제목)
//   월 | 화 | 수 | 목          (요일 줄)
//   11 | 12 | 13 | 14          (날짜 줄)
//   김OO | 이OO | 수 | 학      (이름 줄 — 행사는 여러 칸에 쪼개 적기도 함)
// 오른쪽 "횟수" 표의 교사 이름으로 사람과 행사를 구분한다.

const WEEKDAYS = ['월', '화', '수', '목'];

// 따옴표 안 줄바꿈까지 처리하고, 빈 줄도 지우지 않는다(표 위치가 중요해서).
export function parseCsvGrid(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
            else quoted = !quoted;
        } else if (ch === ',' && !quoted) {
            row.push(cell); cell = '';
        } else if ((ch === '\n' || ch === '\r') && !quoted) {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); rows.push(row); row = []; cell = '';
        } else {
            cell += ch;
        }
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
}

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

// 쪼개 적은 행사(수|학|여행, 1회|고|사)를 한 이름으로 합친다. 띄어쓰기가 있는 칸은 독립 행사로 본다.
function mergeFragments(cells) {
    const result = cells.map((c) => ({ ...c }));
    let i = 0;
    while (i < result.length) {
        if (result[i].kind !== 'event') { i++; continue; }
        let j = i;
        while (j + 1 < result.length && result[j + 1].kind === 'event') j++;
        const run = result.slice(i, j + 1);
        const pieces = run.map((c) => c.text);
        const looksSplit = run.length > 1 && pieces.every((p) => !p.includes(' ')) && pieces.some((p) => p.length === 1);
        if (looksSplit) {
            const joined = pieces.join('');
            for (let k = i; k <= j; k++) result[k].text = joined;
        }
        i = j + 1;
    }
    return result;
}

// 반환: { 'YYYY-M-D': { type: 'teacher'|'event'|'none', text } }
export function parseSupervisionSheet(text) {
    const rows = parseCsvGrid(text);
    const at = (r, c) => clean((rows[r] || [])[c]);

    const titleYear = (() => {
        for (const row of rows) for (const cell of row) {
            const m = clean(cell).match(/(\d{4})학년도/);
            if (m) return Number(m[1]);
        }
        return new Date().getFullYear();
    })();

    // 오른쪽 "횟수" 표: 이름 칸 옆에 숫자가 있으면 교사로 본다.
    const teachers = new Set();
    rows.forEach((row, r) => row.forEach((cell, c) => {
        const name = clean(cell);
        if (/^[가-힣]{2,4}$/.test(name) && /^\d+$/.test(at(r, c + 1))) teachers.add(name);
    }));

    const schedule = {};
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            const monthMatch = at(r, c).match(/^(\d{1,2})월$/);
            if (!monthMatch || at(r + 1, c) !== '월') continue;
            const month = Number(monthMatch[1]);
            const year = month >= 3 ? titleYear : titleYear + 1;

            for (let dr = r + 2; dr < rows.length; dr += 2) {
                const dates = WEEKDAYS.map((_, k) => at(dr, c + k));
                if (!dates.some((d) => /^\d{1,2}$/.test(d))) break;

                const week = WEEKDAYS.map((_, k) => {
                    const day = /^\d{1,2}$/.test(dates[k]) ? Number(dates[k]) : null;
                    const text = at(dr + 1, c + k);
                    const kind = !text ? 'none' : teachers.has(text) ? 'teacher' : 'event';
                    return { day, text, kind };
                });
                for (const cell of mergeFragments(week)) {
                    if (cell.day === null) continue;
                    schedule[`${year}-${month}-${cell.day}`] = { type: cell.kind, text: cell.text };
                }
            }
        }
    }
    return schedule;
}

// 금·토·일에는 다음 주를 보여준다. 반환: [{ date, label }] 월~목 4일
export function getSupervisionWeek(today = new Date()) {
    const day = today.getDay();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const offset = day === 0 ? 1 : day >= 5 ? 8 - day : 1 - day;
    monday.setDate(monday.getDate() + offset);
    return WEEKDAYS.map((label, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return { date, label };
    });
}

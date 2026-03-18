// 생활지도 통합관리 - Google Sheets 데이터 fetch

export const SHEET_IDS = {
    1: '1eaadIs8FXoSOF8V9TYA6CPTMiy2W6M5rxwHf_cA0FmY',
    2: '1VYtMgdqQ2xT5lzPdYoe_CQh5JjTuhIWqRIZvdy1AMec',
    3: '11u9kA9FauYmo61TSjAqhPs58gs08Ox34uNnRdVSpQFI'
};

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else current += char;
    }
    result.push(current.trim());
    return result;
}

export async function fetchAllStudentData(selectedGrade) {
    const allStudents = [];
    const loadedSheets = [];

    const configs = [
        { grade: 1, maxClass: 12 },
        { grade: 2, maxClass: 10 },
        { grade: 3, maxClass: 12 }
    ];

    const config = configs.find(c => c.grade === selectedGrade);
    const spreadId = SHEET_IDS[selectedGrade];
    if (!config || !spreadId) return { students: [], allStudents: [], loadedSheets: [] };
    const everyStudent = [];

    for (let i = 1; i <= config.maxClass; i++) {
        const name = `${config.grade}-${i}`;
        try {
            const url = `https://docs.google.com/spreadsheets/d/${spreadId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
            const response = await fetch(url);
            if (!response.ok) continue;

            let csvText = await response.text();
            if (csvText.includes('<!DOCTYPE html>')) continue;

            csvText = csvText.replace(/^\uFEFF/, '').trim();
            const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
            if (lines.length <= 1) continue;

            lines.slice(1).forEach(line => {
                const cols = parseCSVLine(line).map(c => c.replace(/^"|"$/g, '').trim());
                const id = cols[0];
                const studentName = cols[1];
                if (!id || !studentName || isNaN(Number(id))) return;

                const records = [];
                [{ start: 2, cycle: 1 }, { start: 6, cycle: 2 }, { start: 10, cycle: 3 }, { start: 14, cycle: 4 }].forEach(m => {
                    for (let s = 1; s <= 4; s++) {
                        const val = cols[m.start + (s - 1)];
                        if (val && val !== '' && val !== 'null' && val.length >= 2) {
                            records.push({
                                date: val,
                                reason: s === 4 ? `${m.cycle}차 선도위원회` : s === 3 ? `${m.cycle}차 주의대상` : `${m.cycle}차 ${s}회 기록`,
                                cycle: m.cycle,
                                session: s
                            });
                        }
                    }
                });

                everyStudent.push({ id, name: studentName, class: `${config.grade}-${i}반`, records });
                if (records.length > 0) {
                    allStudents.push({ id, name: studentName, class: `${config.grade}-${i}반`, records });
                }
            });
            loadedSheets.push(`${config.grade}-${i}반`);
        } catch (err) {
            console.error(`${config.grade}-${i} 로드 실패:`, err);
        }
    }

    return {
        students: allStudents.sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }) || a.id.localeCompare(b.id)),
        allStudents: everyStudent.sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }) || a.id.localeCompare(b.id)),
        loadedSheets: loadedSheets.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    };
}

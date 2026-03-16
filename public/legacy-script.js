// ===== Firebase Setup (using compat SDK from CDN) =====
// Firebase compat SDK is loaded via script tags in the page
(function() {
    // Check if Firebase is already initialized
    if (firebase.apps && firebase.apps.length > 0) {
        // Already initialized, just get references
    } else if (window.__FIREBASE_CONFIG__) {
        firebase.initializeApp(window.__FIREBASE_CONFIG__);
    }

    const db = firebase.database();
    const currentUser = firebase.auth().currentUser;
    const uid = currentUser ? currentUser.uid : 'anonymous';
    const draftRef = db.ref('userdata/' + uid + '/draft');
    const memosRef = db.ref('userdata/' + uid + '/memos');
    const pinnedRef = db.ref('userdata/' + uid + '/pinned');

    let savedRange = null;
    let saveTimer = null;
    let pinnedMemoDate = null;
    let wasSwiping = false;
    let cachedMemos = [];

    // Sanitize HTML to prevent XSS attacks
    function sanitizeHtml(html) {
        if (!html) return '';
        var temp = document.createElement('div');
        temp.innerHTML = html;
        // Remove dangerous elements
        var dangerous = temp.querySelectorAll('script,iframe,object,embed,form,link,style,meta,base,svg');
        dangerous.forEach(function(el) { el.remove(); });
        // Remove event handler attributes from all elements
        temp.querySelectorAll('*').forEach(function(el) {
            Array.from(el.attributes).forEach(function(attr) {
                if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
                    el.removeAttribute(attr.name);
                }
            });
        });
        return temp.innerHTML;
    }

    function saveSelection() {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            savedRange = sel.getRangeAt(0).cloneRange();
        }
    }

    function restoreSelection() {
        if (savedRange) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
        }
    }

    function restoreCheckboxState(container) {
        container.querySelectorAll('.memo-checkbox').forEach(function(cb) {
            if (cb.hasAttribute('checked')) {
                cb.checked = true;
                if (cb.parentElement) cb.parentElement.classList.add('memo-line-checked');
            }
        });
    }

    function syncCheckboxes() {
        const pad = document.getElementById('memoPad');
        if (!pad) return;
        pad.querySelectorAll('.memo-checkbox').forEach(function(cb) {
            if (cb.checked) {
                cb.setAttribute('checked', 'checked');
            } else {
                cb.removeAttribute('checked');
            }
        });
    }

    function saveDraft() {
        syncCheckboxes();
        const pad = document.getElementById('memoPad');
        if (!pad) return;
        const content = pad.innerHTML;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function() {
            draftRef.set(content);
        }, 500);
    }

    function initAutosave() {
        const pad = document.getElementById('memoPad');
        if (!pad) return;
        pad.addEventListener('input', function() { saveDraft(); });
        document.addEventListener('selectionchange', function() {
            if (document.activeElement === pad) saveSelection();
        });
        pad.addEventListener('click', function(e) {
            if (e.target.classList.contains('memo-checkbox')) {
                setTimeout(function() {
                    const line = e.target.parentElement;
                    if (e.target.checked) {
                        line.classList.add('memo-line-checked');
                    } else {
                        line.classList.remove('memo-line-checked');
                    }
                    saveDraft();
                }, 10);
            }
        });
    }

    function listenDraft() {
        const pad = document.getElementById('memoPad');
        if (!pad) return;
        let skipFirstDraft = false;

        pinnedRef.once('value', function(snap) {
            const pinned = snap.val();
            if (pinned && pinned.content) {
                skipFirstDraft = true;
                pinnedMemoDate = pinned.date || null;
                pad.innerHTML = sanitizeHtml(pinned.content);
                const titleInput = document.getElementById('memoTitleInput');
                if (titleInput) titleInput.value = pinned.title || '';
                restoreCheckboxState(pad);
            }
            draftRef.on('value', function(snapshot) {
                const content = snapshot.val();
                if (document.activeElement === pad) return;
                if (skipFirstDraft) { skipFirstDraft = false; return; }
                if (content !== null) {
                    pad.innerHTML = sanitizeHtml(content);
                    restoreCheckboxState(pad);
                }
            });
        });

        pinnedRef.on('value', function(snap) {
            const pinned = snap.val();
            const newDate = pinned ? pinned.date : null;
            if (newDate !== pinnedMemoDate) {
                pinnedMemoDate = newDate;
                if (cachedMemos.length > 0) renderMemoList(cachedMemos);
            }
        });
    }

    // Expose functions to window for onclick handlers and React component
    window.newMemo = function() {
        const pad = document.getElementById('memoPad');
        const titleInput = document.getElementById('memoTitleInput');
        if (pad) pad.innerHTML = '';
        if (titleInput) titleInput.value = '';
        draftRef.set('');
        if (pad) pad.focus();
    };

    window.insertCheckbox = function() {
        const pad = document.getElementById('memoPad');
        if (!pad) return;
        pad.focus();
        const line = document.createElement('div');
        line.innerHTML = '<input type="checkbox" class="memo-checkbox">&nbsp;';
        const sel = window.getSelection();
        if (sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(line);
            range.setStartAfter(line);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        } else {
            pad.appendChild(line);
        }
        saveDraft();
    };

    window.toggleBold = function() {
        restoreSelection();
        document.execCommand('bold', false, null);
        saveDraft();
    };

    window.toggleColorPicker = function() {
        const picker = document.getElementById('colorPicker');
        if (picker) picker.classList.toggle('open');
    };

    window.applyColor = function(color) {
        restoreSelection();
        document.execCommand('foreColor', false, color);
        saveDraft();
        const picker = document.getElementById('colorPicker');
        if (picker) picker.classList.remove('open');
    };

    document.addEventListener('click', function(e) {
        const picker = document.getElementById('colorPicker');
        if (picker && !e.target.closest('.color-picker-wrap')) {
            picker.classList.remove('open');
        }
    });

    window.saveAsMemo = function() {
        const pad = document.getElementById('memoPad');
        const titleInput = document.getElementById('memoTitleInput');
        if (!pad || !titleInput) return;
        const title = titleInput.value.trim();
        const content = pad.innerHTML.trim();
        if (!title) {
            titleInput.focus();
            titleInput.style.borderColor = '#ef4444';
            setTimeout(() => { titleInput.style.borderColor = ''; }, 1500);
            return;
        }
        if (!content || content === '<br>') { pad.focus(); return; }
        const memo = {
            title: title, content: content,
            preview: pad.textContent.substring(0, 60),
            date: new Date().toISOString()
        };
        memosRef.once('value', function(snapshot) {
            const memos = snapshot.val() || [];
            memos.unshift(memo);
            memosRef.set(memos);
        });
        showToast('저장되었습니다', '#d4a017');
        titleInput.value = '';
        pad.innerHTML = '';
        draftRef.set('');
    };

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return m + '/' + day + ' ' + h + ':' + min;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderMemoCard(memo, i) {
        const isPinned = pinnedMemoDate && pinnedMemoDate === memo.date;
        return '<div class="memo-swipe-wrap">' +
            '<div class="memo-swipe-action"><span class="material-symbols-rounded">push_pin</span> 상시알림지정</div>' +
            '<div class="saved-memo-card ' + (isPinned ? 'pinned' : '') + '" data-index="' + i + '">' +
            '<span class="saved-memo-card-title" onclick="openSavedMemo(' + i + ')">' + escapeHtml(memo.title) + '</span>' +
            '<div class="saved-memo-card-right">' +
            (isPinned ? '<span class="pin-badge"><span class="material-symbols-rounded">push_pin</span></span>' : '') +
            '<button class="alarm-bell ' + (memo.alarm ? 'on' : '') + '" onclick="toggleAlarm(' + i + ')" title="알림"><span class="material-symbols-rounded">' + (memo.alarm ? 'notifications_active' : 'notifications_none') + '</span></button>' +
            '<span class="saved-memo-card-date" onclick="openSavedMemo(' + i + ')">' + formatDate(memo.date) + '</span>' +
            '<button class="memo-delete-btn" onclick="deleteMemo(' + i + ')" title="삭제"><span class="material-symbols-rounded">close</span></button>' +
            '</div></div></div>' +
            (memo.alarmEditing ? '<div class="alarm-input-row"><input type="text" class="alarm-name-input" id="alarmInput' + i + '" placeholder="알림명을 입력하세요" value="' + escapeHtml(memo.alarmName || '') + '" /><button class="alarm-save-btn" onclick="saveAlarm(' + i + ')">확인</button></div>' : '');
    }

    function renderMemoList(memos) {
        const container = document.getElementById('savedMemos');
        if (!container) return;
        if (!memos || memos.length === 0) {
            container.innerHTML = '';
            updateAlarmTicker();
            return;
        }
        container.innerHTML = memos.map(function(memo, i) { return renderMemoCard(memo, i); }).join('');
        updateAlarmTicker();
    }

    function listenMemos() {
        memosRef.on('value', function(snapshot) {
            cachedMemos = snapshot.val() || [];
            renderMemoList(cachedMemos);
        });
    }

    window.searchMemos = function() {
        const input = document.getElementById('memoSearch');
        const container = document.getElementById('savedMemos');
        if (!input || !container) return;
        const query = input.value.trim().toLowerCase();
        const filtered = cachedMemos.map(function(memo, i) { return { memo: memo, i: i }; })
            .filter(function(item) {
                return !query || item.memo.title.toLowerCase().includes(query) || item.memo.preview.toLowerCase().includes(query);
            });
        if (filtered.length === 0) {
            container.innerHTML = query ? '<div style="padding:12px;text-align:center;color:var(--text-secondary);font-size:13px;">검색 결과가 없습니다</div>' : '';
            return;
        }
        container.innerHTML = filtered.map(function(item) { return renderMemoCard(item.memo, item.i); }).join('');
    };

    window.toggleAlarm = function(index) {
        const memo = cachedMemos[index];
        if (!memo) return;
        if (memo.alarm) {
            memo.alarm = false; memo.alarmName = ''; memo.alarmEditing = false;
        } else {
            memo.alarmEditing = true;
        }
        memosRef.set(cachedMemos);
    };

    window.saveAlarm = function(index) {
        const input = document.getElementById('alarmInput' + index);
        const name = input ? input.value.trim() : '';
        if (!name) {
            if (input) { input.focus(); input.style.borderColor = '#ef4444'; setTimeout(function() { input.style.borderColor = ''; }, 1000); }
            return;
        }
        cachedMemos[index].alarm = true;
        cachedMemos[index].alarmName = name;
        cachedMemos[index].alarmEditing = false;
        memosRef.set(cachedMemos);
    };

    const ALARM_COLORS = [
        { bg: '#fff3cd', color: '#b8860b' }, { bg: '#d1ecf1', color: '#0c5460' },
        { bg: '#f8d7da', color: '#842029' }, { bg: '#d4edda', color: '#155724' },
        { bg: '#e2d9f3', color: '#5a3d8a' }, { bg: '#fde2e4', color: '#c9184a' },
        { bg: '#d0f4de', color: '#1b7a3d' },
    ];

    function updateAlarmTicker() {
        const ticker = document.getElementById('alarmTickerHeader');
        if (!ticker) return;
        const alarms = cachedMemos.map(function(memo, i) { return { memo: memo, i: i }; })
            .filter(function(item) { return item.memo.alarm && item.memo.alarmName; });
        if (alarms.length === 0) { ticker.innerHTML = ''; return; }
        ticker.innerHTML = alarms.map(function(item, idx) {
            const c = ALARM_COLORS[idx % ALARM_COLORS.length];
            return '<span class="alarm-tag" style="background:' + c.bg + ';color:' + c.color + '" onclick="openSavedMemo(' + item.i + ')"><span class="material-symbols-rounded" style="font-size:14px;margin-right:3px;">notifications_active</span>' + escapeHtml(item.memo.alarmName) + '</span>';
        }).join('');
    }

    window.deleteMemo = function(index) {
        if (!confirm('이 메모를 삭제하시겠습니까?')) return;
        const memo = cachedMemos[index];
        if (memo && pinnedMemoDate === memo.date) { pinnedRef.set(null); pinnedMemoDate = null; }
        cachedMemos.splice(index, 1);
        memosRef.set(cachedMemos);
    };

    function setPinnedMemo(index) {
        const memo = cachedMemos[index];
        if (!memo) return;
        if (pinnedMemoDate === memo.date) { pinnedRef.set(null); }
        else { pinnedRef.set({ title: memo.title, content: memo.content, date: memo.date }); }
    }

    window.openSavedMemo = function(index) {
        if (wasSwiping) { wasSwiping = false; return; }
        const memo = cachedMemos[index];
        if (!memo) return;
        const pad = document.getElementById('memoPad');
        const titleInput = document.getElementById('memoTitleInput');
        if (pad) pad.innerHTML = sanitizeHtml(memo.content);
        if (titleInput) titleInput.value = memo.title;
        draftRef.set(memo.content);
        const postit = document.querySelector('.postit');
        if (postit) postit.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Swipe
    let swipeState = { active: false, card: null, startX: 0, currentX: 0 };

    function initSwipe() {
        const container = document.getElementById('savedMemos');
        if (!container) return;
        container.addEventListener('touchstart', function(e) {
            const card = e.target.closest('.saved-memo-card');
            if (!card || !card.dataset.index || e.target.closest('button')) return;
            swipeState = { active: true, card: card, startX: e.touches[0].clientX, currentX: e.touches[0].clientX };
            card.style.transition = 'none';
        });
        container.addEventListener('touchmove', function(e) {
            if (!swipeState.active) return;
            swipeState.currentX = e.touches[0].clientX;
            const dx = swipeState.currentX - swipeState.startX;
            if (dx > 10) { swipeState.card.style.transform = 'translateX(' + Math.min(dx, 150) + 'px)'; e.preventDefault(); }
        }, { passive: false });
        container.addEventListener('touchend', handleSwipeEnd);
        container.addEventListener('mousedown', function(e) {
            const card = e.target.closest('.saved-memo-card');
            if (!card || !card.dataset.index || e.target.closest('button')) return;
            swipeState = { active: true, card: card, startX: e.clientX, currentX: e.clientX };
            card.style.transition = 'none';
        });
        document.addEventListener('mousemove', function(e) {
            if (!swipeState.active) return;
            swipeState.currentX = e.clientX;
            const dx = swipeState.currentX - swipeState.startX;
            if (dx > 0) { swipeState.card.style.transform = 'translateX(' + Math.min(dx, 150) + 'px)'; }
        });
        document.addEventListener('mouseup', handleSwipeEnd);
    }

    function handleSwipeEnd() {
        if (!swipeState.active) return;
        const card = swipeState.card;
        const dx = swipeState.currentX - swipeState.startX;
        wasSwiping = dx > 10;
        card.style.transition = 'transform 0.2s';
        card.style.transform = '';
        swipeState.active = false;
        if (dx > 80) {
            const index = parseInt(card.dataset.index);
            const memo = cachedMemos[index];
            if (!memo) return;
            if (pinnedMemoDate === memo.date) {
                if (confirm('상시알림을 해제하시겠습니까?')) { setPinnedMemo(index); showToast('상시알림이 해제되었습니다', '#64748b'); }
            } else {
                if (confirm('이 메모를 상시알림으로 지정하시겠습니까?')) { setPinnedMemo(index); showToast('상시알림으로 지정되었습니다', '#3b82f6'); }
            }
        }
    }

    function showToast(message, bgColor) {
        let toast = document.getElementById('saveToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'saveToast';
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);color:white;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:999;opacity:0;transition:opacity 0.3s;';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.background = bgColor || '#d4a017';
        toast.style.opacity = '1';
        setTimeout(function() { toast.style.opacity = '0'; }, 1500);
    }

    // Initialize immediately (DOM is already ready when this script loads)
    listenDraft();
    initAutosave();
    listenMemos();
    initSwipe();
})();

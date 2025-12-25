document.addEventListener('DOMContentLoaded', function () {
    const tagsInput = document.getElementById('tags');
    const opinionInput = document.getElementById('opinion');
    const saveBtn = document.getElementById('save-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const downloadBtn = document.getElementById('download-btn');
    const notesList = document.getElementById('notes-list');
    const filterInfo = document.getElementById('filter-info');
    let currentFilter = null; // string or null

    // YouTube 메타정보를 탭에서 추출 (Promise 반환)
    function getYouTubeMeta(tabId){
        return new Promise((resolve) => {
            try {
                chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => {
                        function getMeta(sel){ const e = document.querySelector(sel); return e ? e.getAttribute('content') : null; }
                        let title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title || null;
                        // 제목 앞의 (숫자) 패턴 제거
                        if(title && /^\s*\(\d+\)\s*/.test(title)){
                            title = title.replace(/^\s*\(\d+\)\s*/, '').trim();
                        }
                        let published = getMeta('meta[itemprop="datePublished"]') || getMeta('meta[itemprop="uploadDate"]') || getMeta('meta[name="date"]') || null;
                        if(!published){
                            // JSON-LD에서 추출 시도
                            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                            for(const s of scripts){
                                try {
                                    const j = JSON.parse(s.textContent);
                                    if(j){
                                        if(Array.isArray(j)){
                                            for(const o of j){ if(o && o.datePublished){ published = o.datePublished; break; } }
                                        } else if(j.datePublished){
                                            published = j.datePublished;
                                        } else if(j.uploadDate){
                                            published = j.uploadDate;
                                        }
                                    }
                                } catch(e){}
                                if(published) break;
                            }
                        }
                        return { title, published };
                    }
                }, (results) => {
                    if (chrome.runtime.lastError || !results || !results[0]) return resolve(null);
                    resolve(results[0].result || null);
                });
            } catch (e) { resolve(null); }
        });
    }

    // 노트 저장
    saveBtn.addEventListener('click', async function () {
        const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        const opinion = opinionInput.value.trim();
        if (tags.length === 0 && !opinion) {
            alert('태그나 의견을 입력하세요.');
            return;
        }
        const note = {
            tags,
            opinion,
            time: Date.now(),
            url: '',
            youtubeTitle: '',
            youtubePublished: ''
        };
        // 현재 탭의 URL 및 YouTube 메타정보 가져오기
        chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
            const tab = tabs[0];
            if (tab && tab.url) {
                note.url = tab.url;
            }
            // YouTube 메타 시도
            if (tab && tab.id) {
                const info = await getYouTubeMeta(tab.id);
                if (info) {
                    if (info.title) note.youtubeTitle = info.title;
                    if (info.published) note.youtubePublished = info.published;
                }
            }
            chrome.storage.local.get({notes: []}, function(result) {
                const notes = result.notes || [];
                notes.unshift(note); // 최신순
                chrome.storage.local.set({notes}, function() {
                    tagsInput.value = '';
                    opinionInput.value = '';
                    // merge tags into sync storage for quick reuse
                    chrome.storage.sync.get({tags:[]}, function(sres){
                        const existing = sres.tags || [];
                        const merged = Array.from(new Set([].concat(existing, tags)));
                        chrome.storage.sync.set({tags: merged}, function(){
                            renderNotes();
                            renderTagList();
                        });
                    });
                });
            });
        });
    });

    // 수동 새로고침 버튼
    if (refreshBtn) refreshBtn.addEventListener('click', renderNotes);

    // CSV 다운로드
    if (downloadBtn) downloadBtn.addEventListener('click', function () {
        chrome.storage.local.get({notes: []}, function(result) {
            const notes = result.notes || [];
            if (notes.length === 0) {
                alert('저장된 노트가 없습니다.');
                return;
            }
            // CSV 생성 (UTF-8 BOM 포함)
            function esc(field){
                if (field == null) return '';
                const s = String(field);
                if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
                    return '"' + s.replace(/"/g, '""') + '"';
                }
                return s;
            }
            const header = ['입력시간','유튜브 제목','유튜브 생성시간','태그','의견','URL'];
            const rows = notes.map(n => [
                new Date(n.time).toISOString(),
                n.youtubeTitle || '',
                n.youtubePublished || '',
                (n.tags||[]).join(','),
                n.opinion||'',
                n.url||''
            ]);
            const lines = [header.map(esc).join(',')].concat(rows.map(r => r.map(esc).join(',')));
            const csvContent = '\uFEFF' + lines.join('\r\n');
            const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'youtube_notes.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    // 노트 리스트 렌더링 (필터 지원)
    function renderNotes() {
        chrome.storage.local.get({notes: []}, function(result) {
            const notes = result.notes || [];
            let filtered = notes;
            if (currentFilter) {
                filtered = notes.filter(n => (n.tags||[]).includes(currentFilter));
            }
            if (filtered.length === 0) {
                notesList.innerHTML = '<div>저장된 노트가 없습니다.</div>';
                updateFilterInfo();
                return;
            }
            notesList.innerHTML = filtered.map(note => {
                const tagsHtml = (note.tags||[]).map(t => `<button class="note-tag" data-tag="${encodeURIComponent(t)}">${t}</button>`).join(' ');
                const titleHtml = note.youtubeTitle ? `<div style="font-weight:600;margin-bottom:4px;">${note.youtubeTitle}</div>` : '';
                const publishedDisplay = note.youtubePublished ? (isNaN(Date.parse(note.youtubePublished)) ? note.youtubePublished : new Date(note.youtubePublished).toLocaleString()) : '';
                const metaLine = `${note.url ? `<a href="${note.url}" target="_blank">링크</a> | ` : ''}${publishedDisplay ? `게시: ${publishedDisplay} | ` : ''}${new Date(note.time).toLocaleString()}`;
                return `
                <div class="note-item">
                    ${titleHtml}
                    <div class="note-tags">${tagsHtml}</div>
                    <div class="opinion">${note.opinion ? note.opinion : ''}</div>
                    <div style="font-size:0.8em;color:#888;">${metaLine}</div>
                </div>
            `;
            }).join('');

            // attach tag click handlers to filter
            notesList.querySelectorAll('.note-tag').forEach(btn => {
                btn.addEventListener('click', function(e){
                    e.stopPropagation();
                    const tag = decodeURIComponent(this.getAttribute('data-tag'));
                    currentFilter = tag;
                    renderNotes();
                });
            });
            updateFilterInfo();
        });
    }

    function updateFilterInfo(){
        if(!filterInfo) return;
        if(currentFilter){
            filterInfo.innerHTML = `필터: <strong>#${currentFilter}</strong> <button id="clear-filter" style="margin-left:8px">필터 해제</button>`;
            const btn = document.getElementById('clear-filter');
            if(btn) btn.addEventListener('click', function(){ currentFilter = null; renderNotes(); });
        } else {
            filterInfo.innerHTML = '';
        }
    }

    renderNotes();
    renderTagList();

    // 렌더링된 태그 목록을 불러와 표시하고 클릭시 태그 입력에 추가
    function renderTagList(){
        const container = document.getElementById('tag-list');
        if(!container) return;
        chrome.storage.sync.get({tags:[]}, function(result){
            let tags = result.tags || [];
            if(!tags || tags.length === 0){
                // fallback: derive from saved notes
                chrome.storage.local.get({notes:[]}, function(r){
                    const notes = r.notes || [];
                    const set = new Set();
                    notes.forEach(n => (n.tags||[]).forEach(t=> set.add(t)));
                    tags = Array.from(set);
                    renderTagButtons(container, tags);
                });
            } else {
                renderTagButtons(container, tags);
            }
        });

        function renderTagButtons(container, tags){
            if(!tags || tags.length === 0){ container.innerHTML = ''; return; }
            container.innerHTML = tags.map(t=> `<button class="tag-pill" data-tag="${encodeURIComponent(t)}">${t}</button>`).join(' ');
            container.querySelectorAll('.tag-pill').forEach(btn=>{
                btn.addEventListener('click', function(e){
                    const tag = decodeURIComponent(this.getAttribute('data-tag'));
                    const current = tagsInput.value.split(',').map(s=>s.trim()).filter(s=>s);
                    if(!current.includes(tag)){
                        current.push(tag);
                        tagsInput.value = current.join(', ');
                    }
                });
            });
        }
    }
});

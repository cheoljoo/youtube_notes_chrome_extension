document.addEventListener('DOMContentLoaded', function () {
    const tagsInput = document.getElementById('tags');
    const opinionInput = document.getElementById('opinion');
    const saveBtn = document.getElementById('save-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const downloadBtn = document.getElementById('download-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const syncBtn = document.getElementById('sync-btn');
    const syncStatus = document.getElementById('sync-status');
    const notesList = document.getElementById('notes-list');
    const filterInfo = document.getElementById('filter-info');
    const filterTags = document.getElementById('filter-tags');
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
            alert('Please enter tags or opinion.');
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
                chrome.storage.local.set({notes}, async function() {
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
                    
                    // Auto-sync to Supabase after saving
                    await autoSyncToSupabase(note);
                });
            });
        });
    });

    // 수동 새로고침 버튼
    if (refreshBtn) refreshBtn.addEventListener('click', function(){
        renderNotes();
        renderFilterTags();
    });

    // 옵션 페이지 열기
    if (settingsBtn) settingsBtn.addEventListener('click', function(){
        try {
            chrome.runtime.openOptionsPage();
        } catch (e) {
            debugError('Failed to open options page', e);
        }
    });

    // Sync 버튼 - 양방향 동기화
    if (syncBtn) syncBtn.addEventListener('click', async function(){
        debugLog('=== Sync button clicked ===');
            try {
                const syncUserId = await getUserIdentifier();
                debugLog(`Sync user id: ${syncUserId}`);
            } catch(e) {
                debugWarning('Could not resolve user identifier before sync');
            }
        syncBtn.disabled = true;
        syncBtn.textContent = 'Syncing...';
        syncStatus.textContent = 'Synchronizing with Supabase...';
        syncStatus.style.color = '#666';
        
        try {
            debugLog('Calling fullSync()...');
            const result = await fullSync();
            debugSuccess(`Sync result: ${result.message}`);
            syncStatus.textContent = result.message;
            syncStatus.style.color = 'green';
            debugLog('Refreshing UI...');
            renderNotes();
            renderTagList();
            renderFilterTags();
            debugLog('UI refresh complete');
        } catch (e) {
            debugError('Sync failed', e);
            syncStatus.textContent = 'Sync failed: ' + e.message;
            syncStatus.style.color = 'red';
        } finally {
            syncBtn.disabled = false;
            syncBtn.textContent = '⇅ Sync';
            setTimeout(() => { syncStatus.textContent = ''; }, 5000);
        }
    });

    // 자동 동기화 함수 (저장 시)
    async function autoSyncToSupabase(note) {
        debugLog('Auto-sync triggered for new note');
        try {
            const settings = await chrome.storage.sync.get({supabase_url: '', supabase_key: ''});
            if (!settings.supabase_url || !settings.supabase_key) {
                debugWarning('Supabase not configured, skipping auto-sync');
                return; // Supabase not configured
            }
            
            debugLog('Getting user info for auto-sync...');
            const userEmail = await getUserIdentifier();
                debugLog(`Auto-sync user id: ${userEmail}`);
            debugLog('Getting Supabase client...');
            const client = await getSupabaseClient();
            debugLog('Saving note to Supabase...');
            await client.saveNote(note, userEmail);
            debugSuccess('Auto-sync successful');
            if (syncStatus) {
                syncStatus.textContent = '✓ Synced to cloud';
                syncStatus.style.color = 'green';
                setTimeout(() => { syncStatus.textContent = ''; }, 2000);
            }
        } catch (e) {
            debugError('Auto-sync failed', e);
            if (e.message.includes('로그인')) {
                syncStatus.textContent = '⚠ Google 로그인 필요';
                syncStatus.style.color = 'orange';
            }
            // Silent fail for auto-sync
        }
    }

    // CSV 다운로드
    if (downloadBtn) downloadBtn.addEventListener('click', function () {
        chrome.storage.local.get({notes: []}, function(result) {
            const notes = result.notes || [];
            if (notes.length === 0) {
                alert('No notes to download.');
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
            const header = ['Created Time','YouTube Title','Published Time','Tags','Opinion','URL'];
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
                notesList.innerHTML = '<div>No notes saved.</div>';
                updateFilterInfo();
                return;
            }
            notesList.innerHTML = filtered.map(note => {
                const tagsHtml = (note.tags||[]).map(t => `<button class="note-tag" data-tag="${encodeURIComponent(t)}">${t}</button>`).join(' ');
                const titleHtml = note.youtubeTitle ? `<div style="font-weight:600;margin-bottom:4px;">${note.youtubeTitle}</div>` : '';
                const publishedDisplay = note.youtubePublished ? (isNaN(Date.parse(note.youtubePublished)) ? note.youtubePublished : new Date(note.youtubePublished).toLocaleString('en-US')) : '';
                const metaLine = `${note.url ? `<a href="${note.url}" target="_blank">Link</a> | ` : ''}${publishedDisplay ? `Published: ${publishedDisplay} | ` : ''}Created: ${new Date(note.time).toLocaleString('en-US')}`;
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
                    renderFilterTags();
                });
            });
            updateFilterInfo();
        });
    }

    function updateFilterInfo(){
        if(!filterInfo) return;
        if(currentFilter){
            filterInfo.innerHTML = `Filter: <strong>#${currentFilter}</strong> <button id="clear-filter" style="margin-left:8px">Clear Filter</button>`;
            const btn = document.getElementById('clear-filter');
            if(btn) btn.addEventListener('click', function(){ currentFilter = null; renderNotes(); });
        } else {
            filterInfo.innerHTML = '';
        }
    }

    renderNotes();
    renderTagList();
    renderFilterTags();

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

    // 태그로 바로 필터링할 수 있는 목록 표시
    function renderFilterTags(){
        if(!filterTags) return;
        chrome.storage.local.get({notes:[]}, function(r){
            const set = new Set();
            (r.notes || []).forEach(n => (n.tags||[]).forEach(t=> set.add(t)));
            const tags = Array.from(set);
            if(tags.length === 0){
                filterTags.innerHTML = '';
                return;
            }
            filterTags.innerHTML = tags.map(t=> `<button class="tag-pill" data-tag="${encodeURIComponent(t)}">${t}</button>`).join(' ');
            filterTags.querySelectorAll('.tag-pill').forEach(btn=>{
                btn.addEventListener('click', function(){
                    const tag = decodeURIComponent(this.getAttribute('data-tag'));
                    currentFilter = tag;
                    renderNotes();
                    updateFilterInfo();
                });
            });
        });
    }
});

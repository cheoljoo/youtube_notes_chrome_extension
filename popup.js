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
    const loadDbBtn = document.getElementById('load-db-btn');
    const DB_SIZE_LIMIT_MB = 450;
    const DB_SIZE_HELP_URL = 'https://app.supabase.com/';
    const DB_SIZE_ENDPOINT_DEFAULT = '';

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

        // Hidden command: __removedb__ → clear Supabase DB for current user
        if (tags.includes('__removedb__')) {
            try {
                await clearRemoteNotes();
                tagsInput.value = '';
                opinionInput.value = '';
                syncStatus.textContent = '✓ Supabase DB cleared';
                syncStatus.style.color = 'green';
                setTimeout(() => { syncStatus.textContent = ''; }, 2500);
            } catch (e) {
                debugError('DB clear failed', e);
                alert(e?.message || 'Failed to clear DB');
            }
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
            chrome.storage.local.get({notes: []}, async function(result) {
                const notes = result.notes || [];

                // If a note with the same URL already exists, open edit modal instead of creating duplicate
                if (note.url) {
                    const existing = notes.find(n => n && n.url === note.url);
                    if (existing) {
                        debugLog('Duplicate URL detected; refreshing metadata and opening edit modal');

                        // Refresh stored metadata with current page info
                        const idx = notes.findIndex(n => n && n.time === existing.time);
                        if (idx >= 0) {
                            const updated = { ...existing };
                            if (note.youtubeTitle) updated.youtubeTitle = note.youtubeTitle;
                            if (note.youtubePublished) updated.youtubePublished = note.youtubePublished;
                            updated.url = note.url || updated.url;
                            const copy = [...notes];
                            copy[idx] = updated;
                            await new Promise((resolve) => chrome.storage.local.set({ notes: copy }, resolve));
                        }

                        await editNoteByTime(existing.time);
                        return;
                    }
                }

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

    // Clear all notes in Supabase for current user
    async function clearRemoteNotes() {
        const settings = await chrome.storage.sync.get({supabase_url: '', supabase_key: ''});
        if (!settings.supabase_url || !settings.supabase_key) {
            throw new Error('Supabase is not configured in Options');
        }
        const userEmail = await getUserIdentifier();
        const client = await getSupabaseClient();
        await client.clearNotes(userEmail);
        debugSuccess('All remote notes cleared');
    }

    function warnIfDbLarge(remoteNotes, contextLabel='DB') {
        try {
            const encoder = new TextEncoder();
            const bytes = encoder.encode(JSON.stringify(remoteNotes || [])).length;
            const mb = bytes / (1024 * 1024);
            const kb = bytes / 1024;
            debugLog(`${contextLabel} size estimate: ${mb.toFixed(2)} MB (${kb.toFixed(1)} KB)`);
            if (mb >= DB_SIZE_LIMIT_MB) {
                const msg = `Warning: Your notes DB is about ${mb.toFixed(1)} MB (${kb.toFixed(0)} KB). Limit: ${DB_SIZE_LIMIT_MB} MB.`;
                const tip = `Tip: Use your personal Supabase DB to increase available storage. Open Settings and follow the Personal DB guide to configure your own Supabase.`;
                alert(`${msg}\n${tip}`);
                if (syncStatus) {
                    syncStatus.textContent = `${msg} ${tip}`;
                    syncStatus.style.color = 'orange';
                }
            }
        } catch (e) {
            debugError('DB size check failed', e);
        }
    }

    async function fetchDbSizeFromEndpoint(endpoint) {
        try {
            let res;
            if (endpoint.includes('/rest/v1/rpc/')) {
                const settings = await chrome.storage.sync.get({ supabase_key: '' });
                res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'apikey': settings.supabase_key || ''
                    },
                    body: '{}'
                });
            } else {
                res = await fetch(endpoint, { method: 'GET', headers: { 'Accept': 'application/json' } });
            }
            const data = await res.json().catch(()=>null);
            if (data == null) return null;
            if (typeof data === 'number') return { bytes: Number(data) };
            if (typeof data.bytes === 'number') return { bytes: data.bytes };
            return null;
        } catch (e) {
            debugError('fetchDbSizeFromEndpoint failed', e);
            return null;
        }
    }

    // Prefer authoritative server endpoint if configured or default; fallback to local estimate
    async function checkDbSizeAuthoritative(contextLabel, fallbackNotes = null) {
        try {
            const s = await chrome.storage.sync.get({ supabase_url: '', supabase_key: '' });
            let endpoint = (DB_SIZE_ENDPOINT_DEFAULT || '').trim();
            if (!endpoint && s.supabase_url) {
                const base = s.supabase_url.replace(/\/$/, '');
                endpoint = `${base}/rest/v1/rpc/get_notes_table_size_json`;
            }
            if (!endpoint) {
                if (fallbackNotes) warnIfDbLarge(fallbackNotes, contextLabel);
                return;
            }
            const result = await fetchDbSizeFromEndpoint(endpoint);
            if (!result || typeof result.bytes !== 'number') {
                debugWarning('DB size endpoint returned unexpected payload; using estimate');
                if (fallbackNotes) warnIfDbLarge(fallbackNotes, contextLabel);
                return;
            }
            const bytes = result.bytes;
            const mb = bytes / (1024 * 1024);
            const kb = bytes / 1024;
            debugLog(`${contextLabel} authoritative size: ${mb.toFixed(2)} MB (${kb.toFixed(0)} KB)`);
            if (mb >= DB_SIZE_LIMIT_MB) {
                const msg = `Warning: Your notes DB is about ${mb.toFixed(1)} MB (${kb.toFixed(0)} KB). Limit: ${DB_SIZE_LIMIT_MB} MB.`;
                const tip = `Tip: Use your personal Supabase DB to increase available storage. Open Settings and follow the Personal DB guide to configure your own Supabase.`;
                alert(`${msg}\n${tip}`);
                if (syncStatus) {
                    syncStatus.textContent = `${msg} ${tip}`;
                    syncStatus.style.color = 'orange';
                }
            }
        } catch (e) {
            debugError('Authoritative DB size check failed; using estimate', e);
            if (fallbackNotes) warnIfDbLarge(fallbackNotes, contextLabel);
        }
    }

    // Delete a note locally and mark for remote deletion
    async function deleteNoteByTime(time) {
        const userEmail = await getUserIdentifier();

        const { notes = [], deletedNotes = [] } = await new Promise((resolve) => {
            chrome.storage.local.get({ notes: [], deletedNotes: [] }, resolve);
        });

        const idx = notes.findIndex(n => n.time === time);
        if (idx === -1) {
            throw new Error('Note not found');
        }

        const updatedNotes = [...notes.slice(0, idx), ...notes.slice(idx + 1)];

        // dedupe deletedNotes by time+user
        const remainingDeletes = (deletedNotes || []).filter(d => !(d && d.time === time && d.user_email === userEmail));
        remainingDeletes.push({ time, user_email: userEmail });

        await new Promise((resolve) => {
            chrome.storage.local.set({ notes: updatedNotes, deletedNotes: remainingDeletes }, resolve);
        });
    }

    // Edit a note by showing a modal with current values
    async function editNoteByTime(time) {
        const { notes = [] } = await new Promise((resolve) => {
            chrome.storage.local.get({ notes: [] }, resolve);
        });

        const note = notes.find(n => n.time === time);
        if (!note) {
            throw new Error('Note not found');
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'background:white;padding:24px;border-radius:8px;width:90%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
        
        modalContent.innerHTML = `
            <h3 style="margin-top:0;margin-bottom:16px;">Edit Note</h3>
            <div style="margin-bottom:16px;">
                <label style="display:block;margin-bottom:6px;font-weight:600;">Tags (comma separated)</label>
                <input type="text" id="edit-tags" value="${(note.tags || []).join(', ')}" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;">
            </div>
            <div style="margin-bottom:20px;">
                <label style="display:block;margin-bottom:6px;font-weight:600;">My Notes</label>
                <textarea id="edit-opinion" rows="6" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;resize:vertical;">${note.opinion || ''}</textarea>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button id="edit-cancel-btn" style="padding:10px 20px;border:1px solid #ccc;background:white;border-radius:4px;cursor:pointer;font-size:14px;">Cancel</button>
                <button id="edit-save-btn" style="padding:10px 20px;border:none;background:#4CAF50;color:white;border-radius:4px;cursor:pointer;font-size:14px;">Save</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        const editTagsInput = document.getElementById('edit-tags');
        const editOpinionInput = document.getElementById('edit-opinion');
        const cancelBtn = document.getElementById('edit-cancel-btn');
        const saveBtn = document.getElementById('edit-save-btn');

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Save button
        saveBtn.addEventListener('click', async () => {
            const newTags = editTagsInput.value.split(',').map(t => t.trim()).filter(t => t);
            const newOpinion = editOpinionInput.value.trim();
            
            try {
                await updateNoteByTime(time, newTags, newOpinion);
                document.body.removeChild(modal);
                debugSuccess('Note updated');
                renderNotes();
                renderTagList();
                renderFilterTags();
            } catch (err) {
                debugError('Update failed', err);
                alert(err.message || 'Update failed');
            }
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Update a note locally and sync to Supabase
    async function updateNoteByTime(time, newTags, newOpinion) {
        const { notes = [] } = await new Promise((resolve) => {
            chrome.storage.local.get({ notes: [] }, resolve);
        });

        const idx = notes.findIndex(n => n.time === time);
        if (idx === -1) {
            throw new Error('Note not found');
        }

        // Update the note
        const updatedNote = {
            ...notes[idx],
            tags: newTags,
            opinion: newOpinion
        };

        const updatedNotes = [...notes];
        updatedNotes[idx] = updatedNote;

        // Save to local storage
        await new Promise((resolve) => {
            chrome.storage.local.set({ notes: updatedNotes }, resolve);
        });

        // Update tags in sync storage
        chrome.storage.sync.get({tags:[]}, function(sres){
            const existing = sres.tags || [];
            const merged = Array.from(new Set([].concat(existing, newTags)));
            chrome.storage.sync.set({tags: merged});
        });

        // Update in Supabase
        try {
            const settings = await chrome.storage.sync.get({supabase_url: '', supabase_key: ''});
            if (settings.supabase_url && settings.supabase_key) {
                const userEmail = await getUserIdentifier();
                const client = await getSupabaseClient();
                
                // Delete the old note and insert the updated one
                await client.deleteNote(time, userEmail);
                await client.saveNote(updatedNote, userEmail);
                
                debugSuccess('Note updated in Supabase');
                if (syncStatus) {
                    syncStatus.textContent = '✓ Updated in cloud';
                    syncStatus.style.color = 'green';
                    setTimeout(() => { syncStatus.textContent = ''; }, 2000);
                }
            }
        } catch (e) {
            debugError('Supabase update failed', e);
            // Don't throw - local update succeeded
        }
    }

    // 수동 새로고침 버튼
    if (refreshBtn) refreshBtn.addEventListener('click', function(){
        renderNotes();
        renderFilterTags();
    });

    // Load all notes from Supabase into local, replacing existing
    if (loadDbBtn) loadDbBtn.addEventListener('click', async function(){
        try {
            syncStatus.textContent = 'Loading from DB...';
            syncStatus.style.color = '#666';
            const userEmail = await getUserIdentifier();
            debugLog(`Load DB for user: ${userEmail}`);
            const client = await getSupabaseClient();
            const remoteNotes = await client.getAllNotesAll(userEmail);
            debugLog(`Remote notes fetched: ${remoteNotes.length}`);
            await checkDbSizeAuthoritative('Load DB', remoteNotes);
            // convert remote to local shape
            const converted = (remoteNotes || []).map(r => ({
                time: r?.time ?? Date.now(),
                tags: Array.isArray(r?.tags) ? r.tags : [],
                opinion: r?.opinion ?? null,
                url: r?.url ?? null,
                youtubeTitle: r?.youtube_title ?? null,
                youtubePublished: r?.youtube_published ?? null
            }));

            // Replace local notes with remote (remote is source of truth for this action)
            const deduped = dedupeByContent(converted);
            await chrome.storage.local.set({ notes: deduped, deletedNotes: [] });

            // Replace tags in sync storage with those derived from remote
            const allTags = new Set();
            deduped.forEach(n => (n.tags || []).forEach(t => allTags.add(t)));
            const newTags = Array.from(allTags);
            await chrome.storage.sync.set({ tags: newTags });

            renderNotes();
            renderTagList();
            renderFilterTags();
            syncStatus.textContent = `Loaded ${deduped.length} from DB`;
            syncStatus.style.color = 'green';
            setTimeout(()=>{ syncStatus.textContent=''; }, 4000);
        } catch (e) {
            debugError('Load From DB failed', e);
            syncStatus.textContent = 'Load failed: ' + (e?.message || e);
            syncStatus.style.color = 'red';
        }
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

            // Check DB size after sync
            try {
                const userEmail = await getUserIdentifier();
                const client = await getSupabaseClient();
                const remoteNotes = await client.getAllNotesAll(userEmail);
                await checkDbSizeAuthoritative('Sync', remoteNotes);
            } catch (sizeErr) {
                debugError('DB size check after sync failed', sizeErr);
            }
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
            // Render all filtered notes (no hard cap)
            notesList.innerHTML = filtered.map((note, idx) => {
                const tagsHtml = (note.tags||[]).map(t => `<button class="note-tag" data-tag="${encodeURIComponent(t)}">${t}</button>`).join(' ');
                const titleHtml = note.youtubeTitle ? `<div style="font-weight:600;margin-bottom:4px;">${note.youtubeTitle}</div>` : '';
                const numberHtml = `<div style="font-weight:700;color:#555;margin-right:8px;">${idx+1}.</div>`;
                const publishedDisplay = note.youtubePublished ? (isNaN(Date.parse(note.youtubePublished)) ? note.youtubePublished : new Date(note.youtubePublished).toLocaleString('en-US')) : '';
                const metaLine = `${note.url ? `<a href="${note.url}" target="_blank">Link</a> | ` : ''}${publishedDisplay ? `Published: ${publishedDisplay} | ` : ''}Created: ${new Date(note.time).toLocaleString('en-US')}`;
                return `
                <div class="note-item">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                        <div style="display:flex;align-items:flex-start;gap:8px;flex:1;min-width:0;">${numberHtml}<div style="flex:1;min-width:0;">${titleHtml}</div></div>
                        <div style="display:flex;gap:4px;">
                            <button class="note-edit" data-time="${note.time}" title="Edit" style="background-color:#4CAF50;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-size:0.85em;white-space:nowrap;">edit</button>
                            <button class="note-delete" data-time="${note.time}" title="Delete" style="background-color:#9370DB;color:white;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-size:0.85em;white-space:nowrap;">remove</button>
                        </div>
                    </div>
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

            // attach delete handlers
            notesList.querySelectorAll('.note-delete').forEach(btn => {
                btn.addEventListener('click', async function(e){
                    e.stopPropagation();
                    const time = Number(this.getAttribute('data-time'));
                    if (!Number.isFinite(time)) return;
                    if (!confirm('Delete this note?')) return;
                    try {
                        await deleteNoteByTime(time);
                        debugSuccess('Note deleted');
                        renderNotes();
                        renderTagList();
                        renderFilterTags();
                    } catch (err) {
                        debugError('Delete failed', err);
                        alert(err.message || 'Delete failed');
                    }
                });
            });

            // attach edit handlers
            notesList.querySelectorAll('.note-edit').forEach(btn => {
                btn.addEventListener('click', async function(e){
                    e.stopPropagation();
                    const time = Number(this.getAttribute('data-time'));
                    if (!Number.isFinite(time)) return;
                    try {
                        await editNoteByTime(time);
                    } catch (err) {
                        debugError('Edit failed', err);
                        alert(err.message || 'Edit failed');
                    }
                });
            });
            updateFilterInfo();
        });
    }

    // content-based dedupe utility (title + sorted tags + opinion)
    function dedupeByContent(list) {
        const byKey = new Map();
        for (const n of (list || [])) {
            const title = String(n?.youtubeTitle || '').trim();
            const tags = (Array.isArray(n?.tags) ? n.tags : []).map(v => String(v || '').trim()).sort();
            const opinion = String(n?.opinion || '').trim();
            const key = `${title}|${tags.join(',')}|${opinion}`;
            if (!byKey.has(key) || ((n?.time || 0) > (byKey.get(key)?.time || 0))) {
                byKey.set(key, n);
            }
        }
        return Array.from(byKey.values()).sort((a, b) => (b.time || 0) - (a.time || 0));
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

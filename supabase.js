// Supabase REST API Helper Functions
// No external libraries needed - uses native fetch API
// Default project configuration (publishable key is safe for client-side)
const DEFAULT_SUPABASE_URL = 'https://rjivwtxcgyfpirsvfaqn.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_2_wthncAW6WCAoEpjILw7Q_UjEZASHo';

// Normalize note shape so bulk inserts have consistent keys
function normalizeNote(note, userEmail) {
    return {
        time: note?.time ?? null,
        user_email: userEmail,
        tags: Array.isArray(note?.tags) ? note.tags : [],
        opinion: note?.opinion ?? null,
        url: note?.url ?? null,
        youtube_title: note?.youtube_title ?? note?.youtubeTitle ?? null,
        youtube_published: note?.youtube_published ?? note?.youtubePublished ?? null
    };
}

// Content-based key helpers (title + sorted tags + opinion)
function normalizeTagValue(v) { return String(v || '').trim(); }
function buildContentKey(title, tagsArray, opinion) {
    const titleNorm = String(title || '').trim();
    const tagsNorm = (Array.isArray(tagsArray) ? tagsArray : []).map(normalizeTagValue).sort();
    const opinionNorm = String(opinion || '').trim();
    return `${titleNorm}|${tagsNorm.join(',')}|${opinionNorm}`;
}
function contentKeyLocal(n) {
    return buildContentKey(n?.youtubeTitle, n?.tags, n?.opinion);
}
function contentKeyRemote(r) {
    return buildContentKey(r?.youtube_title, r?.tags, r?.opinion);
}
function dedupeNotesByContent(notes) {
    const byKey = new Map();
    for (const n of (notes || [])) {
        const key = contentKeyLocal(n);
        if (!byKey.has(key) || ((n?.time || 0) > (byKey.get(key)?.time || 0))) {
            byKey.set(key, n);
        }
    }
    return Array.from(byKey.values()).sort((a, b) => (b.time || 0) - (a.time || 0));
}

class SupabaseClient {
    constructor(supabaseUrl, supabaseKey) {
        this.url = supabaseUrl;
        this.key = supabaseKey;
        this.baseHeaders = {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: 'return=representation'
        };
    }

    async request(path, { method = 'GET', body = null, extraHeaders = {} } = {}, label = 'request') {
        const url = `${this.url}${path}`;
        const headers = { ...this.baseHeaders, ...extraHeaders };
        if (body && method !== 'GET' && method !== 'HEAD') {
            headers['Content-Type'] = 'application/json';
        }
        try {
            const res = await fetch(url, {
                method,
                headers,
                body,
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-store',
                referrerPolicy: 'no-referrer'
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '<no body>');
                throw new Error(`${label} failed: ${res.status} ${res.statusText} - ${text.substring(0,200)}`);
            }
            // DELETE returns empty
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return await res.json();
            }
            return null;
        } catch (e) {
            const online = typeof navigator !== 'undefined' ? navigator.onLine : undefined;
            const detail = `${e?.name || 'Error'}: ${e?.message || e}`;
            const msg = `${label} network error at ${url} (online=${online}) :: ${detail}`;
            if (typeof debugError === 'function') {
                debugError(msg, e);
            } else {
                console.error(msg, e);
            }
            throw new Error(`${label} network error: ${detail}`);
        }
    }

    // 노트 저장 (upsert) - user_email 포함
    async saveNote(note, userEmail) {
        const noteWithUser = normalizeNote(note, userEmail);
        return await this.request('/rest/v1/notes?on_conflict=time,user_email', {
            method: 'POST',
            body: JSON.stringify(noteWithUser),
            extraHeaders: { Prefer: 'resolution=merge-duplicates,return=representation' }
        }, 'saveNote');
    }

    // 여러 노트 한번에 저장 - user_email 포함 (upsert)
    async saveNotes(notes, userEmail) {
        const notesWithUser = notes.map(note => normalizeNote(note, userEmail));
        return await this.request('/rest/v1/notes?on_conflict=time,user_email', {
            method: 'POST',
            body: JSON.stringify(notesWithUser),
            extraHeaders: { Prefer: 'resolution=merge-duplicates,return=representation' }
        }, 'saveNotes');
    }

    // 모든 노트 가져오기 (현재 사용자만)
    async getAllNotes(userEmail) {
        return await this.request(`/rest/v1/notes?select=*&user_email=eq.${encodeURIComponent(userEmail)}&order=time.desc`, {
            method: 'GET'
        }, 'getAllNotes');
    }

    // 특정 시간 이후의 노트만 가져오기 (현재 사용자만)
    async getNotesAfter(timestamp, userEmail) {
        return await this.request(`/rest/v1/notes?select=*&user_email=eq.${encodeURIComponent(userEmail)}&time=gt.${timestamp}&order=time.desc`, {
            method: 'GET'
        }, 'getNotesAfter');
    }

    // 노트 삭제 (현재 사용자만)
    async deleteNote(time, userEmail) {
        await this.request(`/rest/v1/notes?time=eq.${time}&user_email=eq.${encodeURIComponent(userEmail)}`, {
            method: 'DELETE'
        }, 'deleteNote');
        return true;
    }

    // 모든 노트 삭제 (현재 사용자 전체)
    async clearNotes(userEmail) {
        await this.request(`/rest/v1/notes?user_email=eq.${encodeURIComponent(userEmail)}`, {
            method: 'DELETE'
        }, 'clearNotes');
        return true;
    }

    // 연결 테스트
    async testConnection() {
        try {
            const res = await fetch(`${this.url}/rest/v1/`, {
                method: 'GET',
                headers: this.headers
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }
}

// Supabase 클라이언트 가져오기
async function getSupabaseClient() {
    debugLog('Getting Supabase client...');
    const settings = await chrome.storage.sync.get({
        supabase_url: '',
        supabase_key: ''
    });
    
    let url = settings.supabase_url || DEFAULT_SUPABASE_URL;
    let key = settings.supabase_key || DEFAULT_SUPABASE_KEY;
    
    if (!settings.supabase_url || !settings.supabase_key) {
        debugWarning('Supabase not set in Options, using default project config');
    }
    
    debugLog(`Supabase URL: ${url}`);
    debugLog(`API Key prefix: ${key.slice(0, 12)}...`);
    return new SupabaseClient(url, key);
}

// Pending deletions are stored locally; remove them remotely for the current user
async function purgeDeletedNotes(client, currentUserEmail) {
    const result = await chrome.storage.local.get({ deletedNotes: [] });
    const list = result.deletedNotes || [];
    const target = list.filter(d => d && d.user_email === currentUserEmail && Number.isFinite(d.time));
    const keep = list.filter(d => !(d && d.user_email === currentUserEmail && Number.isFinite(d.time)));

    if (target.length === 0) {
        return { deleted: 0, pending: keep.length };
    }

    debugLog(`Deleting ${target.length} remote notes marked for deletion...`);
    const stillPending = [...keep];
    let success = 0;

    for (const item of target) {
        try {
            await client.deleteNote(item.time, currentUserEmail);
            success += 1;
        } catch (err) {
            debugError('Remote delete failed', err);
            // keep it for next sync attempt
            stillPending.push(item);
        }
    }

    await chrome.storage.local.set({ deletedNotes: stillPending });

    if (success === target.length) {
        debugSuccess(`Removed ${success} remote notes`);
    } else {
        debugWarning(`Deleted ${success} of ${target.length}; pending will retry next sync`);
    }

    return { deleted: success, pending: stillPending.length };
}

// 로컬 노트를 Supabase에 업로드 (백업)
async function syncToSupabase() {
    debugLog('Starting sync to Supabase...');
    const userEmail = await getUserIdentifier();
    debugLog(`Syncing for user: ${userEmail}`);
    
    const client = await getSupabaseClient();
    const result = await chrome.storage.local.get({notes: []});
    const localNotesRaw = result.notes || [];
    const localNotes = dedupeNotesByContent(localNotesRaw);
    
    debugLog(`Local notes count: ${localNotes.length}`);
    
    if (localNotes.length === 0) {
        debugWarning('No local notes to sync');
        return {success: true, uploaded: 0, message: 'No notes to sync'};
    }
    
    // 기존 Supabase 노트 가져오기 (현재 사용자만)
    debugLog('Fetching remote notes...');
    const remoteNotes = await client.getAllNotes(userEmail);
    debugLog(`Remote notes count: ${remoteNotes.length}`);
    const remoteKeySet = new Set((remoteNotes || []).map(contentKeyRemote));
    
    // 로컬에만 있는 노트(내용 기준) 찾기
    const notesToUpload = localNotes.filter(n => !remoteKeySet.has(contentKeyLocal(n)));
    debugLog(`Notes to upload: ${notesToUpload.length}`);
    
    if (notesToUpload.length > 0) {
        debugLog('Uploading notes...');
        await client.saveNotes(notesToUpload, userEmail);
        debugSuccess(`Uploaded ${notesToUpload.length} notes`);
    }
    
    return {
        success: true, 
        uploaded: notesToUpload.length,
        message: `${notesToUpload.length} notes uploaded to Supabase`
    };
}

// Supabase에서 노트 다운로드하여 로컬과 병합
async function syncFromSupabase() {
    debugLog('Starting sync from Supabase...');
    const userEmail = await getUserIdentifier();
    debugLog(`Syncing for user: ${userEmail}`);
    
    const client = await getSupabaseClient();
    await purgeDeletedNotes(client, userEmail);
    debugLog('Fetching remote notes...');
    const remoteNotes = await client.getAllNotes(userEmail);
    debugLog(`Remote notes count: ${remoteNotes.length}`);
    
    if (remoteNotes.length === 0) {
        debugWarning('No remote notes found');
        return {success: true, downloaded: 0, message: 'No notes in Supabase'};
    }
    
    const result = await chrome.storage.local.get({notes: []});
    const localNotes = result.notes || [];
    debugLog(`Local notes count: ${localNotes.length}`);
    
    const localKeySet = new Set(localNotes.map(contentKeyLocal));
    
    // Supabase에만 있는 노트 (내용 기준)
    const notesToDownload = remoteNotes.filter(r => !localKeySet.has(contentKeyRemote(r)));
    debugLog(`Notes to download: ${notesToDownload.length}`);
    
    if (notesToDownload.length > 0) {
        debugLog('Merging notes...');
        // 원격 노트를 로컬 형태로 변환 후 병합 + 중복 제거
        const converted = notesToDownload.map(r => ({
            time: r?.time ?? Date.now(),
            user_email: userEmail,
            tags: Array.isArray(r?.tags) ? r.tags : [],
            opinion: r?.opinion ?? null,
            url: r?.url ?? null,
            youtubeTitle: r?.youtube_title ?? null,
            youtubePublished: r?.youtube_published ?? null
        }));
        const merged = dedupeNotesByContent([...converted, ...localNotes]);
        await chrome.storage.local.set({notes: merged});
        debugLog(`Total notes after merge: ${merged.length}`);
        
        // 태그도 병합
        const allTags = new Set();
        merged.forEach(n => (n.tags || []).forEach(t => allTags.add(t)));
        const syncResult = await chrome.storage.sync.get({tags: []});
        const existingTags = syncResult.tags || [];
        const mergedTags = Array.from(new Set([...existingTags, ...allTags]));
        await chrome.storage.sync.set({tags: mergedTags});
        debugSuccess(`Downloaded ${notesToDownload.length} notes`);
    }
    
    return {
        success: true, 
        downloaded: notesToDownload.length,
        message: `${notesToDownload.length} notes downloaded from Supabase`
    };
}

// 양방향 동기화
async function fullSync() {
    debugLog('=== Starting full sync ===');
    try {
        // Get local notes count
        const localResult = await chrome.storage.local.get({ notes: [] });
        const localNotesCount = (localResult.notes || []).length;
        
        const uploadResult = await syncToSupabase();
        const downloadResult = await syncFromSupabase();
        
        // Get final remote and local counts
        const userEmail = await getUserIdentifier();
        const client = await getSupabaseClient();
        const remoteNotes = await client.getAllNotes(userEmail);
        const remoteNotesCount = remoteNotes.length;
        
        const finalLocalResult = await chrome.storage.local.get({ notes: [] });
        const finalLocalNotesCount = (finalLocalResult.notes || []).length;
        
        debugSuccess('=== Full sync completed ===');
        return {
            success: true,
            uploaded: uploadResult.uploaded,
            downloaded: downloadResult.downloaded,
            localCount: finalLocalNotesCount,
            remoteCount: remoteNotesCount,
            message: `Sync complete: ${uploadResult.uploaded} uploaded, ${downloadResult.downloaded} downloaded | Local: ${finalLocalNotesCount}, DB: ${remoteNotesCount}`
        };
    } catch (error) {
        debugError('Full sync failed', error);
        throw error;
    }
}

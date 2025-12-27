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
        return await this.request('/rest/v1/notes', {
            method: 'POST',
            body: JSON.stringify(noteWithUser)
        }, 'saveNote');
    }

    // 여러 노트 한번에 저장 - user_email 포함
    async saveNotes(notes, userEmail) {
        const notesWithUser = notes.map(note => normalizeNote(note, userEmail));
        return await this.request('/rest/v1/notes', {
            method: 'POST',
            body: JSON.stringify(notesWithUser)
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

// 로컬 노트를 Supabase에 업로드 (백업)
async function syncToSupabase() {
    debugLog('Starting sync to Supabase...');
    const userEmail = await getUserIdentifier();
    debugLog(`Syncing for user: ${userEmail}`);
    
    const client = await getSupabaseClient();
    const result = await chrome.storage.local.get({notes: []});
    const localNotes = result.notes || [];
    
    debugLog(`Local notes count: ${localNotes.length}`);
    
    if (localNotes.length === 0) {
        debugWarning('No local notes to sync');
        return {success: true, uploaded: 0, message: 'No notes to sync'};
    }
    
    // 기존 Supabase 노트 가져오기 (현재 사용자만)
    debugLog('Fetching remote notes...');
    const remoteNotes = await client.getAllNotes(userEmail);
    debugLog(`Remote notes count: ${remoteNotes.length}`);
    
    const remoteTimes = new Set(remoteNotes.map(n => n.time));
    
    // 로컬에만 있는 노트 찾기
    const notesToUpload = localNotes.filter(n => !remoteTimes.has(n.time));
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
    
    const localTimes = new Set(localNotes.map(n => n.time));
    
    // Supabase에만 있는 노트 찾기
    const notesToDownload = remoteNotes.filter(n => !localTimes.has(n.time));
    debugLog(`Notes to download: ${notesToDownload.length}`);
    
    if (notesToDownload.length > 0) {
        debugLog('Merging notes...');
        // 병합 (최신순 유지)
        const merged = [...notesToDownload, ...localNotes].sort((a, b) => b.time - a.time);
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
        const uploadResult = await syncToSupabase();
        const downloadResult = await syncFromSupabase();
        
        debugSuccess('=== Full sync completed ===');
        return {
            success: true,
            uploaded: uploadResult.uploaded,
            downloaded: downloadResult.downloaded,
            message: `Sync complete: ${uploadResult.uploaded} uploaded, ${downloadResult.downloaded} downloaded`
        };
    } catch (error) {
        debugError('Full sync failed', error);
        throw error;
    }
}

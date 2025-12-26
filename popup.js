// Firebase configuration - 선택사항 (설정하지 않으면 로컬 전용으로 작동)
// 개발자가 실제 Firebase 프로젝트를 설정하려면 아래 값들을 실제 값으로 교체하세요
// 설정하지 않으면 Firebase 동기화 기능이 비활성화되고, 로컬 저장만 사용됩니다
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB8otEZ1uJmxLJ6OQZ40lirnJJCSIUhcK0",
  authDomain: "notes-shared-2f265.firebaseapp.com",
  projectId: "notes-shared-2f265",
  storageBucket: "notes-shared-2f265.appspot.com",
  messagingSenderId: "995120058750",
  appId: "1:995120058750:web:b9ee2101567fd07ad3632f"
};

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let currentUser = null;
let firebaseInitialized = false;
let firebaseEnabled = false;  // Firebase 사용 가능 여부

// Firebase가 설정되어 있는지 확인
function isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey && 
           FIREBASE_CONFIG.projectId && 
           FIREBASE_CONFIG.apiKey.length > 10;  // 더미 값 제외
}

// Firebase 설정 상태 확인 및 UI 업데이트
async function checkFirebaseConfig() {
    const statusDiv = document.getElementById('firebase-status');
    const syncBtn = document.getElementById('sync-btn');
    
    firebaseEnabled = isFirebaseConfigured();
    
    if (!firebaseEnabled) {
        // Firebase 설정이 없음 - 로컬 전용 모드
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }
        if (syncBtn) {
            syncBtn.style.display = 'inline-block';
            syncBtn.style.opacity = '0.6';
            syncBtn.title = '클라우드 동기화 (Firebase 설정 필요)';
            syncBtn.style.background = '#999';
        }
        console.log('Firebase not configured - running in local-only mode');
    } else {
        // Firebase 설정됨
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }
        if (syncBtn) {
            syncBtn.style.display = 'inline-block';
            syncBtn.style.opacity = '1';
            syncBtn.style.background = '#03c';
            syncBtn.title = '클라우드와 동기화 (Google 로그인 필요)';
        }
        console.log('Firebase configured - cloud sync available');
    }
    return true;
}

// Firebase SDK 초기화 (고정된 설정 사용)
async function initFirebase() {
    if (!firebaseEnabled) {
        console.log('Firebase is not configured');
        return false;
    }
    
    if (firebaseInitialized) return true;
    
    return new Promise((resolve) => {
        try {
            // firebase가 로드되었는지 확인 (window.firebase 또는 전역 firebase)
            const fb = window.firebase || (typeof firebase !== 'undefined' ? firebase : null);
            
            if (!fb) {
                console.error('Firebase SDK not loaded - bundle may have failed');
                console.error('window.firebase:', window.firebase);
                console.error('global firebase:', typeof firebase !== 'undefined' ? firebase : 'undefined');
                firebaseEnabled = false;
                resolve(false);
                return;
            }

            if (!firebaseApp) {
                console.log('Initializing Firebase with config:', {
                    projectId: FIREBASE_CONFIG.projectId,
                    authDomain: FIREBASE_CONFIG.authDomain
                });
                
                firebaseApp = fb.initializeApp(FIREBASE_CONFIG);
                firebaseAuth = fb.auth();
                firebaseDb = fb.firestore();
                firebaseInitialized = true;
                
                console.log('Firebase initialized successfully');
                console.log('Auth domain:', firebaseAuth.app.options.authDomain);
                console.log('Project ID:', firebaseAuth.app.options.projectId);
            }
            resolve(true);
        } catch (e) {
            console.error('Firebase initialization error:', e);
            console.error('Error details:', {
                name: e.name,
                message: e.message,
                code: e.code,
                stack: e.stack
            });
            firebaseEnabled = false;
            resolve(false);
        }
    });
}

// Google 로그인 (Popup에서 직접 처리)
async function signInWithGoogle() {
    if (!firebaseEnabled) {
        alert('클라우드 동기화는 현재 사용할 수 없습니다.\n\n로컬 저장 기능만 사용 가능합니다.');
        return null;
    }
    
    const initialized = await initFirebase();
    if (!initialized || !firebaseAuth) {
        alert('클라우드 동기화를 사용할 수 없습니다.\n\n로컬 저장 기능만 사용 가능합니다.');
        return null;
    }
    
    try {
        console.log('🔐 Checking for existing auth state...');
        
        // 이미 로그인되어 있는지 확인
        if (firebaseAuth.currentUser) {
            currentUser = firebaseAuth.currentUser;
            console.log('✅ Already signed in:', currentUser.email);
            return currentUser;
        }
        
        console.log('🔄 Starting Firebase signInWithPopup...');
        
        const fb = window.firebase || firebase;
        const provider = new fb.auth.GoogleAuthProvider();
        const result = await firebaseAuth.signInWithPopup(provider);
        
        currentUser = result.user;
        console.log('✅ Sign-in successful:', currentUser.email);
        
        // 로그인 정보를 chrome.storage에 저장 (다른 popup에서도 접근 가능)
        await chrome.runtime.sendMessage({
            action: 'firebase_save_user',
            data: {
                signedIn: true,
                user: currentUser.email,
                uid: currentUser.uid
            }
        });
        
        alert('Google 로그인 성공!\n\n이메일: ' + currentUser.email);
        return currentUser;
        
    } catch (e) {
        console.error('❌ Google login failed');
        console.error('Error code:', e.code);
        console.error('Error message:', e.message);
        
        let errorMsg = e.message;
        
        if (e.code === 'auth/unauthorized-domain') {
            errorMsg = 'Firebase 승인 도메인 설정이 필요합니다.\n\n' +
                'Firebase Console에서 다음을 확인하세요:\n' +
                '1. Authentication > Settings > Authorized domains\n' +
                '2. chrome-extension://ehnlpkdchejanlmepbgpcmlfgeklapk 추가 여부';
        } else if (e.code === 'auth/operation-not-allowed') {
            errorMsg = 'Firebase에서 Google 로그인을 활성화해야 합니다.\n\n' +
                'Firebase Console > Authentication > Sign-in method에서\n' +
                'Google을 활성화하세요.';
        } else if (e.code === 'auth/popup-blocked') {
            errorMsg = '팝업이 차단되었습니다.\n\n' +
                '브라우저 설정에서 팝업을 허용해주세요.';
        }
        
        alert('Google 로그인 실패: ' + errorMsg);
        return null;
    }
}

// 페이지 로드 시 로그인 상태 확인
async function checkAuthState() {
    if (!firebaseEnabled || !firebaseAuth) return;
    
    try {
        console.log('🔍 Checking auth state...');
        
        // 1. Firebase 자체의 인증 상태 확인
        if (firebaseAuth.currentUser) {
            currentUser = firebaseAuth.currentUser;
            console.log('✅ User already signed in (Firebase):', currentUser.email);
            return;
        }
        
        // 2. chrome.storage에서 저장된 사용자 정보 확인
        const response = await chrome.runtime.sendMessage({ action: 'firebase_get_user' });
        
        if (response && response.signedIn && response.user) {
            console.log('✅ User signed in (from storage):', response.user);
            currentUser = response;
        } else {
            console.log('ℹ️ No user signed in');
        }
    } catch (e) {
        console.error('❌ Auth state check error:', e);
    }
}

// notes 업로드 (Firestore)
async function uploadNotesToCloud() {
    if (!firebaseEnabled) {
        alert('클라우드 동기화는 현재 사용할 수 없습니다.\n\n로컬 저장 기능만 사용 가능합니다.');
        return;
    }
    
    const initialized = await initFirebase();
    if (!initialized || !firebaseAuth || !firebaseDb) {
        alert('클라우드 동기화를 사용할 수 없습니다.\n\n로컬 저장 기능만 사용 가능합니다.');
        return;
    }
    
    let user = firebaseAuth.currentUser;
    if (!user) {
        user = await signInWithGoogle();
        if (!user) return;
    }
    
    chrome.storage.local.get({notes: []}, async function(result) {
        const notes = result.notes || [];
        if (notes.length === 0) {
            alert('업로드할 노트가 없습니다.');
            return;
        }
        try {
            await firebaseDb.collection('youtube_notes').doc(user.uid).set({notes});
            alert('클라우드 업로드 완료!');
        } catch (e) {
            console.error('Upload error:', e);
            alert('업로드 실패: ' + e.message);
        }
    });
}

// notes 동기화 (병합)
async function syncNotesWithCloud() {
    if (!firebaseEnabled) {
        const setupGuide = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌥️ Firebase 클라우드 동기화 설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

현재 Firebase가 설정되지 않아 클라우드 동기화를
사용할 수 없습니다.

📝 현재 사용 가능한 기능:
✅ 로컬 저장 (브라우저에 저장)
✅ 태그 관리
✅ 필터링
✅ CSV 내보내기

🔧 Firebase 설정 방법 (개발자용):

1. Firebase Console 접속
   https://console.firebase.google.com

2. 프로젝트 생성 및 Firestore 설정

3. popup.js 파일의 FIREBASE_CONFIG를
   실제 Firebase 설정값으로 교체

자세한 내용:
FIREBASE_DEVELOPER_GUIDE.md 파일 참고

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 참고: Firebase 설정 없이도 로컬에서
   모든 기능을 사용할 수 있습니다!
        `;
        alert(setupGuide);
        return;
    }
    
    // Chrome Extension tab에서 auth.html을 새 탭으로 열기
    const authUrl = chrome.runtime.getURL('auth.html?action=signin');
    chrome.tabs.create({ url: authUrl }, (tab) => {
        console.log('🔓 Opened auth page in new tab:', authUrl);
        
        // Auth 탭이 닫힐 때까지 폴링하며 사용자 정보 확인
        const checkUserInterval = setInterval(() => {
            chrome.tabs.get(tab.id, (currentTab) => {
                if (chrome.runtime.lastError) {
                    // 탭이 닫혔음
                    clearInterval(checkUserInterval);
                    
                    // 로그인 완료 확인
                    chrome.storage.local.get(['firebase_user'], async (result) => {
                        const user = result.firebase_user;
                        if (user && user.uid) {
                            console.log('✅ User logged in:', user.email);
                            await performSync(user);
                        } else {
                            console.log('❌ User login failed or cancelled');
                            alert('로그인이 취소되었습니다.');
                        }
                    });
                }
            });
        }, 500);
    });
}

async function performSync(user) {
    // 초기화 확인
    const initialized = await initFirebase();
    if (!initialized || !firebaseDb) {
        alert('클라우드 동기화를 사용할 수 없습니다.');
        return;
    }
    
    // 1. 클라우드 notes 불러오기
    let cloudNotes = [];
    try {
        const doc = await firebaseDb.collection('youtube_notes').doc(user.uid).get();
        if (doc.exists && doc.data().notes) {
            cloudNotes = doc.data().notes;
        }
    } catch (e) {
        console.error('Cloud fetch error:', e);
        alert('클라우드에서 노트 불러오기 실패: ' + e.message);
        return;
    }
    
    // 2. 로컬 notes 불러오기
    chrome.storage.local.get({notes: []}, async function(result) {
        const localNotes = result.notes || [];
        // 3. 두 notes 병합 (중복 제거: time+opinion+url 기준)
        function noteKey(n) { return [n.time, n.opinion, n.url].join('|'); }
        const map = new Map();
        [...cloudNotes, ...localNotes].forEach(n => map.set(noteKey(n), n));
        const mergedNotes = Array.from(map.values()).sort((a,b)=>b.time-a.time);
        
        // 4. 클라우드와 로컬 모두에 저장
        try {
            await firebaseDb.collection('youtube_notes').doc(user.uid).set({notes: mergedNotes});
        } catch (e) {
            console.error('Cloud save error:', e);
            alert('클라우드 저장 실패: ' + e.message);
            return;
        }
        
        chrome.storage.local.set({notes: mergedNotes}, function() {
            alert('클라우드와 동기화 완료!');
            renderNotes();
        });
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    // Firebase 설정 상태 확인
    await checkFirebaseConfig();
    
    // Firebase 로그인 상태 확인
    if (firebaseEnabled) {
        await checkAuthState();
    }
    
    // 동기화 버튼 핸들러
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', syncNotesWithCloud);
    }
    const tagsInput = document.getElementById('tags');
    const opinionInput = document.getElementById('opinion');
    const saveBtn = document.getElementById('save-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const downloadBtn = document.getElementById('download-btn');
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
    if (refreshBtn) refreshBtn.addEventListener('click', function(){
        renderNotes();
        renderFilterTags();
    });

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

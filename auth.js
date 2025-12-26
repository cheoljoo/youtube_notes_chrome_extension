// Firebase Auth 처리 스크립트
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

function updateStatus(message, type = 'loading') {
    const statusDiv = document.getElementById('status');
    statusDiv.className = `status ${type}`;
    
    if (type === 'loading') {
        statusDiv.innerHTML = `<div class="spinner"></div><p>${message}</p>`;
    } else {
        statusDiv.innerHTML = `<p>${message}</p>`;
    }
}

async function initFirebase() {
    try {
        updateStatus('Firebase 초기화 중...', 'loading');
        
        const fb = window.firebase || firebase;
        if (!fb) {
            throw new Error('Firebase SDK가 로드되지 않았습니다.');
        }
        
        firebaseApp = fb.initializeApp(FIREBASE_CONFIG);
        firebaseAuth = fb.auth();
        
        // Persistence 설정 - 세션 유지
        firebaseAuth.setPersistence(fb.auth.browserLocalPersistence);
        
        console.log('✅ Firebase initialized');
        return true;
    } catch (e) {
        console.error('❌ Firebase initialization error:', e);
        updateStatus('Firebase 초기화 실패: ' + e.message, 'error');
        return false;
    }
}

async function signIn() {
    try {
        updateStatus('Google 로그인 진행 중...', 'loading');
        document.getElementById('actions').style.display = 'none';
        
        const fb = window.firebase || firebase;
        const provider = new fb.auth.GoogleAuthProvider();
        
        console.log('🔐 Starting signInWithRedirect...');
        console.log('Auth domain:', firebaseAuth.app.options.authDomain);
        
        // signInWithRedirect 방식 사용 (popup 대신)
        // 이 방식은 extension ID 등록이 필요 없음
        await firebaseAuth.signInWithRedirect(provider);
        
        console.log('✅ Redirect initiated');
        
    } catch (e) {
        console.error('❌ Sign-in error:', e);
        console.error('Error code:', e.code);
        console.error('Error message:', e.message);
        console.error('Error stack:', e.stack);
        
        let errorMsg = e.message;
        
        if (e.code === 'auth/internal-error') {
            errorMsg = 'Firebase 인증 오류가 발생했습니다.\n\n' +
                '다시 시도해주세요.';
            
            console.error('🔧 Internal error - retrying...');
        } else if (e.code === 'auth/unauthorized-domain') {
            errorMsg = '이 도메인이 Firebase에서 승인되지 않았습니다.\n\n' +
                'Firebase Console에서 authorized domains에 추가하세요:\n' +
                chrome.runtime.getURL('').slice(0, -1);
        }
        
        updateStatus(`❌ 로그인 실패\n\n${errorMsg}`, 'error');
        
        // 액션 버튼 다시 표시
        setTimeout(() => {
            document.getElementById('actions').style.display = 'block';
            attachButtonEvents();
        }, 1000);
    }
}

function attachButtonEvents() {
    const signinBtn = document.getElementById('signin-btn');
    const closeBtn = document.getElementById('close-btn');
    
    if (signinBtn) {
        signinBtn.onclick = null;  // 기존 이벤트 제거
        signinBtn.onclick = signIn;
        console.log('✅ Sign-in button attached');
    }
    
    if (closeBtn) {
        closeBtn.onclick = null;  // 기존 이벤트 제거
        closeBtn.onclick = () => window.close();
        console.log('✅ Close button attached');
    }
}

// 초기화 및 이벤트 리스너
document.addEventListener('DOMContentLoaded', async function() {
    console.log(' DOMContentLoaded fired');
    const initialized = await initFirebase();
    
    if (initialized) {
        // 리다이렉트 후 반환 결과 처리
        try {
            console.log(' Checking redirect result...');
            const result = await firebaseAuth.getRedirectResult();
            if (result.user) {
                console.log('✅ Sign-in successful:', result.user.email);
                updateStatus(`✅ 로그인 성공!\n\n${result.user.email}`, 'success');
                
                // popup.js로 메시지 전송 (로그인 완료 알림)
                try {
                    chrome.runtime.sendMessage({
                        action: 'firebase_signin_success',
                        user: {
                            uid: result.user.uid,
                            email: result.user.email,
                            displayName: result.user.displayName
                        }
                    }, (response) => {
                        console.log('📨 Message sent to popup:', response);
                    });
                } catch (e) {
                    console.log('💬 Popup not available (expected)');
                }
                
                setTimeout(() => window.close(), 2000);
                return;
            }
        } catch (e) {
            console.error('❌ getRedirectResult error:', e);
            console.error('Error code:', e.code);
            console.error('Error message:', e.message);
        }
        
        // 현재 로그인 상태 확인
        if (firebaseAuth.currentUser) {
            console.log('✅ User already signed in:', firebaseAuth.currentUser.email);
            updateStatus(`✅ 이미 로그인됨\n\n${firebaseAuth.currentUser.email}`, 'success');
            
            // popup.js로 메시지 전송
            try {
                chrome.runtime.sendMessage({
                    action: 'firebase_signin_success',
                    user: {
                        uid: firebaseAuth.currentUser.uid,
                        email: firebaseAuth.currentUser.email,
                        displayName: firebaseAuth.currentUser.displayName
                    }
                });
            } catch (e) {
                console.log('💬 Popup not available (expected)');
            }
            
            setTimeout(() => window.close(), 2000);
            return;
        }
        
        // URL 파라미터 확인
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        console.log('🔗 URL action:', action);
        
        if (action === 'signin') {
            // 자동으로 로그인 시작
            updateStatus('Google 계정을 선택해주세요...', 'loading');
            setTimeout(() => signIn(), 500);
        } else {
            // 수동 로그인 버튼 표시
            updateStatus('로그인 준비 완료', 'success');
            document.getElementById('actions').style.display = 'block';
            attachButtonEvents();
        }
    } else {
        document.getElementById('actions').style.display = 'block';
        attachButtonEvents();
    }
});

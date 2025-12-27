// Google Identity Helper Functions
// Uses Chrome Identity API to get user's Google account

// Google 사용자 정보 가져오기
async function getGoogleUserInfo() {
    debugLog('Starting Google authentication...');
    try {
        // OAuth 토큰 가져오기
        debugLog('Requesting OAuth token...');
        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    debugError('OAuth token error', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    debugLog('OAuth token received');
                    resolve(token);
                }
            });
        });

        // Google UserInfo API로 사용자 정보 가져오기
        debugLog('Fetching user info from Google API...');
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            debugError('Failed to get user info', new Error(`Status: ${response.status}`));
            throw new Error('Failed to get user info');
        }

        const userInfo = await response.json();
        debugSuccess(`Google login successful: ${userInfo.email}`);
        // userInfo: { id, email, name, picture, ... }
        return {
            email: userInfo.email,
            name: userInfo.name,
            id: userInfo.id,
            picture: userInfo.picture
        };
    } catch (error) {
        debugError('Google auth failed', error);
        throw new Error('Google 로그인이 필요합니다. Options에서 로그인해주세요.');
    }
}

// 캐시된 사용자 정보 가져오기 (빠른 접근)
async function getCachedUserEmail() {
    const result = await chrome.storage.local.get({ user_email: null, user_name: null });
    if (result.user_email) {
        debugLog(`Using cached user: ${result.user_email}`);
    } else {
        debugWarning('No cached user found');
    }
    return result.user_email;
}

// 사용자 정보 캐시
async function cacheUserInfo(userInfo) {
    debugLog(`Caching user info: ${userInfo.email}`);
    await chrome.storage.local.set({
        user_email: userInfo.email,
        user_name: userInfo.name,
        user_id: userInfo.id,
        user_picture: userInfo.picture
    });
    debugSuccess('User info cached successfully');
}

// 사용자 정보 초기화 (필요 시)
async function ensureUserInfo() {
    debugLog('Ensuring user info...');
    let email = await getCachedUserEmail();
    if (!email) {
        debugLog('No cached email, attempting non-interactive profile info...');
        try {
            const profile = await new Promise((resolve) => {
                if (chrome.identity && chrome.identity.getProfileUserInfo) {
                    chrome.identity.getProfileUserInfo((info) => resolve(info || {}));
                } else {
                    resolve({});
                }
            });
            if (profile && profile.email) {
                email = profile.email;
                debugLog(`Profile email obtained: ${email}`);
                await cacheUserInfo({ email, name: '', id: profile.id || '', picture: '' });
            }
        } catch (e) {
            debugWarning('Profile info not available');
        }
    }
    if (!email) {
        // Fallback: generate stable identifier without Google login
        const generated = crypto && crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2));
        email = `uid:${generated}`;
        debugLog(`Generated anonymous user identifier: ${email}`);
        await chrome.storage.local.set({ user_email: email });
        await chrome.storage.sync.set({ user_identifier: email });
    }
    debugLog(`User identifier confirmed: ${email}`);
    return email;
}

// 비로그인 사용자 식별자 가져오기 (우선 사용)
async function getUserIdentifier() {
    const s = await chrome.storage.sync.get({ user_identifier: '' });
    if (s.user_identifier) {
        debugLog(`Using stored identifier: ${s.user_identifier}`);
        return s.user_identifier;
    }
    const id = await ensureUserInfo();
    // ensureUserInfo already sets identifier when needed
    return id;
}

// 로그아웃
async function signOutGoogle() {
    debugLog('Starting logout process...');
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (!token) {
                debugLog('No token found, clearing cache');
                chrome.storage.local.remove(['user_email', 'user_name', 'user_id', 'user_picture']);
                debugSuccess('Logout complete (no token)');
                resolve();
                return;
            }
            
            debugLog('Removing cached token...');
            // 토큰 제거
            chrome.identity.removeCachedAuthToken({ token }, () => {
                debugLog('Revoking token from Google...');
                // Google에서 토큰 무효화
                fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
                    .then(() => {
                        debugLog('Clearing user cache...');
                        chrome.storage.local.remove(['user_email', 'user_name', 'user_id', 'user_picture']);
                        debugSuccess('Logout complete');
                        resolve();
                    })
                    .catch((error) => {
                        debugWarning('Token revoke failed, clearing cache anyway');
                        chrome.storage.local.remove(['user_email', 'user_name', 'user_id', 'user_picture']);
                        resolve();
                    });
            });
        });
    });
}

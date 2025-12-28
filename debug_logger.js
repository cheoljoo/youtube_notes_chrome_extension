// Debug Logger - 화면에 로그 출력
function debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // Console에도 출력
    console.log(logMessage);
    
    // 화면의 debug-log 영역에 출력
    const logDiv = document.getElementById('debug-log');
    if (logDiv) {
        const logEntry = document.createElement('div');
        logEntry.style.marginBottom = '4px';
        logEntry.style.paddingBottom = '4px';
        logEntry.style.borderBottom = '1px solid #e0e0e0';
        
        // 타입에 따라 색상 변경
        if (type === 'error') {
            logEntry.style.color = 'red';
            console.error(logMessage);
        } else if (type === 'success') {
            logEntry.style.color = 'green';
        } else if (type === 'warning') {
            logEntry.style.color = 'orange';
        }
        
        logEntry.textContent = logMessage;
        logDiv.appendChild(logEntry);
        
        // 최대 50개 로그만 유지
        while (logDiv.children.length > 50) {
            logDiv.removeChild(logDiv.firstChild);
        }
        
        // 최신 로그로 스크롤
        logDiv.scrollTop = logDiv.scrollHeight;
    }
}

// 에러를 로그로 표시
function debugError(message, error) {
    const errorMsg = error ? `${message}: ${error.message || error}` : message;
    debugLog(errorMsg, 'error');
    if (error && error.stack) {
        console.error('Stack trace:', error.stack);
    }
}

// 성공 메시지
function debugSuccess(message) {
    debugLog(message, 'success');
}

// 경고 메시지
function debugWarning(message) {
    debugLog(message, 'warning');
}

// 로그 초기화
function clearDebugLog() {
    const logDiv = document.getElementById('debug-log');
    if (logDiv) {
        logDiv.innerHTML = '';
    }
    debugLog('Log cleared');
}

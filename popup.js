document.getElementById('save').addEventListener('click', async ()=>{
document.addEventListener('DOMContentLoaded', function () {
    const tagsInput = document.getElementById('tags');
    const opinionInput = document.getElementById('opinion');
    const saveBtn = document.getElementById('save-btn');
    const notesList = document.getElementById('notes-list');

    // 노트 저장
    saveBtn.addEventListener('click', function () {
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
            url: ''
        };
        // 현재 탭의 URL 가져오기 (유튜브에서만 동작)
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url) {
                note.url = tabs[0].url;
            }
            chrome.storage.local.get({notes: []}, function(result) {
                const notes = result.notes;
                notes.unshift(note); // 최신순
                chrome.storage.local.set({notes}, function() {
                    tagsInput.value = '';
                    opinionInput.value = '';
                    renderNotes();
                });
            });
        });
    });

    // 노트 리스트 렌더링
    function renderNotes() {
        chrome.storage.local.get({notes: []}, function(result) {
            const notes = result.notes;
            if (notes.length === 0) {
                notesList.innerHTML = '<div>저장된 노트가 없습니다.</div>';
                return;
            }
            notesList.innerHTML = notes.map(note => `
                <div class="note-item">
                    <div class="tags">${note.tags.map(t => '#' + t).join(' ')}</div>
                    <div class="opinion">${note.opinion ? note.opinion : ''}</div>
                    <div style="font-size:0.8em;color:#888;">${note.url ? `<a href="${note.url}" target="_blank">링크</a> | ` : ''}${new Date(note.time).toLocaleString()}</div>
                </div>
            `).join('');
        });
    }

    renderNotes();
});

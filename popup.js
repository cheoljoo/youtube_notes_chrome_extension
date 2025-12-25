async function queryVideoInfo() {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab) return {error:'no-tab'};
  const resp = await chrome.scripting.executeScript({
    target:{tabId:tab.id},
    func: () => {
      try{
        const url = location.href;
        const title = document.querySelector('meta[property="og:title"]')?.content || document.title || '';
        const description = document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '';
        const vMatch = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
        const videoId = vMatch ? vMatch[1] : '';
        return {url,title,description,videoId};
      }catch(e){return {error:e.message}}
    }
  });
  return resp[0].result;
}

function renderMeta(meta){
  const el = document.getElementById('meta');
  if(meta.error) el.textContent = '영상 정보를 가져오지 못했습니다.';
  else el.innerHTML = `<strong>${meta.title}</strong><div style="font-size:12px;color:#444">${meta.description.slice(0,300)}</div>`;
}

async function loadTags() {
  const s = await chrome.storage.sync.get({tags:[]});
  return s.tags || [];
}

function renderTagList(tags){
  const container = document.getElementById('tags');
  container.innerHTML = '';
  if(tags.length===0) container.textContent = '태그 없음';
  tags.forEach(t=>{
    const cb = document.createElement('input'); cb.type='checkbox'; cb.value=t; cb.id='tg-'+t;
    const lbl = document.createElement('label'); lbl.className='tag'; lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' '+t));
    container.appendChild(lbl);
  });
}

document.getElementById('save').addEventListener('click', async ()=>{
  const status = document.getElementById('status'); status.textContent='처리 중...';
  const meta = await queryVideoInfo();
  const existing = Array.from(document.querySelectorAll('#tags input:checked')).map(i=>i.value);
  const newInput = document.getElementById('newTags').value.trim();
  const newTags = newInput? newInput.split(',').map(s=>s.trim()).filter(Boolean):[];
  const tags = [...new Set([...existing,...newTags])];
  const note = document.getElementById('note').value || '';

  chrome.runtime.sendMessage({action:'summarize_and_save', meta, tags, note}, (resp)=>{
    if(resp?.ok){ status.textContent='저장 완료'; }
    else status.textContent = '오류: '+(resp?.error||'Unknown');
  });
});

(async ()=>{
  const meta = await queryVideoInfo();
  renderMeta(meta);
  const tags = await loadTags();
  renderTagList(tags);
})();

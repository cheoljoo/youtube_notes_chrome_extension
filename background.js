chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  if(msg.action==='summarize_and_save'){
    handleSummarizeAndSave(msg).then(r=>sendResponse(r)).catch(e=>sendResponse({error:e.message}));
    return true;
  }
});

async function handleSummarizeAndSave({meta,tags,note}){
  const settings = await chrome.storage.sync.get({
    gemini_api_key:'', gemini_model:'text-bison-001', spreadsheetId:'', sheetRange:'Sheet1!A:D', api_type:'palm'
  });

  // Build prompt
  const parts = [];
  parts.push('Title: '+(meta.title||''));
  parts.push('Description: '+(meta.description||''));
  parts.push('URL: '+(meta.url||''));
  const prompt = `다음 유튜브 정보를 한국어로 간결하게 요약해줘:\n\n${parts.join('\n\n')}`;

  let summary = '';
  try{
    if(settings.api_type === 'palm'){
      // PaLM generative endpoint (requires API key)
      const model = settings.gemini_model || 'text-bison-001';
      const url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateText?key=${encodeURIComponent(settings.gemini_api_key)}`;
      const body = {prompt:{text:prompt}, maxOutputTokens:500};
      const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j = await res.json();
      summary = j?.candidates?.[0]?.content || j?.outputText || JSON.stringify(j);
    }else{
      // Generic endpoint: user must provide gemini_endpoint in spreadsheetId field? fallback
      throw new Error('지원하지 않는 Gemini API 타입입니다. 옵션에서 설정을 확인하세요.');
    }
  }catch(e){
    return {error:'Gemini 요약 실패: '+e.message};
  }

  // Append to Google Sheets
  try{
    const token = await new Promise((resolve, reject)=>{
      chrome.identity.getAuthToken({interactive:true}, (t)=>{ if(chrome.runtime.lastError) reject(chrome.runtime.lastError); else resolve(t); });
    });

    const now = new Date().toISOString();
    const values = [[now, tags.join(','), note, summary]];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${settings.spreadsheetId}/values/${encodeURIComponent(settings.sheetRange)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url,{
      method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body: JSON.stringify({values})
    });
    if(!res.ok){
      const txt = await res.text();
      throw new Error('Sheets API 오류: '+txt);
    }
  }catch(e){
    return {error:'스프레드시트 저장 실패: '+e.message};
  }

  // Persist any new tags locally
  try{
    const s = await chrome.storage.sync.get({tags:[]});
    const current = s.tags || [];
    const add = tags.filter(t=>!current.includes(t));
    if(add.length>0){
      const merged = [...current, ...add];
      await chrome.storage.sync.set({tags:merged});
    }
  }catch(e){}

  return {ok:true};
}

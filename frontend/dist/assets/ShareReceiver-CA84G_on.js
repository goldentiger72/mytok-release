import{a as e}from"./index-B54xd5Mb.js";async function t(t,a){let{title:o,text:s,url:c}=a,l=[o,s,c].filter(Boolean).join(`
`).trim();c&&s&&s.includes(c)&&(l=[o,s].filter(Boolean).join(`
`).trim());try{await e.getMe()}catch(e){if(!e.status){n(t,a);return}sessionStorage.setItem(`pending_share`,JSON.stringify(a)),window.location.href=`/auth/google`;return}let u=[];try{u=await e.getRooms()}catch{}t.innerHTML=`
    <div class="share-receiver" id="share-receiver">
      <div class="share-header">
        <button class="share-back" id="share-back" title="뒤로">←</button>
        <span class="share-header-title">MyTok으로 공유</span>
      </div>

      <div class="share-preview">
        <div class="share-preview-label">공유된 내용</div>
        <div class="share-preview-content" id="share-content-preview" style="display:none;margin-bottom:8px;padding:8px;background:var(--color-surface2);border-radius:var(--radius-sm);font-size:12px;"></div>
        <textarea
          id="share-edit"
          class="share-edit"
          rows="4"
          placeholder="메시지를 편집하세요..."
        >${r(l)}</textarea>
        
        <div class="share-obsidian-save-section" style="margin-top:12px;display:flex;gap:8px;">
          <input type="text" id="share-obsidian-path" class="share-edit" style="flex:1;padding:6px 10px;font-size:12px;" value="Inbox/Clip_${new Date().toISOString().slice(0,10)}.md" placeholder="Obsidian 저장 경로 (Inbox/Clip.md)" />
          <button id="share-obsidian-save-btn" style="background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-sm);padding:0 12px;font-size:12px;cursor:pointer;white-space:nowrap;">Obsidian 저장</button>
        </div>
      </div>

      <div class="share-rooms-label">전송할 채팅방 선택</div>
      <div class="share-room-list" id="share-room-list">
        ${u.length===0?`<p class="share-no-rooms">참여 중인 채팅방이 없습니다.</p>`:u.map(e=>`
            <button class="share-room-item" data-room-id="${e.id}" data-room-name="${r(e.name)}">
              <span class="share-room-icon">${e.isBot?`🤖`:`💬`}</span>
              <span class="share-room-name">${r(e.name)}</span>
              <span class="share-room-arrow">›</span>
            </button>
          `).join(``)}
      </div>

      <div id="share-status" class="share-status" style="display:none"></div>
    </div>
  `,document.getElementById(`share-back`).addEventListener(`click`,()=>{window.history.replaceState({},``,`/`),window.location.reload()});let d=document.getElementById(`share-edit`),f=document.getElementById(`share-content-preview`),p=async()=>{let t=d.value.match(/\[\[(.*?)\]\]/);if(t){let n=t[1].trim();try{let t=await e.get(`/api/obsidian/search?q=${encodeURIComponent(n)}`);t&&t.length>0?(f.innerHTML=`🔗 <strong>Obsidian 연동 감지</strong>: <a href="obsidian://open?file=${encodeURIComponent(t[0].path)}" target="_blank" style="color:var(--color-primary);text-decoration:underline;">${t[0].title}</a> (${t[0].path})`,f.style.display=`block`):(f.innerHTML=`⚠️ <strong>Obsidian 연동 감지</strong>: '${n}' 노트를 찾을 수 없습니다.`,f.style.display=`block`)}catch{f.innerHTML=`⚠️ <strong>Obsidian 연결 불가</strong>: Local REST API 상태를 확인하세요.`,f.style.display=`block`}}else f.style.display=`none`};d.addEventListener(`input`,p),p(),document.getElementById(`share-obsidian-save-btn`).addEventListener(`click`,async()=>{let t=document.getElementById(`share-obsidian-path`).value.trim(),n=d.value.trim();if(!t||!n)return;let r=document.getElementById(`share-obsidian-save-btn`);r.disabled=!0,r.textContent=`저장 중…`;try{await e.post(`/api/obsidian/save`,{messageId:0,path:t,content:n}),alert(`Obsidian 저장 완료!\n경로: ${t}`),r.textContent=`저장 완료`}catch(e){alert(`Obsidian 저장 실패: ${e.message}`),r.disabled=!1,r.textContent=`Obsidian 저장`}}),document.getElementById(`share-room-list`).addEventListener(`click`,async t=>{let n=t.target.closest(`.share-room-item`);if(!n)return;let r=n.dataset.roomId,a=n.dataset.roomName,o=document.getElementById(`share-edit`).value.trim();if(o){document.querySelectorAll(`.share-room-item`).forEach(e=>e.disabled=!0),i(`전송 중…`,`info`);try{await e.post(`/api/rooms/${r}/messages`,{content:o}),i(`✅ "${a}"에 전송했습니다`,`success`),setTimeout(()=>{window.history.replaceState({},``,`/`),window.location.hash=`#/rooms/${r}`,window.location.reload()},1500)}catch(e){i(`❌ 전송 실패: ${e.message}`,`error`),document.querySelectorAll(`.share-room-item`).forEach(e=>e.disabled=!1)}}})}function n(e,t){encodeURIComponent(JSON.stringify(t)),e.innerHTML=`
    <div class="share-receiver" id="share-receiver">
      <div class="share-header">
        <span class="share-header-title">MyTok으로 공유</span>
      </div>
      <div style="text-align:center; padding:48px 24px;">
        <div style="font-size:56px; margin-bottom:20px;">📡</div>
        <p style="color:var(--color-text-muted); line-height:1.7; margin-bottom:28px;">
          서버에 연결할 수 없습니다.<br>
          MyTok 서버가 켜져 있는지 확인 후 다시 시도해 주세요.
        </p>
        <button
          onclick="location.reload()"
          style="background:var(--color-primary);color:#fff;border:none;border-radius:10px;padding:12px 28px;font-size:15px;cursor:pointer;"
        >다시 시도</button>
      </div>
    </div>
  `}function r(e){return(e||``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function i(e,t){let n=document.getElementById(`share-status`);n&&(n.textContent=e,n.className=`share-status share-status--${t}`,n.style.display=`block`)}export{t as renderShareReceiver};
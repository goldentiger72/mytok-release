const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ThreadPanel-BfJcnpvg.js","assets/clipboard-B0h1njb3.js","assets/index-BR4L0M2t.js","assets/index-DgSn4MXj.css"])))=>i.map(i=>d[i]);
import{a as e,i as t,n,o as r,s as i,t as a}from"./clipboard-B0h1njb3.js";import{a as o,i as s,n as c,r as l,t as u}from"./index-BR4L0M2t.js";var d=class{constructor(t,n,i){this.container=t,this.roomId=n,this.currentUser=i,this.messages=[],this.hasMore=!1,this.loading=!1,m(),this._unsubNew=r(`new_message`,({message:t})=>{t.roomId==n&&(t.isBot&&this._hideTyping(),this.messages.push(t),this._appendMessage(t),this._scrollToBottom(),t.senderId!==i.id&&e(t.id,n))}),this._unsubTyping=r(`bot_typing`,({roomId:e,botName:t,on:r,parentMessageId:i})=>{e==n&&(i||(r?this._showTyping(t):this._hideTyping()))}),this._unsubRead=r(`read_updated`,({messageId:e,unreadCount:t})=>{let n=this.messages.find(t=>t.id===e);n&&(n.readStatus={...n.readStatus,value:t,isRead:t===0},this._updateReadStatus(e,n.readStatus))}),this._connectedOnce=!1,this._unsubReconnect=r(`connect`,()=>{this._connectedOnce&&this._render(),this._connectedOnce=!0}),this._render()}_showTyping(e){this.typingEl&&(this.typingEl.innerHTML=`
      <span class="typing-label">🤖 ${f(e||`봇`)} 응답 작성 중</span>
      <span class="typing-dots"><i></i><i></i><i></i></span>
    `,this.typingEl.style.display=`flex`,this._scrollToBottom(),clearTimeout(this._typingTimer),this._typingTimer=setTimeout(()=>this._hideTyping(),12e4))}_hideTyping(){clearTimeout(this._typingTimer),this.typingEl&&(this.typingEl.style.display=`none`,this.typingEl.innerHTML=``)}async _render(){this.container.innerHTML=`
      <div class="message-list" id="msg-list-inner"></div>
      <div class="bot-typing" id="bot-typing-${this.roomId}" style="display:none;"></div>
    `,this.listEl=document.getElementById(`msg-list-inner`),this.typingEl=document.getElementById(`bot-typing-${this.roomId}`),this.listEl.addEventListener(`scroll`,()=>{this.listEl.scrollTop===0&&this.hasMore&&!this.loading&&this._loadMore()}),await this._loadMessages(),this._scrollToBottom()}async _loadMessages(t=null){this.loading=!0;try{let{messages:n,hasMore:r}=await o.getMessages(this.roomId,t);if(this.hasMore=r,t){let e=this.listEl.scrollHeight;this.messages=[...n,...this.messages],n.forEach(e=>{let t=this._buildMessageEl(e);this.listEl.insertBefore(t,this.listEl.firstChild)}),this.listEl.scrollTop=this.listEl.scrollHeight-e}else this.messages=n,this.listEl.innerHTML=``,n.forEach(e=>this._appendMessage(e)),n.forEach(t=>{t.senderId!==this.currentUser.id&&e(t.id,this.roomId)})}catch(e){console.error(`메시지 로드 실패`,e)}this.loading=!1}_loadMore(){let e=this.messages[0];e&&this._loadMessages(e.id)}_appendMessage(e){let t=this._buildMessageEl(e);this.listEl.appendChild(t)}_buildMessageEl(e){let t=e.senderId===this.currentUser.id,r=document.createElement(`div`);r.className=`message-group${t?` mine`:``}`,r.dataset.messageId=e.id;let i=this._readStatusHtml(e),a=this._attachmentHtml(e.attachment),o=new Date(e.sentAt).toLocaleTimeString(`ko-KR`,{hour:`2-digit`,minute:`2-digit`}),s=e.threadCount>0?`<div class="msg-thread-indicator" style="margin-top:6px; cursor:pointer; color:var(--color-primary); font-size:0.8125rem; font-weight:bold; display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,0,0,36.82,176.5L25.66,219.87a16,16,0,0,0,19.51,19.51l43.37-11.16A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-5.83-.68l-44.33,11.4,11.4-44.33a8,8,0,0,0-.68-5.83A88,88,0,1,1,128,216ZM92,128a12,12,0,1,1,12,12A12,12,0,0,1,92,128Zm48,0a12,12,0,1,1,12,12A12,12,0,0,1,140,128Zm48,0a12,12,0,1,1,12,12A12,12,0,0,1,188,128Z"></path></svg> 답글 ${e.threadCount}개</div>`:``,u=l(),d=n(e.content),p=u.easyGlossary?c(d):d;r.innerHTML=`
      ${t?``:`<div class="msg-avatar">${(e.senderName||`?`)[0]}</div>`}
      <div class="msg-body">
        ${t?``:`<div class="msg-name">${f(e.senderName||``)}</div>`}
        <div class="msg-bubble">
          ${p}
          ${a}
          ${s}
        </div>
        <div class="msg-meta" style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
          <span class="msg-time">${o}</span>
          <span class="msg-thread-btn" style="cursor:pointer; color:var(--color-primary); font-size:0.75rem; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px; padding: 2px 4px; border-radius: 4px; transition: background 0.1s;">
            <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,0,0,36.82,176.5L25.66,219.87a16,16,0,0,0,19.51,19.51l43.37-11.16A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-5.83-.68l-44.33,11.4,11.4-44.33a8,8,0,0,0-.68-5.83A88,88,0,1,1,128,216ZM92,128a12,12,0,1,1,12,12A12,12,0,0,1,92,128Zm48,0a12,12,0,1,1,12,12A12,12,0,0,1,140,128Zm48,0a12,12,0,1,1,12,12A12,12,0,0,1,188,128Z"></path></svg>
            답글
          </span>
          <span class="msg-share-btn" style="cursor:pointer; color:var(--color-primary); font-size:0.75rem; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px; padding: 2px 4px; border-radius: 4px; transition: background 0.1s;">
            <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M184,160a39.9,39.9,0,0,0-30.8,14.43l-45-25.72a40.16,40.16,0,0,0,0-41.42l45-25.72a40,40,0,1,0-8-14l-45,25.72a40,40,0,1,0,0,59.42l45,25.72A40,40,0,1,0,184,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,184,32ZM72,104a24,24,0,1,1-24,24A24,24,0,0,1,72,104Zm112,120a24,24,0,1,1,24-24A24,24,0,0,1,184,224Z"></path></svg>
            공유
          </span>
          <span class="msg-read-status" data-message-id="${e.id}">${i}</span>
        </div>
      </div>
    `;let m=()=>{document.dispatchEvent(new CustomEvent(`open_thread`,{detail:{message:e,roomId:this.roomId}}))};return r.querySelector(`.msg-thread-btn`)?.addEventListener(`click`,m),r.querySelector(`.msg-thread-indicator`)?.addEventListener(`click`,m),r.querySelector(`.msg-share-btn`)?.addEventListener(`click`,()=>this._shareMessage(e)),r}_readStatusHtml(e){if(!e.readStatus)return``;let{type:t,isRead:n,value:r}=e.readStatus;return e.senderId===this.currentUser.id?t===`direct`?n?`<span class="msg-read">읽음</span>`:``:r>0?`<span class="msg-unread-count">${r}</span>`:``:``}_attachmentHtml(e){if(!e)return``;let t=f(e.originalName||`파일`),n=f(e.url);return e.mimeType?.startsWith(`image/`)?`
        <div class="msg-attachment msg-attachment-image">
          <img src="${n}" alt="${t}" loading="lazy"
               class="msg-img-thumb"
               data-lb-src="${n}" data-lb-alt="${t}"
               onclick="window.__openLightbox(this.dataset.lbSrc, this.dataset.lbAlt)" />
        </div>`:`
      <div class="msg-attachment msg-attachment-file">
        <a class="file-link" href="${n}" target="_blank" rel="noopener" download="${t}" style="display:inline-flex; align-items:center; gap:4px;">
          <i class="ph ph-paperclip"></i> ${t}${e.sizeBytes?` (${p(e.sizeBytes)})`:``}
        </a>
      </div>`}_updateReadStatus(e,t){let n=this.listEl.querySelector(`[data-message-id="${e}"] .msg-read-status`);n&&(n.innerHTML=this._readStatusHtml({readStatus:t,senderId:this.currentUser.id}))}_scrollToBottom(){this.listEl&&(this.listEl.scrollTop=this.listEl.scrollHeight)}destroy(){this._unsubNew?.(),this._unsubRead?.(),this._unsubReconnect?.(),this._unsubTyping?.(),clearTimeout(this._typingTimer),clearTimeout(this._toastTimer)}async _shareMessage(e){let t=`[${e.senderName||`알 수 없음`}] ${e.content}`;if(navigator.share)try{await navigator.share({title:`MyTok 메시지 공유`,text:t,url:window.location.href})}catch(e){e.name!==`AbortError`&&(console.error(`공유 실패:`,e),this._copyToClipboardFallback(t))}else this._copyToClipboardFallback(t)}async _copyToClipboardFallback(e){await a(e)?this._showToast(`클립보드에 복사되었습니다.`):alert(`복사에 실패했습니다.`)}_showToast(e){let t=document.getElementById(`mytok-toast`);t||(t=document.createElement(`div`),t.id=`mytok-toast`,document.body.appendChild(t)),t.textContent=e,t.className=`mytok-toast show`,clearTimeout(this._toastTimer),this._toastTimer=setTimeout(()=>{t.className=`mytok-toast`},2e3)}};function f(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}function p(e){return e<1024?`${e}B`:e<1024*1024?`${(e/1024).toFixed(1)}KB`:`${(e/1024/1024).toFixed(1)}MB`}function m(){if(document.getElementById(`img-lightbox`))return;let e=document.createElement(`div`);e.id=`img-lightbox`,e.setAttribute(`role`,`dialog`),e.setAttribute(`aria-modal`,`true`),e.innerHTML=`
    <div class="lb-backdrop"></div>
    <button class="lb-close" aria-label="닫기">✕</button>
    <div class="lb-content">
      <img class="lb-img" src="" alt="" />
    </div>
  `,document.body.appendChild(e);let t=e.querySelector(`.lb-img`),n=()=>{e.classList.contains(`active`)&&(e.classList.remove(`active`),t.src=``,history.state?.__lb&&history.back())};e.querySelector(`.lb-backdrop`).addEventListener(`click`,n),e.querySelector(`.lb-close`).addEventListener(`click`,n),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&n()}),window.addEventListener(`popstate`,n=>{e.classList.contains(`active`)&&(e.classList.remove(`active`),t.src=``)});let r=0;e.addEventListener(`touchstart`,e=>{r=e.touches[0].clientY},{passive:!0}),e.addEventListener(`touchend`,e=>{e.changedTouches[0].clientY-r>80&&n()},{passive:!0}),window.__openLightbox=(n,r=``)=>{t.src=n,t.alt=r,e.classList.add(`active`),history.pushState({__lb:!0},``)}}var h=class{constructor(e,t){this.container=e,this.roomId=t,this._render()}_render(){this.container.innerHTML=`
      <div class="message-input-area">
        <div id="attach-preview-${this.roomId}" class="attach-preview" style="display:none;"></div>
        <div class="message-input-row">
          <button class="attach-btn" id="tool-btn-${this.roomId}" title="사진 선택" style="color: var(--color-text);">
            <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM156,88a12,12,0,1,1-12,12A12,12,0,0,1,156,88Zm60,112H40V165.66l46.34-46.35a8,8,0,0,1,11.32,0L144,165.66l22.34-22.35a8,8,0,0,1,11.32,0L216,181.66Z"></path></svg>
          </button>
          <button class="attach-btn" id="attach-btn-${this.roomId}" title="파일 첨부" style="color: var(--color-text);">
            <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.22-79.21l101.27-101.27a40,40,0,1,1,56.57,56.57L104.9,193.09a24,24,0,0,1-33.94-33.94l82.05-82a8,8,0,0,1,11.32,11.32l-82,82a8,8,0,1,0,11.32,11.32l101.27-101.31a24,24,0,1,0-33.94-33.94L43.66,147.88a40,40,0,1,0,56.57,56.57l82-82.09A8,8,0,0,1,209.66,122.34Z"></path></svg>
          </button>
          <input type="file" id="file-input-${this.roomId}" accept="image/*,video/*,*/*" style="display:none" />
          <textarea
            id="msg-input-${this.roomId}"
            class="input-textarea"
            placeholder="메시지를 입력하거나 말해 주세요..."
            rows="1"
          ></textarea>
          <button class="attach-btn" id="voice-btn-${this.roomId}" title="음성으로 말하기" style="background: var(--color-surface2); color: var(--color-primary); display: inline-flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm112,64a8,8,0,0,1-16,0,64,64,0,0,0-128,0,8,8,0,0,1-16,0,80.11,80.11,0,0,0,72,79.6V224H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16H144v16.4a80.11,80.11,0,0,0,72-79.6Z"></path></svg>
          </button>
          <button class="send-btn" id="msg-send-${this.roomId}" title="메시지 보내기" style="display: inline-flex; align-items: center; justify-content: center; color: #1a160c;">
            <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M228.44,111.45,44.87,31.78A16,16,0,0,0,22,46.06l16.12,64.48a16,16,0,0,0,13,11.83L128,128l-76.93,5.63a16,16,0,0,0-13,11.83L22,209.94a16,16,0,0,0,22.86,14.28l183.57-79.67A16,16,0,0,0,228.44,111.45ZM218.83,133.5l-183.57,79.67c-.2.09-.4.18-.6.27L50.77,149,144,136a8,8,0,0,0,0-16L50.77,107l-16.11-64.4.6.27,183.57,79.67a8,8,0,0,1,0,14.94Z"></path></svg>
          </button>
        </div>
      </div>
    `;let e=document.getElementById(`msg-input-${this.roomId}`),t=document.getElementById(`msg-send-${this.roomId}`),n=document.getElementById(`attach-btn-${this.roomId}`),r=document.getElementById(`file-input-${this.roomId}`),a=document.getElementById(`attach-preview-${this.roomId}`),s=null,c=()=>{let t=e.value.trim();t&&(i(this.roomId,t),e.value=``,e.style.height=`auto`)},l=e=>{let t=(e.size/1024).toFixed(1)+` KB`,n=e.type.startsWith(`image/`)?`<img src="${URL.createObjectURL(e)}" style="max-height:80px;border-radius:6px;" />`:`<span style="font-size:24px;color:var(--color-text-muted);"><i class="ph ph-paperclip"></i></span>`;a.innerHTML=`
        ${n}
        <span class="file-info">${g(e.name)} (${t})</span>
        <button class="attach-cancel" id="cancel-attach-${this.roomId}">✕</button>
      `,a.style.display=`flex`,document.getElementById(`cancel-attach-${this.roomId}`)?.addEventListener(`click`,()=>{s=null,r.value=``,a.style.display=`none`,a.innerHTML=``})},u=async()=>{if(!s)return;let e=s;s=null,t.disabled=!0,n.disabled=!0,a.innerHTML=`
        <span class="upload-spinner"></span>
        <span class="file-info">${g(e.name)} 보내는 중…</span>
      `,a.style.display=`flex`;let i=new FormData;i.append(`file`,e);try{await o.uploadFile(this.roomId,i),a.style.display=`none`,a.innerHTML=``,r.value=``}catch(t){alert(`업로드 실패: ${t.message}`),s=e,l(e)}finally{t.disabled=!1,n.disabled=!1}};e.addEventListener(`keydown`,e=>{e.isComposing||e.key===`Enter`&&!e.shiftKey&&(e.preventDefault(),s?u():c())}),e.addEventListener(`input`,()=>{e.style.height=`auto`,e.style.height=Math.min(e.scrollHeight,140)+`px`}),t.addEventListener(`click`,()=>{s?u():c()});let d=document.getElementById(`tool-btn-${this.roomId}`),f=document.getElementById(`voice-btn-${this.roomId}`);d?.addEventListener(`click`,()=>{alert(`도구 메뉴가 곧 준비됩니다. 에이전트 확장 도구 설정을 확인해 보세요.`)}),f?.addEventListener(`click`,()=>{e.value=`안녕하세요, 음성으로 말하고 있습니다. (인식 완료)`,e.style.height=`auto`,e.style.height=e.scrollHeight+`px`,e.focus()}),n.addEventListener(`click`,()=>r.click());let p=e=>{let t=e.files[0];if(!t)return;let n=t.type.startsWith(`image/`)?10*1024*1024:50*1024*1024;if(t.size>n){let n=t.type.startsWith(`image/`)?`10MB`:`50MB`;alert(`파일 크기가 ${n}를 초과합니다.`),e.value=``;return}s=t,l(t)};r.addEventListener(`change`,()=>p(r))}};function g(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}var _=class{constructor(e,t,n){this.container=e,this.roomId=t,this.user=n,this.room=null,this.msgList=null,this.threadPanel=null,this._onOpenThread=e=>{e.detail.roomId===this.roomId&&this._openThread(e.detail.message)},document.addEventListener(`open_thread`,this._onOpenThread),this._unsubRoomUpdated=r(`room_updated`,({roomId:e,name:t})=>{if(e===this.roomId&&this.room){this.room.name=t;let n=document.getElementById(`chat-room-name-${this.roomId}`);n&&(n.textContent=t);let r=document.querySelector(`.room-item[data-room-id="${e}"] .room-name`);r&&(r.textContent=t)}}),this._load()}async _load(){try{this.room=await o.getRoom(this.roomId),this._render(this.room),t(this.roomId)}catch(e){this.container.innerHTML=`<p class="error">채팅방을 열 수 없습니다: ${e.message}</p>`}}_render(e){let t=this.user.isOwner;this.container.innerHTML=`
      <div class="chat-room-layout" style="display:flex;width:100%;height:100%;overflow:hidden;position:relative;">
        <div class="chat-room-main" style="flex:1;display:flex;flex-direction:column;height:100%;overflow:hidden;">
          <div class="chat-header">
            <div class="chat-header-left">
              <button class="mobile-hamburger" id="mobile-hamburger" title="채널 목록">☰</button>
              <span id="chat-room-name-${this.roomId}" class="chat-header-name">${v(e.name||`채팅`)}</span>
              <span class="chat-header-count">${e.members?.length??0}명</span>
            </div>
            ${t?`
              <button class="room-edit-btn" id="room-edit-btn-${this.roomId}" title="채팅방 이름 수정">✏️</button>
            `:``}
          </div>
          <div id="msg-list-wrap-${this.roomId}" style="flex:1;overflow:hidden;display:flex;flex-direction:column;border-right:1px solid var(--color-border);"></div>
          <div id="msg-input-wrap-${this.roomId}"></div>
        </div>
        <!-- 구분 Resizer 바 (US3) -->
        <div class="thread-resizer" id="thread-resizer-${this.roomId}" style="width:4px;cursor:col-resize;background:transparent;height:100%;transition:background 0.2s;display:none;flex-shrink:0;z-index:10;user-select:none;"></div>
        
        <div class="chat-room-thread" id="chat-room-thread-${this.roomId}" style="width:450px;height:100%;display:none;flex-shrink:0;background:var(--color-bg);border-left:1px solid var(--color-border);position:relative;"></div>
      </div>
    `,document.getElementById(`mobile-hamburger`)?.addEventListener(`click`,()=>{document.querySelector(`.sidebar`)?.classList.toggle(`open`),document.getElementById(`sidebar-overlay`)?.classList.toggle(`active`)}),t&&document.getElementById(`room-edit-btn-${this.roomId}`).addEventListener(`click`,()=>this._showRenameModal(e));let n=document.getElementById(`msg-list-wrap-${this.roomId}`),r=document.getElementById(`msg-input-wrap-${this.roomId}`);this.msgList?.destroy(),this.msgList=new d(n,this.roomId,this.user),new h(r,this.roomId);let i=document.getElementById(`thread-resizer-${this.roomId}`),a=document.getElementById(`chat-room-thread-${this.roomId}`);if(i&&a){let e=!1;i.addEventListener(`mousedown`,t=>{e=!0,i.classList.add(`resizing`),document.body.style.cursor=`col-resize`,t.preventDefault()});let t=t=>{if(!e)return;let n=this.container.getBoundingClientRect(),r=n.right-t.clientX;r>350&&r<n.width*.6&&(a.style.width=`${r}px`)},n=()=>{e&&(e=!1,i.classList.remove(`resizing`),document.body.style.cursor=``)};document.addEventListener(`mousemove`,t),document.addEventListener(`mouseup`,n),this._cleanupResizer=()=>{document.removeEventListener(`mousemove`,t),document.removeEventListener(`mouseup`,n)}}}async _showRenameModal(e){let t=[];try{t=await o.getCategories()}catch{}let n=document.createElement(`div`);n.className=`modal-overlay`,n.innerHTML=`
      <div class="modal" style="max-width:340px;">
        <div class="modal-header">
          <h2 class="modal-title">채팅방 설정 수정</h2>
          <button class="modal-close" id="rename-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">채팅방 이름</label>
            <input class="form-input" id="rename-input" type="text"
              value="${v(e.name||``)}" maxlength="50" placeholder="채팅방 이름 입력" />
          </div>
          <div class="form-group">
            <label class="form-label">카테고리</label>
            <select class="form-input" id="rename-cat-select">
              <option value="">카테고리 지정 안함</option>
              ${t.map(t=>`
                <option value="${t.id}" ${e.categoryId==t.id?`selected`:``}>
                  ${v(t.name)}
                </option>
              `).join(``)}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-cancel" id="rename-cancel">취소</button>
          <button class="modal-btn-create" id="rename-confirm">저장</button>
        </div>
      </div>
    `,document.body.appendChild(n);let r=document.getElementById(`rename-input`);r.focus(),r.select();let i=()=>n.remove();document.getElementById(`rename-close`).addEventListener(`click`,i),document.getElementById(`rename-cancel`).addEventListener(`click`,i),n.addEventListener(`click`,e=>{e.target===n&&i()}),r.addEventListener(`keydown`,e=>{e.key===`Enter`&&document.getElementById(`rename-confirm`).click(),e.key===`Escape`&&i()}),document.getElementById(`rename-confirm`).addEventListener(`click`,async()=>{let e=r.value.trim();if(!e){r.focus();return}let t=document.getElementById(`rename-cat-select`)?.value||null,n=document.getElementById(`rename-confirm`);n.disabled=!0,n.textContent=`저장 중…`;try{await Promise.all([o.renameRoom(this.roomId,e),o.assignCategory(this.roomId,t).catch(()=>{})]),i(),document.dispatchEvent(new CustomEvent(`rooms_changed`))}catch(e){alert(`저장 실패: ${e.message}`),n.disabled=!1,n.textContent=`저장`}})}async _openThread(e){let t=document.getElementById(`chat-room-thread-${this.roomId}`),n=document.getElementById(`thread-resizer-${this.roomId}`);if(!t)return;n&&(n.style.display=`block`),t.style.display=`block`,t.classList.add(`mobile-thread-open`);let r=this.container.getBoundingClientRect().width,i=Math.max(350,Math.round(r/2.5));t.style.width=`${i}px`;let{ThreadPanel:a}=await u(async()=>{let{ThreadPanel:e}=await import(`./ThreadPanel-BfJcnpvg.js`);return{ThreadPanel:e}},__vite__mapDeps([0,1,2,3]));this.threadPanel&&this.threadPanel.destroy(),this.threadPanel=new a(t,this.roomId,e,()=>{n&&(n.style.display=`none`),t.style.display=`none`,t.classList.remove(`mobile-thread-open`),this.threadPanel=null})}destroy(){this._unsubRoomUpdated?.(),this.msgList?.destroy(),this.threadPanel&&this.threadPanel.destroy(),this._cleanupResizer?.(),document.removeEventListener(`open_thread`,this._onOpenThread)}};function v(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}var y=class{constructor({container:e,rooms:t,onClose:n}){this.container=e,this.rooms=t,this.onClose=n,this.bots=[],this._render(),this._load()}async _load(){try{let[e,t,n]=await Promise.all([o.getRooms(),o.getBots(),o.getAgentTasks().catch(()=>[])]);this.rooms=e,this.bots=t,this.agentTasks=n,this._renderRoomSelect(),this._renderBotList(),this._renderAgentTasks()}catch{this._showError(`데이터를 불러오지 못했습니다.`)}}_renderRoomSelect(){let e=this.container.querySelector(`#bm-room-select`);if(!e)return;let t=e.value;e.innerHTML=`<option value="">채팅방 선택</option>
      ${(this.rooms||[]).map(e=>`<option value="${e.id}">${b(e.name||`(이름 없음)`)}</option>`).join(``)}`,t&&this.rooms.some(e=>String(e.id)===t)&&(e.value=t)}_render(){this.container.innerHTML=`
      <div class="bot-manager-overlay" id="bot-manager-overlay">
        <div class="bot-manager-modal">
          <div class="bot-manager-header">
            <h2>🤖 봇 관리</h2>
            <button class="bot-manager-close" id="btn-close-bm">✕</button>
          </div>

          <div class="bot-manager-body">
            <!-- 봇 생성 폼 -->
            <div class="bm-create-section">
              <h3>새 봇 추가</h3>
              <div class="bm-form">
                <input type="text" id="bm-bot-name" placeholder="봇 이름 (예: Hermes AI)" maxlength="50" />
                <select id="bm-room-select">
                  <option value="">채팅방 선택</option>
                  ${(this.rooms||[]).map(e=>`<option value="${e.id}">${b(e.name||`(이름 없음)`)}</option>`).join(``)}
                </select>
                <select id="bm-ai-type">
                  <option value="hermes">🧠 Hermes Agent</option>
                  <option value="claude">✨ Claude (Anthropic API)</option>
                  <option value="claude-code">💻 Claude Code</option>
                  <option value="openclaw">🦞 OpenClaw Agent</option>
                </select>
                <div id="bm-privacy-warning" class="bm-privacy-warning" style="display:none">
                  ⚠️ 이 채팅방의 메시지는 Anthropic AI 서버로 전송됩니다.
                </div>
                <button class="btn-primary" id="btn-create-bot">
                  <span class="btn-icon">✨</span> 봇 생성하기
                </button>
              </div>
            </div>

            <!-- 토큰 표시 (1회) -->
            <div id="bm-token-display" class="bm-token-display" style="display:none">
              <p>✅ 봇이 생성되었습니다. 아래 토큰을 Bridge 스크립트 <code>.env</code> 파일에 저장하세요.</p>
              <p class="bm-token-warning">⚠️ 이 토큰은 지금만 표시됩니다. 반드시 복사해두세요!</p>
              <div class="bm-token-row">
                <code id="bm-token-value" class="bm-token-value"></code>
                <button class="btn-copy" id="btn-copy-token">📋 복사</button>
              </div>
            </div>

            <!-- 봇 목록 -->
            <div class="bm-list-section">
              <h3>봇 목록</h3>
              <div id="bm-bot-list" class="bm-bot-list">
                <span class="bm-loading">로딩 중...</span>
              </div>
            </div>

            <!-- A2A 협업 대시보드 (US1) -->
            <div class="bm-list-section" style="margin-top:20px;border-top:1px solid var(--color-border);padding-top:16px;">
              <h3>A2A 협업 태스크 현황</h3>
              <div id="bm-a2a-list" class="bm-bot-list" style="max-height:160px;overflow-y:auto;">
                <span class="bm-loading">로딩 중...</span>
              </div>
            </div>
          </div>

          <div id="bm-error" class="bm-error" style="display:none"></div>
        </div>
      </div>`,this.container.querySelector(`#btn-close-bm`).addEventListener(`click`,()=>this.destroy()),this.container.querySelector(`#bot-manager-overlay`).addEventListener(`click`,e=>{e.target.id===`bot-manager-overlay`&&this.destroy()}),this.container.querySelector(`#bm-ai-type`).addEventListener(`change`,e=>{let t=this.container.querySelector(`#bm-privacy-warning`);t.style.display=e.target.value===`claude`?`block`:`none`}),this.container.querySelector(`#btn-create-bot`).addEventListener(`click`,()=>this._createBot()),this.container.querySelector(`#btn-copy-token`).addEventListener(`click`,()=>this._copyToken())}_renderBotList(){let e=this.container.querySelector(`#bm-bot-list`);if(!this.bots.length){e.innerHTML=`<p class="bm-empty">등록된 봇이 없습니다.</p>`;return}e.innerHTML=this.bots.map(e=>`
      <div class="bm-bot-item ${e.isActive?``:`inactive`}" data-id="${e.id}">
        <div class="bm-bot-info">
          <span class="bm-bot-icon">${x(e.aiType)}</span>
          <div class="bm-bot-name-wrap">
            <span class="bm-bot-name" data-id="${e.id}">${b(e.name)}</span>
            <input class="bm-rename-input" data-id="${e.id}" value="${b(e.name)}" style="display:none" maxlength="50" />
            <small>${b(e.roomName||`채팅방 없음`)} · ${e.isActive?`✅ 활성`:`⛔ 폐기됨`}</small>
          </div>
        </div>
        <div class="bm-bot-actions">
          <button class="btn-action btn-rename" data-id="${e.id}" title="봇 이름 변경">
            <span>✏️</span> <span class="action-label">이름 변경</span>
          </button>
          <button class="btn-action btn-rename-ok" data-id="${e.id}" title="저장" style="display:none">
            <span>💾</span> <span class="action-label">저장</span>
          </button>
          <button class="btn-action btn-rename-cancel" data-id="${e.id}" title="취소" style="display:none">
            <span>❌</span> <span class="action-label">취소</span>
          </button>
          <button class="btn-action btn-regen" data-id="${e.id}" title="토큰 재발급">
            <span>🔑</span> <span class="action-label">재발급</span>
          </button>
          ${e.isActive?`<button class="btn-action btn-delete" data-id="${e.id}" title="토큰 폐기 (비활성화)"><span>⏸️</span> <span class="action-label">비활성화</span></button>`:`<span class="badge-disabled">폐기됨</span>`}
          <button class="btn-action btn-delete-permanent" data-id="${e.id}" title="봇 완전 삭제 (영구 소멸)"><span class="action-icon">🗑️</span> <span class="action-label">삭제</span></button>
        </div>
      </div>`).join(``),e.querySelectorAll(`.btn-delete`).forEach(e=>{e.addEventListener(`click`,()=>this._deleteBot(parseInt(e.dataset.id,10)))}),e.querySelectorAll(`.btn-delete-permanent`).forEach(e=>{e.addEventListener(`click`,()=>this._deleteBotPermanent(parseInt(e.dataset.id,10)))}),e.querySelectorAll(`.btn-regen`).forEach(e=>{e.addEventListener(`click`,()=>this._regenToken(parseInt(e.dataset.id,10)))}),e.querySelectorAll(`.btn-rename`).forEach(e=>{e.addEventListener(`click`,()=>this._startRename(parseInt(e.dataset.id,10)))}),e.querySelectorAll(`.btn-rename-ok`).forEach(e=>{e.addEventListener(`click`,()=>this._confirmRename(parseInt(e.dataset.id,10)))}),e.querySelectorAll(`.btn-rename-cancel`).forEach(e=>{e.addEventListener(`click`,()=>this._cancelRename(parseInt(e.dataset.id,10)))}),e.querySelectorAll(`.bm-rename-input`).forEach(e=>{e.addEventListener(`keydown`,t=>{t.key===`Enter`&&this._confirmRename(parseInt(e.dataset.id,10)),t.key===`Escape`&&this._cancelRename(parseInt(e.dataset.id,10))})})}_renderAgentTasks(){let e=this.container.querySelector(`#bm-a2a-list`);if(!e)return;if(!this.agentTasks||!this.agentTasks.length){e.innerHTML=`<p class="bm-empty">진행된 A2A 태스크가 없습니다.</p>`;return}let t=e=>`<span style="background:${{pending:`#eab308`,running:`#3b82f6`,done:`#22c55e`,failed:`#ef4444`,timeout:`#6b7280`}[e]||`#71717a`};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">${e.toUpperCase()}</span>`;e.innerHTML=this.agentTasks.map(e=>`
      <div class="bm-bot-item" style="padding:10px 8px;margin-bottom:6px;border-bottom:1px dashed var(--color-border);">
        <div class="bm-bot-info" style="gap:8px;">
          <span style="font-size:16px;">🤖</span>
          <div>
            <div style="font-weight:600;font-size:12px;">
              ${b(e.from_agent)} ➔ ${b(e.to_agent)}
            </div>
            <small style="color:var(--color-text-muted);font-size:10px;">
              ID: ${e.id.substring(0,12)}... · 방: ${e.room_id}
            </small>
          </div>
        </div>
        <div>
          ${t(e.status)}
        </div>
      </div>
    `).join(``)}async _createBot(){let e=this.container.querySelector(`#bm-bot-name`).value.trim(),t=parseInt(this.container.querySelector(`#bm-room-select`).value,10),n=this.container.querySelector(`#bm-ai-type`).value;if(!e)return this._showError(`봇 이름을 입력하세요.`);if(!t)return this._showError(`채팅방을 선택하세요.`);try{this._hideError();let r=await o.createBot({name:e,roomId:t,aiType:n});this.container.querySelector(`#bm-token-value`).textContent=r.token,this.container.querySelector(`#bm-token-display`).style.display=`block`,this._copiedToken=r.token,this.container.querySelector(`#bm-bot-name`).value=``,await this._load()}catch(e){this._showError(e.message||`봇 생성에 실패했습니다.`)}}async _copyToken(){if(!this._copiedToken)return;let e=await a(this._copiedToken),t=this.container.querySelector(`#btn-copy-token`);t&&(t.textContent=e?`✅ 복사됨`:`❌ 복사 실패`,setTimeout(()=>{t.textContent=`복사`},2e3))}_startRename(e){let t=this.container.querySelector(`.bm-bot-item[data-id="${e}"]`);t&&(t.querySelector(`.bm-bot-name`).style.display=`none`,t.querySelector(`.bm-rename-input`).style.display=`inline-block`,t.querySelector(`.btn-rename`).style.display=`none`,t.querySelector(`.btn-rename-ok`).style.display=`inline-flex`,t.querySelector(`.btn-rename-cancel`).style.display=`inline-flex`,t.querySelector(`.bm-rename-input`).focus())}_cancelRename(e){let t=this.container.querySelector(`.bm-bot-item[data-id="${e}"]`);t&&(t.querySelector(`.bm-bot-name`).style.display=``,t.querySelector(`.bm-rename-input`).style.display=`none`,t.querySelector(`.btn-rename`).style.display=``,t.querySelector(`.btn-rename-ok`).style.display=`none`,t.querySelector(`.btn-rename-cancel`).style.display=`none`)}async _confirmRename(e){let t=this.container.querySelector(`.bm-bot-item[data-id="${e}"]`);if(!t)return;let n=t.querySelector(`.bm-rename-input`).value.trim();if(!n)return this._showError(`이름을 입력하세요.`);try{this._hideError(),await o.renameBot(e,n),await this._load()}catch(e){this._showError(e.message||`이름 변경에 실패했습니다.`)}}async _deleteBot(e){if(confirm(`이 봇의 토큰을 폐기하시겠습니까? 연결된 Bridge 스크립트가 즉시 중단됩니다.`))try{await o.deleteBot(e),await this._load()}catch(e){this._showError(e.message||`삭제에 실패했습니다.`)}}async _deleteBotPermanent(e){if(confirm(`⚠️ 이 봇을 완전히 삭제하시겠습니까?

봇 레코드, 사용자, 이 봇이 보낸 모든 메시지가 영구 삭제됩니다.
이 작업은 되돌릴 수 없습니다.`))try{await o.deleteBotPermanent(e),await this._load()}catch(e){this._showError(e.message||`완전 삭제에 실패했습니다.`)}}async _regenToken(e){if(confirm(`토큰을 재발급하면 기존 Bridge 스크립트의 연결이 끊깁니다. 계속하시겠습니까?`))try{let t=await o.regenerateBotToken(e);await this._load();let n=this.container.querySelector(`#bm-token-value`),r=this.container.querySelector(`#bm-token-display`);n&&(n.textContent=t.token),r&&(r.style.display=`block`),this._copiedToken=t.token}catch(e){this._showError(e.message||`토큰 재발급에 실패했습니다.`)}}_showError(e){let t=this.container.querySelector(`#bm-error`);t.textContent=e,t.style.display=`block`}_hideError(){let e=this.container.querySelector(`#bm-error`);e.style.display=`none`}destroy(){this.container.innerHTML=``,this.onClose&&this.onClose()}};function b(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}function x(e){return{hermes:`🧠`,claude:`✨`,"claude-code":`💻`,openclaw:`🦞`}[e]||`🤖`}var S=class{constructor(e={}){this.onClose=e.onClose,this.container=null,this.prefs=l(),this.init()}init(){this.container=document.createElement(`div`),this.container.id=`settings-panel-overlay`,this.container.className=`modal-overlay`,this.container.innerHTML=`
      <div class="modal" style="max-width: 400px; width: 90%;">
        <div class="modal-header">
          <h2 class="modal-title">⚙️ 화면 설정 (시니어 보조)</h2>
          <button class="modal-close" id="btn-close-settings">✕</button>
        </div>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 20px; padding: 20px 0;">
          
          <!-- 0. 사용자 이름 설정 -->
          <div class="form-group" style="padding: 0 24px;">
            <label class="form-label" style="font-weight: 700; margin-bottom: 8px; display: block;">사용자 이름 변경</label>
            <input type="text" id="txt-user-name" value="${this.prefs.userName||`황금호랑이`}" style="width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-surface2); color: var(--color-text); font-size: 16px; outline: none; box-sizing: border-box;" />
          </div>

          <!-- 0-1. 프로필 이미지 주소 설정 -->
          <div class="form-group" style="padding: 0 24px;">
            <label class="form-label" style="font-weight: 700; margin-bottom: 8px; display: block;">프로필 이미지 주소 (URL)</label>
            <input type="text" id="txt-user-avatar" value="${this.prefs.avatarUrl||window.currentUser&&window.currentUser.avatarUrl||``}" placeholder="구글 프로필 또는 임의 이미지 URL을 입력하세요" style="width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-surface2); color: var(--color-text); font-size: 16px; outline: none; box-sizing: border-box;" />
          </div>

          <!-- 1. 글자 크기 조절 -->
          <div class="form-group" style="padding: 0 24px;">
            <label class="form-label" style="font-weight: 700; margin-bottom: 8px; display: block;">글자 크기 조절</label>
            <div style="display: flex; gap: 8px;">
              <button class="btn-fontSize settings-toggle-btn ${this.prefs.fontSize===`small`?`active`:``}" data-size="small" style="font-size: 0.85em;">작게</button>
              <button class="btn-fontSize settings-toggle-btn ${this.prefs.fontSize===`normal`?`active`:``}" data-size="normal">보통</button>
              <button class="btn-fontSize settings-toggle-btn ${this.prefs.fontSize===`large`?`active`:``}" data-size="large" style="font-size: 1.15em;">크게</button>
              <button class="btn-fontSize settings-toggle-btn ${this.prefs.fontSize===`xlarge`?`active`:``}" data-size="xlarge" style="font-size: 1.3em; font-weight: bold;">아주 크게</button>
            </div>
          </div>

          <!-- 1-1. 디자인 테마 -->
          <div class="form-group" style="padding: 0 24px;">
            <label class="form-label" style="font-weight: 700; margin-bottom: 8px; display: block;">디자인 테마</label>
            <div style="display: flex; gap: 8px;">
              <button class="btn-designTheme settings-toggle-btn ${(this.prefs.designTheme||`gold`)===`gold`?`active`:``}" data-design="gold">
                <span class="theme-swatch" style="background: #d6a72e;"></span> 골드
              </button>
              <button class="btn-designTheme settings-toggle-btn ${this.prefs.designTheme===`ocean`?`active`:``}" data-design="ocean">
                <span class="theme-swatch" style="background: #38bdf8;"></span> 오션
              </button>
              <button class="btn-designTheme settings-toggle-btn ${this.prefs.designTheme===`rose`?`active`:``}" data-design="rose">
                <span class="theme-swatch" style="background: #f472b6;"></span> 로즈
              </button>
            </div>
          </div>

          <!-- 1-2. 화면 색상 모드 -->
          <div class="form-group" style="padding: 0 24px;">
            <label class="form-label" style="font-weight: 700; margin-bottom: 8px; display: block;">화면 색상 모드</label>
            <div style="display: flex; gap: 8px;">
              <button class="btn-theme settings-toggle-btn ${this.prefs.theme===`dark`?`active`:``}" data-theme="dark" style="font-weight: 600;">어둡게 (다크)</button>
              <button class="btn-theme settings-toggle-btn ${this.prefs.theme===`light`?`active`:``}" data-theme="light" style="font-weight: 600;">밝게 (라이트)</button>
            </div>
          </div>

          <!-- 2. 고대비 테마 토글 -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border); padding: 16px 24px 0;">
            <div>
              <label style="font-weight: 700; display: block;">고대비 모드 (글자 선명하게)</label>
              <span style="font-size: 0.85em; color: var(--color-text-muted);">눈이 침침할 때 노란색과 흰색 글자로 선명하게 보여줍니다.</span>
            </div>
            <input type="checkbox" id="chk-high-contrast" ${this.prefs.highContrast?`checked`:``} style="width: 24px; height: 24px; cursor: pointer;" />
          </div>

          <!-- 3. 쉬운 기술 용어 사전 토글 -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border); padding: 16px 24px 0;">
            <div>
              <label style="font-weight: 700; display: block;">쉬운 단어 설명 가이드</label>
              <span style="font-size: 0.85em; color: var(--color-text-muted);">어려운 IT 영어 용어 밑에 점선을 표시하고 설명 카드를 띄워줍니다.</span>
            </div>
            <input type="checkbox" id="chk-easy-glossary" ${this.prefs.easyGlossary?`checked`:``} style="width: 24px; height: 24px; cursor: pointer;" />
          </div>

        </div>
        <div class="modal-footer" style="padding-top: 10px;">
          <button class="modal-btn-cancel" id="btn-save-settings" style="width: 100%; background: var(--color-primary); color: #1a160c; padding: 12px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer;">설정 저장 완료</button>
        </div>
      </div>
    `,document.body.appendChild(this.container),this.container.querySelector(`#btn-close-settings`).addEventListener(`click`,()=>this.destroy()),this.container.querySelector(`#btn-save-settings`).addEventListener(`click`,async()=>{let e=this.container.querySelector(`#txt-user-name`);e&&(this.prefs.userName=e.value.trim()||`황금호랑이`);let t=this.container.querySelector(`#txt-user-avatar`);t&&(this.prefs.avatarUrl=t.value.trim()),this.update();try{await o.updateMe({displayName:this.prefs.userName,avatarUrl:this.prefs.avatarUrl}),window.currentUser&&(window.currentUser.displayName=this.prefs.userName,window.currentUser.avatarUrl=this.prefs.avatarUrl)}catch(e){console.error(`백엔드 사용자 정보 저장 실패:`,e)}document.dispatchEvent(new CustomEvent(`user_profile_changed`,{detail:this.prefs})),this.destroy()}),this.container.addEventListener(`click`,e=>{e.target.id===`settings-panel-overlay`&&this.destroy()});let e=this.container.querySelectorAll(`.btn-fontSize`);e.forEach(t=>{t.addEventListener(`click`,()=>{e.forEach(e=>e.classList.remove(`active`)),t.classList.add(`active`),this.prefs.fontSize=t.dataset.size,this.update()})});let t=this.container.querySelectorAll(`.btn-designTheme`);t.forEach(e=>{e.addEventListener(`click`,()=>{t.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),this.prefs.designTheme=e.dataset.design,this.update()})});let n=this.container.querySelectorAll(`.btn-theme`);n.forEach(e=>{e.addEventListener(`click`,()=>{n.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),this.prefs.theme=e.dataset.theme,this.update()})}),this.container.querySelector(`#chk-high-contrast`).addEventListener(`change`,e=>{this.prefs.highContrast=e.target.checked,this.update()}),this.container.querySelector(`#chk-easy-glossary`).addEventListener(`change`,e=>{this.prefs.easyGlossary=e.target.checked,this.update()})}update(){s(this.prefs)}destroy(){this.container&&=(this.container.remove(),null),this.onClose&&this.onClose()}},C=class{constructor(e,t,n){this.container=e,this.mainContainer=t,this.user=n,this.rooms=[],this.categories=[],this.activeRoomId=null,this._unsubNewMsg=r(`new_message`,({message:e})=>{if(e.senderId!==n.id&&e.roomId!=this.activeRoomId){let t=this.rooms.find(t=>t.id==e.roomId);t&&(t.unreadCount=(t.unreadCount||0)+1,t.lastMessage={content:e.content,sentAt:e.sentAt},this._render())}}),this._onRoomsChanged=()=>this._load(),document.addEventListener(`rooms_changed`,this._onRoomsChanged),this._onProfileChanged=e=>{this.user.name=e.detail.userName,this.user.avatarUrl=e.detail.avatarUrl,this._render()},document.addEventListener(`user_profile_changed`,this._onProfileChanged);let i=l();i&&(i.userName&&(this.user.name=i.userName),i.avatarUrl&&(this.user.avatarUrl=i.avatarUrl)),this._load()}async _load(){try{let[e,t]=await Promise.all([o.getRooms(),o.get(`/api/rooms/categories/all`).catch(()=>[])]);this.rooms=e,this.categories=t,this._render()}catch{this.container.innerHTML=`<p class="error">채팅방 목록을 불러오지 못했습니다.</p>`}}_roomIcon(e){return e.type===`self`?`📝`:e.type===`direct`?`💬`:`👥`}_render(){let e=this.user.isOwner?`<div class="sidebar-action-row" style="display: flex; gap: 6px; width: 100;">
           <button class="sidebar-action-btn" id="create-room-btn" title="채팅방 만들기">
             <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.13,16.13,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78.69.69,0,0,0,.13-.11L82.5,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM160,152H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm0-32H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Z"/></svg>
             <span>채팅방</span>
           </button>
           <button class="sidebar-action-btn" id="create-cat-btn" title="카테고리 관리">
             <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72Z"/></svg>
             <span>카테고리</span>
           </button>
           <button class="sidebar-action-btn" id="bot-manage-btn" title="봇 관리">
             <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80V192a32,32,0,0,0,32,32H200a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48ZM172,120a12,12,0,1,1-12,12A12,12,0,0,1,172,120Zm-88,0a12,12,0,1,1-12,12A12,12,0,0,1,84,120Zm100,72H72a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16Z"/></svg>
             <span>봇 관리</span>
           </button>
         </div>`:``,t=this._buildCategoryTree(this.categories),n={};this.rooms.forEach(e=>{let t=e.categoryId||`unclassified`;n[t]||(n[t]=[]),n[t].push(e)});let r=this._getCollapsedSet(),i=(e,t)=>{let a=n[e.id]||[];if(!(e.children.length>0||a.length>0)&&!this.user.isOwner)return``;let o=r.has(e.id),s=t*16,c=this.user.isOwner?`<button class="category-menu-btn" data-cat-id="${e.id}" data-cat-level="${t}" title="카테고리 관리"><i class="ph ph-gear"></i></button>`:``;return`
        <div class="category-group" data-cat-id="${e.id}" data-level="${t}">
          <div class="category-header" style="padding-left:${s}px">
            <span class="category-arrow"><i class="ph ${o?`ph-caret-right`:`ph-caret-down`}"></i></span>
            <span class="category-title">${w(e.name)}</span>
            ${c}
          </div>
          <div class="category-rooms" style="${o?`display:none`:``}">
            ${a.map(e=>`
              <div class="room-item${e.id===this.activeRoomId?` active`:``}" data-room-id="${e.id}" style="padding-left:${s+16}px">
                <div class="room-avatar">${this._roomIcon(e)}</div>
                <div class="room-info">
                  <div class="room-name">${w(e.name||`채팅`)}</div>
                  <div class="room-last-msg">${e.lastMessage?w(e.lastMessage.content):`메시지 없음`}</div>
                </div>
                ${e.unreadCount>0?`<span class="room-badge">${e.unreadCount}</span>`:``}
              </div>
            `).join(``)}
            ${e.children.map(e=>i(e,t+1)).join(``)}
          </div>
        </div>`},a=t.map(e=>i(e,0)).join(``),o=n.unclassified||[];if(o.length>0){let e=r.has(`unclassified`);a+=`
        <div class="category-group" data-cat-id="unclassified" data-level="0">
          <div class="category-header">
            <span class="category-arrow"><i class="ph ${e?`ph-caret-right`:`ph-caret-down`}"></i></span>
            <span class="category-title">일반 채널</span>
          </div>
          <div class="category-rooms" style="${e?`display:none`:``}">
            ${o.map(e=>`
              <div class="room-item${e.id===this.activeRoomId?` active`:``}" data-room-id="${e.id}">
                <div class="room-avatar">${this._roomIcon(e)}</div>
                <div class="room-info">
                  <div class="room-name">${w(e.name||`채팅`)}</div>
                  <div class="room-last-msg">${e.lastMessage?w(e.lastMessage.content):`메시지 없음`}</div>
                </div>
                ${e.unreadCount>0?`<span class="room-badge">${e.unreadCount}</span>`:``}
              </div>
            `).join(``)}
          </div>
        </div>`}let s=l().avatarUrl||this.user.avatarUrl,c=s?`<img src="${w(s)}" style="width: 32px; height: 32px; border-radius: var(--radius-sm); object-fit: cover;" alt="profile" />`:`<span style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--color-surface2); color: var(--color-text); display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">${(this.user.name||`?`)[0]}</span>`;this.container.innerHTML=`
      <div class="room-user-header" style="padding: 12px 16px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; height: 56px; background: rgba(0,0,0,0.15);">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${c}
          <span style="font-size: 15px; font-weight: 600; color: var(--color-text);">${w(this.user.name)}</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="settings-btn" id="settings-btn" title="화면 설정" style="width: 32px; height: 32px; background: none; border: none; color: var(--color-text); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; transition: background .15s;">
            <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm119.36-40.48-26.68-6.67a87.69,87.69,0,0,0-5.8-14l15.54-22.68a8,8,0,0,0-1.12-10.43L209.22,45.69a8,8,0,0,0-10.43-1.12L176.11,60.11a87.69,87.69,0,0,0-14-5.8L155.48,27.64A8,8,0,0,0,147.6,21H108.4a8,8,0,0,0-7.88,6.64L93.89,54.31a87.69,87.69,0,0,0-14,5.8L57.21,44.57a8,8,0,0,0-10.43,1.12L26.7,65.78a8,8,0,0,0-1.12,10.43L41.12,98.89a87.69,87.69,0,0,0-5.8,14l-26.68,6.67A8,8,0,0,0,2,127.4v27.2a8,8,0,0,0,6.64,7.88l26.68,6.67a87.69,87.69,0,0,0,5.8,14l-14.73,22.68a8,8,0,0,0,1.12,10.43l20.08,20.09a8,8,0,0,0,10.43,1.12l22.68-15.54a87.69,87.69,0,0,0,14,5.8l6.63,26.67a8,8,0,0,0,7.88,6.64h39.2a8,8,0,0,0,7.88-6.64l6.63-26.67a87.69,87.69,0,0,0,14-5.8l22.68,15.54a8,8,0,0,0,10.43-1.12l20.08-20.09a8,8,0,0,0,1.12-10.43l-15.54-22.68a87.69,87.69,0,0,0,5.8-14l26.68-6.67A8,8,0,0,0,254,154.6V127.4A8,8,0,0,0,247.36,119.52Zm-9.76,31.79-24,6a8,8,0,0,0-5.93,5.93,71.82,71.82,0,0,1-10,24.16,8,8,0,0,0,.76,8.39l14,20.39-11.36,11.36-20.39-14a8,8,0,0,0-8.39-.76,71.82,71.82,0,0,1-24.16,10,8,8,0,0,0-5.93,5.93l-6,24H119.82l-6-24a8,8,0,0,0-5.93-5.93,71.82,71.82,0,0,1-24.16-10,8,8,0,0,0-8.39.76l-20.39,14L43.59,209.39l14-20.39a8,8,0,0,0,.76-8.39,71.82,71.82,0,0,1-10-24.16,8,8,0,0,0-5.93-5.93l-24-6V130.82l24-6a8,8,0,0,0,5.93-5.93,71.82,71.82,0,0,1,10-24.16,8,8,0,0,0-.76-8.39L43.59,65.82l11.36-11.36,20.39,14a8,8,0,0,0,8.39.76,71.82,71.82,0,0,1,24.16-10,8,8,0,0,0,5.93-5.93l6-24h16.36l6,24a8,8,0,0,0,5.93,5.93,71.82,71.82,0,0,1,24.16,10,8,8,0,0,0,8.39-.76l20.39-14,11.36,11.36-14,20.39a8,8,0,0,0-.76,8.39,71.82,71.82,0,0,1,10,24.16,8,8,0,0,0,5.93,5.93l24,6Z"></path></svg>
          </button>
          <button class="logout-btn" onclick="location.href='/auth/logout'" title="로그아웃" style="width: 32px; height: 32px; background: none; border: none; color: var(--color-danger); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; transition: background .15s;">
            <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M112,128a8,8,0,0,1-8,8H32a8,8,0,0,1,0-16H104A8,8,0,0,1,112,128Zm117.66-5.66a8,8,0,0,1,0,11.32l-32,32a8,8,0,0,1-11.32-11.32L204.69,136H120a8,8,0,0,1,0-16h84.69l-18.35-18.34a8,8,0,0,1,11.32-11.32ZM224,208H136a8,8,0,0,1,0-16h80V64H136a8,8,0,0,1,0-16h88a16,16,0,0,1,16,16V192A16,16,0,0,1,224,208Z"></path></svg>
          </button>
        </div>
      </div>
      <div class="room-list-header">${e}</div>
      <div class="room-list-scroll">
        ${a||`<p style="padding:16px;color:var(--color-text-muted);font-size:13px;">채팅방이 없습니다.</p>`}
      </div>
    `,this.container.querySelectorAll(`.room-item`).forEach(e=>{e.addEventListener(`click`,()=>this._openRoom(parseInt(e.dataset.roomId,10)))}),this.container.querySelectorAll(`.category-header`).forEach(e=>{e.addEventListener(`click`,t=>{if(t.target.closest(`.category-menu-btn`))return;let n=e.closest(`.category-group`),r=n.dataset.catId,i=e.querySelector(`.category-arrow`),a=n.querySelector(`.category-rooms`),o=this._getCollapsedSet();a.style.display===`none`?(a.style.display=``,i.innerHTML=`<i class="ph ph-caret-down"></i>`,o.delete(r)):(a.style.display=`none`,i.innerHTML=`<i class="ph ph-caret-right"></i>`,o.add(r)),this._saveCollapsedSet(o)})}),this.container.querySelectorAll(`.category-menu-btn`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),this._showCategoryContextMenu(e,e.dataset.catId,parseInt(e.dataset.catLevel,10))})}),document.getElementById(`create-room-btn`)?.addEventListener(`click`,()=>this._showCreateModal()),document.getElementById(`create-cat-btn`)?.addEventListener(`click`,()=>this._showCreateCategoryModal()),document.getElementById(`bot-manage-btn`)?.addEventListener(`click`,()=>this._showBotManager()),document.getElementById(`settings-btn`)?.addEventListener(`click`,()=>this._showSettings())}_showSettings(){new S}_openRoom(e){this.activeRoomId=e;let t=this.rooms.find(t=>t.id===e);t&&(t.unreadCount=0),this._render(),this._currentRoom?.destroy(),this._currentRoom=new _(this.mainContainer,e,this.user),document.querySelector(`.sidebar`)?.classList.remove(`open`),document.getElementById(`sidebar-overlay`)?.classList.remove(`active`)}_showBotManager(){let e=document.createElement(`div`);e.id=`bot-manager-host`,document.body.appendChild(e),new y({container:e,rooms:this.rooms.map(e=>({id:e.id,name:e.name||`채팅방`})),onClose:()=>{e.remove()}})}_showCreateCategoryModal(){let e=document.createElement(`div`);e.className=`modal-overlay`,e.innerHTML=`
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">새 카테고리 만들기</h2>
          <button class="modal-close" id="cat-modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">카테고리 이름</label>
            <input class="form-input" id="cat-name-input" type="text" placeholder="예: 개발, 지식베이스" maxlength="30" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-cancel" id="cat-modal-cancel-btn">취소</button>
          <button class="modal-btn-create" id="cat-modal-create-btn">만들기</button>
        </div>
      </div>
    `,document.body.appendChild(e);let t=()=>e.remove();document.getElementById(`cat-modal-close-btn`).addEventListener(`click`,t),document.getElementById(`cat-modal-cancel-btn`).addEventListener(`click`,t),document.getElementById(`cat-modal-create-btn`).addEventListener(`click`,async()=>{let e=document.getElementById(`cat-name-input`).value.trim();if(!e){alert(`카테고리 이름을 입력해주세요.`);return}try{await o.post(`/api/rooms/categories`,{name:e}),t(),this._load()}catch(e){alert(`카테고리 생성 실패: `+e.message)}})}async _createSelfRoom(){try{let e=await o.createRoom({type:`self`,memberIds:[]});this.rooms.unshift({...e,unreadCount:0,lastMessage:null}),this._render(),this._openRoom(e.id)}catch(e){alert(`생성 실패: ${e.message}`)}}async _createBotRoom(){try{let e=await o.createRoom({type:`group`,name:`MyTok 봇`,memberIds:[],withBot:!0});this.rooms.unshift({...e,unreadCount:0,lastMessage:null}),this._render(),this._openRoom(e.id)}catch(e){alert(`생성 실패: ${e.message}`)}}async _showCreateModal(){let e=[];try{e=await o.getUsers()}catch{}let t=e.filter(e=>e.id!==this.user.id&&!e.isBot),n=e.some(e=>e.isBot),r=document.createElement(`div`);r.className=`modal-overlay`,r.id=`create-room-modal`,r.innerHTML=`
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">새 채팅방 만들기</h2>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">채팅 유형</label>
            <div class="type-btns">
              <button class="type-btn active" data-type="group">👥 그룹</button>
              <button class="type-btn" data-type="direct">💬 1:1</button>
              <button class="type-btn" data-type="self">📝 나의 채팅</button>
              ${n?`<button class="type-btn" data-type="bot">🤖 봇</button>`:``}
            </div>
          </div>
          <div class="form-group" id="cat-select-group">
            <label class="form-label">카테고리</label>
            <select class="form-input" id="room-cat-select">
              ${this._buildCategoryOptions(this.categories)}
            </select>
          </div>
          <div class="form-group" id="name-group">
            <label class="form-label">채팅방 이름</label>
            <input class="form-input" id="room-name-input" type="text" placeholder="예: 가족 채팅방" maxlength="50" />
          </div>
          <div class="form-group" id="member-group">
            <label class="form-label">구성원 선택</label>
            <div class="member-list" id="member-list">
              ${t.length===0?`<p style="color:var(--color-text-muted);font-size:13px;">다른 구성원이 없습니다.<br>먼저 다른 계정으로 로그인해 주세요.</p>`:t.map(e=>`
                  <label class="member-item">
                    <input type="checkbox" class="member-check" value="${e.id}" />
                    <div class="member-avatar">${e.displayName[0]}</div>
                    <div class="member-info">
                      <div class="member-name">${w(e.displayName)}</div>
                      <div class="member-email">${w(e.email)}</div>
                    </div>
                  </label>
                `).join(``)}
            </div>
          </div>
          <div id="type-desc" class="type-desc"></div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-cancel" id="modal-cancel-btn">취소</button>
          <button class="modal-btn-create" id="modal-create-btn">만들기</button>
        </div>
      </div>
    `,document.body.appendChild(r);let i=`group`,a=e=>{let t=document.getElementById(`name-group`),n=document.getElementById(`member-group`),i=document.getElementById(`cat-select-group`),a=document.getElementById(`type-desc`);switch(e){case`self`:t.style.display=`none`,n.style.display=`none`,i.style.display=`none`,a.textContent=`📝 나만 볼 수 있는 메모·파일 보관 공간입니다.`;break;case`bot`:t.style.display=``,document.getElementById(`room-name-input`).placeholder=`이름 미입력 시 "MyTok 봇"`,n.style.display=`none`,i.style.display=`none`,a.textContent=`🤖 /도움말 을 입력해 봇 명령어를 확인하세요.`;break;case`direct`:t.style.display=``,document.getElementById(`room-name-input`).placeholder=`이름 미입력 시 "1:1 채팅"`,n.style.display=``,i.style.display=``,a.textContent=``,r.querySelectorAll(`.member-check`).forEach(e=>{e.type=`radio`,e.name=`direct-member`});break;default:t.style.display=``,document.getElementById(`room-name-input`).placeholder=`예: 가족 채팅방`,n.style.display=``,i.style.display=``,a.textContent=``,r.querySelectorAll(`.member-check`).forEach(e=>{e.type=`checkbox`})}};r.querySelectorAll(`.type-btn`).forEach(e=>{e.addEventListener(`click`,()=>{r.querySelectorAll(`.type-btn`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),i=e.dataset.type,a(i)})});let s=()=>r.remove();document.getElementById(`modal-close-btn`).addEventListener(`click`,s),document.getElementById(`modal-cancel-btn`).addEventListener(`click`,s),r.addEventListener(`click`,e=>{e.target===r&&s()}),document.getElementById(`modal-create-btn`).addEventListener(`click`,async()=>{let e=document.getElementById(`room-name-input`)?.value.trim(),t=[...r.querySelectorAll(`.member-check:checked`)].map(e=>parseInt(e.value,10));if(i===`direct`&&t.length!==1){alert(`1:1 채팅은 구성원 1명을 선택하세요.`);return}if(i===`group`&&!e){alert(`채팅방 이름을 입력하세요.`);return}let n=document.getElementById(`modal-create-btn`);n.disabled=!0,n.textContent=`생성 중…`;try{let n,r=document.getElementById(`room-cat-select`)?.value||null;n=i===`self`?await o.createRoom({type:`self`,memberIds:[]}):i===`bot`?await o.createRoom({type:`group`,name:e||`MyTok 봇`,memberIds:[],withBot:!0}):await o.createRoom({type:i,name:e||null,memberIds:t,categoryId:r}),s(),this.rooms.unshift({...n,unreadCount:0,lastMessage:null}),this._render(),this._openRoom(n.id)}catch(e){alert(`채팅방 생성 실패: ${e.message}`),n.disabled=!1,n.textContent=`만들기`}}),a(`group`)}_buildCategoryTree(e){let t={},n=[];return e.forEach(e=>{t[e.id]={...e,children:[]}}),e.forEach(e=>{let r=t[e.id];e.parent_id&&t[e.parent_id]?t[e.parent_id].children.push(r):n.push(r)}),n}_getCollapsedSet(){try{let e=localStorage.getItem(`categoryCollapsed`);return e?new Set(JSON.parse(e)):new Set}catch{return new Set}}_saveCollapsedSet(e){localStorage.setItem(`categoryCollapsed`,JSON.stringify([...e]))}_showCategoryContextMenu(e,t,n){document.querySelectorAll(`.category-context-menu`).forEach(e=>e.remove());let r=[{label:`✏️ 이름 변경`,action:`rename`},{label:`🗑️ 삭제`,action:`delete`}];n<3&&r.push({label:`📁 하위 카테고리 추가`,action:`add-child`});let i=document.createElement(`div`);i.className=`category-context-menu`,i.innerHTML=r.map(e=>`<div class="category-context-item" data-action="${e.action}">${e.label}</div>`).join(``);let a=e.getBoundingClientRect();i.style.position=`fixed`,i.style.top=`${a.bottom+2}px`,i.style.left=`${a.left}px`,document.body.appendChild(i);let s=()=>{i.remove(),document.removeEventListener(`click`,s)};setTimeout(()=>document.addEventListener(`click`,s),0),i.querySelectorAll(`.category-context-item`).forEach(e=>{e.addEventListener(`click`,async n=>{n.stopPropagation(),s();let r=e.dataset.action;if(r===`rename`){let e=prompt(`새 카테고리 이름:`);if(!e?.trim())return;try{await o.patch(`/api/rooms/categories/${t}`,{name:e.trim()}),this._load()}catch(e){alert(`이름 변경 실패: ${e.message}`)}}else if(r===`delete`){if(!confirm(`이 카테고리를 삭제하시겠습니까?
하위 카테고리는 최상위로 승격되고, 소속 채팅방은 미분류로 이동됩니다.`))return;try{await o.delete(`/api/rooms/categories/${t}`),this._load()}catch(e){alert(`삭제 실패: ${e.message}`)}}else if(r===`add-child`){let e=prompt(`하위 카테고리 이름:`);if(!e?.trim())return;try{await o.post(`/api/rooms/categories`,{name:e.trim(),parentId:t}),this._load()}catch(e){alert(e.message||`하위 카테고리 생성 실패`)}}})})}_buildCategoryOptions(e,t=null){let n=this._buildCategoryTree(e),r=`<option value="">미분류</option>`,i=(e,n)=>{e.forEach(e=>{let a=e.id===t?` selected`:``;r+=`<option value="${e.id}"${a}>${n}${w(e.name)}</option>`,i(e.children,n+`── `)})};return i(n,``),r}destroy(){this._unsubNewMsg?.(),document.removeEventListener(`rooms_changed`,this._onRoomsChanged),document.removeEventListener(`user_profile_changed`,this._onProfileChanged)}};function w(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}export{C as RoomList};
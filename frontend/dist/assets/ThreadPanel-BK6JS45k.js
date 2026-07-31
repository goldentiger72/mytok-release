import{n as e,r as t,t as n}from"./clipboard-B0h1njb3.js";import{a as r,n as i,r as a}from"./index-B54xd5Mb.js";var o=class{constructor(e,t,n,r){this.container=e,this.roomId=t,this.parentMessage=n,this.onClose=r,this.replies=[],this.init()}async init(){this.renderLayout(),await this.loadReplies(),this.setupSocket()}renderLayout(){this.container.innerHTML=`
      <div class="thread-panel">
        <div class="thread-header" style="display: flex; align-items: center; justify-content: space-between; padding: 0 16px; height: 56px; border-bottom: 1px solid var(--color-border); background: rgba(20, 20, 35, 0.4); backdrop-filter: var(--glass-blur);">
          <button class="thread-back-btn" id="thread-back-btn" title="뒤로가기" style="width: 32px; height: 32px; background: none; border: none; color: var(--color-text); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; transition: background 0.15s;">
            <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a8,8,0,0,1-8,8H88v48a8,8,0,0,1-13.66,5.66l-72-72a8,8,0,0,1,0-11.32l72-72A8,8,0,0,1,88,32V80h128A8,8,0,0,1,224,128Z"></path></svg>
          </button>
          <div class="thread-header-title">스레드 답글</div>
          <button class="thread-close-btn" id="thread-close-btn" style="width: 32px; height: 32px; background: none; border: none; color: var(--color-text); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; transition: background 0.15s;">
            <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66a8,8,0,0,1,11.32-11.32L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
          </button>
        </div>
        
        <div class="thread-parent-section">
          <div class="thread-parent-avatar">${(this.parentMessage.senderName||`U`).substring(0,1)}</div>
          <div class="thread-parent-body">
            <div class="thread-parent-sender" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
              <span>${this.parentMessage.senderName}</span>
              <span class="thread-parent-share-btn" style="cursor:pointer; color:var(--color-primary); font-size:0.75rem; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px; padding: 2px 4px; border-radius: 4px; transition: background 0.1s;">
                <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" style="display:inline-block; vertical-align:middle;"><path d="M184,160a39.9,39.9,0,0,0-30.8,14.43l-45-25.72a40.16,40.16,0,0,0,0-41.42l45-25.72a40,40,0,1,0-8-14l-45,25.72a40,40,0,1,0,0,59.42l45,25.72A40,40,0,1,0,184,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,184,32ZM72,104a24,24,0,1,1-24,24A24,24,0,0,1,72,104Zm112,120a24,24,0,1,1,24-24A24,24,0,0,1,184,224Z"></path></svg>
                공유
              </span>
            </div>
            <div class="thread-parent-content msg-bubble">${(()=>{let t=a(),n=e(this.parentMessage.content);return t.easyGlossary?i(n):n})()}</div>
            ${this._renderAttachment(this.parentMessage.attachment)}
          </div>
        </div>

        <div class="thread-replies-list" id="thread-replies-list">
          <div class="thread-loading">답글 로딩 중…</div>
        </div>

        <!-- 스레드 전용 타이핑 표시 (US3) -->
        <div id="thread-bot-typing-${this.roomId}" style="display:none;font-size:11px;color:var(--color-text-muted);padding:4px 12px;font-style:italic;"></div>

        <div class="thread-input-container">
          <div id="thread-attach-preview" class="attach-preview" style="display:none;"></div>
          <div class="thread-input-row">
            <button class="attach-btn" id="thread-photo-btn" title="사진/동영상 선택" style="color: var(--color-text);">
              <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM156,88a12,12,0,1,1-12,12A12,12,0,0,1,156,88Zm60,112H40V165.66l46.34-46.35a8,8,0,0,1,11.32,0L144,165.66l22.34-22.35a8,8,0,0,1,11.32,0L216,181.66Z"></path></svg>
            </button>
            <button class="attach-btn" id="thread-attach-btn" title="파일 첨부" style="color: var(--color-text);">
              <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.22-79.21l101.27-101.27a40,40,0,1,1,56.57,56.57L104.9,193.09a24,24,0,0,1-33.94-33.94l82.05-82a8,8,0,0,1,11.32,11.32l-82,82a8,8,0,1,0,11.32,11.32l101.27-101.31a24,24,0,1,0-33.94-33.94L43.66,147.88a40,40,0,1,0,56.57,56.57l82-82.09A8,8,0,0,1,209.66,122.34Z"></path></svg>
            </button>
            <input type="file" id="thread-photo-input" accept="image/*,video/*" style="display:none" />
            <input type="file" id="thread-file-input" accept="image/*,video/*,*/*" style="display:none" />
            <textarea
              id="thread-reply-input"
              class="input-textarea"
              placeholder="답글을 입력하세요… (Shift+Enter: 줄바꿈)"
              rows="2"
            ></textarea>
            <button id="thread-reply-send-btn" title="전송" style="display: inline-flex; align-items: center; justify-content: center; color: #1a160c;">
              <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M228.44,111.45,44.87,31.78A16,16,0,0,0,22,46.06l16.12,64.48a16,16,0,0,0,13,11.83L128,128l-76.93,5.63a16,16,0,0,0-13,11.83L22,209.94a16,16,0,0,0,22.86,14.28l183.57-79.67A16,16,0,0,0,228.44,111.45ZM218.83,133.5l-183.57,79.67c-.2.09-.4.18-.6.27L50.77,149,144,136a8,8,0,0,0,0-16L50.77,107l-16.11-64.4.6.27,183.57,79.67a8,8,0,0,1,0,14.94Z"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `,document.getElementById(`thread-close-btn`).addEventListener(`click`,()=>{this.destroy(),this.onClose&&this.onClose()}),document.getElementById(`thread-back-btn`)?.addEventListener(`click`,()=>{this.destroy(),this.onClose&&this.onClose()}),document.querySelector(`.thread-parent-share-btn`)?.addEventListener(`click`,()=>{this._shareMessage(this.parentMessage)});let t=document.getElementById(`thread-reply-send-btn`),n=document.getElementById(`thread-reply-input`),o=document.getElementById(`thread-attach-btn`),s=document.getElementById(`thread-file-input`),c=document.getElementById(`thread-attach-preview`),l=null,u=e=>String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`),d=e=>{let t=(e.size/1024).toFixed(1)+` KB`,n=e.type.startsWith(`image/`)?`<img src="${URL.createObjectURL(e)}" style="max-height:80px;border-radius:6px;" />`:`<span>📎</span>`;c.innerHTML=`
        ${n}
        <span class="file-info">${u(e.name)} (${t})</span>
        <button class="attach-cancel" id="thread-cancel-attach">✕</button>
      `,c.style.display=`flex`,document.getElementById(`thread-cancel-attach`)?.addEventListener(`click`,()=>{l=null,s.value=``,c.style.display=`none`,c.innerHTML=``})},f=async()=>{let e=n.value.trim();if(!e&&!l)return;let i=l;l=null,t.disabled=!0,o.disabled=!0,i&&(c.innerHTML=`<span class="file-info">${u(i.name)} 보내는 중…</span>`);try{await r.post(`/api/rooms/${this.roomId}/messages/${this.parentMessage.id}/thread`,{title:`${this.parentMessage.content.substring(0,15)}... 스레드`});let t;if(i){let n=new FormData;n.append(`content`,e||``),n.append(`file`,i),t=await r.postThreadReplyWithFile(this.roomId,this.parentMessage.id,n)}else t=await r.post(`/api/rooms/${this.roomId}/messages/${this.parentMessage.id}/thread/reply`,{content:e});n.value=``,n.style.height=`auto`,c.style.display=`none`,c.innerHTML=``,s.value=``,this.appendReply(t.reply)}catch(e){alert(`답글 전송 실패: `+e.message),i&&(l=i,d(i))}finally{t.disabled=!1,o.disabled=!1}};t.addEventListener(`click`,f),n.addEventListener(`keydown`,e=>{e.key===`Enter`&&!e.shiftKey&&(e.preventDefault(),f())}),n.addEventListener(`input`,()=>{n.style.height=`auto`,n.style.height=Math.min(n.scrollHeight,120)+`px`});let p=this.container.querySelector(`#thread-photo-btn`),m=this.container.querySelector(`#thread-photo-input`);p?.addEventListener(`click`,()=>m.click()),o?.addEventListener(`click`,()=>s.click());let h=e=>{let t=e.files[0];if(!t)return;let n=t.type.startsWith(`image/`)?10*1024*1024:50*1024*1024;if(t.size>n){let n=t.type.startsWith(`image/`)?`10MB`:`50MB`;alert(`파일 크기가 ${n}를 초과합니다.`),e.value=``;return}l=t,d(t)};m?.addEventListener(`change`,()=>h(m)),s?.addEventListener(`change`,()=>h(s))}async loadReplies(){let e=document.getElementById(`thread-replies-list`);try{let e=await r.get(`/api/rooms/${this.roomId}/messages/${this.parentMessage.id}/thread`);this.replies=e.replies||[],this.renderReplies()}catch(t){t.status===404?(this.replies=[],e.innerHTML=`<div class="thread-empty">아직 답글이 없습니다. 첫 답글을 남겨보세요!</div>`):e.innerHTML=`<div class="thread-error">에러: ${t.message}</div>`}}renderReplies(){let t=document.getElementById(`thread-replies-list`);if(this.replies.length===0){t.innerHTML=`<div class="thread-empty">아직 답글이 없습니다.</div>`;return}t.innerHTML=this.replies.map(t=>`
      <div class="thread-reply-item">
        <div class="thread-reply-avatar">${(t.senderName||`U`).substring(0,1)}</div>
        <div class="thread-reply-body">
          <div class="thread-reply-sender" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <span>${t.senderName} ${t.isBot?`🤖`:``}</span>
            <span class="thread-reply-share-btn" data-reply-id="${t.id}" style="cursor:pointer; color:var(--color-primary); font-size:0.75rem; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px; padding: 2px 4px; border-radius: 4px; transition: background 0.1s;">
              <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" style="display:inline-block; vertical-align:middle;"><path d="M184,160a39.9,39.9,0,0,0-30.8,14.43l-45-25.72a40.16,40.16,0,0,0,0-41.42l45-25.72a40,40,0,1,0-8-14l-45,25.72a40,40,0,1,0,0,59.42l45,25.72A40,40,0,1,0,184,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,184,32ZM72,104a24,24,0,1,1-24,24A24,24,0,0,1,72,104Zm112,120a24,24,0,1,1,24-24A24,24,0,0,1,184,224Z"></path></svg>
              공유
            </span>
          </div>
          ${t.content?(()=>{let n=a(),r=e(t.content);return`<div class="thread-reply-content msg-bubble">${n.easyGlossary?i(r):r}</div>`})():``}
          ${this._renderAttachment(t.attachment)}
        </div>
      </div>
    `).join(``),t.querySelectorAll(`.thread-reply-share-btn`).forEach(e=>{e.addEventListener(`click`,()=>{let t=parseInt(e.dataset.replyId,10),n=this.replies.find(e=>e.id===t);n&&this._shareMessage(n)})}),t.scrollTop=t.scrollHeight}appendReply(e){this.replies.find(t=>t.id===e.id)||(this.replies.push(e),this.renderReplies())}setupSocket(){this.socket=t(),this.onNewReply=e=>{e.roomId==this.roomId&&e.messageId==this.parentMessage.id&&this.appendReply(e.reply)},this.socket.on(`new_thread_reply`,this.onNewReply),this.onBotTyping=e=>{let t=document.getElementById(`thread-bot-typing-${this.roomId}`);t&&(e.roomId==this.roomId&&e.parentMessageId==this.parentMessage.id&&e.on?(t.textContent=`🤖 ${e.botName}님이 답글을 입력하고 있습니다...`,t.style.display=`block`):e.roomId==this.roomId&&(!e.on||e.parentMessageId==this.parentMessage.id)&&(t.style.display=`none`))},this.socket.on(`bot_typing`,this.onBotTyping)}_renderAttachment(e){if(!e)return``;let t=e=>String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`),n=e.size<1024*1024?(e.size/1024).toFixed(1)+` KB`:(e.size/(1024*1024)).toFixed(1)+` MB`;return e.mime&&e.mime.startsWith(`image/`)?`<div class="thread-reply-attachment-image">
        <a href="${e.url}" target="_blank" rel="noopener">
          <img src="${e.url}" alt="${t(e.originalName||`image`)}" loading="lazy" />
        </a>
      </div>`:`<div class="thread-reply-attachment-file">
      <a href="${e.url}" download="${t(e.originalName||`file`)}">
        <i class="ph ph-paperclip"></i> ${t(e.originalName||`file`)} (${n})
      </a>
    </div>`}destroy(){this.socket&&(this.onNewReply&&this.socket.off(`new_thread_reply`,this.onNewReply),this.onBotTyping&&this.socket.off(`bot_typing`,this.onBotTyping)),clearTimeout(this._toastTimer),this.container.innerHTML=``}async _shareMessage(e){let t=`[${e.senderName||`알 수 없음`}] ${e.content}`;if(navigator.share)try{await navigator.share({title:`MyTok 메시지 공유`,text:t,url:window.location.href})}catch(e){e.name!==`AbortError`&&(console.error(`공유 실패:`,e),this._copyToClipboardFallback(t))}else this._copyToClipboardFallback(t)}async _copyToClipboardFallback(e){await n(e)?this._showToast(`클립보드에 복사되었습니다.`):alert(`복사에 실패했습니다.`)}_showToast(e){let t=document.getElementById(`mytok-toast`);t||(t=document.createElement(`div`),t.id=`mytok-toast`,document.body.appendChild(t)),t.textContent=e,t.className=`mytok-toast show`,clearTimeout(this._toastTimer),this._toastTimer=setTimeout(()=>{t.className=`mytok-toast`},2e3)}};export{o as ThreadPanel};
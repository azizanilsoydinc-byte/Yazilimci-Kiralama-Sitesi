/* ============================================================
   Kodla — mesajlar.js
   Sipariş bazlı sohbet: mesajlaşma, dosya/video yükleme,
   satıcının sipariş durumunu güncellemesi.
   Not: Dosyalar prototip amacıyla base64 olarak localStorage'a
   yazılır. Tarayıcı localStorage kotası (~5-10MB) sınırlıdır,
   bu yüzden gerçek kullanımda dosyalar bir sunucuya/obje
   depolamaya (S3 vb.) yüklenmelidir.
   ============================================================ */

let currentOrderId = null;
let pendingAttachment = null; // {name, type, dataUrl}

function initChatPage(){
  const user = DB.currentUser();
  if(!user){ window.location.href = 'giris.html'; return; }

  const params = new URLSearchParams(window.location.search);
  currentOrderId = params.get('orderId');

  renderChatList(user);

  if(currentOrderId){
    openConversation(currentOrderId, user);
  } else {
    const orders = myOrders(user);
    if(orders.length) openConversation(orders[0].id, user);
  }

  document.getElementById('chat-send-form')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    sendMessage(user);
  });
  document.getElementById('chat-file-input')?.addEventListener('change', (e)=> handleFileSelect(e, false));
  document.getElementById('chat-video-input')?.addEventListener('change', (e)=> handleFileSelect(e, true));
}

function myOrders(user){
  return DB.orders().filter(o=> user.role === 'satici' ? o.sellerId === user.id : o.buyerId === user.id)
    .sort((a,b)=> b.tarih - a.tarih);
}

function renderChatList(user){
  const listEl = document.getElementById('chat-list');
  if(!listEl) return;
  const orders = myOrders(user);
  const msgs = DB.messages();

  if(orders.length === 0){
    listEl.innerHTML = `<div class="empty-state"><div class="glyph">∅</div>Henüz aktif bir siparişin yok.</div>`;
    return;
  }

  listEl.innerHTML = orders.map(o=>{
    const other = DB.getUser(user.role === 'satici' ? o.buyerId : o.sellerId);
    const last = msgs.filter(m=> m.orderId === o.id).sort((a,b)=> b.tarih-a.tarih)[0];
    return `
      <div class="chat-list-item ${o.id===currentOrderId?'active':''}" data-order="${o.id}">
        <img src="${other?.avatar}" class="avatar" style="width:38px;height:38px" alt="">
        <div style="min-width:0">
          <div class="name">${other?.name || 'Kullanıcı'}</div>
          <div class="last">${last ? last.text || '📎 Dosya' : o.baslik}</div>
        </div>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.chat-list-item').forEach(el=>{
    el.addEventListener('click', ()=> openConversation(el.dataset.order, user));
  });
}

function openConversation(orderId, user){
  currentOrderId = orderId;
  const order = DB.orders().find(o=> o.id === orderId);
  const mainEl = document.getElementById('chat-main-area');
  if(!order || !mainEl){
    if(mainEl) mainEl.innerHTML = `<div class="empty-state" style="margin:auto"><div class="glyph">∅</div>Bir sohbet seç.</div>`;
    return;
  }

  document.querySelectorAll('.chat-list-item').forEach(el=> el.classList.toggle('active', el.dataset.order === orderId));

  const other = DB.getUser(user.role === 'satici' ? order.buyerId : order.sellerId);
  const isSeller = user.role === 'satici';
  const statusLabel = {inceleniyor:'İnceleniyor', hazirlaniyor:'Hazırlanıyor', denetleniyor:'Denetleniyor', hazir:'Hazır'};

  mainEl.innerHTML = `
    <div class="chat-top">
      <div class="who">
        <img src="${other?.avatar}" class="avatar" style="width:36px;height:36px" alt="">
        <div>
          <div style="font-weight:700;font-size:.92rem">${other?.name || ''}</div>
          <div style="font-size:.78rem;color:var(--muted-2)">${order.baslik}</div>
        </div>
      </div>
      ${isSeller ? `
        <select class="status-select" id="order-status-select">
          <option value="inceleniyor">İnceleniyor</option>
          <option value="hazirlaniyor">Hazırlanıyor</option>
          <option value="denetleniyor">Denetleniyor</option>
          <option value="hazir">Hazır</option>
        </select>` : `<span class="status-pill status-${order.durum}">${statusLabel[order.durum]}</span>`}
    </div>
    <div class="chat-body" id="chat-body"></div>
    <div class="file-preview-bar" id="file-preview-bar"></div>
    <form class="chat-input" id="chat-send-form">
      <input type="file" id="chat-file-input" style="display:none" accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg,.txt,.js,.ts,.py,.json">
      <input type="file" id="chat-video-input" style="display:none" accept="video/*">
      <button type="button" class="icon-btn" id="attach-file-btn" title="Dosya ekle">📎</button>
      <button type="button" class="icon-btn" id="attach-video-btn" title="Video gönder (opsiyonel)">🎥</button>
      <textarea id="chat-input-text" placeholder="Mesajını yaz..."></textarea>
      <button type="submit" class="btn btn-primary">Gönder</button>
    </form>`;

  document.getElementById('chat-file-input').addEventListener('change', (e)=> handleFileSelect(e, false));
  document.getElementById('chat-video-input').addEventListener('change', (e)=> handleFileSelect(e, true));
  document.getElementById('attach-file-btn').addEventListener('click', ()=> document.getElementById('chat-file-input').click());
  document.getElementById('attach-video-btn').addEventListener('click', ()=> document.getElementById('chat-video-input').click());
  document.getElementById('chat-send-form').addEventListener('submit', (e)=>{ e.preventDefault(); sendMessage(user); });

  if(isSeller){
    const sel = document.getElementById('order-status-select');
    sel.value = order.durum;
    sel.addEventListener('change', ()=> updateOrderStatus(order.id, sel.value, user));
  }

  renderMessages(orderId, user);
}

function renderMessages(orderId, user){
  const body = document.getElementById('chat-body');
  if(!body) return;
  const msgs = DB.messages().filter(m=> m.orderId === orderId).sort((a,b)=> a.tarih-b.tarih);
  if(msgs.length === 0){
    body.innerHTML = `<div class="system-msg">Sohbetin başlangıcı — bir mesaj göndererek başla.</div>`;
    return;
  }
  body.innerHTML = msgs.map(m=>{
    if(m.system) return `<div class="system-msg">${m.text}</div>`;
    const mine = m.senderId === user.id;
    let fileHtml = '';
    if(m.dosya){
      if(m.dosya.type && m.dosya.type.startsWith('video/')){
        fileHtml = `<video controls src="${m.dosya.dataUrl}"></video>`;
      } else {
        fileHtml = `<div class="file-chip">📎 ${m.dosya.name}</div>`;
      }
    }
    return `
      <div class="msg ${mine?'me':''}">
        ${m.text ? `<div>${m.text}</div>` : ''}
        ${fileHtml}
        <div class="meta">${timeAgo(m.tarih)}</div>
      </div>`;
  }).join('');
  body.scrollTop = body.scrollHeight;
}

function handleFileSelect(e, isVideo){
  const file = e.target.files[0];
  if(!file) return;
  const maxMb = isVideo ? 15 : 5;
  if(file.size > maxMb * 1024 * 1024){
    toast(`Dosya çok büyük. Prototip depolama sınırı ${maxMb}MB.`);
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = ()=>{
    pendingAttachment = { name: file.name, type: file.type, dataUrl: reader.result };
    const bar = document.getElementById('file-preview-bar');
    bar.innerHTML = `<div class="chip">${isVideo ? '🎥' : '📎'} ${file.name} <button type="button" id="remove-attach">✕</button></div>`;
    document.getElementById('remove-attach').addEventListener('click', ()=>{ pendingAttachment = null; bar.innerHTML=''; });
  };
  reader.readAsDataURL(file);
}

function sendMessage(user){
  const textEl = document.getElementById('chat-input-text');
  const text = textEl.value.trim();
  if(!text && !pendingAttachment) return;

  const msgs = DB.messages();
  msgs.push({
    id: DB.uid('msg'), orderId: currentOrderId, senderId: user.id,
    text, dosya: pendingAttachment, tarih: Date.now()
  });
  DB.saveMessages(msgs);

  const order = DB.orders().find(o=> o.id === currentOrderId);
  const otherId = user.role === 'satici' ? order.buyerId : order.sellerId;
  DB.addNotification(otherId, `${user.name} sana yeni bir mesaj gönderdi.`, `mesajlar.html?orderId=${currentOrderId}`);

  textEl.value = '';
  pendingAttachment = null;
  document.getElementById('file-preview-bar').innerHTML = '';
  renderMessages(currentOrderId, user);
  renderChatList(user);
}

function updateOrderStatus(orderId, newStatus, user){
  const orders = DB.orders();
  const order = orders.find(o=> o.id === orderId);
  if(!order) return;
  order.durum = newStatus;
  DB.saveOrders(orders);

  const statusLabel = {inceleniyor:'İnceleniyor', hazirlaniyor:'Hazırlanıyor', denetleniyor:'Denetleniyor', hazir:'Hazır'};
  const msgs = DB.messages();
  msgs.push({ id: DB.uid('msg'), orderId, senderId:'system', text: `Sipariş durumu "${statusLabel[newStatus]}" olarak güncellendi.`, dosya:null, tarih: Date.now(), system:true });
  DB.saveMessages(msgs);

  if(newStatus === 'hazir'){
    DB.addNotification(order.buyerId, `Siparişin hazır! "${order.baslik}"`, `mesajlar.html?orderId=${orderId}`);
    toast('Alıcıya "sipariş hazır" bildirimi gönderildi.');
  } else {
    toast('Sipariş durumu güncellendi.');
  }
  renderMessages(orderId, user);
}

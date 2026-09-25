/* ============================================================
   Kodla — app.js
   Tüm sayfalarda ortak kullanılan yardımcı fonksiyonlar:
   header/bildirim çizimi, toast bildirimleri, tarih formatlama,
   oturum kontrolü.
   ============================================================ */

function fmtTL(n){
  return Number(n).toLocaleString('tr-TR') + ' ₺';
}

function timeAgo(ts){
  const diff = Date.now() - ts;
  const min = Math.floor(diff/60000);
  if(min < 1) return 'az önce';
  if(min < 60) return min + ' dk önce';
  const hr = Math.floor(min/60);
  if(hr < 24) return hr + ' sa önce';
  const day = Math.floor(hr/24);
  if(day < 7) return day + ' gün önce';
  return new Date(ts).toLocaleDateString('tr-TR');
}

function toast(msg){
  let root = document.getElementById('toast-root');
  if(!root){
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(()=> el.remove(), 3400);
}

function requireAuth(role){
  const u = DB.currentUser();
  if(!u || (role && u.role !== role)){
    window.location.href = 'giris.html';
    return null;
  }
  return u;
}

function logout(){
  DB.clearSession();
  window.location.href = 'index.html';
}

/* ---------------- Header ---------------- */
function renderHeader(mountId){
  const mount = document.getElementById(mountId || 'header-mount');
  if(!mount) return;
  const user = DB.currentUser();

  let actionsHtml = '';
  if(user){
    const panelUrl = user.role === 'satici' ? 'satici-panel.html' : user.role === 'admin' ? 'admin.html' : 'alici-panel.html';
    actionsHtml = `
      <div class="dropdown" id="notif-dd">
        <button class="bell" id="bell-btn" aria-label="Bildirimler">
          🔔<span class="badge" id="notif-badge" style="display:none">0</span>
        </button>
        <div class="notif-panel" id="notif-panel"></div>
      </div>
      <div class="dropdown" id="user-dd">
        <button class="btn btn-ghost" id="user-btn">
          <img src="${user.avatar}" class="avatar" style="width:26px;height:26px;margin-right:2px" alt="">
          ${user.name.split(' ')[0]}
        </button>
        <div class="dropdown-panel">
          <a href="${panelUrl}">Panelim</a>
          ${user.role !== 'admin' ? `<a href="${panelUrl.replace('.html','.html?tab=profil')}">Profilim</a>` : ''}
          <button id="logout-btn">Çıkış Yap</button>
        </div>
      </div>`;
  } else {
    actionsHtml = `
      <div class="dropdown" id="login-dd">
        <button class="btn btn-ghost" id="login-btn">Giriş Yap ▾</button>
        <div class="dropdown-panel">
          <a href="giris.html?role=alici">Alıcı olarak giriş yap</a>
          <a href="giris.html?role=satici">Satıcı olarak giriş yap</a>
          <a href="giris.html?role=admin">Yönetici olarak giriş yap</a>
        </div>
      </div>
      <a href="kayit.html" class="btn btn-primary">Kayıt Ol</a>`;
  }

  mount.innerHTML = `
    <header class="site-header">
      <div class="container">
        <a href="index.html" class="logo"><span class="dot"></span> Kodla</a>
        <nav class="main-nav">
          <a href="index.html#nasil-calisir">Nasıl Çalışır</a>
          <a href="index.html#saticilar">Satıcılar</a>
          <a href="sss.html">SSS</a>
          <a href="destek.html">Destek</a>
        </nav>
        <div class="header-actions">${actionsHtml}</div>
      </div>
    </header>`;

  // dropdown toggles
  document.querySelectorAll('.dropdown').forEach(dd=>{
    const btn = dd.querySelector('button');
    if(!btn) return;
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const wasOpen = dd.classList.contains('open');
      document.querySelectorAll('.dropdown.open').forEach(o=>o.classList.remove('open'));
      if(!wasOpen) dd.classList.add('open');
      if(dd.id === 'notif-dd' && !wasOpen) renderNotifications(user);
    });
  });
  document.addEventListener('click', ()=> document.querySelectorAll('.dropdown.open').forEach(o=>o.classList.remove('open')));

  const logoutBtn = document.getElementById('logout-btn');
  if(logoutBtn) logoutBtn.addEventListener('click', logout);

  if(user) updateNotifBadge(user.id);
}

function updateNotifBadge(userId){
  const badge = document.getElementById('notif-badge');
  if(!badge) return;
  const count = DB.notifications().filter(n=> n.userId === userId && !n.okundu).length;
  if(count > 0){ badge.style.display='flex'; badge.textContent = count > 9 ? '9+' : count; }
  else badge.style.display='none';
}

function renderNotifications(user){
  const panel = document.getElementById('notif-panel');
  if(!panel) return;
  const items = DB.notifications().filter(n=> n.userId === user.id).slice(0,15);
  if(items.length === 0){
    panel.innerHTML = `<div class="notif-empty">Henüz bildirimin yok.</div>`;
    return;
  }
  panel.innerHTML = items.map(n=>`
    <a class="notif-item ${n.okundu?'':'unread'}" href="${n.link}" data-id="${n.id}">
      <div>${n.text}</div>
      <div class="notif-time">${timeAgo(n.tarih)}</div>
    </a>`).join('');
  panel.querySelectorAll('.notif-item').forEach(el=>{
    el.addEventListener('click', ()=>{
      const list = DB.notifications();
      const n = list.find(x=>x.id === el.dataset.id);
      if(n){ n.okundu = true; DB.saveNotifications(list); }
    });
  });
}

function getSupportThreads(){
  try {
    return JSON.parse(localStorage.getItem('kodla_support_threads') || '[]');
  } catch (e) {
    return [];
  }
}

function saveSupportThreads(threads){
  localStorage.setItem('kodla_support_threads', JSON.stringify(threads));
}

function getSupportThreadKey({ userId = null, name = 'Misafir' }){
  if(userId) return 'user_' + userId;
  const safe = (name || 'misafir').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'misafir';
  return 'guest_' + safe;
}

function getSupportThread({ userId = null, name = 'Misafir' }){
  const threads = getSupportThreads();
  const key = getSupportThreadKey({ userId, name });
  let thread = threads.find(t => t.key === key);
  if(!thread){
    thread = {
      key,
      userId: userId || null,
      name: (name || 'Misafir').trim() || 'Misafir',
      messages: []
    };
    threads.push(thread);
    saveSupportThreads(threads);
  }
  return thread;
}

function addSupportMessage({ userId = null, name = 'Misafir', text, role = 'user' }){
  const thread = getSupportThread({ userId, name });
  const msg = {
    id: DB.uid ? DB.uid('support') : 'support_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    name,
    text,
    role,
    tarih: Date.now()
  };
  thread.messages.push(msg);
  const threads = getSupportThreads();
  const idx = threads.findIndex(t => t.key === thread.key);
  if(idx >= 0) threads[idx] = thread;
  saveSupportThreads(threads);
  return msg;
}

function deleteSupportThread(threadKey){
  const threads = getSupportThreads().filter(t => t.key !== threadKey);
  saveSupportThreads(threads);
}

function renderSupportChatWidget(){
  const existing = document.getElementById('support-widget');
  if(existing) return;

  const widget = document.createElement('div');
  widget.id = 'support-widget';
  widget.className = 'support-widget';
  widget.innerHTML = `
    <button class="support-launch" type="button" aria-label="Destek sohbeti aç">
      <span>💬</span>
      <span>Canlı Destek</span>
    </button>
    <div class="support-panel" id="support-panel" aria-hidden="true">
      <div class="support-topbar">
        <div>
          <strong>Kodla Destek</strong>
          <small>Yönetici canlı sohbet</small>
        </div>
        <div class="support-actions">
          <a href="${DB.currentUser() && DB.currentUser().role === 'admin' ? 'admin.html' : 'giris.html?role=admin'}" class="support-admin-link" target="_self">Yönetici</a>
          <button type="button" class="support-close" aria-label="Kapat">✕</button>
        </div>
      </div>
      <div class="support-messages" id="support-messages"></div>
      <form id="support-form" class="support-form">
        <input type="text" id="support-name" placeholder="Adın" value="${(DB.currentUser() && DB.currentUser().name) || ''}" maxlength="30">
        <textarea id="support-text" rows="3" placeholder="Sorunu yaz..." required></textarea>
        <button type="submit" class="btn btn-primary btn-block">Gönder</button>
      </form>
    </div>
  `;

  document.body.appendChild(widget);

  const launch = widget.querySelector('.support-launch');
  const panel = widget.querySelector('#support-panel');
  const closeBtn = widget.querySelector('.support-close');
  const form = widget.querySelector('#support-form');

  const toggle = () => {
    const isOpen = panel.classList.toggle('open');
    panel.setAttribute('aria-hidden', String(!isOpen));
    if(isOpen) renderSupportMessages();
  };

  launch.addEventListener('click', toggle);
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const currentUser = DB.currentUser();
    const name = (document.getElementById('support-name').value || (currentUser ? currentUser.name : 'Misafir')).trim() || 'Misafir';
    const text = document.getElementById('support-text').value.trim();
    if(!text) return;
    addSupportMessage({ userId: currentUser ? currentUser.id : null, name, text, role: 'user' });
    document.getElementById('support-text').value = '';
    renderSupportMessages();
    setTimeout(() => {
      addSupportMessage({
        userId: 'u_admin1',
        name: 'Kodla Yönetimi',
        text: 'Teşekkürler, destek ekibimiz en kısa sürede sana dönüş yapacak.',
        role: 'admin'
      });
      renderSupportMessages();
    }, 500);
  });

  renderSupportMessages();
}

function renderSupportMessages(){
  const panel = document.getElementById('support-panel');
  if(!panel) return;
  const container = document.getElementById('support-messages');
  if(!container) return;

  const currentUser = DB.currentUser();
  const nameInput = document.getElementById('support-name');
  const name = (nameInput ? nameInput.value : '') || (currentUser ? currentUser.name : 'Misafir');
  const thread = getSupportThread({ userId: currentUser ? currentUser.id : null, name });
  const messages = thread.messages || [];
  if(messages.length === 0){
    container.innerHTML = `<div class="support-empty">Merhaba! Soruların için buradan yazabilirsin.</div>`;
    return;
  }

  container.innerHTML = messages.slice(-8).map(m => `
    <div class="support-bubble ${m.role === 'admin' ? 'admin' : 'user'}">
      <strong>${m.name}</strong>
      <p>${m.text}</p>
      <small>${new Date(m.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</small>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

/* ---------------- Ortak: teklif -> sipariş dönüşümü ----------------
   Hem alıcı hem satıcı tarafından kullanılır (teklif kabul / karşı
   teklif kabul), bu yüzden ortak app.js içinde tanımlanır. */
function createOrderFromOffer(offer, finalTutar){
  const orders = DB.orders();
  const order = {
    id: DB.uid('siparis'), buyerId: offer.buyerId, sellerId: offer.sellerId,
    baslik: offer.aciklama.slice(0,60), tutar: finalTutar, durum:'inceleniyor', video:null, tarih: Date.now()
  };
  orders.push(order);
  DB.saveOrders(orders);

  const seller = DB.getUser(offer.sellerId);
  const buyer = DB.getUser(offer.buyerId);
  const currentMessages = DB.messages();
  currentMessages.push({
    id: DB.uid('msg'),
    orderId: order.id,
    senderId: offer.sellerId,
    text: `Teklifinizi kabul ettim. Merhaba! İhtiyaçlarınızı ve dosyaları bu sohbet üzerinden paylaşacağız.`,
    dosya: null,
    tarih: Date.now(),
    system: false
  });
  DB.saveMessages(currentMessages);

  DB.addNotification(offer.sellerId, `${buyer.name} ile yeni bir sipariş başladı.`, `mesajlar.html?orderId=${order.id}`);
  DB.addNotification(offer.buyerId, `${seller.name} ile siparişin oluşturuldu.`, `mesajlar.html?orderId=${order.id}`);
  return order;
}

function openOrderChat(orderId){
  if(!orderId) return;
  window.location.href = 'mesajlar.html?orderId=' + encodeURIComponent(orderId);
}

function ensureSupportThreadForTicket({ userId = null, name = 'Misafir', message = '' }){
  if(!message) return null;
  const thread = getSupportThread({ userId, name });
  addSupportMessage({ userId, name, text: message, role: 'user' });
  return thread;
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderHeader();
  renderSupportChatWidget();
});

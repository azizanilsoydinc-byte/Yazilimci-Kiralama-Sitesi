/* ============================================================
   Kodla — satici.js
   Satıcı tarafı: gelen teklifleri görüntüleme/karşı teklif verme,
   siparişlerin durumunu güncelleme, fiyat aralığı ayarları.
   ============================================================ */

/* ---------------- Gelen Teklifler ---------------- */
function renderIncomingOffers(){
  const mount = document.getElementById('incoming-offers');
  if(!mount) return;
  const user = requireAuth('satici');
  if(!user) return;

  const offers = DB.offers().filter(o=> o.sellerId === user.id).sort((a,b)=> b.tarih-a.tarih);
  const statusLabel = {bekliyor:'Yanıt bekliyor', karsi_teklif:'Karşı teklif gönderildi', kabul:'Kabul edildi', reddedildi:'Reddedildi'};

  if(offers.length === 0){
    mount.innerHTML = `<div class="empty-state"><div class="glyph">∅</div>Henüz gelen bir teklif yok. Profilin tamamlandıkça alıcılar teklif göndermeye başlayacak.</div>`;
    return;
  }

  mount.innerHTML = offers.map(o=>{
    const buyer = DB.getUser(o.buyerId);
    return `
      <div class="list-card">
        <div class="meta">
          <div>
            <h3>${buyer ? buyer.name : 'Alıcı'}</h3>
            <div class="sub">${o.aciklama}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="price-pill" style="margin-bottom:6px">${fmtTL(o.tutar)}</div><br>
            <span class="status-pill status-${o.durum}">${statusLabel[o.durum]}</span>
          </div>
        </div>
        ${o.durum === 'bekliyor' ? `
          <div style="display:flex;gap:10px;margin-top:14px">
            <button class="btn btn-primary btn-sm" data-accept-offer="${o.id}">Teklifi Kabul Et</button>
            <button class="btn btn-outline btn-sm" data-counter-offer="${o.id}">Karşı Teklif Ver</button>
          </div>
          <div class="repeater-item" style="display:none;margin-top:14px" id="counter-form-${o.id}">
            <div class="field" style="margin-bottom:8px">
              <label>Karşı teklif tutarı (₺)</label>
              <input type="number" min="1" id="counter-tutar-${o.id}" placeholder="Örn: 18000">
            </div>
            <div class="field" style="margin-bottom:8px">
              <label>Yorumun (opsiyonel)</label>
              <textarea id="counter-yorum-${o.id}" placeholder="Neden bu tutarı önerdiğini kısaca açıkla"></textarea>
            </div>
            <button class="btn btn-primary btn-sm" data-send-counter="${o.id}">Karşı Teklifi Gönder</button>
          </div>` : ''}
        ${o.durum === 'karsi_teklif' ? `<div class="hint" style="margin-top:10px;color:var(--muted-2);font-size:.82rem">Karşı teklifin: ${fmtTL(o.karsiTutar)} — alıcının yanıtı bekleniyor.</div>` : ''}
      </div>`;
  }).join('');

  mount.querySelectorAll('[data-accept-offer]').forEach(btn=> btn.addEventListener('click', ()=> acceptOffer(btn.dataset.acceptOffer)));
  mount.querySelectorAll('[data-counter-offer]').forEach(btn=> btn.addEventListener('click', ()=>{
    document.getElementById('counter-form-' + btn.dataset.counterOffer).style.display = 'block';
  }));
  mount.querySelectorAll('[data-send-counter]').forEach(btn=> btn.addEventListener('click', ()=>{
    const id = btn.dataset.sendCounter;
    const tutar = Number(document.getElementById('counter-tutar-'+id).value);
    const yorum = document.getElementById('counter-yorum-'+id).value.trim();
    if(!tutar || tutar <= 0){ toast('Lütfen geçerli bir tutar gir.'); return; }
    sendCounterOffer(id, tutar, yorum);
  }));
}

function acceptOffer(offerId){
  const offers = DB.offers();
  const offer = offers.find(o=> o.id === offerId);
  if(!offer) return;
  offer.durum = 'kabul';
  DB.saveOffers(offers);

  const newOrder = createOrderFromOffer(offer, offer.tutar);
  DB.addNotification(offer.buyerId, `${DB.getUser(offer.sellerId).name} teklifinizi kabul etti. Sipariş sohbeti açıldı.`, `mesajlar.html?orderId=${newOrder.id}`);

  toast('Teklifi kabul ettin, sohbet açıldı.');
  renderIncomingOffers();
  renderSellerOrders();
  window.location.assign('mesajlar.html?orderId=' + encodeURIComponent(newOrder.id));
}

function sendCounterOffer(offerId, tutar, yorum){
  const offers = DB.offers();
  const offer = offers.find(o=> o.id === offerId);
  if(!offer) return;
  offer.durum = 'karsi_teklif';
  offer.karsiTutar = tutar;
  offer.karsiYorum = yorum;
  DB.saveOffers(offers);
  const buyer = DB.getUser(offer.buyerId);
  DB.addNotification(offer.buyerId, `${DB.getUser(offer.sellerId).name} size karşı teklif gönderdi.`, 'alici-panel.html?tab=teklifler');
  toast('Karşı teklifin gönderildi.');
  renderIncomingOffers();
}

/* ---------------- Siparişlerim (satıcı) ---------------- */
function renderSellerOrders(){
  const mount = document.getElementById('seller-orders');
  if(!mount) return;
  const user = requireAuth('satici');
  if(!user) return;

  const orders = DB.orders().filter(o=> o.sellerId === user.id).sort((a,b)=> b.tarih-a.tarih);
  const statusLabel = {inceleniyor:'İnceleniyor', hazirlaniyor:'Hazırlanıyor', denetleniyor:'Denetleniyor', hazir:'Hazır'};

  mount.innerHTML = orders.length ? orders.map(o=>{
    const buyer = DB.getUser(o.buyerId);
    return `
      <a class="list-card" href="mesajlar.html?orderId=${o.id}" style="display:block">
        <div class="meta">
          <div>
            <h3>${o.baslik}</h3>
            <div class="sub">${buyer ? buyer.name : ''} · ${fmtTL(o.tutar)}</div>
          </div>
          <span class="status-pill status-${o.durum}">${statusLabel[o.durum]}</span>
        </div>
      </a>`;
  }).join('') : `<div class="empty-state"><div class="glyph">∅</div>Henüz bir siparişin yok. Kabul ettiğin teklifler burada sipariş olarak görünecek.</div>`;
}

/* ---------------- Bildirimler tab (panel içi liste) ---------------- */
function renderNotifTab(){
  const mount = document.getElementById('notif-tab-list');
  if(!mount) return;
  const user = DB.currentUser();
  if(!user) return;
  const items = DB.notifications().filter(n=> n.userId === user.id).sort((a,b)=> b.tarih-a.tarih);
  mount.innerHTML = items.length ? items.map(n=>`
    <a class="list-card" href="${n.link}" style="display:block;${n.okundu?'':'border-left:3px solid var(--accent)'}">
      <div>${n.text}</div>
      <div class="notif-time" style="margin-top:6px">${timeAgo(n.tarih)}</div>
    </a>`).join('') : `<div class="empty-state"><div class="glyph">∅</div>Henüz bildirimin yok.</div>`;
}

/* ---------------- Profil ayarları (fiyat aralığı vs.) ---------------- */
function initSellerProfileForm(){
  const form = document.getElementById('seller-settings-form');
  if(!form) return;
  const user = requireAuth('satici');
  if(!user) return;

  document.getElementById('set-title').value = user.title || '';
  document.getElementById('set-hakkinda').value = user.hakkinda || '';
  document.getElementById('set-min').value = user.minFiyat || '';
  document.getElementById('set-max').value = user.maxFiyat || '';
  document.getElementById('set-uzmanlik').value = (user.uzmanlik||[]).join(', ');

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const users = DB.users();
    const u = users.find(x=> x.id === user.id);
    u.title = document.getElementById('set-title').value.trim();
    u.hakkinda = document.getElementById('set-hakkinda').value.trim();
    u.minFiyat = Number(document.getElementById('set-min').value || 0);
    u.maxFiyat = Number(document.getElementById('set-max').value || 0);
    u.uzmanlik = document.getElementById('set-uzmanlik').value.split(',').map(s=>s.trim()).filter(Boolean);
    DB.saveUsers(users);
    toast('Profilin güncellendi.');
  });
}

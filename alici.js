/* ============================================================
   Kodla — alici.js
   Alıcı tarafı: satıcıları listeleme/filtreleme, satıcı profilinde
   teklif verme, kendi tekliflerini ve siparişlerini görüntüleme.
   ============================================================ */

function allSellers(){ return DB.users().filter(u=> u.role === 'satici'); }

function sellerCardHtml(s){
  const uzmanlik = (s.uzmanlik||[]).slice(0,3).map(t=>`<span class="tag">${t}</span>`).join('');
  return `
    <a href="satici-profil.html?id=${s.id}" class="seller-card">
      <div class="top">
        <img src="${s.avatar}" class="avatar" alt="">
        <div>
          <div class="name">${s.name}</div>
          <div class="title">${s.title || 'Yazılım Geliştirici'}</div>
        </div>
      </div>
      <div class="tag-row">${uzmanlik}</div>
      <div class="card-foot">
        <span class="price-pill">${fmtTL(s.minFiyat||0)} – ${fmtTL(s.maxFiyat||0)}</span>
        ${s.rating ? `<span style="font-size:.8rem;color:var(--muted-2)">★ ${s.rating} · ${s.tamamlanan} iş</span>` : ''}
      </div>
    </a>`;
}

function renderSellerGrid(){
  const grid = document.getElementById('seller-grid');
  const searchEl = document.getElementById('seller-search');
  const filterEl = document.getElementById('seller-filter');
  if(!grid) return;

  const allTags = new Set();
  allSellers().forEach(s => (s.uzmanlik||[]).forEach(t=> allTags.add(t)));
  if(filterEl){
    filterEl.innerHTML = `<option value="">Tüm uzmanlıklar</option>` +
      [...allTags].sort().map(t=>`<option value="${t}">${t}</option>`).join('');
  }

  function draw(){
    const q = (searchEl?.value || '').toLowerCase().trim();
    const tag = filterEl?.value || '';
    let list = allSellers();
    if(q) list = list.filter(s => (s.name+' '+(s.title||'')+' '+(s.uzmanlik||[]).join(' ')).toLowerCase().includes(q));
    if(tag) list = list.filter(s => (s.uzmanlik||[]).includes(tag));

    grid.innerHTML = list.length
      ? list.map(sellerCardHtml).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><div class="glyph">∅</div>Aramanla eşleşen satıcı bulunamadı.</div>`;
  }
  searchEl?.addEventListener('input', draw);
  filterEl?.addEventListener('change', draw);
  draw();
}

/* ---------------- Satıcı profil sayfası ---------------- */
function renderSellerProfile(){
  const params = new URLSearchParams(window.location.search);
  const seller = DB.getUser(params.get('id'));
  const mount = document.getElementById('profile-mount');
  if(!mount) return;

  if(!seller){
    mount.innerHTML = `<div class="empty-state"><div class="glyph">∅</div>Satıcı bulunamadı.</div>`;
    return;
  }

  const uzmanlik = (seller.uzmanlik||[]).map(t=>`<span class="tag accent">${t}</span>`).join('');
  const projeler = (seller.projeler||[]).length
    ? seller.projeler.map(p=>`<div class="project-item"><h4>${p.baslik}</h4><p>${p.aciklama}</p></div>`).join('')
    : `<p style="margin:0">Henüz paylaşılan bir proje yok.</p>`;

  const user = DB.currentUser();
  const canOffer = user && user.role === 'alici';

  mount.innerHTML = `
    <div class="profile-head">
      <img src="${seller.avatar}" class="avatar lg" alt="">
      <div class="info" style="flex:1">
        <h1>${seller.name}</h1>
        <div class="title">${seller.title || 'Yazılım Geliştirici'}</div>
        <div class="tag-row">${uzmanlik}</div>
      </div>
      <div style="text-align:right">
        <div class="price-pill" style="margin-bottom:10px">${fmtTL(seller.minFiyat||0)} – ${fmtTL(seller.maxFiyat||0)}</div><br>
        ${canOffer ? `<button class="btn btn-primary" id="teklif-ver-btn">Teklif Ver</button>`
                   : (user ? '' : `<a href="giris.html?role=alici" class="btn btn-outline">Teklif vermek için giriş yap</a>`)}
      </div>
    </div>
    <div class="profile-grid">
      <div>
        <div class="panel-block">
          <h3>Hakkında</h3>
          <p style="margin:0">${seller.hakkinda || ''}</p>
        </div>
        <div class="panel-block">
          <h3>Geçmiş Projeler</h3>
          ${projeler}
        </div>
      </div>
      <div class="sticky-side">
        <div class="panel-block">
          <h3>Eğitim</h3>
          <p style="margin:0">${seller.mezuniyet || 'Belirtilmedi'}</p>
        </div>
        <div class="panel-block">
          <h3>İstatistikler</h3>
          <p style="margin:0 0 6px">★ ${seller.rating || '—'} puan</p>
          <p style="margin:0">${seller.tamamlanan || 0} tamamlanan proje</p>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="teklif-modal">
      <div class="modal">
        <h2>${seller.name}'e teklif ver</h2>
        <div class="sub">İhtiyacını anlat ve önerdiğin bütçeyi belirt. Satıcı teklifini onaylayabilir ya da karşı teklif verebilir.</div>
        <div class="error-box" id="teklif-error"></div>
        <form id="teklif-form">
          <div class="field">
            <label>Ne yapılmasını istiyorsun?</label>
            <textarea id="teklif-aciklama" placeholder="Projeni kısaca anlat: kapsam, özellikler, süre beklentisi..." required></textarea>
          </div>
          <div class="field">
            <label>Bütçe teklifin (₺)</label>
            <input type="number" id="teklif-tutar" min="1" placeholder="Örn: 15000" required>
            <div class="hint">Bu satıcının fiyat aralığı: ${fmtTL(seller.minFiyat||0)} – ${fmtTL(seller.maxFiyat||0)}</div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost btn-block" id="teklif-cancel">Vazgeç</button>
            <button type="submit" class="btn btn-primary btn-block">Teklifi Gönder</button>
          </div>
        </form>
      </div>
    </div>`;

  const modal = document.getElementById('teklif-modal');
  const openBtn = document.getElementById('teklif-ver-btn');
  if(openBtn) openBtn.addEventListener('click', ()=> modal.classList.add('open'));
  document.getElementById('teklif-cancel')?.addEventListener('click', ()=> modal.classList.remove('open'));

  document.getElementById('teklif-form')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const aciklama = document.getElementById('teklif-aciklama').value.trim();
    const tutar = Number(document.getElementById('teklif-tutar').value);
    const errBox = document.getElementById('teklif-error');
    if(!aciklama || !tutar || tutar <= 0){
      errBox.textContent = 'Lütfen açıklama ve geçerli bir tutar gir.';
      errBox.classList.add('show'); return;
    }
    const offers = DB.offers();
    offers.push({
      id: DB.uid('teklif'), buyerId: user.id, sellerId: seller.id,
      aciklama, tutar, durum:'bekliyor', karsiTutar:null, karsiYorum:null, tarih: Date.now()
    });
    DB.saveOffers(offers);
    DB.addNotification(seller.id, `${user.name} size yeni bir teklif gönderdi.`, 'satici-panel.html?tab=teklifler');
    modal.classList.remove('open');
    toast('Teklifin satıcıya iletildi!');
    document.getElementById('teklif-form').reset();
  });
}

/* ---------------- Alıcı: Tekliflerim ---------------- */
function renderMyOffers(){
  // alici.js - renderMyOffers fonksiyonu
const mount = document.getElementById('my-offers');
  if(!mount) return;
  const user = requireAuth('alici');
  if(!user) return;

  const offers = DB.offers().filter(o=> o.buyerId === user.id).sort((a,b)=> b.tarih-a.tarih);
  if(offers.length === 0){
    mount.innerHTML = `<div class="empty-state"><div class="glyph">∅</div>Henüz bir teklif göndermedin. Satıcıları incele ve ilk teklifini gönder.</div>`;
    return;
  }
  mount.innerHTML = offers.map(o=>{
    const seller = DB.getUser(o.sellerId);
    const statusLabel = {bekliyor:'Yanıt bekleniyor', karsi_teklif:'Karşı teklif geldi', kabul:'Kabul edildi', reddedildi:'Reddedildi'}[o.durum];
    let extra = '';
    if(o.durum === 'karsi_teklif'){
      extra = `
        <div class="panel-block" style="margin:12px 0 0;background:var(--accent-soft);border:none">
          <b>Satıcının karşı teklifi:</b> ${fmtTL(o.karsiTutar)}
          ${o.karsiYorum ? `<p style="margin:8px 0 0">"${o.karsiYorum}"</p>` : ''}
          <div style="display:flex;gap:10px;margin-top:12px">
            <button class="btn btn-primary btn-sm" data-accept="${o.id}">Karşı Teklifi Kabul Et</button>
            <button class="btn btn-outline btn-sm" data-reject="${o.id}">Reddet</button>
          </div>
        </div>`;
    }
    return `
      <div class="list-card">
        <div class="meta">
          <div>
            <h3>${seller ? seller.name : 'Satıcı'}</h3>
            <div class="sub">${o.aciklama}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="price-pill" style="margin-bottom:6px">${fmtTL(o.tutar)}</div><br>
            <span class="status-pill status-${o.durum}">${statusLabel}</span>
          </div>
        </div>
        ${extra}
      </div>`;
  }).join('');

  mount.querySelectorAll('[data-accept]').forEach(btn=> btn.addEventListener('click', ()=>{
    respondToCounter(btn.dataset.accept, true);
  }));
  mount.querySelectorAll('[data-reject]').forEach(btn=> btn.addEventListener('click', ()=>{
    respondToCounter(btn.dataset.reject, false);
  }));
}

function respondToCounter(offerId, accept){
  const offers = DB.offers();
  const offer = offers.find(o=> o.id === offerId);
  if(!offer) return;
  if(accept){
    offer.durum = 'kabul';
    DB.saveOffers(offers);
    const newOrder = createOrderFromOffer(offer, offer.karsiTutar);
    toast('Anlaştınız! Sipariş oluşturuldu.');
    renderMyOffers();
    renderMyOrders();
    window.location.assign('mesajlar.html?orderId=' + encodeURIComponent(newOrder.id));
    return;
  }

  offer.durum = 'reddedildi';
  DB.saveOffers(offers);
  DB.addNotification(offer.sellerId, `${DB.getUser(offer.buyerId).name} karşı teklifinizi reddetti.`, 'satici-panel.html?tab=teklifler');
  toast('Teklifi reddettin.');
  renderMyOffers();
}

/* ---------------- Alıcı: Siparişlerim ---------------- */
function renderMyOrders(){
  const mount = document.getElementById('my-orders');
  if(!mount) return;
  const user = requireAuth('alici');
  if(!user) return;

  const orders = DB.orders().filter(o=> o.buyerId === user.id).sort((a,b)=> b.tarih-a.tarih);
  const statusLabel = {inceleniyor:'İnceleniyor', hazirlaniyor:'Hazırlanıyor', denetleniyor:'Denetleniyor', hazir:'Hazır'};

  mount.innerHTML = orders.length ? orders.map(o=>{
    const seller = DB.getUser(o.sellerId);
    return `
      <a class="list-card" href="mesajlar.html?orderId=${o.id}" style="display:block">
        <div class="meta">
          <div>
            <h3>${o.baslik}</h3>
            <div class="sub">${seller ? seller.name : ''} · ${fmtTL(o.tutar)}</div>
          </div>
          <span class="status-pill status-${o.durum}">${statusLabel[o.durum]}</span>
        </div>
      </a>`;
  }).join('') : `<div class="empty-state"><div class="glyph">∅</div>Henüz bir siparişin yok.</div>`;
}

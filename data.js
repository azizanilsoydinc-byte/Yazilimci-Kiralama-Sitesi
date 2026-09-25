/* ============================================================
   Kodla — data.js
   Sahte ama "canlı" veri katmanı. Gerçek bir backend yok;
   her şey tarayıcının localStorage'ında saklanıyor, bu yüzden
   siteye eklenen kayıtlar sayfa yenilense/kapatılıp açılsa da kalıcı olur.
   GitHub Pages gibi statik hostinglerde çalışacak şekilde tasarlandı
   (localhost / sunucu gerektirmez).
   ============================================================ */

const DB_KEYS = {
  users: 'kodla_users',
  offers: 'kodla_teklifler',
  orders: 'kodla_siparisler',
  messages: 'kodla_mesajlar',
  notifications: 'kodla_bildirimler',
  session: 'kodla_session',
  seeded: 'kodla_seeded_v1'
};

const DB = {
  _get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  },
  _set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },

  users(){ return this._get(DB_KEYS.users, []); },
  saveUsers(u){ this._set(DB_KEYS.users, u); },

  offers(){ return this._get(DB_KEYS.offers, []); },
  saveOffers(o){ this._set(DB_KEYS.offers, o); },

  orders(){ return this._get(DB_KEYS.orders, []); },
  saveOrders(o){ this._set(DB_KEYS.orders, o); },

  messages(){ return this._get(DB_KEYS.messages, []); },
  saveMessages(m){ this._set(DB_KEYS.messages, m); },

  notifications(){ return this._get(DB_KEYS.notifications, []); },
  saveNotifications(n){ this._set(DB_KEYS.notifications, n); },

  uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); },

  getUser(id){ return this.users().find(u => u.id === id); },
  getUserByEmail(email, role){
    return this.users().find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);
  },

  addNotification(userId, text, link){
    const n = this.notifications();
    n.unshift({ id: this.uid('bild'), userId, text, link: link || '#', okundu:false, tarih: Date.now() });
    this.saveNotifications(n);
  },

  session(){ return this._get(DB_KEYS.session, null); },
  setSession(userId){ this._set(DB_KEYS.session, { userId }); },
  clearSession(){ localStorage.removeItem(DB_KEYS.session); },
  currentUser(){
    const s = this.session();
    if(!s) return null;
    return this.getUser(s.userId) || null;
  }
};

/* ------------------------------------------------------------
   İlk kurulum: örnek satıcı profilleri ve demo hesaplar.
   Prototip aşamasında olduğumuz için profil fotoğrafı, isim,
   mezuniyet ve geçmiş proje bilgileri örnek olarak dolduruldu.
   Bu blok sadece localStorage boşsa (ilk ziyarette) çalışır.
------------------------------------------------------------ */
function ensureBuiltinAdmin(){
  const users = DB.users();
  if(!users.some(u => u.role === 'admin' && u.email === 'admin@kodla.com')){
    users.push({
      id: 'u_admin1', role:'admin', email:'admin@kodla.com', password:'admin1234',
      name:'Kodla Yönetimi', avatar:'https://i.pravatar.cc/200?img=64'
    });
    DB.saveUsers(users);
  }
}

function seedDatabase(){
  const sellers = [
    {
      id: 'u_satici1', role:'satici', email:'ayse.yilmaz@gmail.com', password:'demo1234',
      name:'Ayşe Yılmaz', avatar:'https://i.pravatar.cc/200?img=47',
      title:'Full-Stack Web Geliştirici', mezuniyet:'Boğaziçi Üniversitesi — Bilgisayar Mühendisliği',
      uzmanlik:['React','Node.js','PostgreSQL','TypeScript'],
      hakkinda:'5 yıldır kurumsal web uygulamaları ve e-ticaret altyapıları geliştiriyorum. Temiz kod ve zamanında teslimat önceliğim.',
      minFiyat:8000, maxFiyat:45000,
      projeler:[
        {baslik:'B2B Sipariş Yönetim Paneli', aciklama:'Orta ölçekli bir tekstil firması için uçtan uca sipariş ve stok takip paneli geliştirdim.', link:''},
        {baslik:'Randevu Rezervasyon Sistemi', aciklama:'Klinikler için online randevu ve SMS hatırlatma sistemi kurdum.', link:''}
      ], rating:4.9, tamamlanan:23
    },
    {
      id:'u_satici2', role:'satici', email:'mert.demir@gmail.com', password:'demo1234',
      name:'Mert Demir', avatar:'https://i.pravatar.cc/200?img=12',
      title:'Mobil Uygulama Geliştirici (iOS/Android)', mezuniyet:'ODTÜ — Bilgisayar Mühendisliği',
      uzmanlik:['Flutter','Firebase','Swift','Kotlin'],
      hakkinda:'Yayında olan 10+ mobil uygulama deneyimim var. Startup MVP\'lerinden kurumsal uygulamalara kadar geniş bir yelpazede çalıştım.',
      minFiyat:12000, maxFiyat:60000,
      projeler:[
        {baslik:'Fitness Takip Uygulaması', aciklama:'50 bin+ indirilen bir spor takip uygulamasının Flutter geliştirmesini yaptım.', link:''},
        {baslik:'Lojistik Kurye Uygulaması', aciklama:'Gerçek zamanlı konum takipli kurye/teslimat uygulaması geliştirdim.', link:''}
      ], rating:4.8, tamamlanan:31
    },
    {
      id:'u_satici3', role:'satici', email:'zeynep.kaya@gmail.com', password:'demo1234',
      name:'Zeynep Kaya', avatar:'https://i.pravatar.cc/200?img=32',
      title:'Veri Bilimi & Otomasyon', mezuniyet:'İTÜ — Endüstri Mühendisliği',
      uzmanlik:['Python','Pandas','Selenium','Makine Öğrenmesi'],
      hakkinda:'Veri analizi, raporlama otomasyonu ve web scraping projelerinde uzmanım. Excel\'e boğulmuş süreçleri koda döküyorum.',
      minFiyat:5000, maxFiyat:30000,
      projeler:[
        {baslik:'Fiyat Karşılaştırma Botu', aciklama:'E-ticaret sitelerinden fiyat toplayan ve raporlayan otomasyon sistemi kurdum.', link:''},
        {baslik:'Satış Tahmin Modeli', aciklama:'Bir perakende zinciri için talep tahmin modeli geliştirdim.', link:''}
      ], rating:5.0, tamamlanan:17
    },
    {
      id:'u_satici4', role:'satici', email:'can.ozturk@gmail.com', password:'demo1234',
      name:'Can Öztürk', avatar:'https://i.pravatar.cc/200?img=68',
      title:'Backend & DevOps Uzmanı', mezuniyet:'Ege Üniversitesi — Yazılım Mühendisliği',
      uzmanlik:['Go','Docker','Kubernetes','AWS'],
      hakkinda:'Ölçeklenebilir backend sistemleri ve CI/CD altyapıları kuruyorum. Yüksek trafikli sistemlerde performans optimizasyonu konusunda deneyimliyim.',
      minFiyat:15000, maxFiyat:80000,
      projeler:[
        {baslik:'Mikroservis Mimarisine Geçiş', aciklama:'Monolitik bir sistemi mikroservislere ayırıp Kubernetes üzerine taşıdım.', link:''},
        {baslik:'API Gateway ve Rate Limiting', aciklama:'Yüksek trafikli bir SaaS ürünü için özel API gateway geliştirdim.', link:''}
      ], rating:4.7, tamamlanan:19
    },
    {
      id:'u_satici5', role:'satici', email:'elif.sahin@gmail.com', password:'demo1234',
      name:'Elif Şahin', avatar:'https://i.pravatar.cc/200?img=45',
      title:'UI/UX Odaklı Frontend Geliştirici', mezuniyet:'Hacettepe Üniversitesi — Bilgisayar Mühendisliği',
      uzmanlik:['React','Figma','Tailwind CSS','Framer Motion'],
      hakkinda:'Sadece çalışan değil, kullanıcıların sevdiği arayüzler tasarlayıp kodluyorum. Tasarımdan teslimata tek elden hizmet veriyorum.',
      minFiyat:6000, maxFiyat:35000,
      projeler:[
        {baslik:'SaaS Dashboard Tasarımı ve Geliştirmesi', aciklama:'Bir finans teknolojisi girişimi için sıfırdan dashboard tasarladım ve geliştirdim.', link:''},
        {baslik:'Kurumsal Tanıtım Sitesi', aciklama:'Bir danışmanlık firması için modern, animasyonlu tanıtım sitesi hazırladım.', link:''}
      ], rating:4.9, tamamlanan:27
    },
    {
      id:'u_satici6', role:'satici', email:'burak.arslan@gmail.com', password:'demo1234',
      name:'Burak Arslan', avatar:'https://i.pravatar.cc/200?img=15',
      title:'Oyun Geliştirici (Unity)', mezuniyet:'Yıldız Teknik Üniversitesi — Bilgisayar Mühendisliği',
      uzmanlik:['Unity','C#','Oyun Tasarımı','Multiplayer'],
      hakkinda:'2D/3D mobil oyunlar ve eğitim amaçlı simülasyonlar geliştiriyorum. Yayınlanmış 4 mobil oyunum var.',
      minFiyat:10000, maxFiyat:55000,
      projeler:[
        {baslik:'Zeka Oyunları Paketi', aciklama:'5 farklı mini oyundan oluşan bir mobil oyun paketi geliştirdim.', link:''},
        {baslik:'Eğitim Simülasyonu', aciklama:'Bir üniversite için fizik deneylerini simüle eden interaktif uygulama yaptım.', link:''}
      ], rating:4.6, tamamlanan:12
    }
  ];

  const buyer = {
    id:'u_alici1', role:'alici', email:'demo.alici@gmail.com', password:'demo1234',
    name:'Deniz Aydın', avatar:'https://i.pravatar.cc/200?img=5'
  };

  const admin = {
    id:'u_admin1', role:'admin', email:'admin@kodla.com', password:'admin1234',
    name:'Kodla Yönetimi', avatar:'https://i.pravatar.cc/200?img=64'
  };

  DB.saveUsers([...sellers, buyer, admin]);

  // Örnek: hazır bekleyen bir teklif ve devam eden bir sipariş oluşturalım ki
  // panel boş açılmasın, akış canlı görünsün.
  const offerId = DB.uid('teklif');
  DB.saveOffers([{
    id: offerId, buyerId: buyer.id, sellerId: 'u_satici1',
    aciklama:'Küçük bir işletme için stok takibi yapan basit bir web paneli istiyorum. Ürün ekleme, çıkarma ve raporlama olsun.',
    tutar: 14000, durum:'bekliyor', karsiTutar:null, karsiYorum:null, tarih: Date.now() - 1000*60*60*20
  }]);
  DB.addNotification('u_satici1', `${buyer.name} size yeni bir teklif gönderdi.`, 'satici-panel.html?tab=teklifler');

  const orderId = DB.uid('siparis');
  DB.saveOrders([{
    id: orderId, buyerId: buyer.id, sellerId: 'u_satici2',
    baslik:'Kurye takip uygulaması entegrasyonu', tutar: 22000,
    durum:'hazirlaniyor', video:null, tarih: Date.now() - 1000*60*60*72
  }]);
  DB.saveMessages([
    { id: DB.uid('msg'), orderId, senderId: buyer.id, text:'Merhaba, projeye ne zaman başlayabilirsiniz?', dosya:null, tarih: Date.now() - 1000*60*60*70 },
    { id: DB.uid('msg'), orderId, senderId: 'u_satici2', text:'Merhaba, bugün başlıyorum. İlk taslağı 2 gün içinde paylaşırım.', dosya:null, tarih: Date.now() - 1000*60*60*69 },
  ]);

  localStorage.setItem(DB_KEYS.seeded, '1');
}

if(!localStorage.getItem(DB_KEYS.seeded)) {
  seedDatabase();
}
ensureBuiltinAdmin();

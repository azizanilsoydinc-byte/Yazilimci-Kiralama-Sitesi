# Kodla — Yazılım Sipariş Platformu (Prototip)

Alıcıların ihtiyaç duydukları yazılımı tarif edip satıcılardan teklif aldığı,
tekliflerin pazarlıkla (karşı teklif) anlaşmaya dönüştüğü, sonrasında sipariş
sürecinin sohbet üzerinden (dosya/video paylaşımlı) yönetildiği bir platform.

Backend yok — tamamen statik HTML/CSS/JS. Veriler tarayıcının
`localStorage`'ında tutulur, bu yüzden GitHub Pages gibi statik hosting
üzerinde doğrudan çalışır (sunucu / localhost gerekmez).

## VS Code'da açman gereken sıra

Projeyi anlamak ve üzerinde çalışmak için dosyalara şu sırayla bakmanı öneririm:

1. **`css/style.css`** — Tasarım sistemi (renkler, tipografi, bileşenler). Her sayfa buradan besleniyor.
2. **`js/data.js`** — Kalbi burası. "Veritabanı" katmanı: localStorage okuma/yazma fonksiyonları ve örnek (seed) veriler — satıcı profilleri, demo hesaplar, örnek teklif/sipariş.
3. **`js/app.js`** — Ortak arayüz: üst menü (header), giriş/kayıt dropdown'ı, bildirim zili, toast mesajları, oturum kontrolü (`requireAuth`).
4. **`index.html`** — Tanıtım (landing) sayfası. Sağ üstte "Giriş Yap" (alıcı/satıcı) ve "Kayıt Ol".
5. **`giris.html`** + **`js/auth.js`** (`initLoginPage`) — Giriş formu, alıcı/satıcı rol seçici.
6. **`kayit.html`** + **`js/auth.js`** (`initRegisterPage`) — Kayıt formu. Alıcı: sadece gmail + şifre. Satıcı: ek olarak uzmanlık, mezuniyet, hakkımda, fiyat aralığı, geçmiş projeler (dinamik ekle/çıkar).
7. **`alici-panel.html`** + **`js/alici.js`** — Alıcı paneli: satıcıları keşfet/filtrele, gönderdiği teklifler, siparişleri.
8. **`satici-profil.html`** (`renderSellerProfile` — `js/alici.js` içinde) — Satıcı profil sayfası + "Teklif Ver" modalı.
9. **`satici-panel.html`** + **`js/satici.js`** — Satıcı paneli: bildirimler, gelen teklifler (kabul et / karşı teklif ver), siparişler, profil ayarları (fiyat aralığı vb.).
10. **`mesajlar.html`** + **`js/mesajlar.js`** — Sipariş bazlı sohbet: mesaj, dosya/video yükleme, sipariş durumu güncelleme (İnceleniyor → Hazırlanıyor → Denetleniyor → Hazır). "Hazır" seçilince alıcıya bildirim gider.
11. **`sss.html`** — SSS (akordiyon).
12. **`destek.html`** — Destek merkezi (SSS'ye yönlendirme, e-posta, destek talebi formu).

## Demo hesaplar

Prototipte veri boş başlamasın diye birkaç örnek hesap ve bir aktif sipariş hazır geldi:

| Rol | E-posta | Şifre |
|---|---|---|
| Alıcı | demo.alici@gmail.com | demo1234 |
| Satıcı | ayse.yilmaz@gmail.com | demo1234 |
| Satıcı | mert.demir@gmail.com | demo1234 |
| Satıcı | zeynep.kaya@gmail.com | demo1234 |
| Satıcı | can.ozturk@gmail.com | demo1234 |
| Satıcı | elif.sahin@gmail.com | demo1234 |
| Satıcı | burak.arslan@gmail.com | demo1234 |

Giriş sayfasındaki "Demo hesap bilgilerini doldur" butonu seçtiğin role göre
bu bilgileri otomatik dolduruyor.

## Akışı test etmek için önerilen sıra

1. `demo.alici@gmail.com` ile giriş yap → bir satıcı profiline git → "Teklif Ver".
2. Çıkış yap, ilgili satıcı hesabıyla (örn. `ayse.yilmaz@gmail.com`) giriş yap → **Bildirimler**'de teklifi göreceksin → **Gelen Teklifler**'den kabul et ya da karşı teklif ver.
3. Karşı teklif verdiysen alıcı hesabına dönüp **Tekliflerim**'den kabul/reddet.
4. Anlaşma sağlanınca her iki tarafta da **Siparişlerim** altında sipariş belirir → **Mesajlar**'a girip sohbet et, dosya/video paylaş, satıcı olarak sipariş durumunu güncelle.

## Bilinmesi gerekenler / sınırlamalar (prototip olduğu için)

- **Kimlik doğrulama gerçek değildir.** Şifreler `localStorage`'da düz metin
  tutulur. Gerçek bir yayına geçmeden önce mutlaka bir backend + güvenli
  kimlik doğrulama (ör. Firebase Auth, Supabase Auth, ya da kendi
  API'niz + şifre hashleme) eklenmeli.
- **Dosya/video yükleme** prototip amacıyla base64 olarak localStorage'a
  yazılıyor. Tarayıcı localStorage kotası genelde 5-10MB civarındadır, bu
  yüzden dosya/video boyutu sınırlandırıldı (dosya 5MB, video 15MB). Gerçek
  kullanımda dosyalar bir obje depolama servisine (S3, Cloudflare R2 vb.)
  yüklenmeli.
- **Veri sadece kendi tarayıcında yaşar.** Başka bir cihazdan veya
  gizli sekmeden girildiğinde veriler görünmez, çünkü ortak bir sunucu yok.
  Gerçek çoklu kullanıcı deneyimi için bir backend (Firebase, Supabase,
  kendi API'niz vb.) gerekir.
- Profil fotoğrafları `i.pravatar.cc` servisinden örnek olarak çekiliyor;
  mezuniyet/geçmiş proje bilgileri de prototip için örnek verilerdir —
  gerçek satıcılar kayıt olurken kendi bilgilerini girer.
- Destek merkezindeki talep formu şu an sadece localStorage'a kaydediyor
  (gerçek bir e-posta/ticket sistemine bağlı değil). Kullanmak istediğiniz
  gerçek bir destek sistemi (Zendesk, Intercom vb.) varsa entegrasyonu
  ayrıca ekleyebilirim — hangi sistemi kullandığını söylersen ona göre
  bağlarım.

## GitHub Pages'e yayınlama

Bu klasörü olduğu gibi bir GitHub reposuna atıp Settings → Pages kısmından
`main` dalını (branch) kök dizin olarak seçmen yeterli. Hiçbir dosya
localhost'a veya bir sunucuya referans vermiyor, tüm yollar göreli (relative).

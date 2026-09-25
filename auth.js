/* ============================================================
   Kodla — auth.js
   Basit (prototip amaçlı) giriş / kayıt mantığı.
   Not: Bu bir güvenlik sistemi değildir — şifreler localStorage'da
   düz metin saklanır. Gerçek bir yayın için mutlaka bir backend +
   şifre hashleme (bcrypt vb.) eklenmelidir.
   ============================================================ */

function initLoginPage(){
  const params = new URLSearchParams(window.location.search);
  const requestedRole = params.get('role');
  const initialRole = requestedRole === 'satici' || requestedRole === 'admin' ? requestedRole : 'alici';
  let role = initialRole;

  const toggleBtns = document.querySelectorAll('#role-toggle button');
  const emailEl = document.getElementById('login-email');
  const passEl = document.getElementById('login-password');
  const errBox = document.getElementById('login-error');
  const form = document.getElementById('login-form');
  const demoBtn = document.getElementById('demo-fill');

  function setRole(r){
    role = r;
    toggleBtns.forEach(b=> b.classList.toggle('active', b.dataset.role === r));
  }
  toggleBtns.forEach(b=> b.addEventListener('click', ()=> setRole(b.dataset.role)));
  setRole(initialRole);

  if(demoBtn){
    demoBtn.addEventListener('click', ()=>{
      if(role === 'alici'){ emailEl.value = 'demo.alici@gmail.com'; passEl.value = 'demo1234'; }
      else if(role === 'satici'){ emailEl.value = 'ayse.yilmaz@gmail.com'; passEl.value = 'demo1234'; }
      else { emailEl.value = 'admin@kodla.com'; passEl.value = 'admin1234'; }
    });
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    errBox.classList.remove('show');
    const email = emailEl.value.trim();
    const pass = passEl.value;

    if(!email){
      errBox.textContent = 'Lütfen e-posta adresini girin.';
      errBox.classList.add('show');
      return;
    }
    const user = DB.getUserByEmail(email, role);
    if(!user || user.password !== pass){
      errBox.textContent = 'E-posta veya şifre hatalı, ya da bu rolle kayıtlı bir hesap bulunamadı.';
      errBox.classList.add('show');
      return;
    }
    DB.setSession(user.id);
    if(role === 'admin'){
      window.location.href = 'admin.html';
      return;
    }
    window.location.href = role === 'satici' ? 'satici-panel.html' : 'alici-panel.html';
  });
}

function initRegisterPage(){
  let role = 'alici';
  const toggleBtns = document.querySelectorAll('#role-toggle button');
  const aliciFields = document.getElementById('alici-fields');
  const saticiFields = document.getElementById('satici-fields');
  const errBox = document.getElementById('register-error');
  const form = document.getElementById('register-form');
  const projeRepeater = document.getElementById('proje-repeater');
  const addProjeBtn = document.getElementById('add-proje');

  function setRole(r){
    role = r;
    toggleBtns.forEach(b=> b.classList.toggle('active', b.dataset.role === r));
    aliciFields.style.display = r === 'alici' ? 'block' : 'none';
    saticiFields.style.display = r === 'satici' ? 'block' : 'none';
  }
  toggleBtns.forEach(b=> b.addEventListener('click', ()=> setRole(b.dataset.role)));
  setRole('alici');

  function addProjeRow(){
    const row = document.createElement('div');
    row.className = 'repeater-item';
    row.innerHTML = `
      <button type="button" class="remove-x" title="Kaldır">✕</button>
      <div class="field" style="margin-bottom:8px">
        <label>Proje başlığı</label>
        <input type="text" class="proje-baslik" placeholder="Örn: E-ticaret paneli">
      </div>
      <div class="field" style="margin-bottom:0">
        <label>Kısa açıklama</label>
        <textarea class="proje-aciklama" placeholder="Bu projede neler yaptığınızı kısaca anlatın"></textarea>
      </div>`;
    row.querySelector('.remove-x').addEventListener('click', ()=> row.remove());
    projeRepeater.appendChild(row);
  }
  if(addProjeBtn) addProjeBtn.addEventListener('click', addProjeRow);
  if(projeRepeater && projeRepeater.children.length === 0) addProjeRow();

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    errBox.classList.remove('show');

    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const name = document.getElementById('reg-name').value.trim();

    if(!email.endsWith('@gmail.com')){
      errBox.textContent = 'Lütfen bir gmail.com adresi kullanın.';
      errBox.classList.add('show'); return;
    }
    if(pass.length < 6){
      errBox.textContent = 'Şifre en az 6 karakter olmalı.';
      errBox.classList.add('show'); return;
    }
    if(!name){
      errBox.textContent = 'Lütfen isim soyisim girin.';
      errBox.classList.add('show'); return;
    }
    if(DB.getUserByEmail(email, role)){
      errBox.textContent = 'Bu e-posta ile ' + (role==='alici'?'alıcı':'satıcı') + ' hesabı zaten kayıtlı.';
      errBox.classList.add('show'); return;
    }

    const users = DB.users();
    const newUser = {
      id: DB.uid('u'), role, email, password: pass, name,
      avatar: `https://i.pravatar.cc/200?u=${encodeURIComponent(email+role)}`
    };

    if(role === 'satici'){
      const title = document.getElementById('reg-title').value.trim();
      const mezuniyet = document.getElementById('reg-mezuniyet').value.trim();
      const uzmanlikRaw = document.getElementById('reg-uzmanlik').value.trim();
      const hakkinda = document.getElementById('reg-hakkinda').value.trim();
      const minFiyat = Number(document.getElementById('reg-min').value || 0);
      const maxFiyat = Number(document.getElementById('reg-max').value || 0);

      const projeler = [];
      projeRepeater.querySelectorAll('.repeater-item').forEach(row=>{
        const baslik = row.querySelector('.proje-baslik').value.trim();
        const aciklama = row.querySelector('.proje-aciklama').value.trim();
        if(baslik) projeler.push({ baslik, aciklama, link:'' });
      });

      Object.assign(newUser, {
        title: title || 'Yazılım Geliştirici',
        mezuniyet: mezuniyet || 'Belirtilmedi',
        uzmanlik: uzmanlikRaw ? uzmanlikRaw.split(',').map(s=>s.trim()).filter(Boolean) : [],
        hakkinda: hakkinda || 'Henüz bir açıklama eklenmedi.',
        minFiyat, maxFiyat, projeler, rating:null, tamamlanan:0
      });
    }

    users.push(newUser);
    DB.saveUsers(users);
    DB.setSession(newUser.id);
    toast('Hesabın oluşturuldu, hoş geldin ' + name.split(' ')[0] + '!');
    window.location.href = role === 'satici' ? 'satici-panel.html' : 'alici-panel.html';
  });
}

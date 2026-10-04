let pendingVerification=null;
function selectAuthTab(mode, focusTab = false) {
  $('#emailVerification').hidden=true;
  $('.auth-tabs').hidden=false;
  pendingVerification=null;
  const register = mode === 'register';
  $('#loginPanel').hidden = register;
  $('#registerPanel').hidden = !register;
  $('#loginTab').setAttribute('aria-selected', String(!register));
  $('#registerTab').setAttribute('aria-selected', String(register));
  $('#loginTab').tabIndex = register ? -1 : 0;
  $('#registerTab').tabIndex = register ? 0 : -1;
  $('#authTitle').textContent = register ? 'Создайте свой аккаунт' : 'Рады вас видеть';
  $('#authStatus').textContent = '';
  if (focusTab) $(register ? '#registerTab' : '#loginTab').focus();
}
$('#openAuth').onclick = () => {selectAuthTab('login');$('#authModal').showModal();$('#loginEmail').focus()};
$('#closeAuth').onclick = () => $('#authModal').close();
$('#loginTab').onclick = () => selectAuthTab('login');
$('#registerTab').onclick = () => selectAuthTab('register');
['#loginTab', '#registerTab'].forEach(id => $(id).addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const mode = event.key === 'Home' ? 'login' : event.key === 'End' ? 'register' : id === '#loginTab' ? 'register' : 'login';
    selectAuthTab(mode, true);
  }
}));
['login', 'register'].forEach(mode => {
  $('#' + mode + 'Form').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    if (mode === 'register' && $('#registerRole').value === 'employer') {
      const profile = {version:1, name:$('#registerName').value.trim(), company:$('#registerCompany').value.trim(), type:$('#registerEmployerType').value, email:$('#registerEmail').value.trim()};
      if (!profile.name || !profile.company) {$('#authStatus').textContent='Введите имя и название работодателя.';return;}
      try { sessionStorage.setItem('mesto-demo-employer', JSON.stringify(profile)); }
      catch {$('#authStatus').textContent='Не удалось сохранить данные сеанса. Разрешите хранилище браузера и попробуйте снова.';return;}
      $('#registerPassword').value='';
      location.href='employer.html';
      return;
    }
    if(mode==='register'){
      const name=$('#registerName').value.trim();if(!name){$('#authStatus').textContent='Введите имя.';return;}
      beginVerification({version:1,name,email:$('#registerEmail').value.trim()});
      $('#registerPassword').value='';return;
    }
    if(mode==='login'){
      const profile=UserStore.profile();
      if(profile&&profile.email.toLowerCase()===$('#loginEmail').value.trim().toLowerCase()){
        beginVerification({version:1,name:profile.name,email:profile.email});$('#loginPassword').value='';return;
      }
    }
    $('#' + mode + 'Password').value = '';
    $('#authStatus').textContent = mode === 'login'
      ? 'Форма заполнена. В прототипе вход недоступен — авторизация появится после подключения сервера.'
      : 'Форма заполнена. Это демонстрация: аккаунт не создан. Регистрация появится после подключения сервера.';
  });
});
$('#authModal').addEventListener('close', () => {
  pendingVerification=null;$('#verifyForm').reset();$('#emailVerification').hidden=true;$('.auth-tabs').hidden=false;$('#loginForm').reset();$('#registerForm').reset();updateEmployerRegistration();$('#authStatus').textContent='';$('#openAuth').focus();
});
$('#authModal').addEventListener('click', event => {
  if (event.target !== $('#authModal')) return;
  const rect = $('#authModal').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#authModal').close();
});

function updateEmployerRegistration() {
  const employer=$('#registerRole').value==='employer';
  $('#employerRegistrationFields').hidden=!employer;
  $('#registerCompany').required=employer;
  $('#registerCompany').disabled=!employer;
  $('#registerEmployerType').disabled=!employer;
  $('#registerForm button[type="submit"]').textContent=employer?'Перейти в кабинет →':'Отправить код на почту →';
}
function startEmployerRegistration() {
  $('#registerRole').value='employer';updateEmployerRegistration();selectAuthTab('register');
  if(!$('#authModal').open)$('#authModal').showModal();
  $('#registerName').focus();
}
$('#registerRole').addEventListener('change',updateEmployerRegistration);
if($('#createVacancy'))$('#createVacancy').addEventListener('click',event=>{event.preventDefault();let profile=null;try{profile=JSON.parse(sessionStorage.getItem('mesto-demo-employer'))}catch{}if(profile&&profile.version===1&&typeof profile.email==='string')location.href='employer.html';else startEmployerRegistration()});
updateEmployerRegistration();
if(new URLSearchParams(location.search).get('register')==='employer')startEmployerRegistration();

function beginVerification(profile){
  const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
  let code=String(100000+bytes[0]%900000);
  if(pendingVerification&&code===pendingVerification.code)code=String(100000+(Number(code)-100000+1)%900000);
  pendingVerification={profile,code,expires:Date.now()+5*60*1000,attempts:0};
  $('#loginPanel').hidden=true;$('#registerPanel').hidden=true;$('.auth-tabs').hidden=true;
  $('#emailVerification').hidden=false;$('#authTitle').textContent='Проверьте вашу почту';
  $('#verifyEmail').textContent='Демонстрационное письмо для '+profile.email;
  $('#demoEmailCode').textContent=pendingVerification.code;$('#emailCode').value='';
  $('#verifyStatus').textContent='Код действует 5 минут. Откройте демописьмо ниже.';$('#authStatus').textContent='';$('#emailCode').focus();
}
$('#verifyForm').addEventListener('submit',event=>{
  event.preventDefault();if(!event.target.reportValidity()||!pendingVerification)return;
  if(Date.now()>pendingVerification.expires){$('#verifyStatus').textContent='Код истёк. Запросите новый.';return;}
  if(pendingVerification.attempts>=5){$('#verifyStatus').textContent='Слишком много попыток. Запросите новый код.';return;}
  if($('#emailCode').value!==pendingVerification.code){pendingVerification.attempts++;$('#verifyStatus').textContent='Неверный код. Проверьте демонстрационное письмо.';return;}
  try{sessionStorage.setItem('mesto-demo-user',JSON.stringify({...pendingVerification.profile,verified:true}));}
  catch{$('#verifyStatus').textContent='Хранилище сеанса недоступно. Продолжить не удалось.';return;}
  pendingVerification=null;location.href='user.html';
});
$('#resendEmailCode').onclick=()=>{if(pendingVerification)beginVerification(pendingVerification.profile)};
$('#changeVerifyEmail').onclick=()=>{selectAuthTab('register');$('#registerEmail').focus()};
if($('#myResume')){
  $('#myResume').href='user.html';$('#myResumeTitle').textContent='Личный кабинет и резюме ↗';
  $('#myResume').addEventListener('click',event=>{if(!UserStore.profile()){event.preventDefault();$('#registerRole').value='applicant';updateEmployerRegistration();selectAuthTab('register');$('#authModal').showModal()}});
}
if(new URLSearchParams(location.search).get('register')==='applicant'){
  $('#registerRole').value='applicant';updateEmployerRegistration();selectAuthTab('register');$('#authModal').showModal();
}

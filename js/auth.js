function selectAuthTab(mode, focusTab = false) {
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
    $('#' + mode + 'Password').value = '';
    $('#authStatus').textContent = mode === 'login'
      ? 'Форма заполнена. В прототипе вход недоступен — авторизация появится после подключения сервера.'
      : 'Форма заполнена. Это демонстрация: аккаунт не создан. Регистрация появится после подключения сервера.';
  });
});
$('#authModal').addEventListener('close', () => {
  $('#loginForm').reset();$('#registerForm').reset();$('#authStatus').textContent='';$('#openAuth').focus();
});
$('#authModal').addEventListener('click', event => {
  if (event.target !== $('#authModal')) return;
  const rect = $('#authModal').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#authModal').close();
});

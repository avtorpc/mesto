const $ = selector => document.querySelector(selector);
const profileDetails = {
  101: {years:'4 года',school:'Институт дизайна и коммуникаций',degree:'Дизайн цифровых продуктов · 2018–2022',language:'Русский — родной · Английский — B2',company:'Студия «Форма»',start:'2022',project:'Новый сценарий регистрации',result:'Пересобрала путь пользователя от первого знакомства до создания аккаунта. Подготовила прототипы, провела тестирования и передала команде готовые компоненты.',bullets:['Разработала библиотеку компонентов для веб-продукта.','Проводила интервью и тестировала интерактивные прототипы.','Сопровождала решения до выпуска вместе с разработчиками.']},
  102: {years:'5 лет',school:'Институт цифровых технологий',degree:'Программная инженерия · 2016–2020',language:'Русский — родной',company:'Команда «Вектор»',start:'2021',project:'Быстрый личный кабинет',result:'Обновил архитектуру интерфейса, оптимизировал загрузку и добавил автоматические проверки критических сценариев.',bullets:['Разрабатывал интерфейсы на React и TypeScript.','Внедрил компонентные и интеграционные тесты.','Улучшал доступность и скорость работы приложения.']},
  103: {years:'2 года',school:'Академия прикладных наук',degree:'Прикладная математика · 2020–2024',language:'Русский — родной · Английский — B2',company:'Сервис «Пульс»',start:'2024',project:'Единая система продуктовых метрик',result:'Объединила данные о пользовательских сценариях в понятные дашборды для продуктовой команды.',bullets:['Создавала отчёты на SQL и Power BI.','Анализировала воронки и результаты экспериментов.','Проверяла качество данных и описывала метрики.']},
  104: {years:'3 года',school:'Школа визуальных коммуникаций',degree:'Коммуникационный дизайн · 2019–2023',language:'Русский — родной',company:'Студия «Линия»',start:'2023',project:'Мобильный сервис для повседневных задач',result:'Спроектировал основные сценарии и подготовил интерактивный прототип для проверки с пользователями.',bullets:['Создавал макеты и прототипы в Figma.','Поддерживал визуальную целостность продукта.','Готовил спецификации и сопровождал разработку.']},
  105: {years:'5 лет',school:'Институт управления и экономики',degree:'Менеджмент · 2016–2020',language:'Русский — родной',company:'Платформа «Контекст»',start:'2021',project:'Запуск B2B-сервиса',result:'Собрала потребности первых клиентов, сформировала план запуска и организовала совместную работу команды.',bullets:['Приоритизировала гипотезы и управляла roadmap.','Проводила исследования и анализировала результаты.','Координировала дизайн, разработку и запуск продукта.']},
  106: {years:'8 лет',school:'Техническая академия',degree:'Информатика и вычислительная техника · 2014–2018',language:'Русский — родной · Английский — B2',company:'Технологии «Слой»',start:'2018',project:'Платформа обработки событий',result:'Спроектировал сервис обработки событий с мониторингом, автоматическими проверками и устойчивостью к сбоям.',bullets:['Разрабатывал сервисы на Python и PostgreSQL.','Настраивал контейнеризацию и наблюдаемость.','Проводил ревью и помогал развитию инженеров.']}
};
// Сначала профессиональная ценность, затем справочная история мест работы.
const experienceSummaries = {
  101: 'Четыре года превращаю сложные сценарии в понятные цифровые продукты. Соединяю исследования, прототипирование и дизайн-системы: нахожу проблему пользователя, проверяю решение и довожу его до запуска вместе с разработчиками.',
  102: 'Пять лет разрабатываю веб-интерфейсы на React и TypeScript. Моя специализация — быстрые, доступные и устойчивые приложения. Умею разбираться в существующей архитектуре, улучшать её и обеспечивать качество с помощью тестов.',
  103: 'Два года помогаю продуктовым командам принимать решения на основе данных. Перевожу бизнес-вопросы в метрики, исследую поведение пользователей и объясняю результаты так, чтобы команда могла действовать.',
  104: 'Три года проектирую мобильные и веб-интерфейсы. Веду задачи от первых эскизов до передачи в разработку, собираю интерактивные прототипы и поддерживаю единый визуальный язык продукта.',
  105: 'Пять лет развиваю цифровые продукты: от исследования потребностей до запуска и оценки результатов. Умею объединять команду вокруг задачи, расставлять приоритеты и превращать гипотезы в работающие решения.',
  106: 'Восемь лет разрабатываю серверные системы и сервисы с высокой нагрузкой. Сочетаю проектирование архитектуры с практической разработкой, уделяю внимание надёжности, наблюдаемости и развитию инженерной команды.'
};
Object.entries(profileDetails).forEach(([key,details])=>{
  details.summary=experienceSummaries[key];
  details.workplaces=[details.company+' | '+resumes.find(person=>person.id===Number(key)).title+' | '+details.start+' — настоящее время'];
});
const params = new URLSearchParams(location.search);
const id = params.has('id') ? Number(params.get('id')) : 101;
const originalCandidate = resumes.find(person => person.id === id);
const isOwnerPage = document.body.dataset.view === 'owner';
const isOwnerPreview = params.get('preview') === '1';
let ownerDraft = null;
if (isOwnerPage || isOwnerPreview) {
  try { const stored = JSON.parse(localStorage.getItem('mesto-resume-draft-' + id));
    if (stored && stored.version === 1) ownerDraft = stored;
  } catch {}
}
const candidate = originalCandidate ? {...originalCandidate} : null;
if (candidate && ownerDraft) {
  const fields = ownerDraft.candidate || {};
  ['name','title','city','format','text','tasks'].forEach(key => {if(typeof fields[key] === 'string')candidate[key]=fields[key]});
  ['skills','requirements'].forEach(key => {if(Array.isArray(fields[key]) && fields[key].every(item=>typeof item==='string'))candidate[key]=fields[key]});
  if (Number.isFinite(fields.salary) && fields.salary >= 0) candidate.salary=fields.salary;
  candidate.range=candidate.salary.toLocaleString('ru-RU')+' ₽';
  candidate.logo=candidate.name.split(/\s+/).filter(Boolean).map(word=>word[0]).slice(0,2).join('');
  const detailFields=ownerDraft.details||{};
  if(!Array.isArray(detailFields.workplaces))profileDetails[id].workplaces=[(typeof detailFields.company==='string'?detailFields.company:profileDetails[id].company)+' | '+candidate.title+' | '+(typeof detailFields.start==='string'?detailFields.start:profileDetails[id].start)+' — настоящее время'];
  Object.keys(profileDetails[id]).forEach(key=>{
    if(key==='bullets'||key==='workplaces'){if(Array.isArray(detailFields[key])&&detailFields[key].every(item=>typeof item==='string'))profileDetails[id][key]=detailFields[key]}
    else if(typeof detailFields[key]==='string')profileDetails[id][key]=detailFields[key];
  });
}
function addText(parent, tag, text, className) {
  const element = document.createElement(tag); element.textContent = text;
  if (className) element.className = className;
  parent.append(element); return element;
}
if (!candidate) {
  $('#resumeRoot').replaceChildren();
  addText($('#resumeRoot'),'h1','Резюме не найдено');
  addText($('#resumeRoot'),'p','Возможно, ссылка устарела. Выберите кандидата в списке работников.');
  const back=addText($('#resumeRoot'),'a','← Вернуться к работникам');back.href='index.html#workers';
} else {
  const details=profileDetails[id];
  document.title=candidate.name+' — '+candidate.title+' · место';
  const fields={resumeDate:'Опубликовано '+displayDate(candidate.publishedAt),resumeId:'Резюме № '+id,avatar:candidate.logo,personName:candidate.name,personTitle:candidate.title,personIntro:candidate.text,aboutText:candidate.tasks,experienceTotal:details.years,profileSalary:candidate.range,languages:details.language,projectTitle:details.project,projectText:details.result};
  Object.entries(fields).forEach(([key,value])=>$('#'+key).textContent=value);
  [candidate.city,candidate.format,'Опыт: '+details.years].forEach(value=>addText($('#personMeta'),'span',value));
  [['Занятость','Полная занятость'],['Начало работы','По договорённости'],['Формат',candidate.format],['Город',candidate.city]].forEach(([label,value])=>{const fact=addText($('#personalFacts'),'div','');addText(fact,'span',label);addText(fact,'strong',value)});
  $('#experienceSummary').textContent=details.summary;
  details.bullets.forEach(text=>addText($('#experienceHighlights'),'li',text));
  $('#workplaceCount').textContent=details.workplaces.length;
  details.workplaces.forEach(workplace=>{
    const [company,role,...period]=workplace.split('|').map(value=>value.trim());
    const job=addText($('#experienceList'),'article','', 'timeline-item');
    addText(job,'h3',company);
    if(role)addText(job,'div',role,'timeline-company');
    if(period.length)addText(job,'div',period.join(' · '),'timeline-date');
  });
  candidate.skills.forEach(skill=>addText($('#profileSkills'),'span',skill));candidate.requirements.forEach(item=>addText($('#profileQualities'),'span',item));
  addText($('#educationList'),'h3',details.school);addText($('#educationList'),'p',details.degree);
  [['Формат работы',candidate.format],['Город',candidate.city],['Опыт работы',details.years],['Занятость','Полная занятость']].forEach(([label,value])=>{addText($('#workConditions'),'dt',label);addText($('#workConditions'),'dd',value)});
  let bookmarks=new Set();try{const stored=JSON.parse(localStorage.getItem('mesto-saved')||'[]');if(Array.isArray(stored))bookmarks=new Set(stored)}catch{}
  function updateBookmark(){const active=bookmarks.has(id);$('#saveCandidate').textContent=active?'✓ Резюме сохранено':'Сохранить резюме';$('#saveCandidate').setAttribute('aria-pressed',String(active))}
  updateBookmark();$('#saveCandidate').onclick=()=>{bookmarks.has(id)?bookmarks.delete(id):bookmarks.add(id);updateBookmark();try{localStorage.setItem('mesto-saved',JSON.stringify([...bookmarks]));$('#saveStatus').textContent=bookmarks.has(id)?'Сохранено в этом браузере.':'Закладка удалена.'}catch{$('#saveStatus').textContent='Изменено только на этой странице: хранилище недоступно.'}};
  $('#printResume').onclick=()=>window.print();
  $('#inviteCandidate').onclick=()=>{$('#inviteRole').value=candidate.title;$('#inviteMessage').value='Здравствуйте! Нам понравилось ваше резюме. Хотели бы обсудить с вами задачи и условия работы в нашей команде.';$('#inviteStatus').textContent='';$('#inviteModal').showModal()};
}
$('#closeInvite').onclick=()=>$('#inviteModal').close();
$('#inviteForm').addEventListener('submit',event=>{event.preventDefault();if(event.target.reportValidity())$('#inviteStatus').textContent='Приглашение готово к просмотру. В демонстрационном режиме оно не отправляется.'});
$('#inviteModal').addEventListener('close',()=>{$('#inviteForm').reset();$('#inviteStatus').textContent=''});
$('#inviteModal').addEventListener('click',event=>{if(event.target!==$('#inviteModal'))return;const r=$('#inviteModal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('#inviteModal').close()});

// Все разделы видны; меню переводит к блоку и отслеживает прокрутку.
if (candidate) {
  const menu = $('.resume-sections');
  const links = [...menu.querySelectorAll('a')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  function markSection(index) {
    links.forEach((link, i) => {
      sections[i].classList.toggle('section-highlighted', i === index);
      if (i === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function goToSection(index, animate) {
    const section = sections[index];
    section.focus({preventScroll:true});
    const top = window.scrollY + section.getBoundingClientRect().top - menu.getBoundingClientRect().height - 16;
    window.scrollTo({top: Math.max(0, top), behavior: animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto'});
    markSection(index);
  }
  links.forEach((link, index) => link.addEventListener('click', event => {
    event.preventDefault();
    try { history.pushState(null, '', location.pathname + location.search + link.getAttribute('href')); } catch {}
    goToSection(index, true);
  }));
  let scheduled = false;
  function updateActiveSection() {
    const threshold = menu.getBoundingClientRect().height + 32;
    let active = 0;
    sections.forEach((section, index) => {if(section.getBoundingClientRect().top <= threshold) active = index});
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = sections.length - 1;
    markSection(active); scheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) {scheduled = true; requestAnimationFrame(updateActiveSection)}
  }, {passive:true});
  function followHash() {
    const index = sections.findIndex(section => '#' + section.id === location.hash);
    if (index >= 0) goToSection(index, false);
    else updateActiveSection();
  }
  window.addEventListener('hashchange', followHash);
  window.addEventListener('popstate', followHash);
  requestAnimationFrame(followHash);
}

if (candidate && isOwnerPreview) {
  const previewBar=document.createElement('div');previewBar.className='owner-banner';
  addText(previewBar,'span','Предпросмотр для работодателя · локальный черновик');
  const back=addText(previewBar,'a','← Вернуться к редактированию');back.href='resume-owner.html?id='+id;
  $('#resumeRoot').prepend(previewBar);
}

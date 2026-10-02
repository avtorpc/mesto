// Даты демонстрационных вакансий распределены относительно дня открытия прототипа.
function dateDaysAgo(offset, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Moscow', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
  const part = type => parts.find(item => item.type === type).value;
  const date = new Date(Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day'))));
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0,10);
}
function displayDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
}
let dayOffset = 0;
const jobs=[
{id:1,publishedAt:dateDaysAgo(0),requirements:["Портфолио", "Работа в команде", "Самостоятельность"],specialty:'Продуктовый дизайнер',skills:["Figma", "UI/UX", "Прототипирование"],company:'Контур',logo:'к',title:'Продуктовый дизайнер',salary:180000,range:'180 000 – 250 000 ₽',city:'Москва',format:'Удалённо',experience:'3–6 лет',text:'Создавайте понятные сервисы для бизнеса. От первых гипотез до интерфейсов, которыми пользуются каждый день.',tasks:'Проектировать пользовательские сценарии, развивать дизайн-систему и проверять решения вместе с командой исследований.'},
{id:2,publishedAt:dateDaysAgo(0),requirements:["Коммерческий опыт", "Работа в команде", "Английский B1"],specialty:'Frontend-разработчик',skills:["JavaScript", "TypeScript", "React"],company:'Точка',logo:'т',title:'Frontend-разработчик',salary:200000,range:'200 000 – 300 000 ₽',city:'Санкт-Петербург',format:'Гибрид',experience:'3–6 лет',text:'Развивайте цифровые продукты для предпринимателей в команде, где ценят инициативу и качество кода.',tasks:'Разрабатывать интерфейсы на React и TypeScript, участвовать в обсуждении архитектуры и улучшать производительность продукта.'},
{id:3,publishedAt:dateDaysAgo(0),requirements:["Аналитическое мышление", "Коммуникабельность", "Самостоятельность"],specialty:'Менеджер продукта',skills:["SQL", "Аналитика", "Исследования"],company:'Самокат',logo:'↗',title:'Менеджер продукта',salary:170000,range:'170 000 – 230 000 ₽',city:'Москва',format:'Гибрид',experience:'1–3 года',text:'Помогайте людям экономить время. Ищем человека, который умеет превращать данные и идеи в полезные продукты.',tasks:'Изучать потребности пользователей, формировать продуктовые гипотезы, вести бэклог и оценивать результаты экспериментов.'},
{id:4,publishedAt:dateDaysAgo(1),requirements:["Портфолио", "Внимание к деталям", "Соблюдение сроков"],specialty:'Графический дизайнер',skills:["Figma", "Photoshop", "Иллюстрация"],company:'Студия Смена',logo:'с.',title:'Графический дизайнер',salary:90000,range:'90 000 – 130 000 ₽',city:'Казань',format:'В офисе',experience:'1–3 года',text:'Разрабатывайте визуальный язык брендов: айдентику, коммуникации и проекты на стыке дизайна и культуры.',tasks:'Создавать концепции айдентики, готовить макеты для цифровых каналов и работать с арт-директором.'},
{id:5,publishedAt:dateDaysAgo(1),requirements:["Аналитическое мышление", "Внимание к деталям", "Готовность учиться"],specialty:'Аналитик',skills:["SQL", "Excel", "Аналитика"],company:'Практика',logo:'п',title:'Младший аналитик',salary:70000,range:'70 000 – 100 000 ₽',city:'Москва',format:'Удалённо',experience:'Без опыта',text:'Начните карьеру в аналитике с поддержкой наставника и реальными задачами продуктовой команды.',tasks:'Готовить отчёты, анализировать поведение пользователей и помогать команде принимать решения на основе данных.'},
{id:6,publishedAt:dateDaysAgo(2),requirements:["Коммерческий опыт", "Работа в команде", "Опыт наставничества"],specialty:'Backend-разработчик',skills:["SQL", "Python", "Docker"],company:'Север',logo:'с',title:'Ведущий backend-разработчик',salary:300000,range:'300 000 – 400 000 ₽',city:'Санкт-Петербург',format:'Удалённо',experience:'Более 6 лет',text:'Развивайте платформу для команд и стройте надёжные сервисы с высокой нагрузкой.',tasks:'Проектировать сервисы, проводить ревью и помогать команде развивать инженерные практики.'}
];
const $=s=>document.querySelector(s);let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem('mesto-saved')||'[]'))}catch{}let onlySaved=false,limit=3;
const bookmark='<svg width="19" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>';
// Специальности и популярность навыков берём из требований работодателей.
[...new Set(jobs.map(job => job.specialty))].sort((a, b) => a.localeCompare(b, 'ru')).forEach(specialty => {
  const option = document.createElement('option');
  option.value = specialty;
  option.textContent = specialty;
  $('#specialtySuggestions').append(option);
});
function publicationLabel(job) {
  if (job.publishedAt === dateDaysAgo(0)) return 'Сегодня';
  if (job.publishedAt === dateDaysAgo(1)) return 'Вчера';
  return displayDate(job.publishedAt);
}
function changeDay(offset) {
  dayOffset = Math.max(0, offset);
  limit = 3;
  render();
}
$('#olderDay').onclick = () => changeDay(dayOffset + 1);
$('#newerDay').onclick = () => changeDay(dayOffset - 1);
$('#todayDay').onclick = () => changeDay(0);
// Частота специальностей по всей демонстрационной базе, а не статистика рынка.
const specialtyCounts = new Map();
jobs.forEach(job => specialtyCounts.set(job.specialty, (specialtyCounts.get(job.specialty) || 0) + 1));
[...specialtyCounts].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'ru')).slice(0,3).forEach(([specialty,count])=>{
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = specialty;
  button.title = 'Вакансий в прототипе: ' + count;
  button.onclick = () => {
    $('#specialty').value = specialty;
    $('#query').value = '';
    buildSkillsFilter();
    limit = 3;
    render();
  };
  $('#popularSpecialties').append(button);
});

function normalizeSearch(value) {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}
function matchesQuery(job) {
  const query = normalizeSearch($('#query').value);
  return normalizeSearch(job.title + ' ' + job.company + ' ' + job.text).includes(query);
}
function matchesSpecialty(job, specialty) {
  const words = normalizeSearch(specialty).split(/\s+/).filter(Boolean);
  const title = normalizeSearch(job.specialty + ' ' + job.title);
  return words.every(word => title.includes(word));
}
function rankedSkills(specialty, field = 'skills') {
  const counts = new Map();
  jobs.filter(job => matchesSpecialty(job, specialty) && matchesQuery(job)).forEach(job => {
    new Set((job[field] || []).map(skill => skill.trim()).filter(Boolean)).forEach(skill => {
      counts.set(skill, (counts.get(skill) || 0) + 1);
    });
  });
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
}
function buildSkillsFilter() {
  const specialty = $('#specialty').value.trim();
  const hasQuery = specialty || $('#query').value.trim();
  $('#skillsTitle').textContent = hasQuery ? 'Навыки по вакансии' : 'Востребованные навыки';
  $('#skillsContext').textContent = hasQuery ? 'Из подходящих вакансий · сначала популярные' : 'Чаще всего встречаются в вакансиях';
  $('#requirementsContext').textContent = hasQuery ? 'Из подходящих вакансий · сначала популярные' : 'Чаще всего встречаются в вакансиях';
  buildOptionList('#skillsList', 'skill', rankedSkills(specialty));
  buildOptionList('#requirementsList', 'requirement', rankedSkills(specialty, 'requirements'));
}
function buildOptionList(selector, fieldName, options) {
  const list = $(selector);
  const selected = new Set([...list.querySelectorAll('input:checked')].map(input => input.value));
  list.replaceChildren();
  if (!options.length) {
    const empty = document.createElement('p');
    empty.className = 'skills-hint';
    empty.textContent = 'Нет подходящих вакансий. Попробуйте другое название.';
    list.append(empty);
  }
  options.forEach(([value, count]) => {
    const label = document.createElement('label');
    label.className = 'skill-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = fieldName;
    input.value = value;
    input.checked = selected.has(value);
    const name = document.createElement('span');
    name.textContent = value;
    const total = document.createElement('small');
    total.textContent = count;
    total.title = 'Количество вакансий';
    label.append(input, name, total);
    list.append(label);
  });
}

function checkedValues(name) {
  return [...document.querySelectorAll(`[name="${name}"]:checked`)].map(input => input.value);
}
// Один источник данных для окна фильтров, счётчика и тегов над выдачей.
function activeFilterGroups() {
  const salary = Number($('#salary').value);
  return [
    { key: 'query', label: 'Поисковый запрос', values: [$('#query').value.trim()].filter(Boolean) },
    { key: 'specialty', label: 'Специальность', values: [$('#specialty').value.trim()].filter(Boolean) },
    { key: 'city', label: 'Города', values: checkedValues('city') },
    { key: 'format', label: 'Формат работы', values: checkedValues('format') },
    { key: 'salary', label: 'Уровень дохода', values: salary > 0 ? ['От ' + salary.toLocaleString('ru-RU') + ' ₽ в месяц'] : [] },
    { key: 'experience', label: 'Опыт работы', values: checkedValues('experience') },
    { key: 'skill', label: 'Навыки', values: checkedValues('skill') },
    { key: 'requirement', label: 'Основные требования', values: checkedValues('requirement') },
    { key: 'saved', label: 'Раздел', values: onlySaved ? ['Только избранные'] : [] }
  ].filter(group => group.values.length);
}
function updateFilterSummary() {
  const cities = checkedValues('city');
  $('#citySummary').textContent = cities.length === 0 ? 'Любой город' : cities.length === 1 ? cities[0] : 'Города: ' + cities.length;
  $('#citySummary').title = cities.join(', ') || 'Любой город';
  const groups = activeFilterGroups();
  $('#filterCount').textContent = groups.reduce((total, group) => total + group.values.length, 0);
  const content = $('#filtersContent');
  content.replaceChildren();
  if (!groups.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Фильтры пока не выбраны. Выберите города, специальность или другие условия поиска.';
    content.append(empty);
  }
  groups.forEach(group => {
    const section = document.createElement('section');
    section.className = 'filter-summary-group';
    const heading = document.createElement('h3');
    heading.textContent = group.label;
    const list = document.createElement('ul');
    group.values.forEach(value => {
      const item = document.createElement('li');
      item.textContent = value;
      list.append(item);
    });
    section.append(heading, list);
    content.append(section);
  });
  $('#resetFilters').disabled = !groups.length;
  $('#saveFilters').disabled = !groups.length;
  $('#filterSaveStatus').textContent = '';
  $('#restoreFilters').hidden = !readSavedFilters();
}
function renderFilterChips() {
  const list = $('#chips');
  list.replaceChildren();
  activeFilterGroups().forEach(group => group.values.forEach(value => {
    const chip = document.createElement('span');
    chip.className = 'chip removable-chip';
    const text = document.createElement('span');
    text.textContent = value;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-filter';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Убрать фильтр «' + group.label + ': ' + value + '»');
    remove.onclick = () => {
      const index = [...list.querySelectorAll('button')].indexOf(remove);
      removeFilter(group.key, value);
      const remaining = list.querySelectorAll('button');
      (remaining[Math.min(index, remaining.length - 1)] || $('#showFilters')).focus();
    };
    chip.append(text, remove);
    list.append(chip);
  }));
}
function removeFilter(key, value) {
  if (['query', 'specialty', 'salary'].includes(key)) {
    $('#' + key).value = '';
    if (key !== 'salary') buildSkillsFilter();
  } else if (key === 'saved') {
    onlySaved = false;
  } else {
    document.querySelectorAll(`[name="${key}"]`).forEach(input => {
      if (input.value === value) input.checked = false;
    });
  }
  limit = 3;
  render();
}
// Демонстрационное сохранение. Реальный профиль потребует авторизации и API.
const filterStorageKey = 'mesto-demo-filter-preset-v1';
function readSavedFilters() {
  try {
    const preset = JSON.parse(localStorage.getItem(filterStorageKey));
    return preset && preset.version === 1 && preset.fields && preset.checks ? preset : null;
  } catch { return null; }
}
function saveFilterPreset() {
  const preset = {version: 1, fields: {}, checks: {}, onlySaved};
  ['query', 'specialty', 'salary'].forEach(key => preset.fields[key] = $('#' + key).value);
  ['city', 'format', 'experience', 'skill', 'requirement'].forEach(key => preset.checks[key] = checkedValues(key));
  try {
    localStorage.setItem(filterStorageKey, JSON.stringify(preset));
    $('#restoreFilters').hidden = false;
    $('#filterSaveStatus').textContent = 'Фильтры сохранены в этом браузере. Их можно восстановить после перезагрузки страницы.';
  } catch {
    $('#filterSaveStatus').textContent = 'Не удалось сохранить фильтры: хранилище браузера недоступно.';
  }
}
function restoreFilterPreset() {
  const preset = readSavedFilters();
  if (!preset) {
    $('#filterSaveStatus').textContent = 'Сохранённые фильтры не найдены.';
    return;
  }
  ['query', 'specialty', 'salary'].forEach(key => {
    $('#' + key).value = typeof preset.fields[key] === 'string' ? preset.fields[key] : '';
  });
  buildSkillsFilter();
  ['city', 'format', 'experience', 'skill', 'requirement'].forEach(key => {
    const values = Array.isArray(preset.checks[key]) ? preset.checks[key] : [];
    document.querySelectorAll(`[name="${key}"]`).forEach(input => input.checked = values.includes(input.value));
  });
  onlySaved = preset.onlySaved === true;
  limit = 3;
  render();
  $('#filterSaveStatus').textContent = 'Сохранённые фильтры применены.';
}
$('#saveFilters').onclick = saveFilterPreset;
$('#restoreFilters').onclick = restoreFilterPreset;

function resetFilters() {
  document.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
  ['#salary', '#query', '#specialty'].forEach(selector => $(selector).value = '');
  onlySaved = false;
  limit = 3;
  buildSkillsFilter();
  render();
}
[...new Set(jobs.map(job => job.city))].sort((a,b)=>a.localeCompare(b,'ru')).forEach(city => {
  const label = document.createElement('label');
  label.className = 'check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = 'city';
  input.value = city;
  label.append(input, document.createTextNode(city));
  $('#cityOptions').append(label);
});
$('#cityOptions').addEventListener('change',()=>{limit=3;render()});
$('#clearCities').onclick=()=>{document.querySelectorAll('[name="city"]').forEach(input=>input.checked=false);limit=3;render()};
document.addEventListener('click',event=>{if(!$('#cityPicker').contains(event.target))$('#cityPicker').open=false});
$('#cityPicker').addEventListener('keydown',event=>{if(event.key==='Escape'){$('#cityPicker').open=false;$('#citySummary').focus()}});
$('#showFilters').onclick=()=>{updateFilterSummary();$('#filtersModal').showModal()};
$('#closeFilters').onclick=$('#doneFilters').onclick=()=>$('#filtersModal').close();
$('#resetFilters').onclick=resetFilters;
$('#filtersModal').addEventListener('click',event=>{
  if(event.target!==$('#filtersModal'))return;
  const rect=$('#filtersModal').getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$('#filtersModal').close();
});

buildSkillsFilter();
function render(){const specialty=$('#specialty').value,cities=checkedValues('city'),min=Number($('#salary').value),formats=[...document.querySelectorAll('[name=format]:checked')].map(e=>e.value),exp=[...document.querySelectorAll('[name=experience]:checked')].map(e=>e.value),skills=[...document.querySelectorAll('[name=skill]:checked')].map(e=>e.value),requirements=[...document.querySelectorAll('[name=requirement]:checked')].map(e=>e.value);let filtered=jobs.filter(j=>(onlySaved||j.publishedAt===dateDaysAgo(dayOffset))&&matchesSpecialty(j,specialty)&&(!onlySaved||saved.has(j.id))&&matchesQuery(j)&&(!cities.length||cities.includes(j.city))&&j.salary>=min&&(!formats.length||formats.includes(j.format))&&(!exp.length||exp.includes(j.experience))&&(!skills.length||skills.some(skill=>(j.skills||[]).includes(skill)))&&(!requirements.length||requirements.some(item=>(j.requirements||[]).includes(item))));if($('#sort').value==='salary')filtered.sort((a,b)=>b.salary-a.salary);else filtered.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));$('#resultsTitle').textContent=onlySaved?'Избранные вакансии':dayOffset===0?'Вакансии, открытые сегодня':'Вакансии за '+displayDate(dateDaysAgo(dayOffset));const total=document.createElement('span');total.textContent=filtered.length+' найдено';$('#resultsTitle').append(total);$('#dayNavigation').hidden=onlySaved;$('#dayLabel').textContent=(dayOffset===0?'Сегодня · ':dayOffset===1?'Вчера · ':'')+displayDate(dateDaysAgo(dayOffset));$('#newerDay').disabled=dayOffset===0;$('#todayDay').disabled=dayOffset===0;updateFilterSummary();renderFilterChips();$('#jobs').innerHTML=filtered.slice(0,limit).map(j=>`<article class="job"><div class="job-top"><div class="company"><span class="company-logo">${j.logo}</span>${j.company}<span title="Демонстрационная компания">·</span></div><div class="job-meta"><span class="date">${publicationLabel(j)}</span><button class="save ${saved.has(j.id)?'saved':''}" data-save="${j.id}" aria-label="${saved.has(j.id)?'Удалить из избранного':'Добавить в избранное'}" aria-pressed="${saved.has(j.id)}">${bookmark}</button></div></div><h3>${j.title}</h3><div class="pay">${j.range}<small>на руки</small></div><p class="description">${j.text}</p><div class="job-bottom"><div class="tags"><span class="tag">${j.city}</span><span class="tag">${j.format}</span><span class="tag">${j.experience}</span></div><button class="details" data-detail="${j.id}">Подробнее <span>↗</span></button></div></article>`).join('')||'<div class="empty">Пока ничего не найдено.<br><br>Измените условия поиска, выберите другой день или проверьте избранное.</div>';$('#load').hidden=filtered.length<=limit;$('#savedCount').textContent=saved.size?`(${saved.size})`:'';$('#allNav').classList.toggle('active',!onlySaved);$('#savedNav').classList.toggle('active',onlySaved)}
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();limit=3;render();$('#vacancies').scrollIntoView({behavior:'smooth'})});document.querySelectorAll('#sort').forEach(el=>el.addEventListener('change',()=>{limit=3;render()}));$('aside').addEventListener('change',event=>{if(event.target.id==='specialty')buildSkillsFilter();limit=3;render()});$('#specialty').addEventListener('input',()=>{buildSkillsFilter();limit=3;render()});$('#query').addEventListener('input',()=>{buildSkillsFilter();limit=3;render()});$('#reset').onclick=resetFilters;document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{$('#query').value=b.dataset.query;buildSkillsFilter();limit=3;render()});$('#savedNav').onclick=()=>{onlySaved=true;render()};$('#allNav').onclick=()=>{onlySaved=false;render()};$('#load').onclick=()=>{limit+=3;render()};$('#jobs').onclick=e=>{const save=e.target.closest('[data-save]'),detail=e.target.closest('[data-detail]');if(save){const id=Number(save.dataset.save);saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('mesto-saved',JSON.stringify([...saved]))}catch{}render()}if(detail){const j=jobs.find(j=>j.id===Number(detail.dataset.detail));$('#modalContent').innerHTML=`<div class="eyebrow">${j.company}</div><h2>${j.title}</h2><div class="pay">${j.range}</div><div class="dialog-tags">${j.city} · ${j.format} · ${j.experience}</div><p>${j.text}</p><h3>Чем предстоит заниматься</h3><p>${j.tasks}</p><p class="prototype-notice">Это демонстрационная вакансия. В готовом сервисе здесь появится возможность отправить резюме и связаться с работодателем.</p>`;const heading=document.createElement('h3');heading.textContent='Ключевые навыки';const skillTags=document.createElement('div');skillTags.className='tags';(j.skills||[]).forEach(skill=>{const tag=document.createElement('span');tag.className='tag';tag.textContent=skill;skillTags.append(tag)});$('#modalContent').insertBefore(heading,$('.prototype-notice'));$('#modalContent').insertBefore(skillTags,$('.prototype-notice'));const requirementsHeading=document.createElement('h3');requirementsHeading.textContent='Основные требования';const requirementsList=document.createElement('ul');(j.requirements||[]).forEach(requirement=>{const item=document.createElement('li');item.textContent=requirement;requirementsList.append(item)});$('#modalContent').insertBefore(requirementsHeading,$('.prototype-notice'));$('#modalContent').insertBefore(requirementsList,$('.prototype-notice'));$('#modal').showModal()}};$('.close').onclick=()=>$('#modal').close();$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close()}});$('#employer').onclick=()=>{$('#modalContent').innerHTML='<div class="eyebrow">Для работодателей</div><h2>Найдите своих людей.</h2><p>Здесь будет кабинет компании: публикация вакансий, управление откликами и общение с кандидатами.</p><p>В этом прототипе представлена главная страница для соискателей.</p>';$('#modal').showModal()};render();

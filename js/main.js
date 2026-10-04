let dayOffset = 0;
let currentView="jobs";
let publishedOnly=false;
let catalogError=false;
function vacancyCatalog(){try{const records=EmployerStore.published();catalogError=false;return [...records,...jobs]}catch{catalogError=true;return jobs}}
const currentRecords=()=>currentView==="workers"?resumes:vacancyCatalog();
function safeCard(record){const escape=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));const copy={...record};['company','logo','title','range','text','city','format','experience'].forEach(key=>copy[key]=escape(record[key]));return copy}
const $=s=>document.querySelector(s);let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem('mesto-saved')||'[]'))}catch{}let limit=3;
const bookmark='<svg width="19" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 3h12v18l-6-4-6 4Z"/></svg>';
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
function buildCatalogs() {
  const data = currentRecords();
  $('#specialtySuggestions').replaceChildren();
  const counts = new Map();
  data.forEach(item=>counts.set(item.specialty,(counts.get(item.specialty)||0)+1));
  [...counts.keys()].sort((a,b)=>a.localeCompare(b,'ru')).forEach(value=>{
    const option=document.createElement('option');option.value=value;$('#specialtySuggestions').append(option);
  });
  $('#popularSpecialties').replaceChildren();
  const caption=document.createElement('span');caption.textContent=currentView==='workers'?'Популярные специальности:':'Самые востребованные:';$('#popularSpecialties').append(caption);
  [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ru')).slice(0,3).forEach(([value,count])=>{
    const button=document.createElement('button');button.type='button';button.textContent=value;button.title='В подборке: '+count;
    button.onclick=()=>{$('#specialty').value=value;$('#query').value='';buildSkillsFilter();limit=3;render()};$('#popularSpecialties').append(button);
  });
  [['city','cityOptions'],['format','formatOptions'],['experience','experienceOptions']].forEach(([field,id])=>{
    const list=$('#'+id);list.replaceChildren();
    [...new Set(data.flatMap(item=>field==='city'&&item.cities&&item.cities.length?item.cities:[item[field]]))].sort((a,b)=>a.localeCompare(b,'ru')).forEach(value=>{
      const label=document.createElement('label');label.className='check';
      const input=document.createElement('input');input.type='checkbox';input.name=field;input.value=value;
      label.append(input,document.createTextNode(value));list.append(label);
    });
  });
}
function switchView(view) {
  currentView=view;publishedOnly=false;dayOffset=0;limit=3;
  const workers=view==='workers';
  $('#myResume').hidden=workers;
  $('#createVacancy').hidden=!workers;
  $('#myResumeTitle').textContent='Личный кабинет и резюме ↗';
  document.querySelectorAll('input[type="checkbox"]').forEach(input=>input.checked=false);
  ['#query','#specialty','#salary'].forEach(id=>$(id).value='');
  $('#sort').value='new';$('#cityPicker').open=false;
  $('.hero h1').innerHTML=workers?'Найдите людей.<br><span>Для вашей команды.</span>':'Найдите работу.<br><span>И своё место.</span>';
  $('.hero .eyebrow').textContent=workers?'Команда начинается с человека':'Новый этап начинается здесь';
  $('.intro').textContent=workers?'Выбирайте специалистов по опыту, навыкам и ожиданиям. Найдите человека, с которым получится больше.':'Хорошая работа — та, что подходит именно вам. Выбирайте команду, задачи и свой ритм.';
  $('#query').placeholder=workers?'Должность, имя или ключевое слово':'Должность, компания или ключевое слово';
  $('#query').setAttribute('aria-label',workers?'Поиск резюме':'Поиск вакансий');
  $('#specialty').placeholder=workers?'Введите специальность кандидата':'Введите название вакансии';
  $('#searchForm .primary').textContent=workers?'Найти работников ↗':'Найти работу ↗';
  $('#salaryTitle').textContent=workers?'Ожидаемый доход':'Уровень дохода';
  $('#salary').placeholder=workers?'До, ₽ в месяц':'От, ₽ в месяц';
  $('#salary').setAttribute('aria-label',workers?'Максимальный ожидаемый доход кандидата':'Минимальная зарплата');
  $('#requirementsTitle').textContent=workers?'Квалификация и качества':'Основные требования';
  $('.skills-help').textContent=workers?'Покажем резюме хотя бы с одним выбранным навыком.':'Покажем вакансии хотя бы с одним выбранным навыком.';
  $('.requirements-filter .skills-help').textContent=workers?'Покажем резюме хотя бы с одним выбранным качеством.':'Покажем вакансии хотя бы с одним выбранным требованием.';
  $('#load').textContent=workers?'Показать ещё резюме ↓':'Показать ещё вакансии ↓';
  $('.footer span:last-child').textContent=workers?'Демонстрационные резюме · HTML-прототип, 2026':'Демонстрационные вакансии · HTML-прототип, 2026';
  document.title=workers?'место — поиск работников':'место — работа, которая вам подходит';
  buildCatalogs();buildSkillsFilter();render();
}

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
  currentRecords().filter(job => matchesSpecialty(job, specialty) && matchesQuery(job)).forEach(job => {
    new Set((job[field] || []).map(skill => skill.trim()).filter(Boolean)).forEach(skill => {
      counts.set(skill, (counts.get(skill) || 0) + 1);
    });
  });
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
}
function buildSkillsFilter() {
  const specialty = $('#specialty').value.trim();
  const hasQuery = specialty || $('#query').value.trim();
  $('#skillsTitle').textContent = currentView==='workers'?'Навыки кандидатов':hasQuery ? 'Навыки по вакансии' : 'Востребованные навыки';
  $('#skillsContext').textContent = currentView==='workers'?'Из резюме кандидатов · сначала популярные':hasQuery ? 'Из подходящих вакансий · сначала популярные' : 'Чаще всего встречаются в вакансиях';
  $('#requirementsContext').textContent = currentView==='workers'?'Из резюме кандидатов · сначала популярные':hasQuery ? 'Из подходящих вакансий · сначала популярные' : 'Чаще всего встречаются в вакансиях';
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
    empty.textContent = 'Нет подходящих '+(currentView==='workers'?'резюме':'вакансий')+'. Попробуйте другое название.';
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
    total.title = currentView==='workers'?'Количество резюме':'Количество вакансий';
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
    { key: 'salary', label: currentView==='workers'?'Ожидаемый доход':'Уровень дохода', values: salary > 0 ? [(currentView==='workers'?'До ':'От ') + salary.toLocaleString('ru-RU') + ' ₽ в месяц'] : [] },
    { key: 'experience', label: 'Опыт работы', values: checkedValues('experience') },
    { key: 'skill', label: 'Навыки', values: checkedValues('skill') },
    { key: 'requirement', label: currentView==='workers'?'Квалификация и качества':'Основные требования', values: checkedValues('requirement') },

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

  } else {
    document.querySelectorAll(`[name="${key}"]`).forEach(input => {
      if (input.value === value) input.checked = false;
    });
  }
  limit = 3;
  render();
}
// Демонстрационное сохранение. Реальный профиль потребует авторизации и API.
const filterStorageKey = () => currentView === 'workers' ? 'mesto-workers-filter-preset-v1' : 'mesto-demo-filter-preset-v1';
function readSavedFilters() {
  try {
    const preset = JSON.parse(localStorage.getItem(filterStorageKey()));
    return preset && preset.version === 1 && preset.fields && preset.checks ? preset : null;
  } catch { return null; }
}
function saveFilterPreset() {
  const preset = {version: 1, fields: {}, checks: {}, view: currentView};
  ['query', 'specialty', 'salary'].forEach(key => preset.fields[key] = $('#' + key).value);
  ['city', 'format', 'experience', 'skill', 'requirement'].forEach(key => preset.checks[key] = checkedValues(key));
  try {
    localStorage.setItem(filterStorageKey(), JSON.stringify(preset));
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
  limit = 3;
  render();
  $('#filterSaveStatus').textContent = 'Сохранённые фильтры применены.';
}
$('#saveFilters').onclick = saveFilterPreset;
$('#restoreFilters').onclick = restoreFilterPreset;

function resetFilters() {
  document.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
  ['#salary', '#query', '#specialty'].forEach(selector => $(selector).value = '');
  limit = 3;
  buildSkillsFilter();
  render();
}
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

function render(){const specialty=$('#specialty').value,cities=checkedValues('city'),min=Number($('#salary').value),formats=[...document.querySelectorAll('[name=format]:checked')].map(e=>e.value),exp=[...document.querySelectorAll('[name=experience]:checked')].map(e=>e.value),skills=[...document.querySelectorAll('[name=skill]:checked')].map(e=>e.value),requirements=[...document.querySelectorAll('[name=requirement]:checked')].map(e=>e.value);let filtered=currentRecords().filter(j=>(currentView==='jobs'&&publishedOnly?!!j.key:j.publishedAt===dateDaysAgo(dayOffset))&&matchesSpecialty(j,specialty)&&matchesQuery(j)&&(!cities.length||cities.some(city=>(j.cities||[j.city]).includes(city)))&&(currentView==='workers'?(!min||j.salary<=min):j.salary>=min)&&(!formats.length||formats.includes(j.format))&&(!exp.length||exp.includes(j.experience))&&(!skills.length||skills.some(skill=>(j.skills||[]).includes(skill)))&&(!requirements.length||requirements.some(item=>(j.requirements||[]).includes(item))));if($('#sort').value==='salary')filtered.sort((a,b)=>b.salary-a.salary);else filtered.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));$('#resultsTitle').textContent=currentView==='jobs'&&publishedOnly?'Опубликованные вакансии работодателей':dayOffset===0?(currentView==='workers'?'Резюме, опубликованные сегодня':'Вакансии, открытые сегодня'):(currentView==='workers'?'Резюме за ':'Вакансии за ')+displayDate(dateDaysAgo(dayOffset));const total=document.createElement('span');total.textContent=filtered.length+' найдено';$('#resultsTitle').append(total);$('#dayNavigation').hidden=currentView==='jobs'&&publishedOnly;$('#catalogScope').hidden=currentView!=='jobs';$('#publishedCatalog').setAttribute('aria-pressed',String(publishedOnly));$('#dailyCatalog').setAttribute('aria-pressed',String(!publishedOnly));$('#catalogNotice').textContent=catalogError?'Не удалось прочитать опубликованные вакансии. Проверьте доступ к хранилищу браузера и обновите страницу.':'';$('#dayLabel').textContent=(dayOffset===0?'Сегодня · ':dayOffset===1?'Вчера · ':'')+displayDate(dateDaysAgo(dayOffset));$('#newerDay').disabled=dayOffset===0;$('#todayDay').disabled=dayOffset===0;updateFilterSummary();renderFilterChips();$('#jobs').innerHTML=filtered.slice(0,limit).map(safeCard).map(j=>`<article class="job"><div class="job-top"><div class="company"><span class="company-logo">${j.logo}</span>${j.company}<span title="Демонстрационные данные">·</span></div><div class="job-meta"><span class="date">${publicationLabel(j)}</span><button class="save ${saved.has(j.id)?'saved':''}" data-save="${j.id}" aria-label="${saved.has(j.id)?'Удалить из избранного':'Добавить в избранное'}" aria-pressed="${saved.has(j.id)}">${bookmark}</button></div></div><h3>${j.title}</h3><div class="pay">${j.range}<small>${currentView==='workers'?'ожидаемый доход':'на руки'}</small></div><p class="description">${j.text}</p>${currentView==='jobs'&&j.task?`<p class="job-assessment-hint">Проверочное задание · по желанию · +${j.task.points} баллов</p>`:''}<div class="job-bottom"><div class="tags"><span class="tag">${j.city}</span><span class="tag">${j.format}</span><span class="tag">${j.experience}</span></div><div class="job-actions">${currentView==='jobs'?`<button type="button" class="primary quick-apply" data-apply="${j.id}">Откликнуться</button>`:''}<a class="details" href="${currentView==='workers'?'resume.html':'vacancy.html'}?id=${j.id}">Подробнее <span>↗</span></a></div></div></article>`).join('')||'<div class="empty">Пока ничего не найдено.<br><br>Измените условия поиска или выберите другой день.</div>';$('#load').hidden=filtered.length<=limit;$('#allNav').classList.toggle('active',currentView==='jobs');$('#workersNav').classList.toggle('active',currentView==='workers')}
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();limit=3;render();$('#vacancies').scrollIntoView({behavior:'smooth'})});document.querySelectorAll('#sort').forEach(el=>el.addEventListener('change',()=>{limit=3;render()}));$('aside').addEventListener('change',event=>{if(event.target.id==='specialty')buildSkillsFilter();limit=3;render()});$('#specialty').addEventListener('input',()=>{buildSkillsFilter();limit=3;render()});$('#query').addEventListener('input',()=>{buildSkillsFilter();limit=3;render()});$('#reset').onclick=resetFilters;document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{$('#query').value=b.dataset.query;buildSkillsFilter();limit=3;render()});$('#workersNav').onclick=()=>switchView('workers');$('#allNav').onclick=()=>switchView('jobs');$('#load').onclick=()=>{limit+=3;render()};$('#jobs').onclick=event=>{
  const save=event.target.closest('[data-save]'),apply=event.target.closest('[data-apply]');
  if(save){const id=/^\d+$/.test(save.dataset.save)?Number(save.dataset.save):save.dataset.save;saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('mesto-saved',JSON.stringify([...saved]))}catch{}render()}
  if(apply&&currentView==='jobs'){const job=vacancyCatalog().find(item=>String(item.id)===apply.dataset.apply);if(job)ApplicationUI.open({key:job.key||'demo:'+job.id,title:job.title,company:job.company,employerEmail:job.employerEmail||'demo',task:job.task||null})}
};
const catalogScope=document.createElement('div');catalogScope.id='catalogScope';catalogScope.className='chat-filters catalog-scope';
[['dailyCatalog','За выбранный день'],['publishedCatalog','Опубликованные работодателями · все даты']].forEach(([id,text])=>{const button=document.createElement('button');button.id=id;button.type='button';button.textContent=text;button.onclick=()=>{publishedOnly=id==='publishedCatalog';limit=3;render()};catalogScope.append(button)});
$('.results-head').before(catalogScope);
const catalogNotice=document.createElement('p');catalogNotice.id='catalogNotice';catalogNotice.setAttribute('role','status');catalogScope.after(catalogNotice);
switchView(location.hash==='#workers'?'workers':'jobs');
const requestedPublication=new URLSearchParams(location.search).get('publication');
if(requestedPublication){
  const record=vacancyCatalog().find(item=>String(item.id)===requestedPublication&&item.key);
  publishedOnly=true;
  if(record){$('#query').value=record.title;limit=vacancyCatalog().length;buildSkillsFilter();render()}
  else{render();$('#catalogNotice').textContent='Эта публикация не найдена в хранилище этой страницы. Откройте редактор и повторите публикацию в том же браузере.'}
}

function refreshVacancyCatalog(){
  const selected=[...document.querySelectorAll('aside input[type="checkbox"]:checked')].map(input=>({name:input.name,value:input.value}));
  buildCatalogs();buildSkillsFilter();
  document.querySelectorAll('aside input[type="checkbox"]').forEach(input=>input.checked=selected.some(item=>item.name===input.name&&item.value===input.value));render();
}
window.addEventListener('pageshow',refreshVacancyCatalog);
window.addEventListener('storage',refreshVacancyCatalog);

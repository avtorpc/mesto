const $ = selector => document.querySelector(selector);
const form=$('#vacancyForm');
let vacancyId=new URLSearchParams(location.search).get('id');
let storeError=false;
const inputs=()=>[...form.querySelectorAll('input,select,textarea')];
let requirementCounter=0;
function requirementInputs(){return [...$('#requirementsFields').querySelectorAll('input')]}
function addRequirement(value=''){
  const row=document.createElement('div');row.className='requirement-row';
  const input=document.createElement('input');input.type='text';input.value=value;input.maxLength=1500;input.placeholder='Например: опыт работы с клиентами от одного года';input.setAttribute('aria-label','Основное требование');input.id='requirement-'+(++requirementCounter);
  const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.className='requirement-control';minus.setAttribute('aria-label','Убрать требование');
  const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.className='requirement-control';plus.setAttribute('aria-label','Добавить требование');
  row.append(input,minus,plus);$('#requirementsFields').append(row);
  minus.onclick=()=>{if(requirementInputs().length===1)input.value='';else row.remove();syncRequirementId();refresh();$('#draftStatus').textContent='Есть несохранённые изменения.'};
  plus.onclick=()=>{addRequirement().focus();refresh();$('#draftStatus').textContent='Есть несохранённые изменения.'};
  syncRequirementId();return input;
}
function syncRequirementId(){requirementInputs().forEach((input,index)=>input.id=index===0?'jobRequirements':'requirement-'+(++requirementCounter))}
function setRequirements(value){$('#requirementsFields').replaceChildren();const values=value.split('\n');(values.length?values:['']).forEach(addRequirement)}
setRequirements('');
const splitValues=(value,separator)=>[...new Set(value.split(separator).map(item=>item.trim()).filter(Boolean))];
let selectedSkills=[];
const skillCatalog=[...new Set([...jobs,...resumes].flatMap(item=>item.skills||[]))].sort((a,b)=>a.localeCompare(b,'ru'));
let activeSkill=-1,skillOptions=[];
function closeSkills(){ $('#skillSuggestions').hidden=true;$('#jobSkills').setAttribute('aria-expanded','false');$('#jobSkills').removeAttribute('aria-activedescendant');activeSkill=-1 }
function addSkill(value){
  const raw=value.trim();if(!raw)return;
  const canonical=skillCatalog.find(skill=>skill.toLocaleLowerCase('ru')===raw.toLocaleLowerCase('ru'))||raw;
  if(!selectedSkills.some(skill=>skill.toLocaleLowerCase('ru')===canonical.toLocaleLowerCase('ru')))selectedSkills.push(canonical);
  $('#jobSkills').value='';refresh();showSkillSuggestions();$('#draftStatus').textContent='Есть несохранённые изменения.';
}
function showSkillSuggestions(){
  const query=$('#jobSkills').value.trim(),lower=query.toLocaleLowerCase('ru');
  skillOptions=skillCatalog.filter(skill=>skill.toLocaleLowerCase('ru').includes(lower)&&!selectedSkills.some(selected=>selected.toLocaleLowerCase('ru')===skill.toLocaleLowerCase('ru'))).slice(0,8);
  if(query&&!skillCatalog.some(skill=>skill.toLocaleLowerCase('ru')===lower)&&!selectedSkills.some(skill=>skill.toLocaleLowerCase('ru')===lower))skillOptions.push(query);
  const list=$('#skillSuggestions');list.replaceChildren();activeSkill=-1;
  skillOptions.forEach((value,index)=>{const option=document.createElement('button');option.type='button';option.id='skill-option-'+index;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.textContent=skillCatalog.includes(value)?value:'Добавить «'+value+'»';option.onmousedown=event=>event.preventDefault();option.onclick=()=>{addSkill(value);$('#jobSkills').focus()};list.append(option)});
  list.hidden=!skillOptions.length;$('#jobSkills').setAttribute('aria-expanded',String(!!skillOptions.length));$('#jobSkills').removeAttribute('aria-activedescendant');
}
function renderSkills(){
  const tags=$('#skillsPreview');tags.replaceChildren();
  selectedSkills.forEach(skill=>{const tag=document.createElement('span');tag.append(document.createTextNode(skill));const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Убрать навык '+skill);remove.onclick=()=>{selectedSkills=selectedSkills.filter(value=>value!==skill);refresh();$('#draftStatus').textContent='Есть несохранённые изменения.'};tag.append(remove);tags.append(tag)});
}
$('#jobSkills').addEventListener('input',showSkillSuggestions);
$('#jobSkills').addEventListener('focus',showSkillSuggestions);
$('#jobSkills').addEventListener('blur',()=>setTimeout(closeSkills,150));
$('#jobSkills').addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeSkills();return}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();if($('#skillSuggestions').hidden)showSkillSuggestions();if(!skillOptions.length)return;
    activeSkill=(activeSkill+(event.key==='ArrowDown'?1:-1)+skillOptions.length)%skillOptions.length;
    [...$('#skillSuggestions').children].forEach((option,index)=>option.setAttribute('aria-selected',String(index===activeSkill)));
    $('#jobSkills').setAttribute('aria-activedescendant','skill-option-'+activeSkill);return;
  }
  if(event.key==='Enter'){
    event.preventDefault();if(activeSkill>=0&&!$('#skillSuggestions').hidden)addSkill(skillOptions[activeSkill]);else addSkill($('#jobSkills').value);
  }
});
function collectVacancy(){const value=Object.fromEntries(inputs().filter(input=>input.name).map(input=>[input.name,input.type==='checkbox'?input.checked:input.value.trim()]));value.skills=selectedSkills.join(',');value.requirements=requirementInputs().map(input=>input.value.trim()).filter(Boolean).join('\n');return value}
function syncTaskEditor(){
  const enabled=$('#taskEnabled').checked,questionnaire=$('#taskType').value==='questionnaire';
  $('#taskEditorFields').hidden=!enabled;$('#taskQuestionsGroup').hidden=!questionnaire;
  ['taskType','taskTitle','taskDescription','taskQuestions','taskMinutes','taskPoints'].forEach(id=>{
    const input=$('#'+id);input.disabled=!enabled||(id==='taskQuestions'&&!questionnaire);
    input.required=enabled&&['taskType','taskTitle','taskDescription','taskPoints'].includes(id)||enabled&&questionnaire&&id==='taskQuestions';
  });
}
function validateVacancy(){
  syncTaskEditor();
  const value=collectVacancy();
  $('#jobCities').required=value.format!=='Удалённо';$('#cityRequired').hidden=!$('#jobCities').required;
  ['#salaryFrom','#salaryTo','#salaryTax'].forEach(id=>$(id).disabled=value.salaryUndisclosed);
  inputs().forEach(input=>input.setCustomValidity(''));
  inputs().filter(input=>input.required&&!input.disabled&&input.type!=='checkbox').forEach(input=>{if(!input.value.trim())input.setCustomValidity('Заполните это поле.')});
  if($('#jobCities').required&&!splitValues(value.cities,',').length)$('#jobCities').setCustomValidity('Укажите хотя бы один город.');
  if(!value.salaryUndisclosed){
    if(!value.salaryFrom&&!value.salaryTo)$('#salaryFrom').setCustomValidity('Укажите доход от или до, либо выберите «по договорённости».');
    else if(value.salaryFrom&&value.salaryTo&&Number(value.salaryFrom)>Number(value.salaryTo))$('#salaryTo').setCustomValidity('Верхняя граница не может быть меньше нижней.');
  }
  if(!selectedSkills.length)$('#jobSkills').setCustomValidity('Укажите хотя бы один навык.');
  if(!splitValues(value.requirements,'\n').length)$('#jobRequirements').setCustomValidity('Укажите хотя бы одно требование.');
  if(value.taskEnabled&&value.taskType==='questionnaire'&&!value.taskQuestions.trim())$('#taskQuestions').setCustomValidity('Добавьте вопросы анкеты.');
  return value;
}
function refresh(){
  const value=validateVacancy();
  const groups=[['Кого ищем',['jobTitle','jobSpecialty','jobExperience']],['Условия',['jobFormat','jobEmployment','jobCities','salaryFrom','salaryTo']],['Задачи и ожидания',['jobSummary','jobTasks','jobSkills','jobRequirements']],['Проверочное задание',['taskTitle','taskDescription','taskQuestions','taskMinutes','taskPoints']],['Компания и контакт',['companyName','contactName','contactEmail']]];
  let ready=0;$('#readinessList').replaceChildren();
  groups.forEach(([label,ids])=>{const valid=ids.every(id=>$('#'+id).disabled||$('#'+id).validity.valid);const li=document.createElement('li');li.className=valid?'complete':'';li.textContent=(valid?'✓ ':'○ ')+label+(label==='Проверочное задание'&&!value.taskEnabled?' · не требуется':'');$('#readinessList').append(li);if(valid)ready++});
  $('#readiness').textContent=ready+' из '+groups.length+' разделов';
  renderSkills();
}
function readDraft(){try{const items=EmployerStore.list();storeError=false;return vacancyId?items.find(item=>item.id===vacancyId)||null:null}catch{storeError=true;$('#draftStatus').textContent='Не удалось прочитать вакансии. Сохранение недоступно до восстановления хранилища.';return null}}
function applyDraft(draft){selectedSkills=splitValues(typeof draft.values.skills==='string'?draft.values.skills:'',',');$('#jobSkills').value='';closeSkills();setRequirements(typeof draft.values.requirements==='string'?draft.values.requirements:'');inputs().forEach(input=>{const value=draft.values[input.name];if(input.type==='checkbox')input.checked=value===true;else if(typeof value==='string')input.value=value});refresh()}
let savingVacancy=false;
const delay=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
async function showVacancySaved(){
  const toast=document.createElement('div');toast.className='vacancy-save-toast';toast.textContent='✓ Вакансия сохранена';toast.setAttribute('role','status');document.body.append(toast);
  let copy;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced){
    copy=document.createElement('div');copy.className='vacancy-save-copy';copy.setAttribute('aria-hidden','true');copy.inert=true;
    const page=form.cloneNode(true);page.removeAttribute('id');page.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));page.querySelectorAll('input,select,textarea,button,a').forEach(element=>element.tabIndex=-1);copy.append(page);document.body.append(copy);
  }
  await delay(reduced?650:1100);
  if(copy)copy.remove();toast.remove();
}
async function saveVacancy(returnToCabinet=false,publish=false){
  if(savingVacancy)return;
  const values=collectVacancy(),buttons=[$('#saveVacancyDraft'),$('#saveAndReturn'),$('#publishVacancy')];
  const previous=buttons.map(button=>({disabled:button.disabled,text:button.textContent}));
  savingVacancy=true;closeSkills();form.inert=true;form.setAttribute('aria-busy','true');
  buttons.forEach(button=>button.disabled=true);
  const active=publish?buttons[2]:returnToCabinet?buttons[1]:buttons[0];active.textContent='Сохраняем…';active.classList.add('saving');$('#draftStatus').textContent='Ожидаем завершения сохранения…';
  try{
    // Имитация ожидания AJAX в прототипе; сервер ещё не подключён.
    await delay(850);
    const record=EmployerStore.save(vacancyId,values);vacancyId=record.id;
    try{history.replaceState(null,'','vacancy-create.html?id='+encodeURIComponent(vacancyId)+(location.hash||''))}catch{}
    if(publish)EmployerStore.publish(vacancyId);
    updatePublication();
    $('#restoreVacancyDraft').hidden=false;active.classList.remove('saving');active.textContent='✓ Сохранено';$('#draftStatus').textContent=record.status==='published'?'Изменения сохранены. Нажмите «Обновить публикацию», чтобы показать их соискателям.':'Вакансия сохранена в кабинете как черновик.';
    if(typeof EmployerChats!=='undefined')EmployerChats.render(vacancyId);
    if(publish)$('#draftStatus').textContent='Вакансия опубликована в прототипе. Откройте её по ссылке и отправьте отклик.';
    await showVacancySaved();
    if(returnToCabinet)location.href='employer.html';
  }catch{$('#draftStatus').textContent='Не удалось сохранить или опубликовать вакансию. Данные остались в форме. Попробуйте ещё раз.'}
  finally{savingVacancy=false;form.inert=false;form.removeAttribute('aria-busy');buttons.forEach((button,index)=>{button.disabled=previous[index].disabled;button.textContent=previous[index].text;button.classList.remove('saving')});updatePublication()}
}
function updatePublication(){
  const record=readDraft();let snapshot=null;
  try{snapshot=EmployerStore.published().find(item=>item.id===vacancyId)}catch{}
  const published=!!snapshot;
  $('#publishedCatalogLink').hidden=!published;
  $('#publishedCatalogLink').href='index.html?publication='+encodeURIComponent(vacancyId||'')+'#vacancies';
  $('#publicationDate').textContent=snapshot?'Дата публикации: '+displayDate(snapshot.publishedAt)+'. В списке по дням выберите эту дату или откройте все публикации.':record&&record.status==='published'?'Запись отмечена опубликованной, но отсутствует в общем каталоге. Нажмите «Опубликовать в прототипе» для восстановления публикации.':'';
  $('#publishVacancy').textContent=published?'Обновить публикацию':'Опубликовать в прототипе';
  $('#publishedVacancyLink').hidden=!published;
  $('#publishedVacancyLink').href='vacancy.html?id='+encodeURIComponent(vacancyId||'');
  if(record)$('.draft-label').textContent=published?'Опубликована в прототипе':'Редактирование черновика';
}
$('#publishVacancy').onclick=()=>{validateVacancy();if(form.reportValidity())saveVacancy(false,true)};
$('#saveVacancyDraft').onclick=()=>saveVacancy();
$('#saveAndReturn').onclick=()=>saveVacancy(true);
$('#restoreVacancyDraft').onclick=()=>{const draft=readDraft();if(draft){applyDraft(draft);$('#draftStatus').textContent='Сохранённый черновик восстановлен.'}else $('#draftStatus').textContent='Сохранённый черновик не найден.'};
form.addEventListener('input',()=>{refresh();$('#draftStatus').textContent='Есть несохранённые изменения.'});
form.addEventListener('change',refresh);
function addPreview(tag,text){const element=document.createElement(tag);element.textContent=text;$('#vacancyPreviewContent').append(element);return element}
form.addEventListener('submit',event=>{
  event.preventDefault();const value=validateVacancy();if(!form.reportValidity())return;
  $('#vacancyPreviewContent').replaceChildren();addPreview('p',value.company);addPreview('h2',value.title).id='previewTitle';
  const salary=value.salaryUndisclosed?'Зарплата по договорённости':(value.salaryFrom?'от '+Number(value.salaryFrom).toLocaleString('ru-RU')+' ':'')+(value.salaryTo?'до '+Number(value.salaryTo).toLocaleString('ru-RU'):'')+' ₽ / месяц · '+value.salaryTax.toLowerCase();
  addPreview('p',salary);addPreview('p',[value.format,value.cities||'Без привязки к городу',value.employment,value.experience,value.schedule].filter(Boolean).join(' · '));
  addPreview('p',value.summary);
  [['Основные задачи',value.tasks],['Ключевые навыки',splitValues(value.skills,',').join(' · ')],['Основные требования',value.requirements],['Что предлагаем',value.benefits],['О компании',value.companyAbout]].forEach(([heading,text])=>{if(text){addPreview('h3',heading);addPreview('p',text)}});
  const task=AssessmentStore.taskFromValues(value);
  const taskInfo=ApplicationUI.taskBlock($('#vacancyPreviewContent'),task);
  const previewHeading=$('#previewTitle');previewHeading.parentElement.insertBefore(taskInfo,previewHeading.nextSibling);
  const tryApply=addPreview('button','Проверить отклик (демо)');tryApply.type='button';tryApply.className='primary';tryApply.disabled=!vacancyId;
  if(!vacancyId)addPreview('p','Сохраните черновик, затем откройте предпросмотр снова, чтобы проверить отклик.');
  tryApply.onclick=()=>{const profile=EmployerStore.profile();ApplicationUI.open({key:'draft:'+vacancyId,title:value.title,company:value.company,employerEmail:profile?profile.email.trim().toLowerCase():'demo',task})};
  $('#vacancyPreview').showModal();
});
$('#closeVacancyPreview').onclick=$('#backToVacancy').onclick=()=>$('#vacancyPreview').close();
$('#vacancyPreview').addEventListener('click',event=>{if(event.target!==$('#vacancyPreview'))return;const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close()});
[...new Set(jobs.map(job=>job.specialty))].sort((a,b)=>a.localeCompare(b,'ru')).forEach(value=>{const option=document.createElement('option');option.value=value;$('#specialtyOptions').append(option)});
const initialDraft=readDraft();$('#restoreVacancyDraft').hidden=!initialDraft;
if(initialDraft){applyDraft(initialDraft);$('#draftStatus').textContent='Загружен сохранённый черновик.'}else refresh();
if(vacancyId&&!initialDraft){$('#draftStatus').textContent=storeError?'Хранилище недоступно. Вернитесь в кабинет и попробуйте снова.':'Вакансия не найдена. Вернитесь в кабинет для создания новой.';$('#saveVacancyDraft').disabled=true;$('#saveAndReturn').disabled=true;$('#publishVacancy').disabled=true;}
if(initialDraft)updatePublication();

// Передаём только профиль работодателя; пароль не хранится ни в профиле, ни в черновике.
try {
  const profile=JSON.parse(sessionStorage.getItem('mesto-demo-employer'));
  if(profile && profile.version===1 && ['name','company','email'].every(key=>typeof profile[key]==='string')) {
    [['#companyName','company'],['#contactName','name'],['#contactEmail','email']].forEach(([selector,key])=>{if(!$(selector).value.trim())$(selector).value=profile[key]});
    $('#employerFlowStatus').hidden=false;
    $('#employerFlowStatus').textContent=initialDraft?'Черновик восстановлен. Данные работодателя подставлены в незаполненные поля.':'Кабинет работодателя · Новая вакансия. Компания и контакт уже заполнены — расскажите о вакансии.';
    refresh();
  }
} catch {}

// Меню переходит к разделам; содержимое формы всегда остаётся на странице.
(()=>{
  const menu=$('.vacancy-sections');
  const links=[...menu.querySelectorAll('a')];
  const sections=links.map(link=>document.querySelector(link.getAttribute('href')));
  let navigating=false,timer,scheduled=false;
  function mark(index){
    links.forEach((link,i)=>{sections[i].classList.toggle('section-highlighted',i===index);if(i===index)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
  }
  function go(index,animate){
    navigating=true;clearTimeout(timer);timer=setTimeout(()=>{navigating=false},1000);
    const top=window.scrollY+sections[index].getBoundingClientRect().top-menu.getBoundingClientRect().height-16;
    window.scrollTo({top:Math.max(0,top),behavior:animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'auto'});mark(index);
  }
  function update(){
    scheduled=false;if(navigating)return;
    const threshold=menu.getBoundingClientRect().height+32;let active=0;
    sections.forEach((section,index)=>{if(section.getBoundingClientRect().top<=threshold)active=index});mark(active);
  }
  links.forEach((link,index)=>link.addEventListener('click',event=>{
    event.preventDefault();try{history.pushState(null,'',location.pathname+location.search+link.getAttribute('href'))}catch{}go(index,true);
  }));
  window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}},{passive:true});
  function followHash(){const index=sections.findIndex(section=>'#'+section.id===location.hash);if(index>=0)go(index,false);else update()}
  window.addEventListener('hashchange',followHash);window.addEventListener('popstate',followHash);requestAnimationFrame(followHash);
})();

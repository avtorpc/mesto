const $=selector=>document.querySelector(selector);
const profile=UserStore.profile();
function node(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e}
function renderUser(){
  $('#newResume').disabled=false;
  if(!profile){$('#userNotice').textContent='Чтобы открыть кабинет, зарегистрируйтесь и подтвердите email демонстрационным кодом.';$('#newResume').textContent='Зарегистрироваться';$('#newResume').onclick=()=>location.href='index.html?register=applicant';$('#userLogout').hidden=true;return}
  renderUserApplications();
  $('#userName').textContent=profile.name;$('#userEmail').textContent=profile.email+' · подтверждено в деморежиме';
  let items;try{items=UserStore.list()}catch{$('#userStatus').textContent='Не удалось прочитать резюме из хранилища.';return}
  $('#resumeCount').textContent='('+items.length+')';$('#userResumes').replaceChildren();
  if(!items.length){const empty=node('div','','dashboard-empty');empty.append(node('h3','Здесь будут ваши резюме'),node('p','Создайте отдельное резюме для каждой интересующей роли.'));$('#userResumes').append(empty)}
  items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).forEach(item=>{
    const card=node('article','','employer-vacancy');const info=node('div','');info.append(node('span',item.visibility==='hidden'?'Скрыто · демо':'Доступно · демо','vacancy-status'));const link=node('a',item.candidate.title||'Новое резюме','vacancy-title');link.href='resume-owner.html?id='+item.candidate.id;info.append(link,node('p',item.candidate.city||'Город пока не указан'),node('small','Изменено '+new Date(item.updatedAt).toLocaleDateString('ru-RU')));const edit=node('a','Открыть и изменить ↗','outline-link');edit.href=link.href;card.append(info,edit);$('#userResumes').append(card);
  });
  $('#newResume').onclick=()=>{
    $('#newResume').disabled=true;
    try{const record=UserStore.create();location.href='resume-owner.html?id='+record.candidate.id}
    catch{$('#userStatus').textContent='Не удалось создать резюме. Проверьте хранилище браузера.';$('#newResume').disabled=false}
  };
}
$('#userLogout').onclick=()=>{try{sessionStorage.removeItem('mesto-demo-user');location.href='index.html'}catch{$('#userStatus').textContent='Не удалось завершить демосеанс.'}};
const userApplications=document.createElement('section');userApplications.className='dashboard-list';$('main').append(userApplications);
let activeChatId=null,chatQuery='',chatFilter='invited';
const chatFilters=[['all','Все'],['rejected','Отказы'],['reviewing','На рассмотрении'],['unanswered','Без ответа'],['invited','Приглашения'],['favorites','Избранные']];
function renderUserApplications(){
  userApplications.replaceChildren();const heading=node('div','','dashboard-list-head');heading.append(node('h2','Отклики и чаты'));
  const label=node('label','','dashboard-search');const search=node('input');search.type='search';search.className='chat-search';search.placeholder='Найти вакансию или компанию';search.setAttribute('aria-label','Поиск в откликах и чатах');search.value=chatQuery;label.append(search);heading.append(label);userApplications.append(heading);
  const filters=node('div','','chat-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Фильтры откликов');userApplications.append(filters);
  const content=node('div');userApplications.append(content);
  function showChats(){
    content.replaceChildren();filters.replaceChildren();let records;
    try{records=AssessmentStore.list().filter(record=>record.applicant.email===profile.email.trim().toLowerCase()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}
    catch{content.append(node('p','Не удалось прочитать отклики и сообщения.'));return}
    function matchesFilter(record,key){return key==='all'||key==='favorites'&&record.favorite===true||AssessmentStore.statusOf(record)===key}
    chatFilters.forEach(([key,label])=>{const button=node('button',label+' ('+records.filter(record=>matchesFilter(record,key)).length+')');button.type='button';button.setAttribute('aria-pressed',String(chatFilter===key));button.onclick=()=>{chatFilter=key;showChats()};filters.append(button)});
    if(!records.length){const empty=node('div','','dashboard-empty');empty.append(node('h3','Здесь будут ваши диалоги с работодателями'),node('p','Откликнитесь на вакансию — она появится здесь как чат с историей отклика и задания.'));const link=node('a','Найти работу ↗','primary');link.href='index.html#vacancies';empty.append(link);content.append(empty);return}
    const visible=records.filter(record=>matchesFilter(record,chatFilter)&&(record.jobTitle+' '+record.company).toLocaleLowerCase('ru').includes(chatQuery.trim().toLocaleLowerCase('ru')));
    if(!visible.length){
      const empty=node('div','','dashboard-empty');empty.append(node('h3',chatFilter==='invited'&&!chatQuery.trim()?'Приглашений пока нет':'Нет откликов по выбранным условиям'),node('p','Выберите другой фильтр или посмотрите все отклики.'));
      const all=node('button','Показать все отклики','primary');all.type='button';all.onclick=()=>{chatFilter='all';chatQuery='';search.value='';showChats()};empty.append(all);content.append(empty);return;
    }
    if(!visible.some(record=>record.id===activeChatId))activeChatId=visible[0].id;
    const workspace=node('div','','chat-workspace'),list=node('div','','chat-list'),thread=node('div','','chat-thread');list.setAttribute('aria-label','Вакансии, на которые вы откликнулись');workspace.append(list,thread);content.append(workspace);
    visible.forEach(record=>{
      const entries=AssessmentStore.conversation(record),last=entries[entries.length-1];const button=node('button','','chat-list-item');button.type='button';button.setAttribute('aria-pressed',String(record.id===activeChatId));
      button.append(node('strong',record.jobTitle),node('span',record.company,'chat-company'),node('span',last?last.text:'Отклик сохранён','chat-last-message'),node('small',AssessmentStore.statuses[AssessmentStore.statusOf(record)]+' · '+new Date(record.updatedAt).toLocaleDateString('ru-RU')));
      button.onclick=()=>{activeChatId=record.id;showChats()};list.append(button);
    });
    ChatUI.render(thread,visible.find(record=>record.id===activeChatId),{role:'applicant',email:profile.email,onSent:()=>showChats()});
  }
  search.addEventListener('input',()=>{chatQuery=search.value;showChats()});showChats();
}
window.addEventListener('pageshow',renderUser);window.addEventListener('storage',()=>{if(profile)renderUserApplications()});renderUser();

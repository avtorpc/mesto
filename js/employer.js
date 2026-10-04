const $=selector=>document.querySelector(selector);
const profile=EmployerStore.profile();
if(profile){$('#employerCompany').textContent=profile.company||'Ваши вакансии';$('#employerContact').textContent=[profile.name,profile.email].filter(Boolean).join(' · ')}
else $('#employerNotice').textContent='Демонстрационный кабинет без регистрации. Создайте вакансии для проверки интерфейса; данные хранятся только в этом браузере.';
function element(tag,text,className){const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node}
function renderEmployerVacancies(){
  const list=$('#employerVacancies');list.replaceChildren();let items;
  try{items=EmployerStore.list().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));$('#dashboardStatus').textContent=''}catch{$('#dashboardStatus').textContent='Не удалось прочитать список вакансий. Проверьте доступ к хранилищу браузера.';return}
  $('#vacancyTotal').textContent=items.length;$('#draftTotal').textContent=items.filter(item=>item.status!=='published').length;
  const query=$('#vacancySearch').value.trim().toLowerCase();const visible=items.filter(item=>(item.values.title||'Без названия').toLowerCase().includes(query));
  if(!visible.length){const empty=element('div','', 'dashboard-empty');empty.append(element('h3',items.length?'Вакансии не найдены':'Создайте первую вакансию'),element('p',items.length?'Измените поисковый запрос.':'Расскажите о задачах и условиях. Сохранённые вакансии появятся здесь.'));if(!items.length){const link=element('a','+ Создать вакансию','primary');link.href='vacancy-create.html';empty.append(link)}list.append(empty);return}
  visible.forEach(item=>{
    const card=element('article','','employer-vacancy');const info=element('div','');info.append(element('span',item.status==='published'?'Опубликована · прототип':'Черновик','vacancy-status'));
    const title=element('a',item.values.title||'Вакансия без названия','vacancy-title');title.href='vacancy-create.html?id='+encodeURIComponent(item.id);info.append(title);
    info.append(element('p',[item.values.specialty,item.values.format,item.values.cities].filter(Boolean).join(' · ')||'Условия пока не заполнены'));
    const date=new Date(item.updatedAt);info.append(element('small','Изменено: '+(Number.isNaN(date.getTime())?'дата не указана':date.toLocaleString('ru-RU'))));
    const link=element('a','Редактировать ↗','outline-link');link.href=title.href;const actions=element('div','','employer-vacancy-actions'),chats=element('a','Соискатели и чаты ↗','outline-link');chats.href=title.href+'#vacancy-applications';actions.append(link,chats);if(item.status==='published'){const view=element('a','Открыть страницу глазами соискателя ↗','outline-link');view.href='vacancy.html?id='+encodeURIComponent(item.id);actions.append(view)}else{const publish=element('a','Подготовить публикацию ↗','outline-link');publish.href=title.href;actions.append(publish)}card.append(info,actions);list.append(card);
  });
}
$('#vacancySearch').addEventListener('input',renderEmployerVacancies);
window.addEventListener('pageshow',()=>{renderEmployerVacancies();renderEmployerApplications()});
window.addEventListener('storage',()=>{renderEmployerVacancies();renderEmployerApplications()});
renderEmployerVacancies();

const employerApplications=document.createElement('section');employerApplications.className='dashboard-list';
$('main').append(employerApplications);
function renderEmployerApplications(){
  employerApplications.replaceChildren();employerApplications.append(element('h2','Отклики и проверочные задания'));
  const owner=profile?profile.email.trim().toLowerCase():'demo';let records;
  try{records=AssessmentStore.list().filter(record=>record.employerEmail===owner).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}
  catch{employerApplications.append(element('p','Не удалось прочитать отклики.'));return}
  if(!records.length){employerApplications.append(element('p','Здесь появятся демонстрационные отклики. Сохраните вакансию с заданием, откройте её предпросмотр и нажмите «Проверить отклик (демо)».','assessment-note'));return}
  records.forEach(record=>{
    const card=element('article','','application-result');card.append(element('h3',record.jobTitle),element('p',record.applicant.name+' · '+(record.resume.title||'Резюме без названия')));
    card.append(element('span','За выполнение: '+record.completionPoints+' баллов','application-score'),element('span',record.evaluation?'Соответствие: '+record.evaluation.score+'/100':'Соответствие: не оценено','application-score'));
    if(record.message)card.append(element('p',record.message,'assessment-description'));
    if(!record.task)card.append(element('p','Вакансия без задания.','assessment-note'));
    else if(!record.answered)card.append(element('p','Кандидат пропустил необязательное задание.','assessment-note'));
    else{
      const answers=element('details','');answers.append(element('summary','Посмотреть ответы · '+record.task.title));
      record.answers.forEach(answer=>answers.append(element('h4',answer.question),element('p',answer.text,'assessment-description')));card.append(answers);
      const form=element('form','','auth-form');const label=element('label','Оценка соответствия по ответу (0–100)');const score=element('input','');score.id='evaluation-'+record.id;label.htmlFor=score.id;score.type='number';score.min=0;score.max=100;score.step=1;score.required=true;score.value=record.evaluation?record.evaluation.score:'';score.placeholder='Оценка работодателя';
      const commentLabel=element('label','Комментарий к оценке');const comment=element('textarea','');comment.id='evaluation-comment-'+record.id;commentLabel.htmlFor=comment.id;comment.rows=2;comment.maxLength=2000;comment.value=record.evaluation?record.evaluation.feedback:'';
      const save=element('button','Сохранить оценку','primary');save.type='submit';const status=element('p','','assessment-note');status.setAttribute('role','status');
      form.append(label,score,commentLabel,comment,save,status);form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;try{AssessmentStore.evaluate(record.id,Number(score.value),comment.value,owner);renderEmployerApplications()}catch{status.textContent='Не удалось сохранить оценку. Попробуйте ещё раз.'}};answers.append(form);
    }
    const stateForm=element('form','','application-status-form'),stateLabel=element('label','Статус отклика'),state=element('select','');state.id='application-status-'+record.id;stateLabel.htmlFor=state.id;
    Object.entries(AssessmentStore.statuses).forEach(([value,label])=>{const option=element('option',label);option.value=value;state.append(option)});state.value=AssessmentStore.statusOf(record);
    const stateButton=element('button','Сохранить статус','outline-link');stateButton.type='submit';const stateStatus=element('p','','assessment-note');stateStatus.setAttribute('role','status');stateForm.append(stateLabel,state,stateButton,stateStatus);
    stateForm.onsubmit=event=>{event.preventDefault();try{AssessmentStore.setStatus(record.id,state.value,owner);renderEmployerApplications()}catch{stateStatus.textContent='Не удалось сохранить статус.'}};card.append(stateForm);
    const chat=element('details','');chat.append(element('summary','Чат с соискателем'));const thread=element('div','','employer-chat');chat.append(thread);
    chat.addEventListener('toggle',()=>{if(chat.open){try{ChatUI.render(thread,AssessmentStore.list().find(item=>item.id===record.id)||record,{role:'employer',email:owner})}catch{thread.replaceChildren();thread.append(element('p','Не удалось прочитать переписку.','assessment-note'))}}});
    card.append(chat);employerApplications.append(card);
  });
}
renderEmployerApplications();

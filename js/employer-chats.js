// Переписка работодателя ограничена одной сохранённой вакансией.
const EmployerChats=(()=>{
  const host=document.querySelector('#vacancy-applications');
  let vacancyId=new URLSearchParams(location.search).get('id'),activeId=null,filter='all';
  function add(parent,tag,text,cls){const node=document.createElement(tag);node.textContent=text||'';if(cls)node.className=cls;parent.append(node);return node}
  const heading=add(host,'h2','Соискатели и чаты');
  const summary=add(host,'p','','assessment-note');
  const label=add(host,'label','Поиск соискателя');label.htmlFor='candidateSearch';
  const search=add(host,'input');search.id='candidateSearch';search.type='search';search.placeholder='Имя, резюме или навык';search.className='chat-search';
  const filters=add(host,'div','','chat-filters');filters.setAttribute('aria-label','Статусы откликов');
  const results=add(host,'div');
  function controls(thread,record,owner){
    const panel=add(thread,'div','','employer-chat-controls');
    const form=add(panel,'form','','application-status-form'),label=add(form,'label','Статус отклика'),select=add(form,'select');select.id='candidate-status-'+record.id;label.htmlFor=select.id;
    Object.entries(AssessmentStore.statuses).forEach(([value,text])=>{const option=add(select,'option',text);option.value=value});select.value=AssessmentStore.statusOf(record);
    const submit=add(form,'button','Сохранить статус','outline-link');submit.type='submit';const status=add(form,'p','','assessment-note');status.setAttribute('role','status');
    form.onsubmit=event=>{event.preventDefault();try{AssessmentStore.setStatus(record.id,select.value,owner);render()}catch{status.textContent='Не удалось сохранить статус.'}};
    if(!record.task){add(panel,'p','Вакансия без проверочного задания.','assessment-note');return}
    if(!record.answered){add(panel,'p','Соискатель откликнулся без выполнения задания.','assessment-note');return}
    const answers=add(panel,'details');add(answers,'summary','Ответы на задание · '+record.task.title);
    record.answers.forEach(answer=>{add(answers,'h4',answer.question);add(answers,'p',answer.text,'assessment-description')});
    const evaluation=add(answers,'form','','chat-evaluation');const scoreLabel=add(evaluation,'label','Оценка соответствия (0–100)'),score=add(evaluation,'input');score.id='candidate-score-'+record.id;scoreLabel.htmlFor=score.id;score.type='number';score.min=0;score.max=100;score.step=1;score.required=true;score.value=record.evaluation?record.evaluation.score:'';
    const feedbackLabel=add(evaluation,'label','Комментарий к оценке'),feedback=add(evaluation,'textarea');feedback.id='candidate-feedback-'+record.id;feedbackLabel.htmlFor=feedback.id;feedback.rows=2;feedback.maxLength=2000;feedback.value=record.evaluation?record.evaluation.feedback:'';
    const save=add(evaluation,'button','Сохранить оценку','primary');save.type='submit';const notice=add(evaluation,'p','','assessment-note');notice.setAttribute('role','status');
    evaluation.onsubmit=event=>{event.preventDefault();if(!evaluation.reportValidity())return;try{AssessmentStore.evaluate(record.id,Number(score.value),feedback.value,owner);render()}catch{notice.textContent='Не удалось сохранить оценку. Данные остались в полях.'}};
  }
  function render(id){
    if(id!==undefined)vacancyId=id;
    results.replaceChildren();filters.replaceChildren();
    let vacancy,records;const profile=EmployerStore.profile(),owner=profile?profile.email.trim().toLowerCase():'demo';
    try{vacancy=EmployerStore.list().find(item=>item.id===vacancyId);records=vacancy?AssessmentStore.list().filter(record=>record.jobKey==='draft:'+vacancyId&&record.employerEmail===owner).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)):[]}
    catch{summary.textContent='Не удалось прочитать отклики и переписку. Попробуйте обновить страницу.';search.disabled=true;return}
    search.disabled=!vacancy;
    heading.textContent='Соискатели и чаты'+(vacancy?' · '+records.length:'');
    summary.textContent=vacancy?'Отклики на «'+(vacancy.values.title||'Вакансия без названия')+'». Выберите соискателя, чтобы открыть переписку.':vacancyId?'Вакансия не найдена в этом кабинете.':'Сохраните вакансию — здесь появятся её соискатели и переписка.';
    if(!vacancy)return;
    [['all','Все'],...Object.entries(AssessmentStore.statuses)].forEach(([value,text])=>{const count=records.filter(record=>value==='all'||AssessmentStore.statusOf(record)===value).length;const button=add(filters,'button',text+' · '+count);button.type='button';button.setAttribute('aria-pressed',String(value===filter));button.onclick=()=>{filter=value;render()}});
    const query=search.value.trim().toLowerCase();const visible=records.filter(record=>(filter==='all'||AssessmentStore.statusOf(record)===filter)&&[record.applicant.name,record.applicant.email,record.resume.title,...(record.resume.skills||[])].join(' ').toLowerCase().includes(query));
    if(!visible.length){add(results,'p',records.length?'Соискатели не найдены. Измените поиск или статус.':'Пока нет откликов на эту вакансию. Для проверки можно отправить отклик через предпросмотр вакансии.','chat-empty');return}
    if(!visible.some(record=>record.id===activeId))activeId=visible[0].id;
    const workspace=add(results,'div','','chat-workspace'),list=add(workspace,'div','','chat-list'),thread=add(workspace,'div','','chat-thread');list.setAttribute('aria-label','Соискатели этой вакансии');
    visible.forEach(record=>{const button=add(list,'button','','chat-list-item');button.type='button';button.setAttribute('aria-pressed',String(record.id===activeId));add(button,'strong',record.applicant.name||record.resume.name||'Соискатель');add(button,'span',record.resume.title||'Резюме без названия','chat-company');add(button,'span',record.applicant.email,'chat-company');add(button,'span',(record.resume.skills||[]).join(' · '),'chat-company');add(button,'span',AssessmentStore.statuses[AssessmentStore.statusOf(record)],'chat-company');const messages=AssessmentStore.conversation(record);add(button,'span',messages.length?messages[messages.length-1].text:'Отклик получен','chat-last-message');add(button,'small',new Date(record.updatedAt).toLocaleString('ru-RU'));button.onclick=()=>{activeId=record.id;render()}});
    const record=visible.find(item=>item.id===activeId);const conversation=add(thread,'div');ChatUI.render(conversation,record,{role:'employer',email:owner,onSent:()=>render()});controls(thread,record,owner);
  }
  search.addEventListener('input',()=>render());window.addEventListener('storage',()=>render());window.addEventListener('pageshow',()=>render());
  // Закрытие быстрого отклика в предпросмотре обновляет список в этой же вкладке.
  document.addEventListener('close',()=>render(),true);
  render();return {render};
})();

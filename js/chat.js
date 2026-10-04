const ChatUI=(()=>{
  const drafts=new Map();
  function add(parent,tag,text,cls){const node=document.createElement(tag);node.textContent=text||'';if(cls)node.className=cls;parent.append(node);return node}
  function date(value){return new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
  function render(host,record,{role,email,onSent}){
    host.replaceChildren();const header=add(host,'div','','chat-thread-head');add(header,'h3',record.jobTitle);add(header,'p',role==='applicant'?record.company:record.applicant.name+' · '+(record.resume.title||'Резюме без названия'));
    add(header,'span',AssessmentStore.statuses[AssessmentStore.statusOf(record)],'application-score');
    if(role==='applicant'){
      const favorite=add(header,'button',record.favorite?'★ В избранных':'☆ В избранное','chat-favorite');favorite.type='button';favorite.setAttribute('aria-pressed',String(!!record.favorite));
      const favoriteStatus=add(header,'p','','assessment-note');favoriteStatus.setAttribute('role','status');
      favorite.onclick=()=>{try{const updated=AssessmentStore.setFavorite(record.id,!record.favorite,email);if(onSent)onSent(updated);else render(host,updated,{role,email,onSent})}catch{favoriteStatus.textContent='Не удалось изменить избранное.'}};
    }
    const scores=add(header,'div');add(scores,'span','За выполнение: '+record.completionPoints+' баллов','application-score');add(scores,'span',record.evaluation?'Соответствие: '+record.evaluation.score+'/100':record.answered?'Ожидает оценки работодателя':'Соответствие не оценено','application-score');
    if(/^demo:\d+$/.test(record.jobKey)||record.jobKey.startsWith('draft:')){const link=add(header,'a','Открыть вакансию ↗','chat-vacancy-link');link.href='vacancy.html?id='+record.jobKey.split(':')[1]}
    const messages=add(host,'div','','chat-messages');messages.setAttribute('role','log');messages.setAttribute('aria-label','Переписка по вакансии');
    AssessmentStore.conversation(record).forEach(entry=>{
      const bubble=add(messages,'article','','chat-message '+(entry.role==='system'?'system':entry.role===role?'outgoing':'incoming'));
      add(bubble,'span',entry.role==='system'?'Статус отклика':entry.role===role?'Вы':entry.role==='employer'?'Работодатель':'Соискатель','chat-author');add(bubble,'p',entry.text);add(bubble,'time',date(entry.createdAt));
    });
    const form=add(host,'form','','chat-compose');const label=add(form,'label',role==='applicant'?'Сообщение работодателю':'Сообщение соискателю');
    const draftKey=role+':'+email+':'+record.id;
    const text=add(form,'textarea');text.value=drafts.get(draftKey)||'';text.id='chat-message-'+record.id;label.htmlFor=text.id;text.maxLength=5000;text.rows=3;text.required=true;text.placeholder='Напишите сообщение…';
    const button=add(form,'button','Отправить','primary');button.type='submit';const status=add(form,'p','Демочат: сообщения сохраняются только в этом браузере.','assessment-note');status.setAttribute('role','status');
    text.addEventListener('input',()=>{text.setCustomValidity('');drafts.set(draftKey,text.value)});
    form.onsubmit=event=>{event.preventDefault();text.setCustomValidity(text.value.trim()?'':'Введите сообщение.');if(!form.reportValidity())return;try{const updated=AssessmentStore.sendMessage(record.id,text.value,role,email);drafts.delete(draftKey);if(onSent)onSent(updated);else render(host,updated,{role,email,onSent})}catch{status.textContent='Не удалось сохранить сообщение. Текст остался в поле.'}};
    requestAnimationFrame(()=>{messages.scrollTop=messages.scrollHeight});
  }
  return {render};
})();

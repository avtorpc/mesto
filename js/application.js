const ApplicationUI=(()=>{
  let feedback=null,feedbackTimer;
  function add(parent,tag,text,cls){const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;parent.append(node);return node}
  function taskBlock(parent,task){
    const block=add(parent,'section','','assessment-block');
    add(block,'span',task?'Необязательный шаг отклика':'Отклик без задания','assessment-eyebrow');
    add(block,'h3',task?task.title:'Проверочное задание не предусмотрено');
    if(!task){add(block,'p','Можно сразу отправить резюме работодателю.');return block}
    add(block,'p',AssessmentStore.types[task.type]);add(block,'p',task.description,'assessment-description');
    if(task.type==='questionnaire'){const list=add(block,'ol');task.questions.forEach(question=>add(list,'li',question))}
    add(block,'p',(task.minutes?'Ориентир: '+task.minutes+' мин. · ':'')+'За отправку полного ответа: +'+task.points+' баллов.','assessment-meta');
    add(block,'p','Задание можно пропустить. Баллы за выполнение учитываются в этом отклике; качество ответа отдельно оценивает работодатель.','assessment-note');return block;
  }
  function open(job){
    const dialog=add(document.body,'dialog','','application-dialog');dialog.addEventListener('close',()=>dialog.remove());dialog.setAttribute('aria-labelledby','applicationTitle');
    const close=add(dialog,'button','×','close');close.type='button';close.setAttribute('aria-label','Закрыть отклик');close.onclick=()=>dialog.close();
    add(dialog,'div','Отклик · демонстрация','eyebrow');const heading=add(dialog,'h2',job.title);heading.id='applicationTitle';
    const steps=add(dialog,'p','','application-steps'),body=add(dialog,'div'),status=add(dialog,'p','','assessment-note');status.setAttribute('role','status');
    const profile=UserStore.profile();let available;
    try{available=profile?UserStore.list().map(record=>record.candidate):[resumes[0]]}catch{steps.textContent='Не удалось прочитать резюме.';dialog.showModal();return}
    const applicant=profile||{name:resumes[0].name,email:'demo-applicant@example.test'};
    let chosen=available[0],message='',answered=false,answers=[],stage=1,sending=false,sent=false;
    function button(parent,label,callback,cls='outline-button'){const button=add(parent,'button',label,cls);button.type='button';button.onclick=callback;return button}
    function send(){
      if(sending||sent||!chosen)return;
      sending=true;status.textContent='';
      try{
        const record=AssessmentStore.saveApplication({job,applicant,resume:chosen,message,answered,answers});sent=true;
        dialog.close();
        if(feedback){clearTimeout(feedbackTimer);feedback.remove()}
        feedback=add(document.body,'div','✓ Отклик сохранён'+(record.completionPoints?' · +'+record.completionPoints+' баллов':''),'application-feedback');
        feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
        feedbackTimer=setTimeout(()=>{if(feedback){feedback.remove();feedback=null}},2800);
      }catch{status.textContent='Не удалось сохранить отклик. Данные остались на экране. Попробуйте ещё раз.'}
      finally{sending=false}
    }
    function render(){
      body.replaceChildren();status.textContent='';steps.textContent=stage===1?'Выберите резюме и откликнитесь':'Решите задание — ответ отправится вместе с откликом';
      if(stage===1){
        if(!profile)add(body,'p','Для проверки используется резюме Анны Морозовой. Реальный отклик не отправляется.','assessment-note');
        if(!available.length){add(body,'p','Сначала создайте резюме в своём кабинете.');const link=add(body,'a','Перейти в кабинет','primary');link.href='user.html';return}
        const form=add(body,'form','','auth-form'),label=add(form,'label','Ваше резюме'),select=add(form,'select');select.id='applicationResume';label.htmlFor=select.id;
        available.forEach(resume=>{const option=add(select,'option',resume.title||'Новое резюме');option.value=String(resume.id)});select.value=String(chosen.id);
        const caption=add(form,'label','Сопроводительное сообщение (необязательно)'),text=add(form,'textarea');text.id='applicationMessage';caption.htmlFor=text.id;text.rows=3;text.maxLength=2000;text.value=message;
        function selectResume(){chosen=available.find(resume=>String(resume.id)===select.value);message=text.value}
        if(job.task){
          const invite=add(form,'div','','quick-assessment');add(invite,'h3','Проверочное задание — по желанию');add(invite,'p',job.task.title);add(invite,'p',(job.task.minutes?job.task.minutes+' мин. · ':'')+'+'+job.task.points+' баллов за полный ответ. Можно откликнуться без задания.','assessment-note');
        }
        const next=add(form,'button',job.task?'Решить задание':'Откликнуться','primary');next.type='submit';
        if(job.task)button(form,'Откликнуться без задания',()=>{if(!form.reportValidity())return;selectResume();answered=false;answers=[];send()},'assessment-link');
        form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;selectResume();if(job.task){stage=2;render()}else send()};
      }else{
        taskBlock(body,job.task);const form=add(body,'form','','auth-form');
        add(form,'p','Резюме: '+(chosen.title||'Новое резюме'),'assessment-note');
        const questions=job.task.type==='questionnaire'?job.task.questions:['Ваш ответ'];const fields=[];
        questions.forEach((question,index)=>{const caption=add(form,'label',question+' *'),input=add(form,'textarea');input.id='taskAnswer-'+index;caption.htmlFor=input.id;input.rows=4;input.maxLength=5000;input.required=true;input.placeholder=job.task.type==='algorithm'?'Опишите решение или вставьте код. Код не запускается.':'Введите ответ';input.value=answers[index]?answers[index].text:'';fields.push(input)});
        const next=add(form,'button','Выполнено — откликнуться','primary');next.type='submit';
        form.onsubmit=event=>{event.preventDefault();fields.forEach(field=>field.setCustomValidity(field.value.trim()?'':'Введите ответ.'));if(!form.reportValidity())return;answered=true;answers=fields.map((field,index)=>({question:questions[index],text:field.value.trim()}));send()};
        fields.forEach(field=>field.addEventListener('input',()=>field.setCustomValidity('')));
        button(body,'Откликнуться без задания',()=>{answered=false;answers=[];send()},'assessment-link');
        button(body,'← К резюме',()=>{answers=fields.map((field,index)=>({question:questions[index],text:field.value}));stage=1;render()},'assessment-link');
      }
    }
    dialog.showModal();render();
    // Единственное резюме и отсутствие задания позволяют откликнуться одним нажатием.
    if(!job.task&&available.length===1)send();
  }

  function mount(parent,job){const block=taskBlock(parent,job.task);const meta=parent.querySelector('.dialog-tags');if(meta)parent.insertBefore(block,meta.nextSibling);const button=add(parent,'button','Откликнуться','primary');button.type='button';button.onclick=()=>open(job)}
  return {taskBlock,open,mount};
})();

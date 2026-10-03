if (candidate) {
  const draftKey='mesto-resume-draft-'+id;
  let visibility=ownerDraft && ownerDraft.visibility==='hidden'?'hidden':'visible';
  $('#ownerPreview').href='resume.html?id='+id+'&preview=1';
  $('#inviteCandidate').textContent='Редактировать резюме';
  $('#saveCandidate').hidden=true;$('#saveStatus').hidden=true;
  $('#ownerNotice').textContent=ownerDraft?'Сохранённая версия в этом браузере'+(ownerDraft.updatedAt?' · '+new Date(ownerDraft.updatedAt).toLocaleDateString('ru-RU'):''):'Это пример вашего резюме. Редактирование доступно без регистрации только в деморежиме.';
  document.title='Моё резюме — '+candidate.name+' · место';
  function updateVisibility(){
    const visible=visibility==='visible';
    $('#visibilityText').textContent=visible?'Доступно работодателям (демо)':'Скрыто от работодателей (демо)';
    $('#toggleVisibility').textContent=visible?'Скрыть резюме':'Сделать видимым';
    $('.availability').textContent=visible?'Открыто к предложениям · демо':'Резюме скрыто · демо';
  }
  updateVisibility();
  function snapshot(){return {version:1,candidate:{...candidate},details:{...profileDetails[id]},visibility,updatedAt:new Date().toISOString()}}
  $('#toggleVisibility').onclick=()=>{
    const next=visibility==='visible'?'hidden':'visible';
    try{const draft=snapshot();draft.visibility=next;localStorage.setItem(draftKey,JSON.stringify(draft));visibility=next;updateVisibility();$('#ownerNotice').textContent='Видимость изменена в локальном прототипе.'}
    catch{$('#ownerNotice').textContent='Не удалось изменить видимость: хранилище браузера недоступно.'}
  };
  const groups={
    general:{title:'Основная информация',fields:[['candidate','name','Имя'],['candidate','title','Специальность'],['candidate','salary','Ожидаемый доход, ₽','number'],['candidate','city','Город'],['candidate','format','Формат работы','select'],['candidate','text','Краткое описание','textarea']]},
    about:{title:'О себе',fields:[['candidate','tasks','О себе','textarea']]},
    experience:{title:'Профессиональный опыт',fields:[['details','years','Общий стаж'],['details','summary','Кратко об опыте: что вы умеете и какие задачи решаете','textarea'],['details','bullets','Ключевые результаты — по одному на строку','lines'],['details','workplaces','Места работы — одна строка на место: компания | должность | период','lines']]},
    skills:{title:'Навыки и квалификация',fields:[['candidate','skills','Навыки — по одному на строку','lines'],['candidate','requirements','Квалификация и качества — по одному на строку','lines']]},
    education:{title:'Образование и языки',fields:[['details','school','Учебное заведение'],['details','degree','Специальность и годы обучения'],['details','language','Языки']]},
    projects:{title:'Избранный проект',fields:[['details','project','Название проекта'],['details','result','Описание и результат','textarea']]}
  };
  let editing='general';
  function openEditor(group){
    editing=group;const config=groups[group];$('#editResumeTitle').textContent=config.title;$('#editFields').replaceChildren();$('#editStatus').textContent='';
    config.fields.forEach(([source,key,label,type='text'])=>{
      const fieldId='edit-'+key;const caption=addText($('#editFields'),'label',label);caption.htmlFor=fieldId;
      const input=document.createElement(type==='lines'||type==='textarea'?'textarea':type==='select'?'select':'input');input.id=fieldId;input.required=true;
      if(type==='select')['Удалённо','Гибрид','В офисе'].forEach(value=>{const option=addText(input,'option',value);option.value=value});
      else if(type==='lines'||type==='textarea'){input.rows=5;input.maxLength=5000}
      else{input.type=type;input.maxLength=200;if(type==='number'){input.min=0;input.max=10000000;input.step=1000}}
      const value=(source==='candidate'?candidate:profileDetails[id])[key];input.value=Array.isArray(value)?value.join('\n'):value;
      $('#editFields').append(input);
    });$('#editResumeModal').showModal();
  }
  $('#inviteCandidate').onclick=()=>openEditor('general');
  Object.keys(groups).filter(key=>key!=='general').forEach(key=>{
    const heading=$('#'+key+' h2');const button=document.createElement('button');button.type='button';button.className='section-edit';button.textContent='Изменить';button.setAttribute('aria-label','Редактировать: '+groups[key].title);button.onclick=()=>openEditor(key);heading.append(button);
  });
  $('#closeEdit').onclick=$('#cancelEdit').onclick=()=>$('#editResumeModal').close();
  $('#editResumeForm').addEventListener('submit',event=>{
    event.preventDefault();if(!event.target.reportValidity())return;
    const draft=snapshot();let valid=true;
    groups[editing].fields.forEach(([source,key,label,type])=>{
      const input=$('#edit-'+key);const raw=input.value.trim();if(!raw){valid=false;input.focus();return}
      draft[source][key]=type==='lines'?[...new Set(raw.split('\n').map(value=>value.trim()).filter(Boolean))]:type==='number'?Number(raw):raw;
    });
    if(!valid){$('#editStatus').textContent='Заполните поля: значение не может состоять только из пробелов.';return}
    try{localStorage.setItem(draftKey,JSON.stringify(draft));location.reload()}
    catch{$('#editStatus').textContent='Не удалось сохранить изменения: хранилище браузера недоступно. Введённые данные оставлены в форме.'}
  });
  $('#editResumeModal').addEventListener('click',event=>{if(event.target!==$('#editResumeModal'))return;const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close()});
}

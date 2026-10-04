if (candidate) {
  const draftKey='mesto-resume-draft-'+id;
  let visibility=ownerDraft && ownerDraft.visibility==='hidden'?'hidden':'visible';
  $('#ownerPreview').href='resume.html?id='+id+'&preview=1';
  $('#inviteCandidate').hidden=true;
  $('#saveCandidate').hidden=true;$('#saveStatus').hidden=true;
  $('#ownerNotice').hidden=true;
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
    try{const draft=snapshot();draft.visibility=next;(personalRecord?UserStore.save(draft):localStorage.setItem(draftKey,JSON.stringify(draft)));visibility=next;updateVisibility();$('#ownerNotice').hidden=false;$('#ownerNotice').textContent='Видимость изменена в локальном прототипе.'}
    catch{$('#ownerNotice').hidden=false;$('#ownerNotice').textContent='Не удалось изменить видимость: хранилище браузера недоступно.'}
  };
  const groups={
    general:{title:'Основная информация',fields:[['candidate','name','Имя'],['candidate','title','Специальность'],['candidate','salary','Ожидаемый доход, ₽','number'],['candidate','city','Город'],['candidate','format','Формат работы','select'],['candidate','text','Краткое описание (необязательно)','textarea']]},
    about:{title:'Заполните основную профессиональную информацию о себе',fields:[['candidate','tasks','Профессиональная информация о себе','textarea']]},
    experience:{title:'Профессиональный опыт',fields:[['details','years','Общий стаж','tenure'],['details','summary','Кратко об опыте: что вы умеете и какие задачи решаете','textarea'],['details','bullets','Ключевые результаты — по одному на строку','lines']]},
    skills:{title:'Навыки и квалификация',fields:[['candidate','skills','Навыки — по одному на строку','lines'],['candidate','requirements','Квалификация и качества — по одному на строку','lines']]},
    education:{title:'Образование и языки',fields:[['details','school','Учебное заведение'],['details','degree','Специальность и годы обучения'],['details','language','Языки']]},
    projects:{title:'Избранные проекты',fields:[['details','project','Название проекта'],['details','result','Описание и результат','textarea']]}
  };
  const form=document.createElement('form');form.id='inlineResumeForm';form.className='inline-resume-form';
  const body=$('.resume-body');
  while(body.firstChild)form.append(body.firstChild);
  body.append(form);
  const general=document.createElement('section');general.className='resume-section';general.id='general';
  addText(general,'div','00','section-index');const generalContent=document.createElement('div');general.append(generalContent);
  form.insertBefore(general,form.firstChild);
  Object.keys(groups).forEach(group=>{
    const section=group==='general'?general:$('#'+group);
    const content=section.children[1];content.replaceChildren();
    addText(content,'h2',groups[group].title);
    const fields=addText(content,'div','','inline-fields');
    if(group==='education'||group==='projects')return;
    groups[group].fields.forEach(([source,key,label,type='text'])=>{
      let container=fields;
      if(key==='workplaces'){container=addText(fields,'details','','work-history');addText(container,'summary','Места работы');}
      const wrapper=addText(container,'div','','inline-field');
      const caption=addText(wrapper,'label',label);caption.htmlFor='edit-'+key;
      if(type==='tenure'){
        const controls=addText(wrapper,'div','','tenure-controls');
        const amount=addText(controls,'input','');amount.id='edit-years';amount.type='number';amount.min=0;amount.max=1200;amount.step=1;amount.placeholder='Количество';
        const unit=addText(controls,'select','');unit.id='edit-tenure-unit';unit.setAttribute('aria-label','Единица стажа');
        [['years','Лет'],['months','Месяцев'],['none','Без стажа']].forEach(([value,label])=>{const option=addText(unit,'option',label);option.value=value});
        const previous=profileDetails[id].years||'';const match=previous.match(/^(\d+)\s*(.*)$/);
        amount.value=match?match[1]:'';unit.value=/без (опыта|стажа)/i.test(previous)?'none':/месяц/i.test(previous)?'months':'years';
        function updateTenure(){amount.disabled=unit.value==='none';amount.hidden=unit.value==='none';if(unit.value==='none')amount.value=''}
        unit.addEventListener('change',()=>{updateTenure();markDirty()});updateTenure();return;
      }
      const input=document.createElement(type==='lines'||type==='textarea'?'textarea':type==='select'?'select':'input');input.id='edit-'+key;
      if(type==='select')['Удалённо','Гибрид','В офисе'].forEach(value=>{const option=addText(input,'option',value);option.value=value});
      else if(type==='lines'||type==='textarea'){input.rows=4;input.maxLength=5000;wrapper.classList.add('wide')}
      else{input.type=type;input.maxLength=200;if(type==='number'){input.min=0;input.max=10000000;input.step=1}}
      const value=(source==='candidate'?candidate:profileDetails[id])[key];input.value=Array.isArray(value)?value.join('\n'):(value==null?'':value);
      if(key==='salary'&&!value)input.value='';
      const hints={text:'В 1–2 предложениях представьте себя работодателю. Например: Дизайнер интерфейсов, создаю понятные веб-сервисы. Этот текст появится в шапке резюме.',skills:'Перечислите инструменты и навыки, которыми владеете — каждый с новой строки. Например: Figma, Excel, управление проектами.',requirements:'Укажите квалификацию, сертификаты и профессиональные качества — каждое с новой строки. Например: сертификат по аналитике, ведение переговоров, работа в команде.',tasks:'Расскажите о своей специализации, сильных сторонах и задачах, которые хотите решать.'};
      if(hints[key])input.placeholder=hints[key];
      wrapper.append(input);
    });
  });
  const repeated={};
  function repeatFields(group,key,title,definitions,values){
    const host=$('#'+group).children[1];
    addText(host,'h3',title);
    const list=addText(host,'div','','repeat-list');
    const rows=[];repeated[key]=rows;
    function addRow(value={}){
      const card=addText(list,'div','','repeat-card');
      const fields=addText(card,'div','','inline-fields');
      const row={card,inputs:{}};rows.push(row);
      definitions.forEach(([name,label,placeholder,type])=>{
        const wrapper=addText(fields,'div','','inline-field');
        if(type==='textarea')wrapper.classList.add('wide');
        const input=document.createElement(type==='textarea'?'textarea':'input');
        input.id='repeat-'+key+'-'+(++repeatId)+'-'+name;
        const caption=addText(wrapper,'label',label);caption.htmlFor=input.id;
        input.placeholder=placeholder;input.value=value[name]||'';input.maxLength=type==='textarea'?5000:200;
        if(type==='textarea')input.rows=4;
        wrapper.append(input);row.inputs[name]=input;
      });
      const controls=addText(card,'div','','repeat-controls');
      const remove=addText(controls,'button','−','repeat-control');remove.type='button';remove.setAttribute('aria-label','Удалить запись: '+title);remove.title='Удалить запись';
      remove.onclick=()=>{
        if(rows.length===1){Object.values(row.inputs).forEach(input=>input.value='');Object.values(row.inputs)[0].focus()}
        else{rows.splice(rows.indexOf(row),1);card.remove()}
        markDirty();
      };
      const plus=addText(controls,'button','+','repeat-control');plus.type='button';plus.setAttribute('aria-label','Добавить запись: '+title);plus.title='Добавить запись';
      plus.onclick=()=>{const added=addRow();Object.values(added.inputs)[0].focus();markDirty()};
      return row;
    }
    (values.length?values:[{}]).forEach(addRow);
  }
  let repeatId=0;
  const details=profileDetails[id];
  repeatFields('experience','workEntries','Места работы',[
    ['company','Компания','Например: Студия «Форма»'],
    ['role','Должность','Например: Дизайнер интерфейсов'],
    ['period','Период работы','Например: 2022–2025 или 2022 — настоящее время']
  ],Array.isArray(details.workEntries)?details.workEntries:(details.workplaces||[]).map(value=>{const [company,role,...period]=value.split('|').map(part=>part.trim());return {company,role,period:period.join(' | ')}}));
  repeatFields('education','educations','Образование',[
    ['school','Учебное заведение','Например: МГУ имени М. В. Ломоносова'],
    ['degree','Специальность и годы обучения','Например: Экономика, бакалавриат · 2018–2022']
  ],Array.isArray(details.educations)?details.educations:[{school:details.school,degree:details.degree}]);
  repeatFields('education','languages','Язык',[
    ['name','Язык','Например: Английский'],['level','Уровень владения','Например: B2 — выше среднего или родной']
  ],Array.isArray(details.languages)?details.languages:(details.language?details.language.split(' · ').map(value=>{const [name,...level]=value.split(' — ');return {name,level:level.join(' — ')}}):[{}]));
  repeatFields('projects','projects','Проект',[
    ['title','Название проекта','Например: Запуск интернет-магазина'],
    ['result','Описание и результат','Расскажите о задаче, вашем вкладе и результате проекта.','textarea']
  ],Array.isArray(details.projects)?details.projects:[{title:details.project,result:details.result}]);
  const actions=addText(form,'div','','inline-save');
  const save=addText(actions,'button','Сохранить изменения','primary');save.type='submit';
  const draftSave=addText(actions,'button','Можно сохранить незавершённое резюме.','draft-save');draftSave.type='submit';
  const status=addText(actions,'p','','small-label');status.id='editStatus';status.setAttribute('role','status');
  const deleteButton=addText(form,'button',personalRecord?'Удалить резюме':'Удалить локальный черновик','delete-resume');deleteButton.type='button';
  deleteButton.onclick=()=>{
    if(!window.confirm(personalRecord?'Удалить это резюме? Остальные резюме останутся в кабинете.':'Удалить локальный черновик демонстрационного резюме?'))return;
    try{if(personalRecord)UserStore.remove(id);else localStorage.removeItem(draftKey);dirty=false;location.href=personalRecord?'user.html':'index.html#vacancies'}
    catch{status.textContent='Не удалось удалить резюме: хранилище браузера недоступно.'}
  };
  let dirty=false;
  function markDirty(){dirty=true;status.textContent='Есть несохранённые изменения.'}
  form.addEventListener('input',markDirty);
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue=''}});
  function formatTenure(){
    const unit=$('#edit-tenure-unit').value,raw=$('#edit-years').value.trim();
    if(unit==='none')return 'Без стажа';if(!raw)return 'Не указан';
    const amount=Number(raw),plural=new Intl.PluralRules('ru').select(amount);
    const labels=unit==='months'?{one:'месяц',few:'месяца',many:'месяцев',other:'месяца'}:{one:'год',few:'года',many:'лет',other:'года'};
    return amount+' '+labels[plural];
  }
  function showSavedCopy(){
    status.textContent='✓ Резюме сохранено';
    const toast=addText(document.body,'div','✓ Резюме сохранено','resume-save-toast');toast.setAttribute('role','status');
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduced){
      const frame=addText(document.body,'div','','resume-save-copy');frame.setAttribute('aria-hidden','true');frame.inert=true;
      const page=$('#resumeRoot').cloneNode(true);page.removeAttribute('id');
      page.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
      page.querySelectorAll('input,select,textarea,button,a').forEach(element=>{element.tabIndex=-1});
      frame.append(page);setTimeout(()=>frame.remove(),1100);
    }
    setTimeout(()=>toast.remove(),2400);
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const draft=snapshot();
    Object.entries(groups).filter(([key])=>key!=='education'&&key!=='projects').forEach(([,group])=>group.fields.forEach(([source,key,label,type])=>{
      const raw=$('#edit-'+key).value.trim();
      draft[source][key]=type==='tenure'?formatTenure():type==='lines'?[...new Set(raw.split('\n').map(value=>value.trim()).filter(Boolean))]:type==='number'?Number(raw):raw;
    }));
    Object.entries(repeated).forEach(([key,rows])=>{
      draft.details[key]=rows.map(row=>Object.fromEntries(Object.entries(row.inputs).map(([name,input])=>[name,input.value.trim()]))).filter(row=>Object.values(row).some(Boolean));
    });
    draft.details.workplaces=draft.details.workEntries.map(row=>[row.company,row.role,row.period].join(' | '));
    const firstEducation=draft.details.educations[0]||{},firstProject=draft.details.projects[0]||{};
    draft.details.school=firstEducation.school||'';draft.details.degree=firstEducation.degree||'';
    draft.details.language=draft.details.languages.map(row=>[row.name,row.level].filter(Boolean).join(' — ')).join(' · ');
    draft.details.project=firstProject.title||'';draft.details.result=firstProject.result||'';
    draft.candidate.specialty=draft.candidate.title;
    try{
      (personalRecord?UserStore.save(draft):localStorage.setItem(draftKey,JSON.stringify(draft)));
      Object.assign(candidate,draft.candidate);Object.assign(profileDetails[id],draft.details);dirty=false;
      $('#personName').textContent=candidate.name;$('#personTitle').textContent=candidate.title||'Новое резюме';$('#personIntro').textContent=candidate.text;
      $('#avatar').textContent=candidate.name.split(/\s+/).filter(Boolean).map(word=>word[0]).slice(0,2).join('');
      $('#profileSalary').textContent=candidate.salary?candidate.salary.toLocaleString('ru-RU')+' ₽':'Доход не указан';
      $('#personMeta').replaceChildren();[candidate.city||'Город пока не указан',candidate.format,'Опыт: '+draft.details.years].forEach(value=>addText($('#personMeta'),'span',value));
      $('#workConditions').replaceChildren();[['Формат работы',candidate.format],['Город',candidate.city],['Опыт работы',draft.details.years],['Занятость','Полная занятость']].forEach(([label,value])=>{addText($('#workConditions'),'dt',label);addText($('#workConditions'),'dd',value)});
      showSavedCopy();
    }
    catch{status.textContent='Не удалось сохранить изменения: хранилище браузера недоступно. Введённые данные оставлены в форме.'}
  });
}

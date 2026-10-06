(()=>{
  const storageKey='mesto-qualification-attempt-v1';
  const profileForm=document.querySelector('#testProfile');
  const testForm=document.querySelector('#generatedTest');
  const testSection=document.querySelector('#testSection');
  const generateButton=document.querySelector('#generateTest');
  const requestStatus=document.querySelector('#requestStatus');
  const saveStatus=document.querySelector('#saveStatus');
  let currentTest=null;

  const escape=value=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function checked(group){return[...document.querySelectorAll(`[data-stack-group="${group}"] input:checked`)].map(input=>input.value)}
  function profile(){
    const stack={languages:checked('languages'),databases:checked('databases'),devops:checked('devops'),practices:checked('practices')};
    return{specialization:document.querySelector('#specialization').value,declaredGrade:document.querySelector('#declaredGrade').value,stack,competencies:[...stack.databases,...stack.practices],technologies:[...stack.languages,...stack.devops]}
  }

  function render(test,answers={}){
    currentTest=test;
    document.querySelector('#testTitle').textContent=test.title;
    document.querySelector('#testDescription').textContent=test.description||'';
    document.querySelector('#testDuration').textContent=`≈ ${test.durationMinutes||5} минут`;
    testForm.innerHTML=test.questions.map((question,index)=>{
      const name=`answer-${escape(question.id||index)}`;
      const meta=[...new Set([question.competency,question.technology].filter(Boolean))].map(value=>`<span>${escape(value)}</span>`).join('');
      const code=question.codeSnippet?`<pre class="code-sample"><code>${escape(question.codeSnippet)}</code></pre>`:'';
      const control=question.type==='single_choice'
        ? question.options.map(option=>`<label class="option"><input type="radio" name="${name}" value="${escape(option)}" ${answers[question.id]===option?'checked':''}><span>${escape(option)}</span></label>`).join('')
        : `<textarea class="answer" name="${name}" rows="3" placeholder="Кратко опишите решение">${escape(answers[question.id]||'')}</textarea>`;
      return `<article class="question" data-question-id="${escape(question.id)}"><div class="question-meta">${meta}</div><h3>${index+1}. ${escape(question.prompt)}</h3>${code}${control}</article>`;
    }).join('');
    testSection.hidden=false;
  }

  profileForm.addEventListener('submit',async event=>{
    event.preventDefault();requestStatus.className='';requestStatus.textContent='GigaChat формирует вопросы…';generateButton.disabled=true;
    try{
      const selectedProfile=profile();
      const selectedCount=Object.values(selectedProfile.stack).reduce((sum,items)=>sum+items.length,0);
      if(selectedCount<2)throw Error('Выберите хотя бы две технологии или практики.');
      const response=await fetch('/api/qualification-tests/generate',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(selectedProfile)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(payload.error||`Ошибка сервера: ${response.status}`);
      render(payload.test);
      localStorage.setItem(storageKey,JSON.stringify({version:1,test:payload.test,answers:{},status:'started',updatedAt:new Date().toISOString()}));
      requestStatus.textContent='Тест готов.';testSection.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){requestStatus.className='error';requestStatus.textContent=error.message||'Не удалось получить тест.'}
    finally{generateButton.disabled=false}
  });

  document.querySelector('#saveAttempt').addEventListener('click',()=>{
    if(!currentTest)return;
    const answers={};
    testForm.querySelectorAll('.question').forEach(block=>{
      const input=block.querySelector('input:checked, textarea');
      answers[block.dataset.questionId]=input?input.value.trim():'';
    });
    localStorage.setItem(storageKey,JSON.stringify({version:1,test:currentTest,answers,status:'answered',updatedAt:new Date().toISOString()}));
    saveStatus.textContent='Ответы сохранены в этом браузере.';
  });

  try{
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(saved?.version===1&&saved.test){render(saved.test,saved.answers||{});saveStatus.textContent='Восстановлена предыдущая попытка.'}
  }catch{localStorage.removeItem(storageKey)}
})();

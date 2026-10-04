// Баллы относятся к конкретному отклику. Данные прототипа хранятся локально.
const AssessmentStore=(()=>{
  const storageKey='mesto-applications-v1';
  const types={questionnaire:'Анкета',algorithm:'Алгоритмическая задача',proposal:'Предложение по реструктуризации'};
  function taskFromValues(values){
    if(!values.taskEnabled)return null;
    return {type:values.taskType,title:values.taskTitle||'',description:values.taskDescription||'',questions:(values.taskQuestions||'').split('\n').map(value=>value.trim()).filter(Boolean),minutes:Number(values.taskMinutes)||0,points:Number(values.taskPoints)||0};
  }
  function list(){const raw=localStorage.getItem(storageKey);if(!raw)return [];const records=JSON.parse(raw);if(!Array.isArray(records))throw Error('Invalid applications');return records}
  const statuses={unanswered:'Без ответа',reviewing:'На рассмотрении',invited:'Приглашения',rejected:'Отказы'};
  function statusOf(record){
    if(statuses[record.status])return record.status;
    return record.evaluation||conversation(record).some(entry=>entry.role==='employer')?'reviewing':'unanswered';
  }
  function setStatus(id,status,email){
    if(!statuses[status])throw Error('Invalid status');
    const records=list(),record=records.find(item=>item.id===id);
    if(!record||record.employerEmail!==email.trim().toLowerCase())throw Error('Application not found');
    const changed=statusOf(record)!==status;
    record.chatMessages=[...conversation(record)];record.status=status;
    if(changed){record.chatMessages.push(message('system','Статус отклика: '+statuses[status]));record.updatedAt=new Date().toISOString()}
    localStorage.setItem(storageKey,JSON.stringify(records));return record;
  }
  function setFavorite(id,favorite,email){
    const records=list(),record=records.find(item=>item.id===id);
    if(!record||record.applicant.email!==email.trim().toLowerCase())throw Error('Application not found');
    record.favorite=!!favorite;localStorage.setItem(storageKey,JSON.stringify(records));return record;
  }
  function message(role,text,createdAt=new Date().toISOString()){return {id:'m-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),role,text,createdAt}}
  function applicationMessages(record,at=record.createdAt){
    const entries=[message('applicant','Отклик на вакансию «'+record.jobTitle+'». Резюме: '+(record.resume.title||'Без названия')+'.'+(record.message?'\n\n'+record.message:''),at)];
    if(record.answered)entries.push(message('applicant','Проверочное задание: '+record.task.title+'\n\n'+record.answers.map(answer=>answer.question+'\n'+answer.text).join('\n\n'),record.updatedAt));
    entries.push(message('system',record.answered?'Задание выполнено. Начислено '+record.completionPoints+' баллов за выполнение.':record.task?'Задание пропущено. Баллы за выполнение: 0.':'Отклик без проверочного задания.',record.updatedAt));
    return entries;
  }
  function conversation(record){
    if(Array.isArray(record.chatMessages))return record.chatMessages;
    const entries=applicationMessages(record);
    if(record.evaluation)entries.push(message('employer','Оценка соответствия: '+record.evaluation.score+'/100.'+(record.evaluation.feedback?'\n'+record.evaluation.feedback:''),record.evaluation.updatedAt));
    return entries;
  }
  function sendMessage(id,text,role,email){
    const value=text.trim();if(!value||value.length>5000||!['applicant','employer'].includes(role))throw Error('Invalid message');
    const records=list(),record=records.find(item=>item.id===id);
    if(!record||(role==='applicant'?record.applicant.email:record.employerEmail)!==email.trim().toLowerCase())throw Error('Conversation not found');
    const previous=statusOf(record);record.chatMessages=[...conversation(record),message(role,value)];
    record.status=role==='employer'&&previous==='unanswered'?'reviewing':previous;record.updatedAt=new Date().toISOString();localStorage.setItem(storageKey,JSON.stringify(records));return record;
  }
  function saveApplication({job,applicant,resume,message,answered,answers}){
    const task=job.task||null;
    if(!job.key||!applicant.email||!resume)throw Error('Missing application data');
    const complete=!!(task&&answered);
    if(complete){
      if(!types[task.type]||!task.title.trim()||!task.description.trim()||!Array.isArray(answers)||!answers.length||answers.some(answer=>!answer.text.trim()))throw Error('Incomplete task answer');
      if(task.type==='questionnaire'&&(!task.questions.length||answers.length!==task.questions.length))throw Error('Incomplete questionnaire');
    }
    const records=list(),email=applicant.email.trim().toLowerCase();
    const index=records.findIndex(record=>record.jobKey===job.key&&record.applicant.email.toLowerCase()===email);
    const old=index<0?null:records[index];
    const safeAnswers=complete?answers.map(answer=>({question:answer.question,text:answer.text.trim()})):[];
    const unchanged=old&&JSON.stringify(old.answers)===JSON.stringify(safeAnswers)&&JSON.stringify(old.task)===JSON.stringify(task);
    const record={id:old?old.id:'a-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),jobKey:job.key,jobTitle:job.title,company:job.company,employerEmail:job.employerEmail||'demo',applicant:{name:applicant.name,email},resume:{id:resume.id,name:resume.name,title:resume.title,skills:resume.skills||[]},message:message.trim(),task,answered:complete,answers:safeAnswers,completionPoints:complete?Math.max(0,Math.min(100,Number(task.points)||0)):0,evaluation:unchanged?old.evaluation:null,createdAt:old?old.createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    record.status=old?statusOf(old):'unanswered';record.favorite=old?!!old.favorite:false;
    record.chatMessages=old?conversation(old):[];
    const changed=!old||!unchanged||old.message!==record.message||JSON.stringify(old.resume)!==JSON.stringify(record.resume);
    if(changed)record.chatMessages=[...record.chatMessages,...applicationMessages(record,old?record.updatedAt:record.createdAt)];
    if(index<0)records.push(record);else records[index]=record;
    localStorage.setItem(storageKey,JSON.stringify(records));return record;
  }
  function evaluate(id,score,feedback,employerEmail){
    const records=list(),record=records.find(item=>item.id===id);
    if(!record||record.employerEmail!==employerEmail||!record.answered||!Number.isInteger(score)||score<0||score>100)throw Error('Invalid evaluation');
    const previous=statusOf(record);record.status=previous==='unanswered'?'reviewing':previous;
    const entries=conversation(record),now=new Date().toISOString();
    const changed=!record.evaluation||record.evaluation.score!==score||record.evaluation.feedback!==feedback.trim();
    record.evaluation={score,feedback:feedback.trim(),updatedAt:now};record.updatedAt=now;
    record.chatMessages=changed?[...entries,message('employer','Оценка соответствия: '+score+'/100.'+(feedback.trim()?'\n'+feedback.trim():''),now)]:entries;
    localStorage.setItem(storageKey,JSON.stringify(records));return record;
  }
  return {types,taskFromValues,list,saveApplication,evaluate,conversation,sendMessage,statuses,statusOf,setStatus,setFavorite};
})();

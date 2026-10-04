const $=selector=>document.querySelector(selector);
const vacancyId=new URLSearchParams(location.search).get('id')||'1';
let publicJobs=[];try{publicJobs=EmployerStore.published()}catch{}
const vacancy=[...publicJobs,...jobs].find(job=>String(job.id)===vacancyId);
function detailNode(parent,tag,text,cls){const element=document.createElement(tag);element.textContent=text;if(cls)element.className=cls;parent.append(element);return element}
if(!vacancy){
  const root=$('#vacancyDetailRoot');root.replaceChildren();detailNode(root,'h1','Вакансия не найдена');detailNode(root,'p','Ссылка могла устареть. Выберите вакансию в списке.');const link=detailNode(root,'a','← Все вакансии','primary');link.href='index.html#vacancies';
}else{
  document.title=vacancy.title+' — '+vacancy.company+' · место';
  $('#vacancyCompany').textContent=vacancy.company;$('#vacancyTitle').textContent=vacancy.title;$('#vacancySalary').textContent=vacancy.range+(vacancy.salaryTax?' · '+vacancy.salaryTax:vacancy.key?'':' · на руки');$('#vacancyDate').textContent='Опубликовано '+displayDate(vacancy.publishedAt);$('#vacancySummary').textContent=vacancy.text;$('#vacancyTasks').textContent=vacancy.tasks;
  [vacancy.city,vacancy.format,'Опыт: '+vacancy.experience].forEach(value=>detailNode($('#vacancyMeta'),'span',value,'tag'));
  (vacancy.skills||[]).forEach(value=>detailNode($('#vacancySkills'),'span',value,'tag'));(vacancy.requirements||[]).forEach(value=>detailNode($('#vacancyRequirements'),'li',value));
  ApplicationUI.taskBlock($('#vacancyTaskInfo'),vacancy.task||null);
  $('#vacancyApplyHint').textContent=vacancy.task?'Можно выполнить проверочное задание или откликнуться без него.':'Проверочного задания нет. Достаточно выбрать резюме.';
  $('#applyVacancy').onclick=()=>ApplicationUI.open({key:vacancy.key||'demo:'+vacancy.id,title:vacancy.title,company:vacancy.company,employerEmail:vacancy.employerEmail||'demo',task:vacancy.task||null});
}

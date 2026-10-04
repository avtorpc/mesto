// Локальное хранилище демокабинета. Не является серверной авторизацией.
const EmployerStore = (() => {
  function profile(){try{const p=JSON.parse(sessionStorage.getItem('mesto-demo-employer'));return p&&p.version===1&&typeof p.email==='string'?p:null}catch{return null}}
  function key(){const p=profile();return 'mesto-employer-vacancies-v1:'+ (p?p.email.trim().toLowerCase():'demo')}
  function read(){const raw=localStorage.getItem(key());if(!raw)return [];const items=JSON.parse(raw);if(!Array.isArray(items))throw Error('Invalid vacancy storage');return items.filter(item=>item&&typeof item.id==='string'&&item.values&&typeof item.values==='object')}
  function list(){let items=read();const old=JSON.parse(localStorage.getItem('mesto-vacancy-draft-v1')||'null');const p=profile();
    if(old&&old.version===1&&old.values&&(!p||String(old.values.contactEmail||'').trim().toLowerCase()===p.email.trim().toLowerCase())&&!items.some(item=>item.id==='legacy-draft')){
      items=[...items,{id:'legacy-draft',values:old.values,createdAt:old.savedAt||new Date().toISOString(),updatedAt:old.savedAt||new Date().toISOString(),status:'draft'}];localStorage.setItem(key(),JSON.stringify(items));
    }return items;
  }
  function save(id,values){const items=list();const index=items.findIndex(item=>item.id===id);if(id&&index<0)throw Error('Vacancy not found');const now=new Date().toISOString();const record={id:id||('v-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)),values,createdAt:index>=0?items[index].createdAt:now,updatedAt:now,status:index>=0?items[index].status:'draft'};if(index>=0)items[index]=record;else items.push(record);localStorage.setItem(key(),JSON.stringify(items));return record}
  const publishedKey='mesto-published-vacancies-v1';
  function published(){const records=JSON.parse(localStorage.getItem(publishedKey)||'[]');if(!Array.isArray(records))throw Error('Invalid published vacancies');return records}
  function publish(id){
    const items=list(),record=items.find(item=>item.id===id);if(!record)throw Error('Vacancy not found');
    const v=record.values;if(!String(v.title||'').trim()||!String(v.company||'').trim())throw Error('Complete vacancy first');
    const records=published(),index=records.findIndex(item=>item.id===id),p=profile();
    const split=(value,separator)=>String(value||'').split(separator).map(item=>item.trim()).filter(Boolean);
    const firstPublication=index>=0?records[index].publishedAt:dateDaysAgo(0);
    const range=v.salaryUndisclosed?'По договорённости':(v.salaryFrom?'от '+Number(v.salaryFrom).toLocaleString('ru-RU')+' ':'')+(v.salaryTo?'до '+Number(v.salaryTo).toLocaleString('ru-RU')+' ':'')+'₽';
    const publicJob={id,key:'draft:'+id,employerEmail:p?p.email.trim().toLowerCase():'demo',publishedAt:firstPublication,specialty:v.specialty||v.title,title:v.title,company:v.company,logo:String(v.company).slice(0,1),salary:Number(v.salaryFrom)||Number(v.salaryTo)||0,range,salaryTax:v.salaryTax||'',cities:split(v.cities,','),city:v.cities||'Любой город',format:v.format||'',experience:v.experience||'',text:v.summary||'',tasks:v.tasks||'',skills:split(v.skills,','),requirements:split(v.requirements,'\n'),task:AssessmentStore.taskFromValues(v)};
    const previous=localStorage.getItem(publishedKey);
    if(index>=0)records[index]=publicJob;else records.push(publicJob);
    localStorage.setItem(publishedKey,JSON.stringify(records));
    try{record.status='published';localStorage.setItem(key(),JSON.stringify(items))}catch(error){if(previous===null)localStorage.removeItem(publishedKey);else localStorage.setItem(publishedKey,previous);throw error}
    return publicJob;
  }
  return {profile,list,save,published,publish};
})();

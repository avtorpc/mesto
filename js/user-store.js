const UserStore=(()=>{
  function profile(){try{const p=JSON.parse(sessionStorage.getItem('mesto-demo-user'));return p&&p.version===1&&p.verified&&typeof p.email==='string'?p:null}catch{return null}}
  function key(){const p=profile();if(!p)throw Error('No demo user');return 'mesto-user-resumes-v1:'+p.email.trim().toLowerCase()}
  function list(){const raw=localStorage.getItem(key());if(!raw)return [];const items=JSON.parse(raw);if(!Array.isArray(items))throw Error('Invalid data');return items}
  function get(id){return list().find(item=>item.candidate.id===id)||null}
  function save(draft){const items=list();const index=items.findIndex(item=>item.candidate.id===draft.candidate.id);if(index<0)throw Error('Resume not found');items[index]=draft;localStorage.setItem(key(),JSON.stringify(items))}
  function remove(id){const items=list();const remaining=items.filter(item=>item.candidate.id!==id);if(remaining.length===items.length)throw Error('Resume not found');localStorage.setItem(key(),JSON.stringify(remaining))}
  function create(title='',city=''){const p=profile();const items=list();let id=Date.now();while(items.some(item=>item.candidate.id===id))id++;
    const record={version:1,visibility:'hidden',updatedAt:new Date().toISOString(),candidate:{id,name:p.name,title,specialty:title,city,format:'Удалённо',salary:0,range:'Доход не указан',logo:p.name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''),text:'',tasks:'',skills:[],requirements:[],publishedAt:new Date().toISOString().slice(0,10)},details:{years:'Не указан',school:'',degree:'',language:'',company:'',start:'',project:'',result:'',summary:'',bullets:[],workplaces:[]}};
    items.push(record);localStorage.setItem(key(),JSON.stringify(items));return record;
  }
  return {profile,list,get,save,create,remove};
})();

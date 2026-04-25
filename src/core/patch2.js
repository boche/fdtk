(function(){
  const base=window.FDTK.game;
  const lore=window.FDTK.OFFICER_LORE||{};
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function getForceCities(state,forceId){return Object.values(state.cities).filter(function(city){return city.ownerForceId===forceId;});}
  function getForceOfficers(state,forceId){return Object.values(state.officers).filter(function(officer){return officer.forceId===forceId;});}
  function best(list,key){return list.length?list.slice().sort(function(a,b){return (b[key]||0)-(a[key]||0);})[0]:null;}
  function aggressiveAi(state){
    Object.values(state.forces).forEach(function(force){
      if(!force.alive||force.id===state.playerForceId){return;}
      const cities=getForceCities(state,force.id);
      cities.forEach(function(city){
        if(city.troops<140){return;}
        const target=city.neighbors.map(function(id){return state.cities[id];}).filter(Boolean).filter(function(nei){return nei.ownerForceId!==force.id && !force.truces[nei.ownerForceId];}).sort(function(a,b){return (a.troops+a.defense)-(b.troops+b.defense);})[0];
        if(!target){return;}
        const already=state.pendingAttacks.some(function(item){return item.fromCityId===city.id;});
        if(already){return;}
        const pressure=city.troops-(target.troops+Math.floor(target.defense*1.2));
        if(pressure<10){return;}
        const commander=best(getForceOfficers(state,force.id).filter(function(officer){return officer.cityId===city.id;}),'leadership')||best(getForceOfficers(state,force.id),'leadership');
        const committed=Math.max(80,Math.floor(city.troops*0.55));
        city.troops-=committed;
        state.pendingAttacks.push({attackerForceId:force.id,fromCityId:city.id,targetCityId:target.id,commanderId:commander?commander.id:null,troops:committed});
        state.logs.unshift({id:'ai-attack-'+Date.now()+city.id,time:state.year+'年'+state.month+'月',text:force.nameZh+'自'+city.nameZh+'出兵直取'+target.nameZh+'。',tone:'battle'});
      });
    });
  }
  function buildWarEffects(beforeState, afterState){
    const names=Object.values(afterState.cities).map(function(city){return city.nameZh;});
    const recent=(afterState.logs||[]).slice(0,8);
    afterState.lastWarEffects=recent.filter(function(entry){return entry.tone==='battle'||entry.text.indexOf('攻打')>=0||entry.text.indexOf('出兵')>=0;}).map(function(entry){
      const hit=names.find(function(name){return entry.text.indexOf(name)>=0;});
      const city=hit?Object.values(afterState.cities).find(function(item){return item.nameZh===hit;}):null;
      return {text:entry.text,cityId:city?city.id:null,tone:'battle'};
    });
  }
  function decorateOfficer(officer,state){
    const force=officer.forceId&&state.forces[officer.forceId]?state.forces[officer.forceId]:null;
    const profile=window.FDTK.getOfficerProfile?window.FDTK.getOfficerProfile(officer):null;
    const history=(profile&&profile.bio)||lore[officer.id]||((officer.forceId?state.forces[officer.forceId].nameZh:'在野')+'人物，'+officer.role+'，在乱世中待主而事。');
    if(profile){
      officer.civilSkill=profile.civilSkill;
      officer.civilSkillLabel=profile.civilSkillLabel;
      officer.civilSkillDesc=profile.civilSkillDesc;
      officer.militarySkill=profile.militarySkill;
      officer.militarySkillLabel=profile.militarySkillLabel;
      officer.militarySkillDesc=profile.militarySkillDesc;
      officer.specialSkill=profile.militarySkill;
      officer.skillSummary=profile.skillSummary;
    }
    officer.portraitUrl=(profile&&profile.portraitUrl)||(window.FDTK.getOfficerPortrait?window.FDTK.getOfficerPortrait(officer):'assets/portraits/portrait-100.webp');
    const dutyText=(window.FDTK.TEXT.duties&&window.FDTK.TEXT.duties[officer.duty])||'待命';
    const skillText=profile?(' 内政【'+profile.civilSkillLabel+'】：'+profile.civilSkillDesc+' 军事【'+profile.militarySkillLabel+'】：'+profile.militarySkillDesc):'';
    officer.bio=history+' 当前职责为'+dutyText+'。'+skillText;
    officer.avatar='';
    return officer;
  }
  function createNewGame(forceId){
    const state=base.createNewGame(forceId);
    state.lastWarEffects=[];
    return state;
  }
  function getCityView(state,cityId){
    const view=base.getCityView(state,cityId);
    ['ownOfficers','reserves','wanderers','officers'].forEach(function(key){
      if(view[key]){view[key]=view[key].map(function(item){return decorateOfficer(item,state);});}
    });
    return view;
  }
  function getForceOverview(state,forceId){
    const overview=base.getForceOverview(state,forceId);
    overview.officers=overview.officers.map(function(item){return decorateOfficer(item,state);});
    return overview;
  }
  function applyAction(inputState, action){
    const before=clone(inputState);
    if(action.type==='endTurn'){
      aggressiveAi(inputState);
    }
    const after=base.applyAction(inputState,action);
    if(action.type==='endTurn'){
      buildWarEffects(before,after);
    }
    return after;
  }
  window.FDTK.game={
    createNewGame:createNewGame,
    getAvailableActions:base.getAvailableActions,
    applyAction:applyAction,
    runAiPhase:base.runAiPhase,
    resolveBattles:base.resolveBattles,
    advanceMonth:base.advanceMonth,
    getForceOverview:getForceOverview,
    getCityView:getCityView,
    getForceCities:base.getForceCities,
    getForceOfficers:base.getForceOfficers,
  };
})();

(function(){
  const prev=window.FDTK.game;
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function ensureCityMeta(state){
    Object.values(state.cities).forEach(function(city){
      if(typeof city.population!=='number'){city.population=900+city.development*140+city.order*3;}
      if(typeof city.taxBurden!=='number'){city.taxBurden=0;}
      if(typeof city.conscription!=='number'){city.conscription=0;}
    });
  }
  function applyMonthlyRecovery(state){
    Object.values(state.cities).forEach(function(city){
      city.taxBurden=clamp(city.taxBurden-1,0,4);
      city.conscription=clamp(city.conscription-1,0,4);
      const growth=Math.max(8, Math.floor(city.development*9 + city.loyalty/8 - city.taxBurden*10 - city.conscription*14));
      city.population=clamp(city.population+growth,120,9999);
    });
  }
  function describePenalty(city){
    return '人口 '+city.population+'，税负 '+city.taxBurden+'，兵役 '+city.conscription;
  }
  function createNewGame(forceId){
    const state=prev.createNewGame(forceId);
    ensureCityMeta(state);
    return state;
  }
  function getAvailableActions(state){
    ensureCityMeta(state);
    const actions=prev.getAvailableActions(state);
    const city=state.cities[state.selectedCityId];
    actions.forEach(function(action){
      if(action.id==='tax'){
        if(city.taxBurden>=3 || city.loyalty<=45 || city.population<=420){action.enabled=false;}
      }
      if(action.id==='recruit'){
        if(city.conscription>=3 || city.loyalty<=42 || city.population<=320){action.enabled=false;}
      }
    });
    return actions;
  }
  function getForceOverview(state,forceId){
    ensureCityMeta(state);
    return prev.getForceOverview(state,forceId);
  }
  function getCityView(state,cityId){
    ensureCityMeta(state);
    return prev.getCityView(state,cityId);
  }
  function applyAction(inputState,action){
    ensureCityMeta(inputState);
    const before=inputState.cities[inputState.selectedCityId]?JSON.parse(JSON.stringify(inputState.cities[inputState.selectedCityId])):null;
    const result=prev.applyAction(inputState,action);
    ensureCityMeta(result);
    const city=result.cities[result.selectedCityId];
    if(action.type==='tax' && city && before){
      const popLoss=40 + before.taxBurden*22;
      city.population=clamp(city.population-popLoss,120,9999);
      city.taxBurden=clamp(city.taxBurden+1,0,4);
      city.loyalty=clamp(city.loyalty-4-before.taxBurden,30,100);
      city.order=clamp(city.order-3,35,100);
      result.lastFeedback={title:'征税完成',body:city.nameZh+'得金，但民心受损，流民增加。'+describePenalty(city),tone:'bad',cityId:city.id,tick:(result.lastFeedback&&result.lastFeedback.tick?result.lastFeedback.tick:0)+1};
      result.logs.unshift({id:'tax-cost-'+Date.now(),time:result.year+'年'+result.month+'月',text:city.nameZh+'因加征而民力受损，人口下降 '+popLoss+'。',tone:'bad'});
    }
    if(action.type==='recruit' && city && before){
      const popLoss=72 + before.conscription*30;
      city.population=clamp(city.population-popLoss,120,9999);
      city.conscription=clamp(city.conscription+1,0,4);
      city.loyalty=clamp(city.loyalty-3-before.conscription,30,100);
      city.order=clamp(city.order-2,35,100);
      result.lastFeedback={title:'征兵完成',body:city.nameZh+'兵力上升，但壮丁被抽调，人口下降。'+describePenalty(city),tone:'bad',cityId:city.id,tick:(result.lastFeedback&&result.lastFeedback.tick?result.lastFeedback.tick:0)+1};
      result.logs.unshift({id:'recruit-cost-'+Date.now(),time:result.year+'年'+result.month+'月',text:city.nameZh+'征发壮丁，人口下降 '+popLoss+'，地方稍生怨气。',tone:'bad'});
    }
    if(action.type==='endTurn'){
      applyMonthlyRecovery(result);
      if(result.advisorReport){
        const weak=Object.values(result.cities).filter(function(c){return c.ownerForceId===result.playerForceId && (c.taxBurden>=2 || c.conscription>=2 || c.population<450);});
        if(weak.length){
          const names=weak.slice(0,3).map(function(c){return c.nameZh;}).join('、');
          result.advisorReport.lines.unshift('另有 '+names+' 民力偏弱，短期内不宜再重税或强征。');
        }
      }
    }
    return result;
  }
  window.FDTK.game={
    createNewGame:createNewGame,
    getAvailableActions:getAvailableActions,
    applyAction:applyAction,
    runAiPhase:prev.runAiPhase,
    resolveBattles:prev.resolveBattles,
    advanceMonth:prev.advanceMonth,
    getForceOverview:getForceOverview,
    getCityView:getCityView,
    getForceCities:prev.getForceCities,
    getForceOfficers:prev.getForceOfficers,
  };
})();

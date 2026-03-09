(function(){
  const prev = window.FDTK.game;
  const TEXT = window.FDTK.TEXT;
  const fmt = window.FDTK.formatters;

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function nextRandom(state){ state.rngSeed = (state.rngSeed * 48271) % 2147483647; return state.rngSeed / 2147483647; }
  function roll(state,min,max){ return min + (max - min) * nextRandom(state); }
  function flagsForCities(cities){ const out={}; Object.keys(cities||{}).forEach(function(id){ out[id]={civilUsed:false,strategicUsed:false}; }); return out; }
  function createLog(state, text, tone){
    state.logs = state.logs || [];
    state.logs.unshift({ id:'patch4-'+Date.now()+'-'+state.logs.length, time:fmt.monthLabel(state.year,state.month), text:text, tone:tone||'normal' });
    state.logs = state.logs.slice(0, 40);
  }
  function getForceCities(state, forceId){ return Object.values(state.cities).filter(function(city){ return city.ownerForceId === forceId; }); }
  function getForceOfficers(state, forceId){ return Object.values(state.officers).filter(function(officer){ return officer.forceId === forceId; }); }
  function getCityOfficers(state, cityId, forceId){ return Object.values(state.officers).filter(function(officer){ return officer.cityId === cityId && (!forceId || officer.forceId === forceId); }); }
  function getReserveOfficers(state, forceId){ return getForceOfficers(state, forceId).filter(function(officer){ return !officer.assigned; }); }
  function best(list, key){ return list.length ? list.slice().sort(function(a,b){ return (b[key]||0) - (a[key]||0); })[0] : null; }
  function getForceName(state, forceId){ return state.forces[forceId] ? state.forces[forceId].nameZh : '无主'; }
  function isNeighbor(state, fromCityId, targetCityId){ const from = state.cities[fromCityId]; return !!(from && from.neighbors.indexOf(targetCityId) >= 0); }
  function setFeedback(state, title, body, tone, cityId){ state.lastFeedback = { title:title, body:body, tone:tone||'normal', cityId:cityId||null, tick:((state.lastFeedback&&state.lastFeedback.tick)||0)+1 }; }
  function ensureCityMeta(state){
    Object.values(state.cities||{}).forEach(function(city){
      if(typeof city.population !== 'number'){ city.population = 900 + city.development * 140 + city.order * 3; }
      if(typeof city.taxBurden !== 'number'){ city.taxBurden = 0; }
      if(typeof city.conscription !== 'number'){ city.conscription = 0; }
    });
    if(!state.cityMonthFlags){ state.cityMonthFlags = flagsForCities(state.cities||{}); }
    Object.keys(state.cities||{}).forEach(function(id){ if(!state.cityMonthFlags[id]){ state.cityMonthFlags[id]={civilUsed:false,strategicUsed:false}; } });
    if(!state.monthFlags){ state.monthFlags = { civilUsed:false, strategicUsed:false }; }
  }
  function canTaxCity(city){ return city.taxBurden < 2 && city.population > 550 && city.loyalty > 52 && city.order > 50; }
  function canRecruitCity(city){ return city.conscription < 2 && city.population > 430 && city.loyalty > 48 && city.order > 48; }
  function applyMonthlyRecovery(state){
    Object.values(state.cities).forEach(function(city){
      city.taxBurden = clamp((city.taxBurden||0) - 1, 0, 4);
      city.conscription = clamp((city.conscription||0) - 1, 0, 4);
      const growth = Math.max(8, Math.floor(city.development * 9 + city.loyalty / 8 - city.taxBurden * 10 - city.conscription * 14));
      city.population = clamp((city.population||0) + growth, 120, 9999);
    });
  }
  function performDevelop(state, forceId, cityId, isAi){
    const city = state.cities[cityId], force = state.forces[forceId];
    if(!city || !force || city.ownerForceId !== forceId || force.gold < 28 || force.food < 18){ return false; }
    force.gold -= 28; force.food -= 18;
    city.development = clamp(city.development + 1, 1, 6);
    city.order = clamp(city.order + 6, 35, 100);
    city.loyalty = clamp(city.loyalty + 4, 30, 100);
    createLog(state, getForceName(state, forceId)+'在'+city.nameZh+'整修仓场与街市，开发略有提升。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performTax(state, forceId, cityId, isAi){
    const city = state.cities[cityId], force = state.forces[forceId];
    if(!city || !force || city.ownerForceId !== forceId || !canTaxCity(city)){ return false; }
    const gain = 52 + city.development * 8;
    const popLoss = 42 + city.taxBurden * 26;
    force.gold = clamp(force.gold + gain, 0, 9999);
    city.population = clamp(city.population - popLoss, 120, 9999);
    city.taxBurden = clamp(city.taxBurden + 1, 0, 4);
    city.order = clamp(city.order - 8, 25, 100);
    city.loyalty = clamp(city.loyalty - 6, 22, 100);
    createLog(state, getForceName(state, forceId)+'在'+city.nameZh+'加征钱粮，得金'+gain+'，但民间颇有怨声。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performRecruit(state, forceId, cityId, isAi){
    const city = state.cities[cityId], force = state.forces[forceId];
    const leadOfficer = best(getCityOfficers(state, cityId, forceId), 'leadership');
    if(!city || !force || city.ownerForceId !== forceId || force.gold < 36 || force.food < 42 || !canRecruitCity(city)){ return false; }
    const drafted = 64 + city.development * 10 + Math.floor((leadOfficer ? leadOfficer.leadership : 50) / 5) + city.conscription * 8;
    const popLoss = drafted;
    const gain = drafted;
    force.gold -= 36; force.food -= 42;
    city.troops += gain;
    city.population = clamp(city.population - popLoss, 120, 9999);
    city.conscription = clamp(city.conscription + 1, 0, 4);
    city.order = clamp(city.order - 5, 25, 100);
    city.loyalty = clamp(city.loyalty - 4, 22, 100);
    createLog(state, getForceName(state, forceId)+'在'+city.nameZh+'整伍征兵，新增兵力'+gain+'，乡里壮丁多被抽调。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performAppoint(state, forceId, cityId, isAi){
    const city = state.cities[cityId];
    const reserve = best(getReserveOfficers(state, forceId), 'politics');
    if(!city || city.ownerForceId !== forceId || !reserve){ return false; }
    reserve.assigned = true; reserve.cityId = cityId; reserve.loyalty = clamp(reserve.loyalty + 6, 30, 100);
    city.order = clamp(city.order + 2, 35, 100); city.loyalty = clamp(city.loyalty + 2, 30, 100);
    createLog(state, getForceName(state, forceId)+'任命'+reserve.nameZh+'赴'+city.nameZh+'理事。', isAi ? 'ai' : 'normal');
    return true;
  }
  function scheduleAttack(state, forceId, fromCityId, targetCityId, isAi){
    const fromCity = state.cities[fromCityId], targetCity = state.cities[targetCityId], force = state.forces[forceId];
    if(!fromCity || !targetCity || !force || fromCity.ownerForceId !== forceId || !isNeighbor(state, fromCityId, targetCityId)){ return false; }
    if(!targetCity.ownerForceId || targetCity.ownerForceId === forceId || force.truces[targetCity.ownerForceId] || fromCity.troops < 120){ return false; }
    const already = (state.pendingAttacks||[]).some(function(item){ return item.fromCityId === fromCityId; });
    if(already){ return false; }
    const commander = best(getCityOfficers(state, fromCityId, forceId), 'leadership') || best(getForceOfficers(state, forceId), 'leadership');
    const committed = Math.max(80, Math.floor(fromCity.troops * 0.6));
    fromCity.troops -= committed;
    state.pendingAttacks.push({ attackerForceId:forceId, fromCityId:fromCityId, targetCityId:targetCityId, commanderId:commander ? commander.id : null, troops:committed });
    createLog(state, getForceName(state, forceId)+'自'+fromCity.nameZh+'发兵攻向'+targetCity.nameZh+'。', isAi ? 'ai' : 'normal');
    return true;
  }
  function weakestFrontierCity(state, forceId){
    const frontiers = getForceCities(state, forceId).filter(function(city){
      return city.neighbors.some(function(id){ const other = state.cities[id]; return other && other.ownerForceId && other.ownerForceId !== forceId; });
    });
    if(!frontiers.length){ return null; }
    return frontiers.sort(function(a,b){ return a.troops - b.troops; })[0];
  }
  function findAggressiveAttack(state, forceId){
    let bestPlan = null;
    getForceCities(state, forceId).forEach(function(city){
      if(city.troops < 135){ return; }
      city.neighbors.forEach(function(neighborId){
        const target = state.cities[neighborId];
        if(!target || !target.ownerForceId || target.ownerForceId === forceId){ return; }
        if(state.forces[forceId].truces[target.ownerForceId]){ return; }
        const score = city.troops - target.troops - Math.floor(target.defense * 1.1);
        if(score > 12 && (!bestPlan || score > bestPlan.score)){
          bestPlan = { fromCityId:city.id, targetCityId:target.id, score:score };
        }
      });
    });
    return bestPlan;
  }
  function runImprovedAiPhase(state){
    Object.values(state.forces).forEach(function(force){
      if(!force.alive || force.id === state.playerForceId){ return; }
      const cities = getForceCities(state, force.id);
      if(!cities.length){ force.alive = false; return; }
      const capital = cities.find(function(city){ return city.id === force.capitalCityId; }) || cities[0];
      const weakFrontier = weakestFrontierCity(state, force.id);
      const reserve = getReserveOfficers(state, force.id);
      const attackPlan = findAggressiveAttack(state, force.id);

      if(attackPlan && nextRandom(state) > 0.28){ scheduleAttack(state, force.id, attackPlan.fromCityId, attackPlan.targetCityId, true); return; }
      if(weakFrontier && weakFrontier.troops < 175 && force.gold >= 36 && force.food >= 42 && canRecruitCity(weakFrontier)){ performRecruit(state, force.id, weakFrontier.id, true); return; }
      if(reserve.length && weakFrontier){ performAppoint(state, force.id, weakFrontier.id, true); return; }
      if(force.food < 140 && capital && canTaxCity(capital)){ performTax(state, force.id, capital.id, true); return; }
      if(capital && nextRandom(state) > 0.4){ performDevelop(state, force.id, capital.id, true); return; }
      if(capital && canRecruitCity(capital) && force.gold >= 36 && force.food >= 42){ performRecruit(state, force.id, capital.id, true); return; }
      if(capital && canTaxCity(capital)){ performTax(state, force.id, capital.id, true); }
    });
  }
  function pickDefectForce(state, city){
    const candidates = city.neighbors.map(function(id){ return state.cities[id]; }).filter(Boolean).filter(function(neighbor){
      return neighbor.ownerForceId && neighbor.ownerForceId !== city.ownerForceId && state.forces[neighbor.ownerForceId] && state.forces[neighbor.ownerForceId].alive;
    }).sort(function(a,b){ return (b.troops + b.defense) - (a.troops + a.defense); });
    return candidates.length ? candidates[0].ownerForceId : null;
  }
  function eliminateForceIfNeeded(state, forceId){
    const cities = getForceCities(state, forceId);
    if(cities.length){ return; }
    const force = state.forces[forceId];
    if(force){ force.alive = false; }
    createLog(state, (force ? force.nameZh : '一方势力') + '失其最后一城，势力瓦解。', 'bad');
    if(forceId === state.playerForceId){
      state.gameOver = { win:false, title:TEXT.events.defeated.title, body:TEXT.events.defeated.body };
    }
  }
  function handleDefection(state, city, newOwnerId){
    const oldOwnerId = city.ownerForceId;
    city.ownerForceId = newOwnerId;
    city.troops = Math.max(70, Math.floor(city.troops * 0.55));
    city.order = 42;
    city.loyalty = 40;
    city.defense = clamp(city.defense - 8, 30, 100);
    city.taxBurden = clamp(city.taxBurden - 1, 0, 4);
    city.conscription = clamp(city.conscription - 1, 0, 4);
    const fallback = getForceCities(state, oldOwnerId)[0] || null;
    Object.values(state.officers).forEach(function(officer){
      if(officer.cityId !== city.id || officer.forceId !== oldOwnerId){ return; }
      if(officer.loyalty <= 55){
        officer.forceId = newOwnerId;
        officer.cityId = city.id;
        officer.assigned = false;
        officer.loyalty = clamp(officer.loyalty + 8, 40, 80);
      } else if(fallback){
        officer.cityId = fallback.id;
        officer.assigned = false;
        officer.loyalty = clamp(officer.loyalty - 10, 30, 100);
      } else {
        officer.forceId = null;
        officer.assigned = false;
        officer.loyalty = 40;
      }
    });
    createLog(state, city.nameZh+'民变四起，开门迎入'+getForceName(state, newOwnerId)+'，城池易手。', 'bad');
    eliminateForceIfNeeded(state, oldOwnerId);
  }
  function handleLocalRevolt(state, city){
    const oldTroops = city.troops;
    const loss = Math.max(45, Math.floor(city.troops * (0.18 + city.taxBurden * 0.05 + city.conscription * 0.06)));
    city.troops = Math.max(50, city.troops - loss);
    city.order = clamp(city.order - 16, 20, 100);
    city.loyalty = clamp(city.loyalty - 12, 18, 100);
    if(state.forces[city.ownerForceId]){ state.forces[city.ownerForceId].gold = clamp(state.forces[city.ownerForceId].gold - 24, 0, 9999); }
    createLog(state, city.nameZh+'民众作乱，守军折损'+(oldTroops - city.troops)+'，地方震动。', 'bad');
  }
  function triggerRebellions(state){
    Object.values(state.cities).forEach(function(city){
      if(!city.ownerForceId || state.gameOver){ return; }
      const rebellionPressure = (40 - city.loyalty) * 0.015 + (48 - city.order) * 0.012 + city.taxBurden * 0.06 + city.conscription * 0.07;
      if(city.loyalty > 42 && city.order > 48 && city.taxBurden < 2 && city.conscription < 2){ return; }
      if(nextRandom(state) > Math.max(0.08, rebellionPressure)){ return; }
      const defectForceId = (city.loyalty <= 34 || city.order <= 28) ? pickDefectForce(state, city) : null;
      if(defectForceId){ handleDefection(state, city, defectForceId); }
      else { handleLocalRevolt(state, city); }
      if(city.ownerForceId === state.playerForceId){ setFeedback(state, '地方叛乱', city.nameZh+'民心崩散，今月已爆发叛乱。', 'bad', city.id); }
    });
  }
  function evaluateVictory(state){
    if(state.gameOver){ return; }
    const playerCities = getForceCities(state, state.playerForceId);
    if(!playerCities.length){
      state.gameOver = { win:false, title:TEXT.events.defeated.title, body:TEXT.events.defeated.body };
      return;
    }
    const livingForces = Object.values(state.forces).filter(function(force){ return force.alive; });
    if(livingForces.length === 1 && livingForces[0].id === state.playerForceId){
      state.gameOver = { win:true, title:TEXT.events.unified.title, body:TEXT.events.unified.body };
      createLog(state, TEXT.events.unified.title+'：'+TEXT.events.unified.body, 'event');
    }
  }
  function makeAdvisorReport(state){
    const cities = getForceCities(state, state.playerForceId);
    const weak = cities.filter(function(city){ return city.loyalty < 55 || city.order < 55 || city.taxBurden >= 2 || city.conscription >= 2; }).sort(function(a,b){ return (a.loyalty + a.order) - (b.loyalty + b.order); });
    const front = cities.filter(function(city){ return city.neighbors.some(function(id){ const other = state.cities[id]; return other && other.ownerForceId && other.ownerForceId !== state.playerForceId; }); }).sort(function(a,b){ return a.troops - b.troops; });
    const lines = [];
    if(front.length){ lines.push(front[0].nameZh+'邻敌最近，宜留兵备战。'); }
    if(weak.length){ lines.push(weak[0].nameZh+'民情不稳，不宜再重税强征。'); }
    const idle = getReserveOfficers(state, state.playerForceId).length;
    if(idle){ lines.push('仍有'+idle+'名待任官员，可补入要地。'); }
    if(!lines.length){ lines.push('诸城暂稳，可择一线进取。'); }
    return { title:'军师月报', summary:'今月我军据'+cities.length+'城，外有'+Object.values(state.forces).filter(function(force){ return force.alive && force.id !== state.playerForceId; }).length+'家敌对势力。', lines:lines };
  }
  function buildWarEffects(state){
    const names = Object.values(state.cities).map(function(city){ return city.nameZh; });
    state.lastWarEffects = (state.logs || []).slice(0, 10).filter(function(entry){ return entry.tone === 'battle' || entry.text.indexOf('发兵') >= 0 || entry.text.indexOf('攻城') >= 0 || entry.text.indexOf('出兵') >= 0; }).map(function(entry){
      const hit = names.find(function(name){ return entry.text.indexOf(name) >= 0; });
      const city = hit ? Object.values(state.cities).find(function(item){ return item.nameZh === hit; }) : null;
      return { text:entry.text, cityId:city ? city.id : null, tone:'battle' };
    });
  }
  function normalizeSelectedCity(state){
    if(state.selectedCityId && state.cities[state.selectedCityId]){ return; }
    const playerCity = getForceCities(state, state.playerForceId)[0];
    state.selectedCityId = playerCity ? playerCity.id : Object.keys(state.cities)[0] || null;
  }
  function safeEndTurn(inputState){
    const state = clone(inputState);
    ensureCityMeta(state);
    state.pendingAttacks = state.pendingAttacks || [];
    runImprovedAiPhase(state);
    prev.resolveBattles(state);
    evaluateVictory(state);
    if(!state.gameOver){ prev.advanceMonth(state); }
    ensureCityMeta(state);
    triggerRebellions(state);
    applyMonthlyRecovery(state);
    evaluateVictory(state);
    normalizeSelectedCity(state);
    state.cityMonthFlags = flagsForCities(state.cities);
    state.monthFlags = { civilUsed:false, strategicUsed:false };
    state.advisorReport = makeAdvisorReport(state);
    if(!state.gameOver){ setFeedback(state, state.advisorReport.title, state.advisorReport.summary + ' ' + state.advisorReport.lines.join(' '), 'event', state.selectedCityId); }
    buildWarEffects(state);
    return state;
  }
  function getAvailableActions(inputState){
    const state = clone(inputState);
    ensureCityMeta(state);
    const actions = prev.getAvailableActions(state);
    const city = state.cities[state.selectedCityId];
    actions.forEach(function(action){
      if(action.id === 'tax' && city){
        if(!canTaxCity(city)){ action.enabled = false; action.reason = '人口、忠诚、治安或税负不允许继续征税。'; }
      }
      if(action.id === 'recruit' && city){
        if(!canRecruitCity(city)){ action.enabled = false; action.reason = '人口、忠诚、治安或兵役不允许继续征兵。'; }
      }
    });
    return actions;
  }
  function applyAction(inputState, action){
    if(action.type === 'endTurn'){
      return safeEndTurn(inputState);
    }
    const next = prev.applyAction(inputState, action);
    ensureCityMeta(next);
    return next;
  }

  window.FDTK.game = {
    createNewGame: function(forceId){ const state = prev.createNewGame(forceId); ensureCityMeta(state); return state; },
    getAvailableActions: getAvailableActions,
    applyAction: applyAction,
    safeEndTurn: safeEndTurn,
    runAiPhase: runImprovedAiPhase,
    resolveBattles: prev.resolveBattles,
    advanceMonth: prev.advanceMonth,
    getForceOverview: prev.getForceOverview,
    getCityView: prev.getCityView,
    getForceCities: prev.getForceCities,
    getForceOfficers: prev.getForceOfficers,
  };
})();





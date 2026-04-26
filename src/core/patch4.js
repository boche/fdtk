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
  const CIVIL_EFFECTS={
    治水营田:{develop:1,developOrder:3,developLoyalty:1,foodCut:5,growth:4},
    均输理财:{taxGold:26,taxPopRelief:18,taxOrderRelief:3,taxLoyaltyRelief:2},
    安民赈抚:{developOrder:2,developLoyalty:3,taxPopRelief:12,taxOrderRelief:2,taxLoyaltyRelief:3,recruitOrderRelief:2,recruitLoyaltyRelief:2,revoltRelief:.08,growth:2},
    幕府筹议:{hireBonus:.08,tactic:.03},
    简练军籍:{recruit:34,recruitOrderRelief:2,recruitLoyaltyRelief:1,training:3},
    转运筹措:{foodCut:8,recruitFoodCut:10,taxGold:8,marchFoodRelief:.08},
    法度整饬:{developOrder:3,taxOrderRelief:2,recruitOrderRelief:2,revoltRelief:.06}
  };
  function profile(o){ return o&&window.FDTK&&window.FDTK.getOfficerProfile ? window.FDTK.getOfficerProfile(o) : null; }
  function hydrate(o){ if(!o){return o;} const p=profile(o); if(p){ o.bio=p.bio||o.bio; o.civilSkill=p.civilSkill; o.civilSkillLabel=p.civilSkillLabel; o.civilSkillDesc=p.civilSkillDesc; o.militarySkill=p.militarySkill; o.militarySkillLabel=p.militarySkillLabel; o.militarySkillDesc=p.militarySkillDesc; o.specialSkill=p.militarySkill; o.skillSummary=p.skillSummary; } if(!o.civilSkill){ o.civilSkill=o.politics>=82?'均输理财':o.intellect>=78?'幕府筹议':o.leadership>=72?'简练军籍':'安民赈抚'; } if(!o.civilSkillLabel){o.civilSkillLabel=o.civilSkill;} if(!o.specialSkill){ o.specialSkill=o.leadership>=85?'治军':o.might>=80?'突击':o.intellect>=82?'火计':o.politics>=84?'统筹':'坚守'; } return o; }
  function effect(o){ hydrate(o); return o&&CIVIL_EFFECTS[o.civilSkill] ? CIVIL_EFFECTS[o.civilSkill] : {}; }
  function bestCivil(state, cityId, forceId, mode){ const list=getCityOfficers(state, cityId, forceId); if(!list.length){return null;} return list.slice().sort(function(a,b){ hydrate(a); hydrate(b); const ea=effect(a), eb=effect(b); const da=((mode==='develop'||mode==='tax'||mode==='recover')&&a.duty==='govern')||(mode==='hire'&&a.duty==='hire')?10:0; const db=((mode==='develop'||mode==='tax'||mode==='recover')&&b.duty==='govern')||(mode==='hire'&&b.duty==='hire')?10:0; return (b.politics||0)+db+(eb[mode]||0)*8-((a.politics||0)+da+(ea[mode]||0)*8); })[0]; }
  function bestRecruit(state, cityId, forceId){ const list=getCityOfficers(state, cityId, forceId); if(!list.length){return null;} return list.slice().sort(function(a,b){ hydrate(a); hydrate(b); const ea=effect(a), eb=effect(b); const ba=(a.duty==='recruit'?12:0)+(a.civilSkill==='简练军籍'?8:0)+(a.specialSkill==='治军'?6:0)+(ea.training||0); const bb=(b.duty==='recruit'?12:0)+(b.civilSkill==='简练军籍'?8:0)+(b.specialSkill==='治军'?6:0)+(eb.training||0); return (b.leadership||0)+bb-((a.leadership||0)+ba); })[0]; }
  function bestBattle(list, mode){ if(!list.length){return null;} return list.slice().sort(function(a,b){ hydrate(a); hydrate(b); const ba=(mode==='defense'&&a.duty==='defend'?14:0)+(mode==='attack'&&a.duty==='recruit'?8:0)+(mode==='defense'&&a.specialSkill==='坚守'?8:0)+(a.specialSkill==='治军'?5:0)+(a.specialSkill==='突击'&&mode==='attack'?6:0); const bb=(mode==='defense'&&b.duty==='defend'?14:0)+(mode==='attack'&&b.duty==='recruit'?8:0)+(mode==='defense'&&b.specialSkill==='坚守'?8:0)+(b.specialSkill==='治军'?5:0)+(b.specialSkill==='突击'&&mode==='attack'?6:0); return (b.leadership||0)+bb-((a.leadership||0)+ba); })[0]; }
  function civilPhrase(o){ hydrate(o); return o ? '，'+o.nameZh+'以【'+(o.civilSkillLabel||o.civilSkill)+'】主事' : ''; }
  function militaryPhrase(o){ hydrate(o); return o ? '，'+o.nameZh+'领【'+(o.militarySkillLabel||o.specialSkill||'坚守')+'】军' : ''; }
  function getForceName(state, forceId){ return state.forces[forceId] ? state.forces[forceId].nameZh : '无主'; }
  function isNeighbor(state, fromCityId, targetCityId){ const from = state.cities[fromCityId]; return !!(from && from.neighbors.indexOf(targetCityId) >= 0); }
  function setFeedback(state, title, body, tone, cityId){ state.lastFeedback = { title:title, body:body, tone:tone||'normal', cityId:cityId||null, tick:((state.lastFeedback&&state.lastFeedback.tick)||0)+1 }; }
  function ensureCityMeta(state){
    Object.values(state.cities||{}).forEach(function(city){
      if(typeof city.population !== 'number'){ city.population = 900 + city.development * 140 + city.order * 3; }
      if(typeof city.taxBurden !== 'number'){ city.taxBurden = 0; }
      if(typeof city.conscription !== 'number'){ city.conscription = 0; }
      if(typeof city.commerce !== 'number'){ city.commerce = Math.max(1, city.development || 1); }
      if(typeof city.farming !== 'number'){ city.farming = Math.max(1, city.development || 1); }
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
      const adviser = city.ownerForceId ? bestCivil(state, city.id, city.ownerForceId, 'recover') : null;
      const e = effect(adviser);
      const growth = Math.max(1, Math.floor(city.development * 3 + city.loyalty / 22 + city.order / 35 - city.taxBurden * 7 - city.conscription * 9 + (e.growth || 0)));
      city.population = clamp((city.population||0) + growth, 120, 9999);
    });
  }
  function performDevelop(state, forceId, cityId, isAi){
    const city = state.cities[cityId], force = state.forces[forceId];
    const adviser = bestCivil(state, cityId, forceId, 'develop');
    const e = effect(adviser);
    const goldCost = Math.max(20, 28 - (e.costCut || 0));
    const foodCost = Math.max(10, 18 - (e.foodCut || 0));
    if(!city || !force || city.ownerForceId !== forceId || force.gold < goldCost || force.food < foodCost){ return false; }
    force.gold -= goldCost; force.food -= foodCost;
    city.development = clamp(city.development + 1 + (e.develop || 0), 1, 6);
    city.order = clamp(city.order + 5 + (e.developOrder || 0), 35, 100);
    city.loyalty = clamp(city.loyalty + 3 + (e.developLoyalty || 0), 30, 100);
    city.population = clamp((city.population||0) + 6 + (e.growth || 0) + Math.floor((adviser ? adviser.politics : 50) / 25), 120, 9999);
    createLog(state, getForceName(state, forceId)+'在'+city.nameZh+'整修仓场与街市，开发略有提升'+civilPhrase(adviser)+'。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performDevelopSpecial(state, forceId, cityId, mode, isAi){
    const city = state.cities[cityId], force = state.forces[forceId];
    const adviser = bestCivil(state, cityId, forceId, 'develop');
    const e = effect(adviser);
    const goldCost = mode === 'commerce' ? Math.max(22, 30 - (e.costCut || 0)) : Math.max(18, 24 - (e.costCut || 0));
    const foodCost = mode === 'commerce' ? Math.max(8, 14 - (e.foodCut || 0)) : Math.max(16, 26 - (e.foodCut || 0));
    if(!city || !force || city.ownerForceId !== forceId || force.gold < goldCost || force.food < foodCost){ return false; }
    force.gold -= goldCost;
    force.food -= foodCost;
    if(mode === 'commerce'){
      city.commerce = clamp((city.commerce||city.development||1) + 1 + (e.develop || 0), 1, 10);
      city.development = clamp(Math.max(city.development||1, Math.ceil(((city.commerce||1)+(city.farming||1))/2)), 1, 10);
      city.loyalty = clamp(city.loyalty + 1 + (e.developLoyalty || 0), 30, 100);
      createLog(state, getForceName(state, forceId)+'在'+city.nameZh+'疏通商路，市肆渐盛'+civilPhrase(adviser)+'。', isAi ? 'ai' : 'normal');
    } else {
      city.farming = clamp((city.farming||city.development||1) + 1 + (e.develop || 0), 1, 10);
      city.development = clamp(Math.max(city.development||1, Math.ceil(((city.commerce||1)+(city.farming||1))/2)), 1, 10);
      city.population = clamp((city.population||0) + 14 + (e.growth || 0) + Math.floor((adviser ? adviser.politics : 50) / 20), 120, 9999);
      city.order = clamp(city.order + 3 + (e.developOrder || 0), 35, 100);
      createLog(state, getForceName(state, forceId)+'在'+city.nameZh+'修渠垦田，农桑渐复'+civilPhrase(adviser)+'。', isAi ? 'ai' : 'normal');
    }
    return true;
  }
  function performTax(state, forceId, cityId, isAi){
    const city = state.cities[cityId], force = state.forces[forceId];
    const adviser = bestCivil(state, cityId, forceId, 'tax');
    const e = effect(adviser);
    if(!city || !force || city.ownerForceId !== forceId || !canTaxCity(city)){ return false; }
    const gain = 52 + city.development * 8 + (e.taxGold || 0) + Math.floor((adviser ? adviser.politics : 50) / 10);
    const popLoss = Math.max(8, 30 + city.taxBurden * 18 - Math.floor((adviser ? adviser.politics : 50) / 14) - (e.taxPopRelief || 0));
    force.gold = clamp(force.gold + gain, 0, 9999);
    city.population = clamp(city.population - popLoss, 120, 9999);
    city.taxBurden = clamp(city.taxBurden + 1, 0, 4);
    city.order = clamp(city.order - Math.max(2, 7 - (e.taxOrderRelief || 0)), 25, 100);
    city.loyalty = clamp(city.loyalty - Math.max(2, 5 - (e.taxLoyaltyRelief || 0)), 22, 100);
    createLog(state, getForceName(state, forceId)+'在'+city.nameZh+'加征钱粮，得金'+gain+'，人口外流'+popLoss+civilPhrase(adviser)+'。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performRecruit(state, forceId, cityId, isAi){
    const city = state.cities[cityId], force = state.forces[forceId];
    const leadOfficer = bestRecruit(state, cityId, forceId) || best(getCityOfficers(state, cityId, forceId), 'leadership');
    const e = effect(leadOfficer);
    const foodCost = Math.max(30, 42 - (e.recruitFoodCut || 0));
    if(!city || !force || city.ownerForceId !== forceId || force.gold < 36 || force.food < foodCost || !canRecruitCity(city)){ return false; }
    const drafted = 64 + city.development * 10 + Math.floor((leadOfficer ? leadOfficer.leadership : 50) / 5) + city.conscription * 8 + (leadOfficer && leadOfficer.civilSkill === '简练军籍' ? (e.recruit || 0) : 0) + (leadOfficer && leadOfficer.specialSkill === '治军' ? 18 : 0);
    const gain = Math.min(drafted, Math.max(0, city.population - 120));
    force.gold -= 36; force.food -= foodCost;
    city.troops += gain;
    city.population = clamp(city.population - gain, 120, 9999);
    city.conscription = clamp(city.conscription + 1, 0, 4);
    city.training = clamp((city.training||65) + 3 + (e.training||0), 35, 100);
    city.morale = clamp((city.morale||65) + 2 + (leadOfficer&&leadOfficer.specialSkill==='治军'?2:0), 35, 100);
    city.order = clamp(city.order - Math.max(2, 5 - (e.recruitOrderRelief || 0)), 25, 100);
    city.loyalty = clamp(city.loyalty - Math.max(1, 4 - (e.recruitLoyaltyRelief || 0)), 22, 100);
    createLog(state, getForceName(state, forceId)+'在'+city.nameZh+'整伍征兵，人口转为兵籍'+gain+militaryPhrase(leadOfficer)+'。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performTrain(state, forceId, cityId, isAi){
    const city = state.cities[cityId], force = state.forces[forceId];
    const leadOfficer = bestRecruit(state, cityId, forceId) || best(getCityOfficers(state, cityId, forceId), 'leadership');
    const e = effect(leadOfficer);
    const goldCost = 24;
    const foodCost = 24;
    if(!city || !force || city.ownerForceId !== forceId || force.gold < goldCost || force.food < foodCost){ return false; }
    if((city.training||65) >= 100 && (city.morale||65) >= 100){ return false; }
    const trainingGain = 5 + Math.floor((leadOfficer ? leadOfficer.leadership : 55) / 24) + (e.training || 0) + (leadOfficer && leadOfficer.specialSkill === '治军' ? 2 : 0);
    const moraleGain = 3 + (leadOfficer && leadOfficer.specialSkill === '治军' ? 2 : 0);
    force.gold -= goldCost;
    force.food -= foodCost;
    city.training = clamp((city.training||65) + trainingGain, 35, 100);
    city.morale = clamp((city.morale||65) + moraleGain, 35, 100);
    city.order = clamp(city.order + 1, 25, 100);
    createLog(state, getForceName(state, forceId)+'在'+city.nameZh+'操练军伍，训练度提升'+trainingGain+militaryPhrase(leadOfficer)+'。', isAi ? 'ai' : 'normal');
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
    const underAttack = (state.pendingAttacks||[]).some(function(item){ return item.targetCityId === fromCityId; });
    if(underAttack){ return false; }
    const reciprocal = (state.pendingAttacks||[]).some(function(item){ return item.fromCityId === targetCityId && item.targetCityId === fromCityId; });
    if(reciprocal){ return false; }
    const commander = hydrate(bestBattle(getCityOfficers(state, fromCityId, forceId), 'attack') || bestBattle(getForceOfficers(state, forceId), 'attack'));
    const committed = Math.max(80, Math.floor(fromCity.troops * 0.6));
    fromCity.troops -= committed;
    state.pendingAttacks.push({ attackerForceId:forceId, fromCityId:fromCityId, targetCityId:targetCityId, commanderId:commander ? commander.id : null, troops:committed, unitType:commander&&commander.unitType?commander.unitType:'infantry', specialSkill:commander&&commander.specialSkill?commander.specialSkill:'坚守', originMorale:fromCity.morale||65, originTraining:fromCity.training||65 });
    createLog(state, getForceName(state, forceId)+'自'+fromCity.nameZh+'发兵攻向'+targetCity.nameZh+militaryPhrase(commander)+'。', isAi ? 'ai' : 'normal');
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
      if(weakFrontier && (weakFrontier.training||65) < 72 && force.gold >= 24 && force.food >= 24){ performTrain(state, force.id, weakFrontier.id, true); return; }
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
      const steward = bestCivil(state, city.id, city.ownerForceId, 'recover');
      const stewardEffect = effect(steward);
      const rebellionPressure = Math.max(0.01, (40 - city.loyalty) * 0.015 + (48 - city.order) * 0.012 + city.taxBurden * 0.06 + city.conscription * 0.07 - (stewardEffect.revoltRelief || 0));
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
  function isPlayerRelatedBattleLog(entry, filterContext){
    if(!entry || !entry.text){ return false; }
    const text = entry.text;
    if(filterContext.playerForceName && text.indexOf(filterContext.playerForceName) >= 0){
      return true;
    }
    return (filterContext.playerCityNames || []).some(function(cityName){
      return text.indexOf(cityName) >= 0;
    });
  }

  function buildWarEffects(state, filterContext){
    const names = Object.values(state.cities).map(function(city){ return city.nameZh; });
    state.lastWarEffects = (state.logs || []).slice(0, 10).filter(function(entry){ return (entry.tone === 'battle' || entry.text.indexOf('发兵') >= 0 || entry.text.indexOf('攻城') >= 0 || entry.text.indexOf('出兵') >= 0) && isPlayerRelatedBattleLog(entry, filterContext); }).map(function(entry){
      const hit = names.find(function(name){ return entry.text.indexOf(name) >= 0; });
      const city = hit ? Object.values(state.cities).find(function(item){ return item.nameZh === hit; }) : null;
      return { text:entry.text, cityId:city ? city.id : null, tone:'battle' };
    });
  }

  function buildBattleReplay(state, filterContext){
    const battleLogs = (state.logs || []).filter(function(entry){ return entry.text.indexOf('【战斗演武】') >= 0 && isPlayerRelatedBattleLog(entry, filterContext); }).slice(0, 6).reverse();
    if(!battleLogs.length){
      state.battleReplay = null;
      return;
    }
    state.battleReplay = {
      visible: true,
      index: 0,
      items: battleLogs.map(function(entry, idx){ return { id: 'replay-'+idx, text: entry.text, time: entry.time }; })
    };
  }

  function normalizeSelectedCity(state){
    if(state.selectedCityId && state.cities[state.selectedCityId]){ return; }
    const playerCity = getForceCities(state, state.playerForceId)[0];
    state.selectedCityId = playerCity ? playerCity.id : Object.keys(state.cities)[0] || null;
  }
  function safeEndTurn(inputState){
    const state = clone(inputState);
    const playerForce = state.forces[state.playerForceId] || null;
    const filterContext = {
      playerForceName: playerForce ? playerForce.nameZh : '',
      playerCityNames: getForceCities(state, state.playerForceId).map(function(city){ return city.nameZh; })
    };
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
    buildWarEffects(state, filterContext);
    buildBattleReplay(state, filterContext);
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
    if(city){
      const flags = state.cityMonthFlags && state.cityMonthFlags[city.id] ? state.cityMonthFlags[city.id] : state.monthFlags || {strategicUsed:false};
      const ownCity = city.ownerForceId === state.playerForceId;
      const force = state.forces[state.playerForceId] || {};
      actions.splice(3, 0, {
        id:'train',
        label:(TEXT.actions&&TEXT.actions.train)||'训练',
        enabled:!!(ownCity && !flags.strategicUsed && force.gold >= 24 && force.food >= 24 && ((city.training||65) < 100 || (city.morale||65) < 100)),
        reason:'',
        options:[]
      });
      const flagsCivil = state.cityMonthFlags && state.cityMonthFlags[city.id] ? state.cityMonthFlags[city.id] : state.monthFlags || {civilUsed:false};
      const canDevelop = !!(ownCity && !flagsCivil.civilUsed && force.gold >= 24 && force.food >= 14);
      actions.push({id:'developCommerce', label:'商业开发', enabled:canDevelop && force.gold >= 30, reason:'', options:[]});
      actions.push({id:'developFarm', label:'农田开发', enabled:canDevelop && force.food >= 26, reason:'', options:[]});
    }
    return actions;
  }
  function applyAction(inputState, action){
    if(action.type === 'developCommerce' || action.type === 'developFarm'){
      const nextState = clone(inputState);
      ensureCityMeta(nextState);
      const city = nextState.cities[nextState.selectedCityId];
      const flags = city && nextState.cityMonthFlags ? (nextState.cityMonthFlags[city.id] || {civilUsed:false, strategicUsed:false}) : (nextState.monthFlags || {civilUsed:false, strategicUsed:false});
      const mode = action.type === 'developCommerce' ? 'commerce' : 'farm';
      if(city && city.ownerForceId === nextState.playerForceId && !flags.civilUsed && performDevelopSpecial(nextState, nextState.playerForceId, city.id, mode, false)){
        flags.civilUsed = true;
        if(nextState.cityMonthFlags){ nextState.cityMonthFlags[city.id] = flags; }
        nextState.monthFlags = flags;
        setFeedback(nextState, mode === 'commerce' ? '商业开发完成' : '农田开发完成', city.nameZh+(mode === 'commerce' ? '商旅渐集，金收入根基提高。' : '水利田亩整修，人口恢复与粮产根基提高。'), 'normal', city.id);
      }
      return nextState;
    }
    if(action.type === 'train'){
      const nextState = clone(inputState);
      ensureCityMeta(nextState);
      const city = nextState.cities[nextState.selectedCityId];
      const flags = city && nextState.cityMonthFlags ? (nextState.cityMonthFlags[city.id] || {civilUsed:false, strategicUsed:false}) : (nextState.monthFlags || {civilUsed:false, strategicUsed:false});
      if(city && city.ownerForceId === nextState.playerForceId && !flags.strategicUsed && performTrain(nextState, nextState.playerForceId, city.id, false)){
        flags.strategicUsed = true;
        if(nextState.cityMonthFlags){ nextState.cityMonthFlags[city.id] = flags; }
        nextState.monthFlags = flags;
        setFeedback(nextState, '训练完成', city.nameZh+'军伍整肃，训练度与士气有所提升。', 'normal', city.id);
      }
      return nextState;
    }
    if(action.type === 'endTurn'){
      return safeEndTurn(inputState);
    }
    if(action.type === 'battleReplayNext' || action.type === 'battleReplayClose'){
      const nextState = clone(inputState);
      if(!nextState.battleReplay){ return nextState; }
      if(action.type === 'battleReplayClose'){
        nextState.battleReplay.visible = false;
        return nextState;
      }
      const total = nextState.battleReplay.items ? nextState.battleReplay.items.length : 0;
      if(!total){ nextState.battleReplay.visible = false; return nextState; }
      if(nextState.battleReplay.index >= total - 1){
        nextState.battleReplay.visible = false;
      } else {
        nextState.battleReplay.index += 1;
      }
      return nextState;
    }
    const next = prev.applyAction(inputState, action);
    ensureCityMeta(next);
    return next;
  }

  window.FDTK.game = {
    createNewGame: function(forceId){ const state = prev.createNewGame(forceId); ensureCityMeta(state); Object.values(state.officers||{}).forEach(hydrate); return state; },
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




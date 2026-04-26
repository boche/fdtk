(function () {
  const scenario = window.FDTK.SCENARIO;
  const TEXT = window.FDTK.TEXT;
  const formatters = window.FDTK.formatters;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mapById(items) {
    const result = {};
    items.forEach(function (item) {
      result[item.id] = item;
    });
    return result;
  }

  function createLog(state, text, tone) {
    state.logs.unshift({
      id: 'log-' + state.year + '-' + state.month + '-' + (state.logs.length + 1),
      time: formatters.monthLabel(state.year, state.month),
      text,
      tone: tone || 'normal',
    });
    state.logs = state.logs.slice(0, 40);
  }

  function nextRandom(state) {
    state.rngSeed = (state.rngSeed * 48271) % 2147483647;
    return state.rngSeed / 2147483647;
  }

  function rollInRange(state, min, max) {
    return min + (max - min) * nextRandom(state);
  }

  function getForceCities(state, forceId) {
    return Object.values(state.cities).filter(function (city) {
      return city.ownerForceId === forceId;
    });
  }

  function getForceOfficers(state, forceId) {
    return Object.values(state.officers).filter(function (officer) {
      return officer.forceId === forceId;
    });
  }

  function getCityOfficers(state, cityId, forceId) {
    return Object.values(state.officers).filter(function (officer) {
      const sameCity = officer.cityId === cityId;
      const sameForce = forceId ? officer.forceId === forceId : !!officer.forceId;
      return sameCity && sameForce;
    });
  }

  function getReserveOfficers(state, forceId) {
    return getForceOfficers(state, forceId).filter(function (officer) {
      return !officer.assigned;
    });
  }

  function getFreeOfficersInCity(state, cityId) {
    return Object.values(state.officers).filter(function (officer) {
      return !officer.forceId && officer.cityId === cityId;
    });
  }

  function getBestOfficer(list, stat) {
    if (!list.length) {
      return null;
    }

    return list.slice().sort(function (left, right) {
      return right[stat] - left[stat];
    })[0];
  }

  function isNeighbor(state, fromCityId, targetCityId) {
    const fromCity = state.cities[fromCityId];
    return !!(fromCity && fromCity.neighbors.indexOf(targetCityId) >= 0);
  }

  function getForceName(state, forceId) {
    return state.forces[forceId] ? state.forces[forceId].nameZh : '无主';
  }

  function getCapitalCity(state, forceId) {
    const force = state.forces[forceId];
    if (!force) {
      return null;
    }

    if (state.cities[force.capitalCityId] && state.cities[force.capitalCityId].ownerForceId === forceId) {
      return state.cities[force.capitalCityId];
    }

    const fallback = getForceCities(state, forceId)[0] || null;
    if (fallback) {
      force.capitalCityId = fallback.id;
    }
    return fallback;
  }

  function changeCitySpirit(city, orderDelta, loyaltyDelta) {
    city.order = clamp(city.order + orderDelta, 35, 100);
    city.loyalty = clamp(city.loyalty + loyaltyDelta, 30, 100);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const UNIT_ADVANTAGE = {
    infantry: { infantry: 1, cavalry: 0.88, archer: 1.12 },
    cavalry: { infantry: 1.12, cavalry: 1, archer: 0.9 },
    archer: { infantry: 0.92, cavalry: 1.12, archer: 1 },
  };

  const TERRAIN_ADJUST = {
    plain: { infantry: 1, cavalry: 1.08, archer: 1 },
    mountain: { infantry: 1.08, cavalry: 0.82, archer: 1.06 },
    water: { infantry: 0.9, cavalry: 0.75, archer: 1.14 },
  };

  const SKILL_EFFECTS = {
    突击: { attack: 0.1, defense: 0 },
    火计: { attack: 0.08, defense: 0 },
    治军: { attack: 0.05, defense: 0.05 },
    坚守: { attack: 0, defense: 0.1 },
    统筹: { attack: 0.04, defense: 0.04 },
  };
  const CIVIL_SKILL_EFFECTS = {
    治水营田: { develop: 1, developOrder: 3, developLoyalty: 1, foodCut: 5, growth: 4 },
    均输理财: { taxGold: 26, taxPopRelief: 18, taxOrderRelief: 3, taxLoyaltyRelief: 2 },
    安民赈抚: { developOrder: 2, developLoyalty: 3, taxPopRelief: 12, taxOrderRelief: 2, taxLoyaltyRelief: 3, recruitOrderRelief: 2, recruitLoyaltyRelief: 2, hireBonus: 0.05, revoltRelief: 0.08, growth: 2 },
    幕府筹议: { hireBonus: 0.08, developOrder: 1, tactic: 0.03 },
    简练军籍: { recruit: 34, recruitOrderRelief: 2, recruitLoyaltyRelief: 1, training: 3 },
    转运筹措: { foodCut: 8, recruitFoodCut: 10, taxGold: 8, marchFoodRelief: 0.08 },
    法度整饬: { developOrder: 3, taxOrderRelief: 2, recruitOrderRelief: 2, hireBonus: 0.03, revoltRelief: 0.06 },
  };

  function getOfficerProfileData(officer) {
    if (!officer || !window.FDTK || typeof window.FDTK.getOfficerProfile !== 'function') {
      return null;
    }
    return window.FDTK.getOfficerProfile(officer);
  }

  function defaultCivilSkill(officer) {
    if ((officer.politics || 0) >= 84) return '均输理财';
    if ((officer.intellect || 0) >= 80) return '幕府筹议';
    if ((officer.leadership || 0) >= 74) return '简练军籍';
    return '安民赈抚';
  }

  function defaultMilitarySkill(officer) {
    if ((officer.leadership || 0) >= 85) return '治军';
    if ((officer.might || 0) >= 80) return '突击';
    if ((officer.intellect || 0) >= 82) return '火计';
    if ((officer.politics || 0) >= 84) return '统筹';
    return '坚守';
  }

  function hydrateOfficerSkills(officer) {
    if (!officer) return officer;
    const profile = getOfficerProfileData(officer);
    if (profile) {
      officer.bio = profile.bio || officer.bio;
      officer.civilSkill = profile.civilSkill || officer.civilSkill;
      officer.civilSkillLabel = profile.civilSkillLabel || officer.civilSkill;
      officer.civilSkillDesc = profile.civilSkillDesc || officer.civilSkillDesc;
      officer.militarySkill = profile.militarySkill || officer.militarySkill || officer.specialSkill;
      officer.militarySkillLabel = profile.militarySkillLabel || officer.militarySkill;
      officer.militarySkillDesc = profile.militarySkillDesc || officer.militarySkillDesc;
      officer.skillSummary = profile.skillSummary || officer.skillSummary;
      officer.portraitUrl = profile.portraitUrl || officer.portraitUrl;
      if (profile.militarySkill) {
        officer.specialSkill = profile.militarySkill;
      }
    }
    if (window.FDTK && typeof window.FDTK.getOfficerPortrait === 'function') {
      officer.portraitUrl = window.FDTK.getOfficerPortrait(officer);
    }
    if (!officer.civilSkill) officer.civilSkill = defaultCivilSkill(officer);
    if (!officer.civilSkillLabel) officer.civilSkillLabel = officer.civilSkill;
    if (!officer.militarySkill) officer.militarySkill = officer.specialSkill || defaultMilitarySkill(officer);
    if (!officer.militarySkillLabel) officer.militarySkillLabel = officer.militarySkill;
    officer.specialSkill = officer.militarySkill;
    if (!officer.skillSummary) {
      officer.skillSummary = '内政：' + officer.civilSkillLabel + '，军事：' + officer.militarySkillLabel + '。';
    }
    return officer;
  }

  function getCivilEffect(officer) {
    hydrateOfficerSkills(officer);
    return officer && CIVIL_SKILL_EFFECTS[officer.civilSkill] ? CIVIL_SKILL_EFFECTS[officer.civilSkill] : {};
  }

  function getBestCivilOfficer(state, cityId, forceId, actionKey) {
    const officers = getCityOfficers(state, cityId, forceId);
    if (!officers.length) return null;
    return officers.slice().sort(function (left, right) {
      hydrateOfficerSkills(left);
      hydrateOfficerSkills(right);
      const leftEffect = getCivilEffect(left);
      const rightEffect = getCivilEffect(right);
      const leftDuty = ((actionKey === 'hire' && left.duty === 'hire') || ((actionKey === 'develop' || actionKey === 'tax') && left.duty === 'govern')) ? 10 : 0;
      const rightDuty = ((actionKey === 'hire' && right.duty === 'hire') || ((actionKey === 'develop' || actionKey === 'tax') && right.duty === 'govern')) ? 10 : 0;
      const leftBonus = leftDuty + (leftEffect[actionKey] || 0) * 8 + (leftEffect[actionKey + 'Bonus'] || 0) * 100;
      const rightBonus = rightDuty + (rightEffect[actionKey] || 0) * 8 + (rightEffect[actionKey + 'Bonus'] || 0) * 100;
      return (right.politics || 0) + rightBonus - ((left.politics || 0) + leftBonus);
    })[0];
  }

  function getBestRecruitOfficer(state, cityId, forceId) {
    const officers = getCityOfficers(state, cityId, forceId);
    if (!officers.length) return null;
    return officers.slice().sort(function (left, right) {
      hydrateOfficerSkills(left);
      hydrateOfficerSkills(right);
      const leftEffect = getCivilEffect(left);
      const rightEffect = getCivilEffect(right);
      const leftBonus = (left.duty === 'recruit' ? 12 : 0) + (left.civilSkill === '简练军籍' ? 8 : 0) + (left.specialSkill === '治军' ? 6 : 0) + (leftEffect.training || 0);
      const rightBonus = (right.duty === 'recruit' ? 12 : 0) + (right.civilSkill === '简练军籍' ? 8 : 0) + (right.specialSkill === '治军' ? 6 : 0) + (rightEffect.training || 0);
      return (right.leadership || 0) + rightBonus - ((left.leadership || 0) + leftBonus);
    })[0];
  }

  function getBestBattleOfficer(list, mode) {
    if (!list.length) return null;
    return list.slice().sort(function (left, right) {
      hydrateOfficerSkills(left);
      hydrateOfficerSkills(right);
      const leftBonus = (mode === 'defense' && left.duty === 'defend' ? 14 : 0) + (mode === 'attack' && left.duty === 'recruit' ? 8 : 0) + (mode === 'defense' && left.specialSkill === '坚守' ? 8 : 0) + (left.specialSkill === '治军' ? 5 : 0) + (left.specialSkill === '突击' && mode === 'attack' ? 6 : 0);
      const rightBonus = (mode === 'defense' && right.duty === 'defend' ? 14 : 0) + (mode === 'attack' && right.duty === 'recruit' ? 8 : 0) + (mode === 'defense' && right.specialSkill === '坚守' ? 8 : 0) + (right.specialSkill === '治军' ? 5 : 0) + (right.specialSkill === '突击' && mode === 'attack' ? 6 : 0);
      return (right.leadership || 0) + rightBonus - ((left.leadership || 0) + leftBonus);
    })[0];
  }  function civilSkillPhrase(officer) {
    hydrateOfficerSkills(officer);
    return officer ? '，由' + officer.nameZh + '以【' + (officer.civilSkillLabel || officer.civilSkill) + '】辅政' : '';
  }

  function militarySkillPhrase(officer) {
    hydrateOfficerSkills(officer);
    return officer ? '，' + officer.nameZh + '领【' + (officer.militarySkillLabel || officer.specialSkill || '坚守') + '】军' : '';
  }

  function consumeTruces(state) {
    Object.values(state.forces).forEach(function (force) {
      Object.keys(force.truces).forEach(function (otherForceId) {
        force.truces[otherForceId] -= 1;
        if (force.truces[otherForceId] <= 0) {
          delete force.truces[otherForceId];
        }
      });
    });
  }

  function applyMonthlyIncome(state) {
    Object.values(state.forces).forEach(function (force) {
      if (!force.alive) {
        return;
      }

      const cities = getForceCities(state, force.id);
      if (!cities.length) {
        force.alive = false;
        return;
      }

      let goldIncome = 0;
      let foodIncome = 0;
      let upkeep = 0;

      cities.forEach(function (city) {
        goldIncome += city.development * 16 + Math.floor(city.order / 7);
        foodIncome += city.development * 18 + Math.floor(city.loyalty / 6);
        upkeep += Math.floor(city.troops / 40);
        city.order = clamp(city.order + 2, 35, 100);
        city.loyalty = clamp(city.loyalty + 1, 30, 100);
        city.defense = clamp(city.defense + 1, 30, 100);
        city.training = clamp((city.training || 65) - 1, 35, 100);
        city.morale = clamp((city.morale || 65) - 1, 35, 100);
      });

      force.gold = clamp(force.gold + goldIncome - Math.max(8, cities.length * 5), 0, 9999);
      force.food = clamp(force.food + foodIncome - upkeep, 0, 9999);
    });
  }

  function moveToNextMonth(state) {
    state.month += 1;
    if (state.month > 12) {
      state.month = 1;
      state.year += 1;
    }
    state.monthFlags = { civilUsed: false, strategicUsed: false };
    consumeTruces(state);
    applyMonthlyIncome(state);
    triggerEvents(state);
  }

  function getEventKey(event, state) {
    return event.yearly ? event.id + ':' + state.year : event.id;
  }

  function triggerEvents(state) {
    scenario.events.forEach(function (event) {
      const key = getEventKey(event, state);
      const matchedYear = !event.year || event.year === state.year;
      const matchedMonth = event.month === state.month;
      if (!matchedYear || !matchedMonth || state.triggeredEvents[key]) {
        return;
      }
      state.triggeredEvents[key] = true;
      applyEventEffect(state, event.id);
    });
  }

  function applyEventEffect(state, eventId) {
    const eventText = TEXT.events[eventId];
    if (!eventText) {
      return;
    }

    if (eventId === 'founding_houtang' && state.forces.houtang && state.forces.houtang.alive) {
      state.forces.houtang.gold += 60;
      state.forces.houtang.food += 80;
      getForceCities(state, 'houtang').forEach(function (city) {
        changeCitySpirit(city, 3, 3);
      });
    }

    if (eventId === 'north_muster') {
      ['kaifeng', 'luoyang', 'taiyuan', 'weizhou', 'youzhou'].forEach(function (cityId) {
        if (state.cities[cityId]) {
          state.cities[cityId].troops += 35;
        }
      });
    }

    if (eventId === 'spring_harvest') {
      ['yangzhou', 'hangzhou', 'fuzhou', 'chengdu'].forEach(function (cityId) {
        const city = state.cities[cityId];
        if (city && state.forces[city.ownerForceId]) {
          state.forces[city.ownerForceId].food += 45;
          changeCitySpirit(city, 3, 2);
        }
      });
    }

    if (eventId === 'min_trade') {
      const city = state.cities.fuzhou;
      if (city && city.ownerForceId && state.forces[city.ownerForceId]) {
        state.forces[city.ownerForceId].gold += 55;
        changeCitySpirit(city, 2, 3);
      }
    }

    if (eventId === 'sea_trade') {
      ['hangzhou', 'guangzhou'].forEach(function (cityId) {
        const city = state.cities[cityId];
        if (city && state.forces[city.ownerForceId]) {
          state.forces[city.ownerForceId].gold += 50;
        }
      });
    }

    if (eventId === 'summer_heat') {
      Object.values(state.cities).forEach(function (city) {
        changeCitySpirit(city, -4, -1);
      });
    }

    if (eventId === 'scholar_arrives') {
      const capitals = Object.values(state.forces)
        .filter(function (force) { return force.alive; })
        .map(function (force) { return getCapitalCity(state, force.id); })
        .filter(Boolean);
      if (capitals.length) {
        const freeOfficer = Object.values(state.officers).find(function (officer) {
          return !officer.forceId;
        });
        const city = capitals[Math.floor(nextRandom(state) * capitals.length)];
        if (freeOfficer && city) {
          freeOfficer.cityId = city.id;
        }
      }
    }

    if (eventId === 'autumn_horses') {
      ['taiyuan', 'weizhou', 'youzhou'].forEach(function (cityId) {
        if (state.cities[cityId]) {
          state.cities[cityId].troops += 40;
        }
      });
    }

    if (eventId === 'tax_resistance') {
      const richestForce = Object.values(state.forces)
        .filter(function (force) { return force.alive; })
        .sort(function (left, right) { return right.gold - left.gold; })[0];
      if (richestForce) {
        const capital = getCapitalCity(state, richestForce.id);
        if (capital) {
          changeCitySpirit(capital, -6, -5);
        }
      }
    }

    if (eventId === 'winter_storage') {
      Object.values(state.forces).forEach(function (force) {
        if (force.alive) {
          force.food += 70;
        }
      });
    }

    if (eventId === 'new_year_amnesty') {
      Object.values(state.cities).forEach(function (city) {
        changeCitySpirit(city, 2, 4);
      });
    }

    createLog(state, eventText.title + '：' + eventText.body, 'event');
  }

  function createNewGame(forceId) {
    const initialState = {
      year: scenario.startYear,
      month: scenario.startMonth,
      playerForceId: forceId,
      forces: mapById(clone(scenario.forces)),
      cities: mapById(clone(scenario.cities)),
      officers: mapById(clone(scenario.officers)),
      armies: [],
      pendingAttacks: [],
      logs: [],
      rngSeed: 923123,
      gameOver: null,
      triggeredEvents: {},
      monthFlags: { civilUsed: false, strategicUsed: false },
      selectedCityId: scenario.forces.find(function (force) { return force.id === forceId; }).capitalCityId,
    };

    ensureBattleFields(initialState);
    createLog(initialState, '你以' + getForceName(initialState, forceId) + '之主的身份入局，乱世自此开卷。', 'event');
    triggerEvents(initialState);
    return initialState;
  }

  function canUseCivil(state) {
    return !state.monthFlags.civilUsed;
  }

  function canUseStrategic(state) {
    return !state.monthFlags.strategicUsed;
  }

  function hasPlayerSelectedOwnCity(state) {
    const city = state.cities[state.selectedCityId];
    return !!(city && city.ownerForceId === state.playerForceId);
  }

  function createAction(id, enabled, reason, options) {
    return { id, label: TEXT.actions[id], enabled, reason: reason || '', options: options || [] };
  }

  function getAvailableActions(state) {
    const city = state.cities[state.selectedCityId];
    if (!city) {
      return [];
    }

    const ownCity = city.ownerForceId === state.playerForceId;
    const force = state.forces[state.playerForceId];
    const reserves = getReserveOfficers(state, state.playerForceId);
    const freeOfficers = getFreeOfficersInCity(state, city.id);
    const attackTargets = city.neighbors
      .map(function (neighborId) { return state.cities[neighborId]; })
      .filter(Boolean)
      .filter(function (targetCity) {
        return ownCity && targetCity.ownerForceId !== state.playerForceId && !force.truces[targetCity.ownerForceId];
      })
      .map(function (targetCity) {
        return { cityId: targetCity.id, label: targetCity.nameZh + '（' + getForceName(state, targetCity.ownerForceId) + '）' };
      });

    const truceTargets = city.neighbors
      .map(function (neighborId) { return state.cities[neighborId]; })
      .filter(Boolean)
      .filter(function (targetCity) {
        return ownCity && targetCity.ownerForceId && targetCity.ownerForceId !== state.playerForceId;
      })
      .map(function (targetCity) {
        return {
          forceId: targetCity.ownerForceId,
          cityId: targetCity.id,
          label: getForceName(state, targetCity.ownerForceId) + '（经' + targetCity.nameZh + '）',
        };
      })
      .filter(function (item, index, list) {
        return list.findIndex(function (entry) { return entry.forceId === item.forceId; }) === index;
      });

    return [
      createAction('develop', ownCity && canUseCivil(state) && force.gold >= 28 && force.food >= 18),
      createAction('tax', ownCity && canUseCivil(state)),
      createAction('recruit', ownCity && canUseStrategic(state) && force.gold >= 36 && force.food >= 42),
      createAction('appoint', ownCity && canUseStrategic(state) && reserves.length > 0),
      createAction('hire', ownCity && canUseStrategic(state) && freeOfficers.length > 0),
      createAction('attack', ownCity && canUseStrategic(state) && attackTargets.length > 0 && city.troops >= 120, '', attackTargets),
      createAction('truce', ownCity && canUseStrategic(state) && truceTargets.length > 0 && force.gold >= 50, '', truceTargets),
    ];
  }

  function performDevelop(state, forceId, cityId, isAi) {
    const city = state.cities[cityId];
    const force = state.forces[forceId];
    const adviser = getBestCivilOfficer(state, cityId, forceId, 'develop');
    const effect = getCivilEffect(adviser);
    const goldCost = Math.max(20, 28 - (effect.costCut || 0));
    const foodCost = Math.max(10, 18 - (effect.foodCut || 0));
    if (!city || !force || city.ownerForceId !== forceId || force.gold < goldCost || force.food < foodCost) {
      return false;
    }
    force.gold -= goldCost;
    force.food -= foodCost;
    city.development = clamp(city.development + 1 + (effect.develop || 0), 1, 6);
    changeCitySpirit(city, 6 + (effect.developOrder || 0), 4 + (effect.developLoyalty || 0));
    if (typeof city.population === 'number') {
      city.population = clamp(city.population + 6 + (effect.growth || 0) + Math.floor((adviser ? adviser.politics : 50) / 25), 120, 9999);
    }
    createLog(state, getForceName(state, forceId) + '在' + city.nameZh + '整修官仓与街市，开发略有进展' + civilSkillPhrase(adviser) + '。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performTax(state, forceId, cityId, isAi) {
    const city = state.cities[cityId];
    const force = state.forces[forceId];
    const adviser = getBestCivilOfficer(state, cityId, forceId, 'tax');
    const effect = getCivilEffect(adviser);
    if (!city || !force || city.ownerForceId !== forceId) {
      return false;
    }
    const gain = 52 + city.development * 8 + (effect.taxGold || 0) + Math.floor((adviser ? adviser.politics : 50) / 10);
    force.gold += gain;
    const orderLoss = Math.max(3, 8 - (effect.taxOrderRelief || 0));
    const loyaltyLoss = Math.max(2, 5 - (effect.taxLoyaltyRelief || 0));
    changeCitySpirit(city, -orderLoss, -loyaltyLoss);
    createLog(state, getForceName(state, forceId) + '在' + city.nameZh + '加征钱粮，府库得金' + gain + civilSkillPhrase(adviser) + '。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performRecruit(state, forceId, cityId, isAi) {
    const city = state.cities[cityId];
    const force = state.forces[forceId];
    const leadOfficer = getBestRecruitOfficer(state, cityId, forceId);
    const effect = getCivilEffect(leadOfficer);
    const goldCost = 36;
    const foodCost = Math.max(30, 42 - (effect.recruitFoodCut || 0));
    if (!city || !force || city.ownerForceId !== forceId || force.gold < goldCost || force.food < foodCost) {
      return false;
    }
    const skillRecruit = leadOfficer && leadOfficer.civilSkill === '简练军籍' ? (effect.recruit || 0) : 0;
    const militaryRecruit = leadOfficer && leadOfficer.specialSkill === '治军' ? 18 : 0;
    const gain = 70 + city.development * 12 + Math.floor((leadOfficer ? leadOfficer.leadership : 50) / 4) + skillRecruit + militaryRecruit;
    force.gold -= goldCost;
    force.food -= foodCost;
    city.troops += gain;
    city.training = clamp(city.training + 4 + (effect.training || 0) + Math.floor((leadOfficer ? leadOfficer.leadership : 55) / 18), 40, 100);
    city.morale = clamp(city.morale + 3 + (leadOfficer && leadOfficer.specialSkill === '治军' ? 2 : 0), 35, 100);
    changeCitySpirit(city, -Math.max(2, 4 - (effect.recruitOrderRelief || 0)), -Math.max(1, 2 - (effect.recruitLoyaltyRelief || 0)));
    createLog(state, getForceName(state, forceId) + '在' + city.nameZh + '整伍征兵，新增兵力' + gain + militarySkillPhrase(leadOfficer) + '，训练度与士气同步提升。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performAppoint(state, forceId, cityId, isAi) {
    const city = state.cities[cityId];
    const reserve = getBestOfficer(getReserveOfficers(state, forceId), 'politics');
    if (!city || city.ownerForceId !== forceId || !reserve) {
      return false;
    }
    reserve.assigned = true;
    reserve.cityId = cityId;
    reserve.loyalty = clamp(reserve.loyalty + 6, 30, 100);
    changeCitySpirit(city, 2, 2);
    createLog(state, getForceName(state, forceId) + '任命' + reserve.nameZh + '赴' + city.nameZh + '理事。', isAi ? 'ai' : 'normal');
    return true;
  }

  function performHire(state, forceId, cityId, isAi) {
    const city = state.cities[cityId];
    const candidates = getFreeOfficersInCity(state, cityId);
    const adviser = getBestCivilOfficer(state, cityId, forceId, 'hire');
    const effect = getCivilEffect(adviser);
    if (!city || city.ownerForceId !== forceId || !candidates.length) {
      return false;
    }
    const target = candidates.sort(function (left, right) {
      return right.politics - left.politics;
    })[0];
    hydrateOfficerSkills(target);
    const chance = 0.35 + city.loyalty / 250 + (adviser ? adviser.politics : 55) / 220 + (effect.hireBonus || 0);
    if (nextRandom(state) <= Math.min(chance, 0.95)) {
      target.forceId = forceId;
      target.assigned = false;
      target.loyalty = 62;
      createLog(state, target.nameZh + '愿归于' + getForceName(state, forceId) + '帐下，暂驻' + city.nameZh + '候命' + civilSkillPhrase(adviser) + '。', isAi ? 'ai' : 'normal');
      return true;
    }
    createLog(state, target.nameZh + '暂未决意，' + getForceName(state, forceId) + '此次招揽未果' + civilSkillPhrase(adviser) + '。', isAi ? 'ai' : 'normal');
    return true;
  }
  function scheduleAttack(state, forceId, fromCityId, targetCityId, isAi, sourceAction) {
    const fromCity = state.cities[fromCityId];
    const targetCity = state.cities[targetCityId];
    const force = state.forces[forceId];
    if (!fromCity || !targetCity || fromCity.ownerForceId !== forceId || !isNeighbor(state, fromCityId, targetCityId)) {
      return false;
    }
    if (force.truces[targetCity.ownerForceId] || fromCity.troops < 120) {
      return false;
    }

    const commander = hydrateOfficerSkills(getBestBattleOfficer(getCityOfficers(state, fromCityId, forceId), 'attack') || getBestBattleOfficer(getForceOfficers(state, forceId), 'attack'));
    const requestedCommitted = sourceAction && sourceAction.tacticalCommittedTroops ? Math.floor(sourceAction.tacticalCommittedTroops) : 0;
    const committed = clamp(requestedCommitted || Math.max(80, Math.floor(fromCity.troops * 0.6)), 1, fromCity.troops);
    fromCity.troops -= committed;
    state.pendingAttacks.push({
      attackerForceId: forceId,
      fromCityId,
      targetCityId,
      commanderId: commander ? commander.id : null,
      troops: committed,
      unitType: commander && commander.unitType ? commander.unitType : 'infantry',
      specialSkill: commander && commander.specialSkill ? commander.specialSkill : '坚守',
      originMorale: fromCity.morale || 65,
      originTraining: fromCity.training || 65,
      tacticalResult: sourceAction ? sourceAction.tacticalResult : null,
      tacticalCommittedTroops: sourceAction ? sourceAction.tacticalCommittedTroops : null,
      tacticalAttackerSurvivors: sourceAction ? sourceAction.tacticalAttackerSurvivors : null,
      tacticalDefenderSurvivors: sourceAction ? sourceAction.tacticalDefenderSurvivors : null,
      tacticalAttackerLoss: sourceAction ? sourceAction.tacticalAttackerLoss : null,
      tacticalDefenderLoss: sourceAction ? sourceAction.tacticalDefenderLoss : null,
    });
    createLog(state, getForceName(state, forceId) + '自' + fromCity.nameZh + '发兵攻向' + targetCity.nameZh + militarySkillPhrase(commander) + '。', isAi ? 'ai' : 'normal');
    return true;
  }
  function performTruce(state, forceId, targetForceId, isAi) {
    const force = state.forces[forceId];
    const targetForce = state.forces[targetForceId];
    if (!force || !targetForce || !force.alive || !targetForce.alive || force.gold < 50) {
      return false;
    }
    force.gold -= 50;
    force.truces[targetForceId] = 3;
    targetForce.truces[forceId] = 3;
    createLog(state, getForceName(state, forceId) + '与' + getForceName(state, targetForceId) + '议定三月停战。', isAi ? 'ai' : 'normal');
    return true;
  }

  function getUnitType(officer) {
    return officer && officer.unitType ? officer.unitType : 'infantry';
  }

  function getSkillEffect(officer, mode) {
    hydrateOfficerSkills(officer);
    if (!officer || !officer.specialSkill || !SKILL_EFFECTS[officer.specialSkill]) {
      return 1;
    }
    return 1 + (SKILL_EFFECTS[officer.specialSkill][mode] || 0);
  }

  function getTerrainFactor(city, unitType) {
    const terrain = city && city.terrain ? city.terrain : 'plain';
    const table = TERRAIN_ADJUST[terrain] || TERRAIN_ADJUST.plain;
    return table[unitType] || 1;
  }

  function getUnitCounterFactor(attackerType, defenderType) {
    return UNIT_ADVANTAGE[attackerType] && UNIT_ADVANTAGE[attackerType][defenderType]
      ? UNIT_ADVANTAGE[attackerType][defenderType]
      : 1;
  }

  function rerouteOfficersAfterCapture(state, loserForceId, cityId, winnerForceId) {
    const remainingCities = getForceCities(state, loserForceId);
    const fallbackCity = remainingCities[0] || null;
    Object.values(state.officers).forEach(function (officer) {
      if (officer.forceId !== loserForceId || officer.cityId !== cityId) {
        return;
      }
      if (fallbackCity) {
        officer.cityId = fallbackCity.id;
        officer.assigned = false;
      } else {
        officer.forceId = null;
        officer.assigned = false;
      }
      officer.loyalty = clamp(officer.loyalty - 12, 30, 100);
    });

    if (!remainingCities.length) {
      const loser = state.forces[loserForceId];
      loser.alive = false;
      createLog(state, loser.nameZh + '失其最后一城，国祚遂绝。', 'bad');
      if (loserForceId === state.playerForceId) {
        state.gameOver = { win: false, title: TEXT.events.defeated.title, body: TEXT.events.defeated.body };
      }
    }

    const winner = state.forces[winnerForceId];
    if (winner && !winner.capitalCityId) {
      winner.capitalCityId = cityId;
    }
  }

  function resolveBattles(state) {
    const battles = state.pendingAttacks.slice();
    state.pendingAttacks = [];

    battles.forEach(function (battle) {
      const fromCity = state.cities[battle.fromCityId];
      const targetCity = state.cities[battle.targetCityId];
      if (!fromCity || !targetCity || !state.forces[battle.attackerForceId] || !state.forces[targetCity.ownerForceId]) {
        return;
      }
      if (!state.forces[battle.attackerForceId].alive || !state.forces[targetCity.ownerForceId].alive) {
        return;
      }

      const commander = battle.commanderId ? hydrateOfficerSkills(state.officers[battle.commanderId]) : null;
      const defenderOfficer = getBestBattleOfficer(getCityOfficers(state, targetCity.id, targetCity.ownerForceId), 'defense');
      const attackerType = battle.unitType || getUnitType(commander);
      const defenderType = getUnitType(defenderOfficer);
      const foodEnough = state.forces[battle.attackerForceId].food >= Math.floor(battle.troops / 3);
      const moraleFactorAtk = 0.8 + clamp((battle.originMorale || 65) / 100, 0.35, 1);
      const moraleFactorDef = 0.8 + clamp((targetCity.morale || 65) / 100, 0.35, 1);
      const trainingFactorAtk = 0.82 + clamp((battle.originTraining || 65) / 120, 0.3, 1);
      const trainingFactorDef = 0.82 + clamp((targetCity.training || 65) / 120, 0.3, 1);
      const counterAtk = getUnitCounterFactor(attackerType, defenderType);
      const counterDef = getUnitCounterFactor(defenderType, attackerType);
      const terrainAtk = getTerrainFactor(targetCity, attackerType);
      const terrainDef = getTerrainFactor(targetCity, defenderType);
      const skillAtk = getSkillEffect(commander, 'attack');
      const skillDef = getSkillEffect(defenderOfficer, 'defense');

      const attackerScore = battle.troops * (0.72 + (commander ? commander.leadership : 60) / 120 + (commander ? commander.might : 55) / 240) * (foodEnough ? 1 : 0.78) * moraleFactorAtk * trainingFactorAtk * counterAtk * terrainAtk * skillAtk * rollInRange(state, 0.9, 1.08);
      const defenderScore = targetCity.troops * (0.74 + (defenderOfficer ? defenderOfficer.leadership : 55) / 120 + targetCity.defense / 150) * moraleFactorDef * trainingFactorDef * counterDef * terrainDef * skillDef * rollInRange(state, 0.92, 1.1);

      if (foodEnough) {
        state.forces[battle.attackerForceId].food = clamp(state.forces[battle.attackerForceId].food - Math.floor(battle.troops / 3), 0, 9999);
      }

      createLog(
        state,
        '【战斗演武】' + (commander ? commander.nameZh : '无名将') + '率' + battle.troops + '人（' + unitTypeLabel(attackerType) + '）进攻' + targetCity.nameZh + '（' + terrainLabel(targetCity.terrain || 'plain') + '），守将兵种' + unitTypeLabel(defenderType) + '，士气/训练 ' + (battle.originMorale || 65) + '/' + (battle.originTraining || 65) + ' 对 ' + (targetCity.morale || 65) + '/' + (targetCity.training || 65) + '。',
        'battle'
      );

      const tacticalWin = battle.tacticalResult === 'win';
      const tacticalLose = battle.tacticalResult === 'lose';
      const attackerWon = tacticalWin || (!tacticalLose && attackerScore > defenderScore);
      const hasTacticalNumbers = typeof battle.tacticalAttackerSurvivors === 'number' && typeof battle.tacticalDefenderSurvivors === 'number';
      const tacticalCommitted = Math.max(0, Math.floor(battle.tacticalCommittedTroops || battle.troops));

      if (attackerWon) {
        const attackerLoss = hasTacticalNumbers ? Math.max(0, tacticalCommitted - Math.max(0, battle.tacticalAttackerSurvivors)) : Math.floor(battle.troops * rollInRange(state, 0.32, 0.5));
        const attackerSurvivors = hasTacticalNumbers ? Math.max(0, battle.tacticalAttackerSurvivors) : Math.max(0, battle.troops - attackerLoss);
        const oldOwner = targetCity.ownerForceId;
        targetCity.ownerForceId = battle.attackerForceId;
        targetCity.troops = Math.max(1, attackerSurvivors);
        targetCity.training = clamp((battle.originTraining || 65) - 8, 35, 100);
        targetCity.morale = clamp((battle.originMorale || 65) + 6, 35, 100);
        changeCitySpirit(targetCity, -10, -12);
        targetCity.defense = clamp(targetCity.defense - 9, 30, 100);
        if (commander) {
          commander.cityId = targetCity.id;
          commander.assigned = true;
        }
        createLog(state, formatters.battleLog(getForceName(state, battle.attackerForceId), targetCity.nameZh, '攻城得手，守军溃散，城池易主。攻方损失' + attackerLoss + '，入城残兵' + targetCity.troops + '。'), 'battle');
        rerouteOfficersAfterCapture(state, oldOwner, targetCity.id, battle.attackerForceId);
        if (state.gameOver) {
          return;
        }
        state.cities[battle.fromCityId].troops = clamp(state.cities[battle.fromCityId].troops, 40, 9999);
        fromCity.morale = clamp((fromCity.morale || 65) + 2, 35, 100);
      } else {
        const attackerLoss = hasTacticalNumbers ? Math.max(0, tacticalCommitted - Math.max(0, battle.tacticalAttackerSurvivors)) : Math.floor(battle.troops * rollInRange(state, 0.5, 0.7));
        const defenderLoss = hasTacticalNumbers ? Math.max(0, targetCity.troops - Math.max(0, battle.tacticalDefenderSurvivors)) : Math.floor(targetCity.troops * rollInRange(state, 0.22, 0.4));
        const survivors = hasTacticalNumbers ? Math.max(0, battle.tacticalAttackerSurvivors) : Math.max(0, battle.troops - attackerLoss);
        targetCity.troops = hasTacticalNumbers ? Math.max(0, battle.tacticalDefenderSurvivors) : Math.max(50, targetCity.troops - defenderLoss);
        state.cities[battle.fromCityId].troops += survivors;
        targetCity.morale = clamp((targetCity.morale || 65) - 2, 35, 100);
        fromCity.morale = clamp((fromCity.morale || 65) - 5, 35, 100);
        createLog(state, formatters.battleLog(getForceName(state, battle.attackerForceId), targetCity.nameZh, '攻城受挫，军势退回原镇。攻方损失' + attackerLoss + '，守方损失' + defenderLoss + '。'), 'battle');
      }
    });

    return state;
  }

  function evaluateVictory(state) {
    const livingForces = Object.values(state.forces).filter(function (force) {
      return force.alive;
    });
    if (state.gameOver) {
      return state;
    }
    if (!getForceCities(state, state.playerForceId).length) {
      state.gameOver = { win: false, title: TEXT.events.defeated.title, body: TEXT.events.defeated.body };
      return state;
    }
    if (livingForces.length === 1 && livingForces[0].id === state.playerForceId) {
      state.gameOver = { win: true, title: TEXT.events.unified.title, body: TEXT.events.unified.body };
      createLog(state, TEXT.events.unified.title + '：' + TEXT.events.unified.body, 'event');
    }
    return state;
  }

  function weakestFrontierCity(state, forceId) {
    const frontiers = getForceCities(state, forceId).filter(function (city) {
      return city.neighbors.some(function (neighborId) {
        return state.cities[neighborId].ownerForceId !== forceId;
      });
    });
    if (!frontiers.length) {
      return null;
    }
    return frontiers.sort(function (left, right) {
      return left.troops - right.troops;
    })[0];
  }

  function findAiAttack(state, forceId) {
    const cities = getForceCities(state, forceId);
    let best = null;
    cities.forEach(function (city) {
      city.neighbors.forEach(function (neighborId) {
        const targetCity = state.cities[neighborId];
        if (!targetCity || targetCity.ownerForceId === forceId) {
          return;
        }
        if (state.forces[forceId].truces[targetCity.ownerForceId]) {
          return;
        }
        const score = city.troops - targetCity.troops - targetCity.defense;
        if (city.troops >= 150 && score > 20 && (!best || score > best.score)) {
          best = { fromCityId: city.id, targetCityId: targetCity.id, score: score };
        }
      });
    });
    return best;
  }

  function runAiPhase(state) {
    Object.values(state.forces).forEach(function (force) {
      if (!force.alive || force.id === state.playerForceId) {
        return;
      }
      const cities = getForceCities(state, force.id);
      if (!cities.length) {
        force.alive = false;
        return;
      }
      const capital = getCapitalCity(state, force.id);
      const weakFrontier = weakestFrontierCity(state, force.id);
      const reserve = getReserveOfficers(state, force.id);
      const attackPlan = findAiAttack(state, force.id);

      if (force.food < 120 && capital) {
        performTax(state, force.id, capital.id, true);
        return;
      }
      if (weakFrontier && weakFrontier.troops < 170 && force.gold >= 36 && force.food >= 42) {
        performRecruit(state, force.id, weakFrontier.id, true);
        return;
      }
      if (reserve.length) {
        performAppoint(state, force.id, (weakFrontier || capital).id, true);
        return;
      }
      if (attackPlan) {
        scheduleAttack(state, force.id, attackPlan.fromCityId, attackPlan.targetCityId, true);
        return;
      }
      if (capital && nextRandom(state) > 0.45) {
        performDevelop(state, force.id, capital.id, true);
      } else if (capital) {
        performTax(state, force.id, capital.id, true);
      }
    });

    return state;
  }

  function ensureBattleFields(state) {
    Object.values(state.cities).forEach(function (city) {
      if (!city.terrain) city.terrain = 'plain';
      if (!city.training) city.training = 65;
      if (!city.morale) city.morale = 65;
    });
    Object.values(state.officers).forEach(function (officer) {
      if (!officer.unitType) {
        officer.unitType = officer.might >= 75 ? 'cavalry' : officer.intellect >= 78 ? 'archer' : 'infantry';
      }
      hydrateOfficerSkills(officer);
    });
  }
  function applyAction(state, action) {
    const nextState = clone(state);
    ensureBattleFields(nextState);
    const selectedCity = nextState.cities[nextState.selectedCityId];

    if (action.type === 'selectCity') {
      nextState.selectedCityId = action.cityId;
      return nextState;
    }

    if (action.type === 'develop' && hasPlayerSelectedOwnCity(nextState) && canUseCivil(nextState)) {
      if (performDevelop(nextState, nextState.playerForceId, selectedCity.id, false)) {
        nextState.monthFlags.civilUsed = true;
      }
      return nextState;
    }

    if (action.type === 'tax' && hasPlayerSelectedOwnCity(nextState) && canUseCivil(nextState)) {
      if (performTax(nextState, nextState.playerForceId, selectedCity.id, false)) {
        nextState.monthFlags.civilUsed = true;
      }
      return nextState;
    }

    if (action.type === 'recruit' && hasPlayerSelectedOwnCity(nextState) && canUseStrategic(nextState)) {
      if (performRecruit(nextState, nextState.playerForceId, selectedCity.id, false)) {
        nextState.monthFlags.strategicUsed = true;
      }
      return nextState;
    }

    if (action.type === 'appoint' && hasPlayerSelectedOwnCity(nextState) && canUseStrategic(nextState)) {
      if (performAppoint(nextState, nextState.playerForceId, selectedCity.id, false)) {
        nextState.monthFlags.strategicUsed = true;
      }
      return nextState;
    }

    if (action.type === 'hire' && hasPlayerSelectedOwnCity(nextState) && canUseStrategic(nextState)) {
      if (performHire(nextState, nextState.playerForceId, selectedCity.id, false)) {
        nextState.monthFlags.strategicUsed = true;
      }
      return nextState;
    }

    if (action.type === 'attack' && hasPlayerSelectedOwnCity(nextState) && canUseStrategic(nextState)) {
      if (scheduleAttack(nextState, nextState.playerForceId, selectedCity.id, action.targetCityId, false, action)) {
        nextState.monthFlags.strategicUsed = true;
      }
      return nextState;
    }

    if (action.type === 'truce' && hasPlayerSelectedOwnCity(nextState) && canUseStrategic(nextState)) {
      if (performTruce(nextState, nextState.playerForceId, action.targetForceId, false)) {
        nextState.monthFlags.strategicUsed = true;
      }
      return nextState;
    }

    if (action.type === 'endTurn') {
      runAiPhase(nextState);
      resolveBattles(nextState);
      evaluateVictory(nextState);
      if (!nextState.gameOver) {
        moveToNextMonth(nextState);
        evaluateVictory(nextState);
      }
      return nextState;
    }

    return nextState;
  }


  function unitTypeLabel(unitType) {
    if (unitType === 'cavalry') return '骑兵';
    if (unitType === 'archer') return '弓兵';
    return '步兵';
  }

  function terrainLabel(terrain) {
    if (terrain === 'mountain') return '山地';
    if (terrain === 'water') return '水域';
    return '平原';
  }

  function getForceOverview(state, forceId) {
    const force = state.forces[forceId];
    const cities = getForceCities(state, forceId);
    const officers = getForceOfficers(state, forceId);
    return {
      force: force,
      cities: cities,
      officers: officers,
      troops: cities.reduce(function (sum, city) { return sum + city.troops; }, 0),
    };
  }

  function getCityView(state, cityId) {
    const city = state.cities[cityId];
    const officers = getCityOfficers(state, cityId).map(function (officer) {
      hydrateOfficerSkills(officer);
      return Object.assign({}, officer, { unitTypeLabel: unitTypeLabel(officer.unitType) });
    });
    const wanderers = getFreeOfficersInCity(state, cityId).map(function (officer) {
      hydrateOfficerSkills(officer);
      return Object.assign({}, officer, { unitTypeLabel: unitTypeLabel(officer.unitType) });
    });
    const cityWithLabel = Object.assign({}, city, {
      terrain: city.terrain || 'plain',
      training: city.training || 65,
      morale: city.morale || 65,
      terrainLabel: terrainLabel(city.terrain || 'plain'),
    });
    return {
      city: cityWithLabel,
      officers: officers,
      wanderers: wanderers,
      frontierPressure: city.neighbors.reduce(function (sum, neighborId) {
        const neighbor = state.cities[neighborId];
        if (!neighbor || neighbor.ownerForceId === city.ownerForceId) {
          return sum;
        }
        return sum + Math.max(0, neighbor.troops - city.troops);
      }, 0),
    };
  }

  window.FDTK = window.FDTK || {};
  window.FDTK.game = {
    createNewGame,
    getAvailableActions,
    applyAction,
    runAiPhase,
    resolveBattles,
    advanceMonth: moveToNextMonth,
    getForceOverview,
    getCityView,
    getForceCities,
    getForceOfficers,
  };
})();


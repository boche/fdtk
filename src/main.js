(function () {
  const root = document.getElementById('app');
  const gameApi = window.FDTK.game;
  const storageApi = window.FDTK.storage;
  const ui = window.FDTK.ui;
  const audio = window.FDTK.audio;

  const appState = {
    screen: 'title',
    game: null,
    notice: '',
    noticeTone: 'normal',
    audioEnabled: audio ? audio.isEnabled() : false,
    isFullscreen: !!document.fullscreenElement,
    currentPanel: 'civil',
    pendingBattleAction: null,
    battlePreview: null,
    tacticalBattle: null,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setNotice(msg, tone) {
    appState.notice = msg;
    appState.noticeTone = tone || 'normal';
  }

  function syncFullscreen() {
    appState.isFullscreen = !!document.fullscreenElement;
  }

  function safeEnsureAudio() {
    if (!audio || !audio.ensureContext) return;
    try { audio.ensureContext(); } catch (error) { console.warn('audio init failed', error); }
  }

  function safePlay(kind) {
    if (!audio || !audio.play) return;
    try { audio.play(kind); } catch (error) { console.warn('audio play failed', error); }
  }

  function playFeedback() {
    if (!appState.game || !appState.game.lastFeedback) return;
    const tone = appState.game.lastFeedback.tone;
    if (tone === 'battle') return safePlay('battle');
    if (tone === 'event') return safePlay('event');
    if (tone === 'bad') return safePlay('bad');
    safePlay('action');
  }

  function getAllUnits(tb) {
    return tb.attackerUnits.concat(tb.defenderUnits);
  }
  function getUnitById(tb, id) {
    return getAllUnits(tb).filter(function (u) { return u.id === id; })[0] || null;
  }
  function getUnitAt(tb, x, y) {
    return getAllUnits(tb).filter(function (u) { return u.hp > 0 && u.x === x && u.y === y; })[0] || null;
  }
  function getCityOfficerIds(game, cityId, forceId) {
    const city = game && game.cities ? game.cities[cityId] : null;
    const ids = [];
    if (city && city.officers) {
      city.officers.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    }
    Object.values((game && game.officers) || {}).forEach(function (officer) {
      if (officer && officer.cityId === cityId && (!forceId || officer.forceId === forceId) && ids.indexOf(officer.id) < 0) ids.push(officer.id);
    });
    return ids;
  }
  function dist(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function movementByType(type) {
    return 1;
  }

  function moveAllowance(unit, targetCell) {
    if (!unit || !targetCell) return 1;
    if (unit.unitType === 'cavalry' && targetCell.terrain === 'plain') return 2;
    return 1;
  }

  function rangeByType(type) {
    return type === 'archer' ? 2 : 1;
  }

  function unitTypeLabel(type) {
    if (type === 'cavalry') return '骑兵';
    if (type === 'archer') return '弓兵';
    return '步兵';
  }

  function unitIcon(type) {
    if (type === 'cavalry') return 'assets/units/cavalry.webp';
    if (type === 'archer') return 'assets/units/archer.webp';
    return 'assets/units/infantry.webp';
  }

  function terrainLabel(terrain) {
    if (terrain === 'mountain') return '山地';
    if (terrain === 'forest') return '林地';
    if (terrain === 'courtyard') return '城内';
    if (terrain === 'gate-open') return '破门';
    if (terrain === 'gate') return '城门';
    if (terrain === 'wall') return '城墙';
    return '平原';
  }

  function terrainIcon(terrain) {
    if (terrain === 'mountain') return '⛰';
    if (terrain === 'forest') return '🌲';
    if (terrain === 'courtyard') return '城';
    if (terrain === 'gate-open') return '门';
    if (terrain === 'gate') return '🚪';
    if (terrain === 'wall') return '🧱';
    return '🌾';
  }

  function terrainEffectText(terrain) {
    if (terrain === 'mountain') return '山地：步弓防御提升，骑兵攻防下降。';
    if (terrain === 'forest') return '林地：弓兵攻防提升，近战攻击略降。';
    if (terrain === 'courtyard') return '城内：守军活动区域，已越过城门后可进入。';
    if (terrain === 'gate-open') return '破门：城门已开，攻守双方均可通过。';
    if (terrain === 'gate') return '城门：关闭时不可通过，可被攻击破坏。';
    if (terrain === 'wall') return '城墙：城池边界，不可进入，也不可直接攻击。';
    return '平原：骑兵可移动两格，适合突击展开。';
  }

  function terrainAsset(cellOrTerrain) {
    const terrain = typeof cellOrTerrain === 'string' ? cellOrTerrain : cellOrTerrain.terrain;
    const wallVariant = typeof cellOrTerrain === 'string' ? '' : (cellOrTerrain.wallVariant || '');
    if (terrain === 'mountain') return 'assets/terrain/mountain.webp';
    if (terrain === 'forest') return 'assets/terrain/forest.webp';
    if (terrain === 'gate') return 'assets/terrain/gate.webp';
    if (terrain === 'gate-open') return 'assets/terrain/gate-open.webp';
    if (terrain === 'wall') return wallVariant === 'left' || wallVariant === 'right' ? 'assets/terrain/wall-segment-v.webp' : 'assets/terrain/wall-segment-h.webp';
    if (terrain === 'courtyard') return 'assets/terrain/plain.webp';
    return 'assets/terrain/plain.webp';
  }

  function officerPortrait(officer) {
    if (!officer) return 'assets/portraits/portrait-100.webp';
    if (window.FDTK && typeof window.FDTK.getOfficerPortrait === 'function') return window.FDTK.getOfficerPortrait(officer);
    return officer.portraitUrl || 'assets/portraits/portrait-100.webp';
  }

  function avatarGlyph(name) {
    if (!name) return '将';
    return String(name).slice(-1);
  }

  function syncUnitHpByTroops(unit) {
    if (!unit) return;
    const base = Math.max(1, unit.maxTroops || unit.troops || 1);
    unit.hp = clamp(Math.round(unit.troops / base * 100), 0, 100);
  }

  function createTerrain(cols, rows) {
    const grid = [];
    const wallLeft = Math.max(1, cols - 5);
    const wallRight = cols - 1;
    const wallTop = 1;
    const wallBottom = rows - 2;
    const gateY = Math.floor((wallTop + wallBottom) / 2);
    for (let y = 0; y < rows; y += 1) {
      const row = [];
      for (let x = 0; x < cols; x += 1) {
        let terrain = 'plain';
        if ((x === 3 || x === 4) && (y === 2 || y === 3)) terrain = 'forest';
        row.push({ terrain: terrain, gateHp: 0, wallVariant: '' });
      }
      grid.push(row);
    }
    for (let y = wallTop; y <= wallBottom; y += 1) {
      for (let x = wallLeft; x <= wallRight; x += 1) {
        grid[y][x].terrain = 'courtyard';
        grid[y][x].gateHp = 0;
        if (x === wallLeft || x === wallRight || y === wallTop || y === wallBottom) {
          grid[y][x].terrain = 'wall';
          grid[y][x].wallVariant = (x === wallLeft || x === wallRight) && y !== wallTop && y !== wallBottom ? (x === wallLeft ? 'left' : 'right') : 'top';
        }
      }
    }
    grid[gateY][wallLeft].terrain = 'gate';
    grid[gateY][wallLeft].gateHp = 180;
    return grid;
  }

  function createUnit(officer, side, idx, fromTroops, toTroops, unitCount, morale, training, cols) {
    const type = officer.unitType || 'infantry';
    const share = Math.max(1, unitCount || 3);
    const troops = Math.max(1, Math.floor((side === 'attacker' ? fromTroops : toTroops) / share));
    return {
      id: side + '-' + idx,
      officerId: officer.id || '',
      name: officer.nameZh || (side === 'attacker' ? '先锋' : '守将'),
      side: side,
      x: side === 'attacker' ? 1 : Math.max(8, (cols || 12) - 3),
      y: clamp(1 + idx * 2, 1, 5),
      hp: 100,
      troops: troops,
      maxTroops: troops,
      leadership: officer.leadership || 60,
      might: officer.might || 60,
      intellect: officer.intellect || 60,
      morale: morale || 65,
      training: training || 65,
      portraitUrl: officerPortrait(officer),
      unitType: type,
      skill: officer.specialSkill || (side === 'attacker' ? '突击' : '坚守'),
      move: movementByType(type),
      range: rangeByType(type),
      acted: false,
      skillUsed: false,
      buff: null,
    };
  }

  function initTacticalBattle(game, action) {
    const fromCity = game.cities[game.selectedCityId];
    const targetCity = game.cities[action.targetCityId];
    if (!fromCity || !targetCity) return null;
    const availableIds = getCityOfficerIds(game, fromCity.id, fromCity.ownerForceId);
    const selectedIds = (action.selectedOfficerIds || []).filter(function (id) { return availableIds.indexOf(id) >= 0; });
    const sourceIds = selectedIds.length ? selectedIds : availableIds;
    const atkOfficers = sourceIds.map(function (id) { return game.officers[id]; }).filter(Boolean).slice(0, 3);
    const defenderIds = getCityOfficerIds(game, targetCity.id, targetCity.ownerForceId);
    const defOfficers = defenderIds.map(function (id) { return game.officers[id]; }).filter(Boolean).slice(0, 3);
    while (atkOfficers.length < 3) atkOfficers.push({ nameZh: '先锋', leadership: 60, might: 60, unitType: 'infantry', specialSkill: '突击' });
    while (defOfficers.length < 3) defOfficers.push({ nameZh: '守卒', leadership: 58, might: 58, unitType: 'infantry', specialSkill: '坚守' });
    const committedTroops = Math.max(80, Math.floor(fromCity.troops * 0.6));
    return {
      cols: 12,
      rows: 7,
      round: 1,
      maxRounds: 8,
      currentTurn: 'attacker',
      selectedUnitId: null,
      grid: createTerrain(12, 7),
      committedTroops: committedTroops,
      originalDefenderTroops: targetCity.troops,
      logs: ['战斗开始：玩家先手。参战武将将以统帅、士气、训练影响兵团战力。'],
      attackerUnits: atkOfficers.map(function (o, i) { return createUnit(o, 'attacker', i, committedTroops, targetCity.troops, atkOfficers.length, fromCity.morale || 65, fromCity.training || 65, 12); }),
      defenderUnits: defOfficers.map(function (o, i) { return createUnit(o, 'defender', i, fromCity.troops, targetCity.troops, defOfficers.length, targetCity.morale || 65, targetCity.training || 65, 12); }),
      attackerLoss: 0,
      defenderLoss: 0,
      wallDamage: 0,
    };
  }

  function skillBuff(skill) {
    if (skill === '突击') return { atk: 0.2, def: 0, label: '突击' };
    if (skill === '火计') return { atk: 0.16, def: 0, label: '火计' };
    if (skill === '治军') return { atk: 0.1, def: 0.1, label: '治军' };
    if (skill === '统筹') return { atk: 0.1, def: 0.06, label: '统筹' };
    return { atk: 0, def: 0.16, label: '坚守' };
  }

  function getCell(tb, unit) {
    return tb.grid[unit.y] && tb.grid[unit.y][unit.x] ? tb.grid[unit.y][unit.x] : null;
  }

  function moraleFactor(unit) {
    return 0.82 + clamp(unit.morale || 65, 20, 110) / 100 * 0.34;
  }

  function trainingFactor(unit) {
    return 0.86 + clamp(unit.training || 65, 20, 110) / 100 * 0.24;
  }

  function commandFactor(unit) {
    return 0.72 + clamp(unit.leadership || 60, 30, 100) / 100 * 0.62;
  }

  function terrainFactor(tb, unit, isDefense) {
    const cell = getCell(tb, unit);
    if (!cell) return 1;
    if (cell.terrain === 'forest') {
      if (unit.unitType === 'archer') return isDefense ? 1.22 : 1.12;
      return isDefense ? 1.12 : 0.92;
    }
    if (cell.terrain === 'mountain') {
      if (unit.unitType === 'cavalry') return isDefense ? 0.82 : 0.78;
      return isDefense ? 1.16 : 1.05;
    }
    if (cell.terrain === 'wall' || cell.terrain === 'gate' || cell.terrain === 'gate-open' || cell.terrain === 'courtyard') {
      return isDefense ? 1.35 : 0.78;
    }
    return 1;
  }

  function terrainCounterFactor(tb, unit) {
    const cell = getCell(tb, unit);
    if (!cell) return 1;
    if (cell.terrain === 'forest') return 1.08;
    if (cell.terrain === 'mountain') return 1.12;
    if (cell.terrain === 'wall' || cell.terrain === 'gate' || cell.terrain === 'gate-open' || cell.terrain === 'courtyard') return 1.18;
    return 1;
  }

  function isBlockingFortification(cell) {
    return !!cell && cell.terrain === 'gate' && (cell.gateHp || 0) > 0;
  }

  function canEnterCell(unit, cell) {
    if (!cell) return false;
    if (cell.terrain === 'wall') return false;
    if (cell.terrain === 'gate' && (cell.gateHp || 0) > 0) return unit.side === 'defender';
    return true;
  }

  function triggerDefenderIfPlayerDone(tb) {
    if (!tb || tb.currentTurn !== 'attacker') return false;
    const ready = tb.attackerUnits.filter(function (u) { return u.hp > 0 && u.troops > 0 && !u.acted; });
    if (ready.length) return false;
    tb.currentTurn = 'defender';
    tb.logs.unshift('玩家部队行动完毕，守军开始反击。');
    runAiTurn();
    return true;
  }

  function nextAiStep(tb, unit, target) {
    const directX = clamp(unit.x + (target.x > unit.x ? 1 : target.x < unit.x ? -1 : 0), 0, tb.cols - 1);
    const directY = clamp(unit.y + (target.y > unit.y ? 1 : target.y < unit.y ? -1 : 0), 0, tb.rows - 1);
    const directCell = tb.grid[directY] && tb.grid[directY][directX] ? tb.grid[directY][directX] : null;
    if (!getUnitAt(tb, directX, directY) && canEnterCell(unit, directCell)) return { x: directX, y: directY };
    if (unit.side === 'defender' && unit.x >= 8) {
      const gate = { x: 7, y: 3 };
      const gx = clamp(unit.x + (gate.x > unit.x ? 1 : gate.x < unit.x ? -1 : 0), 0, tb.cols - 1);
      const gy = clamp(unit.y + (gate.y > unit.y ? 1 : gate.y < unit.y ? -1 : 0), 0, tb.rows - 1);
      const gateCell = tb.grid[gy] && tb.grid[gy][gx] ? tb.grid[gy][gx] : null;
      if (!getUnitAt(tb, gx, gy) && canEnterCell(unit, gateCell)) return { x: gx, y: gy };
    }
    return null;
  }

  function defenderHasSortieAdvantage(tb) {
    const attackers = tb.attackerUnits.reduce(function (sum, unit) { return sum + Math.max(0, unit.troops); }, 0);
    const defenders = tb.defenderUnits.reduce(function (sum, unit) { return sum + Math.max(0, unit.troops); }, 0);
    return defenders >= attackers * 1.35;
  }

  function attack(tb, attacker, defender) {
    const atkBuff = attacker.buff ? attacker.buff.atk : 0;
    const defBuff = defender.buff ? defender.buff.def : 0;
    const isRangedShot = attacker.unitType === 'archer' && dist(attacker, defender) > 1;
    const amount = Math.max(8, Math.floor((9 + attacker.might / 12 + attacker.leadership / 8) * commandFactor(attacker) * moraleFactor(attacker) * trainingFactor(attacker) * terrainFactor(tb, attacker, false) / Math.max(0.75, terrainFactor(tb, defender, true)) * (1 + atkBuff) / (1 + defBuff)));
    const attackerScale = Math.sqrt(Math.max(1, attacker.troops) / 100);
    const rangedFactor = isRangedShot ? 0.65 : 1;
    const rawLoss = Math.floor(defender.troops * amount / 420 * attackerScale * rangedFactor);
    const lossFloor = isRangedShot ? 2 : 4;
    const lossCap = Math.max(lossFloor, Math.floor(defender.troops * (isRangedShot ? 0.28 : 0.45)));
    const troopLoss = clamp(rawLoss, Math.min(lossFloor, defender.troops), lossCap);
    const rawCounter = Math.floor(troopLoss * (0.16 + defender.might / 620) * commandFactor(defender) * moraleFactor(defender) * Math.max(0.75, terrainFactor(tb, defender, true)) * terrainCounterFactor(tb, defender));
    const counterCap = Math.max(1, Math.floor(attacker.troops * 0.32));
    const counterLoss = isRangedShot ? 0 : clamp(rawCounter, Math.min(1, attacker.troops), counterCap);
    defender.troops = Math.max(0, defender.troops - troopLoss);
    attacker.troops = Math.max(0, attacker.troops - counterLoss);
    syncUnitHpByTroops(defender);
    syncUnitHpByTroops(attacker);
    if (attacker.side === 'attacker') {
      tb.defenderLoss += troopLoss;
      tb.attackerLoss += counterLoss;
    } else {
      tb.attackerLoss += troopLoss;
      tb.defenderLoss += counterLoss;
    }
    tb.logs.unshift(attacker.name + (isRangedShot ? '远射' : '攻击') + defender.name + '（统帅' + attacker.leadership + '，士气' + attacker.morale + '），敌损' + troopLoss + '，我损' + counterLoss + '。');
    attacker.acted = true;
    attacker.buff = null;
    tb.selectedUnitId = null;
    checkTacticalAutoEnd(tb);
  }

  function livingUnits(units) {
    return units.filter(function (unit) { return unit.hp > 0 && unit.troops > 0; });
  }

  function buildTacticalSummary(tb, winner) {
    const attackerLeft = tb.attackerUnits.reduce(function (sum, unit) { return sum + Math.max(0, unit.troops); }, 0);
    const defenderLeft = tb.defenderUnits.reduce(function (sum, unit) { return sum + Math.max(0, unit.troops); }, 0);
    if (winner === 'attacker') return '攻方歼灭守军，战斗提前结束。残兵：攻方' + attackerLeft + '，守方' + defenderLeft + '。';
    if (winner === 'defender') return '守军击退来敌，战斗提前结束。残兵：攻方' + attackerLeft + '，守方' + defenderLeft + '。';
    return '鏖战未分全胜，进入综合结算。残兵：攻方' + attackerLeft + '，守方' + defenderLeft + '。';
  }

  function scheduleTacticalFinalize(tb) {
    if (!tb || tb.finalizeTimer) return;
    tb.finalizeTimer = window.setTimeout(function () {
      if (appState.tacticalBattle === tb && appState.screen === 'battlefield') {
        handlers.resolveBattle();
      }
    }, 650);
  }

  function unitTooltip(unit, cell) {
    if (!unit) return terrainEffectText(cell.terrain) + (cell.gateHp ? ' 城门耐久：' + cell.gateHp + '。' : '');
    return unit.name + '｜' + unitTypeLabel(unit.unitType) + '｜兵力' + unit.troops + '/' + unit.maxTroops
      + '｜统帅' + unit.leadership + ' 武勇' + unit.might + '｜士气' + unit.morale + ' 训练' + unit.training
      + '｜技能：' + unit.skill + '｜地形：' + terrainEffectText(cell.terrain);
  }

  function checkTacticalAutoEnd(tb) {
    if (!tb || tb.autoResolving) return;
    const aliveAttackers = livingUnits(tb.attackerUnits).length;
    const aliveDefenders = livingUnits(tb.defenderUnits).length;
    if (aliveAttackers > 0 && aliveDefenders > 0) return;
    const winner = aliveDefenders === 0 ? 'attacker' : 'defender';
    tb.forceResult = winner === 'attacker' ? 'win' : 'lose';
    tb.autoSummary = buildTacticalSummary(tb, winner);
    tb.logs.unshift('【战况总结】' + tb.autoSummary);
    tb.autoResolving = true;
    scheduleTacticalFinalize(tb);
  }

  function renderTacticalBattle() {
    const tb = appState.tacticalBattle;
    if (!tb) return;
    let cells = '';
    for (let y = 0; y < tb.rows; y += 1) {
      for (let x = 0; x < tb.cols; x += 1) {
        const cell = tb.grid[y][x];
        const unit = getUnitAt(tb, x, y);
        const skillFx = unit && unit.skillFxUntil && unit.skillFxUntil > Date.now();
        cells += '<button class="tb-cell terrain-' + cell.terrain + (unit ? ' occupied' : '') + '" data-cell-x="' + x + '" data-cell-y="' + y + '" title="' + unitTooltip(unit, cell).replace(/"/g, '&quot;') + '" style="--terrain-img:url(' + terrainAsset(cell) + ')">'
          + '<div class="terrain-art"><b>' + terrainIcon(cell.terrain) + '</b><span>' + terrainLabel(cell.terrain) + '</span></div>'
          + (cell.terrain === 'gate' ? '<em>门' + cell.gateHp + '</em>' : '')
          + (unit ? '<div class="tb-unit ' + (unit.side === 'attacker' ? 'ally' : 'enemy') + (unit.acted ? ' acted' : '') + (unit.buff ? ' buffed' : '') + (skillFx ? ' skill-fx' : '') + '"><div class="tb-avatar"><img src="' + unit.portraitUrl + '" alt=""></div><img class="tb-unit-type" src="' + unitIcon(unit.unitType) + '" alt="' + unitTypeLabel(unit.unitType) + '"><strong>' + unit.name + '</strong><strong class="tb-troops">' + unit.troops + '</strong><i class="tb-skill-aura">' + (unit.buff ? '⚡' : '') + '</i></div>' : '')
          + '</button>';
      }
    }
    const wallLeft = Math.max(1, tb.cols - 5);
    const wallRight = tb.cols - 1;
    const wallTop = 1;
    const wallBottom = tb.rows - 2;
    const gateY = Math.floor((wallTop + wallBottom) / 2);
    const gateCell = tb.grid[gateY] && tb.grid[gateY][wallLeft] ? tb.grid[gateY][wallLeft] : null;
    const wallOverlay = '<div class="tb-city-wall" style="--wall-left:' + wallLeft + ';--wall-right:' + wallRight + ';--wall-top:' + wallTop + ';--wall-bottom:' + wallBottom + ';--gate-y:' + gateY + '">'
      + '<div class="tb-wall-line top"></div><div class="tb-wall-line bottom"></div><div class="tb-wall-line left"></div><div class="tb-wall-line right"></div>'
      + '<div class="tb-wall-corner tl"></div><div class="tb-wall-corner tr"></div><div class="tb-wall-corner bl"></div><div class="tb-wall-corner br"></div>'
      + '<div class="tb-wall-gate ' + (gateCell && gateCell.terrain === 'gate-open' ? 'open' : 'closed') + '"></div></div>';
    const selected = tb.selectedUnitId ? getUnitById(tb, tb.selectedUnitId) : null;
    const leadAtk = tb.attackerUnits[0] || null;
    const leadDef = tb.defenderUnits[0] || null;
    root.innerHTML = '<div class="screen tactical-screen"><section class="tactical-shell">'
      + '<div class="tactical-top"><h2>战旗攻城（第' + tb.round + '回合）</h2><div>行动方：' + (tb.currentTurn === 'attacker' ? '玩家' : '守军') + '</div><div>攻方损失' + tb.attackerLoss + ' · 守方损失' + tb.defenderLoss + ' · 城门破坏' + tb.wallDamage + '</div></div>'
      + '<div class="tb-commanders">'
      + '<div class="tb-commander ally"><div class="tb-portrait">' + avatarGlyph(leadAtk ? leadAtk.name : '将') + '</div><div><strong>' + (leadAtk ? leadAtk.name : '攻方主将') + '</strong><span>特技：' + (leadAtk ? leadAtk.skill : '突击') + '</span></div></div>'
      + '<div class="tb-commander enemy"><div class="tb-portrait">' + avatarGlyph(leadDef ? leadDef.name : '将') + '</div><div><strong>' + (leadDef ? leadDef.name : '守方主将') + '</strong><span>特技：' + (leadDef ? leadDef.skill : '坚守') + '</span></div></div>'
      + '</div>'
      + '<div class="tb-legend"><span>平原：骑兵移动2格</span><span>林地：弓兵攻防↑ 近战攻击↓</span><span>城墙：边界，不可攻击</span><span>城门：关闭不可过，破门后可通行</span></div>'
      + '<div class="tb-board-wrap"><div class="tb-board" style="grid-template-columns:repeat(' + tb.cols + ', minmax(0, 1fr))">' + cells + '</div>' + wallOverlay + '</div>'
      + '<div class="tactical-actions">'
      + '<button data-view-action="tb-skill" ' + (!selected || selected.side !== 'attacker' || selected.skillUsed || selected.acted || tb.currentTurn !== 'attacker' ? 'disabled' : '') + '>释放技能</button>'
      + '<button data-view-action="tb-end-unit" ' + (!selected || selected.side !== 'attacker' || tb.currentTurn !== 'attacker' ? 'disabled' : '') + '>结束单位</button>'
      + '<button data-view-action="tb-end-turn" ' + (tb.currentTurn !== 'attacker' ? 'disabled' : '') + '>结束玩家回合</button>'
      + '<button class="primary-endturn" data-view-action="resolve-battle" ' + (!tb.autoResolving && !tb.forceResult && !tb.autoSummary ? 'disabled' : '') + '>战斗结算</button>'
      + '<button data-view-action="cancel-battle">撤回部署</button></div>'
      + (tb.autoSummary ? '<div class="tb-summary">' + tb.autoSummary + '</div>' : '')
      + '<div class="tb-log">' + tb.logs.slice(0, 6).map(function (line) { return '<div>· ' + line + '</div>'; }).join('') + '</div>'
      + '</section></div>';

    if (tb.autoResolving || tb.forceResult || tb.autoSummary) scheduleTacticalFinalize(tb);

    root.querySelectorAll('[data-cell-x]').forEach(function (node) {
      node.addEventListener('click', function () { handlers.tacticalCell(node.getAttribute('data-cell-x'), node.getAttribute('data-cell-y')); });
    });
    root.querySelectorAll('[data-view-action]').forEach(function (node) {
      node.addEventListener('click', function () {
        const action = node.getAttribute('data-view-action');
        if (action === 'tb-skill') handlers.tacticalSkill();
        else if (action === 'tb-end-unit') handlers.tacticalEndUnit();
        else if (action === 'tb-end-turn') handlers.tacticalEndTurn();
        else if (action === 'resolve-battle') handlers.resolveBattle();
        else if (action === 'cancel-battle') handlers.cancelBattle();
      });
    });
  }

  function runAiTurn() {
    const tb = appState.tacticalBattle;
    if (!tb || tb.currentTurn !== 'defender') return;
    const canSortie = defenderHasSortieAdvantage(tb);
    tb.defenderUnits.forEach(function (u) {
      if (u.hp <= 0 || u.acted) return;
      const targets = tb.attackerUnits.filter(function (t) { return t.hp > 0; });
      if (!targets.length) return;
      const target = targets.slice().sort(function (a, b) { return dist(u, a) - dist(u, b); })[0];
      if (!u.skillUsed && u.hp < 70) {
        u.buff = skillBuff(u.skill);
        u.skillUsed = true;
        u.skillFxUntil = Date.now() + 900;
        tb.logs.unshift(u.name + '发动技能【' + u.skill + '】，攻守临时提升。');
      }
      if (dist(u, target) <= u.range) {
        attack(tb, u, target);
        return;
      }
      if (!canSortie) {
        u.acted = true;
        tb.logs.unshift(u.name + '据城防守，未贸然出击。');
        return;
      }
      const step = nextAiStep(tb, u, target);
      if (step) { u.x = step.x; u.y = step.y; tb.logs.unshift(u.name + '向敌军推进。'); }
      if (dist(u, target) <= u.range) attack(tb, u, target);
      else u.acted = true;
    });
    if (tb.autoResolving) return;
    tb.attackerUnits.forEach(function (u) { if (u.hp > 0) u.acted = false; });
    tb.defenderUnits.forEach(function (u) { if (u.hp > 0) u.acted = false; });
    tb.currentTurn = 'attacker';
    tb.round += 1;
      if (tb.round > tb.maxRounds && !tb.autoResolving) {
        tb.autoSummary = buildTacticalSummary(tb, 'draw');
        tb.logs.unshift('【战况总结】' + tb.autoSummary);
        tb.autoResolving = true;
        scheduleTacticalFinalize(tb);
        return;
      }
    checkTacticalAutoEnd(tb);
  }

  function render() {
    syncFullscreen();
    appState.audioEnabled = audio ? audio.isEnabled() : false;
    if (appState.screen === 'battlefield' && appState.tacticalBattle) return renderTacticalBattle();
    ui.renderApp(root, appState, handlers);
  }

  function buildBattlePreview(game, action) {
    const state = game || {};
    const fromCity = state.cities && state.selectedCityId ? state.cities[state.selectedCityId] : null;
    const targetCity = state.cities && action && action.targetCityId ? state.cities[action.targetCityId] : null;
    if (!fromCity || !targetCity) return { rounds: [], currentRound: 0, finished: true, summary: '战场情报不足。' };
    return { rounds: [{ title: '战棋部署', text: '已进入战棋模式：玩家控制攻方，守军自动应战。' }], currentRound: 0, finished: false };
  }

  function openGame(game) {
    appState.game = game;
    appState.screen = game.gameOver ? 'game-over' : 'game';
    appState.currentPanel = 'civil';
    appState.pendingBattleAction = null;
    appState.battlePreview = null;
    appState.tacticalBattle = null;
    render();
  }

  const handlers = {
    newGame: function () { appState.screen = 'select-force'; appState.pendingBattleAction = null; appState.battlePreview = null; appState.tacticalBattle = null; setNotice(''); render(); },
    continueAuto: function () {
      const saved = storageApi.loadGame('auto');
      if (!saved) { setNotice('最近进度为空。', 'bad'); appState.screen = 'title'; render(); safePlay('bad'); return; }
      setNotice('已读取最近进度。'); openGame(saved); playFeedback();
    },
    backTitle: function () { appState.screen = 'title'; appState.pendingBattleAction = null; appState.battlePreview = null; appState.tacticalBattle = null; setNotice(''); render(); },
    loadSlot: function (slotId) {
      const saved = storageApi.loadGame(slotId);
      if (!saved) { setNotice('该槽位暂无内容。', 'bad'); appState.screen = 'title'; render(); safePlay('bad'); return; }
      setNotice('已读取手动槽位 ' + slotId + '。'); openGame(saved); playFeedback();
    },
    chooseForce: function (forceId) {
      safeEnsureAudio();
      const game = gameApi.createNewGame(forceId);
      try { storageApi.saveGame('auto', game); } catch (error) { console.warn('auto save failed', error); }
      setNotice('新局已开。'); openGame(game); playFeedback();
    },
    selectCity: function (cityId) {
      if (!appState.game) return;
      safeEnsureAudio();
      appState.game = gameApi.applyAction(appState.game, { type: 'selectCity', cityId: cityId });
      render(); safePlay('action');
    },
    setPanel: function (panelId) { appState.currentPanel = panelId || 'civil'; render(); safePlay('action'); },
    gameAction: function (action) {
      if (!appState.game) return;
      safeEnsureAudio();
      if (action.type === 'attack') {
        const city = appState.game.cities[appState.game.selectedCityId];
        const defaultOfficers = city ? getCityOfficerIds(appState.game, city.id, city.ownerForceId).slice(0, 3) : [];
        appState.pendingBattleAction = { type: 'attack', targetCityId: action.targetCityId, targetForceId: action.targetForceId || null, selectedOfficerIds: defaultOfficers };
        appState.screen = 'battle'; render(); safePlay('battle'); return;
      }
      try {
        appState.game = action.type === 'endTurn' && gameApi.safeEndTurn ? gameApi.safeEndTurn(appState.game) : gameApi.applyAction(appState.game, action);
      } catch (error) {
        console.error(error); setNotice('本月结算出现异常，已保留当前进度。请重试。', 'bad'); render(); safePlay('bad'); return;
      }
      if (action.type === 'endTurn') {
        try { storageApi.saveGame('auto', appState.game); } catch (error) { console.warn('auto save failed', error); }
        setNotice('月度结算已完成，并自动保存。'); safePlay('event');
      } else {
        setNotice(''); playFeedback();
      }
      if (appState.game.gameOver) {
        try { storageApi.saveGame('auto', appState.game); } catch (error) { console.warn('auto save failed', error); }
        appState.screen = 'game-over';
      }
      render();
    },
    startBattle: function () {
      if (!appState.game || !appState.pendingBattleAction) return;
      if (!appState.pendingBattleAction.selectedOfficerIds || !appState.pendingBattleAction.selectedOfficerIds.length) {
        setNotice('请至少选择 1 名出征武将。', 'bad');
        render();
        safePlay('bad');
        return;
      }
      appState.battlePreview = buildBattlePreview(appState.game, appState.pendingBattleAction);
      appState.tacticalBattle = initTacticalBattle(appState.game, appState.pendingBattleAction);
      appState.screen = 'battlefield';
      setNotice(''); render(); safePlay('battle');
    },
    nextBattleRound: function () {},
    toggleBattleOfficer: function (officerId) {
      if (!appState.pendingBattleAction || !officerId) return;
      const selected = appState.pendingBattleAction.selectedOfficerIds || [];
      const index = selected.indexOf(officerId);
      if (index >= 0) selected.splice(index, 1);
      else if (selected.length < 3) selected.push(officerId);
      else { setNotice('一次出征最多选择 3 名武将。', 'bad'); safePlay('bad'); }
      appState.pendingBattleAction.selectedOfficerIds = selected;
      render();
    },
    tacticalCell: function (xArg, yArg) {
      const tb = appState.tacticalBattle;
      if (!tb || tb.currentTurn !== 'attacker') return;
      const x = Number(xArg); const y = Number(yArg);
      const here = getUnitAt(tb, x, y);
      if (here && here.side === 'attacker' && here.hp > 0) {
        if (here.acted) {
          tb.selectedUnitId = null;
          tb.logs.unshift(here.name + '本回合已行动，需等下一回合。');
          render();
          return;
        }
        tb.selectedUnitId = here.id; render(); return;
      }
      const unit = tb.selectedUnitId ? getUnitById(tb, tb.selectedUnitId) : null;
      if (!unit || unit.acted || unit.hp <= 0) return;
      if (here && here.side === 'defender' && dist(unit, here) <= unit.range) {
        attack(tb, unit, here);
        triggerDefenderIfPlayerDone(tb);
        render(); return;
      }
       if (!here) {
        const cell = tb.grid[y][x];
        if (dist(unit, { x: x, y: y }) > moveAllowance(unit, cell)) return;
        if (isBlockingFortification(cell)) {
          const dmg = 12 + Math.floor(unit.might / 14);
          cell.gateHp = clamp(cell.gateHp - dmg, 0, 180);
          tb.wallDamage += dmg;
          tb.logs.unshift(cell.gateHp <= 0 ? unit.name + '攻破城门！' : unit.name + '正在攻击城门，耐久剩余' + cell.gateHp + '。');
          if (cell.gateHp <= 0) cell.terrain = 'gate-open';
          unit.acted = true;
          tb.selectedUnitId = null;
          triggerDefenderIfPlayerDone(tb);
          render();
          return;
        }
        if (!canEnterCell(unit, cell)) return;
        unit.x = x; unit.y = y;
        unit.acted = true;
        tb.selectedUnitId = null;
        tb.logs.unshift(unit.name + '移动至' + terrainLabel(cell ? cell.terrain : 'plain') + '，本回合行动结束。');
        triggerDefenderIfPlayerDone(tb);
      }
      render();
    },
    tacticalSkill: function () {
      const tb = appState.tacticalBattle;
      const unit = tb && tb.selectedUnitId ? getUnitById(tb, tb.selectedUnitId) : null;
      if (!tb || !unit || unit.side !== 'attacker' || unit.skillUsed || unit.acted || tb.currentTurn !== 'attacker') return;
      unit.buff = skillBuff(unit.skill);
      unit.skillUsed = true;
      unit.skillFxUntil = Date.now() + 900;
      tb.logs.unshift(unit.name + '发动技能【' + unit.skill + '】，攻守临时提升。');
      render();
    },
    tacticalEndUnit: function () {
      const tb = appState.tacticalBattle;
      const unit = tb && tb.selectedUnitId ? getUnitById(tb, tb.selectedUnitId) : null;
      if (!tb || !unit || unit.side !== 'attacker' || tb.currentTurn !== 'attacker') return;
      unit.acted = true;
      triggerDefenderIfPlayerDone(tb);
      render();
    },
    tacticalEndTurn: function () {
      const tb = appState.tacticalBattle;
      if (!tb || tb.currentTurn !== 'attacker') return;
      tb.currentTurn = 'defender';
      runAiTurn();
      render();
    },
    resolveBattle: function () {
      if (!appState.game || !appState.pendingBattleAction) return;
      if (appState.tacticalBattle) {
        const tb = appState.tacticalBattle;
        if (!tb.autoResolving && !tb.forceResult && !tb.autoSummary) {
          setNotice('战斗尚未结束，不能提前结算。', 'bad');
          render();
          safePlay('bad');
          return;
        }
        const attackerLeft = tb.attackerUnits.reduce(function (sum, unit) { return sum + Math.max(0, unit.troops); }, 0);
        const defenderLeft = tb.defenderUnits.reduce(function (sum, unit) { return sum + Math.max(0, unit.troops); }, 0);
        const breachBonus = tb.wallDamage >= 110 ? 1.12 : 1;
        appState.pendingBattleAction.tacticalResult = tb.forceResult || ((attackerLeft * breachBonus > defenderLeft * 1.08) ? 'win' : 'lose');
        appState.pendingBattleAction.tacticalCommittedTroops = tb.committedTroops || tb.attackerUnits.reduce(function (sum, unit) { return sum + Math.max(0, unit.maxTroops || unit.troops); }, 0);
        appState.pendingBattleAction.tacticalAttackerSurvivors = attackerLeft;
        appState.pendingBattleAction.tacticalDefenderSurvivors = defenderLeft;
        appState.pendingBattleAction.tacticalAttackerLoss = Math.max(0, appState.pendingBattleAction.tacticalCommittedTroops - attackerLeft);
        appState.pendingBattleAction.tacticalDefenderLoss = Math.max(0, (tb.originalDefenderTroops || defenderLeft) - defenderLeft);
      }
      safeEnsureAudio();
      try {
        appState.game = gameApi.applyAction(appState.game, appState.pendingBattleAction);
      } catch (error) {
        console.error(error); setNotice('战斗结算失败，请稍后再试。', 'bad'); appState.screen = 'game'; appState.pendingBattleAction = null; appState.tacticalBattle = null; render(); safePlay('bad'); return;
      }
      appState.pendingBattleAction = null;
      appState.battlePreview = null;
      appState.tacticalBattle = null;
      appState.screen = appState.game.gameOver ? 'game-over' : 'game';
      setNotice(''); playFeedback(); render();
    },
    cancelBattle: function () {
      appState.pendingBattleAction = null;
      appState.battlePreview = null;
      appState.tacticalBattle = null;
      appState.screen = 'game';
      setNotice('已取消出征。');
      render();
      safePlay('action');
    },
    saveSlot: function (slotId) {
      if (!appState.game) return;
      try { storageApi.saveGame(slotId, appState.game); setNotice('已写入手动槽位 ' + slotId + '。'); }
      catch (error) { setNotice('写入存档失败。', 'bad'); console.warn('save slot failed', error); }
      render(); safePlay('action');
    },
    toggleAudio: function () {
      if (!audio) return;
      let enabled = false;
      try { enabled = audio.toggle(); } catch (error) { console.warn('audio toggle failed', error); }
      appState.audioEnabled = enabled;
      setNotice(enabled ? '音效已开启。' : '音效已关闭。');
      render();
      if (enabled) safePlay('action');
    },
    toggleFullscreen: function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(function () { syncFullscreen(); render(); }).catch(function () { setNotice('浏览器未允许进入全屏。', 'bad'); render(); safePlay('bad'); });
        return;
      }
      document.exitFullscreen().then(function () { syncFullscreen(); render(); });
    },
  };

  document.addEventListener('fullscreenchange', function () { syncFullscreen(); render(); });
  render();
})();

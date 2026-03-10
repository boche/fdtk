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
  function dist(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function movementByType(type) {
    if (type === 'cavalry') return 3;
    if (type === 'archer') return 2;
    return 2;
  }

  function rangeByType(type) {
    return type === 'archer' ? 2 : 1;
  }

  function createTerrain(cols, rows) {
    const grid = [];
    for (let y = 0; y < rows; y += 1) {
      const row = [];
      for (let x = 0; x < cols; x += 1) {
        let terrain = 'plain';
        if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) terrain = 'mountain';
        if ((x === 3 || x === 4) && (y === 2 || y === 3)) terrain = 'forest';
        row.push({ terrain: terrain, wallHp: 0 });
      }
      grid.push(row);
    }
    [1, 2, 3, 4].forEach(function (y) {
      grid[y][7].terrain = 'wall';
      grid[y][7].wallHp = 140;
    });
    return grid;
  }

  function createUnit(officer, side, idx, fromTroops, toTroops) {
    const type = officer.unitType || 'infantry';
    return {
      id: side + '-' + idx,
      name: officer.nameZh || (side === 'attacker' ? '先锋' : '守将'),
      side: side,
      x: side === 'attacker' ? 1 : 8,
      y: clamp(1 + idx * 2, 1, 4),
      hp: 100,
      troops: Math.max(80, Math.floor((side === 'attacker' ? fromTroops : toTroops) / 3)),
      leadership: officer.leadership || 60,
      might: officer.might || 60,
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
    const atkOfficers = (fromCity.officers || []).map(function (id) { return game.officers[id]; }).filter(Boolean).slice(0, 3);
    const defOfficers = (targetCity.officers || []).map(function (id) { return game.officers[id]; }).filter(Boolean).slice(0, 3);
    while (atkOfficers.length < 3) atkOfficers.push({ nameZh: '先锋', leadership: 60, might: 60, unitType: 'infantry', specialSkill: '突击' });
    while (defOfficers.length < 3) defOfficers.push({ nameZh: '守卒', leadership: 58, might: 58, unitType: 'infantry', specialSkill: '坚守' });
    return {
      cols: 10,
      rows: 6,
      round: 1,
      maxRounds: 8,
      currentTurn: 'attacker',
      selectedUnitId: null,
      grid: createTerrain(10, 6),
      logs: ['战斗开始：玩家先手。'],
      attackerUnits: atkOfficers.map(function (o, i) { return createUnit(o, 'attacker', i, fromCity.troops, targetCity.troops); }),
      defenderUnits: defOfficers.map(function (o, i) { return createUnit(o, 'defender', i, fromCity.troops, targetCity.troops); }),
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

  function terrainFactor(tb, unit, isDefense) {
    const cell = tb.grid[unit.y] && tb.grid[unit.y][unit.x];
    if (!cell) return 1;
    if (cell.terrain === 'forest') return unit.unitType === 'archer' ? 1.12 : 0.96;
    if (cell.terrain === 'mountain') return unit.unitType === 'cavalry' ? 0.82 : 1.06;
    if (cell.terrain === 'wall') return isDefense ? 1.25 : 0.84;
    return 1;
  }

  function attack(tb, attacker, defender) {
    const atkBuff = attacker.buff ? attacker.buff.atk : 0;
    const defBuff = defender.buff ? defender.buff.def : 0;
    const amount = Math.max(8, Math.floor((12 + attacker.might / 10 + attacker.leadership / 14) * terrainFactor(tb, attacker, false) / Math.max(0.75, terrainFactor(tb, defender, true)) * (1 + atkBuff) / (1 + defBuff)));
    defender.hp = clamp(defender.hp - amount, 0, 100);
    const troopLoss = Math.max(30, Math.floor(defender.troops * amount / 220));
    defender.troops = Math.max(0, defender.troops - troopLoss);
    if (attacker.side === 'attacker') tb.defenderLoss += troopLoss;
    else tb.attackerLoss += troopLoss;
    tb.logs.unshift(attacker.name + '攻击' + defender.name + '造成' + amount + '伤害。');
    attacker.acted = true;
    attacker.buff = null;
  }

  function renderTacticalBattle() {
    const tb = appState.tacticalBattle;
    if (!tb) return;
    let cells = '';
    for (let y = 0; y < tb.rows; y += 1) {
      for (let x = 0; x < tb.cols; x += 1) {
        const cell = tb.grid[y][x];
        const unit = getUnitAt(tb, x, y);
        cells += '<button class="tb-cell terrain-' + cell.terrain + '" data-cell-x="' + x + '" data-cell-y="' + y + '">'
          + (cell.terrain === 'wall' ? '<em>墙' + cell.wallHp + '</em>' : '')
          + (unit ? '<div class="tb-unit ' + (unit.side === 'attacker' ? 'ally' : 'enemy') + (unit.acted ? ' acted' : '') + '"><strong>' + unit.name + '</strong><span>' + unit.unitType + ' HP' + unit.hp + '</span></div>' : '')
          + '</button>';
      }
    }
    const selected = tb.selectedUnitId ? getUnitById(tb, tb.selectedUnitId) : null;
    root.innerHTML = '<div class="screen tactical-screen"><section class="tactical-shell">'
      + '<div class="tactical-top"><h2>战旗攻城（第' + tb.round + '回合）</h2><div>行动方：' + (tb.currentTurn === 'attacker' ? '玩家' : 'AI') + '</div><div>攻方损失' + tb.attackerLoss + ' · 守方损失' + tb.defenderLoss + ' · 墙体破坏' + tb.wallDamage + '</div></div>'
      + '<div class="tb-board">' + cells + '</div>'
      + '<div class="tactical-actions">'
      + '<button data-view-action="tb-skill" ' + (!selected || selected.side !== 'attacker' || selected.skillUsed || selected.acted || tb.currentTurn !== 'attacker' ? 'disabled' : '') + '>释放技能</button>'
      + '<button data-view-action="tb-end-unit" ' + (!selected || selected.side !== 'attacker' || tb.currentTurn !== 'attacker' ? 'disabled' : '') + '>结束单位</button>'
      + '<button data-view-action="tb-end-turn" ' + (tb.currentTurn !== 'attacker' ? 'disabled' : '') + '>结束玩家回合</button>'
      + '<button class="primary-endturn" data-view-action="resolve-battle">战斗结算</button>'
      + '<button data-view-action="cancel-battle">撤回部署</button></div>'
      + '<div class="tb-log">' + tb.logs.slice(0, 6).map(function (line) { return '<div>· ' + line + '</div>'; }).join('') + '</div>'
      + '</section></div>';

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
    tb.defenderUnits.forEach(function (u) {
      if (u.hp <= 0 || u.acted) return;
      const targets = tb.attackerUnits.filter(function (t) { return t.hp > 0; });
      if (!targets.length) return;
      const target = targets.slice().sort(function (a, b) { return dist(u, a) - dist(u, b); })[0];
      if (!u.skillUsed && u.hp < 70) {
        u.buff = skillBuff(u.skill);
        u.skillUsed = true;
        tb.logs.unshift(u.name + '发动技能【' + u.skill + '】。');
      }
      if (dist(u, target) <= u.range) {
        attack(tb, u, target);
        return;
      }
      const nx = clamp(u.x + (target.x > u.x ? 1 : target.x < u.x ? -1 : 0), 0, tb.cols - 1);
      const ny = clamp(u.y + (target.y > u.y ? 1 : target.y < u.y ? -1 : 0), 0, tb.rows - 1);
      if (!getUnitAt(tb, nx, ny)) { u.x = nx; u.y = ny; }
      if (dist(u, target) <= u.range) attack(tb, u, target);
      else u.acted = true;
    });
    tb.attackerUnits.forEach(function (u) { if (u.hp > 0) u.acted = false; });
    tb.defenderUnits.forEach(function (u) { if (u.hp > 0) u.acted = false; });
    tb.currentTurn = 'attacker';
    tb.round += 1;
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
    return { rounds: [{ title: '战棋部署', text: '已进入战棋模式：玩家控制攻方，AI控制守方。' }], currentRound: 0, finished: false };
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
        appState.pendingBattleAction = { type: 'attack', targetCityId: action.targetCityId, targetForceId: action.targetForceId || null };
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
      appState.battlePreview = buildBattlePreview(appState.game, appState.pendingBattleAction);
      appState.tacticalBattle = initTacticalBattle(appState.game, appState.pendingBattleAction);
      appState.screen = 'battlefield';
      setNotice(''); render(); safePlay('battle');
    },
    nextBattleRound: function () {},
    tacticalCell: function (xArg, yArg) {
      const tb = appState.tacticalBattle;
      if (!tb || tb.currentTurn !== 'attacker') return;
      const x = Number(xArg); const y = Number(yArg);
      const here = getUnitAt(tb, x, y);
      if (here && here.side === 'attacker' && here.hp > 0) {
        tb.selectedUnitId = here.id; render(); return;
      }
      const unit = tb.selectedUnitId ? getUnitById(tb, tb.selectedUnitId) : null;
      if (!unit || unit.acted || unit.hp <= 0) return;
      if (here && here.side === 'defender' && dist(unit, here) <= unit.range) {
        attack(tb, unit, here); render(); return;
      }
      if (!here && dist(unit, { x: x, y: y }) <= unit.move) {
        unit.x = x; unit.y = y;
        const cell = tb.grid[y][x];
        if (cell && cell.terrain === 'wall') {
          const dmg = 12 + Math.floor(unit.might / 14);
          cell.wallHp = clamp(cell.wallHp - dmg, 0, 140);
          tb.wallDamage += dmg;
          tb.logs.unshift(cell.wallHp <= 0 ? unit.name + '攻破城墙！' : unit.name + '正在破坏城墙。');
          if (cell.wallHp <= 0) cell.terrain = 'plain';
        }
      }
      render();
    },
    tacticalSkill: function () {
      const tb = appState.tacticalBattle;
      const unit = tb && tb.selectedUnitId ? getUnitById(tb, tb.selectedUnitId) : null;
      if (!tb || !unit || unit.side !== 'attacker' || unit.skillUsed || unit.acted || tb.currentTurn !== 'attacker') return;
      unit.buff = skillBuff(unit.skill);
      unit.skillUsed = true;
      tb.logs.unshift(unit.name + '发动技能【' + unit.skill + '】。');
      render();
    },
    tacticalEndUnit: function () {
      const tb = appState.tacticalBattle;
      const unit = tb && tb.selectedUnitId ? getUnitById(tb, tb.selectedUnitId) : null;
      if (!tb || !unit || unit.side !== 'attacker' || tb.currentTurn !== 'attacker') return;
      unit.acted = true;
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
        const fromCity = appState.game.cities[appState.game.selectedCityId];
        const targetCity = appState.game.cities[appState.pendingBattleAction.targetCityId];
        if (fromCity && targetCity) {
          fromCity.troops = Math.max(120, fromCity.troops - Math.floor(tb.attackerLoss * 0.6));
          targetCity.troops = Math.max(90, targetCity.troops - Math.floor(tb.defenderLoss * 0.7));
          targetCity.defense = clamp(targetCity.defense - Math.floor(tb.wallDamage / 28), 10, 100);
        }
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

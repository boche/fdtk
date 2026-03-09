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
  };

  function setNotice(msg, tone) {
    appState.notice = msg;
    appState.noticeTone = tone || 'normal';
  }

  function syncFullscreen() {
    appState.isFullscreen = !!document.fullscreenElement;
  }

  function safeEnsureAudio() {
    if (!audio || !audio.ensureContext) {
      return;
    }
    try {
      audio.ensureContext();
    } catch (error) {
      console.warn('audio init failed', error);
    }
  }

  function safePlay(kind) {
    if (!audio || !audio.play) {
      return;
    }
    try {
      audio.play(kind);
    } catch (error) {
      console.warn('audio play failed', error);
    }
  }

  function playFeedback() {
    if (!appState.game || !appState.game.lastFeedback) {
      return;
    }
    const tone = appState.game.lastFeedback.tone;
    if (tone === 'battle') {
      safePlay('battle');
      return;
    }
    if (tone === 'event') {
      safePlay('event');
      return;
    }
    if (tone === 'bad') {
      safePlay('bad');
      return;
    }
    safePlay('action');
  }

  function render() {
    syncFullscreen();
    appState.audioEnabled = audio ? audio.isEnabled() : false;
    ui.renderApp(root, appState, handlers);
  }

  function unitTypeLabel(type) {
    if (type === 'cavalry') return '骑兵';
    if (type === 'archer') return '弓兵';
    return '步兵';
  }

  function terrainLabel(type) {
    if (type === 'mountain') return '山地';
    if (type === 'water') return '水域';
    return '平原';
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getSkillProfile(skill) {
    const table = {
      突击: { attack: 0.1, defense: 0, desc: '冲阵增伤' },
      火计: { attack: 0.08, defense: 0, desc: '谋略破阵' },
      治军: { attack: 0.05, defense: 0.05, desc: '稳阵提效' },
      坚守: { attack: 0, defense: 0.1, desc: '严防死守' },
      统筹: { attack: 0.04, defense: 0.04, desc: '攻守兼顾' },
    };
    return table[skill] || { attack: 0, defense: 0, desc: '常规作战' };
  }

  function getCounterFactor(attackerType, defenderType) {
    const table = {
      infantry: { infantry: 1, cavalry: 0.88, archer: 1.12 },
      cavalry: { infantry: 1.12, cavalry: 1, archer: 0.9 },
      archer: { infantry: 0.92, cavalry: 1.12, archer: 1 },
    };
    return table[attackerType] && table[attackerType][defenderType] ? table[attackerType][defenderType] : 1;
  }

  function getTerrainFactor(terrain, unitType) {
    const table = {
      plain: { infantry: 1, cavalry: 1.08, archer: 1 },
      mountain: { infantry: 1.08, cavalry: 0.82, archer: 1.06 },
      water: { infantry: 0.9, cavalry: 0.75, archer: 1.14 },
    };
    const row = table[terrain] || table.plain;
    return row[unitType] || 1;
  }

  function buildBattlePreview(game, action) {
    const state = game || {};
    const fromCity = state.cities && state.selectedCityId ? state.cities[state.selectedCityId] : null;
    const targetCity = state.cities && action && action.targetCityId ? state.cities[action.targetCityId] : null;
    if (!fromCity || !targetCity) {
      return { rounds: [], currentRound: 0, finished: true, summary: '战场情报不足。' };
    }
    const attackerOfficer = (fromCity.officers || []).map(function (id) { return state.officers[id]; }).filter(Boolean)[0] || null;
    const defenderOfficer = (targetCity.officers || []).map(function (id) { return state.officers[id]; }).filter(Boolean)[0] || null;
    const atkUnit = attackerOfficer && attackerOfficer.unitType ? attackerOfficer.unitType : 'infantry';
    const defUnit = defenderOfficer && defenderOfficer.unitType ? defenderOfficer.unitType : 'infantry';
    const terrainType = targetCity.terrain || 'plain';
    const terrain = terrainLabel(terrainType);
    const attackerSkill = attackerOfficer && attackerOfficer.specialSkill ? attackerOfficer.specialSkill : '坚守';
    const defenderSkill = defenderOfficer && defenderOfficer.specialSkill ? defenderOfficer.specialSkill : '坚守';
    const atkLead = attackerOfficer ? attackerOfficer.leadership : 60;
    const atkMight = attackerOfficer ? attackerOfficer.might : 55;
    const defLead = defenderOfficer ? defenderOfficer.leadership : 55;
    const atkMorale = fromCity.morale || 65;
    const defMorale = targetCity.morale || 65;
    const atkTraining = fromCity.training || 65;
    const defTraining = targetCity.training || 65;
    const atkSkill = getSkillProfile(attackerSkill);
    const defSkill = getSkillProfile(defenderSkill);
    const atkCounter = getCounterFactor(atkUnit, defUnit);
    const defCounter = getCounterFactor(defUnit, atkUnit);
    const atkTerrain = getTerrainFactor(terrainType, atkUnit);
    const defTerrain = getTerrainFactor(terrainType, defUnit);

    const atkPower = fromCity.troops * (0.72 + atkLead / 120 + atkMight / 240) * (0.8 + clamp(atkMorale / 100, 0.35, 1)) * (0.82 + clamp(atkTraining / 120, 0.3, 1)) * (1 + atkSkill.attack) * atkCounter * atkTerrain;
    const defPower = targetCity.troops * (0.74 + defLead / 120 + targetCity.defense / 150) * (0.8 + clamp(defMorale / 100, 0.35, 1)) * (0.82 + clamp(defTraining / 120, 0.3, 1)) * (1 + defSkill.defense) * defCounter * defTerrain;
    const pressure = atkPower / Math.max(1, defPower);
    const phaseText = pressure >= 1.12 ? '攻方压制' : pressure <= 0.9 ? '守方稳固' : '势均力敌';
    const terrainHint = atkTerrain >= defTerrain ? '更利于攻方兵种展开' : '更利于守方据险周旋';
    const estAtkLoss = Math.max(80, Math.floor(fromCity.troops * (pressure >= 1 ? 0.24 : 0.34)));
    const estDefLoss = Math.max(80, Math.floor(targetCity.troops * (pressure >= 1 ? 0.36 : 0.24)));

    const rounds = [
      {
        title: '第1回合 · 前阵接触',
        text: '攻方主帅'+(attackerOfficer ? attackerOfficer.nameZh : '先锋')+'（统'+atkLead+' 武'+atkMight+'）率'+unitTypeLabel(atkUnit)+'压向'+terrain+'，守方'+(defenderOfficer ? defenderOfficer.nameZh : '守将')+'（统'+defLead+'）组织迎击，当前态势：'+phaseText+'。'
      },
      {
        title: '第2回合 · 主帅用技',
        text: '攻方发动【'+attackerSkill+'】('+atkSkill.desc+')，守方以【'+defenderSkill+'】('+defSkill.desc+')应对；技能换算后攻/守系数约为 '+(1+atkSkill.attack).toFixed(2)+' / '+(1+defSkill.defense).toFixed(2)+'。'
      },
      {
        title: '第3回合 · 兵种与地形',
        text: unitTypeLabel(atkUnit)+' 对 '+unitTypeLabel(defUnit)+' 的克制系数 '+atkCounter.toFixed(2)+' / '+defCounter.toFixed(2)+'，'+terrain+' 地形修正 '+atkTerrain.toFixed(2)+' / '+defTerrain.toFixed(2)+'，此地'+terrainHint+'。'
      },
      {
        title: '第4回合 · 战果预估',
        text: '按当前主帅能力、技能、兵种与地形综合推演：预估攻方折损约'+estAtkLoss+'，守方折损约'+estDefLoss+'。点击“结算战斗”将进入正式判定。'
      }
    ];
    return {
      rounds: rounds,
      currentRound: 0,
      finished: false,
      attacker: { name: attackerOfficer ? attackerOfficer.nameZh : (state.forces[fromCity.ownerForceId]||{}).nameZh || '攻方', unitType: unitTypeLabel(atkUnit), skill: attackerSkill },
      defender: { name: defenderOfficer ? defenderOfficer.nameZh : (state.forces[targetCity.ownerForceId]||{}).nameZh || '守方', unitType: unitTypeLabel(defUnit), skill: defenderSkill },
      terrain: terrain,
    };
  }

  function openGame(game) {
    appState.game = game;
    appState.screen = game.gameOver ? 'game-over' : 'game';
    appState.currentPanel = 'civil';
    appState.pendingBattleAction = null;
    appState.battlePreview = null;
    render();
  }

  const handlers = {
    newGame: function () {
      appState.screen = 'select-force';
      appState.pendingBattleAction = null;
      appState.battlePreview = null;
      setNotice('');
      render();
    },
    continueAuto: function () {
      const saved = storageApi.loadGame('auto');
      if (!saved) {
        setNotice('最近进度为空。', 'bad');
        appState.screen = 'title';
        render();
        safePlay('bad');
        return;
      }
      setNotice('已读取最近进度。');
      openGame(saved);
      playFeedback();
    },
    backTitle: function () {
      appState.screen = 'title';
      appState.pendingBattleAction = null;
      appState.battlePreview = null;
      setNotice('');
      render();
    },
    loadSlot: function (slotId) {
      const saved = storageApi.loadGame(slotId);
      if (!saved) {
        setNotice('该槽位暂无内容。', 'bad');
        appState.screen = 'title';
        render();
        safePlay('bad');
        return;
      }
      setNotice('已读取手动槽位 ' + slotId + '。');
      openGame(saved);
      playFeedback();
    },
    chooseForce: function (forceId) {
      safeEnsureAudio();
      const game = gameApi.createNewGame(forceId);
      try {
        storageApi.saveGame('auto', game);
      } catch (error) {
        console.warn('auto save failed', error);
      }
      setNotice('新局已开。');
      openGame(game);
      playFeedback();
    },
    selectCity: function (cityId) {
      if (!appState.game) {
        return;
      }
      safeEnsureAudio();
      appState.game = gameApi.applyAction(appState.game, { type: 'selectCity', cityId: cityId });
      render();
      safePlay('action');
    },
    setPanel: function (panelId) {
      appState.currentPanel = panelId || 'civil';
      render();
      safePlay('action');
    },
    gameAction: function (action) {
      if (!appState.game) {
        return;
      }
      safeEnsureAudio();

      if (action.type === 'attack') {
        appState.pendingBattleAction = {
          type: 'attack',
          targetCityId: action.targetCityId,
          targetForceId: action.targetForceId || null,
        };
        appState.screen = 'battle';
        render();
        safePlay('battle');
        return;
      }

      try {
        appState.game = action.type === 'endTurn' && gameApi.safeEndTurn
          ? gameApi.safeEndTurn(appState.game)
          : gameApi.applyAction(appState.game, action);
      } catch (error) {
        console.error(error);
        setNotice('本月结算出现异常，已保留当前进度。请重试。', 'bad');
        render();
        safePlay('bad');
        return;
      }

      if (action.type === 'endTurn') {
        try {
          storageApi.saveGame('auto', appState.game);
        } catch (error) {
          console.warn('auto save failed', error);
        }
        setNotice('月度结算已完成，并自动保存。');
        safePlay('event');
      } else {
        setNotice('');
        playFeedback();
      }

      if (appState.game.gameOver) {
        try {
          storageApi.saveGame('auto', appState.game);
        } catch (error) {
          console.warn('auto save failed', error);
        }
        appState.screen = 'game-over';
      }

      render();
    },
    startBattle: function () {
      if (!appState.game || !appState.pendingBattleAction) {
        return;
      }
      appState.battlePreview = buildBattlePreview(appState.game, appState.pendingBattleAction);
      appState.screen = 'battlefield';
      setNotice('');
      render();
      safePlay('battle');
    },
    nextBattleRound: function () {
      if (!appState.battlePreview || !appState.battlePreview.rounds || !appState.battlePreview.rounds.length) {
        return;
      }
      const maxIndex = appState.battlePreview.rounds.length - 1;
      appState.battlePreview.currentRound = Math.min(maxIndex, (appState.battlePreview.currentRound || 0) + 1);
      appState.battlePreview.finished = appState.battlePreview.currentRound >= maxIndex;
      render();
      safePlay('action');
    },
    resolveBattle: function () {
      if (!appState.game || !appState.pendingBattleAction) {
        return;
      }
      safeEnsureAudio();
      try {
        appState.game = gameApi.applyAction(appState.game, appState.pendingBattleAction);
      } catch (error) {
        console.error(error);
        setNotice('战斗结算失败，请稍后再试。', 'bad');
        appState.screen = 'game';
        appState.pendingBattleAction = null;
        render();
        safePlay('bad');
        return;
      }
      appState.pendingBattleAction = null;
      appState.battlePreview = null;
      appState.screen = appState.game.gameOver ? 'game-over' : 'game';
      setNotice('');
      playFeedback();
      render();
    },
    cancelBattle: function () {
      appState.pendingBattleAction = null;
      appState.battlePreview = null;
      appState.screen = 'game';
      setNotice('已取消出征。');
      render();
      safePlay('action');
    },
    saveSlot: function (slotId) {
      if (!appState.game) {
        return;
      }
      try {
        storageApi.saveGame(slotId, appState.game);
        setNotice('已写入手动槽位 ' + slotId + '。');
      } catch (error) {
        setNotice('写入存档失败。', 'bad');
        console.warn('save slot failed', error);
      }
      render();
      safePlay('action');
    },
    toggleAudio: function () {
      if (!audio) {
        return;
      }
      let enabled = false;
      try {
        enabled = audio.toggle();
      } catch (error) {
        console.warn('audio toggle failed', error);
      }
      appState.audioEnabled = enabled;
      setNotice(enabled ? '音效已开启。' : '音效已关闭。');
      render();
      if (enabled) {
        safePlay('action');
      }
    },
    toggleFullscreen: function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(function () {
          syncFullscreen();
          render();
        }).catch(function () {
          setNotice('浏览器未允许进入全屏。', 'bad');
          render();
          safePlay('bad');
        });
        return;
      }
      document.exitFullscreen().then(function () {
        syncFullscreen();
        render();
      });
    },
  };

  document.addEventListener('fullscreenchange', function () {
    syncFullscreen();
    render();
  });

  render();
})();

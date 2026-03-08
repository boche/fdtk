(function () {
  const root = document.getElementById('app');
  const gameApi = window.FDTK.game;
  const storageApi = window.FDTK.storage;
  const ui = window.FDTK.ui;

  const appState = {
    screen: 'title',
    game: null,
    notice: '',
    noticeTone: 'normal',
  };

  function setNotice(message, tone) {
    appState.notice = message;
    appState.noticeTone = tone || 'normal';
  }

  function render() {
    ui.renderApp(root, appState, handlers);
  }

  function openGame(game) {
    appState.game = game;
    appState.screen = game.gameOver ? 'game-over' : 'game';
    render();
  }

  const handlers = {
    newGame: function () {
      appState.screen = 'select-force';
      setNotice('');
      render();
    },
    continueAuto: function () {
      const saved = storageApi.loadGame('auto');
      if (!saved) {
        setNotice('最近进度为空。', 'bad');
        appState.screen = 'title';
        render();
        return;
      }
      setNotice('已读取最近进度。');
      openGame(saved);
    },
    backTitle: function () {
      appState.screen = 'title';
      setNotice('');
      render();
    },
    loadSlot: function (slotId) {
      const saved = storageApi.loadGame(slotId);
      if (!saved) {
        setNotice('该槽位暂无内容。', 'bad');
        appState.screen = 'title';
        render();
        return;
      }
      setNotice('已读取手动槽位 ' + slotId + '。');
      openGame(saved);
    },
    chooseForce: function (forceId) {
      const game = gameApi.createNewGame(forceId);
      storageApi.saveGame('auto', game);
      setNotice('新局已开。');
      openGame(game);
    },
    selectCity: function (cityId) {
      if (!appState.game) {
        return;
      }
      appState.game = gameApi.applyAction(appState.game, { type: 'selectCity', cityId: cityId });
      render();
    },
    gameAction: function (action) {
      if (!appState.game) {
        return;
      }
      appState.game = gameApi.applyAction(appState.game, action);
      if (action.type === 'endTurn') {
        storageApi.saveGame('auto', appState.game);
        setNotice('月度结算已完成，并自动保存。');
      } else {
        setNotice('');
      }
      if (appState.game.gameOver) {
        storageApi.saveGame('auto', appState.game);
        appState.screen = 'game-over';
      }
      render();
    },
    saveSlot: function (slotId) {
      if (!appState.game) {
        return;
      }
      storageApi.saveGame(slotId, appState.game);
      setNotice('已写入手动槽位 ' + slotId + '。');
      render();
    },
  };

  render();
})();

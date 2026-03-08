(function () {
  const KEY_PREFIX = 'fdtk-save-';

  function saveGame(slotId, state) {
    const payload = {
      savedAt: new Date().toISOString(),
      slotId,
      game: state,
    };
    localStorage.setItem(KEY_PREFIX + slotId, JSON.stringify(payload));
  }

  function loadGame(slotId) {
    const raw = localStorage.getItem(KEY_PREFIX + slotId);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed.game || null;
    } catch (error) {
      return null;
    }
  }

  function loadMeta(slotId) {
    const raw = localStorage.getItem(KEY_PREFIX + slotId);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        slotId,
        savedAt: parsed.savedAt,
        year: parsed.game ? parsed.game.year : null,
        month: parsed.game ? parsed.game.month : null,
        playerForceId: parsed.game ? parsed.game.playerForceId : null,
      };
    } catch (error) {
      return null;
    }
  }

  function listSaves() {
    return ['1', '2', '3'].map(loadMeta).filter(Boolean);
  }

  function clearGame(slotId) {
    localStorage.removeItem(KEY_PREFIX + slotId);
  }

  window.FDTK = window.FDTK || {};
  window.FDTK.storage = {
    saveGame,
    loadGame,
    loadMeta,
    listSaves,
    clearGame,
  };
})();

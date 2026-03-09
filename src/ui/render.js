(function () {
  const TEXT = window.FDTK.TEXT;
  const SCENARIO = window.FDTK.SCENARIO;
  const formatters = window.FDTK.formatters;
  const gameApi = window.FDTK.game;
  const storageApi = window.FDTK.storage;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderTitle(appState) {
    const autoSave = storageApi.loadMeta('auto');
    const slots = storageApi.listSaves();
    const autoForceName = autoSave && SCENARIO.forces.find(function (force) { return force.id === autoSave.playerForceId; });

    return `
      <div class="screen">
        <section class="hero">
          <div class="hero-card">
            <h1 class="hero-title">${escapeHtml(TEXT.title)}</h1>
            <p class="hero-subtitle">${escapeHtml(TEXT.subtitle)}</p>
            <p class="hero-note">${escapeHtml(TEXT.intro)}</p>
            <div class="hero-section">
              <h2>开始</h2>
              <div class="hero-actions">
                <button data-view-action="new-game">${escapeHtml(TEXT.menu.newGame)}</button>
                <button data-view-action="continue-auto" ${autoSave ? '' : 'disabled'}>${escapeHtml(TEXT.menu.continueGame)}</button>
              </div>
              ${autoSave ? `<p class="hero-note">${escapeHtml(TEXT.menu.autoSave)}：${escapeHtml((autoForceName ? autoForceName.nameZh : '未知势力') + ' · ' + autoSave.year + '年' + autoSave.month + '月')}</p>` : `<p class="hero-note">${escapeHtml(TEXT.menu.noSave)}</p>`}
            </div>
            <div class="hero-section">
              <h2>读取手动存档</h2>
              <div class="slot-grid">
                ${['1', '2', '3'].map(function (slotId) {
                  const slot = slots.find(function (item) { return item.slotId === slotId; });
                  const force = slot && SCENARIO.forces.find(function (item) { return item.id === slot.playerForceId; });
                  const label = slot ? ((force ? force.nameZh : '未知势力') + ' · ' + slot.year + '年' + slot.month + '月') : TEXT.menu.noSave;
                  return `<button data-view-action="load-slot" data-slot-id="${slotId}" ${slot ? '' : 'disabled'}>${escapeHtml(TEXT.menu.slot + ' ' + slotId)}<br /><small>${escapeHtml(label)}</small></button>`;
                }).join('')}
              </div>
            </div>
            ${appState.notice ? `<div class="notice ${appState.noticeTone === 'bad' ? 'bad' : ''}">${escapeHtml(appState.notice)}</div>` : ''}
          </div>
        </section>
      </div>
    `;
  }

  function renderForceSelect(appState) {
    return `
      <div class="screen">
        <section class="force-select">
          <h1>${escapeHtml(TEXT.menu.chooseForce)}</h1>
          <p>此版为极简剧本“${escapeHtml(SCENARIO.nameZh)}”，共 ${SCENARIO.cities.length} 城、${SCENARIO.forces.length} 势力。</p>
          <div class="force-grid">
            ${SCENARIO.forces.map(function (force) {
              return `
                <div class="force-card">
                  <h3>${escapeHtml(force.nameZh)}</h3>
                  <p>${escapeHtml(TEXT.forceDescriptions[force.id] || '乱世一隅，静待抉择。')}</p>
                  <div class="footer-row">
                    <span class="force-tag"><span class="swatch" style="background:${escapeHtml(force.color)}"></span> ${escapeHtml(force.nameZh)}</span>
                    <button data-force-id="${escapeHtml(force.id)}">以此开局</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="footer-row">
            <span class="badge">君主视角 · 节点地图 · 自动战斗</span>
            <button data-view-action="back-title">${escapeHtml(TEXT.menu.back)}</button>
          </div>
          ${appState.notice ? `<div class="notice ${appState.noticeTone === 'bad' ? 'bad' : ''}">${escapeHtml(appState.notice)}</div>` : ''}
        </section>
      </div>
    `;
  }

  function buildMapSvg(state) {
    const cityEntries = Object.values(state.cities);
    const links = [];
    const seen = {};
    cityEntries.forEach(function (city) {
      city.neighbors.forEach(function (neighborId) {
        const pairKey = [city.id, neighborId].sort().join(':');
        if (seen[pairKey]) {
          return;
        }
        seen[pairKey] = true;
        const neighbor = state.cities[neighborId];
        if (neighbor) {
          links.push(`<line class="link-line" x1="${city.x}" y1="${city.y}" x2="${neighbor.x}" y2="${neighbor.y}" />`);
        }
      });
    });

    const nodes = cityEntries.map(function (city) {
      const owner = state.forces[city.ownerForceId];
      const selected = state.selectedCityId === city.id ? 'selected' : '';
      const player = city.ownerForceId === state.playerForceId ? 'player' : '';
      return `
        <g class="city-node ${selected} ${player}" data-city-id="${escapeHtml(city.id)}">
          <circle cx="${city.x}" cy="${city.y}" r="24" fill="rgba(255,247,231,0.92)"></circle>
          <circle cx="${city.x}" cy="${city.y}" r="18" fill="${escapeHtml(owner ? owner.color : '#999999')}"></circle>
          <text x="${city.x}" y="${city.y + 42}" text-anchor="middle" fill="#2a190f">${escapeHtml(city.nameZh)}</text>
        </g>
      `;
    }).join('');

    return `
      <svg class="map-svg" viewBox="60 40 620 500" preserveAspectRatio="xMidYMid meet">
        ${links.join('')}
        ${nodes}
      </svg>
    `;
  }

  function renderGame(appState) {
    const state = appState.game;
    const playerForceOverview = gameApi.getForceOverview(state, state.playerForceId);
    const cityView = gameApi.getCityView(state, state.selectedCityId);
    const actions = gameApi.getAvailableActions(state);
    const playerForce = playerForceOverview.force;

    function findAction(id) {
      return actions.find(function (action) { return action.id === id; }) || { enabled: false, options: [] };
    }

    const forceTags = Object.values(state.forces)
      .filter(function (force) { return force.alive; })
      .map(function (force) {
        return `<span class="force-tag"><span class="swatch" style="background:${escapeHtml(force.color)}"></span>${escapeHtml(force.nameZh)}</span>`;
      }).join('');

    return `
      <div class="screen game-shell">
        <div class="topbar">
          <div>
            <h1>${escapeHtml(TEXT.title)}</h1>
            <small>${escapeHtml(formatters.monthLabel(state.year, state.month))} · ${escapeHtml(playerForce.nameZh)} · ${escapeHtml(formatters.actionUsage(state))}</small>
          </div>
          <div class="topbar-actions">
            <button data-save-slot="1">存 1</button>
            <button data-save-slot="2">存 2</button>
            <button data-save-slot="3">存 3</button>
            <button data-view-action="back-title">${escapeHtml(TEXT.menu.back)}</button>
          </div>
        </div>

        <div class="main-layout">
          <div class="map-card">
            <div class="map-caption">点击城池查看并下令</div>
            ${buildMapSvg(state)}
          </div>

          <div class="side-stack">
            <section class="side-card">
              <h3>${escapeHtml(playerForce.nameZh)}总览</h3>
              <div class="stats-grid">
                <div class="stat-pill"><strong>${escapeHtml(TEXT.labels.gold)}</strong>${playerForce.gold}</div>
                <div class="stat-pill"><strong>${escapeHtml(TEXT.labels.food)}</strong>${playerForce.food}</div>
                <div class="stat-pill"><strong>${escapeHtml(TEXT.labels.cities)}</strong>${playerForceOverview.cities.length}</div>
                <div class="stat-pill"><strong>${escapeHtml(TEXT.labels.officersCount)}</strong>${playerForceOverview.officers.length}</div>
                <div class="stat-pill"><strong>${escapeHtml(TEXT.labels.troops)}</strong>${playerForceOverview.troops}</div>
                <div class="stat-pill"><strong>${escapeHtml(TEXT.labels.alive)}</strong>在局</div>
              </div>
              <div class="legend">${forceTags}</div>
              <p class="hero-note">${escapeHtml(TEXT.game.continueHint)}</p>
              ${appState.notice ? `<div class="notice ${appState.noticeTone === 'bad' ? 'bad' : ''}">${escapeHtml(appState.notice)}</div>` : ''}
            </section>

            <section class="side-card">
              <div class="city-header">
                <div>
                  <h3>${escapeHtml(cityView.city.nameZh)}</h3>
                  <span class="badge">${escapeHtml(getForceName(state, cityView.city.ownerForceId))}</span>
                </div>
                ${cityView.city.ownerForceId === state.playerForceId ? '<span class="badge">可下令</span>' : '<span class="badge">敌方城池</span>'}
              </div>
              <div class="meta-row"><span>${escapeHtml(TEXT.labels.troops)}</span><strong>${cityView.city.troops}</strong></div>
              <div class="meta-row"><span>${escapeHtml(TEXT.labels.order)}</span><strong>${cityView.city.order}</strong></div>
              <div class="meta-row"><span>${escapeHtml(TEXT.labels.defense)}</span><strong>${cityView.city.defense}</strong></div>
              <div class="meta-row"><span>${escapeHtml(TEXT.labels.loyalty)}</span><strong>${cityView.city.loyalty}</strong></div>
              <div class="meta-row"><span>${escapeHtml(TEXT.labels.development)}</span><strong>${cityView.city.development}</strong></div>
              <div class="meta-row"><span>${escapeHtml(TEXT.labels.battleFront)}</span><strong>${cityView.frontierPressure}</strong></div>
              <div class="hero-section">
                <h3>${escapeHtml(TEXT.labels.officers)}</h3>
                <div class="list-grid">
                  ${cityView.officers.map(function (officer) {
                    return `<div class="city-officer">${escapeHtml(officer.nameZh)} · 统${officer.leadership} 政${officer.politics} · ${escapeHtml(TEXT.labels.unitType)}:${escapeHtml(officer.unitTypeLabel || (officer.unitType === 'cavalry' ? '骑兵' : officer.unitType === 'archer' ? '弓兵' : '步兵'))} · ${escapeHtml(TEXT.labels.specialSkill)}:${escapeHtml(officer.specialSkill || '坚守')}</div>`;
                  }).join('') || '<div class="city-officer">暂无驻城人物</div>'}
                </div>
              </div>
              <div class="hero-section">
                <h3>${escapeHtml(TEXT.labels.wanderers)}</h3>
                <div class="list-grid">
                  ${cityView.wanderers.map(function (officer) {
                    return `<div class="city-officer">${escapeHtml(officer.nameZh)} · 智${officer.intellect} 政${officer.politics} · ${escapeHtml(TEXT.labels.unitType)}:${escapeHtml(officer.unitTypeLabel || (officer.unitType === 'cavalry' ? '骑兵' : officer.unitType === 'archer' ? '弓兵' : '步兵'))} · ${escapeHtml(TEXT.labels.specialSkill)}:${escapeHtml(officer.specialSkill || '坚守')}</div>`;
                  }).join('') || '<div class="city-officer">暂无游士</div>'}
                </div>
              </div>
            </section>

            <section class="side-card">
              <h3>${escapeHtml(TEXT.labels.monthPlan)}</h3>
              <div class="action-group">
                <h4>内政</h4>
                <div class="city-actions">
                  ${['develop', 'tax'].map(function (actionId) {
                    const action = findAction(actionId);
                    return `<button data-game-action="${actionId}" ${action.enabled ? '' : 'disabled'}>${escapeHtml(action.label)}</button>`;
                  }).join('')}
                </div>
              </div>
              <div class="action-group">
                <h4>军政</h4>
                <div class="city-actions">
                  ${['recruit', 'appoint', 'hire'].map(function (actionId) {
                    const action = findAction(actionId);
                    return `<button data-game-action="${actionId}" ${action.enabled ? '' : 'disabled'}>${escapeHtml(action.label)}</button>`;
                  }).join('')}
                </div>
              </div>
              <div class="action-group">
                <h4>出征</h4>
                <div class="attack-grid">
                  ${findAction('attack').options.map(function (option) {
                    return `<button data-game-action="attack" data-target-city-id="${escapeHtml(option.cityId)}" ${findAction('attack').enabled ? '' : 'disabled'}>${escapeHtml(option.label)}</button>`;
                  }).join('') || '<div class="city-officer">暂无可攻目标</div>'}
                </div>
              </div>
              <div class="action-group">
                <h4>停战</h4>
                <div class="attack-grid">
                  ${findAction('truce').options.map(function (option) {
                    return `<button data-game-action="truce" data-target-force-id="${escapeHtml(option.forceId)}" ${findAction('truce').enabled ? '' : 'disabled'}>${escapeHtml(option.label)}</button>`;
                  }).join('') || '<div class="city-officer">暂无邻国可议和</div>'}
                </div>
              </div>
              <div class="footer-row">
                <span class="badge">${escapeHtml(formatters.actionUsage(state))}</span>
                <button data-game-action="endTurn">${escapeHtml(TEXT.game.endTurn)}</button>
              </div>
            </section>
          </div>
        </div>

        <section class="log-card">
          <h3>月度日志</h3>
          <div class="log-list">
            ${state.logs.map(function (entry) {
              return `<div class="log-entry"><small>${escapeHtml(entry.time)}</small>${escapeHtml(entry.text)}</div>`;
            }).join('')}
          </div>
        </section>
      </div>
    `;
  }

  function getForceName(state, forceId) {
    return state.forces[forceId] ? state.forces[forceId].nameZh : '无主';
  }

  function renderGameOver(appState) {
    const result = appState.game && appState.game.gameOver ? appState.game.gameOver : { win: false, title: '结束', body: '本局已告一段落。' };
    return `
      <div class="screen">
        <section class="game-over">
          <div class="game-over-card">
            <h2>${escapeHtml(result.title)}</h2>
            <p>${escapeHtml(result.body)}</p>
            <div class="hero-actions">
              <button data-view-action="new-game">再起一局</button>
              <button data-view-action="back-title">${escapeHtml(TEXT.menu.back)}</button>
              <button data-view-action="continue-auto">读取最近进度</button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function bind(root, appState, handlers) {
    root.querySelectorAll('[data-view-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        const action = button.getAttribute('data-view-action');
        const slotId = button.getAttribute('data-slot-id');
        if (action === 'new-game') handlers.newGame();
        if (action === 'continue-auto') handlers.continueAuto();
        if (action === 'back-title') handlers.backTitle();
        if (action === 'load-slot') handlers.loadSlot(slotId);
      });
    });

    root.querySelectorAll('[data-force-id]').forEach(function (button) {
      button.addEventListener('click', function () {
        handlers.chooseForce(button.getAttribute('data-force-id'));
      });
    });

    root.querySelectorAll('[data-city-id]').forEach(function (element) {
      element.addEventListener('click', function () {
        handlers.selectCity(element.getAttribute('data-city-id'));
      });
    });

    root.querySelectorAll('[data-game-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        const type = button.getAttribute('data-game-action');
        handlers.gameAction({
          type: type,
          targetCityId: button.getAttribute('data-target-city-id'),
          targetForceId: button.getAttribute('data-target-force-id'),
        });
      });
    });

    root.querySelectorAll('[data-save-slot]').forEach(function (button) {
      button.addEventListener('click', function () {
        handlers.saveSlot(button.getAttribute('data-save-slot'));
      });
    });
  }

  function renderApp(root, appState, handlers) {
    if (appState.screen === 'title') {
      root.innerHTML = renderTitle(appState);
      bind(root, appState, handlers);
      return;
    }

    if (appState.screen === 'select-force') {
      root.innerHTML = renderForceSelect(appState);
      bind(root, appState, handlers);
      return;
    }

    if (appState.screen === 'game-over') {
      root.innerHTML = renderGameOver(appState);
      bind(root, appState, handlers);
      return;
    }

    root.innerHTML = renderGame(appState);
    bind(root, appState, handlers);
  }

  window.FDTK = window.FDTK || {};
  window.FDTK.ui = {
    renderApp,
  };
})();

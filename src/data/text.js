(function () {
  const TEXT = {
    title: '藩镇图开',
    subtitle: '五代十国极简单机策略游戏',
    intro: '你将以一方君主或节度使的身份，在军镇林立、王朝更替的乱世中经营城池、延揽人才、出兵攻伐。此版只保留最小可玩循环：每月处理一项内政与一项军政决策，然后看天下如何变动。',
    menu: {
      newGame: '新开一局',
      continueGame: '继续上局',
      chooseForce: '选择势力',
      loadSlot: '读取槽位',
      noSave: '暂无存档',
      autoSave: '最近进度',
      slot: '手动槽位',
      back: '返回标题',
    },
    game: {
      civilUsed: '本月内政已用',
      strategicUsed: '本月军政已用',
      endTurn: '结束本月',
      save: '存档',
      continueHint: '本页右上角可手动存档，月底会自动保存最近进度。',
      noSelection: '请先在地图上点选一座城池。',
      lockedCivil: '本月内政次数已用尽。',
      lockedStrategic: '本月军政次数已用尽。',
      gameOverWin: '天下归一',
      gameOverLose: '国祚断绝',
    },
    actions: {
      develop: '开发',
      tax: '征税',
      recruit: '征兵',
      appoint: '任命',
      hire: '招揽',
      attack: '出征',
      truce: '停战',
    },
    labels: {
      gold: '金',
      food: '粮',
      troops: '兵力',
      order: '治安',
      defense: '城防',
      loyalty: '忠诚',
      development: '开发',
      capital: '都城',
      owner: '所属',
      neighbors: '邻接',
      officers: '在城人物',
      reserve: '待任人物',
      wanderers: '可招揽人物',
      cities: '城池',
      officersCount: '人物',
      alive: '存续',
      monthPlan: '本月指令',
      battleFront: '前线压力',
    },
    forceDescriptions: {
      houtang: '后唐据中原与河东，兵锋最盛，但四邻皆敌，若稍有失势，北线即会松动。',
      wu: '吴据江淮，财赋充足，擅守善养，若能稳住扬州，可徐图中原。',
      wuyue: '吴越地小而富，杭州城坚，适合以厚财缓攻。',
      min: '闽国山海相依，人才不多，却易得海贸之利与地方忠附。',
      nanhan: '南汉偏居岭南，远离北方乱局，扩张慢，但不易猝亡。',
    },
    events: {
      founding_houtang: {
        title: '后唐新立',
        body: '李存勖据洛阳称帝，中原局势一变。后唐诸镇军心振奋，府库亦获整饬。',
      },
      north_muster: {
        title: '北地点兵',
        body: '北地军镇按例点兵，边城备战之气转盛。',
      },
      spring_harvest: {
        title: '江南春熟',
        body: '江南风调雨顺，稻谷渐熟，得粮者民心稍安。',
      },
      min_trade: {
        title: '闽海商舶',
        body: '海舶抵闽，市肆兴盛，得其利者金帛渐增。',
      },
      sea_trade: {
        title: '南海互市',
        body: '南海互市通畅，临海诸城获利颇丰。',
      },
      summer_heat: {
        title: '暑疫流行',
        body: '暑热侵城，人心稍散，若不安民，治安易生动摇。',
      },
      scholar_arrives: {
        title: '流士来投',
        body: '乱世之中，读书人与游士择主而事，一位无主之士暂寓城中。',
      },
      autumn_horses: {
        title: '秋马可用',
        body: '秋高马壮，北地军队得以补骑整伍。',
      },
      tax_resistance: {
        title: '民间怨税',
        body: '诸地多有征敛，富庶之地稍现怨言，须防忠附渐失。',
      },
      winter_storage: {
        title: '冬藏入库',
        body: '秋粮既毕，仓廪稍实，能守者更能守。',
      },
      new_year_amnesty: {
        title: '岁首宽诏',
        body: '新岁之初，若能稍行宽恤，城中忠附可得回升。',
      },
      unified: {
        title: '海内归一',
        body: '诸镇尽平，天下终归一统。',
      },
      defeated: {
        title: '宗社已绝',
        body: '最后一城失守，国祚由此而终。',
      },
    },
  };

  const formatters = {
    monthLabel(year, month) {
      return year + '年' + month + '月';
    },
    saveLabel(slotId) {
      return slotId === 'auto' ? TEXT.menu.autoSave : TEXT.menu.slot + ' ' + slotId;
    },
    actionUsage(state) {
      const civil = state.monthFlags.civilUsed ? '已用' : '未用';
      const strategic = state.monthFlags.strategicUsed ? '已用' : '未用';
      return '内政：' + civil + ' / 军政：' + strategic;
    },
    citySummary(city) {
      return city.nameZh + ' · 兵' + city.troops + ' / 安' + city.order + ' / 防' + city.defense;
    },
    battleLog(attackerName, targetName, report) {
      return attackerName + '攻打' + targetName + '，' + report;
    },
  };

  window.FDTK = window.FDTK || {};
  window.FDTK.TEXT = TEXT;
  window.FDTK.formatters = formatters;
})();

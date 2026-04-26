(function () {
  function force(id, nameZh, color, capitalCityId, rulerOfficerId, gold, food) {
    return { id, nameZh, color, capitalCityId, rulerOfficerId, gold, food, truces: {}, alive: true };
  }

  function city(id, nameZh, x, y, ownerForceId, neighbors, troops, order, defense, loyalty, development, terrain, training, morale) {
    return {
      id,
      nameZh,
      x,
      y,
      ownerForceId,
      neighbors,
      troops,
      order,
      defense,
      loyalty,
      development,
      terrain: terrain || 'plain',
      training: training || 65,
      morale: morale || 68,
    };
  }

  function officer(id, nameZh, forceId, cityId, role, leadership, might, intellect, politics, loyalty, assigned, unitType, specialSkill) {
    const resolvedUnitType = unitType || (might >= 75 ? 'cavalry' : intellect >= 78 ? 'archer' : 'infantry');
    const resolvedSpecialSkill = specialSkill || (leadership >= 85 ? '治军' : might >= 80 ? '突击' : intellect >= 82 ? '火计' : politics >= 84 ? '统筹' : '坚守');
    return {
      id,
      nameZh,
      forceId,
      cityId,
      role,
      leadership,
      might,
      intellect,
      politics,
      loyalty,
      assigned,
      unitType: resolvedUnitType,
      specialSkill: resolvedSpecialSkill,
    };
  }

  const forces = [
    force('houtang', '后唐', '#a33d2f', 'luoyang', 'li-cunxu', 220, 280),
    force('wu', '吴', '#2f6d7e', 'yangzhou', 'xu-zhigao', 240, 320),
    force('wuyue', '吴越', '#5f8b4c', 'hangzhou', 'qian-liu', 210, 260),
    force('min', '闽', '#8e5b36', 'fuzhou', 'wang-yanhan', 180, 230),
    force('nanhan', '南汉', '#7d4d8e', 'guangzhou', 'liu-yan', 200, 270),
  ];

  const cities = [
    city('kaifeng', '开封', 365, 210, 'houtang', ['luoyang', 'weizhou', 'yangzhou'], 260, 72, 64, 70, 3, 'plain', 72, 74),
    city('luoyang', '洛阳', 290, 220, 'houtang', ['kaifeng', 'taiyuan', 'chengdu'], 320, 78, 70, 76, 4, 'plain', 76, 78),
    city('taiyuan', '太原', 260, 118, 'houtang', ['luoyang', 'weizhou', 'youzhou'], 280, 75, 68, 73, 3, 'mountain', 74, 75),
    city('weizhou', '魏州', 362, 132, 'houtang', ['kaifeng', 'taiyuan', 'youzhou'], 240, 68, 61, 66, 3, 'plain', 66, 68),
    city('youzhou', '幽州', 450, 84, 'houtang', ['weizhou', 'taiyuan'], 220, 65, 58, 64, 2, 'mountain', 69, 67),
    city('chengdu', '成都', 122, 286, 'wu', ['luoyang', 'yangzhou'], 210, 74, 62, 71, 4, 'mountain', 70, 71),
    city('yangzhou', '扬州', 442, 266, 'wu', ['kaifeng', 'chengdu', 'hangzhou', 'fuzhou'], 260, 78, 60, 75, 4, 'plain', 73, 75),
    city('hangzhou', '杭州', 516, 326, 'wuyue', ['yangzhou', 'fuzhou', 'guangzhou'], 180, 80, 68, 79, 4, 'water', 75, 77),
    city('fuzhou', '福州', 590, 372, 'min', ['yangzhou', 'hangzhou', 'guangzhou'], 170, 76, 57, 77, 3, 'water', 68, 74),
    city('guangzhou', '广州', 508, 474, 'nanhan', ['hangzhou', 'fuzhou'], 240, 74, 65, 74, 4, 'water', 72, 73),
  ];

  const officers = [
    officer('li-cunxu', '李存勖', 'houtang', 'luoyang', '君主', 92, 88, 72, 66, 95, true, 'cavalry', '治军'),
    officer('guo-chongtao', '郭崇韬', 'houtang', 'luoyang', '谋臣', 74, 52, 86, 90, 87, true, 'archer', '统筹'),
    officer('li-siyuan', '李嗣源', 'houtang', 'kaifeng', '宿将', 89, 83, 70, 62, 85, true, 'cavalry', '突击'),
    officer('li-congke', '李从珂', 'houtang', 'weizhou', '将领', 81, 79, 58, 51, 78, true, 'infantry', '突击'),
    officer('zhou-dewei', '周德威', 'houtang', 'taiyuan', '边将', 86, 80, 68, 55, 84, true, 'cavalry', '治军'),
    officer('an-chonghui', '安重诲', 'houtang', 'luoyang', '近臣', 62, 41, 82, 84, 82, false, 'archer', '统筹'),
    officer('ren-huan', '任圜', 'houtang', 'luoyang', '文臣', 55, 32, 80, 88, 76, false, 'archer', '统筹'),
    officer('kang-yanxiao', '康延孝', 'houtang', 'youzhou', '边将', 78, 74, 52, 48, 70, true, 'cavalry', '突击'),
    officer('li-cunshen', '李存审', 'houtang', 'taiyuan', '宿将', 84, 76, 61, 57, 79, true, 'cavalry', '坚守'),
    officer('zhang-xian', '张宪', 'houtang', 'kaifeng', '将领', 72, 69, 49, 43, 68, false, 'infantry', '坚守'),

    officer('xu-zhigao', '徐知诰', 'wu', 'yangzhou', '执政', 70, 48, 90, 92, 88, true, 'archer', '统筹'),
    officer('zhou-ben', '周本', 'wu', 'chengdu', '宿将', 80, 77, 60, 55, 79, true, 'infantry', '坚守'),
    officer('li-jianxun', '李建勋', 'wu', 'yangzhou', '文臣', 58, 35, 79, 86, 76, true, 'archer', '统筹'),
    officer('xu-jie', '徐玠', 'wu', 'yangzhou', '幕僚', 54, 28, 76, 80, 72, false, 'archer', '火计'),
    officer('wang-lingmou', '王令谋', 'wu', 'chengdu', '将领', 71, 66, 53, 46, 68, true, 'infantry', '坚守'),
    officer('ma-renyu', '马仁裕', 'wu', 'yangzhou', '将领', 76, 72, 57, 49, 71, false, 'infantry', '突击'),
    officer('song-qiqiu', '宋齐丘', 'wu', 'yangzhou', '谋臣', 49, 19, 88, 91, 75, true, 'archer', '火计'),
    officer('yang-pu', '杨溥', 'wu', 'yangzhou', '君主', 42, 24, 64, 63, 83, true, 'infantry', '坚守'),
    officer('liu-wei', '刘威', 'wu', 'chengdu', '将领', 68, 64, 51, 43, 67, false, 'infantry', '坚守'),
    officer('chen-jue', '陈觉', 'wu', 'yangzhou', '文臣', 50, 21, 74, 78, 69, false, 'archer', '统筹'),

    officer('qian-liu', '钱镠', 'wuyue', 'hangzhou', '君主', 77, 65, 78, 82, 92, true, 'infantry', '坚守'),
    officer('qian-yuanliao', '钱元璙', 'wuyue', 'hangzhou', '宗室', 69, 61, 70, 66, 81, true, 'infantry', '坚守'),
    officer('lu-renzhang', '卢仁璋', 'wuyue', 'hangzhou', '将领', 74, 70, 58, 45, 72, true, 'infantry', '突击'),
    officer('cao-zhongda', '曹仲达', 'wuyue', 'hangzhou', '守将', 71, 67, 52, 44, 70, false, 'infantry', '坚守'),
    officer('shuiqiu-zhao', '水丘昭券', 'wuyue', 'hangzhou', '文臣', 48, 18, 82, 84, 73, true, 'archer', '统筹'),
    officer('zhang-delin', '张德麟', 'wuyue', 'hangzhou', '幕僚', 52, 26, 76, 79, 71, false, 'archer', '火计'),
    officer('wu-hanyue', '吴汉月', 'wuyue', 'hangzhou', '将领', 67, 65, 49, 42, 66, false, 'infantry', '坚守'),
    officer('shen-song', '沈嵩', 'wuyue', 'hangzhou', '文臣', 46, 16, 80, 83, 68, false, 'archer', '统筹'),

    officer('wang-yanhan', '王延翰', 'min', 'fuzhou', '君主', 63, 51, 63, 60, 86, true, 'infantry', '坚守'),
    officer('wang-shenzhi', '王审知', 'min', 'fuzhou', '宿主', 72, 58, 68, 74, 91, false, 'infantry', '坚守'),
    officer('huang-shaopo', '黄绍颇', 'min', 'fuzhou', '文臣', 47, 22, 78, 81, 69, true, 'archer', '统筹'),
    officer('liu-shao', '刘韶', 'min', 'fuzhou', '将领', 69, 64, 50, 43, 68, true, 'infantry', '突击'),
    officer('chen-ben', '陈本', 'min', 'fuzhou', '守将', 65, 59, 47, 40, 67, false, 'infantry', '坚守'),
    officer('pan-huizhao', '潘惠照', 'min', 'fuzhou', '幕僚', 43, 17, 74, 76, 65, false, 'archer', '火计'),
    officer('wang-yanbin', '王延彬', 'min', 'fuzhou', '宗室', 60, 54, 55, 48, 72, false, 'infantry', '坚守'),
    officer('xue-wenjie', '薛文杰', 'min', 'fuzhou', '文臣', 44, 16, 75, 77, 64, false, 'archer', '统筹'),

    officer('liu-yan', '刘龑', 'nanhan', 'guangzhou', '君主', 68, 56, 74, 76, 88, true, 'infantry', '坚守'),
    officer('yang-dongqian', '杨洞潜', 'nanhan', 'guangzhou', '谋臣', 51, 24, 82, 86, 73, true, 'archer', '统筹'),
    officer('liang-kezhen', '梁克贞', 'nanhan', 'guangzhou', '将领', 73, 68, 53, 45, 70, true, 'infantry', '突击'),
    officer('deng-shou', '邓守', 'nanhan', 'guangzhou', '守将', 66, 61, 48, 42, 68, false, 'infantry', '坚守'),
    officer('lu-yanhong', '卢延宏', 'nanhan', 'guangzhou', '文臣', 45, 20, 77, 79, 66, false, 'archer', '统筹'),
    officer('xiao-yi', '萧益', 'nanhan', 'guangzhou', '文臣', 42, 18, 75, 78, 64, false, 'archer', '统筹'),
    officer('liu-hongcao', '刘弘操', 'nanhan', 'guangzhou', '宗室', 71, 67, 50, 44, 72, false, 'infantry', '突击'),
    officer('gong-chengshu', '龚澄枢', 'nanhan', 'guangzhou', '近臣', 34, 12, 68, 70, 58, false, 'archer', '坚守'),

    officer('gao-yan', '高彦', null, 'kaifeng', '游士', 59, 31, 72, 76, 44, false, 'archer', '统筹'),
    officer('duan-xi', '段希', null, 'luoyang', '游士', 62, 36, 74, 70, 42, false, 'archer', '火计'),
    officer('cheng-yan', '程演', null, 'taiyuan', '游士', 68, 57, 55, 48, 46, false, 'cavalry', '突击'),
    officer('liu-meng', '刘蒙', null, 'weizhou', '游士', 64, 49, 62, 57, 43, false, 'infantry', '坚守'),
    officer('han-zhao', '韩昭', null, 'youzhou', '游士', 70, 63, 44, 39, 40, false, 'cavalry', '突击'),
    officer('zhao-kuan', '赵宽', null, 'chengdu', '游士', 55, 29, 79, 82, 45, false, 'archer', '统筹'),
    officer('sun-shao', '孙邵', null, 'yangzhou', '游士', 57, 27, 80, 84, 47, false, 'archer', '统筹'),
    officer('lin-xi', '林玺', null, 'hangzhou', '游士', 61, 35, 70, 68, 41, false, 'infantry', '坚守'),
    officer('wu-ke', '吴恪', null, 'fuzhou', '游士', 58, 32, 73, 72, 43, false, 'archer', '火计'),
    officer('feng-yan', '冯演', null, 'guangzhou', '游士', 66, 46, 61, 55, 42, false, 'infantry', '突击'),
  ];

  const events = [
    { id: 'founding_houtang', year: 923, month: 1, yearly: false },
    { id: 'north_muster', month: 2, yearly: true },
    { id: 'spring_harvest', month: 3, yearly: true },
    { id: 'min_trade', month: 4, yearly: true },
    { id: 'sea_trade', month: 5, yearly: true },
    { id: 'summer_heat', month: 6, yearly: true },
    { id: 'scholar_arrives', month: 7, yearly: true },
    { id: 'autumn_horses', month: 8, yearly: true },
    { id: 'tax_resistance', month: 9, yearly: true },
    { id: 'winter_storage', month: 10, yearly: true },
    { id: 'new_year_amnesty', month: 12, yearly: true },
  ];

  window.FDTK = window.FDTK || {};
  window.FDTK.SCENARIO = {
    id: '923-lite',
    nameZh: '923：后唐开国',
    startYear: 923,
    startMonth: 1,
    forces,
    cities,
    officers,
    events,
  };
})();

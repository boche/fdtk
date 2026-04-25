(function(){
  const CIVIL_SKILLS={
    '治水营田':{label:'治水营田',desc:'开发时额外提高城池恢复，适合经营农田与水利。'},
    '均输理财':{label:'均输理财',desc:'征税收益更高，且治安与民心损耗较低。'},
    '安民赈抚':{label:'安民赈抚',desc:'能稳定民心，降低重税和兵役带来的反弹。'},
    '幕府筹议':{label:'幕府筹议',desc:'任命、招揽和战前判断更稳，适合做军师。'},
    '简练军籍':{label:'简练军籍',desc:'征兵效率更高，训练度提升更多。'},
    '转运筹措':{label:'转运筹措',desc:'军粮和物资调度更稳，能降低部分消耗。'},
    '法度整饬':{label:'法度整饬',desc:'整肃吏治、压低叛乱风险，适合守成。'}
  };
  const MILITARY_SKILLS={
    '突击':{label:'突击',desc:'进攻时冲击力更强，适合骑兵和前锋。'},
    '火计':{label:'火计',desc:'进攻时智略加成更高，适合谋臣督战。'},
    '治军':{label:'治军',desc:'攻守两端稳定提升，适合主帅。'},
    '坚守':{label:'坚守',desc:'守城时防御更强，适合守将。'},
    '统筹':{label:'统筹',desc:'攻守均有小幅提升，适合总揽军政。'}
  };
  const profiles={
    'li-cunxu':{c:'幕府筹议',m:'突击',bio:'后唐开国君主，沙陀李氏出身，少长军旅，善用奇兵急击。灭后梁后定都洛阳，前期英锐果决，后期宫廷与军政失衡，是一位锋芒极盛也极难驾驭的马上天子。'},
    'guo-chongtao':{c:'幕府筹议',m:'统筹',bio:'后唐中枢重臣，长于筹划军国大计，能在诸将之间调和资源与路线。其人用事果断，适合主持幕府、调度粮饷与战线。'},
    'li-siyuan':{c:'安民赈抚',m:'治军',bio:'沙陀宿将，久经河东与中原战事，军中声望深厚。其人沉稳宽厚，能收拢旧部、安定新附城池，是后唐最可靠的统兵柱石之一。'},
    'li-congke':{c:'简练军籍',m:'突击',bio:'后唐宗室将领，性格刚烈，常在前线冲锋陷阵。适合率锐卒攻坚，但治理地方需要文臣辅佐。'},
    'zhou-dewei':{c:'简练军籍',m:'治军',bio:'河东名将，长期镇守北地，熟悉边防、骑兵与城寨攻守。其人临阵持重，能把散兵整成可用之军。'},
    'an-chonghui':{c:'法度整饬',m:'统筹',bio:'后唐近臣，善于整肃军政、梳理号令，处事强硬。用于安抚骄兵悍将时有风险，但治理松弛城池颇有效。'},
    'ren-huan':{c:'均输理财',m:'统筹',bio:'后唐文臣，熟悉财赋、仓储与地方行政。适合掌管府库，能让钱粮流向真正需要的战线。'},
    'kang-yanxiao':{c:'简练军籍',m:'突击',bio:'后唐边将，出入战阵多年，善带轻锐突进。忠诚需常加安抚，一旦用得其所，能在边郡打开战机。'},
    'li-cunshen':{c:'简练军籍',m:'治军',bio:'河东宿将，历事晋、唐两代，作战谨慎而有章法。最适合守边、练兵和稳定军心。'},
    'zhang-xian':{c:'法度整饬',m:'坚守',bio:'后唐将领，资历不及诸名帅，却能按部就班守城整军。适合在要地承担守备职责。'},

    'xu-zhigao':{c:'法度整饬',m:'统筹',bio:'吴国执政核心，后来的南唐奠基者。其人温厚而深沉，擅长以制度、恩威和人事安排控制局势，是江淮政权最强的内政人物。'},
    'zhou-ben':{c:'简练军籍',m:'坚守',bio:'吴国宿将，早年从战江淮，持军严整，擅长防守要冲。面对强敌时不轻动，能稳住战线。'},
    'li-jianxun':{c:'治水营田',m:'统筹',bio:'吴国文臣，熟悉江淮水网、漕运与农政。适合在富庶城池持续开发，稳步积累国力。'},
    'xu-jie':{c:'幕府筹议',m:'统筹',bio:'徐氏幕僚，长于案牍、谋议与人事往来。虽然不适合亲临前阵，却能让命令执行得更顺。'},
    'wang-lingmou':{c:'简练军籍',m:'坚守',bio:'吴国将领，常驻边地，能力均衡。适合守住二线城池，并在兵力充足时支援主战场。'},
    'ma-renyu':{c:'简练军籍',m:'突击',bio:'吴国将领，行事果敢，适合领兵前出。若有谋臣配合，可在水网与平原之间快速穿插。'},
    'song-qiqiu':{c:'幕府筹议',m:'火计',bio:'吴国谋臣，才思敏捷，善于揣摩政局与制造议题。其谋略可用于招揽、离间和战前筹划，但也要防止党争牵制政务。'},
    'yang-pu':{c:'安民赈抚',m:'坚守',bio:'吴国君主，名义至尊而实权渐归徐氏。其人宽和，适合安抚百姓与维系法统。'},
    'liu-wei':{c:'简练军籍',m:'治军',bio:'吴国将领，出身军伍，重视军纪。作为副将或守将都能保持部队基本战力。'},
    'chen-jue':{c:'幕府筹议',m:'火计',bio:'吴国文臣，熟悉朝议与外交辞令。适合招揽在野士人，也能在战事中提供奇策。'},

    'qian-liu':{c:'治水营田',m:'坚守',bio:'吴越开国之主，出身军伍而善守成，重视钱塘海塘、水利与市舶贸易。其政权以保境安民、积累财货见长。'},
    'qian-yuanliao':{c:'安民赈抚',m:'坚守',bio:'钱氏宗室，性情谨慎，熟悉吴越家法。适合协助守城、安抚士民。'},
    'lu-renzhang':{c:'简练军籍',m:'突击',bio:'吴越将领，负责钱塘一带军务，作战风格稳中带锐。兵力充足时可担任先锋。'},
    'cao-zhongda':{c:'法度整饬',m:'坚守',bio:'吴越守将，擅长城防和巡检。面对外敌压境时，他能把城防工事和守军组织起来。'},
    'shuiqiu-zhao':{c:'均输理财',m:'统筹',bio:'吴越文臣，精于财计与贡赋安排，能把商税、盐利和仓储转化为持续国力。'},
    'zhang-delin':{c:'幕府筹议',m:'统筹',bio:'吴越幕僚，熟悉文书、宾客与邻国往来。适合处理任命和招揽。'},
    'wu-hanyue':{c:'简练军籍',m:'坚守',bio:'吴越将领，资历不显而能守本分。适合训练地方兵、补足城防空缺。'},
    'shen-song':{c:'治水营田',m:'统筹',bio:'吴越文臣，重视地方教化与农桑，适合长期经营杭州及周边富庶地区。'},

    'wang-yanhan':{c:'法度整饬',m:'坚守',bio:'闽国君主，承接王氏基业却处宗室矛盾之中。其统治需要稳定朝局与压制地方豪强。'},
    'wang-shenzhi':{c:'安民赈抚',m:'统筹',bio:'闽地奠基者，长期经营福建，宽刑薄赋，重视安民与海路贸易。在本剧本中作为宿主遗望，能极大稳定闽地人心。'},
    'huang-shaopo':{c:'治水营田',m:'统筹',bio:'闽国文臣，熟悉山海之地的垦殖、盐利与港口事务。适合发展福州。'},
    'liu-shao':{c:'简练军籍',m:'突击',bio:'闽国将领，熟悉山地道路和沿海防务。适合在敌军轻视闽地时突然出击。'},
    'chen-ben':{c:'法度整饬',m:'坚守',bio:'闽国守将，谨慎少言，善守关隘。兵力不足时也能维持基本防线。'},
    'pan-huizhao':{c:'幕府筹议',m:'火计',bio:'闽国幕僚，善察人情，适合处理招揽与内廷议事。'},
    'wang-yanbin':{c:'安民赈抚',m:'坚守',bio:'王氏宗室，地方声望尚可。若妥善任用，可在宗室纷争中安抚士民。'},
    'xue-wenjie':{c:'均输理财',m:'统筹',bio:'闽国文臣，精于案牍和赋税，能在资源有限的山海城池中挤出余力。'},

    'liu-yan':{c:'均输理财',m:'统筹',bio:'南汉开国君主，割据岭南，重视宫廷权威与地方财赋。其国远离中原主战场，若经营得当，可凭海贸和山险自守。'},
    'yang-dongqian':{c:'幕府筹议',m:'火计',bio:'南汉谋臣，熟悉岭南军政和朝议机变。可担任军师，辅助招揽与战前筹划。'},
    'liang-kezhen':{c:'简练军籍',m:'突击',bio:'南汉将领，常年镇守岭南要道，作战朴实而有冲劲。适合率兵北上试探。'},
    'deng-shou':{c:'法度整饬',m:'坚守',bio:'南汉守将，熟悉广州城防与岭南水路，适合守备首府。'},
    'lu-yanhong':{c:'治水营田',m:'统筹',bio:'南汉文臣，关注田土、港市与仓储。适合在广州发展人口与钱粮。'},
    'xiao-yi':{c:'安民赈抚',m:'坚守',bio:'南汉文臣，善于抚民与调停地方。重税或兵役过重后可用其恢复民心。'},
    'liu-hongcao':{c:'简练军籍',m:'突击',bio:'南汉宗室将领，勇于出阵，适合担任攻城副将。'},
    'gong-chengshu':{c:'法度整饬',m:'坚守',bio:'南汉近臣，擅长内廷事务和严密控制。能短期压住局面，但声望不高，需谨慎重用。'},

    'gao-yan':{c:'幕府筹议',m:'统筹',bio:'虚构游士，曾游学汴洛，熟悉文书与地方利害。适合被招入幕府处理任命和策议。'},
    'duan-xi':{c:'治水营田',m:'统筹',bio:'虚构游士，通晓河洛水利与屯田，主张先富民再强兵。'},
    'cheng-yan':{c:'简练军籍',m:'治军',bio:'虚构武人，出身并州军户，善整队列、明赏罚。'},
    'liu-meng':{c:'安民赈抚',m:'坚守',bio:'虚构士人，曾在魏博幕府任小吏，熟悉民情与军镇积弊。'},
    'han-zhao':{c:'简练军籍',m:'突击',bio:'虚构边地豪侠，熟悉幽燕骑射，勇猛有余而需良将约束。'},
    'zhao-kuan':{c:'均输理财',m:'统筹',bio:'虚构蜀地士人，善理仓储与商税，能补足偏远城池的钱粮短板。'},
    'sun-shao':{c:'幕府筹议',m:'火计',bio:'虚构江淮策士，善言辞、通文牍，适合招揽与谋划。'},
    'lin-xi':{c:'治水营田',m:'坚守',bio:'虚构吴越士人，熟悉海塘、乡里和市井，适合稳固杭州。'},
    'wu-ke':{c:'安民赈抚',m:'坚守',bio:'虚构闽地隐士，知山海民俗，能缓和重役后的民怨。'},
    'feng-yan':{c:'转运筹措',m:'突击',bio:'虚构岭南军吏，熟悉山路、水路和军需转运，适合远征前筹粮。'}
  };

  const PORTRAIT_BASE='assets/portraits/';
  const PORTRAIT_POOL=Array.from({length:100},function(_,i){return 'p'+String(i+1).padStart(3,'0');});
  const OFFICER_PORTRAITS={
    'li-cunxu':'p001',
    'guo-chongtao':'p026',
    'li-siyuan':'p002',
    'li-congke':'p003',
    'zhou-dewei':'p004',
    'an-chonghui':'p027',
    'ren-huan':'p028',
    'kang-yanxiao':'p005',
    'li-cunshen':'p006',
    'zhang-xian':'p007',
    'xu-zhigao':'p029',
    'zhou-ben':'p008',
    'li-jianxun':'p030',
    'xu-jie':'p031',
    'wang-lingmou':'p009',
    'ma-renyu':'p010',
    'song-qiqiu':'p032',
    'yang-pu':'p033',
    'liu-wei':'p011',
    'chen-jue':'p034',
    'qian-liu':'p012',
    'qian-yuanliao':'p035',
    'lu-renzhang':'p013',
    'cao-zhongda':'p014',
    'shuiqiu-zhao':'p036',
    'zhang-delin':'p037',
    'wu-hanyue':'p015',
    'shen-song':'p038',
    'wang-yanhan':'p039',
    'wang-shenzhi':'p040',
    'huang-shaopo':'p041',
    'liu-shao':'p051',
    'chen-ben':'p052',
    'pan-huizhao':'p042',
    'wang-yanbin':'p043',
    'xue-wenjie':'p044',
    'liu-yan':'p045',
    'yang-dongqian':'p046',
    'liang-kezhen':'p053',
    'deng-shou':'p054',
    'lu-yanhong':'p047',
    'xiao-yi':'p048',
    'liu-hongcao':'p055',
    'gong-chengshu':'p049',
    'gao-yan':'p076',
    'duan-xi':'p077',
    'cheng-yan':'p056',
    'liu-meng':'p078',
    'han-zhao':'p057',
    'zhao-kuan':'p079',
    'sun-shao':'p080',
    'lin-xi':'p081',
    'wu-ke':'p082',
    'feng-yan':'p058'
  };
  function portraitKey(officer){
    if(!officer){return 'p100';}
    if(OFFICER_PORTRAITS[officer.id]){return OFFICER_PORTRAITS[officer.id];}
    const h=hashId(officer.id||officer.nameZh||'officer');
    if((officer.leadership||0)>=76&&(officer.might||0)>=68){return PORTRAIT_POOL[h%25];}
    if((officer.politics||0)>=70||(officer.intellect||0)>=76){return PORTRAIT_POOL[25+(h%25)];}
    if((officer.might||0)>=58){return PORTRAIT_POOL[50+(h%25)];}
    return PORTRAIT_POOL[75+(h%25)];
  }
  function portraitFile(key){return 'portrait-'+String(key||'p100').replace(/^p/,'').padStart(3,'0')+'.webp';}
  function portraitFor(officer){
    const key=portraitKey(officer);
    return PORTRAIT_BASE+portraitFile(key);
  }

  function hashId(id){
    let h=2166136261;
    for(let i=0;i<String(id).length;i++){h^=String(id).charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function pick(list,h,shift){return list[(h>>>shift)%list.length];}
  function category(officer){
    const role=officer.role||'';
    if(role.indexOf('君主')>=0){return 'ruler';}
    if(role.indexOf('谋')>=0||role.indexOf('文')>=0||role.indexOf('幕')>=0||role.indexOf('执政')>=0||role.indexOf('近臣')>=0){return 'civil';}
    if(role.indexOf('宿将')>=0||role.indexOf('将领')>=0||role.indexOf('边将')>=0||role.indexOf('守将')>=0){return 'military';}
    if(role.indexOf('宗室')>=0||role.indexOf('宿主')>=0){return 'noble';}
    return 'scholar';
  }
  function palette(officer, force, h){
    const cat=category(officer);
    const forceColor=force&&force.color?force.color:'#7b5639';
    const skin=pick([
      ['#f0d5b8','#c28a68'],['#e8c6a5','#ad765a'],['#f3dec6','#c99a76'],['#dfb58f','#9b654b']
    ],h,2);
    if(cat==='ruler'){return {robe:forceColor,trim:'#d2ae62',hat:'#211712',bg1:'#ead7b9',bg2:'#b78a5a',skin1:skin[0],skin2:skin[1]};}
    if(cat==='civil'){return {robe:pick(['#4f6375','#5b5f72','#496b65'],h,4),trim:'#d8cfbd',hat:'#25282d',bg1:'#e8dbc6',bg2:'#bfa17c',skin1:skin[0],skin2:skin[1]};}
    if(cat==='military'){return {robe:pick(['#70452e','#603b2c','#7a5136'],h,4),trim:'#ba8650',hat:'#332118',bg1:'#e5d1ba',bg2:'#ad835f',skin1:skin[0],skin2:skin[1]};}
    if(cat==='noble'){return {robe:pick(['#70567a','#6e4f64','#6f5b3f'],h,4),trim:'#d1b46d',hat:'#35243a',bg1:'#ead9c4',bg2:'#b99977',skin1:skin[0],skin2:skin[1]};}
    return {robe:pick(['#655b48','#5f644f','#6f543b'],h,4),trim:'#c2a26b',hat:'#2f2821',bg1:'#e8dcc8',bg2:'#bda27d',skin1:skin[0],skin2:skin[1]};
  }
  function facePath(officer,h){
    const wide=(officer.might||0)>=72;
    const lean=(officer.intellect||0)>=78;
    if(wide){return 'M24 36 C24 23,31 15,42 15 C53 15,60 23,60 36 C60 51,53 61,42 62 C31 61,24 51,24 36 Z';}
    if(lean){return 'M26 36 C26 22,32 14,42 14 C52 14,58 22,58 36 C58 51,52 62,42 63 C32 62,26 51,26 36 Z';}
    return 'M25 36 C25 23,32 15,42 15 C52 15,59 23,59 36 C59 51,52 62,42 62 C32 62,25 51,25 36 Z';
  }
  function hat(officer, colors, h){
    const cat=category(officer);
    if(cat==='ruler'){return '<path d="M18 25 L66 25 L60 13 L24 13 Z" fill="'+colors.hat+'"/><rect x="28" y="8" width="28" height="6" rx="2" fill="'+colors.trim+'"/><rect x="40" y="4" width="5" height="12" rx="1" fill="'+colors.trim+'"/><path d="M19 26 C30 30,54 30,65 26" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1.2"/>';}
    if(cat==='civil'){return '<path d="M23 25 L61 25 L56 15 L28 15 Z" fill="'+colors.hat+'"/><path d="M31 15 L53 15 L49 8 L35 8 Z" fill="'+colors.trim+'"/><path d="M18 25 L28 22 M56 22 L68 25" stroke="'+colors.hat+'" stroke-width="3" stroke-linecap="round"/>';}
    if(cat==='military'){return '<path d="M22 26 L62 26 L57 15 L27 15 Z" fill="'+colors.hat+'"/><path d="M28 15 L56 15 L51 8 L33 8 Z" fill="'+colors.trim+'"/><path d="M34 9 C39 5,45 5,50 9" fill="none" stroke="#ead2a3" stroke-width="2"/>';}
    if(cat==='noble'){return '<path d="M23 25 L61 25 L56 15 L28 15 Z" fill="'+colors.hat+'"/><circle cx="42" cy="11" r="4" fill="'+colors.trim+'"/>';}
    return '<path d="M24 26 L60 26 L55 16 L29 16 Z" fill="'+colors.hat+'"/><path d="M30 16 L54 16" stroke="rgba(255,255,255,.2)" stroke-width="1.2"/>';
  }
  function beard(officer,h){
    const style=(h>>>5)%4;
    const strong=(officer.might||0)>=70||(officer.leadership||0)>=76;
    const wise=(officer.intellect||0)>=76||(officer.politics||0)>=78;
    let s='';
    if(wise||strong){s+='<path d="M33 53 C36 50,39 50,42 53 M42 53 C45 50,49 50,52 53" fill="none" stroke="#38241a" stroke-width="2" stroke-linecap="round"/>';}
    if(strong&&style!==1){s+='<path d="M34 57 C35 68,49 68,50 57" fill="none" stroke="#2b1b13" stroke-width="'+(style===2?'4':'2.8')+'" stroke-linecap="round"/>';}
    if(wise&&style===1){s+='<path d="M39 58 C39 68,45 68,45 58" fill="none" stroke="#3d2a20" stroke-width="2" stroke-linecap="round"/>';}
    return s;
  }
  function e(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function getProfile(officer){
    const base=profiles[officer.id]||{};
    const civil=base.c||(officer.politics>=82?'均输理财':officer.intellect>=78?'幕府筹议':officer.leadership>=72?'简练军籍':'安民赈抚');
    const military=base.m||(officer.leadership>=85?'治军':officer.might>=78?'突击':officer.intellect>=82?'火计':officer.politics>=80?'统筹':'坚守');
    const bio=base.bio||((officer.forceId?'诸镇幕府人物':'在野游士')+'，在五代乱世中寻求明主。其才具未必显赫，却能在合适城池补足政军短板。');
    return {
      id:officer.id,
      portraitKey:portraitKey(officer),
      portraitUrl:portraitFor(officer),
      bio:bio,
      civilSkill:civil,
      civilSkillLabel:(CIVIL_SKILLS[civil]||{}).label||civil,
      civilSkillDesc:(CIVIL_SKILLS[civil]||{}).desc||'能改善内政执行效果。',
      militarySkill:military,
      militarySkillLabel:(MILITARY_SKILLS[military]||{}).label||military,
      militarySkillDesc:(MILITARY_SKILLS[military]||{}).desc||'能影响战斗表现。',
      skillSummary:'内政：'+civil+' - '+((CIVIL_SKILLS[civil]||{}).desc||'能改善内政执行效果。')+' 军事：'+military+' - '+((MILITARY_SKILLS[military]||{}).desc||'能影响战斗表现。')
    };
  }
  function avatar(officer, force){
    const h=hashId(officer.id||officer.nameZh||'officer');
    const colors=palette(officer,force,h);
    const cat=category(officer);
    const roleMark=cat==='civil'?'文':cat==='military'?'武':cat==='ruler'?'主':cat==='noble'?'宗':'士';
    const lean=(officer.intellect||0)>=78;
    const strong=(officer.might||0)>=72||(officer.leadership||0)>=80;
    const tilt=((h>>>4)%7)-3;
    const faceW=strong?52:(lean?44:48);
    const jaw=strong?9:(lean?3:6);
    const eyeY=48+((h>>>3)%3-1);
    const gaze=((h>>>9)%5)-2;
    const mouthCurve=cat==='ruler'||cat==='military'?'Q56 72 64 69':'Q56 73 64 72';
    const brow=cat==='military'||cat==='ruler'?'#24150e':'#4b3426';
    const sideHair=strong?'#1c120d':'#251913';
    const scar=(officer.might||0)>=84||((h>>>7)&1)?'<path d="M70 42 L64 59" stroke="rgba(120,44,37,.48)" stroke-width="1.6" stroke-linecap="round"/>':'';
    const beardSvg=beard(officer,h);
    const hatSvg=hat(officer,colors,h).replaceAll('M18','M28').replaceAll('M66','M84').replaceAll('M60','M78').replaceAll('M24','M32').replaceAll('x="28"','x="40"').replaceAll('x="40"','x="54"').replaceAll('x="23"','x="34"').replaceAll('L61','L80').replaceAll('L56','L73').replaceAll('L28','L39').replaceAll('L53','L68').replaceAll('L49','L63').replaceAll('L35','L48').replaceAll('M22','M33').replaceAll('L62','L81').replaceAll('L57','L74').replaceAll('L27','L38').replaceAll('L51','L66').replaceAll('L33','L46').replaceAll('M34','M47').replaceAll('C39','C52').replaceAll('45','58').replaceAll('50','64').replaceAll('cx="42"','cx="56"').replaceAll('M24 26','M34 30').replaceAll('L60','L78').replaceAll('L55','L72').replaceAll('L29','L40').replaceAll('M30','M43').replaceAll('L54','L70');
    const armor=cat==='military'
      ? '<path d="M24 122 C29 92,43 79,56 79 C69 79,83 92,88 122 Z" fill="url(#robe'+h+')"/><path d="M34 86 L78 86 L84 122 L28 122 Z" fill="rgba(28,18,13,.33)"/><path d="M37 88 H75 M35 96 H77 M33 104 H79" stroke="rgba(225,173,104,.42)" stroke-width="3"/><path d="M45 82 L67 82 L72 93 L40 93 Z" fill="'+colors.trim+'" opacity=".96"/>'
      : '<path d="M24 122 C29 92,43 79,56 79 C69 79,83 92,88 122 Z" fill="url(#robe'+h+')"/><path d="M47 80 L65 80 L72 122 L40 122 Z" fill="'+colors.trim+'" opacity=".62"/><path d="M35 92 C47 98,65 98,77 92" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2"/>';
    const crown=hatSvg;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="128" viewBox="0 0 112 128" role="img" aria-label="'+e(officer.nameZh||'武将头像')+'">'
      +'<defs><linearGradient id="bg'+h+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+colors.bg1+'"/><stop offset="100%" stop-color="'+colors.bg2+'"/></linearGradient><radialGradient id="skin'+h+'" cx="45%" cy="28%" r="72%"><stop offset="0%" stop-color="'+colors.skin1+'"/><stop offset="72%" stop-color="'+colors.skin2+'"/><stop offset="100%" stop-color="#7d4f3c"/></radialGradient><linearGradient id="robe'+h+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="'+colors.robe+'"/><stop offset="100%" stop-color="#25140d"/></linearGradient><filter id="soft'+h+'" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#2a160d" flood-opacity=".28"/></filter></defs>'
      +'<rect width="112" height="128" rx="18" fill="url(#bg'+h+')"/><path d="M8 100 C24 88,39 84,56 84 C73 84,88 88,104 100 L104 128 L8 128 Z" fill="rgba(52,31,18,.18)"/><path d="M8 16 C28 5,75 5,101 23" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="2"/>'
      +'<g filter="url(#soft'+h+')" transform="rotate('+tilt+' 56 62)">'+armor
      +'<path d="M43 74 C45 84,67 84,69 74 L67 91 C63 96,49 96,45 91 Z" fill="'+colors.skin2+'"/>'
      +'<ellipse cx="31" cy="55" rx="6" ry="10" fill="'+colors.skin2+'" opacity=".88"/><ellipse cx="81" cy="55" rx="6" ry="10" fill="'+colors.skin2+'" opacity=".88"/>'
      +'<path d="M'+(56-faceW/2)+' 45 C'+(34)+' 25,45 17,56 17 C68 17,78 25,'+(56+faceW/2)+' 45 C'+(83)+' 64,'+(67+jaw)+' 80,56 81 C'+(45-jaw)+' 80,29 64,'+(56-faceW/2)+' 45 Z" fill="url(#skin'+h+')"/>'
      +'<path d="M31 45 C32 25,43 14,56 14 C70 14,80 25,82 45 C76 34,68 28,56 28 C44 28,36 34,31 45 Z" fill="'+sideHair+'"/>'
      +'<path d="M33 48 C35 39,42 35,49 38" fill="none" stroke="'+brow+'" stroke-width="2.4" stroke-linecap="round"/><path d="M63 38 C70 35,77 39,79 48" fill="none" stroke="'+brow+'" stroke-width="2.4" stroke-linecap="round"/>'
      +'<ellipse cx="45" cy="'+eyeY+'" rx="3.2" ry="2.4" fill="#1b100b"/><ellipse cx="67" cy="'+eyeY+'" rx="3.2" ry="2.4" fill="#1b100b"/><circle cx="'+(44+gaze/3)+'" cy="'+(eyeY-0.9)+'" r=".8" fill="rgba(255,255,255,.82)"/><circle cx="'+(66+gaze/3)+'" cy="'+(eyeY-0.9)+'" r=".8" fill="rgba(255,255,255,.82)"/>'
      +'<path d="M56 50 C53 58,52 64,55 66 L60 66" fill="none" stroke="#8f5943" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 70 '+mouthCurve+'" fill="none" stroke="#7c4638" stroke-width="2" stroke-linecap="round"/>'
      +'<ellipse cx="41" cy="61" rx="5" ry="2.5" fill="rgba(160,73,54,.13)"/><ellipse cx="71" cy="61" rx="5" ry="2.5" fill="rgba(160,73,54,.1)"/>'+scar+beardSvg.replaceAll('M33','M47').replaceAll('C36','C50').replaceAll('39','53').replaceAll('42','56').replaceAll('C45','C59').replaceAll('49','63').replaceAll('52','66').replaceAll('M34','M48').replaceAll('C35','C49').replaceAll('68','84').replaceAll('57','74').replaceAll('M39','M53').replaceAll('M45','M59')+crown
      +'</g><circle cx="17" cy="18" r="10" fill="rgba(39,22,12,.45)"/><text x="17" y="22" text-anchor="middle" font-size="12" font-family="Microsoft YaHei, PingFang SC, sans-serif" fill="#fff">'+roleMark+'</text></svg>';
  }
  const lore={};
  Object.keys(profiles).forEach(function(id){lore[id]=profiles[id].bio;});
  window.FDTK=window.FDTK||{};
  window.FDTK.OFFICER_LORE=lore;
  window.FDTK.OFFICER_CIVIL_SKILLS=CIVIL_SKILLS;
  window.FDTK.OFFICER_MILITARY_SKILLS=MILITARY_SKILLS;
  window.FDTK.OFFICER_PROFILES=profiles;
  window.FDTK.OFFICER_PORTRAITS=OFFICER_PORTRAITS;
  window.FDTK.getOfficerProfile=getProfile;
  window.FDTK.getOfficerPortrait=portraitFor;
  window.FDTK.makeOfficerAvatar=function(){return '';};
})();

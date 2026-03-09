(function(){
  const lore={
    'li-cunxu':'后唐开国君主，出身沙陀李氏，以善战与迅疾用兵著称，灭后梁而定中原。',
    'guo-chongtao':'后唐重臣，善于筹谋与统筹军政，协助李存勖完成大局扩张。',
    'li-siyuan':'后唐宿将，长期领兵征战，军中威望极高，后世亦为关键继承者。',
    'zhou-dewei':'后唐名将，善守善战，长期经营北地边防。',
    'xu-zhigao':'吴国执政核心，长于政略与制度经营，后续历史影响极大。',
    'song-qiqiu':'吴国谋臣，文治与筹策能力突出，是江南政局中的关键策士。',
    'qian-liu':'吴越开国之主，擅长守成与地方经营，以稳健著称。',
    'wang-yanhan':'闽国君主之一，处在宗室交替与地方割据的复杂局势中。',
    'liu-yan':'南汉开国君主，偏据岭南，重视地方经营与独立政权维持。'
  };
  function category(officer){
    const role=officer.role||'';
    if(role.indexOf('君主')>=0){return 'ruler';}
    if(role.indexOf('谋')>=0||role.indexOf('文')>=0||role.indexOf('幕')>=0||role.indexOf('执政')>=0||role.indexOf('近臣')>=0){return 'civil';}
    if(role.indexOf('宿将')>=0||role.indexOf('将领')>=0||role.indexOf('边将')>=0||role.indexOf('守将')>=0){return 'military';}
    if(role.indexOf('宗室')>=0){return 'noble';}
    return 'scholar';
  }
  function palette(officer, force){
    const cat=category(officer);
    const forceColor=force&&force.color?force.color:'#8a6948';
    if(cat==='ruler'){return {robe:forceColor,trim:'#d6b26c',hat:'#231a14',bg1:'#efe4cd',bg2:'#ccb084',skin1:'#f2dfc9',skin2:'#cda185'};}
    if(cat==='civil'){return {robe:'#54697a',trim:'#d8d7d2',hat:'#2b2e34',bg1:'#ebe2d4',bg2:'#cabaa5',skin1:'#f0dec8',skin2:'#c99473'};}
    if(cat==='military'){return {robe:'#6d4732',trim:'#b98751',hat:'#3c271c',bg1:'#ead9c7',bg2:'#c9b197',skin1:'#eed9c1',skin2:'#bd8668'};}
    if(cat==='noble'){return {robe:'#6e5878',trim:'#d7bd79',hat:'#392a3f',bg1:'#ece0d3',bg2:'#cbb6a4',skin1:'#efdfcb',skin2:'#c59276'};}
    return {robe:'#6a614f',trim:'#c9b082',hat:'#362d26',bg1:'#eee4d6',bg2:'#ccb9a0',skin1:'#efdfca',skin2:'#bf8f70'};
  }
  function facePath(officer){
    if((officer.might||0)>=80){return 'M23 34 C23 22, 29 14, 36 14 C43 14, 49 22, 49 34 C49 44, 44 51, 36 52 C28 51, 23 44, 23 34 Z';}
    if((officer.intellect||0)>=82){return 'M24 34 C24 22, 30 14, 36 14 C42 14, 48 22, 48 34 C48 44, 44 51, 36 52 C28 51, 24 44, 24 34 Z';}
    return 'M23 34 C23 21, 30 14, 36 14 C42 14, 49 21, 49 34 C49 45, 44 52, 36 52 C28 52, 23 45, 23 34 Z';
  }
  function hair(officer){
    const cat=category(officer);
    if(cat==='civil'){return '<path d="M21 29 C22 17, 29 10, 36 10 C44 10, 50 17, 51 29 L48 28 C47 22, 43 17, 36 17 C29 17, 25 22, 24 28 Z" fill="#231b18"/>';}
    if(cat==='military'){return '<path d="M21 30 C22 18, 29 10, 36 10 C44 10, 50 18, 51 30 L48 29 C46 22, 42 18, 36 18 C30 18, 26 22, 24 29 Z" fill="#1f1714"/>';}
    return '<path d="M21 29 C22 17, 29 10, 36 10 C44 10, 50 17, 51 29 L48 28 C47 21, 42 16, 36 16 C30 16, 25 21, 24 28 Z" fill="#241b16"/>';
  }
  function hat(officer, colors){
    const cat=category(officer);
    if(cat==='ruler'){return '<path d="M18 22 L54 22 L50 12 L22 12 Z" fill="'+colors.hat+'"/><rect x="24" y="8" width="24" height="5" rx="2" fill="'+colors.trim+'"/><rect x="34" y="5" width="4" height="10" fill="'+colors.trim+'"/>';}
    if(cat==='civil'){return '<path d="M22 22 L50 22 L47 14 L25 14 Z" fill="'+colors.hat+'"/><path d="M28 14 L44 14 L41 9 L31 9 Z" fill="#dad9d5"/>';}
    if(cat==='military'){return '<path d="M22 23 L50 23 L47 14 L25 14 Z" fill="'+colors.hat+'"/><path d="M25 14 L47 14 L43 9 L29 9 Z" fill="'+colors.trim+'"/>';}
    if(cat==='noble'){return '<path d="M22 22 L50 22 L47 14 L25 14 Z" fill="'+colors.hat+'"/><circle cx="36" cy="11" r="3" fill="'+colors.trim+'"/>';}
    return '<path d="M23 23 L49 23 L46 15 L26 15 Z" fill="'+colors.hat+'"/>';
  }
  function beard(officer){
    const cat=category(officer);
    if(cat==='military'){return '<path d="M29 44 C31 54, 41 54, 43 44" fill="#2b1d16" opacity="0.95"/><path d="M30 41 C31 44, 34 46, 36 46 C38 46, 41 44, 42 41" fill="none" stroke="#20150f" stroke-width="1.4" stroke-linecap="round"/>';}
    if(cat==='ruler'){return '<path d="M30 43 C31 52, 41 52, 42 43" fill="none" stroke="#38251c" stroke-width="2.2" stroke-linecap="round"/>';}
    if(cat==='civil' && (officer.intellect||0)>=76){return '<path d="M31 43 C33 49, 39 49, 41 43" fill="none" stroke="#433126" stroke-width="1.8" stroke-linecap="round"/>';}
    return '';
  }
  function body(officer, colors){
    const cat=category(officer);
    if(cat==='military'){return '<path d="M16 86 C18 66, 26 55, 36 55 C46 55, 54 66, 56 86" fill="'+colors.robe+'"/><path d="M24 61 L48 61 L48 86 L24 86 Z" fill="rgba(255,255,255,0.08)"/><path d="M29 58 L43 58 L46 67 L26 67 Z" fill="'+colors.trim+'" opacity="0.9"/>';}
    if(cat==='civil'){return '<path d="M16 86 C18 66, 26 55, 36 55 C46 55, 54 66, 56 86" fill="'+colors.robe+'"/><path d="M33 56 L39 56 L43 86 L29 86 Z" fill="'+colors.trim+'" opacity="0.7"/>';}
    return '<path d="M16 86 C18 66, 26 55, 36 55 C46 55, 54 66, 56 86" fill="'+colors.robe+'"/><path d="M24 58 L48 58 L45 86 L27 86 Z" fill="'+colors.trim+'" opacity="0.55"/>';}
  }
  function avatar(officer, force){
    const colors=palette(officer, force);
    const cat=category(officer);
    const brow=cat==='military'||cat==='ruler'?'#2b1c15':'#4d3629';
    const roleMark=cat==='civil'?'文':cat==='military'?'武':cat==='ruler'?'主':cat==='noble'?'宗':'士';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="84" height="96" viewBox="0 0 84 96">'
      +'<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+colors.bg1+'"/><stop offset="100%" stop-color="'+colors.bg2+'"/></linearGradient><radialGradient id="skin" cx="50%" cy="38%" r="60%"><stop offset="0%" stop-color="'+colors.skin1+'"/><stop offset="100%" stop-color="'+colors.skin2+'"/></radialGradient></defs>'
      +'<rect width="84" height="96" rx="14" fill="url(#bg)"/>'
      +'<rect x="5" y="5" width="74" height="86" rx="12" fill="rgba(255,255,255,0.14)" stroke="rgba(84,54,33,0.18)"/>'
      +body(officer, colors)
      +'<path d="'+facePath(officer)+'" fill="url(#skin)"/>'
      +'<ellipse cx="29" cy="36" rx="2.2" ry="2.8" fill="#23170f"/>'
      +'<ellipse cx="43" cy="36" rx="2.2" ry="2.8" fill="#23170f"/>'
      +'<path d="M25 32 Q29 29 33 32" fill="none" stroke="'+brow+'" stroke-width="1.8" stroke-linecap="round"/>'
      +'<path d="M39 32 Q43 29 47 32" fill="none" stroke="'+brow+'" stroke-width="1.8" stroke-linecap="round"/>'
      +'<path d="M36 36 L34 46 L37 46" fill="none" stroke="#a87056" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'
      +'<path d="M31 49 Q36 53 41 49" fill="none" stroke="#8a5b49" stroke-width="1.5" stroke-linecap="round"/>'
      +'<path d="M23 41 C21 38, 21 31, 23 27" fill="none" stroke="rgba(123,86,68,0.45)" stroke-width="1.2"/>'
      +'<path d="M49 41 C51 38, 51 31, 49 27" fill="none" stroke="rgba(123,86,68,0.45)" stroke-width="1.2"/>'
      +hair(officer)
      +hat(officer, colors)
      +beard(officer)
      +'<circle cx="12" cy="12" r="8" fill="rgba(0,0,0,0.1)"/>'
      +'<text x="12" y="16" text-anchor="middle" font-size="10" font-family="Microsoft YaHei, PingFang SC, sans-serif" fill="#fff">'+e(roleMark)+'</text>'
      +'</svg>';
  }
  function e(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  window.FDTK=window.FDTK||{};
  window.FDTK.OFFICER_LORE=lore;
  window.FDTK.makeOfficerAvatar=avatar;
})();

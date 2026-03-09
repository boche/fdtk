(function(){
  const audio=window.FDTK.audio;
  if(!audio){return;}
  let timer=null;
  const phrase=[262,294,330,392,440,392,330,294,262,330,392,440,392,330,294,262];
  function playNote(freq, delay){
    const ctx=audio.ensureContext&&audio.ensureContext();
    if(!ctx){return;}
    const now=ctx.currentTime+delay;
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type='triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.022, now+0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now+0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now+0.55);
  }
  function loop(){
    if(!audio.isEnabled||!audio.isEnabled()){return;}
    phrase.forEach(function(freq,index){playNote(freq,index*0.34);});
  }
  function startMusic(){
    if(timer||!audio.isEnabled||!audio.isEnabled()){return;}
    loop();
    timer=setInterval(loop, phrase.length*340);
  }
  function stopMusic(){
    if(timer){clearInterval(timer);timer=null;}
  }
  const origToggle=audio.toggle;
  audio.toggle=function(){
    const enabled=origToggle();
    if(enabled){startMusic();}else{stopMusic();}
    return enabled;
  };
  const origEnsure=audio.ensureContext;
  audio.ensureContext=function(){
    const ctx=origEnsure();
    if(ctx&&audio.isEnabled&&audio.isEnabled()){startMusic();}
    return ctx;
  };
  audio.startMusic=startMusic;
  audio.stopMusic=stopMusic;
})();

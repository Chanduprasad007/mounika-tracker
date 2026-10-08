// Presentation enhancements reuse the existing tracking functions and storage keys.
(() => {
  const el = id => document.getElementById(id);
  let toastTimer;
  function toast(message) {
    const box = el('saveToast');
    box.textContent = message;
    box.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('visible'), 2200);
  }
  function syncAccessibleState() {
    document.querySelectorAll('.item-row[onclick]').forEach(row => {
      row.setAttribute('aria-checked', String(row.classList.contains('checked')));
    });
    document.querySelectorAll('.water-glass-btn').forEach(button => {
      button.setAttribute('aria-pressed', String(button.classList.contains('drank')));
    });
    document.querySelectorAll('.filter-chip').forEach(button => {
      button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
    const count = document.querySelectorAll('.water-glass-btn.drank').length;
    el('waterAmount').textContent = `${(count * .25).toFixed(2).replace(/0$/, '')} L`;
    el('waterLiquid').style.transform = `translateY(${100 - count / 14 * 100}%)`;
  }
  function enhanceRows() {
    document.querySelectorAll('.item-row[onclick]').forEach(row => {
      row.tabIndex = 0;
      row.setAttribute('role','checkbox');
      const name = row.querySelector('.item-name');
      if (name) row.setAttribute('aria-label', name.textContent.trim());
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    el('todayDate').textContent = new Intl.DateTimeFormat('en-IN', {weekday:'short',day:'numeric',month:'long',timeZone:'Asia/Kolkata'}).format(new Date());
    const overviewButton = el('overviewToggle');
    function setOverview(expanded) {
      overviewButton.setAttribute('aria-expanded', String(expanded));
      el('journeyOverview').hidden = !expanded;
      el('overviewLabel').textContent = expanded ? 'Hide journey details' : 'View journey details';
      el('overviewSymbol').textContent = expanded ? '−' : '+';
    }
    el('compactPregnancyAge').textContent = el('gestationalAgeText').textContent.split(' • ')[0];
    setOverview(true);
    overviewButton.addEventListener('click', () => setOverview(overviewButton.getAttribute('aria-expanded') !== 'true'));
    enhanceRows();
    document.querySelectorAll('.water-glass-btn').forEach(button => {
      button.tabIndex = 0;
      button.setAttribute('role','button');
      button.setAttribute('aria-label', `Log water for ${button.textContent.replace(/[🥛💧]/gu,'').trim()}`);
    });
    document.querySelectorAll('.accordion-header').forEach(button => {
      button.tabIndex=0;
      button.setAttribute('role','button');
      button.setAttribute('aria-expanded',String(button.classList.contains('active')));
    });
    document.querySelectorAll('.time-header').forEach(header => {
      const block = header.closest('.time-block');
      const button = document.createElement('button');
      button.className='block-collapse';
      button.type='button';
      button.textContent='−';
      button.setAttribute('aria-expanded','true');
      button.setAttribute('aria-label', `Collapse ${header.querySelector('h2').textContent} checklist`);
      button.addEventListener('click', () => {
        const collapsed = block.classList.toggle('collapsed');
        button.textContent=collapsed?'+':'−';
        button.setAttribute('aria-expanded',String(!collapsed));
        button.setAttribute('aria-label', `${collapsed?'Expand':'Collapse'} ${header.querySelector('h2').textContent} checklist`);
      });
      header.append(button);
    });
    const tabs = [...document.querySelectorAll('.tab-btn')];
    tabs.forEach((button, index) => {
      button.id=`care-tab-${index}`;
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls',index===0?'tablets-tab':'vaccines-tab');
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const target=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        tabs[target].click();
        tabs[target].focus();
      });
    });
    document.querySelectorAll('.tab-content').forEach((panel,index) => {
      panel.setAttribute('role','tabpanel');
      panel.setAttribute('aria-labelledby',`care-tab-${index}`);
    });
    function syncTabs() {
      tabs.forEach(button => {
        const active=button.classList.contains('active');
        button.setAttribute('aria-selected',String(active));
        button.tabIndex=active?0:-1;
      });
    }
    document.addEventListener('keydown',event=>{
      if (!['Enter',' '].includes(event.key)) return;
      const target=event.target;
      if (target.matches('.item-row[onclick],.water-glass-btn,.accordion-header')) {
        event.preventDefault(); target.click();
      }
    });
    // Capture before the original checklist handlers stop propagation.
    document.addEventListener('click',event=>{
      const target=event.target;
      const changedRecord = target.closest('.item-row[onclick],.water-glass-btn');
      queueMicrotask(() => {
        if(target.closest('.tab-btn')) syncTabs();
        if(target.closest('.accordion-header')) {
          const button=target.closest('.accordion-header');
          button.setAttribute('aria-expanded',String(button.classList.contains('active')));
        }
        syncAccessibleState();
        if(changedRecord) toast('Saved on this device');
      });
    }, true);
    new MutationObserver(() => {enhanceRows();syncAccessibleState();}).observe(el('vaccineListContainer'),{childList:true});
    new MutationObserver(syncAccessibleState).observe(el('waterGrid'),{childList:true,subtree:true});
    syncTabs(); syncAccessibleState();
    el('waterProgressCount').setAttribute('aria-live','polite');
    el('tabletsProgressCount').setAttribute('aria-live','polite');
  });
})();

// A small, optional layer of delight, independent of all care records.
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const garden = document.createElement('div');
    garden.className = 'butterfly-garden';
    garden.setAttribute('aria-label', 'Interactive butterflies');
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = localStorage.getItem('mouni_butterflies_paused') === 'true';
    const toggle = document.createElement('button');
    toggle.className = 'butterfly-toggle';
    toggle.type = 'button';
    toggle.textContent = '🦋';
    function syncPause() {
      garden.classList.toggle('paused', paused || document.hidden || motionPreference.matches);
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'Resume butterflies' : 'Pause butterflies');
      toggle.title = paused ? 'Resume butterflies' : 'Pause butterflies';
    }
    toggle.addEventListener('click', () => {
      paused = !paused;
      localStorage.setItem('mouni_butterflies_paused', String(paused));
      syncPause();
    });
    document.querySelector('.masthead-actions').prepend(toggle);
    const activeSparkles = new Set();
    function sparkle(button) {
      // Bound active particles even when a butterfly is tapped repeatedly.
      activeSparkles.forEach(particle => particle.remove());
      activeSparkles.clear();
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      for (let index = 0; index < 10; index++) {
        const angle = index * Math.PI * 2 / 10;
        const distance = index % 2 ? 48 : 72;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const particle = document.createElement('span');
        particle.className = 'butterfly-sparkle';
        particle.setAttribute('aria-hidden', 'true');
        particle.textContent = index % 2 ? '✧' : '✦';
        particle.style.left = `${centerX - 10}px`;
        particle.style.top = `${centerY - 10}px`;
        garden.append(particle);
        activeSparkles.add(particle);
        const frames = motionPreference.matches
          ? [{opacity:1,transform:`translate(${x * .4}px,${y * .4}px)`},{opacity:0,transform:`translate(${x * .4}px,${y * .4}px)`}]
          : [{opacity:0,transform:'translate(0,0) scale(.7)'},{opacity:1,offset:.15,transform:`translate(${x * .25}px,${y * .25}px) scale(1)`},{opacity:0,transform:`translate(${x}px,${y}px) scale(.65)`}];
        const animation = particle.animate(frames, {duration:motionPreference.matches ? 350 : 850,easing:'cubic-bezier(.23,1,.32,1)'});
        animation.finished.then(() => {particle.remove(); activeSparkles.delete(particle);}).catch(() => {particle.remove(); activeSparkles.delete(particle);});
      }
    }
    for (let index = 0; index < 3; index++) {
      const butterfly = document.createElement('button');
      butterfly.className = 'flying-butterfly';
      butterfly.type = 'button';
      butterfly.setAttribute('aria-label', `Sparkle butterfly ${index + 1}`);
      butterfly.title = 'Tap for a little sparkle';
      butterfly.innerHTML = '<span class="butterfly-shape" aria-hidden="true"><span class="butterfly-wing left"></span><span class="butterfly-wing right"></span><span class="butterfly-body"></span></span>';
      butterfly.addEventListener('click', () => sparkle(butterfly));
      garden.append(butterfly);
    }
    document.body.append(garden);
    document.addEventListener('visibilitychange', syncPause);
    motionPreference.addEventListener('change', syncPause);
    syncPause();
  });
})();

// Original Krishna-inspired pentatonic bansuri melody, above a soft tonic drone.
// Synthesized locally so music also works offline, without streaming requests.
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('musicToggle');
    const slider = document.getElementById('musicVolume');
    const status = document.getElementById('musicStatus');
    const read = (key, fallback) => {try {return localStorage.getItem(key) ?? fallback;} catch {return fallback;}};
    const save = (key, value) => {try {localStorage.setItem(key, value);} catch { /* Private storage may be unavailable. */ }};
    let wanted = read('mouniMusicEnabled', 'true') === 'true';
    const savedVolume = Number(read('mouniMusicVolume', '25'));
    slider.value = Number.isFinite(savedVolume) ? Math.max(0, Math.min(100, savedVolume)) : 25;
    let context, master, reverb, fluteWave, breathBuffer, timer, nextNote = 0, nextDrone = 0, step = 0, starting = false;
    // Slow, spacious phrases with breaths and an unhurried return to the tonic.
    const beat = 60 / 46;
    const melody = [[74,2],[76,1],[78,2],[81,2],[78,1],[76,2],[74,3],[null,1],
      [78,2],[81,1],[83,2],[81,2],[78,2],[76,1],[74,3],[null,2],
      [76,2],[78,1],[81,2],[78,1],[76,2],[74,2],[71,2],[69,3],[null,1],
      [69,2],[71,1],[74,2],[76,2],[78,2],[76,1],[74,4],[null,2]];
    const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);
    function paint() {
      const playing = wanted && context?.state === 'running' && !document.hidden;
      button.setAttribute('aria-pressed', String(Boolean(playing)));
      button.textContent = playing ? 'Pause music' : 'Play music';
      button.setAttribute('aria-label', playing ? 'Pause Krishna-inspired flute music' : 'Play Krishna-inspired flute music');
      status.textContent = playing ? 'Gentle bansuri · playing softly' : !wanted ? 'Music paused' : document.hidden ? 'Paused while you’re away' : 'Gentle bansuri · tap to begin';
    }
    function voice(midi, time, duration, level, flute) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      if (flute) oscillator.setPeriodicWave(fluteWave); else oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency(midi) * (flute ? .995 : 1), time);
      oscillator.frequency.exponentialRampToValueAtTime(frequency(midi), time + .14);
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(level, time + (flute ? .22 : 2));
      envelope.gain.linearRampToValueAtTime(level * .85, time + duration * .65);
      envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      envelope.connect(reverb);
      const nodes = [oscillator, envelope];
      const sources = [oscillator];
      if (flute) {
        const vibrato = context.createOscillator();
        const depth = context.createGain();
        vibrato.frequency.value = 4.6;
        depth.gain.setValueAtTime(0, time);
        depth.gain.linearRampToValueAtTime(7, time + Math.min(.8, duration / 2));
        vibrato.connect(depth);depth.connect(oscillator.detune);
        const breath = context.createBufferSource();
        breath.buffer = breathBuffer;breath.loop = true;
        const breathFilter = context.createBiquadFilter();
        breathFilter.type = 'bandpass';breathFilter.frequency.value = 1300;breathFilter.Q.value = .7;
        const breathGain = context.createGain();breathGain.gain.value = .045;
        breath.connect(breathFilter);breathFilter.connect(breathGain);breathGain.connect(envelope);
        nodes.push(vibrato, depth, breath, breathFilter, breathGain);
        sources.push(vibrato, breath);
      }
      sources.forEach(source => {source.start(time);source.stop(time + duration + .1);});
      oscillator.onended = () => nodes.forEach(node => node.disconnect());
    }
    function schedule() {
      if (!wanted || document.hidden || context.state !== 'running') return;
      if (nextNote < context.currentTime) nextNote = context.currentTime + .1;
      if (nextDrone < context.currentTime) nextDrone = context.currentTime + .1;
      while (nextDrone < context.currentTime + 4) {
        voice(50, nextDrone, 17, .05, false);
        voice(57, nextDrone, 17, .025, false);
        nextDrone += 14;
      }
      while (nextNote < context.currentTime + 4) {
        const [note, beats] = melody[step % melody.length];
        const duration = beats * beat;
        if (note !== null) voice(note, nextNote, duration * .94, .26, true);
        nextNote += duration;
        step++;
      }
    }
    async function start() {
      if (!wanted || document.hidden) return;
      if (starting) {context?.resume().catch(() => {});return;}
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) {status.textContent = 'Music is unavailable in this browser';button.disabled = true;return;}
      starting = true;
      try {
        if (!context) {
          context = new Audio();
          master = context.createGain();
          master.gain.value = Number(slider.value) / 100 * .6;
          master.connect(context.destination);
          // Airy flute harmonics and a short, quiet room reverb.
          fluteWave = context.createPeriodicWave(new Float32Array(5), new Float32Array([0,1,.2,.07,.015]));
          breathBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
          const breathSamples = breathBuffer.getChannelData(0);
          for (let i = 0; i < breathSamples.length; i++) breathSamples[i] = Math.random() * 2 - 1;
          reverb = context.createConvolver();
          const impulse = context.createBuffer(2, context.sampleRate * 2, context.sampleRate);
          for (let channel = 0; channel < 2; channel++) {
            const samples = impulse.getChannelData(channel);
            for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples.length, 3);
          }
          reverb.buffer = impulse;
          const wet = context.createGain();wet.gain.value = .16;
          reverb.connect(wet);wet.connect(master);
          nextNote = nextDrone = context.currentTime + .15;
          context.addEventListener('statechange', paint);
        }
        await context.resume();
        if (!wanted || document.hidden) {await context.suspend();return;}
        clearInterval(timer);
        schedule();
        timer = setInterval(schedule, 1000);
      } catch {status.textContent = 'Tap Play music to start';}
      finally {starting = false;paint();}
    }
    function pause() {
      clearInterval(timer);
      if (context?.state === 'running') context.suspend().catch(() => {});
      paint();
    }
    button.addEventListener('click', () => {
      wanted = !(wanted && context?.state === 'running');
      save('mouniMusicEnabled', String(wanted));
      if (wanted) start(); else pause();
      paint();
    });
    slider.addEventListener('input', () => {
      save('mouniMusicVolume', slider.value);
      if (master) master.gain.setTargetAtTime(Number(slider.value) / 100 * .6, context.currentTime, .15);
    });
    function firstInteraction(event) {
      if (!event.isTrusted || event.target.closest?.('#musicToggle')) return;
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      if (wanted && context?.state !== 'running') start();
    }
    document.addEventListener('click', firstInteraction);
    document.addEventListener('keydown', firstInteraction);
    document.addEventListener('visibilitychange', () => {if (document.hidden) pause();else if (context && wanted) start();});
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', () => {if (context && wanted) start();});
    paint();
    // Autoplay succeeds only where the browser already grants permission.
    if (navigator.userActivation?.hasBeenActive) start();
  });
})();

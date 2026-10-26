(() => {
 'use strict';
 const E=window.BabyCare,$=id=>document.getElementById(id);
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
 let profile=read('mouni_baby_profile_v1',{}),records=read('mouni_uip_records_v1',{}),prep=read('mouni_birth_prep_v1',[]),filter='early',toastTimer;
 if(!profile||typeof profile!=='object'||Array.isArray(profile))profile={};
 if(!records||typeof records!=='object'||Array.isArray(records))records={};
 if(!Array.isArray(prep))prep=[];
 const prepItems=[['arrival','Confirm hospital arrival time, admission and fasting instructions.'],['papers','Pack ID, scan reports, hospital notes and insurance papers.'],['transport','Arrange transport and save the hospital and care-team contacts.'],['bag','Pack comfortable clothes, maternity pads, baby clothes and a clean wrap.'],['discharge','Ask about birth-dose vaccines, feeding support and the discharge follow-up.']];
 function notify(message){$('saveToast').textContent=message;$('saveToast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('saveToast').classList.remove('visible'),2200);}
 function save(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{notify('Unable to save in this browser. Check storage settings.');return false;}}
 const fmt=day=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
 const confirmed=()=>Boolean(profile.confirmed&&E.validDate(profile.birthDate)&&profile.birthDate<=E.indiaDate());
 const birth=()=>confirmed()?profile.birthDate:E.PLANNED_BIRTH;
 function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
 function renderHeader(){
  const left=Date.parse(E.DELIVERY)-Date.now();
  $('deliveryStatus').textContent=confirmed()?'Birth record confirmed':left>0?`${Math.floor(left/86400000)}d ${Math.floor(left%86400000/3600000)}h to go`:'Add actual birth record';
  $('scheduleBasis').textContent=confirmed()?`Dates use the confirmed birth date: ${fmt(birth())}. Record each dose from the hospital vaccination card.`:`Provisional dates below use the planned delivery on ${fmt(E.PLANNED_BIRTH)}. Confirm the actual birth date after delivery; you can then record vaccinations.`;
  $('birthRecordStatus').textContent=confirmed()?`Confirmed birth date: ${fmt(profile.birthDate)}. Edit and save if needed.`:'Not yet confirmed. The scheduled delivery is not treated as the actual birth.';
  $('editPlan').hidden=!confirmed();
  $('jeOption').checked=Boolean(profile.je);
  $('actualBirthDate').max=E.indiaDate();
 }
 function renderVaccines(){
  const groups=E.schedule(birth(),Boolean(profile.je));
  const allowedIds=new Set(groups.flatMap(g=>g.doses.map(d=>d[0])));
  const count=[...allowedIds].filter(id=>records[id]&&E.validDate(records[id].date)).length;
  $('vaccineProgress').textContent=`${count} / ${allowedIds.size} doses recorded`;
  const list=$('vaccineList');list.replaceChildren();
  const shown=filter==='early'?groups.slice(0,4):groups;
  for(const group of shown){
   const doses=filter==='given'?group.doses.filter(d=>records[d[0]]):group.doses;
   if(!doses.length)continue;
   const card=node('section','vaccine-group');
   const heading=node('div','vaccine-group-heading'),title=node('div');
   title.append(node('h3','',group.age));
   if(group.end)title.append(node('span','group-window','Visit window through '+fmt(group.end)));
   heading.append(title,node('span','target-date',(confirmed()?'':'Planned · ')+fmt(group.start)));card.append(heading);
   if(group.note)card.append(node('p','group-note',group.note));
   for(const [id,name,conditional] of doses){
    const record=records[id];const row=node('div','dose'+(record?' given':'')),label=node('label','dose-label');
    const check=node('input');check.type='checkbox';check.checked=Boolean(record);check.disabled=!confirmed();check.dataset.dose=id;
    label.append(check,node('span','',name+(conditional?' · if advised':'')));row.append(label);
    check.addEventListener('change',()=>{
     if(!confirmed())return;
     const next={...records};if(check.checked)next[id]={date:E.indiaDate()};else delete next[id];
     if(save('mouni_uip_records_v1',next)){records=next;renderVaccines();notify('Vaccination record saved');}else check.checked=!check.checked;
    });
    if(record){
     const date=node('input','dose-date');date.type='date';date.value=record.date;date.min=birth();date.max=E.indiaDate();date.required=true;date.setAttribute('aria-label',name+' date given');
     date.addEventListener('change',()=>{
      if(!E.validDate(date.value)||date.value<birth()||date.value>E.indiaDate()){date.value=record.date;notify('Choose a date between birth and today.');return;}
      const next={...records,[id]:{date:date.value}};if(save('mouni_uip_records_v1',next)){records=next;notify('Date saved');}
     });row.append(date);
    }
    card.append(row);
   }
   list.append(card);
  }
  if(!list.children.length)list.append(node('p','empty-state','No doses recorded yet. Confirm the actual birth date, then use the vaccination card to mark doses given.'));
  document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
 }
 function renderVisits(){
  const list=$('careVisits');list.replaceChildren();
  for(const visit of E.ranges(birth(),E.VISITS)){
   const row=node('div','visit-row');row.append(node('strong','',visit.age),node('p','',(confirmed()?'':'Provisional · ')+fmt(visit.start)+(visit.end?' – '+fmt(visit.end):'')),node('p','',visit.note));list.append(row);
  }
 }
 function renderPrep(){
  const list=$('prepList');list.replaceChildren();
  for(const [id,text] of prepItems){
   const label=node('label','prep-item'+(prep.includes(id)?' done':'')),check=node('input');check.type='checkbox';check.checked=prep.includes(id);label.append(check,node('span','',text));list.append(label);
   check.addEventListener('change',()=>{const next=check.checked?[...new Set([...prep,id])]:prep.filter(x=>x!==id);if(save('mouni_birth_prep_v1',next)){prep=next;renderPrep();}});
  }
 }
 function render(){renderHeader();renderVaccines();renderVisits();}
 $('birthForm').addEventListener('submit',event=>{
  event.preventDefault();const date=$('actualBirthDate').value;
  if(!E.validDate(date)||date>E.indiaDate()){$('birthRecordStatus').textContent='Use the actual birth date, today or earlier, after delivery.';return;}
  // A date correction must not leave an earlier administration date before birth.
  if(Object.values(records).some(record=>record.date<date)){$('birthRecordStatus').textContent='Some vaccine dates are earlier than this birth date. Correct those recorded dates before changing the birth date.';return;}
  const next={...profile,birthDate:date,confirmed:true,weight:$('birthWeight').value,hospital:$('hospitalName').value.trim()};
  if(save('mouni_baby_profile_v1',next)){profile=next;render();notify('Birth record saved; schedule updated');}
 });
 $('editPlan').addEventListener('click',()=>{const next={...profile,confirmed:false};if(save('mouni_baby_profile_v1',next)){profile=next;render();notify('Using provisional dates');}});
 $('jeOption').addEventListener('change',()=>{const next={...profile,je:$('jeOption').checked};if(save('mouni_baby_profile_v1',next)){profile=next;renderVaccines();}});
 document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;renderVaccines();}));
 $('downloadCalendar').addEventListener('click',()=>{
  try{
   const data=E.calendar(new Date(),profile),url=URL.createObjectURL(new Blob([data],{type:'text/calendar;charset=utf-8'}));
   const link=node('a');link.href=url;link.download='mouni-phone-reminders.ics';link.hidden=true;document.body.append(link);try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
   $('calendarFeedback').textContent=confirmed()?'Saved delivery and baby-care calendar. Import on a laptop, then sync to Android.':'Saved with provisional baby-care dates based on 29 October. Confirm the actual birth date and replace this import after delivery.';
  }catch(error){$('calendarFeedback').textContent='Unable to create the calendar. '+error.message;}
 });
 let dark=read('mouni_baby_dark',false);
 function setTheme(){document.documentElement.dataset.theme=dark?'dark':'light';$('themeToggle').setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');}
 $('themeToggle').addEventListener('click',()=>{dark=!dark;save('mouni_baby_dark',dark);setTheme();});setTheme();
 if(E.validDate(profile.birthDate))$('actualBirthDate').value=profile.birthDate;
 $('birthWeight').value=typeof profile.weight==='string'?profile.weight:'';
 $('hospitalName').value=typeof profile.hospital==='string'?profile.hospital:'';
 const legacy=read('checkedVaccines',[]);
 if(Array.isArray(legacy)&&legacy.length){
  $('olderRecords').hidden=false;for(const id of legacy)$('legacyVaccineList').append(node('li','',String(id)));
 }
 render();renderPrep();
 let lastDay=E.indiaDate();setInterval(()=>{renderHeader();const day=E.indiaDate();if(day!==lastDay){lastDay=day;render();}},60000);
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
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
    let wanted = false; // Music starts only when Play is pressed.
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
    document.addEventListener('visibilitychange', () => {if (document.hidden) pause();else if (context && wanted) start();});
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', () => {if (context && wanted) start();});
    paint();
    // Autoplay succeeds only where the browser already grants permission.

  });
})();

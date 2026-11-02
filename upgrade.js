(() => {
 'use strict';
 const E=window.BabyCare,$=id=>document.getElementById(id);
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
 let profile=read('mouni_baby_profile_v1',{}),records=read('mouni_uip_records_v1',{}),prep=read('mouni_birth_prep_v1',[]),care=read('mouni_discharge_care_v1',{}),actions=read('mouni_care_actions_v1',{}),doseLog=read('mouni_dose_log_v1',{}),scheduleDay=E.indiaDate(),guideMonth=null,filter='early',toastTimer;
 if(!profile||typeof profile!=='object'||Array.isArray(profile))profile={};
 if(!records||typeof records!=='object'||Array.isArray(records))records={};
 if(!Array.isArray(prep))prep=[];
 const prepItems=[['home-papers','Keep the discharge summaries, final lab reports and vaccination card together.'],['home-contact','Save hospital, pediatrician and OB emergency contacts.'],['home-feeding','Note feeds, wet nappies and any feeding or jaundice concerns for review.'],['home-followup','Book the next doctor visits and take all reports along.']];
 if(!care||typeof care!=='object'||Array.isArray(care))care={};
 if(!actions||typeof actions!=='object'||Array.isArray(actions))actions={};
 const plan=()=>profile.plan==='uip'?'uip':'hospital';
 function notify(message){$('saveToast').textContent=message;$('saveToast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('saveToast').classList.remove('visible'),2200);}
 function save(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{notify('Unable to save in this browser. Check storage settings.');return false;}}
 const fmt=day=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
 const confirmed=()=>Boolean(profile.confirmed&&E.validDate(profile.birthDate)&&profile.birthDate<=E.indiaDate());
 const birth=()=>confirmed()?profile.birthDate:E.PLANNED_BIRTH;
 function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
 function renderHeader(){
  $('deliveryTitle').textContent=confirmed()?'Born '+fmt(birth()):'Baby’s care & recovery';
  const time=/^([01]\d|2[0-3]):[0-5]\d$/.test(profile.birthTime||'')?new Intl.DateTimeFormat('en-IN',{hour:'numeric',minute:'2-digit',timeZone:E.ZONE}).format(new Date(birth()+'T'+profile.birthTime+':00+05:30'))+' IST':'';
  $('deliveryDescription').textContent=confirmed()?[time,profile.sex==='Male'?'Baby boy':profile.sex==='Female'?'Baby girl':'',profile.weight?'Birth weight '+profile.weight+' kg':''].filter(Boolean).join(' · '):'Import your discharge record or enter the actual birth date to start.';
  $('deliveryStatus').textContent=confirmed()?'Birth record confirmed':'Birth record needed';
  $('scheduleBasis').textContent=confirmed()?`Dates use the confirmed birth date: ${fmt(birth())}. Record each dose from the hospital vaccination card.`:`Provisional dates below use the planned delivery on ${fmt(E.PLANNED_BIRTH)}. Confirm the actual birth date after delivery; you can then record vaccinations.`;
  $('birthRecordStatus').textContent=confirmed()?`Confirmed birth date: ${fmt(profile.birthDate)}. Edit and save if needed.`:'Not yet confirmed. The scheduled delivery is not treated as the actual birth.';
  $('editPlan').hidden=!confirmed();
  $('birthEdit').open=!confirmed();
  $('vaccinePlan').value=plan();
  $('vaccinePlanDescription').textContent=plan()==='hospital'?'Hospital vaccination card · one plan at a time':'India UIP reference · do not add to the hospital plan as extra doses';
  $('exportPrivate').disabled=!confirmed();
  $('jeOption').checked=Boolean(profile.je);
  $('actualBirthDate').max=E.indiaDate();
 }
 function renderVaccines(){
  const groups=E.schedule(birth(),Boolean(profile.je),plan());
  const allowedIds=new Set(groups.flatMap(g=>g.doses.map(d=>d[0])));
  const count=[...allowedIds].filter(id=>records[id]&&E.validDate(records[id].date)).length;
  $('vaccineProgress').textContent=`${count} / ${allowedIds.size} entries recorded`;
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
   if(group.start>E.indiaDate())card.append(node('p','source-note','Advance alerts at 9 AM IST: '+E.reminderDates(group.start,'vaccine').map(fmt).join(' · ')));
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
  if(!list.children.length)list.append(node('p','empty-state','No entries recorded yet. Confirm the actual birth date, then use the vaccination card to mark doses given.'));
  document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
 }
 function renderVisits(){
  const list=$('careVisits');list.replaceChildren();
  list.closest('section').hidden=Array.isArray(care.appointments)&&care.appointments.length>0;
  if(list.closest('section').hidden)return;
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
 function render(){renderHeader();renderVaccines();renderVisits();renderDischarge();renderMedicines();renderGrowth();}
 function rows(section,items){
  const list=$(section);list.replaceChildren();
  for(const item of Array.isArray(items)?items:[]){
   const row=node('div','visit-row');row.append(node('strong','',item.title||item.label||''));
   if(item.value)row.append(node('p','',item.value));
   if(item.note)row.append(node('p','',item.note));
   if(item.date)row.append(node('small','source-note','Report date: '+fmt(item.date)));
   if(item.source)row.append(node('small','source-note','Source: '+item.source));
   list.append(row);
  }
 }
 function renderDischarge(){
  const list=$('nextActions');list.replaceChildren();$('otherActions').replaceChildren();
  if(!Array.isArray(care.tasks)||!care.tasks.length)list.append(node('p','small-note','Import your private discharge record to load the doctor’s follow-ups and pending actions.'));
  for(const [taskIndex,item] of (care.tasks||[]).entries()){
   const label=node('label','action-item'+(actions[item.id]?' done':'')),check=node('input');check.type='checkbox';check.checked=!!actions[item.id];
   const text=node('span');text.append(node('strong','',item.title),node('small','',item.note));if(item.source)text.append(node('small','source-note','Source: '+item.source));label.append(check,text);(taskIndex<2?list:$('otherActions')).append(label);
   check.addEventListener('change',()=>{const next={...actions,[item.id]:check.checked};if(save('mouni_care_actions_v1',next)){actions=next;renderDischarge();}});
  }
  const appointments=$('documentAppointments');appointments.replaceChildren();
  for(const item of [...(care.appointments||[])].sort((a,b)=>a.date.localeCompare(b.date))){
   const row=node('article','appointment-row');row.append(node('span','appointment-date',fmt(item.date)+(item.windowEnd?' – '+fmt(item.windowEnd):'')),node('h3','',item.title),node('small','appointment-kind',item.confirmed?'Date documented · book a time':'Planning target · confirm date'),node('p','',item.windowEnd?'Confirm the date within this planning window.':'Book the time with the clinic.'));const detail=node('details');detail.append(node('summary','','Visit details & reminders'),node('p','',item.note),node('small','source-note','Source: '+item.source),node('small','source-note','Advance alerts at 9 AM IST: '+E.reminderDates(item.date).map(fmt).join(' · ')+'. Past dates cannot notify retroactively.'));row.append(detail);appointments.append(row);
  }
  rows('dailyDischargeCare',care.dailyCare);rows('privateFacts',care.facts);rows('privatePrescriptions',care.prescriptions);rows('privateLabs',care.labs);rows('privateUrgent',care.urgentSigns);
  const contacts=$('privateContacts');contacts.replaceChildren();
  for(const contact of care.contacts||[]){const row=node('p','contact-row');row.append(node('strong','',contact.name+' '));for(const number of [contact.phone,contact.alternate].filter(Boolean)){const link=node('a','',number);link.href='tel:'+String(number).replace(/[^+0-9]/g,'');row.append(link,document.createTextNode(' '));}contacts.append(row);}
 }
 function renderMedicines(){
  const today=E.indiaDate(),selected=scheduleDay;$('medicineDay').textContent=(selected===today?'Today · ':'')+fmt(selected)+' · India time';$('scheduleDate').value=selected;
  const list=$('medicineList');list.replaceChildren();
  const slots=E.medicationSlots(care,selected);
  $('doseProgress').textContent=slots.filter(m=>doseLog[m.key]).length+' / '+slots.length+' done';
  if(!slots.length)list.append(node('p','small-note','No active entries for this date. Check course dates below, or import your private record if it is not loaded.'));
  for(const m of slots){
   const label=node('label','action-item'+(doseLog[m.key]?' done':'')),check=node('input');check.type='checkbox';check.checked=!!doseLog[m.key];check.disabled=selected>today;
   const text=node('span');text.append(node('strong','',m.time+' · '+m.title),node('small','',m.dose+' · '+(m.shortNote||m.note)));label.append(check,text);list.append(label);
   check.addEventListener('change',()=>{const next={...doseLog,[m.key]:check.checked};if(save('mouni_dose_log_v1',next)){doseLog=next;renderMedicines();}});
  }
  for(const m of care.medications||[])if(!m.enabled)list.append(node('p','planning-note',m.title+' · Pending verification: '+m.note));
  const settings=$('medicineSettings');settings.replaceChildren();
  for(const m of E.scheduledItems(care)){
   const row=node('div','visit-row');row.append(node('strong','',m.title),node('p','',fmt(m.start)+(m.end?' – '+fmt(m.end):' · daily, ongoing')+' · '+(m.enabled?'Scheduled':'Pending verification — no intake alarms')),node('p','',m.note));
   if(m.enabled)for(const [i,time] of m.times.entries()){
    const label=node('label','reminder-time','Reminder '+(i+1)+' '),input=node('input');input.type='time';input.value=time;input.required=true;input.setAttribute('aria-label',m.title+' reminder '+(i+1));label.append(input);row.append(label);
    input.addEventListener('change',()=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.value)){input.value=time;return;}const next=JSON.parse(JSON.stringify(care));next[m.category].find(x=>x.id===m.id).times[i]=input.value;if(save('mouni_discharge_care_v1',next)){care=next;renderMedicines();notify('Time saved. Replace your calendar import to update phone alerts.');}});
   }
   settings.append(row);
  }
 }
 function renderGrowth(){
  const today=E.indiaDate(),age=confirmed()?E.ageAt(birth(),today):null,selector=$('guideMonth');
  $('babyAge').textContent=age?(age.months?age.months+' months · ':'')+age.days+' days since birth · '+fmt(today):'Confirm the birth date to personalise age and dates.';
  if(!selector.options.length)for(const g of E.DEVELOPMENT){const option=node('option','',g.month===0?'Newborn · first weeks':g.month+' month'+(g.month===1?'':'s'));option.value=g.month;selector.append(option);}
  const month=guideMonth===null?(age?Math.min(age.months,12):0):guideMonth;selector.value=month;
  const g=E.DEVELOPMENT[month],article=$('developmentGuide');article.replaceChildren();
  article.append(node('h3','',g.title));
  if(age)article.append(node('p','guide-date',month===0?'First weeks from '+fmt(birth()):(month<age.months?'Reached ':month===age.months?'Current chapter · ':'Looking ahead · ')+fmt(E.addMonths(birth(),month))));
  article.append(node('p','',g.development));
  if(month===0&&age){const week=age.days<7?'First week: keep feeding, warmth and the discharge follow-up plan at the centre.':age.days<14?'Second week: bring feeding, weight and recovery questions to the arranged review.':'Later newborn weeks: keep responding to his cues and follow the care team’s review plan.';article.append(node('p','newborn-focus',week));}
  const list=node('ul','guide-tips');for(const tip of g.tips)list.append(node('li','',tip));article.append(list);
  const links=node('p','guide-sources');for(const [label,url] of g.sources){const link=node('a','',label);link.href=url;link.target='_blank';link.rel='noopener';links.append(link,document.createTextNode(' '));}article.append(links);
  if(age&&age.months>12)article.append(node('p','small-note','This guide covers the first year. Use the CDC source for later-age checklists and discuss development with the pediatrician.'));
  const number=Math.floor(Date.parse(today+'T12:00:00Z')/86400000);$('dailyEncouragement').textContent=E.ENCOURAGEMENT[number%E.ENCOURAGEMENT.length];
 }
 $('scheduleDate').addEventListener('change',()=>{const day=$('scheduleDate').value;if(!E.validDate(day)){$('scheduleDate').value=scheduleDay;return;}scheduleDay=day;renderMedicines();});
 $('previousDay').addEventListener('click',()=>{scheduleDay=E.addDays(scheduleDay,-1);renderMedicines();});
 $('nextDay').addEventListener('click',()=>{scheduleDay=E.addDays(scheduleDay,1);renderMedicines();});
 $('scheduleToday').addEventListener('click',()=>{scheduleDay=E.indiaDate();renderMedicines();});
 $('guideMonth').addEventListener('change',()=>{guideMonth=Number($('guideMonth').value);renderGrowth();});
 $('currentGuide').addEventListener('click',()=>{guideMonth=null;renderGrowth();});
 function importRecord(text){
  try{
   if(text.length>1000000)throw new Error('The care record is too large. Use the prepared JSON file, not a PDF.');
   const data=E.validateImport(JSON.parse(text));
   const merged={...records,...data.records};
   const batch={'mouni_baby_profile_v1':data.profile,'mouni_uip_records_v1':merged,'mouni_discharge_care_v1':data.care};
   const before={};
   try{for(const key of Object.keys(batch)){before[key]=localStorage.getItem(key);localStorage.setItem(key,JSON.stringify(batch[key]));}}
   catch(error){for(const key of Object.keys(before)){if(before[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,before[key]);}throw new Error('Browser storage is unavailable. No care record was imported.');}
   profile=data.profile;records=merged;care=data.care;
   $('actualBirthDate').value=profile.birthDate;$('actualBirthTime').value=profile.birthTime||'';$('birthWeight').value=profile.weight||'';$('hospitalName').value=profile.hospital||'';
   render();$('importFeedback').textContent='Imported on this device. Birth, given vaccines, discharge notes and follow-ups are ready. No file was uploaded.';$('careRecordText').value='';notify('Private record imported');
  }catch(error){$('importFeedback').textContent='Import failed: '+error.message;}
 }
 $('careRecordInput').addEventListener('change',async event=>{const file=event.target.files[0];if(file){try{importRecord(await file.text());}catch{$('importFeedback').textContent='Unable to read this file.';}event.target.value='';}});
 $('pasteCareForm').addEventListener('submit',event=>{event.preventDefault();importRecord($('careRecordText').value);});
 $('vaccinePlan').addEventListener('change',()=>{const next={...profile,plan:$('vaccinePlan').value};if(save('mouni_baby_profile_v1',next)){profile=next;render();}});
 $('exportPrivate').addEventListener('click',()=>{
  const data={schema:'mouni-family-care/v1',profile:{...profile,plan:plan()},records,care};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=node('a');link.href=url;link.download='family-care-record.private.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 });
 $('birthForm').addEventListener('submit',event=>{
  event.preventDefault();const date=$('actualBirthDate').value;
  if(!E.validDate(date)||date>E.indiaDate()){$('birthRecordStatus').textContent='Use the actual birth date, today or earlier, after delivery.';return;}
  // A date correction must not leave an earlier administration date before birth.
  if(Object.values(records).some(record=>record.date<date)){$('birthRecordStatus').textContent='Some vaccine dates are earlier than this birth date. Correct those recorded dates before changing the birth date.';return;}
  const next={...profile,birthDate:date,birthTime:$('actualBirthTime').value,plan:plan(),confirmed:true,weight:$('birthWeight').value,hospital:$('hospitalName').value.trim()};
  if(save('mouni_baby_profile_v1',next)){profile=next;render();notify('Birth record saved; schedule updated');}
 });
 $('editPlan').addEventListener('click',()=>{const next={...profile,confirmed:false};if(save('mouni_baby_profile_v1',next)){profile=next;render();notify('Using provisional dates');}});
 $('jeOption').addEventListener('change',()=>{const next={...profile,je:$('jeOption').checked};if(save('mouni_baby_profile_v1',next)){profile=next;renderVaccines();}});
 document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;renderVaccines();}));
 $('downloadCalendar').addEventListener('click',()=>{
  try{
   const data=E.calendar(new Date(),{...profile,plan:plan()},care,records),url=URL.createObjectURL(new Blob([data],{type:'text/calendar;charset=utf-8'}));
   const link=node('a');link.href=url;link.download='mouni-phone-reminders.ics';link.hidden=true;document.body.append(link);try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
   $('calendarFeedback').textContent=confirmed()?'Saved appointments, advance alerts, vaccines and active medicine reminders. Import on a laptop, then sync to Android and check event notifications.':'Saved with provisional baby-care dates based on 29 October. Confirm the actual birth date and replace this import after delivery.';
  }catch(error){$('calendarFeedback').textContent='Unable to create the calendar. '+error.message;}
 });
 let dark=read('mouni_baby_dark',false);
 function setTheme(){document.documentElement.dataset.theme=dark?'dark':'light';$('themeToggle').setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');}
 $('themeToggle').addEventListener('click',()=>{dark=!dark;save('mouni_baby_dark',dark);setTheme();});setTheme();
 if(E.validDate(profile.birthDate))$('actualBirthDate').value=profile.birthDate;
 $('actualBirthTime').value=typeof profile.birthTime==='string'?profile.birthTime:'';
 $('birthWeight').value=typeof profile.weight==='string'?profile.weight:'';
 $('hospitalName').value=typeof profile.hospital==='string'?profile.hospital:'';
 const legacy=read('checkedVaccines',[]);
 if(Array.isArray(legacy)&&legacy.length){
  $('olderRecords').hidden=false;for(const id of legacy)$('legacyVaccineList').append(node('li','',String(id)));
 }
 render();renderPrep();
 let lastDay=E.indiaDate();setInterval(()=>{renderHeader();const day=E.indiaDate();if(day!==lastDay){if(scheduleDay===lastDay)scheduleDay=day;lastDay=day;render();}},60000);
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

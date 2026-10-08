/* Background alarms require a push sender. This module deliberately promises
   page-open reminders only and provides a phone-calendar alternative. */
(function (root) {
  'use strict';
  const ZONE = 'Asia/Kolkata';
  function indiaDate(now) {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const part = type => parts.find(value => value.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function schedule(now, includeWater = true) {
    const day = indiaDate(now);
    const slots = [
      {time:'07:30',kind:'care',block:'morning',title:'Morning care checklist'},
      {time:'13:30',kind:'care',block:'afternoon',title:'Afternoon care checklist'},
      {time:'21:00',kind:'care',block:'night',title:'Night care checklist'},
      {time:'22:00',kind:'care',block:'bedtime',title:'Bedtime care checklist'}
    ];
    if (includeWater && day <= '2026-11-14') {
      for(let hour=8;hour<=21;hour++) slots.push({time:`${String(hour).padStart(2,'0')}:00`,kind:'water',hour,title:'Water check-in'});
    }
    return slots.map(slot => ({...slot,id:`${day}:${slot.kind}:${slot.time}`,at:Date.parse(`${day}T${slot.time}:00+05:30`)})).sort((a,b)=>a.at-b.at);
  }
  function latestDue(slots, now, delivered, maxAgeMs = 90 * 60000) {
    return slots.filter(slot => slot.at <= now && now-slot.at <= maxAgeMs && !delivered.includes(slot.id)).slice(-1)[0] || null;
  }
  function escapeICS(value) {return String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
  function foldICS(line) {
    const encoder=new TextEncoder();let output='',segment='',size=0;
    for(const char of line) {
      const bytes=encoder.encode(char).length;
      if(size+bytes>75) {output+=segment+'\r\n';segment=' ';size=1;}
      segment+=char;size+=bytes;
    }
    return output+segment;
  }
  function calendar(now, endDate, mode='all') {
    const start=indiaDate(now);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < start) throw new Error('Choose an end date today or later.');
    const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const until=date=>new Date(`${date}T23:59:59+05:30`).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mouni Baby Hub//Phone Reminders//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Mouni care reminders','X-WR-TIMEZONE:Asia/Kolkata','BEGIN:VTIMEZONE','TZID:Asia/Kolkata','BEGIN:STANDARD','DTSTART:19700101T000000','TZOFFSETFROM:+0530','TZOFFSETTO:+0530','TZNAME:IST','END:STANDARD','END:VTIMEZONE'];
    for(const slot of schedule(now,true).filter(slot=>mode==='all'||slot.kind===mode)) {
      const end=slot.kind==='water'&&endDate>'2026-11-14'?'2026-11-14':endDate;
      const datePart=start.replace(/-/g,'');
      const timePart=slot.time.replace(':','');
      const endTime=new Date(slot.at+15*60000).toLocaleTimeString('en-GB',{timeZone:ZONE,hour12:false}).replace(/:/g,'');
      lines.push('BEGIN:VEVENT',`UID:mouni-${slot.kind}-${timePart}-${datePart}@mounibaby.app`,`DTSTAMP:${stamp}`,`SUMMARY:${escapeICS(slot.title)}`,`DTSTART;TZID=${ZONE}:${datePart}T${timePart}00`,`DTEND;TZID=${ZONE}:${datePart}T${endTime}`,`RRULE:FREQ=DAILY;UNTIL=${until(end)}`,`DESCRIPTION:${escapeICS(slot.kind==='care'?'Open your current care checklist. Follow your current prescription; this event does not specify a medicine or dose.':'Water check-in. Follow your current care plan.')}`);
      for(const trigger of slot.kind==='care'?['-PT10M','PT0M']:['PT0M']) lines.push('BEGIN:VALARM',`TRIGGER:${trigger}`,'ACTION:DISPLAY',`DESCRIPTION:${escapeICS(slot.title)}`,'END:VALARM');
      lines.push('END:VEVENT');
      if(slot.kind==='care') {
        // A distinct event works in calendars that reject after-start VALARM triggers.
        const followStart=new Date(slot.at+5*60000).toLocaleTimeString('en-GB',{timeZone:ZONE,hour12:false}).replace(/:/g,'');
        const followEnd=new Date(slot.at+20*60000).toLocaleTimeString('en-GB',{timeZone:ZONE,hour12:false}).replace(/:/g,'');
        lines.push('BEGIN:VEVENT',`UID:mouni-care-followup-${timePart}-${datePart}@mounibaby.app`,`DTSTAMP:${stamp}`,`SUMMARY:${escapeICS(slot.title + ': follow-up')}`,`DTSTART;TZID=${ZONE}:${datePart}T${followStart}`,`DTEND;TZID=${ZONE}:${datePart}T${followEnd}`,`RRULE:FREQ=DAILY;UNTIL=${until(end)}`,`DESCRIPTION:${escapeICS('Check your checklist if it is still pending. If it is already complete, ignore this follow-up. This reminder is not an instruction to take another dose.')}`,'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY',`DESCRIPTION:${escapeICS(slot.title + ': follow-up')}`,'END:VALARM','END:VEVENT');
      }
    }
    if (mode === 'all') {
      const appointments = [
        {id:'doctor-last-checkup-20261014',start:'20261014T100000',end:'20261014T113000',title:'Last doctor checkup',desc:'Existing tracker appointment: 14 October 2026. Confirm the appointment time with the clinic.'},
        {id:'final-scan-20261028',start:'20261025T100000',end:'20261025T113000',title:'Final scan planning reminder',desc:'Reminder to arrange the final scan before 28 October. This calendar entry is a planning reminder, not a confirmed scan appointment.'},
        {id:'planned-delivery-20261101',start:'20261101T090000',end:'20261105T180000',title:'Planned delivery window (1–5 November)',desc:'Existing tracker delivery window: 1–5 November 2026. Confirm the current plan with the doctor.'}
      ];
      for (const event of appointments.filter(event => event.start.slice(0,8) >= start.replace(/-/g,''))) {
        lines.push('BEGIN:VEVENT',`UID:${event.id}@mounibaby.app`,`DTSTAMP:${stamp}`,`SUMMARY:${escapeICS(event.title)}`,`DTSTART;TZID=${ZONE}:${event.start}`,`DTEND;TZID=${ZONE}:${event.end}`,`DESCRIPTION:${escapeICS(event.desc)}`,'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY',`DESCRIPTION:${escapeICS(event.title)}`,'END:VALARM','BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY',`DESCRIPTION:${escapeICS(event.title)}`,'END:VALARM','END:VEVENT');
      }
    }
    lines.push('END:VCALENDAR');return lines.map(foldICS).join('\r\n')+'\r\n';
  }
  const engine={indiaDate,schedule,latestDue,calendar};
  if(typeof module!=='undefined' && module.exports) module.exports=engine;
  if(!root.document) return;
  root.ReminderEngine=engine;
  const el=id=>document.getElementById(id);
  let interval,repeatTimer,audioContext,currentAlert=null,trackerDay=null;
  let snoozed=readJSON('mouni_reminder_snoozes',[]);
  let delivered=readJSON('mouni_reminder_delivered',[]);
  function readJSON(key,fallback) {try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
  function persist() {
    const day=indiaDate(new Date());delivered=delivered.filter(id=>id.startsWith(day)).slice(-40);
    localStorage.setItem('mouni_reminder_delivered',JSON.stringify(delivered));
    localStorage.setItem('mouni_reminder_snoozes',JSON.stringify(snoozed));
  }
  function feedback(text) {if(el('reminderFeedback')) el('reminderFeedback').textContent=text;}
  function enabled() {return notificationsActive;}
  async function unlockAudio() {
    try {
      const Audio=root.AudioContext||root.webkitAudioContext;
      if(!Audio) return;
      audioContext=audioContext||new Audio();
      if(audioContext.state==='suspended') await audioContext.resume();
    }catch {feedback('Sound is unavailable. The reminder will still appear on the page.');}
  }
  function ring() {
    if(!audioContext || audioContext.state!=='running') return;
    for(let index=0;index<4;index++) {
      const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
      const start=audioContext.currentTime+index*.3;
      oscillator.type='sine';oscillator.frequency.value=index%2?1046.5:830.61;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.22,start+.025);gain.gain.exponentialRampToValueAtTime(.001,start+.22);
      oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(start);oscillator.stop(start+.24);
    }
  }
  async function registration() {
    if(!root.isSecureContext || !('serviceWorker' in navigator)) throw new Error('Phone notifications need this page to be opened over HTTPS.');
    let timer;
    try {return await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Notification setup is not ready. Refresh the page and try again.')),7000);})]);}
    finally {clearTimeout(timer);}
  }
  root.updateNotificationUI=function() {
    const supported='Notification' in root;
    const permission=supported?Notification.permission:'unsupported';
    const button=el('notifToggleBtn');
    if(button) {button.textContent=enabled()?'🔔 Page alerts: On':'🔕 Page alerts: Off';button.classList.toggle('active-notif',enabled());}
    const setup=el('enablePageReminders');
    if(setup) {setup.textContent=enabled()?'Turn page alerts off':'Enable page alerts';setup.setAttribute('aria-pressed',String(enabled()));}
    const status=el('reminderPermission');
    if(status) status.textContent=!root.isSecureContext?'Use HTTPS for phone notifications':permission==='granted'?'Notification permission allowed':permission==='denied'?'Notifications blocked in browser settings':permission==='unsupported'?'In-page alerts only in this browser':'Notification permission not yet allowed';
  };
  root.toggleNotifications=async function() {
    await unlockAudio();
    if(enabled()) {notificationsActive=false;currentAlert=null;snoozed=[];persist();root.closeInAppAlert();}
    else {
      notificationsActive=true;
      if(root.isSecureContext && 'Notification' in root && Notification.permission==='default') {
        try {await Notification.requestPermission();}catch {feedback('Permission could not be requested. In-page alerts are enabled.');}
      }
      if('Notification' in root && Notification.permission==='denied') feedback('Page alerts are on. To allow Android notifications, open Chrome → Settings → Site settings → Notifications, then allow this website.');
      else feedback('Page alerts are on while this page is running. Tap Test reminder to check sound and notification delivery.');
    }
    localStorage.setItem('notificationsActive',String(enabled()));root.updateNotificationUI();
  };
  root.closeInAppAlert=function() {
    clearInterval(repeatTimer);repeatTimer=null;currentAlert=null;
    if(el('inAppAlert')) el('inAppAlert').classList.remove('show');
  };
  root.sendReminderNotification=async function(title,body,slot=null) {
    root.closeInAppAlert();currentAlert={title,body,slot};
    el('alertTitle').textContent=title;el('alertBody').textContent=body;el('inAppAlert').classList.add('show');
    ring();if(navigator.vibrate && !document.hidden) navigator.vibrate([250,120,250]);
    let repeats=0;
    repeatTimer=setInterval(()=>{if(++repeats>2){clearInterval(repeatTimer);return;}if(!document.hidden)ring();},30000);
    if('Notification' in root && Notification.permission==='granted') {
      try {
        const worker=await registration();
        await worker.showNotification(title,{body,icon:'icon-192.png?v=29',tag:slot?slot.id:'mouni-test-reminder',renotify:true,requireInteraction:true,vibrate:[300,150,300,150,300],data:{url:new URL('./index.html#careContent',location.href).href},actions:[{action:'open',title:'Open checklist'}]});
        feedback('Notification sent to Android/Chrome. Sound and vibration depend on your phone settings.');
      }catch(error) {feedback(`The page alert is visible, but the phone notification failed: ${error.message}`);}
    }
  };
  function pending(slot) {
    if(slot.kind==='water') return !drankWaterHours.includes(slot.hour);
    const wrap=el(`${slot.block}-wrap`);
    if(!wrap) return false;
    return [...wrap.querySelectorAll('.item-row')].some(row=>row.style.display!=='none'&&!row.classList.contains('checked')&&!row.querySelector('#tab-chk-13'));
  }
  function message(slot) {
    if(slot.kind==='water') return 'Time for your water check-in. Open the tracker to record it.';
    const wrap=el(`${slot.block}-wrap`);
    const names=wrap?[...wrap.querySelectorAll('.item-row')].filter(row=>row.style.display!=='none'&&!row.classList.contains('checked')&&!row.querySelector('#tab-chk-13')).map(row=>row.querySelector('.item-name')?.textContent.trim()).filter(Boolean):[];
    return names.length?`Check your current care plan: ${names.join(', ')}. Follow your current prescription.`:'Open your current care checklist.';
  }
  function tick() {
    const now=Date.now();
    const day=indiaDate(new Date(now));
    if(trackerDay && trackerDay!==day) {
      loadState();loadWaterState();checkCourseExpiration();updateDynamicHeader();updateTabletsProgress();
    }
    trackerDay=day;
    updateTimeBlockOrdering();
    if(delivered.some(id=>!id.startsWith(day)))persist();
    root.updateNotificationUI();
    if(!enabled()) return;
    const dueSnoozes=snoozed.filter(item=>item.at<=now&&now-item.at<=90*60000);
    snoozed=snoozed.filter(item=>item.at>now);
    if(dueSnoozes.length) {
      const item=dueSnoozes.at(-1);persist();
      if(!item.slot||pending(item.slot))root.sendReminderNotification(item.title,item.body,item.slot);
      return;
    }
    const slots=schedule(new Date(now)).filter(pending);
    const due=latestDue(slots,now,delivered);
    if(due) {
      // Don't flood the phone with every older slot after returning to the page.
      delivered.push(...slots.filter(slot=>slot.at<=now&&!delivered.includes(slot.id)).map(slot=>slot.id));persist();
      const late=now-due.at>=60000;
      root.sendReminderNotification(`${late?'Earlier reminder: ':''}${due.title}`,message(due),due);
    }
    if(currentAlert?.slot && !pending(currentAlert.slot))root.closeInAppAlert();
    const next=slots.find(slot=>slot.at>now);
    if(el('nextPageReminder'))el('nextPageReminder').textContent=next?`Next: ${next.title} at ${next.time} IST`:'No more scheduled page alerts today.';
  }
  root.startReminderCheck=function() {
    clearInterval(interval);interval=setInterval(tick,15000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateTimeBlockOrdering();checkCourseExpiration();tick();}});
    root.addEventListener('focus',tick);
    setTimeout(tick,0);
  };
  root.snoozeCareReminder=function() {
    if(!currentAlert)return;
    snoozed.push({...currentAlert,at:Date.now()+5*60000});persist();root.closeInAppAlert();feedback('Snoozed for 5 minutes while the page is running.');
  };
  root.testCareReminder=async function() {
    await unlockAudio();await root.sendReminderNotification('Test reminder','This is a test. No care record was changed.');
    if(!('Notification' in root)||Notification.permission!=='granted')feedback('Test sound and page alert shown. Enable page alerts and allow notifications to test Android delivery.');
  };
  function download(mode) {
    try {
      const content=calendar(new Date(),el('reminderEndDate').value,mode);
      const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download=`mouni-${mode}-phone-reminders.ics`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      feedback('Calendar file downloaded. Import it, then check event notification settings on each phone. Downloading alone does not turn on calendar alerts.');
    }catch(error){feedback(error.message);}
  }
  root.downloadICS=()=>download('all');root.downloadWaterICS=()=>download('water');
  document.addEventListener('DOMContentLoaded',()=>{
    const start=indiaDate(new Date()),end=new Date(`${start}T12:00:00+05:30`);end.setUTCMonth(end.getUTCMonth()+3);
    el('reminderEndDate').min=start;el('reminderEndDate').value=indiaDate(end);
    el('enablePageReminders').addEventListener('click',root.toggleNotifications);
    el('testCareReminder').addEventListener('click',root.testCareReminder);
    el('downloadPhoneReminders').addEventListener('click',root.downloadICS);
    root.updateNotificationUI();
  });
})(typeof window!=='undefined'?window:globalThis);

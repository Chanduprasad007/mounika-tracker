/* Private care schedules and one plain ICS calendar export. */
(function(root){
 'use strict';
 const ZONE='Asia/Kolkata';
 const PLANNED_BIRTH='2026-10-29';
 const SOURCE='https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=157836&lang=1&reg=3';
 // UIP age groups. JE is conditional on the local programme in endemic districts.
 const GROUPS=[
  {id:'birth',age:'At birth',days:0,note:'Ask the hospital to record BCG, OPV-0 and the hepatitis B birth dose. Hepatitis B birth dose is due within 24 hours.',doses:[['bcg','BCG'],['opv0','OPV-0'],['hepb-birth','Hepatitis B birth dose']]},
  {id:'6w',age:'6 weeks',days:42,doses:[['opv1','OPV-1'],['penta1','Pentavalent-1'],['rota1','Rotavirus-1'],['fipv1','fIPV-1'],['pcv1','PCV-1']]},
  {id:'10w',age:'10 weeks',days:70,doses:[['opv2','OPV-2'],['penta2','Pentavalent-2'],['rota2','Rotavirus-2']]},
  {id:'14w',age:'14 weeks',days:98,doses:[['opv3','OPV-3'],['penta3','Pentavalent-3'],['rota3','Rotavirus-3'],['fipv2','fIPV-2'],['pcv2','PCV-2']]},
  {id:'9m',age:'9–12 months',months:9,endMonths:12,note:'A visit window, not a fixed appointment. JE-1 only where recommended by the local immunization programme.',doses:[['mr1','MR-1'],['pcv-booster','PCV booster'],['fipv3','fIPV-3'],['je1','JE-1',true]]},
  {id:'16m',age:'16–24 months',months:16,endMonths:24,note:'JE-2 only where recommended by the local immunization programme.',doses:[['mr2','MR-2'],['dpt-booster1','DPT booster-1'],['opv-booster','OPV booster'],['je2','JE-2',true]]},
  {id:'5y',age:'5–6 years',months:60,endMonths:72,doses:[['dpt-booster2','DPT booster-2']]},
  {id:'10y',age:'10 years',months:120,doses:[['td10','Td']]},
  {id:'16y',age:'16 years',months:192,doses:[['td16','Td']]}
 ];
 // Transcribed from the supplied hospital vaccine card. Combination products
 // are selected by the pediatrician; rows are not instructions for extra injections.
 const HOSPITAL_GROUPS=[
  {id:'birth',age:'At birth',days:0,note:'Use the recorded administration dates from the discharge summary and vaccine card.',doses:[['bcg','BCG'],['opv0','OPV (birth)'],['hepb-birth','Hepatitis B (birth)']]},
  ...[6,10,14].map((week,i)=>({id:'hospital-'+week+'w',age:week+' weeks',days:week*7,note:'Hospital card: DTwP/DTaP, Hib, IPV, hepatitis B, rotavirus and pneumococcal. The clinician may use combination vaccines; do not add duplicate UIP doses.',doses:[['h-dtp'+(i+1),'DTwP / DTaP'],['h-hib'+(i+1),'Hib'],['h-ipv'+(i+1),'IPV'],['h-hepb'+(i+1),'Hepatitis B'],['h-rota'+(i+1),'Rotavirus'],['h-pcv'+(i+1),'Pneumococcal']]})),
  {id:'h-6m',age:'6 months',months:6,note:'Confirm the product and timing with the pediatrician.',doses:[['h-flu1','Influenza 1']]},
  {id:'h-7m',age:'7 months',months:7,note:'Printed age on the hospital card. If dose 1 is delayed, ask the pediatrician to recalculate the next dose interval.',doses:[['h-flu2','Influenza 2']]},
  {id:'h-typhoid',age:'6–9 months',months:6,endMonths:9,doses:[['h-typhoid','Typhoid']]},
  {id:'h-9m',age:'9 months',months:9,doses:[['h-mmr1','MMR']]},
  {id:'h-12m',age:'12 months',months:12,note:'JE is conditional; confirm whether it is recommended for your child and which product is used.',doses:[['h-hepa1','Hepatitis A1'],['h-je1','JE 1',true]]},
  {id:'h-13m',age:'13 months',months:13,note:'The card lists this age for JE 2. Confirm eligibility and the product-specific interval.',doses:[['h-je2','JE 2',true]]},
  {id:'h-pcv-booster',age:'12–18 months',months:12,endMonths:18,doses:[['h-pcv-booster','Pneumococcal booster']]},
  {id:'h-15m',age:'15 months',months:15,doses:[['h-mmr2','MMR 2'],['h-varicella1','Chickenpox 1']]},
  {id:'h-16m',age:'16–18 months',months:16,endMonths:18,doses:[['h-dtp-booster','DTaP'],['h-hib-booster','Hib'],['h-ipv-booster','IPV']]},
  {id:'h-18m',age:'18–24 months',months:18,endMonths:24,doses:[['h-hepa2','Hepatitis A2'],['h-varicella2','Chickenpox 2']]},
  {id:'h-2y',age:'2 years',months:24,doses:[['h-meningococcal','Meningococcal vaccine']]},
  {id:'h-4y',age:'4–5 years',months:48,endMonths:60,doses:[['h-dtp-school','DTaP'],['h-ipv-school','IPV'],['h-mmr3','MMR 3']]},
  {id:'h-10y',age:'10 years',months:120,doses:[['h-tdap','Tdap']]},
  {id:'h-hpv',age:'9–14 years',months:108,endMonths:168,note:'The card lists HPV 1 and HPV 2 but gives no interval for dose 2. Confirm eligibility, current guidance and dose interval with the pediatrician; the calendar marker is a discussion reminder for the series.',doses:[['h-hpv1','HPV vaccine 1'],['h-hpv2','HPV vaccine 2 — interval to confirm']]}
 ];
 const VISITS=[
  {id:'first-day',label:'Mother & baby: first-day assessment',days:0,endDays:1,age:'Within 24 hours',note:'Ask the birth team to arrange this assessment before discharge.'},
  {id:'day3',label:'Mother & baby: early postnatal check',days:2,endDays:3,age:'48–72 hours',note:'Arrange the visit with your hospital or health worker.'},
  {id:'week2',label:'Mother & baby: postnatal check',days:7,endDays:14,age:'7–14 days',note:'A visit window; follow the discharge appointment if it differs.'},
  {id:'week6',label:'Mother & baby: six-week check',days:42,age:'6 weeks',note:'Confirm the appointment with the care team.'}
 ];
 function indiaDate(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
 }
 function validDate(day){return /^\d{4}-\d{2}-\d{2}$/.test(day||'')&&!Number.isNaN(Date.parse(day+'T12:00:00Z'))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;}
 function addDays(day,days){if(!validDate(day))throw new Error('Choose a valid birth date.');const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
 function addMonths(day,months){if(!validDate(day))throw new Error('Choose a valid birth date.');const date=new Date(day+'T12:00:00Z'),d=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+months);const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(d,last));return date.toISOString().slice(0,10);}
 function ranges(day,groups=GROUPS){return groups.map(g=>({...g,start:g.months!==undefined?addMonths(day,g.months):addDays(day,g.days),end:g.endMonths!==undefined?addMonths(day,g.endMonths):g.endDays!==undefined?addDays(day,g.endDays):null}));}
 function schedule(day=PLANNED_BIRTH,je=false,plan='uip'){return ranges(day,plan==='hospital'?HOSPITAL_GROUPS:GROUPS).map(group=>({...group,doses:group.doses.filter(d=>je||!d[2])})).filter(group=>group.doses.length);}
 function escapeICS(text){return String(text).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
 function foldICS(line){let result='',part='',size=0;const encoder=new TextEncoder();for(const c of line){const n=encoder.encode(c).length;if(size+n>75){result+=part+'\r\n';part=' ';size=1;}part+=c;size+=n;}return result+part;}
 function utc(date){return new Date(date).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');}
 const LEADS={doctor:[14,7,3,2,1],vaccine:[7,3,2,1]};
 function reminderDates(day,kind='doctor'){return LEADS[kind].map(n=>addDays(day,-n));}
 function scheduledItems(care){return [...(care.medications||[]).map(m=>({...m,category:'medications'})),...(care.routines||[]).map(m=>({...m,category:'routines'}))];}
 function medicationSlots(care,day){return scheduledItems(care).filter(m=>m.enabled===true&&day>=m.start&&(!m.end||day<=m.end)).flatMap(m=>m.times.map(time=>({...m,time,key:day+'-'+m.id+'-'+time}))).sort((a,b)=>a.time.localeCompare(b.time));}
 function calendar(now=new Date(),profile={},care={},records={}){
  const actual=profile.confirmed&&validDate(profile.birthDate)&&profile.birthDate<=indiaDate(now);
  const birth=actual?profile.birthDate:PLANNED_BIRTH;
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mouni and Chandu//Birth and Baby Care//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:Mouni and Chandu - Baby care','X-WR-TIMEZONE:'+ZONE];
  const stamp=utc(now);
  function event(id,title,day,note,windowEnd=null,kind="doctor"){
   lines.push('BEGIN:VEVENT','UID:'+id+'@mounibaby.app','DTSTAMP:'+stamp,'LAST-MODIFIED:'+stamp,'SUMMARY:'+escapeICS(title));
   lines.push('DTSTART;VALUE=DATE:'+day.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(windowEnd||day,1).replace(/-/g,''),'TRANSP:TRANSPARENT');
   lines.push('DESCRIPTION:'+escapeICS(note));
   for(const reminderDay of reminderDates(day,kind)){
    const alarm=Date.parse(reminderDay+'T09:00:00+05:30');
    if(alarm>now.getTime())lines.push('BEGIN:VALARM','TRIGGER;VALUE=DATE-TIME:'+utc(alarm),'ACTION:DISPLAY','DESCRIPTION:'+escapeICS(title),'END:VALARM');
   }
   lines.push('END:VEVENT');
  }
  const prefix=actual?'':'Provisional: ';
  const basis=actual?'Based on the confirmed birth date '+birth+'. ':'Based on planned delivery on 29 October 2026. Confirm the actual birth date and regenerate this file. ';
  for(const group of schedule(birth,profile.je,profile.plan).map(g=>({...g,doses:g.doses.filter(d=>!records[d[0]]?.date)})).filter(g=>g.doses.length))event('mouni-uip-'+group.id,prefix+'Vaccinations - '+group.age,group.start,basis+group.doses.map(d=>d[1]).join(', ')+'. '+(group.end?'Suggested visit window: '+group.start+' to '+group.end+'. ':'')+(group.note||'')+' Dates are planning markers, not booked appointments. Follow the pediatrician and vaccination card.',null,'vaccine');
  if(Array.isArray(care.appointments)&&care.appointments.length){
   for(const visit of care.appointments){
    if(!validDate(visit.date))continue;
    const title=(visit.confirmed?'':'Planning: ')+visit.title;
    event('mouni-followup-'+visit.id,title,visit.date,visit.note+' '+(visit.confirmed?'Date documented; no appointment time supplied.':'Target date is a planning assumption; confirm with the clinic.')+' Source: '+(visit.source||'discharge record'),validDate(visit.windowEnd)?visit.windowEnd:null);
   }
  }else for(const visit of ranges(birth,VISITS))event('mouni-postnatal-'+visit.id,prefix+visit.label,visit.start,basis+visit.age+'. '+visit.note+' This is a planning reminder, not a confirmed appointment.');
  for(const med of scheduledItems(care)){
   if(med.enabled!==true||!validDate(med.start)||(med.category==='medications'&&!validDate(med.end)))continue;
   for(const time of med.times||[]){
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))continue;
    const until=med.end?Date.parse(med.end+'T'+time+':00+05:30'):null;
    if(until!==null&&until<now.getTime())continue;
    const start=Date.parse(med.start+'T'+time+':00+05:30');
    lines.push('BEGIN:VEVENT','UID:mouni-med-'+med.id+'-'+time.replace(':','')+'@mounibaby.app','DTSTAMP:'+stamp,'SUMMARY:'+escapeICS(med.title+' — '+med.dose),'DTSTART:'+utc(start),'DTEND:'+utc(start+600000),'RRULE:FREQ=DAILY'+(until!==null?';UNTIL='+utc(until):''),'TRANSP:TRANSPARENT','DESCRIPTION:'+escapeICS(med.note+' Source: '+med.source+(med.category==='routines'?' Mark the routine complete only after doing it safely.':' Tick the app only after giving/taking the dose. A reminder is not a catch-up dose instruction.')),'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:'+escapeICS(med.title),'END:VALARM','END:VEVENT');
   }
  }
  lines.push('END:VCALENDAR');return lines.map(foldICS).join('\r\n')+'\r\n';
 }
 function validateImport(data,today=indiaDate()){
  if(!data||data.schema!=='mouni-family-care/v1'||!data.profile||!validDate(data.profile.birthDate)||data.profile.birthDate>today)throw new Error('This is not a valid family care record with an actual birth date.');
  const profile={birthDate:data.profile.birthDate,confirmed:true,birthTime:String(data.profile.birthTime||'').slice(0,5),weight:String(data.profile.weight||''),hospital:String(data.profile.hospital||'').slice(0,120),sex:String(data.profile.sex||'').slice(0,20),plan:data.profile.plan==='hospital'?'hospital':'uip',je:!!data.profile.je};
  const records={};
  for(const [id,value] of Object.entries(data.records||{})){
   if(!/^[a-z0-9-]{1,60}$/.test(id)||!validDate(value?.date)||value.date<profile.birthDate||value.date>today)throw new Error('A vaccine administration date is invalid. Review the import file.');
   records[id]={date:value.date,source:String(value.source||'Imported record').slice(0,200)};
  }
  const care=data.care&&typeof data.care==='object'&&!Array.isArray(data.care)?data.care:{};
  for(const key of ['appointments','tasks','facts','dailyCare','prescriptions','labs','contacts','urgentSigns','sources','medications','routines'])if(care[key]!==undefined&&!Array.isArray(care[key]))throw new Error('A care-record list is invalid.');
  for(const appointment of care.appointments||[])if(!validDate(appointment.date)||typeof appointment.title!=='string'||!/^[a-z0-9-]{1,80}$/.test(appointment.id||'')||(appointment.windowEnd&&(!validDate(appointment.windowEnd)||appointment.windowEnd<appointment.date)))throw new Error('An appointment in this file is incomplete.');
  for(const m of care.medications||[])if(!/^[a-z0-9-]{1,60}$/.test(m.id||'')||typeof m.title!=='string'||typeof m.dose!=='string'||typeof m.enabled!=='boolean'||!validDate(m.start)||!validDate(m.end)||m.end<m.start||!Array.isArray(m.times)||!m.times.length||m.times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw new Error('A medicine schedule is invalid.');
  for(const m of care.routines||[])if(!/^[a-z0-9-]{1,60}$/.test(m.id||'')||typeof m.title!=='string'||typeof m.dose!=='string'||typeof m.enabled!=='boolean'||!validDate(m.start)||(m.end&&(!validDate(m.end)||m.end<m.start))||!Array.isArray(m.times)||!m.times.length||m.times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw new Error('A routine reminder is invalid.');
  return {schema:data.schema,profile,records,care};
 }
 const engine={scheduledItems,LEADS,reminderDates,medicationSlots,ZONE,PLANNED_BIRTH,SOURCE,GROUPS,HOSPITAL_GROUPS,VISITS,validateImport,indiaDate,validDate,addDays,addMonths,ranges,schedule,calendar};
 if(typeof module!=='undefined'&&module.exports)module.exports=engine;
 root.BabyCare=engine;
})(typeof window!=='undefined'?window:globalThis);

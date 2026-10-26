/* India UIP vaccine planning and one plain ICS export. No medicine scheduling. */
(function(root){
 'use strict';
 const ZONE='Asia/Kolkata';
 const DELIVERY='2026-10-29T17:30:00+05:30';
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
 function schedule(day=PLANNED_BIRTH,je=false){return ranges(day).map(group=>({...group,doses:group.doses.filter(d=>je||!d[2])}));}
 function escapeICS(text){return String(text).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
 function foldICS(line){let result='',part='',size=0;const encoder=new TextEncoder();for(const c of line){const n=encoder.encode(c).length;if(size+n>75){result+=part+'\r\n';part=' ';size=1;}part+=c;size+=n;}return result+part;}
 function utc(date){return new Date(date).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');}
 function calendar(now=new Date(),profile={}){
  const actual=profile.confirmed&&validDate(profile.birthDate)&&profile.birthDate<=indiaDate(now);
  const birth=actual?profile.birthDate:PLANNED_BIRTH;
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mouni and Chandu//Birth and Baby Care//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:Mouni and Chandu - Baby care','X-WR-TIMEZONE:'+ZONE];
  const stamp=utc(now);
  function event(id,title,day,note,timed=false){
   lines.push('BEGIN:VEVENT','UID:'+id+'@mounibaby.app','DTSTAMP:'+stamp,'LAST-MODIFIED:'+stamp,'SUMMARY:'+escapeICS(title));
   if(timed)lines.push('DTSTART:'+utc(DELIVERY));
   else lines.push('DTSTART;VALUE=DATE:'+day.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(day,1).replace(/-/g,''));
   lines.push('DESCRIPTION:'+escapeICS(note));
   if(timed){for(const trigger of ['-P1D','-PT2H','-PT30M'])lines.push('BEGIN:VALARM','TRIGGER:'+trigger,'ACTION:DISPLAY','DESCRIPTION:'+escapeICS(title),'END:VALARM');}
   else {
    const alarm=Date.parse(day+'T09:00:00+05:30')-86400000;
    if(alarm>now.getTime())lines.push('BEGIN:VALARM','TRIGGER;VALUE=DATE-TIME:'+utc(alarm),'ACTION:DISPLAY','DESCRIPTION:'+escapeICS(title),'END:VALARM');
   }
   lines.push('END:VEVENT');
  }
  if(!actual)event('planned-delivery-20261101','Scheduled delivery - 29 October, 5:30 PM IST',PLANNED_BIRTH,'Scheduled delivery: 29 October 2026 at 5:30 PM India time. Confirm arrival and preparation instructions with the hospital.',true);
  const prefix=actual?'':'Provisional: ';
  const basis=actual?'Based on the confirmed birth date '+birth+'. ':'Based on planned delivery on 29 October 2026. Confirm the actual birth date and regenerate this file. ';
  for(const group of schedule(birth,profile.je))event('mouni-uip-'+group.id,prefix+'Vaccinations - '+group.age,group.start,basis+group.doses.map(d=>d[1]).join(', ')+'. '+(group.end?'Suggested visit window: '+group.start+' to '+group.end+'. ':'')+(group.note||'')+' Dates are planning markers, not booked appointments. Follow the pediatrician and vaccination card.');
  for(const visit of ranges(birth,VISITS))event('mouni-postnatal-'+visit.id,prefix+visit.label,visit.start,basis+visit.age+'. '+visit.note+' This is a planning reminder, not a confirmed appointment.');
  lines.push('END:VCALENDAR');return lines.map(foldICS).join('\r\n')+'\r\n';
 }
 const engine={ZONE,DELIVERY,PLANNED_BIRTH,SOURCE,GROUPS,VISITS,indiaDate,validDate,addDays,addMonths,ranges,schedule,calendar};
 if(typeof module!=='undefined'&&module.exports)module.exports=engine;
 root.BabyCare=engine;
})(typeof window!=='undefined'?window:globalThis);

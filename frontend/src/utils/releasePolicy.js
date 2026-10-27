// Registrar-confirmed preparation periods. Calendar dates use Asia/Manila.
// Day 1 is the first working day after submission; Friday–Sunday are excluded.
const WORKDAYS = new Set([1,2,3,4]);
const DAY = 86400000;
function calendarDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value ? value : null;
  }
  const date = new Date(value);
  return value != null && Number.isFinite(date.getTime()) ? new Date(date.getTime()+8*3600000).toISOString().slice(0,10) : null;
}
function addWorkingDays(value, count) {
  const day=calendarDate(value);
  if (!day || !Number.isInteger(count) || count<0 || count>15) return null;
  let date=new Date(`${day}T00:00:00Z`), remaining=count;
  while(remaining) { date=new Date(date.getTime()+DAY); if(WORKDAYS.has(date.getUTCDay())) remaining--; }
  return date.toISOString().slice(0,10);
}
function workingDaysBetween(from,to) {
  const first=calendarDate(from),last=calendarDate(to);
  if(!first || !last) return null;
  const difference=Math.floor((new Date(last)-new Date(first))/DAY);
  if(difference<=0)return 0;
  let total=Math.floor(difference/7)*4;
  const start=new Date(first).getUTCDay();
  for(let offset=1;offset<=difference%7;offset++) if(WORKDAYS.has((start+offset)%7))total++;
  return total;
}
function preparationDays(name, student = {}, sameDay = false) {
  if (sameDay === true || sameDay === 1) return 0;
  const type=String(name || '').trim().toLowerCase().replace(/[–—-]/g,' ').replace(/\s+/g,' ');
  if (['bsn rle','nursing hours','bsn course description','bsn course syllabus','bsn international form','bsn accreditation'].includes(type)) return 15;
  if (/^copy of grades?$/.test(type) || /^permanent records?$/.test(type)) return 10;
  const isTor=/^transcript of records?(?:\b|\s*\()/i.test(type);
  const isDismissal=/^honorable dismissal(?:\b|\s*\()/i.test(type)
    || ['for second course (bachelor degree)','for graduate school','for masters','for ctp','transfer credentials'].includes(type);
  if (!isTor && !isDismissal) return null;
  if (/undergraduates?/.test(type)) return 10;
  if (/(?:\(|\s)graduates?\)?$/.test(type)) return 5;
  if(student.enrollment_status === 'graduated')return 5;
  // Former students can have transferred or withdrawn without graduating.
  // Use their recorded outcome before the legacy alumni-only fallback.
  if(['active','dropout','transferred'].includes(student.enrollment_status))return 10;
  if(student.user_type === 'alumni')return 5;
  return student.user_type === 'student' || student.enrollment_status ? 10 : null;
}
function estimate(document, student = {}) {
  const days=Number.isInteger(document.release_working_days) ? document.release_working_days
    : preparationDays(document.document_type,student,document.is_same_day);
  return {working_days:days,date:days == null ? null : addWorkingDays(document.created_at,days),calendar:'Monday–Thursday',timezone:'Asia/Manila'};
}
export {calendarDate,addWorkingDays,workingDaysBetween,preparationDays,estimate};

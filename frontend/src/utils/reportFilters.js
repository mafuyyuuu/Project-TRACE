import { getStatusLabel } from '@/utils/documentStatus';
export const EMPTY_REPORT_FILTERS = {dateFrom:'',dateTo:'',status:'',documentType:'',paymentStatus:'',recordSet:'',studentSearch:'',studentId:'',studentName:'',collegeId:''};
export const EMPTY_FINANCE_FILTERS = {from:'',to:'',receipt:'all',studentSearch:'',studentId:'',studentName:'',collegeId:'',documentType:''};
export function appliedFilterSummary(filters,options) {
  const labels={dateFrom:'From',dateTo:'To',from:'Payment from',to:'Payment to',studentSearch:'Student ID / Name',studentId:'Student ID',studentName:'Name contains',collegeId:'College',documentType:'Document',status:'Status',paymentStatus:'Payment',recordSet:'Records',receipt:'OR'};
  return Object.entries(filters).filter(([,value])=>value!==''&&value!=null&&value!=='all').map(([key,value])=>`${labels[key]||key}: ${key==='collegeId'?options?.colleges?.find(college=>String(college.id)===String(value))?.name||value:key==='status'?getStatusLabel(value):value}`).join(' · ')||'All authorized records';
}

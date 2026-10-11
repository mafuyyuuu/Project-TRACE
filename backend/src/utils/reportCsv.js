const { toCsv } = require('./csv');
// One document per row across staff roles. Fee/payment fields are explicit;
// files, identity evidence, credentials and conversation content are excluded.
const DOCUMENT_COLUMNS = [
  ['id','Document ID'],['tracking_number','Tracking Number'],['request_group_id','Request Group'],['document_sequence_number','Document Request'],
  ['student_id','Student ID'],['student_name','Student Name'],['college_id','College ID'],['course','College/Department'],['program','Program/Course'],['document_type','Document Type'],
  ['current_status','Status'],['payment_status','Payment'],['copies','Copies'],['page_count','Pages'],['amount','Amount (PHP)'],['base_fee','Base Rate (PHP)'],['rental_fee','Rental Rate (PHP)'],['special_fee','Special Rate (PHP)'],['fee_lines','Fee Breakdown'],['purpose','Purpose'],
  ['created_at','Requested On (Manila)'],['updated_at','Last Updated (Manila)'],['estimated_ready_date','Estimated Ready Date'],
  ['assigned_clerk_id','Assigned Staff ID'],['assigned_staff_name','Assigned Staff'],['assigned_staff_desk','Assigned Desk'],
  ['priced_by_clerk_id','Priced By ID'],['priced_at','Priced On (Manila)'],['payment_channel','Payment Channel'],['payment_reference','Payment Reference'],
  ['payment_cleared_at','Payment Cleared (Manila)'],['or_number','OR Number'],['or_date','OR Date'],['or_uploaded_at','OR Copy Uploaded (Manila)'],['receipt_status','OR Status'],['logged_by_clerk_id','Cashier ID'],
].map(([key,label]) => ({key,label}));
const timestamps = ['created_at','updated_at','priced_at','payment_cleared_at','or_uploaded_at'];
const formatter = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function manilaTimestamp(value) {
  if (!value) return '';
  const date = new Date(value); if (!Number.isFinite(date.getTime())) return '';
  const p=Object.fromEntries(formatter.formatToParts(date).map(part=>[part.type,part.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+08:00`;
}
function documentCsv(rows) {
  return toCsv(DOCUMENT_COLUMNS, rows.map(row => {
    const result = {...row, amount: row.amount == null || !Number.isFinite(Number(row.amount)) ? '' : Number(row.amount).toFixed(2),
      receipt_status: !row.or_number ? 'Issuance pending' : !row.official_receipt_path ? 'Issued; digital copy pending' : 'Digital OR available'};
    for(const key of ['base_fee','rental_fee','special_fee']) result[key]=row[key]==null||row[key]==='null'||!Number.isFinite(Number(row[key]))?'':Number(row[key]).toFixed(2);
    if(typeof result.fee_lines==='object'&&result.fee_lines) result.fee_lines=JSON.stringify(result.fee_lines);
    for(const key of timestamps) result[key] = row[`${key}_epoch`] != null ? manilaTimestamp(Number(row[`${key}_epoch`])*1000) : manilaTimestamp(row[key]);
    return result;
  }));
}
module.exports = { DOCUMENT_COLUMNS, documentCsv, manilaTimestamp };

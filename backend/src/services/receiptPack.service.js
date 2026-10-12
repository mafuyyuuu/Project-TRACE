const fs = require('fs/promises');
const { pool } = require('../config/db');
const model = require('../models/receiptPack.model');
const users = require('../models/user.model');
const documents = require('../models/document.model');
const assignments = require('./requestAssignment.service');
const { badRequest, forbidden, notFound } = require('../utils/AppError');
const { packRange, serialAt } = require('../utils/receiptSerial');
const { snapshot, printConfig, DEFAULT_PRINT } = require('../utils/receiptSnapshot');
const { receiptWindow } = require('../utils/receiptTiming');
const { STATUS } = require('../utils/documentStatus');
function authorize(user) { if (user?.role !== 'clerk' || user.desk_assignment !== 'Finance') throw forbidden('Only Finance can manage issued receipts and receipt packs.'); }
async function actor(user, executor = pool) {
 authorize(user);const [saved] = await users.findById(user.id,executor);
 if (!saved || saved.role !== 'clerk' || saved.desk_assignment !== 'Finance' || !Number(saved.is_active)) throw forbidden('An active Finance account is required.');
 return saved;
}
function key(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(value)) throw badRequest('Use a valid receipt retry key.'); return value; }
function reason(value) { if (typeof value !== 'string' || !value.trim() || value.trim().length > 2000) throw badRequest('Enter a reason of at most 2,000 characters.'); return value.trim(); }
async function transaction(work) {
 const connection = await pool.getConnection();
 try { await connection.beginTransaction();const result=await work(connection);await connection.commit();return result; }
 catch(error) {await connection.rollback();if(error.code==='ER_DUP_ENTRY')throw badRequest('This receipt serial or retry key is already reserved. Refresh and review the pack.');throw error;}
 finally {connection.release();}
}
async function state(user) {
 await actor(user);const control=await model.control();if(!control)throw badRequest('Apply the receipt-pack migration before using this workflow.');
 const pack=control.active_pack_id ? await model.pack(control.active_pack_id) : null;
 return {version:control.version,pack:pack ? {...pack,next_serial:Number(pack.consumed)<50 ? serialAt(pack.pattern,Number(pack.consumed)) : null,last_serial:serialAt(pack.pattern,49)} : null,print_config:control.print_config ? printConfig(typeof control.print_config==='string'?JSON.parse(control.print_config):control.print_config) : DEFAULT_PRINT};
}
async function preview(user,body) {await actor(user);const result=packRange(body.start_serial,body.end_serial);return {pattern:result.pattern,first:result.first,last:result.last,count:50};}
async function configure(user,body) {
 const pattern=packRange(body.start_serial,body.end_serial);
 return transaction(async connection=>{
  const saved=await actor(user,connection),control=await model.control(connection,true);
  if(!control || Number(body.version)!==Number(control.version))throw badRequest('The pack configuration changed. Refresh before confirming.');
  const old=control.active_pack_id ? await model.pack(control.active_pack_id,connection,true) : null;
  const replacement = !old ? 'Initial paper pack.' : Number(old.consumed) < 50 ? 'Paper pack replaced by Finance; unused serials remain reserved.' : 'Previous pack exhausted.';
  if(!await model.available(pattern.serials,connection))throw badRequest('This range overlaps reserved or historical receipt numbers. Use a different paper pack.');
  const id=await model.activate(pattern.pattern,pattern.serials,saved.id,replacement,old?.id,connection);
  await model.audit('pack_activated',saved.id,{previous_pack:old?.id || null,start:pattern.serials[0],last:pattern.last,reason:replacement,archived_unused:old?50-Number(old.consumed):0},connection,id);
  return {id,start_serial:pattern.serials[0],last_serial:pattern.last,count:50};
 });
}
// Lock order for issuance: document group, control row, then receipt/reservation.
// All 50 serials stay reserved even if a pack is replaced early.
async function allocate(user,group,connection,body,filePath=null) {
 if(!group.length)throw badRequest('No documents are available for receipt issuance.');
 const saved=await actor(user,connection),groupId=group[0].request_group_id || group[0].tracking_number;
 const control=await model.control(connection,true);
 const retryKey=key(body.client_key),prior=await model.retry(retryKey,connection,true);
 if(prior){if(prior.request_group_id!==groupId || prior.state!=='ISSUED')throw badRequest('This receipt retry key belongs to another or voided receipt.');return prior;}
 const existing=await model.current(groupId,connection,true);if(existing)return existing;
 const pack=control?.active_pack_id ? await model.pack(control.active_pack_id,connection,true) : null;
 if(!pack || !pack.active || Number(pack.consumed)>=50)throw badRequest('Configure the next 50-receipt pack before issuance.');
 const serial=serialAt(pack.pattern,Number(pack.consumed));
 if(Number(body.expected_pack_id)!==Number(pack.id) || body.expected_serial!==serial)throw badRequest('The next serial changed. Refresh and confirm the new serial before issuance.');
 if(group.some(row=>row.or_number))throw badRequest('This group already has a historical OR. Keep its recorded number.');
 // Legacy issuance also takes the control lock; check actual documents before consuming.
 if(await model.numberConflict(serial,groupId,connection))throw badRequest('This serial already exists in historical documents. Replace the pack.');
 const date=receiptWindow().today;
 const [student] = group[0].student_id ? await users.findReceiptName(group[0].student_id, connection) : [];
 const receiptGroup = group.map(row => ({ ...row, ...(student ? { full_name:student.full_name, first_name:student.first_name, middle_name:student.middle_name, last_name:student.last_name, extension_name:student.extension_name } : {}) }));
 const snap=snapshot(receiptGroup,saved,serial,date);
 const receipt=await model.insertReceipt({group:groupId,document_id:group[0].id,pack,serial,client_key:retryKey,snapshot:snap,copy_path:filePath},connection);
 await model.audit('receipt_issued',saved.id,{serial,documents:group.map(row=>row.id)},connection,pack.id,receipt.id);
 if (filePath) await model.audit('copy_uploaded',saved.id,{path:filePath,during_verification:true},connection,pack.id,receipt.id);
 return receipt;
}
async function assertLegacyNumber(number,group,connection) {
 if(!number)return;await model.control(connection,true);
 if(await model.reserved(String(number).trim(),connection))throw badRequest('This serial belongs to a managed receipt pack. Use pack issuance instead.');
 if(await model.numberConflict(String(number).trim(),group,connection))throw badRequest('This OR number is already recorded for another request.');
}
async function groupForReceipt(receipt,connection) {
 const group=await model.group(receipt.request_group_id,connection);
 if(!group.length)throw notFound('The receipt request no longer exists.');return group;
}
async function get(user,id) {await actor(user);const receipt=await model.get(id);if(!receipt)throw notFound('Receipt not found.');return receipt;}
async function history(user) {await actor(user);return model.history();}
async function notifyReceipt(snap,title,message) {
 try {
  const [student]=await users.findActiveByStudentId(snap.student_id);if(!student)return;
  const notifications=require('./notification.service');
  await notifications.dispatchStudentAlert({user:student,title,message,type:'success',alsoSmsAndEmail:true});
  const rows=await users.findStudentCourseByStudentId(snap.student_id);
  await notifications.notifyInAppBulk(await users.findSecretaryClerks(rows[0]?.course || null),{title,message,type:'success'});
 } catch { /* Notification delivery cannot undo a committed receipt. */ }
}
async function issue(user,documentId,body) {
 authorize(user);let newlyIssued=false;const result=await transaction(async connection=>{
  await actor(user,connection);
  const [doc]=await documents.findByIdForUpdate(documentId,connection);if(!doc)throw notFound('Document not found.');
  const group=await groupForReceipt({request_group_id:doc.request_group_id || doc.tracking_number},connection);
  for(const item of group)await assignments.assertAssignedProcessor(user,item,connection);
  if(group.some(item=>item.payment_status!=='PAID'))throw badRequest('Finance must clear the whole payment before deferred receipt issuance.');
  await model.control(connection,true);
  const prior=await model.current(doc.request_group_id || doc.tracking_number,connection,true);if(prior)return prior;
  if(group.some(item=>item.current_status!==STATUS.PAID_PENDING_SEC_RELEASE))throw badRequest('New issuance is allowed only before Secretary verification and handoff.');
  const timing=receiptWindow();if(timing.afterCutoff)throw badRequest('The 4:00 PM Manila cut-off has passed. Issue the new receipt on a later eligible date.');
  if(group.some(item=>item.or_earliest_issue_date && String(item.or_earliest_issue_date instanceof Date?receiptWindow(item.or_earliest_issue_date).today:item.or_earliest_issue_date).slice(0,10)>timing.today))throw badRequest('The earliest eligible receipt date has not arrived.');
  const receipt=await allocate(user,group,connection,body);newlyIssued=true;await model.writeGroup(receipt.request_group_id || receipt.group,receipt.serial,receipt.snapshot.issue_date,null,connection);return receipt;
 });
 if(newlyIssued)await notifyReceipt(result.snapshot,'Official Receipt issued',`OR ${result.serial} is recorded; its digital copy may follow. Secretary must inspect it before handoff.`);
 return result;
}
async function validateFile(file) {
 if(!file || file.size>5*1024*1024 || !['image/jpeg','image/png','application/pdf'].includes(file.mimetype))throw badRequest('Attach a JPEG, PNG or PDF receipt, at most 5 MB.');
 const handle=await fs.open(file.path,'r');let signature;
 try {const buffer=Buffer.alloc(8);await handle.read(buffer,0,8,0);signature=buffer;const stat=await handle.stat();if(stat.size>5*1024*1024)throw badRequest('Receipt files must be at most 5 MB.');}finally{await handle.close();}
 const valid=file.mimetype==='application/pdf'?signature.subarray(0,5).toString()==='%PDF-':file.mimetype==='image/png'?signature.equals(Buffer.from([137,80,78,71,13,10,26,10])):signature[0]===255 && signature[1]===216 && signature[2]===255;
 if(!valid)throw badRequest('The file content does not match its receipt type.');
}
async function upload(user,id,file) {
 authorize(user);await validateFile(file);let savedSnapshot;
 const result=await transaction(async connection=>{
  await actor(user,connection);const receipt=await model.get(id,connection);if(!receipt)throw notFound('Receipt not found.');
  const group=await groupForReceipt(receipt,connection);for(const item of group)await assignments.assertAssignedProcessor(user,item,connection);
  const current=await model.get(id,connection,true);if(current.state!=='ISSUED')throw badRequest('A voided receipt cannot receive a new published copy.');
  if(group.some(item=>item.payment_status!=='PAID' || item.or_number!==current.serial))throw badRequest('The issued receipt no longer matches this payment group.');
  if(current.copy_path || group.some(item=>item.official_receipt_path))throw badRequest('This issued receipt already has a copy. Refresh to view it.');
  const path=`/uploads/${file.filename}`;await model.publish(id,path,connection);await model.writeGroup(receipt.request_group_id,receipt.serial,receipt.snapshot.issue_date,path,connection);
  savedSnapshot=receipt.snapshot;await model.audit('copy_uploaded',user.id,{path},connection,receipt.pack_id,receipt.id);return {success:true,copy_path:path};
 });
 await notifyReceipt(savedSnapshot,'Official Receipt available',`The digital copy of OR ${savedSnapshot.serial} is available. The document stage remains unchanged.`);
 return result;
}
async function print(user,id,body) {
 const saved=await actor(user);const receipt=await get(user,id);if(receipt.state!=='ISSUED')throw badRequest('A voided receipt cannot be printed as issued.');
 const requestKey=key(body.client_key);
 return transaction(async connection=>{
  await actor(user,connection);await model.control(connection,true);const current=await model.get(id,connection,true);if(current.state!=='ISSUED')throw badRequest('The receipt was voided. Refresh before printing.');
  const events=await model.printEvents(id,requestKey,connection);
  if(!events.prior)await model.audit(events.count?'reprint_requested':'print_requested',saved.id,{client_key:requestKey,mode:body.mode==='data-only'?'data-only':'full',physical_success:'unknown'},connection,receipt.pack_id,receipt.id);
  return current;
 });
}
async function voidIssued(user,id,body) {
 authorize(user);const why=reason(body.reason);
 return transaction(async connection=>{
  await actor(user,connection);const receipt=await model.get(id,connection);if(!receipt)throw notFound('Receipt not found.');
  const group=await groupForReceipt(receipt,connection);for(const item of group)await assignments.assertAssignedProcessor(user,item,connection);
  if(group.some(item=>item.current_status!==STATUS.PAID_PENDING_SEC_RELEASE))throw badRequest('Voiding is allowed only before Secretary OR verification and handoff.');
  await model.control(connection,true);const current=await model.get(id,connection,true);if(current.state==='VOID')return current;
  if(group.some(item=>item.or_number!==current.serial))throw badRequest('This receipt no longer matches the current group.');
  await model.voidReceipt(id,why,connection);await model.writeGroup(receipt.request_group_id,null,null,null,connection);
  await model.audit('receipt_voided',user.id,{reason:why,serial:receipt.serial,payment_preserved:true},connection,receipt.pack_id,receipt.id);return {...receipt,state:'VOID',void_reason:why};
 });
}
async function savePrint(user,body) {
 const config=printConfig(body.print_config);
 return transaction(async connection=>{await actor(user,connection);const control=await model.control(connection,true);if(!control || Number(body.version)!==Number(control.version))throw badRequest('Print settings changed. Refresh before saving.');await model.savePrint(config,control.version,connection);await model.audit('print_calibration_saved',user.id,{previous:control.print_config,config},connection);return config;});
}
module.exports={authorize,state,preview,configure,allocate,assertLegacyNumber,get,history,issue,upload,print,voidIssued,savePrint,validateFile};

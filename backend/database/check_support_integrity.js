// Isolated synthetic validation only. Never points at the configured TRACE database.
if(!process.argv.includes('--synthetic-only')) { console.error('Use --synthetic-only; requires isolated MySQL on 127.0.0.1:13307.'); process.exit(1); }
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'../..'),database='trace_support_schema_'+crypto.randomBytes(5).toString('hex');
Object.assign(process.env,{DB_HOST:'127.0.0.1',DB_PORT:'13307',DB_USER:'root',DB_PASSWORD:'',DB_NAME:database,DB_SSL:'false',JWT_SECRET:crypto.randomBytes(32).toString('hex'),WEBHOOK_SECRET:crypto.randomBytes(32).toString('hex'),SMTP_HOST:'',SMTP_USER:'',SMTP_PASS:'',UNISMS_SECRET_KEY:'',SMS_API_KEY:''});
const mysql=require(root+'/backend/node_modules/mysql2/promise');
(async()=>{
 let connection,pool;
 try{
 connection=await mysql.createConnection({host:'127.0.0.1',port:13307,user:'root',multipleStatements:true,timezone:'Z'});
 await connection.query(fs.readFileSync(root+'/backend/database/schema.sql','utf8').replaceAll('trace_db',database));
 pool=require(root+'/backend/src/config/db').pool;
 for(const file of ['migrate_support_tickets','migrate_support_requirements']){const migration=require(root+'/backend/database/'+file);await migration.migrate();await migration.migrate();}
 const missing=await require(root+'/backend/database/check_schema').check(pool);assert.deepEqual(missing,[]);
 const tickets=require(root+'/backend/src/services/supportTicket.service'),attachments=require(root+'/backend/src/services/requestAttachments.service');
 const ticketModel=require(root+'/backend/src/models/supportTicket.model');
 const settings={...require(root+'/backend/src/utils/supportHours').DEFAULTS,weekdays:[0,1,2,3,4,5,6],open_minute:0,close_minute:1440};
 await pool.query('UPDATE support_settings SET settings=? WHERE id=1',[JSON.stringify(settings)]);
 const students=[],clerks=[];
 for(let index=0;index<12;index++) {
   const [r]=await pool.query("INSERT INTO users(student_id,full_name,password_hash,role,email_verified_at,is_active) VALUES(?,?,?,'student',UTC_TIMESTAMP(),TRUE)",[`SYNTHETIC-${index}`,`Synthetic student ${index}`,'not-a-login']);students.push({id:r.insertId,role:'student'});
 }
 for(let index=0;index<3;index++) {
   const [r]=await pool.query("INSERT INTO users(student_id,full_name,password_hash,role,desk_assignment,is_active) VALUES(?,?,?,'clerk','Window 1',TRUE)",[`SYNTHETIC-CLERK-${index}`,`Synthetic clerk ${index}`,'not-a-login']);clerks.push({id:r.insertId,role:'clerk',desk_assignment:'Window 1'});await tickets.setAvailability(clerks[index],{available:true});
 }
 const raced=await Promise.all(Array.from({length:10},()=>tickets.create(students[0],{subject:'Concurrent synthetic general',client_key:crypto.randomUUID()})));
 assert.equal(new Set(raced.map(t=>t.id)).size,1);
 const queued=[];
 for(let index=0;index<12;index++) {const t=index===0 ? raced[0] : await tickets.create(students[index],{subject:'Synthetic queue',client_key:crypto.randomUUID()});await tickets.action(students[index],t.id,{action:'escalate',client_key:crypto.randomUUID()});queued.push(t.id);}
 const claims=await Promise.all(clerks.flatMap(clerk=>Array.from({length:3},()=>tickets.claim(clerk))));
 assert.deepEqual([...new Set(claims.map(t=>t.id))].sort((a,b)=>a-b),queued.slice(0,3));
 for(const clerk of clerks)assert.equal(new Set(claims.filter(t=>t.assigned_to===clerk.id).map(t=>t.id)).size,1);
 const [docResult]=await pool.query("INSERT INTO documents(tracking_number,student_id,document_type,current_status) VALUES('SYNTHETIC-REQ-CASE','SYNTHETIC-3','Synthetic case','SEC_PROCESSING')");
 const docId=docResult.insertId;
 const [catalogResult]=await pool.query("INSERT INTO supporting_document_types(name) VALUES('Synthetic approved record')");
 const body={catalog_id:catalogResult.insertId,instructions:'Synthetic instruction'};
 const duplicateRequests=await Promise.allSettled(Array.from({length:6},()=>attachments.mutate(clerks[0],docId,'request',null,body)));
  assert.equal(duplicateRequests.filter(r=>r.status==='fulfilled').length,1);
 const [requirements]=await pool.query('SELECT * FROM request_attachment_requirements WHERE document_id=?',[docId]);const original=requirements[0];
 await attachments.mutate(students[3],docId,'upload',original.id,{}, {filename:'synthetic-history.png',originalname:'synthetic.png'});
 await attachments.mutate(clerks[0],docId,'review',original.id,{action:'resubmit',notes:'Synthetic rejected back page'});
 await attachments.mutate(students[3],docId,'upload',original.id,{}, {filename:'synthetic-corrected.png',originalname:'corrected.png'});
 await attachments.mutate(clerks[0],docId,'review',original.id,{action:'accept',notes:'Synthetic accepted record'});
 await attachments.mutate(clerks[0],docId,'request',null,{...body,replacement_of:original.id});
 const chain=await attachments.list(students[3],docId);assert.equal(chain.requirements.length,2);assert.ok(chain.requirements[0].superseded_at);assert.equal(chain.requirements[1].replacement_of,original.id);
 const linked=await ticketModel.context(docId,null);
 const history=await tickets.requirementHistory(students[3],linked.id,original.id);assert.equal(history.events.length,5);
 await assert.rejects(tickets.requirementHistory(students[4],linked.id,original.id),error=>error.status===403);
 const conn=await pool.getConnection();try{await conn.beginTransaction();await require(root+'/backend/src/services/supportArchive.service').archiveCase(docId,conn);await conn.query('DELETE FROM documents WHERE id=?',[docId]);await conn.commit();}catch(error){await conn.rollback();throw error;}finally{conn.release();}
 assert.equal((await tickets.read(students[3],linked.id)).ticket.read_only,true);
 assert.equal((await tickets.requirementHistory(students[3],linked.id,original.id)).events.length,5);
 await assert.rejects(tickets.send(students[3],linked.id,{message:'New after closure',client_key:crypto.randomUUID()}),error=>error.status===400);
 await tickets.assertFileRead(students[3],'synthetic-history.png');
 await assert.rejects(tickets.assertFileRead(students[4],'synthetic-history.png'),error=>error.status===403);
 // Exercise more than one capped page; older history must remain reachable.
 for(let index=0;index<25;index++)await pool.query("INSERT INTO support_tickets(student_user_id,subject,category,state) VALUES(?,'Synthetic older ticket','general','RESOLVED')",[students[0].id]);
 const ticketIds=[];let before;
 do {const page=await tickets.list(students[0],{before});assert.ok(page.tickets.length<=20);ticketIds.push(...page.tickets.map(row=>row.id));before=page.next_cursor;} while(before);
 assert.equal(ticketIds.length,26);assert.equal(new Set(ticketIds).size,26);assert.ok(ticketIds.includes(raced[0].id));
 for(let index=0;index<85;index++)await pool.query("INSERT INTO support_ticket_messages(ticket_id,sender_id,message) VALUES(?,?,'Synthetic older message')",[raced[0].id,students[0].id]);
 const messageIds=[];before=null;
 do {const page=await tickets.read(students[0],raced[0].id,{before});assert.ok(page.messages.length<=50);assert.deepEqual(page.messages.map(row=>row.id),page.messages.map(row=>row.id).sort((a,b)=>a-b));messageIds.push(...page.messages.map(row=>row.id));before=page.next_cursor;} while(before);
 const [[total]]=await pool.query('SELECT COUNT(*) AS count FROM support_ticket_messages WHERE ticket_id=?',[raced[0].id]);
 assert.equal(messageIds.length,Number(total.count));assert.equal(new Set(messageIds).size,messageIds.length);
 console.log(JSON.stringify({schema:'fresh synthetic only',migration_reruns:'passed',schema_presence:'passed',production_touched:false,general_creation_race:'10 submissions / 1 ticket',claim_race:'9 claims / 3 clerks / oldest 3 tickets',requirement_race:'6 submissions / 1 requirement',replacement_history:'passed',cancelled_history_and_file_authorization:'passed',pagination:'26 tickets and 85+ messages reachable through capped cursors'}));
 }finally{if(pool)await pool.end();if(connection){await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);await connection.end();}}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});

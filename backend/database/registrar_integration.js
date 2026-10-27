/** CI-only acceptance against a disposable, fresh MySQL 8 schema. */
const assert=require('assert/strict');
const mysql=require('mysql2/promise');
const fs=require('fs');
const path=require('path');
const env=require('../src/config/env');
const {pool}=require('../src/config/db');
async function main(){
  assert.equal(env.NODE_ENV,'test');assert.equal(env.DB_NAME,'trace_registrar_test');
  const root=await mysql.createConnection({host:env.DB_HOST,port:env.DB_PORT,user:env.DB_USER,password:env.DB_PASSWORD,multipleStatements:true});
  try{
    await root.query('CREATE DATABASE trace_registrar_test');await root.changeUser({database:'trace_registrar_test'});
    const schema=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8').replace(/^CREATE DATABASE.*;\s*$/gm,'').replace(/^USE trace_db;\s*$/gm,'');
    await root.query(schema);
    await require('./migrate_release_policy').migrate(root);await require('./migrate_release_policy').migrate(root);
    await require('./migrate_manual_faq_feedback').migrate(root);await require('./migrate_manual_faq_feedback').migrate(root);
    await require('./migrate_conversation_reads').migrate(root);await require('./migrate_conversation_reads').migrate(root);
    await root.query("INSERT INTO users(id,student_id,password_hash,full_name,role,user_type,is_active) VALUES (1,'CI-STUDENT','not-a-login-hash','Synthetic Student','student','student',TRUE),(2,'CI-ADMIN','not-a-login-hash','Synthetic Admin','admin','student',TRUE)");
    const documents=require('../src/models/document.model'),manual=require('../src/models/manualFaq.model'),reports=require('../src/models/report.model');
    const {STATUS}=require('../src/utils/documentStatus'),now=new Date();
    const [inserted]=await documents.insert({tracking_number:'TRC-REGISTRAR-CI',student_id:'CI-STUDENT',student_name:'Synthetic Student',document_type:'BSN RLE',
      current_status:STATUS.SEC_PROCESSING,payment_status:'UNPAID',assigned_clerk_id:null,file_path:null,original_filename:null,checkout_url:null,
      copies:1,amount:50,created_at:new Date(now.getTime()-4*86400000),estimated_ready_date:'2026-01-01',release_working_days:15,
      pricing_snapshot:{document_type:'BSN RLE',base_fee:50,fee_rule:'per_page'}},root);
    const [document]=await documents.findById(inserted.insertId,root);assert.equal(document.release_working_days,15);
    const event={userId:1,questionHash:'b'.repeat(64),question:'Synthetic question?',action:'not_helpful',suggestion:'Include an example.',clientKey:'registrar-ci-retry-key',payloadHash:'a'.repeat(64),at:now.getTime()};
    await manual.append(event,root);await manual.append(event,root);
    assert.equal((await manual.feedback(1,root)).length,1);assert.equal((await manual.feedback(2,root)).length,0);
    assert.equal((await manual.events(new Date(now.getTime()-1),new Date(now.getTime()+1),root)).length,1);
    let from=null;
    for(let i=0;i<=41;i++){
      const to=i%2 ? STATUS.SEC_PROCESSING : STATUS.PENDING_SEC_EVALUATION;
      await root.query('INSERT INTO step_logs(document_id,clerk_id,action_taken,from_status,to_status,timestamp_started) VALUES(?,?,?,?,?,?)',
        [inserted.insertId,2,'registrar_ci_test',from,to,new Date(now.getTime()-(44-i)*3600000)]);from=to;
    }
    const cases=await reports.activeDelayCases(now,root),baselines=await reports.deskWaitBaselines(now,root);
    assert.equal(cases.length,1);assert.equal(baselines.find(row=>row.stage===STATUS.SEC_PROCESSING).samples,20);
    assert.equal(Number(baselines.find(row=>row.stage===STATUS.SEC_PROCESSING).p90_minutes),60);
    assert.ok(require('../src/utils/extremeCases').extremeCases(cases,baselines,now).counts.long_desk_wait===1);
    require('../src/services/aiEngine.service').getSupportInsights=async()=>null;
    const report=await require('../src/services/supportReport.service').report({id:2,role:'admin'},{dateFrom:require('../src/utils/releasePolicy').calendarDate(now)});
    assert.equal(report.manual_faq.not_helpful,1);assert.equal(report.faq.not_helpful,1);assert.equal(report.faq.resolved,0);assert.equal(report.escalation.denominator,0);
    // General support must survive creation, refresh, archive and reopen while
    // remaining private to its student, including when cursor pages are full.
    await root.query("INSERT INTO users(id,student_id,password_hash,full_name,role,is_active) VALUES (3,'CI-OTHER','not-a-login-hash','Other Synthetic Student','student',TRUE)");
    const support=require('../src/services/supportTicket.service'),student={id:1,role:'student'},other={id:3,role:'student'};
    const created=await support.create(student,{subject:'Synthetic general support',client_key:'registrar-ci-create-ticket'});
    assert.equal(created.state,'FAQ_ASSISTANCE');assert.equal(created.student_user_id,1);
    assert.ok((await support.list(student,{view:'active'})).tickets.some(row=>row.id===created.id));
    assert.equal((await support.list(other,{view:'active'})).tickets.length,0);
    await assert.rejects(support.read(other,created.id),error=>error.status===403);
    assert.equal((await support.create(student,{subject:'Second attempt',client_key:'registrar-ci-reuse-ticket'})).id,created.id);
    await support.action(student,created.id,{action:'resolve',client_key:'registrar-ci-resolve-ticket'});
    assert.ok(!(await support.list(student,{view:'active'})).tickets.some(row=>row.id===created.id));
    assert.ok((await support.list(student,{view:'archive'})).tickets.some(row=>row.id===created.id));
    await support.action(student,created.id,{action:'reopen',client_key:'registrar-ci-reopen-ticket'});
    assert.equal((await support.read(student,created.id)).ticket.state,'QUEUED');
    for(let i=0;i<23;i++)await root.query("INSERT INTO support_tickets(student_user_id,document_id,subject,category,state) VALUES (1,?,?,'linked','FAQ_ASSISTANCE')",[inserted.insertId,`Synthetic linked ${i}`]);
    const first=await support.list(student,{view:'active'});
    assert.equal(first.tickets.length,20);assert.ok(first.next_cursor);
    assert.ok(!first.tickets.some(row=>row.id===created.id));
    assert.equal((await support.read(student,created.id)).ticket.id,created.id);
    assert.ok((await support.list(student,{view:'active',before:first.next_cursor})).tickets.some(row=>row.id===created.id));
    await assert.rejects(support.read(other,created.id),error=>error.status===403);
    // Viewer-specific unread state, persisted on real MySQL and monotonic under old acknowledgements.
    await root.query("INSERT INTO users(id,student_id,password_hash,full_name,role,desk_assignment,is_active) VALUES (4,'CI-WINDOW','not-a-login-hash','Synthetic Window','clerk','Window 1',TRUE),(5,'CI-FINANCE','not-a-login-hash','Synthetic Finance','clerk','Finance',TRUE)");
    const windowUser={id:4,role:'clerk'},financeUser={id:5,role:'clerk'},adminUser={id:2,role:'admin'};
    const supportModel=require('../src/models/supportTicket.model');
    const message1=await supportModel.send(created.id,4,'Synthetic incoming reply','ci-read-message-one','a'.repeat(64),root);
    // The old ticket is outside the first page, so use the shared count model on its authorized row.
    const reads=require('../src/models/conversationRead.model');
    const count=async(channel,userId,resourceId)=>Number((await reads.withUnread(channel,userId,[{id:resourceId}],root))[0].unread_count);
    assert.equal(await count('support',1,created.id),1);assert.equal(await count('support',4,created.id),0);
    await support.markRead(adminUser,created.id,{through:message1});assert.equal(await count('support',1,created.id),1);
    await assert.rejects(support.markRead(other,created.id,{through:message1}),e=>e.status===403);
    await support.markRead(student,created.id,{through:message1});assert.equal(await count('support',1,created.id),0);
    const message2=await supportModel.send(created.id,4,'Synthetic newer reply','ci-read-message-two','b'.repeat(64),root);
    await support.markRead(student,created.id,{through:message1});assert.equal(await count('support',1,created.id),1);
    await support.markRead(student,created.id,{through:message2});await support.markRead(student,created.id,{through:message1});assert.equal(await count('support',1,created.id),0);
    const foreignMessage=await supportModel.send(first.tickets[0].id,4,'Another conversation','ci-read-other-thread','c'.repeat(64),root);
    await assert.rejects(support.markRead(student,created.id,{through:foreignMessage}),e=>e.status===400);
    const staff=require('../src/services/staffConversation.service');
    const opened=await staff.open(financeUser,{recipient_id:4,message:'Synthetic staff handoff',client_key:'registrar-ci-staff-unread'});
    assert.equal((await staff.list(windowUser)).conversations[0].unread_count,1);assert.equal((await staff.list(financeUser)).conversations[0].unread_count,0);
    await assert.rejects(staff.markRead(other,opened.conversation.id,{through:opened.message_id}),e=>e.status===403);
    await staff.markRead(windowUser,opened.conversation.id,{through:opened.message_id});assert.equal((await staff.list(windowUser)).conversations[0].unread_count,0);
    const internal=require('../src/services/internalAssistance.service');
    const concern=await internal.create(financeUser,{subject:'Synthetic concern',category:'system_issue',description:'Synthetic assistance request',client_key:'registrar-ci-internal-unread'});
    assert.equal((await internal.list(adminUser)).tickets[0].unread_count,1);
    const history=await internal.read(adminUser,concern.ticket.id),last=history.messages.at(-1).id;
    await assert.rejects(internal.markRead(windowUser,concern.ticket.id,{through:last}),e=>e.status===403);
    await internal.markRead(adminUser,concern.ticket.id,{through:last});assert.equal((await internal.list(adminUser)).tickets[0].unread_count,0);
    console.log('Registrar acceptance and all three channels: durable, isolated, monotonic unread positions passed.');
  }finally{await root.end();}
}
main().catch(error=>{console.error('Disposable registrar SQL acceptance failed:',error instanceof assert.AssertionError ? error.stack : error.code || error.name);process.exitCode=1;}).finally(()=>pool.end());

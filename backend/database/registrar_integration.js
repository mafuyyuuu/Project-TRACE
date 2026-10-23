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
    console.log('Fresh schema, additive migrations, private/idempotent FAQ feedback, release snapshots and current-case SQL passed.');
  }finally{await root.end();}
}
main().catch(error=>{console.error('Disposable registrar SQL acceptance failed:',error instanceof assert.AssertionError ? error.stack : error.code || error.name);process.exitCode=1;}).finally(()=>pool.end());

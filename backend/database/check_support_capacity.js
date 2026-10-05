// Isolated synthetic validation only. Never points at the configured TRACE database.
if(!process.argv.includes('--synthetic-only')) { console.error('Use --synthetic-only; requires isolated MySQL on 127.0.0.1:13307.'); process.exit(1); }
const root=require('node:path').resolve(__dirname,'../..');
const crypto=require('node:crypto'),assert=require('node:assert/strict'),http=require('node:http'),os=require('node:os');
Object.assign(process.env,{DB_HOST:'127.0.0.1',DB_PORT:'13307',DB_USER:'root',DB_PASSWORD:'',DB_NAME:'trace_support_test',DB_SSL:'false',JWT_SECRET:crypto.randomBytes(32).toString('hex'),WEBHOOK_SECRET:crypto.randomBytes(32).toString('hex'),SMTP_HOST:'',SMTP_USER:'',SMTP_PASS:'',UNISMS_SECRET_KEY:'',SMS_API_KEY:'',TRUST_PROXY:'0',FRONTEND_URL:''});
const {pool}=require(root+'/backend/src/config/db');
const jwt=require(root+'/backend/node_modules/jsonwebtoken');
const {io:client}=require(root+'/frontend/node_modules/socket.io-client');
const app=require(root+'/backend/src/app'),realtime=require(root+'/backend/src/realtime');
const server=http.createServer(app), sockets=[];
const run=crypto.randomBytes(6).toString('hex'),accounts=[],save=[],read=[],failures=[],wrong=[];
let io,base;
const quantile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*p)-1)] || null;
async function request(account,path,body){const response=await fetch(base+path,{method:body ? 'POST' : 'GET',headers:{Authorization:`Bearer ${account.token}`,...(body ? {'Content-Type':'application/json'} : {})},body:body ? JSON.stringify(body) : undefined,signal:AbortSignal.timeout(10000)});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error || 'Request failed'),{status:response.status});return data;}
async function connect(account){return new Promise((resolve,reject)=>{const socket=client(base,{auth:{token:account.token},transports:['websocket'],reconnection:false,timeout:10000});sockets.push(socket);socket.on('notification',note=>{const match=String(note.action_url || note.actionUrl || '').match(/ticket=(\d+)/);if(match && account.ticket && Number(match[1])!==account.ticket)wrong.push({owner:account.id,ticket:Number(match[1])});});socket.once('connected',data=>{if(data.userId!==account.id)return reject(new Error('Socket room owner mismatch'));resolve(socket);});socket.once('connect_error',reject);});}
(async()=>{try{
 await require(root+'/backend/database/migrate_support_tickets').migrate();
 await require(root+'/backend/database/migrate_support_requirements').migrate();
 await require(root+'/backend/database/migrate_sessions').migrate();
 io=realtime.init(server);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
 for(let index=0;index<100;index++){
 const [result]=await pool.query("INSERT INTO users(student_id,full_name,email,password_hash,role,user_type,verification_status,is_active,email_verified_at,token_version,must_change_password) VALUES (?,?,?,'synthetic-never-login','student','student','verified',TRUE,UTC_TIMESTAMP(),0,FALSE)",[`LOAD-${run}-${index}`,`Synthetic load ${index}`,`load-${run}-${index}@example.invalid`]);
 const id=result.insertId,token=jwt.sign({id,role:'student',token_version:0},process.env.JWT_SECRET,{expiresIn:'15m'});
 const account={id,token};accounts.push(account);
 const ticket=await request(account,'/api/support/tickets',{subject:`Synthetic capacity ${run} ${index}`,client_key:crypto.randomUUID()});account.ticket=ticket.id;
 }
 await Promise.all(accounts.map(connect));
 await Promise.all(accounts.map(async(account,index)=>{try{
  const message=`Synthetic ${run} accepted ${index}`,key=crypto.randomUUID();
  const start=performance.now();const sent=await request(account,`/api/support/tickets/${account.ticket}/messages`,{message,client_key:key});save.push(performance.now()-start);assert.ok(sent.sent.id);account.messageId=sent.sent.id;account.key=key;account.message=message;
  const readStart=performance.now(),history=await request(account,`/api/support/tickets/${account.ticket}`);read.push(performance.now()-readStart);assert.equal(history.ticket.student_user_id,account.id);assert.ok(history.messages.some(row=>row.message===message && row.sender_id===account.id));
  account.messageId=sent.sent.id;account.key=key;account.message=message;
 }catch(error){failures.push({phase:'100-concurrent',status:error.status || error.code || error.name});}}));
 // Lost-response retries deliberately reuse the accepted key and contents.
 await Promise.all(accounts.filter(account=>account.messageId).slice(0,20).map(async account=>{const retry=await request(account,`/api/support/tickets/${account.ticket}/messages`,{message:account.message,client_key:account.key});assert.equal(retry.sent.id,account.messageId);assert.equal(retry.duplicate,true);}));
 for(const socket of sockets.slice(0,10))socket.disconnect();await Promise.all(accounts.slice(0,10).map(connect));
 const denied=await fetch(base+`/api/support/tickets/${accounts[1].ticket}`,{headers:{Authorization:`Bearer ${accounts[0].token}`}});assert.equal(denied.status,403);
 const [rows]=await pool.query('SELECT m.id,m.sender_id,m.ticket_id,t.student_user_id FROM support_ticket_messages m JOIN support_tickets t ON t.id=m.ticket_id WHERE m.sender_id IN (?)',[accounts.map(account=>account.id)]);
 const unique=new Set(rows.map(row=>row.id));const acknowledged=accounts.filter(account=>account.messageId).length;const lost=accounts.filter(account=>account.messageId && !rows.some(row=>row.id===account.messageId)).length;assert.equal(unique.size,rows.length);assert.ok(rows.every(row=>row.sender_id===row.student_user_id));assert.equal(wrong.length,0);
 const report={environment:{os:os.platform(),arch:os.arch(),node:process.version,cpus:os.cpus().length,memory_gib:Math.round(os.totalmem()/1024**3),database:'isolated MySQL 8 / trace_support_test / loopback',db_pool_limit:pool.pool.config.connectionLimit,db_queue_limit:pool.pool.config.queueLimit},users:100,connected_before:100,reconnected:10,durable_messages:rows.length,acknowledged,missing_acknowledged:lost,errors:failures,p95_save_ms:quantile(save,.95),p95_read_ms:quantile(read,.95),retried:20,duplicates:rows.length-unique.size,cross_user_messages:rows.filter(row=>row.sender_id!==row.student_user_id).length,cross_user_notifications:wrong.length,unauthorized_read_status:denied.status,pass:failures.length===0 && acknowledged===100 && rows.length===100 && lost===0 && quantile(save,.95)<=2000 && quantile(read,.95)<=1000,scope:'Local synthetic API and Socket.IO; excludes file uploads, Caddy, WAN and browser rendering. Not production capacity proof.'};
 console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
 }finally{for(const socket of sockets)socket.disconnect();if(io)await new Promise(resolve=>io.close(resolve));else if(server.listening)await new Promise(resolve=>server.close(resolve));await pool.end();}})().catch(error=>{console.error('Synthetic capacity check failed:',error.code || error.name,error.message);process.exitCode=1;});

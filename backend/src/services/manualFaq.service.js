const crypto=require('crypto');
const model=require('../models/manualFaq.model');
const tickets=require('./supportTicket.service');
const approved=new Set([...require('../config/manualFaq.json'),...require('../config/supportFaq.json').map(row=>row.question)]);
const {badRequest}=require('../utils/AppError');
const {summarizeManualFaq}=require('../utils/manualFaqMetrics');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
async function feedback(user){const actor=await tickets.currentActor(user);return {feedback:await model.feedback(actor.id)};}
async function record(user,body={}){
  const actor=await tickets.currentActor(user);
  if(!approved.has(body.question) || !['view','helpful','not_helpful'].includes(body.action) || typeof body.client_key!=='string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(body.client_key))throw badRequest('Choose an approved manual question and feedback action.');
  if(body.suggestion!=null && typeof body.suggestion!=='string')throw badRequest('Enter a text suggestion.');
  const suggestion=(body.suggestion || '').trim();
  if(suggestion.length>2000)throw badRequest('Keep the suggestion within 2,000 characters.');
  if(suggestion && body.action!=='not_helpful')throw badRequest('Suggestions belong to a No response.');
  const payloadHash=hash(JSON.stringify([body.question,body.action,suggestion]));
  const saved=await model.append({userId:actor.id,question:body.question,questionHash:hash(body.question),action:body.action,
    suggestion:suggestion || null,clientKey:body.client_key,payloadHash,at:Date.now()});
  if(saved?.payload_hash!==payloadHash)throw badRequest('This retry key belongs to different feedback.');
  return {saved:true};
}
async function aggregate(from,to){const events=await model.events(from,to);if(events.length>50000)throw badRequest('Choose a shorter FAQ reporting period.');return summarizeManualFaq(events);}
module.exports={feedback,record,aggregate};

const topics = require('../config/supportFaq.json');
const model = require('../models/supportTicket.model');
const tickets = require('./supportTicket.service');
const { badRequest } = require('../utils/AppError');
const crypto = require('crypto');
const actions = ['view','helpful','not_helpful','resolved'];
function list() { return { topics }; }
function match(text) {
  if (typeof text !== 'string') return [];
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (words.length > 100) return [];
  const stop = new Set(['the','a','an','i','my','do','how','is','to','and','or','for','can','of','in','with']);
  const terms = [...new Set(words.filter(word => word.length > 2 && !stop.has(word)))];
  if (!terms.length) return [];
  return topics.map(topic => ({ ...topic, score: terms.filter(word => `${topic.question} ${topic.id}`.toLowerCase().includes(word)).length }))
    .filter(topic => topic.score > 0).sort((a,b) => b.score-a.score).slice(0,3).map(({score,...topic}) => topic);
}
async function feedback(user,ticketId,body = {}) {
  const numericId = Number(ticketId);
  if (!Number.isSafeInteger(numericId) || numericId < 1) throw badRequest('Choose a valid support ticket.');
  const topic = topics.find(topic => topic.id === body.topic_id);
  if (!topic || !actions.includes(body.action) || typeof body.client_key !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(body.client_key)) throw badRequest('Choose an approved FAQ topic and feedback action.');
  return tickets.transaction(user,async (connection,actor,settings) => {
    const ticket = await tickets.authorize(actor,await model.ticket(numericId,connection,true),connection);
    const hash = crypto.createHash('sha256').update(JSON.stringify({ticketId:ticket.id,topic:topic.id,action:body.action})).digest('hex');
    const eventKey = `${actor.id}:${body.client_key}`;
    const prior = await model.eventExists(eventKey,connection);
    if (prior) { const data = typeof prior.data === 'string' ? JSON.parse(prior.data) : prior.data; if (data?.hash !== hash) throw badRequest('This retry key belongs to another action.'); return {topic,ticket}; }
    if (tickets.readOnly(ticket)) throw badRequest('This history is read-only. Reopen a permitted ticket first.');
    if (actor.role !== 'student' || ticket.state !== 'FAQ_ASSISTANCE') throw badRequest('FAQ assistance is available on your own FAQ ticket before escalation.');
    if(ticket.category==='linked' && !actor.email_verified_at) throw require('../utils/AppError').forbidden('Verify your email in Profile before changing document-case support.');
    await model.event(ticket.id,actor.id,`faq_${body.action}`,eventKey,{topic_id:topic.id,hash},connection);
    if (body.action === 'view') {
      if(ticket.category!=='linked') await model.update(ticket.id,{category:topic.id},connection);
      await model.system(ticket.id,`${topic.question}\n\n${topic.answer}`,{faq_topic_id:topic.id},connection);
    }
    if (body.action === 'resolved') {
      await model.update(ticket.id,{state:'RESOLVED',resolved_at:new Date()},connection);
      await model.event(ticket.id,actor.id,'resolve',crypto.randomUUID(),{via:'explicit_faq_resolved',calendar:settings},connection);
      await model.system(ticket.id,'Student marked this FAQ assistance as resolved.',{},connection);
    }
    return {topic,ticket:await model.ticket(ticket.id,connection)};
  });
}
module.exports={list,match,feedback};

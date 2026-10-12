const model = require('../models/supportingDocument.model');
const tickets = require('./supportTicket.service');
const { badRequest, forbidden, notFound } = require('../utils/AppError');
async function list(user) { await tickets.currentActor(user); return {types:await model.list()}; }
async function save(user, body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const id = body.id === undefined ? null : Number(body.id);
  if (!name || name.length>255 || typeof body.is_active !== 'boolean' || (id!==null && (!Number.isSafeInteger(id) || id<1))) throw badRequest('Enter a document name (up to 255 characters) and its active state.');
  return tickets.transaction(user,async (connection,actor) => {
    if(actor.role!=='admin') throw forbidden('Admin manages Registrar-approved supporting-document types.');
    if(!id && (await model.list(connection)).length>=250) throw badRequest('The supporting-document catalog is limited to 250 types. Review existing types first.');
    if(id && !await model.find(id,connection)) throw notFound('Supporting-document type not found.');
    try { await model.save(id,name,body.is_active,actor.id,connection); }
    catch(error) { if(error.code==='ER_DUP_ENTRY') throw badRequest('That supporting-document name already exists.'); throw error; }
    await require('../models/supportTicket.model').event(null,actor.id,'supporting_document_changed',require('crypto').randomUUID(),{id,name,is_active:body.is_active},connection);
    return {types:await model.list(connection)};
  },true);
}
module.exports = { list, save };

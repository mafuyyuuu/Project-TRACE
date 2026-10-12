// Keep authorized legacy reads for bookmarks/history, but never accept writes
// into the obsolete stores after their transactional ticket import.
function readOnly(_req,res) {
  res.status(409).json({error:'Messaging has moved to Support tickets. Refresh TRACE and open Support to send; previous conversations remain available.',code:'SUPPORT_TICKET_REQUIRED'});
}
module.exports = { readOnly };

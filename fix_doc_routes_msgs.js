const fs = require('fs');

// 1. Controller
let ctrlFile = 'backend/src/controllers/documents.controller.js';
let ctrlContent = fs.readFileSync(ctrlFile, 'utf8');

const ctrlCode = `
async function getMessages(req, res) {
  try {
    res.json(await documentsService.getMessages(req.user, req.params.id));
  } catch (err) {
    fail(res, err, 'Fetch messages error', 'Failed to fetch messages.');
  }
}

async function sendMessage(req, res) {
  try {
    res.status(201).json(await documentsService.sendMessage(req.user, req.params.id, req.body));
  } catch (err) {
    fail(res, err, 'Send message error', 'Failed to send message.');
  }
}
`;

ctrlContent = ctrlContent.replace("module.exports = {", ctrlCode.trim() + "\n\nmodule.exports = {");
ctrlContent = ctrlContent.replace("module.exports = {", "module.exports = {\n  getMessages,\n  sendMessage,");
fs.writeFileSync(ctrlFile, ctrlContent);

// 2. Routes
let routeFile = 'backend/src/routes/documents.routes.js';
let routeContent = fs.readFileSync(routeFile, 'utf8');

const routeCode = `
router.get('/:id/messages', authenticate, documentsController.getMessages);
router.post('/:id/messages', authenticate, documentsController.sendMessage);
`;

routeContent = routeContent.replace("router.post('/:id/cancel', authenticate", routeCode.trim() + "\nrouter.post('/:id/cancel', authenticate"); // Wait, cancel is a DELETE
routeContent = routeContent.replace("router.delete('/:id', authenticate, documentsController.cancel);", routeCode.trim() + "\nrouter.delete('/:id', authenticate, documentsController.cancel);");

fs.writeFileSync(routeFile, routeContent);

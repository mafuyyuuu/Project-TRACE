const fs = require('fs');

// 1. user.model.js
let modelFile = 'backend/src/models/user.model.js';
let modelContent = fs.readFileSync(modelFile, 'utf8');
const adminModelFn = `
function getGlobalSecurityLogs(executor = pool) {
  return executor.query(
    'SELECT sl.event_type, sl.ip_address, sl.user_agent, sl.created_at, u.full_name, u.student_id, u.role FROM security_logs sl JOIN users u ON sl.user_id = u.id ORDER BY sl.created_at DESC LIMIT 100'
  ).then(([rows]) => rows);
}
`;
modelContent = modelContent.replace('module.exports = {', adminModelFn + '\nmodule.exports = {');
modelContent = modelContent.replace('module.exports = {', 'module.exports = {\n  getGlobalSecurityLogs,');
fs.writeFileSync(modelFile, modelContent);

// 2. auth.service.js
let authFile = 'backend/src/services/auth.service.js';
let authContent = fs.readFileSync(authFile, 'utf8');
const adminServiceFn = `
async function getGlobalSecurityLogs() {
  return await userModel.getGlobalSecurityLogs();
}
`;
authContent = authContent.replace('async function getSecurityLogs', adminServiceFn + '\nasync function getSecurityLogs');
authContent = authContent.replace('getSecurityLogs,', 'getGlobalSecurityLogs,\n  getSecurityLogs,');
fs.writeFileSync(authFile, authContent);

// 3. auth.controller.js
let ctrlFile = 'backend/src/controllers/auth.controller.js';
let ctrlContent = fs.readFileSync(ctrlFile, 'utf8');
const adminCtrlFn = `
exports.getGlobalSecurityLogs = async (req, res, next) => {
  try {
    const logs = await authService.getGlobalSecurityLogs();
    res.json(logs);
  } catch (err) {
    next(err);
  }
};
`;
ctrlContent = ctrlContent.replace('exports.getSecurityLogs', adminCtrlFn + '\nexports.getSecurityLogs');
fs.writeFileSync(ctrlFile, ctrlContent);

// 4. auth.routes.js
let routesFile = 'backend/src/routes/auth.routes.js';
let routesContent = fs.readFileSync(routesFile, 'utf8');
const authMiddleware = "const { authenticate, requireRole } = require('../middlewares/auth.middleware');";
routesContent = routesContent.replace("const { authenticate } = require('../middlewares/auth.middleware');", authMiddleware);
routesContent = routesContent.replace(
  "router.get('/security-logs', authenticate, authController.getSecurityLogs);",
  "router.get('/security-logs', authenticate, authController.getSecurityLogs);\nrouter.get('/global-security-logs', authenticate, requireRole('admin'), authController.getGlobalSecurityLogs);"
);
fs.writeFileSync(routesFile, routesContent);

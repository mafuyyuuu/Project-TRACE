const fs = require('fs');

// 1. auth.service.js
let authFile = 'backend/src/services/auth.service.js';
let authContent = fs.readFileSync(authFile, 'utf8');
const logExport = `
async function getSecurityLogs(userId) {
  return await userModel.getSecurityLogs(userId);
}
`;
authContent = authContent.replace(
  "async function logoutAll(userId) {",
  logExport + "\nasync function logoutAll(userId) {"
);
authContent = authContent.replace(
  "logoutAll,",
  "getSecurityLogs,\n  logoutAll,"
);
fs.writeFileSync(authFile, authContent);

// 2. auth.controller.js
let ctrlFile = 'backend/src/controllers/auth.controller.js';
let ctrlContent = fs.readFileSync(ctrlFile, 'utf8');
const ctrlFn = `
exports.getSecurityLogs = async (req, res, next) => {
  try {
    const logs = await authService.getSecurityLogs(req.user.id);
    res.json(logs);
  } catch (err) {
    next(err);
  }
};
`;
ctrlContent = ctrlContent.replace(
  "exports.logoutAll = async (req, res, next) => {",
  ctrlFn + "\nexports.logoutAll = async (req, res, next) => {"
);
fs.writeFileSync(ctrlFile, ctrlContent);

// 3. auth.routes.js
let routesFile = 'backend/src/routes/auth.routes.js';
let routesContent = fs.readFileSync(routesFile, 'utf8');
routesContent = routesContent.replace(
  "router.post('/logout-all', authenticate, authController.logoutAll);",
  "router.post('/logout-all', authenticate, authController.logoutAll);\nrouter.get('/security-logs', authenticate, authController.getSecurityLogs);"
);
fs.writeFileSync(routesFile, routesContent);


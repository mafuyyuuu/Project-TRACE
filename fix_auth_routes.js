const fs = require('fs');

// 1. auth.routes.js
let routesFile = 'backend/src/routes/auth.routes.js';
let routesContent = fs.readFileSync(routesFile, 'utf8');
routesContent = routesContent.replace(
  "router.get('/me', authenticate, authController.getMe);",
  "router.get('/me', authenticate, authController.getMe);\nrouter.post('/logout-all', authenticate, authController.logoutAll);"
);
fs.writeFileSync(routesFile, routesContent);

// 2. auth.controller.js
let controllerFile = 'backend/src/controllers/auth.controller.js';
let controllerContent = fs.readFileSync(controllerFile, 'utf8');
const logoutAllFn = `
exports.logoutAll = async (req, res, next) => {
  try {
    const result = await authService.logoutAll(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
`;
controllerContent = controllerContent.replace(
  "exports.getMe = async (req, res, next) => {",
  logoutAllFn + "\nexports.getMe = async (req, res, next) => {"
);
fs.writeFileSync(controllerFile, controllerContent);

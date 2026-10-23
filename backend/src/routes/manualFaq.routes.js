const router=require('express').Router();
const {authenticate}=require('../middlewares/auth.middleware');
const {faqFeedbackLimiter}=require('../middlewares/rateLimit.middleware');
const controller=require('../controllers/manualFaq.controller');
router.use(authenticate);router.get('/',controller.feedback);router.post('/',faqFeedbackLimiter,controller.record);
module.exports=router;

import { useState, useEffect } from 'react';

const TUTORIAL_STEPS = [
  {
    target: 'tutorial-profile',
    title: 'Complete Your Profile',
    content: 'Welcome to Project TRACE! Start by completing your profile in Account Settings. You must reach 100% completion before requesting documents.',
    placement: 'bottom-left'
  },
  {
    target: 'tutorial-new-request',
    title: 'Request Documents',
    content: 'Once your profile is complete, click here to request new documents. You can request multiple documents at once.',
    placement: 'bottom'
  },
  {
    target: 'tutorial-notifications',
    title: 'Real-time Updates',
    content: "You'll receive real-time updates and SMS/Email alerts here when your document is ready for payment or release.",
    placement: 'bottom-left'
  }
];

export default function OnboardingTutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    const updateRect = () => {
    const el = document.getElementById(TUTORIAL_STEPS[currentStep]?.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    } else {
      setTargetRect(null);
    }
  };

    // Wait for DOM to settle
    const timer = setTimeout(updateRect, 300);
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      onComplete();
    }
  };

  if (!targetRect) return null; // Waiting for element

  const step = TUTORIAL_STEPS[currentStep];

  // Keep the existing placement preference while containing the card on phones.
  const tooltipWidth = Math.min(300, window.innerWidth - 32);
  const preferredLeft = step.placement === 'bottom-left'
    ? targetRect.left + targetRect.width - tooltipWidth
    : targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  const tooltipStyle = {
    top: Math.max(16, Math.min(targetRect.top + targetRect.height + 16, window.innerHeight - 240)),
    left: Math.max(16, Math.min(preferredLeft, window.innerWidth - tooltipWidth - 16)),
    width: tooltipWidth,
    maxHeight: 'calc(100dvh - 2rem)',
    overflowY: 'auto',
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Dimmed background using multiple boxes to create a 'hole' */}
      <div 
        className="absolute transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] bg-black/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          borderRadius: '12px'
        }}
      />

      <div 
        className="absolute w-[300px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-5 animate-slide-up"
        style={tooltipStyle}
      >
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-black text-gray-900 dark:text-gray-100 text-sm">{step.title}</h4>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {currentStep + 1} OF {TUTORIAL_STEPS.length}
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
          {step.content}
        </p>
        <div className="flex justify-between items-center">
          <button 
            onClick={onComplete}
            className="text-[10px] font-bold text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 uppercase tracking-widest"
          >
            Skip Tour
          </button>
          <button 
            onClick={handleNext}
            className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

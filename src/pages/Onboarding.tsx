import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingForm } from '@/components/OnboardingForm';
import { OnboardingSuccess } from '@/components/OnboardingSuccess';

const Onboarding = () => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const navigate = useNavigate();

  const handleSuccess = () => {
    setStep('success');
  };

  const handleContinue = () => {
    // Redirect to dashboard
    navigate('/dashboard');
  };

  if (step === 'success') {
    return <OnboardingSuccess onContinue={handleContinue} />;
  }

  return <OnboardingForm onSuccess={handleSuccess} />;
};

export default Onboarding;
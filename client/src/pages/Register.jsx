import React from 'react';
import { SignUp } from '@clerk/clerk-react';

const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] px-6 py-12 relative">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-glow rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-1000" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="relative z-10 scale-105">
        <SignUp 
          signInUrl="/login" 
          forceRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: '#F59E0B',
              colorBackground: '#0F172A',
              colorInputBackground: '#1E293B',
              colorInputText: '#FFFFFF',
              colorText: '#FFFFFF',
              colorTextSecondary: '#94A3B8'
            },
            elements: {
              card: "bg-gray-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-glass text-white",
              headerTitle: "text-white text-xl font-extrabold tracking-tight",
              headerSubtitle: "text-gray-300 font-light text-xs",
              socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
              socialButtonsBlockButtonText: "text-white font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-gray-400",
              formFieldLabel: "text-gray-300 font-semibold text-xs uppercase tracking-wider",
              formFieldInput: "!bg-slate-800 !border-slate-700 !text-white rounded-xl focus:!border-amber-400 focus:!ring-1 focus:!ring-amber-400",
              formButtonPrimary: "luxury-button text-slate-950 font-bold",
              footerActionText: "text-gray-400 font-light",
              footerActionLink: "text-accent font-semibold hover:text-accent/80 transition-colors",
              
              // OTP & Verification code specific styling
              otpCodeField: "!gap-2.5 my-2",
              otpCodeFieldInputs: "!gap-2.5 !justify-center",
              otpCodeFieldInput: "!bg-slate-800 !border-2 !border-amber-400/60 !text-white !text-xl !font-black !rounded-xl shadow-inner focus:!border-amber-400 focus:!ring-2 focus:!ring-amber-400/50",
              identityPreviewText: "!text-gray-100 !font-semibold",
              identityPreviewEditButton: "!text-amber-400 hover:!text-amber-300",
              formResendCodeLink: "!text-amber-400 hover:!text-amber-300 !font-semibold",
              formFieldSuccessText: "!text-emerald-400",
              formFieldErrorText: "!text-rose-400"
            }
          }}
        />
      </div>
    </div>
  );
};

export default Register;

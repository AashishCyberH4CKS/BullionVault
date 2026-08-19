import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] px-6 py-12 relative">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-glow rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-1000" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="relative z-10 scale-105">
        <SignIn 
          signUpUrl="/register" 
          forceRedirectUrl="/dashboard"
          appearance={{
            elements: {
              card: "bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-glass text-white",
              headerTitle: "text-white text-xl font-extrabold tracking-tight",
              headerSubtitle: "text-gray-400 font-light text-xs",
              socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
              socialButtonsBlockButtonText: "text-white font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-gray-500",
              formFieldLabel: "text-gray-400 font-semibold text-xs uppercase tracking-wider",
              formFieldInput: "bg-white/5 border border-white/10 text-white rounded-xl focus:border-accent",
              formButtonPrimary: "luxury-button text-slate-950 font-bold",
              footerActionText: "text-gray-400 font-light",
              footerActionLink: "text-accent font-semibold hover:text-accent/80 transition-colors"
            }
          }}
        />
      </div>
    </div>
  );
};

export default Login;

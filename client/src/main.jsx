import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in client/.env file");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY} 
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#F59E0B',
          colorBackground: '#0F172A',
          colorInputBackground: '#1E293B',
          colorInputText: '#FFFFFF',
          colorText: '#FFFFFF',
          colorTextSecondary: '#94A3B8',
          colorTextOnPrimaryBackground: '#0B0F19'
        },
        elements: {
          userButtonPopoverCard: "!bg-[#0F172A] !border !border-white/10 !text-white shadow-2xl",
          userButtonPopoverActionButton: "!text-white hover:!bg-white/10 hover:!text-amber-400 transition-colors",
          userButtonPopoverActionButtonText: "!text-white !font-medium hover:!text-amber-400",
          userButtonPopoverActionButtonIcon: "!text-white hover:!text-amber-400",
          userButtonPopoverFooter: "!bg-slate-900/60 !border-t !border-white/10",
          userPreviewMainIdentifier: "!text-white !font-semibold",
          userPreviewSecondaryIdentifier: "!text-slate-400"
        }
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)

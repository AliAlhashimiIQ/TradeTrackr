'use client'

import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      gutter={10}
      toastOptions={{
        duration: 3500,
        style: {
          background: '#151823',
          color: '#f1f5f9',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 500,
          padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          maxWidth: '420px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#151823',
          },
          style: {
            borderLeft: '3px solid #10b981',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#151823',
          },
          style: {
            borderLeft: '3px solid #ef4444',
          },
        },
      }}
    />
  )
}

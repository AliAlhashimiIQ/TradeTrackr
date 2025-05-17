import React, { ReactNode, useState } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
  helpText?: string;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  children,
  required = false,
  helpText,
  className = '',
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`mb-4 ${className}`}>
      <label 
        htmlFor={id} 
        className={`block text-sm font-medium mb-1 ${
          error ? 'text-red-600' : focused ? 'text-blue-600' : 'text-gray-700'
        }`}
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      
      <div 
        className="relative"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {children}
        
        {error && (
          <div className="flex items-center mt-1">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor" 
              className="w-4 h-4 text-red-500 mr-1"
            >
              <path 
                fillRule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" 
                clipRule="evenodd" 
              />
            </svg>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        
        {helpText && !error && (
          <p className="mt-1 text-xs text-gray-500">{helpText}</p>
        )}
      </div>
    </div>
  );
};

export default FormField;

// Input component that works with FormField
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
}> = ({ error, ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition duration-150 ${
      error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
    } ${props.className || ''}`}
  />
);

// Select component that works with FormField
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
}> = ({ error, ...props }) => (
  <select
    {...props}
    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition duration-150 ${
      error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
    } ${props.className || ''}`}
  />
);

// Textarea component that works with FormField
export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
}> = ({ error, ...props }) => (
  <textarea
    {...props}
    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition duration-150 ${
      error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
    } ${props.className || ''}`}
  />
); 
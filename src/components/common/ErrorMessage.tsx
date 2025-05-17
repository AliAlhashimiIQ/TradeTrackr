import React from 'react';

interface ErrorMessageProps {
  message: string;
  severity?: 'error' | 'warning' | 'info';
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  severity = 'error',
  details,
  onRetry,
  onDismiss,
  className = '',
}) => {
  // Map severity to styles
  const severityMap = {
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-700',
      iconColor: 'text-red-500',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
        </svg>
      ),
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-500',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      ),
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-500',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      ),
    },
  };

  const { bgColor, borderColor, textColor, iconColor, icon } = severityMap[severity];

  return (
    <div className={`flex p-4 border rounded-md ${bgColor} ${borderColor} ${className}`} role="alert">
      <div className={`flex-shrink-0 ${iconColor}`}>{icon}</div>
      <div className="ml-3 flex-grow">
        <h3 className={`text-sm font-medium ${textColor}`}>{message}</h3>
        {details && (
          <details className="mt-1">
            <summary className={`text-xs ${textColor} cursor-pointer`}>Show details</summary>
            <pre className={`mt-2 text-xs whitespace-pre-wrap ${textColor} bg-white p-2 rounded border ${borderColor}`}>
              {details}
            </pre>
          </details>
        )}
        {(onRetry || onDismiss) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {onRetry && (
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium ${
                  severity === 'error'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : severity === 'warning'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } rounded`}
                onClick={onRetry}
              >
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
                onClick={onDismiss}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage; 
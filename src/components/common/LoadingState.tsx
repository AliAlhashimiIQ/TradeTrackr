import React from 'react';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'dots' | 'bar';
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullPage?: boolean;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'medium',
  text,
  fullPage = false,
  className = ''
}) => {
  // Size mapping
  const sizeMap = {
    small: {
      height: 'h-4',
      width: 'w-4',
      textSize: 'text-xs',
      wrapperPadding: 'p-2',
    },
    medium: {
      height: 'h-8',
      width: 'w-8',
      textSize: 'text-sm',
      wrapperPadding: 'p-4',
    },
    large: {
      height: 'h-12',
      width: 'w-12',
      textSize: 'text-base',
      wrapperPadding: 'p-6',
    },
  };

  const { height, width, textSize, wrapperPadding } = sizeMap[size];

  // Wrapper styles
  const wrapperClasses = `flex flex-col items-center justify-center ${
    fullPage ? 'fixed inset-0 bg-gray-900/70 z-50' : wrapperPadding
  } ${className}`;

  // Render loading indicators based on variant
  const renderLoadingIndicator = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div className={`${width} ${height} text-blue-500 animate-spin`} role="status">
            <svg
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        );

      case 'dots':
        return (
          <div className="flex space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`bg-blue-500 rounded-full ${
                  size === 'small' ? 'w-2 h-2' : size === 'medium' ? 'w-3 h-3' : 'w-4 h-4'
                } animate-pulse`}
                style={{ animationDelay: `${i * 0.15}s` }}
              ></div>
            ))}
          </div>
        );

      case 'skeleton':
        return (
          <div className="w-full max-w-md space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
          </div>
        );

      case 'bar':
        return (
          <div className="w-full h-1 max-w-md bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-progress-bar"></div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={wrapperClasses} aria-live="polite" aria-busy="true">
      {renderLoadingIndicator()}
      {text && <span className={`mt-2 ${textSize} ${fullPage ? 'text-white' : 'text-gray-600'}`}>{text}</span>}
    </div>
  );
};

export default LoadingState; 
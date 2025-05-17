import React, { useState } from 'react';

interface Emotion {
  value: string;
  label: string;
  color: string;
  icon: JSX.Element;
  description: string;
}

interface EmotionalStateSelectorProps {
  value: string | undefined;
  onChange: (value: string) => void;
  className?: string;
}

const EmotionalStateSelector: React.FC<EmotionalStateSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [activeSection, setActiveSection] = useState<'positive' | 'negative' | 'neutral'>('positive');
  
  // Define emotion options with enhanced metadata
  const emotions: Record<string, Emotion[]> = {
    positive: [
      {
        value: 'calm',
        label: 'Calm',
        color: 'bg-green-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ),
        description: 'Relaxed and in control of decisions',
      },
      {
        value: 'confident',
        label: 'Confident',
        color: 'bg-blue-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        description: 'Assured in analysis and trading plan',
      },
      {
        value: 'excited',
        label: 'Excited',
        color: 'bg-violet-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        description: 'Energized by market opportunities',
      },
      {
        value: 'focused',
        label: 'Focused',
        color: 'bg-cyan-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ),
        description: 'Highly attentive to market action',
      },
    ],
    negative: [
      {
        value: 'fearful',
        label: 'Fearful',
        color: 'bg-red-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        description: 'Afraid of losses or missing out',
      },
      {
        value: 'greedy',
        label: 'Greedy',
        color: 'bg-amber-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        description: 'Excessively focused on profits',
      },
      {
        value: 'impatient',
        label: 'Impatient',
        color: 'bg-orange-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        description: 'Rushing decisions without proper analysis',
      },
      {
        value: 'frustrated',
        label: 'Frustrated',
        color: 'bg-rose-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ),
        description: 'Annoyed by market behavior or losses',
      },
      {
        value: 'anxious',
        label: 'Anxious',
        color: 'bg-yellow-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        description: 'Worried about position performance',
      },
      {
        value: 'regretful',
        label: 'Regretful',
        color: 'bg-indigo-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        description: 'Dwelling on missed opportunities',
      },
    ],
    neutral: [
      {
        value: 'bored',
        label: 'Bored',
        color: 'bg-gray-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6" />
          </svg>
        ),
        description: 'Feeling uninterested in current market',
      },
      {
        value: 'curious',
        label: 'Curious',
        color: 'bg-emerald-500',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        description: 'Exploring market trends with interest',
      },
      {
        value: 'analytical',
        label: 'Analytical',
        color: 'bg-blue-400',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        description: 'Objectively evaluating market data',
      },
      {
        value: 'cautious',
        label: 'Cautious',
        color: 'bg-amber-400',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        description: 'Taking careful, measured approach',
      },
    ],
  };
  
  // Handle clicking an emotion
  const handleEmotionSelect = (emotionValue: string) => {
    onChange(emotionValue);
  };
  
  // Get currently selected emotion object
  const getSelectedEmotion = (): Emotion | undefined => {
    if (!value) return undefined;
    
    for (const section of Object.values(emotions)) {
      const found = section.find(emotion => emotion.value === value);
      if (found) return found;
    }
    
    return undefined;
  };
  
  const selectedEmotion = getSelectedEmotion();
  
  return (
    <div className={`bg-[#0f1117] rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-white text-sm font-semibold flex items-center">
          <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Emotional State
        </h3>
        <p className="text-gray-400 text-xs mt-1">
          How were you feeling during this trade?
        </p>
      </div>
      
      {/* Selected Emotion Display */}
      {selectedEmotion && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-[#151823] border border-gray-800">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full ${selectedEmotion.color.replace('bg-', 'bg-')}/20 flex items-center justify-center mr-3`}>
              <div className={`text-${selectedEmotion.color.replace('bg-', '')}`}>
                {selectedEmotion.icon}
              </div>
            </div>
            <div>
              <div className={`font-medium text-${selectedEmotion.color.replace('bg-', '')}`}>{selectedEmotion.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{selectedEmotion.description}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Emotions Category Tabs */}
      <div className="px-4 pt-4">
        <div className="flex space-x-1 border-b border-gray-800">
          <button
            type="button"
            className={`px-4 py-2 text-sm rounded-t-lg ${
              activeSection === 'positive'
                ? 'bg-[#151823] text-green-400 border-t border-l border-r border-gray-700'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveSection('positive')}
          >
            Positive
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm rounded-t-lg ${
              activeSection === 'negative'
                ? 'bg-[#151823] text-red-400 border-t border-l border-r border-gray-700'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveSection('negative')}
          >
            Negative
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm rounded-t-lg ${
              activeSection === 'neutral'
                ? 'bg-[#151823] text-blue-400 border-t border-l border-r border-gray-700'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveSection('neutral')}
          >
            Neutral
          </button>
        </div>
      </div>
      
      {/* Emotions Grid */}
      <div className="p-4 bg-[#151823] mx-4 mb-4 rounded-b-lg border-b border-l border-r border-gray-700">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {emotions[activeSection].map((emotion) => (
            <button
              key={emotion.value}
              type="button"
              onClick={() => handleEmotionSelect(emotion.value)}
              className={`p-3 rounded-lg flex flex-col items-center justify-center transition-all ${
                value === emotion.value
                  ? `${emotion.color.replace('bg-', 'bg-')}/20 border border-${emotion.color.replace('bg-', '')}/30 shadow-md`
                  : 'bg-[#1a1f2c] hover:bg-[#1c2236] border border-transparent'
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${emotion.color.replace('bg-', 'bg-')}/20 flex items-center justify-center mb-2`}>
                <div className={`text-${emotion.color.replace('bg-', '')}`}>
                  {emotion.icon}
                </div>
              </div>
              <span className={`text-xs font-medium ${value === emotion.value ? `text-${emotion.color.replace('bg-', '')}` : 'text-gray-300'}`}>
                {emotion.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Trading Psychology Tip */}
      <div className="mx-4 mb-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
        <p className="text-xs text-gray-300">
          <span className="text-blue-400 font-medium">Tip:</span> Tracking your emotional state during trades helps identify patterns affecting your decision-making.
        </p>
      </div>
    </div>
  );
};

export default EmotionalStateSelector; 
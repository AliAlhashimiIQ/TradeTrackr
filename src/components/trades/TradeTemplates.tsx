import React, { useState, useEffect } from 'react';
import { Trade } from '@/lib/types';

interface TradeTemplate {
  id: string;
  name: string;
  symbol: string;
  type: 'Long' | 'Short';
  defaultQuantity: number;
  tags: string[];
  strategy?: string;
  emotional_state?: string;
}

interface TradeTemplatesProps {
  onApplyTemplate: (template: Partial<Trade>) => void;
  onSaveTemplate: (currentTrade: Partial<Trade>) => void;
  currentTrade?: Partial<Trade>;
  className?: string;
}

/**
 * Provides a way to save and apply trade templates
 */
const TradeTemplates: React.FC<TradeTemplatesProps> = ({
  onApplyTemplate,
  onSaveTemplate,
  currentTrade,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<TradeTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Load templates from localStorage on component mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem('tradeTemplates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (error) {
        console.error('Error loading templates:', error);
        // If there's an error, load the default templates
        setTemplates(defaultTemplates);
      }
    } else {
      // If no templates in localStorage, use defaults
      setTemplates(defaultTemplates);
    }
  }, []);
  
  // Example templates - in production these would be stored in the database
  const defaultTemplates: TradeTemplate[] = [
    {
      id: '1',
      name: 'EUR/USD Breakout',
      symbol: 'EURUSD',
      type: 'Long',
      defaultQuantity: 1,
      tags: ['Breakout', 'Trend'],
      strategy: 'Breakout trade on key level'
    },
    {
      id: '2',
      name: 'BTC Scalp',
      symbol: 'BTCUSD',
      type: 'Short',
      defaultQuantity: 0.1,
      tags: ['Scalp', 'Resistance'],
      strategy: 'Quick scalp at resistance'
    },
    {
      id: '3',
      name: 'Gold Swing',
      symbol: 'XAUUSD',
      type: 'Long', 
      defaultQuantity: 0.5,
      tags: ['Swing', 'Support'],
      strategy: 'Multi-day swing from support'
    }
  ];

  const handleApplyTemplate = (template: TradeTemplate) => {
    onApplyTemplate({
      symbol: template.symbol,
      type: template.type,
      quantity: template.defaultQuantity,
      notes: template.strategy,
      emotional_state: template.emotional_state
    });
    setIsOpen(false);
  };
  
  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const updatedTemplates = templates.filter(template => template.id !== id);
    setTemplates(updatedTemplates);
    localStorage.setItem('tradeTemplates', JSON.stringify(updatedTemplates));
  };
  
  const handleSaveNewTemplate = () => {
    if (!currentTrade || !newTemplateName.trim()) return;
    
    // Extract tags from notes if available
    let tags: string[] = [];
    if (currentTrade.notes) {
      const tagRegex = /#(\w+)/g;
      const matches = currentTrade.notes.match(tagRegex);
      if (matches) {
        tags = matches.map(tag => tag.substring(1));
      }
    }
    
    const newTemplate: TradeTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      symbol: currentTrade.symbol || '',
      type: currentTrade.type as 'Long' | 'Short' || 'Long',
      defaultQuantity: currentTrade.quantity || 1,
      tags,
      strategy: currentTrade.notes,
      emotional_state: currentTrade.emotional_state
    };
    
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem('tradeTemplates', JSON.stringify(updatedTemplates));
    
    // Reset form and show success message
    setNewTemplateName('');
    setShowSaveForm(false);
    setSaveSuccess(true);
    
    // Hide success message after 2 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
    
    // Also call the parent component's onSaveTemplate function
    onSaveTemplate(currentTrade);
  };

  const handleClickOutside = (e: MouseEvent) => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={className}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors text-white text-sm flex items-center shadow-md hover:shadow-lg"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          Templates
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-[#0f1117] rounded-md shadow-lg z-10 border border-gray-700">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-white font-medium">Trade Templates</h3>
              <p className="text-xs text-gray-400 mt-1">Apply a template or save your current setup</p>
            </div>
            
            <div className="py-1 max-h-64 overflow-y-auto">
              {templates.length > 0 ? (
                <div className="divide-y divide-gray-700">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => handleApplyTemplate(template)}
                      className="flex flex-col w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-[#1a1f2c] group cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white">{template.name}</span>
                        <div 
                          onClick={(e) => handleDeleteTemplate(template.id, e)}
                          className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          template.type === 'Long' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                        }`}>
                          {template.type}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">{template.symbol}</span>
                        {template.emotional_state && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-purple-900/20 text-purple-400 rounded">
                            {template.emotional_state}
                          </span>
                        )}
                      </div>
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-indigo-900/20 text-indigo-400 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <p>No templates saved yet</p>
                </div>
              )}
              
              {showSaveForm ? (
                <div className="p-4 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-white mb-2">Save Current as Template</h4>
                  <input 
                    type="text" 
                    placeholder="Template name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full p-2 mb-2 bg-[#1a1f2c] border border-gray-700 rounded text-white text-sm"
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowSaveForm(false)}
                      className="px-3 py-1 text-sm text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewTemplate}
                      className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                      disabled={!newTemplateName.trim()}
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setShowSaveForm(true)}
                  className="flex items-center w-full text-left px-4 py-3 text-sm text-indigo-400 hover:bg-[#1a1f2c] border-t border-gray-700 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Save Current as Template
                </div>
              )}
            </div>
          </div>
        )}
        
        {saveSuccess && (
          <div className="absolute top-0 right-0 transform -translate-y-full mb-2">
            <div className="bg-green-900/90 text-green-300 text-xs px-3 py-1 rounded-md whitespace-nowrap">
              Template saved successfully!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeTemplates; 
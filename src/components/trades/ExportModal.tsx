'use client';

import { useState } from 'react';
import Modal from '../common/Modal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (format: 'csv' | 'json' | 'pdf') => void;
  isLoading?: boolean;
}

export default function ExportModal({ isOpen, onClose, onConfirm, isLoading }: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');

  const handleSubmit = () => {
    onConfirm(format);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Selected Trades"
      primaryAction={{
        label: 'Export',
        onClick: handleSubmit,
        isLoading
      }}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center justify-center gap-2 transition-colors ${
                format === 'csv'
                  ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                  : 'border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center justify-center gap-2 transition-colors ${
                format === 'json'
                  ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                  : 'border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              JSON
            </button>
            <button
              type="button"
              onClick={() => setFormat('pdf')}
              className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center justify-center gap-2 transition-colors ${
                format === 'pdf'
                  ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                  : 'border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Your trades will be exported in the selected format with all available data.
        </p>
      </div>
    </Modal>
  );
} 
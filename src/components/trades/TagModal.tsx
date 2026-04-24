'use client';

import { useState } from 'react';
import Modal from '../common/Modal';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tag: string) => void;
  isLoading?: boolean;
}

export default function TagModal({ isOpen, onClose, onConfirm, isLoading }: TagModalProps) {
  const [tag, setTag] = useState('');

  const handleSubmit = () => {
    if (tag.trim()) {
      onConfirm(tag.trim());
      setTag('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Tag to Selected Trades"
      primaryAction={{
        label: 'Add Tag',
        onClick: handleSubmit,
        isLoading
      }}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="tag" className="block text-sm font-medium text-gray-400 mb-2">
            Tag Name
          </label>
          <input
            type="text"
            id="tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Enter tag name..."
            className="w-full p-2 rounded-lg bg-[#151823] border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <p className="text-sm text-gray-400">
          This tag will be added to all selected trades.
        </p>
      </div>
    </Modal>
  );
} 

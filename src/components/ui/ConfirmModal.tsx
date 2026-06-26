'use client';

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  isLoading = false,
}: ConfirmModalProps) {
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[150]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-[#0d0e16] border border-white/[0.08] p-6 text-left align-middle shadow-[0_0_50px_rgba(99,102,241,0.15)] transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2.5 mb-2"
                >
                  {isDanger && (
                    <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center text-xs shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                      ⚠️
                    </div>
                  )}
                  {isWarning && (
                    <div className="w-6 h-6 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-center text-xs">
                      ⚠️
                    </div>
                  )}
                  {!isDanger && !isWarning && (
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xs shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                      ℹ️
                    </div>
                  )}
                  {title}
                </Dialog.Title>

                <div className="mt-2.5">
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    {description}
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all duration-150 active:scale-95 cursor-pointer"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center ${
                      isDanger
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.1)]'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.2)]'
                    }`}
                    onClick={onConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      confirmLabel
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { getTradeNotes, addTradeNote, updateTradeNote, deleteTradeNote } from '@/lib/tradingApi';
import { TradeNote } from '@/lib/types';

interface TradeNotesProps {
  tradeId: string;
  userId: string;
}

export default function TradeNotes({ tradeId, userId }: TradeNotesProps) {
  const [notes, setNotes] = useState<TradeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch notes for the trade
  useEffect(() => {
    async function fetchNotes() {
      try {
        setLoading(true);
        const fetchedNotes = await getTradeNotes(tradeId);
        setNotes(fetchedNotes);
        setError(null);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setError('Failed to load notes. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchNotes();
  }, [tradeId]);

  // Handle adding a new note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || submitting) return;

    try {
      setSubmitting(true);
      const addedNote = await addTradeNote({
        trade_id: tradeId,
        user_id: userId,
        content: newNote.trim()
      });
      
      setNotes(prev => [...prev, addedNote]);
      setNewNote('');
      setError(null);
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Failed to add note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle updating a note
  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNoteContent.trim() || !editingNoteId || submitting) return;

    try {
      setSubmitting(true);
      const updatedNote = await updateTradeNote(editingNoteId, editNoteContent.trim());
      
      setNotes(prev => 
        prev.map(note => note.id === editingNoteId ? updatedNote : note)
      );
      setEditingNoteId(null);
      setEditNoteContent('');
      setError(null);
    } catch (error) {
      console.error('Error updating note:', error);
      setError('Failed to update note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle deleting a note
  const handleDeleteNote = async (noteId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      await deleteTradeNote(noteId);
      
      setNotes(prev => prev.filter(note => note.id !== noteId));
      setError(null);
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Start editing a note
  const startEditingNote = (note: TradeNote) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditNoteContent('');
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-[#0f1117] rounded-lg shadow-md p-4">
      <h3 className="text-xl font-semibold text-white mb-4">Trade Notes</h3>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {/* Notes list */}
      <div className="space-y-4 mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <p>No notes yet. Add your first note below.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-[#1a1f2c] p-4 rounded-lg">
              {editingNoteId === note.id ? (
                <form onSubmit={handleUpdateNote}>
                  <textarea
                    value={editNoteContent}
                    onChange={(e) => setEditNoteContent(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f1117] text-white border border-gray-700 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={3}
                    placeholder="Edit your note..."
                    required
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-1 bg-gray-800 text-gray-300 rounded-md text-sm hover:bg-gray-700"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-400">
                      {formatDate(note.created_at)}
                    </span>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => startEditingNote(note)}
                        className="text-gray-400 hover:text-blue-400 p-1"
                        title="Edit note"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-gray-400 hover:text-red-400 p-1"
                        title="Delete note"
                        disabled={submitting}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-white whitespace-pre-wrap">{note.content}</p>
                </>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Add note form */}
      <form onSubmit={handleAddNote}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full px-3 py-2 bg-[#1a1f2c] text-white border border-gray-700 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={3}
          placeholder="Add a note about this trade..."
          required
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-70"
            disabled={!newNote.trim() || submitting}
          >
            {submitting ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </form>
    </div>
  );
} 
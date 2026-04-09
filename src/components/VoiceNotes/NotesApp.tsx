import React, { useState, useEffect } from 'react';
import VoiceRecorder from './VoiceRecorder';

export interface NoteCategory {
  id: string;
  text: string;
  createdAt: number;
}

export interface OrganizedNotes {
  tasks: NoteCategory[];
  ideas: NoteCategory[];
  reminders: NoteCategory[];
}

export default function NotesApp() {
  const [notes, setNotes] = useState<OrganizedNotes>({ tasks: [], ideas: [], reminders: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar notas desde el LocalStorage al iniciar
  useEffect(() => {
    const savedNotes = localStorage.getItem('voice-notes-app-data');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Error parsing notes from local storage', e);
      }
    }
  }, []);

  // Guardar notas en el LocalStorage cada vez que cambien
  useEffect(() => {
    localStorage.setItem('voice-notes-app-data', JSON.stringify(notes));
  }, [notes]);

  const handleTranscriptionComplete = async (text: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/process-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la nota');
      }

      const now = Date.now();

      setNotes((prevNotes) => ({
        tasks: [
          ...prevNotes.tasks,
          ...(data.tasks || []).map((t: string) => ({ id: `t-${now}-${Math.random()}`, text: t, createdAt: now }))
        ],
        ideas: [
          ...prevNotes.ideas,
          ...(data.ideas || []).map((i: string) => ({ id: `i-${now}-${Math.random()}`, text: i, createdAt: now }))
        ],
        reminders: [
          ...prevNotes.reminders,
          ...(data.reminders || []).map((r: string) => ({ id: `r-${now}-${Math.random()}`, text: r, createdAt: now }))
        ]
      }));

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar con la IA');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteItem = (category: keyof OrganizedNotes, id: string) => {
    setNotes(prev => ({
      ...prev,
      [category]: prev[category].filter(item => item.id !== id)
    }));
  };

  const clearAll = () => {
    if(window.confirm('¿Estás seguro de que quieres borrar todas tus notas?')) {
        setNotes({ tasks: [], ideas: [], reminders: [] });
    }
  };

  const Column = ({ title, items, category, colorClass }: { title: string, items: NoteCategory[], category: keyof OrganizedNotes, colorClass: string }) => (
    <div className={`flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border-t-4 ${colorClass} border-x border-b border-gray-200 dark:border-gray-700 p-4 h-full`}>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center justify-between">
        {title}
        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
          {items.length}
        </span>
      </h3>

      {items.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-gray-400 dark:text-gray-500 italic text-sm">
          No hay elementos aún
        </div>
      ) : (
        <ul className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
          {items.map((item) => (
            <li key={item.id} className="group relative bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 shadow-sm transition-all hover:shadow-md">
              <p className="pr-6">{item.text}</p>
              <button
                onClick={() => deleteItem(category, item.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Eliminar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Sección de Grabación */}
      <section>
        <VoiceRecorder
          onTranscriptionComplete={handleTranscriptionComplete}
          isProcessing={isProcessing}
        />
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm max-w-2xl mx-auto text-center">
            {error}
          </div>
        )}
      </section>

      {/* Tablero (Dashboard) */}
      <section className="mt-4 w-full">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tu Tablero</h2>
            {(notes.tasks.length > 0 || notes.ideas.length > 0 || notes.reminders.length > 0) && (
                <button
                    onClick={clearAll}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                >
                    Limpiar todo
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Column title="Tareas Pendientes" items={notes.tasks} category="tasks" colorClass="border-blue-500" />
          <Column title="Ideas" items={notes.ideas} category="ideas" colorClass="border-amber-500" />
          <Column title="Recordatorios" items={notes.reminders} category="reminders" colorClass="border-purple-500" />
        </div>
      </section>
    </div>
  );
}

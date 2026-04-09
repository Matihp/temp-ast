import React, { useState, useEffect, useRef } from 'react';

// Extender la interfaz window para SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isProcessing: boolean;
}

export default function VoiceRecorder({ onTranscriptionComplete, isProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Inicializar SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Tu navegador no soporta la grabación de voz (API SpeechRecognition). Intenta usar Google Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES'; // Configurado para español
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Mantenemos lo que ya teníamos + el nuevo texto final + el texto temporal
      setTranscript((prev) => {
        // En mode continuo, isFinal a veces repite si no gestionamos bien el estado,
        // pero para simplificar, reemplazamos todo con el texto acumulado
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        return fullTranscript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setError(`Error en grabación: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    setError(null);
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript(''); // Limpiar antes de nueva grabación
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
        setError('No se pudo iniciar el micrófono. Asegúrate de dar permisos.');
      }
    }
  };

  const handleProcessText = () => {
    if (transcript.trim()) {
      onTranscriptionComplete(transcript.trim());
      setTranscript('');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 w-full max-w-2xl mx-auto">
      <div className="flex flex-col items-center gap-4">

        {/* Botón Principal */}
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none
            ${isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isRecording ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="6" y="6" width="12" height="12" fill="currentColor" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isRecording ? 'Escuchando...' : 'Toca para hablar'}
          </p>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        {/* Área de transcripción en vivo */}
        <div className="w-full mt-4">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Lo que digas aparecerá aquí..."
            className="w-full p-4 min-h-[120px] rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            disabled={isRecording || isProcessing}
          />
        </div>

        {/* Botón Procesar */}
        <button
          onClick={handleProcessText}
          disabled={!transcript.trim() || isRecording || isProcessing}
          className={`mt-2 px-6 py-2 rounded-lg font-medium text-white transition-all w-full sm:w-auto
            ${(!transcript.trim() || isRecording || isProcessing)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
            }
          `}
        >
          {isProcessing ? 'Procesando con IA...' : 'Organizar Nota'}
        </button>
      </div>
    </div>
  );
}

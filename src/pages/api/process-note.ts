export const prerender = false;
import type { APIRoute } from 'astro';
import { GoogleGenAI } from '@google/genai';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Gemini AI
    // Asegúrate de agregar GEMINI_API_KEY a tu archivo .env
    const apiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'API Key de Gemini no configurada. Por favor añádela al archivo .env como GEMINI_API_KEY'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Analiza el siguiente texto dictado por un usuario y clasifica la información en tres categorías exactas: "Tareas", "Ideas" y "Recordatorios".

      Reglas:
      1. Extrae los puntos clave y formúlalos de manera clara y concisa.
      2. No inventes información, solo usa lo que está en el texto.
      3. Si el texto no menciona nada para una categoría, devuelve un array vacío para esa categoría.
      4. DEBES devolver UNICAMENTE un objeto JSON válido con la siguiente estructura exacta, sin texto adicional ni formato markdown (sin \`\`\`json):
      {
        "tasks": ["tarea 1", "tarea 2"],
        "ideas": ["idea 1", "idea 2"],
        "reminders": ["recordatorio 1"]
      }

      Texto del usuario: "${text}"
    `;

    // Usamos el modelo rápido y barato de Gemini
    const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
            temperature: 0.1, // Baja temperatura para respuestas más deterministas
        }
    });

    let jsonResponse = response.text || "{}";

    // Limpieza de seguridad en caso de que Gemini devuelva markdown a pesar de las instrucciones
    jsonResponse = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(jsonResponse);

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error processing note with Gemini:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
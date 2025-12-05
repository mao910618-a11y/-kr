import { GoogleGenAI, Type } from "@google/genai";

// In Vite/Vercel, use import.meta.env.VITE_API_KEY
// Make sure to add VITE_API_KEY in your Vercel Project Settings -> Environment Variables
const apiKey = import.meta.env.VITE_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

export const getTravelAdvice = async (location: string, date: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Give me a very short (1 sentence) witty or helpful travel tip for ${location} in January (Winter). Focus on weather or local customs.`,
    });
    return response.text || "Enjoy your trip!";
  } catch (error) {
    console.error("Error fetching travel advice:", error);
    return "Bundle up! Seoul is chilly in January.";
  }
};

export const suggestItineraryItem = async (currentItems: string[]): Promise<{ title: string; location: string; category: string } | null> => {
  try {
    const prompt = `
      I am planning a trip to Seoul in Jan 2026. 
      Current items: ${currentItems.join(', ')}.
      Suggest ONE new unique activity, restaurant, or shopping spot that fits a retro/vintage vibe.
      Return JSON only.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            location: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['shopping', 'dining', 'sightseeing'] }
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini suggestion error", error);
    return null;
  }
}
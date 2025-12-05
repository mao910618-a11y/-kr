import { GoogleGenAI, Type } from "@google/genai";

// Access environment variable safely
const apiKey = import.meta.env.VITE_API_KEY;

// Only initialize AI if key exists
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL_NAME = 'gemini-2.5-flash';

export const getTravelAdvice = async (location: string, date: string): Promise<string> => {
  if (!ai) {
    // Fallback if no API key
    return "Have a wonderful trip to Seoul! (Add API Key to enable AI tips)";
  }

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
  if (!ai) {
    return null; // Return null effectively disables the AI suggestion silently
  }

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
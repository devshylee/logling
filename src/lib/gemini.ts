import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function analyzeCommit(diff: string) {
  if (!ai) throw new Error("Gemini API key not configured");

  const prompt = `
    Analyze the following git diff and provide a "Tactical RPG" style summary.
    Include:
    1. A catchy title.
    2. "Impact Score" (0-100).
    3. "Background" (Why this change?).
    4. "What Changed" (Bullet points).
    5. "Technical Deep Dive" (A brief expert insight).
    6. A "Mascot Note" (A witty or professional comment from an AI assistant).

    Diff:
    ${diff}

    Return the response in JSON format with the following structure:
    {
      "title": string,
      "impactScore": number,
      "background": string,
      "changes": string[],
      "deepDive": string,
      "mascotNote": string
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash-latest",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Invalid AI response format");
  }
}

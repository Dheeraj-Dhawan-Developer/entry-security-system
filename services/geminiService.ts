import { GoogleGenAI } from "@google/genai";
import { TicketRecord } from '../types';

export const generateWelcomeMessage = async (ticket: TicketRecord): Promise<string> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return `Welcome, ${ticket.name}!`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const prompt = `
      You are an energetic AI event host for a school science & tech fair.
      A student has just scanned their ticket to enter.
      
      Student Name: ${ticket.name}
      Class: ${ticket.className}
      
      Generate a very short (max 15 words), exciting, personalized welcome announcement speech for them. 
      Don't use hashtags. Be professional but cool.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // response.text can be undefined, handle safely
    const text = response.text;
    return text ? text.trim() : `Welcome, ${ticket.name}!`;
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Welcome, ${ticket.name}! Enjoy the event.`;
  }
};
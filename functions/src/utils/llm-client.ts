import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const callLLM = async (prompt: string, config?: any): Promise<{ response: string }> => {
  if (!genAI) {
    console.warn('GEMINI_API_KEY is not set. Using stubbed response.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { response: `[Stubbed LLM response for: ${prompt.substring(0, 50)}...]` };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  let attempts = 0;
  while (attempts < 2) {
    try {
      const result = await model.generateContent(prompt);
      return { response: result.response.text() };
    } catch (error) {
      attempts++;
      if (attempts >= 2) throw error;
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempts))); // Exponential backoff
    }
  }
  
  throw new Error('LLM call failed after retries.');
};

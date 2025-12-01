import { getSettings } from '../pages/Settings';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AiResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export const ai = {
  /**
   * Sends a prompt to the Mistral API.
   */
  chat: async (messages: ChatMessage[], jsonMode: boolean = false): Promise<AiResponse> => {
    const settings = getSettings();
    if (!settings.mistralApiKey) {
      return { success: false, error: "Mistral API Key is missing. Please add it in Settings." };
    }

    try {
      // Use Netlify Function proxy to avoid CORS/Network issues
      // We send the API key in the body to the proxy, which then calls Mistral
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: settings.mistralApiKey,
          messages: messages,
          response_format: jsonMode ? { type: "json_object" } : undefined
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
            return { success: false, error: "Invalid API Key. Please check your Mistral Key in Settings." };
        }
        const errData = await response.json();
        return { success: false, error: errData.error?.message || `API Error: ${response.status}` };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        return { success: false, error: "Empty response from AI." };
      }

      return { success: true, data: content };

    } catch (error: any) {
      console.error("AI Request Failed:", error);
      return { success: false, error: error.message || "Network connection failed." };
    }
  }
};


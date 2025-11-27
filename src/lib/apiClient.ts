import { getOpenRouter, isConfigured } from './openRouterClient';
import { generateWithGemini, isGeminiConfigured } from './geminiClient';

export type GenerateRequest = {
  prompt: string;
  model?: string; // e.g. 'openai/gpt-4o' or any supported model alias
  temperature?: number;
  messages?: { role: 'system' | 'user' | 'assistant'; content: string }[]; // optional full history
  stream?: boolean; // future expansion
  provider?: 'gemini' | 'openrouter' | 'auto'; // specify which provider to use
};

export type GenerateResponse = {
  text: string;
  searchQueries?: string[];
  groundingMetadata?: any;
  raw?: any;
};

export const apiClient = {
  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    const provider = req.provider ?? 'auto';
    
    // Auto-select provider: prefer Gemini if configured, fall back to OpenRouter
    const useGemini = provider === 'gemini' || (provider === 'auto' && isGeminiConfigured());
    const useOpenRouter = provider === 'openrouter' || (provider === 'auto' && !isGeminiConfigured() && isConfigured());
    
    // Use Gemini if selected/available
    if (useGemini) {
      if (!isGeminiConfigured()) {
        return { 
          text: `Gemini not configured. Please set VITE_GEMINI_API_KEY environment variable.`,
          searchQueries: []
        };
      }
      
      // Convert messages to a single prompt if provided
      let prompt = req.prompt;
      console.log("Using prompt: ", prompt);
      // Commenting out as I try implementing Gemini
      // if (req.messages?.length) {
      //   prompt = req.messages
      //     .map(msg => `${msg.role}: ${msg.content}`)
      //     .join('\n\n');
      // }
      
      return await generateWithGemini({
        prompt,
        temperature: req.temperature ?? 0.7,
        modelName: req.model ?? 'gemini-2.5-flash'
      });
    }
    
    // [DEPRECATED] Use OpenRouter if selected/available
    // if (useOpenRouter) {
    //   if (!isConfigured()) {
    //     return { 
    //       text: `OpenRouter not configured. Please set VITE_OPENROUTER_API_KEY environment variable.`,
    //       searchQueries: []
    //     };
    //   }

    //   const client = getOpenRouter();
    //   // Build messages array; if user supplied full context use it, otherwise just current prompt.
    //   const messages = req.messages?.length
    //     ? req.messages
    //     : [
    //         {
    //           role: 'user' as const,
    //           content: req.prompt
    //         }
    //       ];

    //   const completion = await client.chat.send({
    //     model: req.model ?? 'openai/gpt-4o',
    //     messages,
    //     stream: false,
    //     temperature: req.temperature ?? 0.2
    //   } as any); // SDK types may evolve; keep flexible.

    //   const choice = completion?.choices?.[0];
    //   let content: string = '(empty response)';
    //   const messageContent = choice?.message?.content;
    //   if (typeof messageContent === 'string') {
    //     content = messageContent;
    //   } else if (Array.isArray(messageContent)) {
    //     // Concatenate any text parts; ignore non-text for now.
    //     content = messageContent
    //       .map((part: any) => (part?.type === 'text' ? part.text : ''))
    //       .filter(Boolean)
    //       .join('\n') || content;
    //   }
    //   return { text: content, raw: completion };
    // }
    
    // No provider configured
    console.log("No provider configued.");
    return { 
      text: `No AI provider configured. Please set VITE_GEMINI_API_KEY or VITE_OPENROUTER_API_KEY.`,
      searchQueries: []
    };
  }
};

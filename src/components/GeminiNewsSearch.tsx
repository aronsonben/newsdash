import React, { useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { isGeminiConfigured } from '../lib/geminiClient';

/**
 * Example component demonstrating Gemini with Google Search grounding
 * for AI news discovery
 */
export default function GeminiNewsSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    text: string;
    searchQueries?: string[];
    error?: boolean;
  } | null>(null);

  const geminiConfigured = isGeminiConfigured();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await apiClient.generate({
        prompt: `Search for recent news and information about: ${query}
        
Please provide:
1. A concise summary of the latest developments
2. Key dates and sources
3. Impact or significance
4. Any relevant context

Format the response in a clear, structured way.`,
        provider: 'gemini', // Force Gemini to use Google Search grounding
        temperature: 0.5 // Lower temperature for more factual responses
      });

      setResult({
        text: response.text,
        searchQueries: response.searchQueries,
        error: response.text.includes('not configured')
      });
    } catch (error) {
      setResult({
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        error: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 max-w-[800px] mx-auto">
      <h2 className="text-xl font-semibold">🔍 Gemini News Search</h2>
      <p className="text-sm text-gray-500">
        Powered by Google Gemini 2.0 Flash with Google Search grounding
      </p>

      {!geminiConfigured && (
        <div className="bg-yellow-100 border border-yellow-400 rounded p-3 mb-4 text-sm text-yellow-900">
          ⚠️ Gemini API key not configured. Set <code>VITE_GEMINI_API_KEY</code> in{' '}
          <code>.env.local</code> to use this feature.
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="e.g., Google Gemini 2.0 launch, latest AI breakthroughs..."
          className="w-full p-3 text-sm border border-[#2a2a2a] rounded bg-[#1a1a1a] text-[#e0e0e0] mb-2"
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className={`px-5 py-2 text-sm rounded font-medium text-white ${loading || !query.trim() ? 'bg-blue-600/60 cursor-not-allowed' : 'bg-blue-600 cursor-pointer'}`}
        >
          {loading ? 'Searching...' : '🔍 Search with Gemini'}
        </button>
      </div>

      {result && (
        <div className={`${result.error ? 'bg-red-100 border-red-300 text-red-900' : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#d0d0d0]'} border rounded p-4`}>
          <h3 className="mt-0 text-base font-semibold">Results:</h3>
          <div className="whitespace-pre-wrap text-sm leading-6">
            {result.text}
          </div>

          {result.searchQueries && result.searchQueries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#2a2a2a] text-xs text-gray-400">
              <strong>Search queries performed:</strong>
              <ul className="mt-2 pl-5 list-disc">
                {result.searchQueries.map((sq, idx) => (
                  <li key={idx}>{sq}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-400">
        <h4 className="text-sm font-medium">Example queries:</h4>
        <ul className="pl-5 list-disc">
          <li>Google Gemini 2.0 Flash announcement</li>
          <li>Latest OpenAI developments November 2025</li>
          <li>Recent AI research breakthroughs</li>
          <li>Anthropic Claude updates</li>
          <li>AI safety news this week</li>
        </ul>
      </div>
    </div>
  );
}

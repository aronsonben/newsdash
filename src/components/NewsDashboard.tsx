import React from 'react';
import ReactMarkdown from 'react-markdown';
import { GenerateResponse } from '../lib/apiClient';

export type NewsItem = {
  source: string;
  date: string;
  update: string;
  impact: string;
  link: string;
  action: string;
};

const dummyItems: NewsItem[] = [
  {
    source: 'OpenAI Research',
    date: '2025-11-24',
    update: 'New alignment technique improves small model safety.',
    impact: 'Likely boosts reliability of edge deployments.',
    link: 'https://example.com/openai-news',
    action: 'Evaluate for roadmap integration.'
  },
  {
    source: 'Google DeepMind',
    date: '2025-11-23',
    update: 'Paper on long-context training efficiency released.',
    impact: 'Lower inference costs for long docs.',
    link: 'https://example.com/deepmind-paper',
    action: 'Prototype longer context summarization.'
  },
  {
    source: 'Hugging Face',
    date: '2025-11-22',
    update: 'New datasets for multi-modal QA announced.',
    impact: 'Faster experimentation for image+text tasks.',
    link: 'https://example.com/hf-blog',
    action: 'Create spike on multi-modal Q&A.'
  }
];

export default function NewsDashboard({ title, data }: { title?: string; data: GenerateResponse | null }) {
  const items: NewsItem[] = React.useMemo(() => {
    if (!data) return [];
    if (!data.groundingMetadata?.groundingChunks) return [];

    return data.groundingMetadata.groundingChunks.map((chunk: any) => {
      const web = chunk.web;
      return {
        source: web?.title ?? 'Unknown Source',
        date: '', 
        update: web?.title ?? 'No title',
        impact: '',
        link: web?.uri ?? '#',
        action: ''
      };
    });
  }, [data]);

  return (
    <section className="mt-4">
      <div className="font-semibold mb-2 text-[#f0f0f0]">
        {title ? `${title} — News Dashboard` : 'News Dashboard'}
      </div>

      {data?.text && (
        <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] text-[#d0d0d0]">
          <ReactMarkdown>{data.text}</ReactMarkdown>
        </div>
      )}

      {items.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-lg italic">Select a prompt to begin.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-[#2a2a2a] bg-[#1a1a1a] border-collapse">
            <thead className="bg-[#141414]">
              <tr>
                <th className="text-left font-semibold text-sm text-[#e0e0e0] p-2 border-b border-[#2a2a2a]">Source</th>
                <th className="text-left font-semibold text-sm text-[#e0e0e0] p-2 border-b border-[#2a2a2a]">Date</th>
                <th className="text-left font-semibold text-sm text-[#e0e0e0] p-2 border-b border-[#2a2a2a]">Update</th>
                <th className="text-left font-semibold text-sm text-[#e0e0e0] p-2 border-b border-[#2a2a2a]">Impact</th>
                <th className="text-left font-semibold text-sm text-[#e0e0e0] p-2 border-b border-[#2a2a2a]">Link</th>
                <th className="text-left font-semibold text-sm text-[#e0e0e0] p-2 border-b border-[#2a2a2a]">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="text-sm text-[#d0d0d0] p-3 border-b border-[#252525]">{item.source}</td>
                  <td className="text-sm text-[#d0d0d0] p-3 border-b border-[#252525]">{item.date}</td>
                  <td className="text-sm text-[#d0d0d0] p-3 border-b border-[#252525]">{item.update}</td>
                  <td className="text-sm text-[#d0d0d0] p-3 border-b border-[#252525]">{item.impact}</td>
                  <td className="text-sm text-[#d0d0d0] p-3 border-b border-[#252525]">
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-sky-400">View</a>
                  </td>
                  <td className="text-sm text-[#d0d0d0] p-3 border-b border-[#252525]">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

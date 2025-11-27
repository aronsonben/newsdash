import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
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

export default function NewsDashboard({ title, data, streamingText, isStreaming, isCached }: { title?: string; data: GenerateResponse | null; streamingText?: string; isStreaming?: boolean; isCached?: boolean }) {
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

  // Custom ReactMarkdown components for better styling
  const markdownComponents: Components = {
    h1: ({ children }) => (
      <h1 className="markdown-content" style={{ color: 'rgb(var(--text-primary))' }}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="markdown-content" style={{ color: 'rgb(var(--text-primary))' }}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="markdown-content" style={{ color: 'rgb(var(--text-primary))' }}>{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="markdown-content" style={{ color: 'rgb(var(--text-secondary))' }}>{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 className="markdown-content" style={{ color: 'rgb(var(--text-secondary))' }}>{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 className="markdown-content" style={{ color: 'rgb(var(--text-muted))' }}>{children}</h6>
    ),
    a: ({ href, children }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: 'rgb(var(--accent))' }}
      >
        {children}
      </a>
    ),
    code: ({ children, className }) => {
      const isInline = !className;
      return (
        <code 
          className={className}
          style={{
            backgroundColor: isInline ? 'rgb(var(--bg-secondary))' : 'transparent',
            color: 'rgb(var(--text-primary))',
            fontSize: isInline ? '0.875rem' : '0.85rem'
          }}
        >
          {children}
        </code>
      );
    },
    blockquote: ({ children }) => (
      <blockquote style={{ 
        borderLeftColor: 'rgb(var(--accent))',
        backgroundColor: 'rgb(var(--bg-secondary) / 0.5)',
        color: 'rgb(var(--text-secondary))'
      }}>
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
        <table style={{ borderColor: 'rgb(var(--border))' }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{ 
        backgroundColor: 'rgb(var(--bg-secondary))',
        color: 'rgb(var(--text-primary))',
        borderColor: 'rgb(var(--border))'
      }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td style={{ 
        color: 'rgb(var(--text-secondary))',
        borderColor: 'rgb(var(--border))'
      }}>
        {children}
      </td>
    )
  };

  return (
    <section 
      className="mt-6 p-6 rounded-xl border"
      style={{
        backgroundColor: 'rgb(var(--dashboard-bg))',
        borderColor: 'rgb(var(--border))'
      }}
    >
      <div 
        className="font-bold mb-4 font-grotesk text-xl flex items-center gap-2"
        style={{ color: 'rgb(var(--text-primary))' }}
      >
        <span 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: 'rgb(var(--dashboard-accent))' }}
        ></span>
        {title ? `${title} — News Dashboard` : 'News Dashboard'}
        {isCached && (
          <span 
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{ 
              backgroundColor: 'rgb(var(--bg-secondary))',
              color: 'rgb(var(--text-muted))'
            }}
            title="This data was loaded from cache"
          >
            CACHED
          </span>
        )}
      </div>

      {(streamingText || data?.text) && (
        <div 
          className="mb-6 p-5 rounded-xl border markdown-content shadow-sm"
          style={{
            backgroundColor: 'rgb(var(--bg-primary))',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--text-secondary))'
          }}
        >
          {isStreaming ? (
            <div className="relative">
              <ReactMarkdown 
                components={markdownComponents}
                skipHtml={false}
                urlTransform={(url) => url}
              >
                {streamingText || ''}
              </ReactMarkdown>
              <span 
                className="inline-block w-2 h-5 ml-1 animate-pulse"
                style={{ backgroundColor: 'rgb(var(--dashboard-accent))' }}
              ></span>
            </div>
          ) : (
            <ReactMarkdown 
              components={markdownComponents}
              skipHtml={false}
              urlTransform={(url) => url}
            >
              {data?.textWithCitations || data?.text || ''}
            </ReactMarkdown>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div 
          className="p-12 text-center text-lg italic font-grotesk rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--bg-primary))',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--text-muted))'
          }}
        >
          Select a prompt to begin.
        </div>
      ) : (
        <div 
          className="overflow-x-auto rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--bg-primary))',
            borderColor: 'rgb(var(--border))'
          }}
        >
          <table className="min-w-full border-collapse">
            <thead 
              style={{
                backgroundColor: 'rgb(var(--bg-secondary))'
              }}
            >
              <tr>
                {['Source', 'Date', 'Update', 'Impact', 'Link', 'Action'].map((header) => (
                  <th 
                    key={header}
                    className="text-left font-semibold text-sm p-4 border-b font-grotesk uppercase tracking-wide"
                    style={{
                      color: 'rgb(var(--dashboard-accent))',
                      borderColor: 'rgb(var(--border))'
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="align-top transition-colors duration-150"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td 
                    className="text-sm p-4 border-b"
                    style={{
                      color: 'rgb(var(--text-secondary))',
                      borderColor: 'rgb(var(--border) / 0.5)'
                    }}
                  >
                    {item.source}
                  </td>
                  <td 
                    className="text-sm p-4 border-b"
                    style={{
                      color: 'rgb(var(--text-secondary))',
                      borderColor: 'rgb(var(--border) / 0.5)'
                    }}
                  >
                    {item.date}
                  </td>
                  <td 
                    className="text-sm p-4 border-b"
                    style={{
                      color: 'rgb(var(--text-secondary))',
                      borderColor: 'rgb(var(--border) / 0.5)'
                    }}
                  >
                    {item.update}
                  </td>
                  <td 
                    className="text-sm p-4 border-b"
                    style={{
                      color: 'rgb(var(--text-secondary))',
                      borderColor: 'rgb(var(--border) / 0.5)'
                    }}
                  >
                    {item.impact}
                  </td>
                  <td 
                    className="text-sm p-4 border-b"
                    style={{
                      color: 'rgb(var(--text-secondary))',
                      borderColor: 'rgb(var(--border) / 0.5)'
                    }}
                  >
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center px-3 py-1 text-sm text-white rounded-md transition-colors duration-200 font-medium"
                      style={{
                        backgroundColor: 'rgb(var(--button-primary))'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))';
                      }}
                    >
                      View
                    </a>
                  </td>
                  <td 
                    className="text-sm p-4 border-b"
                    style={{
                      color: 'rgb(var(--text-secondary))',
                      borderColor: 'rgb(var(--border) / 0.5)'
                    }}
                  >
                    {item.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

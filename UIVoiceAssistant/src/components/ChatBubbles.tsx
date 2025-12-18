// Reformatted Chat Bubble Components

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

// -----------------------------------------------------------------------------
// Component 1: User Text Bubble
// -----------------------------------------------------------------------------
interface UserTextBubbleProps {
  content: string;
  time: string;
}

export function UserTextBubble({ content, time }: UserTextBubbleProps) {
  return (
    <div className="flex items-start justify-end gap-3 w-full">
      <div className="flex-1" />
      <div
        className="px-4 py-3 break-words chat-bubble"
        style={{
          backgroundColor: '#007BFF',
          color: '#FFFFFF',
          borderRadius: '16px 4px 16px 16px',
          maxWidth: '68%',
          minWidth: '120px',
          wordWrap: 'break-word',
        }}
      >
        <div className="prose max-w-full" style={{ whiteSpace: 'pre-wrap' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={{
              ol: ({ node, ...props }) => (
                <ol className="pl-5 my-2" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="pl-5 my-2 list-disc" {...props} />
              ),
              li: ({ node, ...props }) => <li className="my-1" {...props} />,
              p: ({ node, ...props }) => <p className="my-1" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        <p className="text-xs mt-1 opacity-60 text-right">{time}</p>
      </div>

      <div className="flex flex-col items-center gap-1 w-12">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 shadow-sm" />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component 2: AI Static Text Bubble
// -----------------------------------------------------------------------------
interface AITextStaticBubbleProps {
  content: string;
  time: string;
}

export function AITextStaticBubble({ content, time }: AITextStaticBubbleProps) {
  return (
    <div className="flex items-start justify-start gap-3 w-full">
      <div className="flex flex-col items-center gap-1 w-12">
        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
          <span style={{ fontSize: 14 }}>🤖</span>
        </div>
        <span className="text-[11px] text-gray-600">Vist</span>
      </div>

      <div
        className="max-w-[75%] px-4 py-3 chat-bubble"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#1F3B4D',
          borderRadius: '4px 16px 16px 16px',
          boxShadow: '0 2px 15px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="prose max-w-full">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={{
              ol: ({ node, ...props }) => (
                <ol className="pl-5 my-2" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="pl-5 my-2 list-disc" {...props} />
              ),
              li: ({ node, ...props }) => <li className="my-1" {...props} />,
              p: ({ node, ...props }) => <p className="my-1" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        <p className="text-xs mt-1 opacity-60">{time}</p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component 3: AI Streaming Text Bubble (with cursor)
// -----------------------------------------------------------------------------
interface AITextStreamingBubbleProps {
  content: string;
  time: string;
}

export function AITextStreamingBubble({ content, time }: AITextStreamingBubbleProps) {
  return (
    <div className="flex items-start justify-start gap-3 w-full">
      <div className="flex flex-col items-center gap-1 w-12">
        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
          <span style={{ fontSize: 14 }}>🤖</span>
        </div>
      </div>

      <div
        className="max-w-[75%] px-4 py-3 chat-bubble"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#1F3B4D',
          borderRadius: '4px 16px 16px 16px',
          boxShadow: '0 2px 15px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={{
              ol: ({ node, ...props }) => (
                <ol className="pl-5 my-2" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="pl-5 my-2 list-disc" {...props} />
              ),
              li: ({ node, ...props }) => <li className="my-1" {...props} />,
              p: ({ node, ...props }) => <p className="my-1" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
          <motion.span
            className="inline-block w-[1.5px] h-[18px] ml-1 align-middle"
            style={{ backgroundColor: '#1F3B4D' }}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <p className="text-xs mt-1 opacity-60">{time}</p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component 4: AI Image Loading Bubble
// -----------------------------------------------------------------------------
interface AIImageLoadingBubbleProps {
  time: string;
}

export function AIImageLoadingBubble({ time }: AIImageLoadingBubbleProps) {
  return (
    <div className="flex items-start justify-start gap-3 w-full">
      <div className="flex flex-col items-center gap-1 w-12">
        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
          <span style={{ fontSize: 14 }}>🤖</span>
        </div>
      </div>

      <div
        className="w-[250px] h-[250px] relative flex flex-col items-center justify-center gap-3"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 6px 20px rgba(16,24,40,0.06)',
        }}
      >
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          aria-hidden
        >
          <Loader2 size={48} style={{ color: '#007BFF' }} />
        </motion.div>

        <p className="text-sm text-gray-700 opacity-80">Đang vẽ...</p>

        <p
          className="text-xs absolute bottom-3 right-3 opacity-60"
          style={{ color: '#1F3B4D' }}
        >
          {time}
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component 4.1: AI Analyzing Image Bubble
// -----------------------------------------------------------------------------
interface AIAnalyzingImageBubbleProps {
  time: string;
}

export function AIAnalyzingImageBubble({ time }: AIAnalyzingImageBubbleProps) {
  return (
    <div className="flex items-start justify-start gap-3 w-full">
      <div className="flex flex-col items-center gap-1 w-12">
        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
          <span style={{ fontSize: 14 }}>🤖</span>
        </div>
      </div>

      <AnalyzingCard time={time} label="Đã nhận. Tôi đang phân tích hình ảnh của bạn..." />
    </div>
  );
}

// Shared analyzing card used for both image generation and image analysis flows.
function AnalyzingCard({ time, label }: { time: string; label: string }) {
  return (
    <div className="w-[250px] h-[250px] flex items-center justify-center relative">
      <div
        className="w-full h-full bg-white rounded-2xl flex flex-col items-center justify-center px-4"
        style={{ boxShadow: '0 6px 24px rgba(16,24,40,0.08)', borderRadius: 12 }}
      >
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-center"
        >
          <p className="text-sm text-gray-700" style={{ lineHeight: 1.4 }}>{label}</p>
        </motion.div>
      </div>

      <p className="text-xs absolute bottom-3 right-3 opacity-60" style={{ color: '#1F3B4D' }}>{time}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component 5: AI Image Result Bubble
// -----------------------------------------------------------------------------
interface AIImageResultBubbleProps {
  imageUrl: string;
  time: string;
  content?: string;
}

export function AIImageResultBubble({ imageUrl, time }: AIImageResultBubbleProps) {
  return (
    <div className="flex items-start justify-start gap-3 w-full">
      <div className="flex flex-col items-center gap-1 w-12">
        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm">
          <span style={{ fontSize: 14 }}>🤖</span>
        </div>
      </div>

      <div className="relative">
        <div
          className="w-[250px] h-[250px] overflow-hidden relative"
          style={{
            borderRadius: '4px 16px 16px 16px',
            boxShadow: '0 2px 15px rgba(0, 0, 0, 0.08)',
          }}
        >
          <img
            src={imageUrl}
            alt="AI Generated"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-image.png';  // Fallback nếu lỗi load
            }}
          />
        </div>

        <div
          className="absolute bottom-2 right-2 px-2 py-1 rounded-lg backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <p className="text-xs" style={{ color: '#FFFFFF' }}>
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component 6: User Image With Text Bubble
// -----------------------------------------------------------------------------
interface UserImageWithTextBubbleProps {
  imageUrl: string;
  content: string;
  time: string;
}

export function UserImageWithTextBubble({ imageUrl, content, time }: UserImageWithTextBubbleProps) {
  return (
    <div className="flex items-start justify-end gap-3 w-full">
      <div className="flex-1" />

      <div
        className="max-w-[75%] overflow-hidden"
        style={{
          backgroundColor: '#007BFF',
          borderRadius: '16px 4px 16px 16px',
        }}
      >
        <div
          className="w-full h-[200px] overflow-hidden"
          style={{ borderRadius: '16px 4px 0 0' }}
        >
          <img
            src={imageUrl}
            alt="User uploaded"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="px-4 py-3 chat-bubble">
          <div style={{ color: '#FFFFFF' }}>{parseTextToElements(content)}</div>
          <p className="text-xs mt-1 opacity-60" style={{ color: '#FFFFFF' }}>
            {time}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 w-12">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 shadow-sm" />
      </div>
    </div>
  );
}

// Simple parser: turns plain text with newlines and basic list markers into React elements
function parseTextToElements(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];

  let i = 0;
  let keyCounter = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      // blank line -> paragraph spacer
      elements.push(<div key={keyCounter++} style={{ height: 8 }} />);
      i++;
      continue;
    }

    // Ordered list detection: lines starting with '1.' or '1)'
    const olMatch = line.match(/^\d+[\.)]\s+(.*)/);
    if (olMatch) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^(\d+)[\.)]\s+(.*)/);
        if (!m) break;
        items.push(<li key={keyCounter++}>{m[2]}</li>);
        i++;
      }
      elements.push(
        <ol key={keyCounter++} className="pl-5 list-decimal my-2">
          {items}
        </ol>
      );
      continue;
    }

    // Unordered list detection: lines starting with '-', '•', '*'
    const ulMatch = line.match(/^[-•*]\s+(.*)/);
    if (ulMatch) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-•*]\s+(.*)/);
        if (!m) break;
        items.push(<li key={keyCounter++}>{m[1]}</li>);
        i++;
      }
      elements.push(
        <ul key={keyCounter++} className="pl-5 list-disc my-2">
          {items}
        </ul>
      );
      continue;
    }

    // Otherwise treat as paragraph — join consecutive non-list lines into a paragraph
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && !lines[i].trim().match(/^(\d+[\.)]|[-•*]\s+)/) && lines[i].trim() !== '') {
      paraLines.push(lines[i]);
      i++;
    }

    const paraText = paraLines.join('\n');
    elements.push(
      <p key={keyCounter++} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {paraText}
      </p>
    );
  }

  return <>{elements}</>;
}

// Preprocess markdown-like text to convert special list markers (a), a., a), (1), etc.
// into HTML <ol> blocks with appropriate list-style (so react-markdown + rehype-raw
// can render them). This keeps common Markdown lists unchanged and converts
// lettered/parenthesis markers to HTML lists with CSS styles.
function preprocessMarkdown(raw: string | undefined): string {
  if (!raw) return '';

  const lines = raw.split(/\r?\n/);
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // detect lettered list start: a) or a. or (a)
    const letterMatch = trimmed.match(/^([a-zA-Z])[\.)]\s+(.*)/);
    const parenLetterMatch = trimmed.match(/^\(([a-zA-Z])\)\s+(.*)/);
    const parenNumMatch = trimmed.match(/^\((\d+)\)\s+(.*)/);

    if (letterMatch || parenLetterMatch) {
      // gather contiguous lettered items
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^([a-zA-Z])[\.)]\s+(.*)/) || lines[i].trim().match(/^\(([a-zA-Z])\)\s+(.*)/);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      // produce HTML ol with lower-alpha style
      out.push('<ol style="list-style-type: lower-alpha; margin-left: 1rem;">');
      for (const it of items) {
        out.push(`<li>${escapeHtml(it)}</li>`);
      }
      out.push('</ol>');
      continue;
    }

    if (parenNumMatch) {
      // gather contiguous (1) (2) ... items
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\((\d+)\)\s+(.*)/);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      out.push('<ol style="margin-left: 1rem;">');
      for (const it of items) {
        out.push(`<li>${escapeHtml(it)}</li>`);
      }
      out.push('</ol>');
      continue;
    }

    // Heuristic: detect a header that announces a list (ends with ':' or contains 'bao gồm' / 'gồm')
    const headerListMatch = /:\s*$/.test(trimmed) || /\b(bao gồm|gồm)\b/i.test(trimmed);
    if (headerListMatch) {
      // keep header line itself
      out.push(escapeHtml(line));
      i++;

      // collect following consecutive non-empty short lines as list items
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next) break; // stop at blank line
        // skip if next already looks like a marked list
        if (/^(\d+[\.)]|[-•*]|\([0-9a-zA-Z]+\)|[a-zA-Z][\.)]\s+)/.test(next)) break;
        const wordCount = next.split(/\s+/).filter(Boolean).length;
        // treat short lines (<=12 words) as list items; longer lines likely a paragraph
        if (wordCount > 12) break;
        items.push(next);
        i++;
      }

      if (items.length > 0) {
        out.push('<ul style="margin-left: 1rem;">');
        for (const it of items) out.push(`<li>${escapeHtml(it)}</li>`);
        out.push('</ul>');
      }
      continue;
    }

    // default: keep line as-is
    // If the line already looks like a Markdown list marker (e.g. "1.", "-", "*"),
    // don't escape it — let react-markdown parse it so markers (numbers/bullets)
    // render correctly. Otherwise escape to avoid accidental HTML injection.
    const markdownListRegex = /^\s*([*\-+]|\d+[\.)])\s+/;
    if (markdownListRegex.test(trimmed)) {
      // Ensure there's a blank line before a markdown list so commonmark
      // parsers recognize it when the previous line is a paragraph.
      if (out.length > 0 && out[out.length - 1] !== '') {
        out.push('');
      }
      out.push(line);
    } else {
      out.push(escapeHtml(line));
    }
    i++;
  }

  // join with newlines so markdown renderer sees original paragraph breaks
  return out.join('\n');
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

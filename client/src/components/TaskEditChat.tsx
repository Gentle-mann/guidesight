import { useState, useRef, useEffect } from 'react';
import type { TaskDetail } from '../types';

const TOKEN_SERVER = import.meta.env.VITE_TOKEN_SERVER || 'https://innocent-melbourne-forty-petroleum.trycloudflare.com';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  files?: string[];
}

interface Props {
  task: TaskDetail;
  onTaskUpdated: (task: TaskDetail) => void;
  mode: 'inline' | 'floating';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ChatBody({
  messages,
  loading,
  input,
  setInput,
  files,
  onAddFiles,
  onRemoveFile,
  send,
  inputRef,
  messagesEndRef,
}: {
  messages: ChatMessage[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  files: File[];
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (idx: number) => void;
  send: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const canSend = input.trim() || files.length > 0;

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-[var(--text-secondary)]">
              Describe changes or upload reference files.
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                'Add a safety check step at the beginning',
                'Change difficulty to advanced',
                'Add more common errors to step 2',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="block w-full text-left text-xs bg-[var(--bg-card)] hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg px-3 py-2 transition-colors"
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-[var(--accent)] text-white'
                  : m.text.startsWith('Error:')
                    ? 'bg-[var(--error)]/20 text-[var(--error)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-primary)]'
              }`}
            >
              {m.files && m.files.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {m.files.map((name, fi) => (
                    <span key={fi} className="inline-flex items-center gap-1 bg-white/20 rounded px-1.5 py-0.5 text-xs">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                      {name}
                    </span>
                  ))}
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-card)] rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)]">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File attachments preview */}
      {files.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 bg-[var(--bg-card)] rounded-lg px-2 py-1 text-xs"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--accent)] shrink-0">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
              </svg>
              <span className="truncate max-w-[120px]">{f.name}</span>
              <span className="text-[var(--text-secondary)]">{formatFileSize(f.size)}</span>
              <button
                onClick={() => onRemoveFile(i)}
                className="text-[var(--text-secondary)] hover:text-[var(--error)] ml-0.5"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 border-t border-[var(--bg-card)]">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.txt"
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) onAddFiles(e.target.files); e.target.value = ''; }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-2 py-2 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors disabled:opacity-40"
            title="Attach files"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe changes or attach files..."
            disabled={loading}
            className="flex-1 px-3 py-2 bg-[var(--bg-primary)] rounded-lg text-sm disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!canSend || loading}
            className="px-3 py-2 bg-[var(--accent)] rounded-lg text-white text-sm disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

export function TaskEditChat({ task, onTaskUpdated, mode }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && mode === 'floating') inputRef.current?.focus();
  }, [open, mode]);

  const addFiles = (fileList: FileList) => {
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    const msg = input.trim();
    if ((!msg && files.length === 0) || loading) return;

    const currentFiles = files;
    const fileNames = currentFiles.map((f) => f.name);
    setInput('');
    setFiles([]);
    setMessages((prev) => [...prev, { role: 'user', text: msg || `Uploaded ${fileNames.length} file(s)`, files: fileNames.length > 0 ? fileNames : undefined }]);
    setLoading(true);

    try {
      const { step_count: _, ...taskPayload } = task as any;

      const formData = new FormData();
      formData.append('task', JSON.stringify(taskPayload));
      formData.append('message', msg);
      currentFiles.forEach((f) => formData.append('files', f));

      const res = await fetch(`${TOKEN_SERVER}/edit-task-chat`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      const updatedTask: TaskDetail = {
        ...data.task,
        step_count: data.task.steps.length,
      };

      setMessages((prev) => [...prev, { role: 'ai', text: data.summary }]);
      onTaskUpdated(updatedTask);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'ai', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const chatBodyProps = {
    messages,
    loading,
    input,
    setInput,
    files,
    onAddFiles: addFiles,
    onRemoveFile: removeFile,
    send,
    inputRef,
    messagesEndRef,
  };

  // --- Inline mode: always-visible side panel ---
  if (mode === 'inline') {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--bg-card)] flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--bg-card)]">
          <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium">AI Task Editor</span>
        </div>
        <ChatBody {...chatBodyProps} />
      </div>
    );
  }

  // --- Floating mode: bubble + popup ---
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-lg hover:bg-[#5b54e6] transition-colors z-50"
        title="Edit with AI"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--bg-card)] flex flex-col z-50" style={{ maxHeight: '480px' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-card)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium">AI Task Editor</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg leading-none"
        >
          x
        </button>
      </div>
      <ChatBody {...chatBodyProps} />
    </div>
  );
}

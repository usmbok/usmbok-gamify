import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Heading1,
  Heading2,
  Type,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  showHtmlToggle?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  minHeight = 200,
  showHtmlToggle = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value);
  const isUpdating = useRef(false);

  useEffect(() => {
    if (!isHtmlMode && editorRef.current && !isUpdating.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isHtmlMode]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isUpdating.current = true;
    onChange(editorRef.current.innerHTML);
    isUpdating.current = false;
  }, [onChange]);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const toggleHtml = () => {
    if (!isHtmlMode) {
      setHtmlValue(value);
      setIsHtmlMode(true);
    } else {
      onChange(htmlValue);
      setIsHtmlMode(false);
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = htmlValue;
      }, 0);
    }
  };

  const ToolBtn = ({
    onClick,
    title,
    active,
    children,
  }: {
    onClick: () => void;
    title: string;
    active?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-border bg-secondary/40">
        <ToolBtn onClick={() => exec('formatBlock', 'h1')} title="Heading 1"><Heading1 className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'h2')} title="Heading 2"><Heading2 className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'p')} title="Paragraph"><Type className="w-3.5 h-3.5" /></ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn onClick={() => exec('bold')} title="Bold"><Bold className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="Italic"><Italic className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="Underline"><Underline className="w-3.5 h-3.5" /></ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn onClick={() => exec('insertUnorderedList')} title="Bullet List"><List className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyRight')} title="Align Right"><AlignRight className="w-3.5 h-3.5" /></ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn onClick={insertLink} title="Insert Link"><Link className="w-3.5 h-3.5" /></ToolBtn>
        {showHtmlToggle && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <ToolBtn onClick={toggleHtml} title="Toggle HTML" active={isHtmlMode}>
              <Code className="w-3.5 h-3.5" />
            </ToolBtn>
          </>
        )}
      </div>

      {/* Editor area */}
      {isHtmlMode ? (
        <textarea
          value={htmlValue}
          onChange={e => { setHtmlValue(e.target.value); onChange(e.target.value); }}
          className="w-full px-3 py-2 text-sm font-mono bg-slate-950 text-green-400 focus:outline-none resize-none"
          style={{ minHeight }}
          placeholder="<p>Enter HTML...</p>"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          suppressContentEditableWarning
          className="px-3 py-2 text-sm focus:outline-none prose prose-sm dark:prose-invert max-w-none"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      )}

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 1.4em; font-weight: 700; margin: 8px 0 4px; }
        [contenteditable] h2 { font-size: 1.15em; font-weight: 600; margin: 8px 0 4px; }
        [contenteditable] ul { list-style: disc; padding-left: 20px; margin: 4px 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 20px; margin: 4px 0; }
        [contenteditable] a { color: hsl(var(--primary)); text-decoration: underline; }
        [contenteditable] p { margin: 4px 0; }
      `}</style>
    </div>
  );
}

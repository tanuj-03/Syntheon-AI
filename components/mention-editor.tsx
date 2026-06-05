'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, Mark } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Code,
  Heading1,
  Heading2,
  Undo,
  Redo,
  AtSign,
  Hash,
} from 'lucide-react';

export interface MentionPerson {
  userId: string;
  displayName: string;
  imageUrl?: string;
}

export interface MentionTicket {
  id: string;
  title: string;
  status: string;
}

interface MentionEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  members?: MentionPerson[];
  tickets?: MentionTicket[];
}

// ─── Mark: @person (green pill) ─────────────────────────────────────────────
const PersonMention = Mark.create({
  name: 'personMention',
  addAttributes() {
    return {
      userId: { default: null },
      label: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-mention-person]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        'data-mention-person': HTMLAttributes.userId,
        class:
          'inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-medium mx-0.5 select-none',
      },
      0,
    ];
  },
  addKeyboardShortcuts() {
    return {};
  },
});

// ─── Mark: #ticket (purple pill) ────────────────────────────────────────────
const TicketMention = Mark.create({
  name: 'ticketMention',
  addAttributes() {
    return {
      ticketId: { default: null },
      label: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-mention-ticket]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        'data-mention-ticket': HTMLAttributes.ticketId,
        class:
          'inline-flex items-center gap-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 text-xs font-medium mx-0.5 select-none',
      },
      0,
    ];
  },
  addKeyboardShortcuts() {
    return {};
  },
});

type MentionType = '@' | '#' | null;

export function MentionEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  disabled = false,
  members = [],
  tickets = [],
}: MentionEditorProps) {
  const [mentionType, setMentionType] = useState<MentionType>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const triggerPosRef = useRef<number | null>(null); // ProseMirror doc position of trigger char
  const isInsertingRef = useRef(false); // guard against re-entrant trigger detection

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } },
      }),
      Placeholder.configure({ placeholder }),
      PersonMention,
      TicketMention,
    ],
    content,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  // ── Detect @ / # triggers on keyup ──────────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      if (isInsertingRef.current) return;
      const { state } = editor;
      const { from } = state.selection;
      const text = state.doc.textBetween(0, from, '\n');

      // Walk backwards to find last unescaped @ or #
      let triggerIdx = -1;
      let type: MentionType = null;
      for (let i = text.length - 1; i >= 0; i--) {
        if (text[i] === '@') {
          triggerIdx = i;
          type = '@';
          break;
        }
        if (text[i] === '#') {
          triggerIdx = i;
          type = '#';
          break;
        }
        if (text[i] === ' ' || text[i] === '\n') break;
      }

      if (type && triggerIdx >= 0) {
        const query = text.slice(triggerIdx + 1);
        // Only show if query has no spaces (mid-word typing)
        if (!query.includes(' ') && !query.includes('\n')) {
          setMentionType(type);
          setMentionQuery(query);
          setSelectedIndex(0);
          // Store the ProseMirror position of the trigger char
          // from = cursor pos, subtract query chars to get back to trigger char position
          triggerPosRef.current = from - query.length - 1;

          // Position popup near cursor
          const domSel = window.getSelection();
          if (domSel && domSel.rangeCount > 0) {
            const range = domSel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const wrapRect = editorWrapRef.current?.getBoundingClientRect();
            if (wrapRect) {
              setMentionPos({
                top: rect.bottom - wrapRect.top + 4,
                left: Math.min(rect.left - wrapRect.left, wrapRect.width - 240),
              });
            }
          }
          return;
        }
      }

      // Close if no valid trigger found
      setMentionType(null);
      triggerPosRef.current = null;
    };

    editor.on('update', handler);
    editor.on('selectionUpdate', handler);
    return () => {
      editor.off('update', handler);
      editor.off('selectionUpdate', handler);
    };
  }, [editor]);

  // ── Filtered suggestion lists ────────────────────────────────────────────
  const filteredMembers = members
    .filter((m) => m.displayName.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 6);

  const filteredTickets = tickets
    .filter((t) => t.title.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 6);

  const suggestions = mentionType === '@' ? filteredMembers : filteredTickets;

  // ── Insert mention pill ──────────────────────────────────────────────────
  const insertMention = useCallback(
    (item: MentionPerson | MentionTicket) => {
      if (!editor || triggerPosRef.current === null) return;

      const triggerPos = triggerPosRef.current;
      const { from } = editor.state.selection;

      let label: string;
      let markType: string;
      let attrs: Record<string, string>;

      if (mentionType === '@') {
        const person = item as MentionPerson;
        label = `@${person.displayName}`;
        markType = 'personMention';
        attrs = { userId: person.userId || '', label: person.displayName };
      } else {
        const ticket = item as MentionTicket;
        label = `#${ticket.title}`;
        markType = 'ticketMention';
        attrs = { ticketId: ticket.id, label: ticket.title };
      }

      // Guard: clear all trigger state BEFORE dispatching to prevent re-entry
      isInsertingRef.current = true;
      triggerPosRef.current = null;
      setMentionType(null);
      setMentionQuery('');

      // Single atomic ProseMirror transaction: delete trigger+query, insert pill+space
      editor.view.dispatch(
        editor.state.tr
          .delete(triggerPos, from)
          .insertText(label + ' ', triggerPos)
          .addMark(
            triggerPos,
            triggerPos + label.length,
            editor.schema.marks[markType].create(attrs)
          )
          .removeStoredMark(editor.schema.marks[markType])
      );

      editor.commands.focus();
      // Allow a tick before re-enabling trigger detection
      setTimeout(() => {
        isInsertingRef.current = false;
      }, 50);
    },
    [editor, mentionType]
  );

  // ── Keyboard navigation in popup ─────────────────────────────────────────
  useEffect(() => {
    if (!mentionType) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && suggestions[selectedIndex]) {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setMentionType(null);
        triggerPosRef.current = null;
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [mentionType, suggestions, selectedIndex, insertMention]);

  if (!editor) {
    return (
      <div className="min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    active = false,
    icon: Icon,
    title,
    disabled: btnDisabled = false,
  }: {
    onClick: () => void;
    active?: boolean;
    icon: React.ElementType;
    title: string;
    disabled?: boolean;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`h-8 w-8 p-0 ${active ? 'bg-accent text-accent-foreground' : ''}`}
      title={title}
      disabled={btnDisabled || disabled}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div ref={editorWrapRef} className="relative rounded-md border border-input bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-input px-2 py-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          icon={Bold}
          title="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          icon={Italic}
          title="Italic"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          icon={UnderlineIcon}
          title="Underline"
        />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          icon={Heading1}
          title="Heading 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          icon={Heading2}
          title="Heading 2"
        />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          icon={List}
          title="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          icon={ListOrdered}
          title="Numbered List"
        />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          icon={Quote}
          title="Quote"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          icon={Code}
          title="Inline Code"
        />
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          icon={LinkIcon}
          title="Link"
        />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          icon={Undo}
          title="Undo"
          disabled={!editor.can().chain().focus().undo().run() || disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          icon={Redo}
          title="Redo"
          disabled={!editor.can().chain().focus().redo().run() || disabled}
        />
      </div>

      {/* Editor body */}
      <EditorContent
        editor={editor}
        className="px-3 py-2 [&_.ProseMirror]:min-h-[150px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:relative [&_.ProseMirror_p.is-editor-empty:first-child]:relative [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:absolute [&_.ProseMirror_p.is-editor-empty:first-child::before]:left-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:top-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_a]:text-primary [&_a]:underline"
      />

      {/* Hint strip */}
      <div className="flex items-center gap-2 border-t border-input px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground">Type</span>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-medium select-none">
          <AtSign className="h-3 w-3" /> person
        </span>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-medium select-none">
          <Hash className="h-3 w-3" /> ticket
        </span>
        <span className="text-[10px] text-muted-foreground">to mention</span>
      </div>

      {/* Mention popup */}
      {mentionType && mentionPos && suggestions.length > 0 && (
        <div
          className="absolute z-50 min-w-[200px] max-w-[280px] rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
          style={{ top: mentionPos.top, left: Math.max(0, mentionPos.left) }}
        >
          <div className="px-3 py-1.5 border-b border-border/60 flex items-center gap-1.5">
            {mentionType === '@' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                <AtSign className="h-3 w-3" /> Mention person
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700">
                <Hash className="h-3 w-3" /> Link ticket
              </span>
            )}
          </div>
          <div className="py-1 max-h-48 overflow-y-auto">
            {mentionType === '@'
              ? (filteredMembers as MentionPerson[]).map((m, i) => (
                  <button
                    key={m.userId}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(m);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                      i === selectedIndex
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    {m.imageUrl ? (
                      <img
                        src={m.imageUrl}
                        alt={m.displayName}
                        className="h-5 w-5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-green-200 text-green-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {m.displayName[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{m.displayName}</span>
                  </button>
                ))
              : (filteredTickets as MentionTicket[]).map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(t);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                      i === selectedIndex
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                    <span className="truncate">{t.title}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground capitalize shrink-0">
                      {t.status.replace('_', ' ')}
                    </span>
                  </button>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}

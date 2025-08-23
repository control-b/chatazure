"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Download,
  Share,
  Users,
  FileText,
  Edit3,
  Eye,
  MoreVertical,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
} from "lucide-react";

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

interface DocumentEditorProps {
  documentId: string;
  title: string;
  content: string;
  isEditable: boolean;
  collaborators: Collaborator[];
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onShare: () => void;
  onDownload: () => void;
  className?: string;
}

export function DocumentEditor({
  documentId,
  title,
  content,
  isEditable,
  collaborators,
  onContentChange,
  onTitleChange,
  onSave,
  onShare,
  onDownload,
  className,
}: DocumentEditorProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [localContent, setLocalContent] = useState(content);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent);
    setHasUnsavedChanges(true);
    onContentChange(newContent);
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    onTitleChange(localTitle);
    setHasUnsavedChanges(true);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      setLocalTitle(title);
      setIsEditingTitle(false);
    }
  };

  const handleSave = async () => {
    await onSave();
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const applyFormatting = (command: string, value?: string) => {
    if (!editorRef.current) return;

    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = localContent.substring(start, end);

    let newText = "";
    let newSelectionStart = start;
    let newSelectionEnd = end;

    switch (command) {
      case "bold":
        newText = `**${selectedText}**`;
        newSelectionStart = start + 2;
        newSelectionEnd = end + 2;
        break;
      case "italic":
        newText = `*${selectedText}*`;
        newSelectionStart = start + 1;
        newSelectionEnd = end + 1;
        break;
      case "underline":
        newText = `<u>${selectedText}</u>`;
        newSelectionStart = start + 3;
        newSelectionEnd = end + 3;
        break;
      default:
        return;
    }

    const newContent =
      localContent.substring(0, start) + newText + localContent.substring(end);
    handleContentChange(newContent);

    // Restore selection
    setTimeout(() => {
      textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
      textarea.focus();
    }, 0);
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />

          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyPress}
              className="text-lg font-semibold text-slate-900 bg-transparent border-none outline-none flex-1 min-w-0"
              autoFocus
            />
          ) : (
            <h1
              className="text-lg font-semibold text-slate-900 cursor-pointer hover:text-slate-700 flex-1 min-w-0 truncate"
              onClick={() => isEditable && setIsEditingTitle(true)}
            >
              {localTitle}
            </h1>
          )}

          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-xs">
              Unsaved
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Collaborators */}
          {collaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                    style={{ backgroundColor: collaborator.color }}
                    title={collaborator.name}
                  >
                    {collaborator.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {collaborators.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
              <Users className="h-4 w-4 text-slate-400 ml-1" />
            </div>
          )}

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onShare}>
              <Share className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {isEditable && (
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting("bold")}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting("italic")}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting("underline")}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button variant="ghost" size="sm" title="Align Left">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Align Center">
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Align Right">
            <AlignRight className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button variant="ghost" size="sm" title="Bullet List">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Numbered List">
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button variant="ghost" size="sm" title="Undo">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Redo">
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 relative">
        <textarea
          ref={editorRef}
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={
            isEditable
              ? "Start writing your document..."
              : "This document is read-only"
          }
          readOnly={!isEditable}
          className={cn(
            "w-full h-full p-6 text-sm leading-relaxed resize-none outline-none",
            "font-mono", // Using mono font for simplicity
            !isEditable && "bg-slate-50 cursor-default"
          )}
        />

        {/* Collaboration cursors would be rendered here in a real implementation */}
        {collaborators.map(
          (collaborator) =>
            collaborator.cursor && (
              <div
                key={`cursor-${collaborator.id}`}
                className="absolute w-0.5 h-5 pointer-events-none"
                style={{
                  backgroundColor: collaborator.color,
                  // Position would be calculated based on cursor.line and cursor.column
                  top: `${collaborator.cursor.line * 1.5}rem`,
                  left: `${collaborator.cursor.column * 0.6}rem`,
                }}
              >
                <div
                  className="absolute -top-5 -left-2 px-2 py-1 text-xs text-white rounded whitespace-nowrap"
                  style={{ backgroundColor: collaborator.color }}
                >
                  {collaborator.name}
                </div>
              </div>
            )
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>Last saved: {formatDateTime(lastSaved)}</span>
          <span>Document ID: {documentId}</span>
        </div>

        <div className="flex items-center gap-4">
          <span>{localContent.length} characters</span>
          <span>{localContent.split("\n").length} lines</span>
          {!isEditable && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>Read-only</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

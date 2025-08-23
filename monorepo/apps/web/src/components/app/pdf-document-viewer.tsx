"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Share,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Edit,
  Trash2,
  Save,
  Plus,
  Hand,
  MousePointer,
} from "lucide-react";
import type { SignatureField, DocumentSigner } from "@/types/index";

interface PdfDocumentViewerProps {
  documentId: string;
  title: string;
  pdfUrl: string;
  fields: SignatureField[];
  signers: DocumentSigner[];
  canEdit: boolean;
  onFieldAdd: (field: Omit<SignatureField, 'id'>) => void;
  onFieldUpdate: (fieldId: string, updates: Partial<SignatureField>) => void;
  onFieldDelete: (fieldId: string) => void;
  onRequestSignature: (signerId: string) => void;
  className?: string;
}

type Tool = 'select' | 'signature' | 'initial' | 'date' | 'text' | 'checkbox';

export function PdfDocumentViewer({
  documentId,
  title,
  pdfUrl,
  fields,
  signers,
  canEdit,
  onFieldAdd,
  onFieldUpdate,
  onFieldDelete,
  onRequestSignature,
  className,
}: PdfDocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);

  // In a real implementation, you'd load PDF.js here
  // For now, we'll simulate with a placeholder
  useEffect(() => {
    // Simulate PDF loading
    setTotalPages(3); // Mock 3 pages
  }, [pdfUrl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === 'select') return;
    
    const rect = pdfViewerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || selectedTool === 'select') return;

    const rect = pdfViewerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    const width = Math.abs(x - dragStart.x);
    const height = Math.abs(y - dragStart.y);
    
    // Only create field if dragged area is significant
    if (width > 20 && height > 10) {
      const newField: Omit<SignatureField, 'id'> = {
        type: selectedTool as any,
        page: currentPage,
        x: Math.min(dragStart.x, x),
        y: Math.min(dragStart.y, y),
        width,
        height,
        required: true,
        placeholder: getFieldPlaceholder(selectedTool),
      };
      
      onFieldAdd(newField);
    }
    
    setIsDragging(false);
    setSelectedTool('select');
  };

  const getFieldPlaceholder = (tool: Tool): string => {
    switch (tool) {
      case 'signature': return 'Driver Signature';
      case 'initial': return 'Driver Initials';
      case 'date': return 'Date';
      case 'text': return 'Enter text';
      case 'checkbox': return '';
      default: return '';
    }
  };

  const handleFieldClick = (fieldId: string) => {
    if (selectedTool === 'select') {
      setSelectedField(selectedField === fieldId ? null : fieldId);
    }
  };

  const getSignerColor = (assigneeUserId?: string): string => {
    if (!assigneeUserId) return '#94a3b8'; // slate-400
    const signer = signers.find(s => s.userId === assigneeUserId);
    if (!signer) return '#94a3b8';
    
    // Generate color based on signer ID for consistency
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const index = parseInt(signer.id.slice(-1), 16) % colors.length;
    return colors[index];
  };

  const renderField = (field: SignatureField) => {
    if (field.page !== currentPage) return null;

    const isSelected = selectedField === field.id;
    const signerColor = getSignerColor(field.assigneeUserId);
    
    return (
      <div
        key={field.id}
        className={cn(
          "absolute border-2 cursor-pointer flex items-center justify-center text-xs font-medium transition-all",
          isSelected 
            ? "border-blue-500 bg-blue-100" 
            : "border-dashed hover:bg-slate-50",
          field.type === 'checkbox' && "rounded"
        )}
        style={{
          left: field.x * zoom,
          top: field.y * zoom,
          width: field.width * zoom,
          height: field.height * zoom,
          borderColor: signerColor,
          backgroundColor: isSelected ? '#dbeafe' : `${signerColor}20`,
        }}
        onClick={() => handleFieldClick(field.id)}
      >
        {field.type === 'signature' && '✍️'}
        {field.type === 'initial' && 'Init'}
        {field.type === 'date' && '📅'}
        {field.type === 'text' && 'Text'}
        {field.type === 'checkbox' && '☐'}
        
        {isSelected && canEdit && (
          <div className="absolute -top-8 left-0 flex gap-1 bg-white border rounded shadow-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onFieldDelete(field.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-slate-600" />
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {signers.map((signer) => (
            <div key={signer.id} className="flex items-center gap-2">
              <Badge 
                variant={signer.status === 'signed' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {signer.user.name} - {signer.status}
              </Badge>
              {signer.status === 'invited' && canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRequestSignature(signer.id)}
                >
                  Request
                </Button>
              )}
            </div>
          ))}
          
          <Button variant="ghost" size="sm">
            <Share className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {canEdit && (
        <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-1">
            <Button
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('select')}
            >
              <MousePointer className="h-4 w-4 mr-1" />
              Select
            </Button>
            <Button
              variant={selectedTool === 'signature' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('signature')}
            >
              ✍️ Signature
            </Button>
            <Button
              variant={selectedTool === 'initial' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('initial')}
            >
              📝 Initial
            </Button>
            <Button
              variant={selectedTool === 'date' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('date')}
            >
              📅 Date
            </Button>
            <Button
              variant={selectedTool === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('text')}
            >
              📄 Text
            </Button>
            <Button
              variant={selectedTool === 'checkbox' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTool('checkbox')}
            >
              ☐ Checkbox
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-slate-100 p-4" ref={containerRef}>
        <div className="mx-auto bg-white shadow-lg" style={{ width: 'fit-content' }}>
          <div
            ref={pdfViewerRef}
            className="relative bg-white"
            style={{
              width: 612 * zoom, // 8.5" at 72 DPI
              height: 792 * zoom, // 11" at 72 DPI
              cursor: selectedTool !== 'select' ? 'crosshair' : 'default',
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            {/* PDF content would be rendered here via PDF.js */}
            <div className="w-full h-full border border-slate-300 bg-white flex items-center justify-center text-slate-400">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4" />
                <p>PDF Page {currentPage}</p>
                <p className="text-sm">PDF.js integration needed</p>
              </div>
            </div>

            {/* Render signature fields */}
            {fields.map(renderField)}
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center justify-between p-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>

        <div className="text-xs text-slate-500">
          {fields.length} signature fields • {signers.filter(s => s.status === 'signed').length} of {signers.length} signed
        </div>
      </div>
    </div>
  );
}

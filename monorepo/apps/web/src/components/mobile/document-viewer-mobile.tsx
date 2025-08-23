"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Download,
  Share,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Pen,
  Camera,
  FileText,
  Check,
  AlertCircle,
  Upload,
} from "lucide-react";

interface MobileDocumentViewerProps {
  documentUrl: string;
  documentTitle: string;
  tripId?: string;
  isSigningMode?: boolean;
  onClose: () => void;
  onSign?: (signatureData: string, auditInfo: any) => void;
  onShare?: () => void;
  onDownload?: () => void;
  className?: string;
}

interface SignatureField {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  required: boolean;
  value?: string;
  completed: boolean;
}

export function MobileDocumentViewer({
  documentUrl,
  documentTitle,
  tripId,
  isSigningMode = false,
  onClose,
  onSign,
  onShare,
  onDownload,
  className,
}: MobileDocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Signing state
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [capturedSignature, setCapturedSignature] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize document
  useEffect(() => {
    loadDocument();
  }, [documentUrl]);

  const loadDocument = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For demo purposes, we'll simulate PDF loading
      // In production, use PDF.js to render pages
      setTotalPages(3); // Mock data
      setIsLoading(false);
      
      // Mock signature fields for demo
      if (isSigningMode) {
        setSignatureFields([
          {
            id: 'sig1',
            type: 'signature',
            x: 50,
            y: 200,
            width: 200,
            height: 80,
            page: 1,
            required: true,
            completed: false,
          },
          {
            id: 'date1',
            type: 'date',
            x: 300,
            y: 200,
            width: 100,
            height: 40,
            page: 1,
            required: true,
            value: new Date().toLocaleDateString(),
            completed: true,
          },
          {
            id: 'initial1',
            type: 'initial',
            x: 450,
            y: 200,
            width: 60,
            height: 40,
            page: 1,
            required: false,
            completed: false,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load document:', err);
      setError('Failed to load document');
      setIsLoading(false);
    }
  };

  // Handle field tap
  const handleFieldTap = (field: SignatureField) => {
    if (field.completed && field.type !== 'signature') return;
    
    setActiveField(field.id);
    
    if (field.type === 'signature' || field.type === 'initial') {
      setShowSignaturePad(true);
    } else if (field.type === 'text') {
      const value = prompt(`Enter ${field.type}:`, field.value || '');
      if (value !== null) {
        updateFieldValue(field.id, value);
      }
    }
  };

  const updateFieldValue = (fieldId: string, value: string) => {
    setSignatureFields(fields =>
      fields.map(field =>
        field.id === fieldId
          ? { ...field, value, completed: true }
          : field
      )
    );
  };

  // Signature pad functionality
  const startDrawing = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = signaturePadRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }, []);

  const draw = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = signaturePadRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, []);

  const stopDrawing = useCallback(() => {
    const canvas = signaturePadRef.current;
    if (canvas && activeField) {
      const dataURL = canvas.toDataURL();
      setCapturedSignature(dataURL);
      updateFieldValue(activeField, dataURL);
    }
  }, [activeField]);

  // Clear signature pad
  const clearSignature = () => {
    const canvas = signaturePadRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setCapturedSignature('');
  };

  // Accept signature
  const acceptSignature = () => {
    if (capturedSignature && activeField) {
      setShowSignaturePad(false);
      setActiveField(null);
    }
  };

  // Submit signed document
  const handleSubmitSignature = async () => {
    const requiredFields = signatureFields.filter(field => field.required);
    const completedRequired = requiredFields.filter(field => field.completed);
    
    if (completedRequired.length < requiredFields.length) {
      alert('Please complete all required fields before signing.');
      return;
    }

    if (onSign) {
      const auditInfo = {
        tripId,
        timestamp: new Date().toISOString(),
        location: null, // Will be filled by geolocation if available
        userAgent: navigator.userAgent,
        fields: signatureFields,
      };

      // Get location for audit trail
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          auditInfo.location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        } catch (error) {
          console.log('Location not available for audit trail');
        }
      }

      onSign(capturedSignature, auditInfo);
    }
  };

  const allRequiredCompleted = signatureFields
    .filter(field => field.required)
    .every(field => field.completed);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 m-4 max-w-sm w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 truncate">
            {documentTitle}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            {isSigningMode && (
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                allRequiredCompleted 
                  ? "bg-green-100 text-green-800" 
                  : "bg-yellow-100 text-yellow-800"
              )}>
                {allRequiredCompleted ? "Ready to sign" : "Pending signatures"}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onShare && (
            <Button variant="ghost" size="sm" onClick={onShare}>
              <Share className="h-5 w-5" />
            </Button>
          )}
          {onDownload && (
            <Button variant="ghost" size="sm" onClick={onDownload}>
              <Download className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Document viewer */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-100 relative"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading document...</p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {/* Mock document pages */}
            {Array.from({ length: totalPages }, (_, index) => (
              <div
                key={index + 1}
                className={cn(
                  "bg-white shadow-lg mb-4 mx-auto relative",
                  "w-full max-w-2xl aspect-[8.5/11]", // Letter size aspect ratio
                  currentPage === index + 1 ? "block" : "hidden md:block"
                )}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center top',
                }}
              >
                {/* Mock document content */}
                <div className="p-8 h-full border border-slate-200">
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold">Bill of Lading</h1>
                    <p className="text-slate-600">Page {index + 1}</p>
                  </div>
                  
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Shipper:</strong><br />
                        Acme Shipping Co.<br />
                        123 Main St<br />
                        City, State 12345
                      </div>
                      <div>
                        <strong>Consignee:</strong><br />
                        XYZ Distribution<br />
                        456 Oak Ave<br />
                        City, State 67890
                      </div>
                    </div>
                    
                    {tripId && (
                      <div>
                        <strong>Trip ID:</strong> {tripId}
                      </div>
                    )}
                    
                    <div className="border border-slate-300 p-4 mt-8">
                      <strong>Freight Description:</strong><br />
                      General Freight - 48 pallets<br />
                      Weight: 24,000 lbs
                    </div>
                  </div>
                  
                  {/* Signature fields overlay */}
                  {isSigningMode && currentPage === index + 1 && signatureFields
                    .filter(field => field.page === index + 1)
                    .map(field => (
                      <div
                        key={field.id}
                        className={cn(
                          "absolute border-2 border-dashed cursor-pointer transition-colors",
                          field.completed 
                            ? "border-green-500 bg-green-50" 
                            : field.required 
                              ? "border-red-500 bg-red-50" 
                              : "border-blue-500 bg-blue-50",
                          activeField === field.id && "border-solid"
                        )}
                        style={{
                          left: `${field.x}px`,
                          top: `${field.y}px`,
                          width: `${field.width}px`,
                          height: `${field.height}px`,
                        }}
                        onClick={() => handleFieldTap(field)}
                      >
                        <div className="p-1 text-xs font-medium text-center">
                          {field.completed ? (
                            <div className="flex items-center justify-center h-full">
                              {field.type === 'signature' || field.type === 'initial' ? (
                                <img src={field.value} alt="Signature" className="max-w-full max-h-full" />
                              ) : (
                                <span>{field.value}</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-600">
                              {field.type === 'signature' ? (
                                <>
                                  <Pen className="h-4 w-4 mr-1" />
                                  Sign
                                </>
                              ) : field.type === 'initial' ? (
                                <>
                                  <Pen className="h-3 w-3 mr-1" />
                                  Initial
                                </>
                              ) : (
                                field.type
                              )}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Signing controls */}
        {isSigningMode && (
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-1">
                Required: {signatureFields.filter(f => f.required && f.completed).length}/{signatureFields.filter(f => f.required).length}
              </div>
              <div className="text-xs text-slate-500">
                Optional: {signatureFields.filter(f => !f.required && f.completed).length}/{signatureFields.filter(f => !f.required).length}
              </div>
            </div>
            <Button
              onClick={handleSubmitSignature}
              disabled={!allRequiredCompleted}
              className="px-6"
            >
              <Check className="h-4 w-4 mr-2" />
              Sign Document
            </Button>
          </div>
        )}
      </div>

      {/* Signature pad modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-10">
          <div className="bg-white w-full max-h-[80vh] rounded-t-lg">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {signatureFields.find(f => f.id === activeField)?.type === 'initial' ? 'Add Initial' : 'Add Signature'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSignaturePad(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-4">
              <div className="border border-slate-300 rounded-lg mb-4 bg-slate-50">
                <canvas
                  ref={signaturePadRef}
                  width={400}
                  height={200}
                  className="w-full h-48 cursor-crosshair touch-none"
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ touchAction: 'none' }}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={clearSignature} className="flex-1">
                  Clear
                </Button>
                <Button 
                  onClick={acceptSignature} 
                  disabled={!capturedSignature}
                  className="flex-1"
                >
                  Accept
                </Button>
              </div>

              <p className="text-xs text-slate-500 mt-3 text-center">
                Draw your {signatureFields.find(f => f.id === activeField)?.type} in the box above
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

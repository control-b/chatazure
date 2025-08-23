"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Save,
  RotateCcw,
  Download,
  Upload,
  Pen,
  Type,
  Image as ImageIcon,
  CheckCircle,
  MapPin,
  Truck,
  Clock,
  FileText,
  Shield,
} from "lucide-react";
import type { Trip, TripDocument, SignatureField } from "@/types/index";

interface EnhancedSignatureModalProps {
  isOpen: boolean;
  document: TripDocument;
  trip?: Trip;
  signatureFields: SignatureField[];
  currentUserId: string;
  onClose: () => void;
  onSign: (signatureData: string, signerInfo: SignerInfo, auditData: AuditData) => void;
  onDecline: (reason: string) => void;
  className?: string;
}

interface SignerInfo {
  name: string;
  email: string;
  title?: string;
  date: string;
  role: string;
}

interface AuditData {
  ipAddress?: string;
  userAgent: string;
  location?: { lat: number; lng: number };
  timestamp: Date;
  deviceFingerprint?: string;
}

type SignatureMode = "draw" | "type" | "upload";

export function EnhancedSignatureModal({
  isOpen,
  document,
  trip,
  signatureFields,
  currentUserId,
  onClose,
  onSign,
  onDecline,
  className,
}: EnhancedSignatureModalProps) {
  const [mode, setMode] = useState<SignatureMode>("draw");
  const [signerInfo, setSignerInfo] = useState<SignerInfo>({
    name: "",
    email: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
    role: "",
  });
  const [typedSignature, setTypedSignature] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string>("");
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current location for audit trail
  useEffect(() => {
    if (isOpen && !currentLocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsGettingLocation(false);
        },
        () => {
          setIsGettingLocation(false);
        },
        { timeout: 10000 }
      );
    }
  }, [isOpen]);

  // Initialize canvas
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = 600;
        canvas.height = 200;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isOpen, mode]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoordinates(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setSignatureData("");
    }
  };

  const generateTypedSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas && typedSignature) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000000";
      ctx.font = "32px cursive";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
      setSignatureData(canvas.toDataURL());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (ctx && canvas) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(
              canvas.width / img.width,
              canvas.height / img.height
            );
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            setSignatureData(canvas.toDataURL());
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSign = () => {
    if (!signatureData || !signerInfo.name || !signerInfo.email) {
      alert("Please complete the signature and fill in all required information.");
      return;
    }

    const auditData: AuditData = {
      userAgent: navigator.userAgent,
      location: currentLocation || undefined,
      timestamp: new Date(),
      deviceFingerprint: generateDeviceFingerprint(),
    };

    onSign(signatureData, signerInfo, auditData);
    onClose();
  };

  const handleDecline = () => {
    if (!declineReason.trim()) {
      alert("Please provide a reason for declining to sign.");
      return;
    }
    onDecline(declineReason);
    onClose();
  };

  const generateDeviceFingerprint = (): string => {
    // Simple device fingerprinting for audit purposes
    const canvasEl = window.document.createElement('canvas');
    const ctx = canvasEl.getContext('2d');
    ctx?.fillText('Device fingerprint', 10, 10);
    return btoa(
      navigator.userAgent +
      screen.width + 
      screen.height +
      (canvasEl.toDataURL() || '')
    ).substring(0, 32);
  };

  const isValid = signatureData && signerInfo.name && signerInfo.email;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={cn(
        "bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[95vh] overflow-hidden",
        className
      )}>
        {/* Header with Trip Context */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Sign Document: {document.title}
                </h2>
                <Badge variant="outline" className="ml-2">
                  {document.type}
                </Badge>
              </div>
              
              {trip && (
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    <span>Trip {trip.poNumber}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{trip.pickupLocation.name} → {trip.destinationLocation.name}</span>
                  </div>
                  {trip.assignedDoor && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Door {trip.assignedDoor}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          {!declined ? (
            <>
              {/* Signature Section */}
              <div className="p-6 space-y-6">
                {/* Security Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-1">Secure Digital Signature</h4>
                      <p className="text-sm text-blue-700">
                        This document requires your digital signature. All actions are logged for security and compliance.
                        {currentLocation && (
                          <span className="block mt-1">
                            Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signature Fields Summary */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Required Signatures</h4>
                  <div className="space-y-2">
                    {signatureFields
                      .filter(field => field.assigneeUserId === currentUserId)
                      .map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2 text-sm">
                          <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="capitalize">{field.type}</span>
                          {field.placeholder && (
                            <span className="text-slate-500">- {field.placeholder}</span>
                          )}
                          <Badge variant="outline">Page {field.page}</Badge>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Signature Modes */}
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                  <Button
                    variant={mode === "draw" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMode("draw")}
                    className="flex-1"
                  >
                    <Pen className="h-4 w-4 mr-1" />
                    Draw
                  </Button>
                  <Button
                    variant={mode === "type" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMode("type")}
                    className="flex-1"
                  >
                    <Type className="h-4 w-4 mr-1" />
                    Type
                  </Button>
                  <Button
                    variant={mode === "upload" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMode("upload")}
                    className="flex-1"
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>

                {/* Signature Canvas */}
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                    {mode === "draw" && (
                      <div className="p-4">
                        <p className="text-sm text-slate-600 mb-3">
                          Draw your signature below:
                        </p>
                        <canvas
                          ref={canvasRef}
                          className="border border-slate-300 rounded bg-white cursor-crosshair w-full"
                          style={{ height: "200px" }}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                        />
                      </div>
                    )}

                    {mode === "type" && (
                      <div className="p-4">
                        <p className="text-sm text-slate-600 mb-3">
                          Type your signature:
                        </p>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={typedSignature}
                            onChange={(e) => setTypedSignature(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <Button
                            onClick={generateTypedSignature}
                            disabled={!typedSignature}
                            size="sm"
                          >
                            Generate Signature
                          </Button>
                        </div>
                        <canvas
                          ref={canvasRef}
                          className="border border-slate-300 rounded bg-white w-full mt-3"
                          style={{ height: "200px" }}
                        />
                      </div>
                    )}

                    {mode === "upload" && (
                      <div className="p-4">
                        <p className="text-sm text-slate-600 mb-3">
                          Upload an image of your signature:
                        </p>
                        <div className="space-y-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            size="sm"
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Choose Image
                          </Button>
                        </div>
                        <canvas
                          ref={canvasRef}
                          className="border border-slate-300 rounded bg-white w-full mt-3"
                          style={{ height: "200px" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Canvas Controls */}
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={clearCanvas}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Clear
                    </Button>

                    {signatureData && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Signature captured
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Signer Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900">
                    Signer Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={signerInfo.name}
                        onChange={(e) =>
                          setSignerInfo((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={signerInfo.email}
                        onChange={(e) =>
                          setSignerInfo((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your email"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Title/Position
                      </label>
                      <input
                        type="text"
                        value={signerInfo.title}
                        onChange={(e) =>
                          setSignerInfo((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your title or position"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={signerInfo.date}
                        onChange={(e) =>
                          setSignerInfo((prev) => ({ ...prev, date: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Decline Section */
            <div className="p-6 space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-900 mb-2">Decline to Sign</h4>
                <p className="text-sm text-amber-700 mb-4">
                  Please provide a reason for declining to sign this document.
                </p>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Enter reason for declining..."
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={4}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3" />
              <span>Session started: {new Date().toLocaleTimeString()}</span>
            </div>
            {isGettingLocation && (
              <span>Getting location for audit trail...</span>
            )}
            <p>By signing, you agree that this signature is legally binding.</p>
          </div>

          <div className="flex items-center gap-3">
            {!declined ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setDeclined(true)}
                >
                  Decline to Sign
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSign} 
                  disabled={!isValid}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Sign Document
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setDeclined(false)}
                >
                  Back to Signing
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDecline}
                  disabled={!declineReason.trim()}
                  variant="destructive"
                >
                  Confirm Decline
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

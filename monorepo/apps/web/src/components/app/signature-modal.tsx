'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  X, 
  Save, 
  RotateCcw, 
  Download,
  Upload,
  Pen,
  Type,
  Image as ImageIcon,
  CheckCircle
} from 'lucide-react'

interface SignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (signatureData: string, signerInfo: SignerInfo) => void
  documentTitle: string
  signerName?: string
  signerEmail?: string
  className?: string
}

interface SignerInfo {
  name: string
  email: string
  title?: string
  date: string
}

type SignatureMode = 'draw' | 'type' | 'upload'

export function SignatureModal({
  isOpen,
  onClose,
  onSave,
  documentTitle,
  signerName = '',
  signerEmail = '',
  className
}: SignatureModalProps) {
  const [mode, setMode] = useState<SignatureMode>('draw')
  const [signerInfo, setSignerInfo] = useState<SignerInfo>({
    name: signerName,
    email: signerEmail,
    title: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [typedSignature, setTypedSignature] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureData, setSignatureData] = useState<string>('')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Set up canvas
        canvas.width = 600
        canvas.height = 200
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        // Clear canvas
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [isOpen, mode])

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const { x, y } = getCanvasCoordinates(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const { x, y } = getCanvasCoordinates(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      setSignatureData(canvas.toDataURL())
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      setSignatureData('')
    }
  }

  const generateTypedSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas && typedSignature) {
      // Clear canvas
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw typed signature
      ctx.fillStyle = '#000000'
      ctx.font = '32px cursive'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2)
      
      setSignatureData(canvas.toDataURL())
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = canvasRef.current
          const ctx = canvas?.getContext('2d')
          if (ctx && canvas) {
            // Clear canvas
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            
            // Calculate dimensions to fit image in canvas
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
            const x = (canvas.width - img.width * scale) / 2
            const y = (canvas.height - img.height * scale) / 2
            
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
            setSignatureData(canvas.toDataURL())
          }
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    if (!signatureData || !signerInfo.name || !signerInfo.email) {
      alert('Please complete the signature and fill in all required information.')
      return
    }
    
    onSave(signatureData, signerInfo)
    onClose()
  }

  const isValid = signatureData && signerInfo.name && signerInfo.email

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={cn(
        "bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Sign Document
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {documentTitle}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Signature Modes */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <Button
              variant={mode === 'draw' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('draw')}
              className="flex-1"
            >
              <Pen className="h-4 w-4 mr-1" />
              Draw
            </Button>
            <Button
              variant={mode === 'type' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('type')}
              className="flex-1"
            >
              <Type className="h-4 w-4 mr-1" />
              Type
            </Button>
            <Button
              variant={mode === 'upload' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('upload')}
              className="flex-1"
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              Upload
            </Button>
          </div>

          {/* Signature Canvas */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
              {mode === 'draw' && (
                <div className="p-4">
                  <p className="text-sm text-slate-600 mb-3">
                    Draw your signature below:
                  </p>
                  <canvas
                    ref={canvasRef}
                    className="border border-slate-300 rounded bg-white cursor-crosshair w-full"
                    style={{ height: '200px' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
              )}

              {mode === 'type' && (
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
                    style={{ height: '200px' }}
                  />
                </div>
              )}

              {mode === 'upload' && (
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
                    style={{ height: '200px' }}
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
                  onChange={(e) => setSignerInfo(prev => ({ ...prev, name: e.target.value }))}
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
                  onChange={(e) => setSignerInfo(prev => ({ ...prev, email: e.target.value }))}
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
                  onChange={(e) => setSignerInfo(prev => ({ ...prev, title: e.target.value }))}
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
                  onChange={(e) => setSignerInfo(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-500">
            By signing, you agree that this signature is legally binding.
          </p>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!isValid}
            >
              <Save className="h-4 w-4 mr-1" />
              Sign Document
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

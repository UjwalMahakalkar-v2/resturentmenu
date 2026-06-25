import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface QRCodeGeneratorProps {
  tenantSlug: string;
}

export default function QRCodeGenerator({ tenantSlug }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuUrl, setMenuUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState(300);

  useEffect(() => {
    const url = `${window.location.origin}/${tenantSlug}`;
    setMenuUrl(url);
  }, [tenantSlug]);

  useEffect(() => {
    if (!menuUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, menuUrl, {
      width: size,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).catch(err => console.error('QR generation error:', err));
  }, [menuUrl, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${tenantSlug}-menu-qr.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    toast.success('QR code downloaded');
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      toast.success('Menu URL copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Code - ${tenantSlug}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        img { display: block; margin: 0 auto 16px; }
        h2 { margin: 0 0 8px; font-size: 1.4rem; }
        p { color: #555; font-size: 0.9rem; margin: 0; }
      </style></head>
      <body>
        <h2>Scan to view our menu</h2>
        <img src="${dataUrl}" width="${size}" />
        <p>${menuUrl}</p>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* QR Canvas */}
        <div className="flex-shrink-0">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 inline-block shadow-sm">
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Menu URL</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={menuUrl}
                readOnly
                className="input-field flex-1 text-sm font-mono bg-gray-50"
              />
              <button
                onClick={handleCopyUrl}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Copy URL"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QR Code Size: <span className="font-semibold">{size}×{size}px</span>
            </label>
            <input
              type="range"
              min={150}
              max={500}
              step={50}
              value={size}
              onChange={e => setSize(Number(e.target.value))}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>150px</span>
              <span>500px</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownload}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
            <button
              onClick={handlePrint}
              className="btn-secondary flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Print QR Code
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Tip:</strong> Print this QR code and place it on your tables. Customers can scan it to view your menu instantly on their phone.
          </div>
        </div>
      </div>
    </div>
  );
}

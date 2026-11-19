import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Loader2, CheckCircle, AlertCircle, Package, RefreshCw, X, Download, Truck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion } from 'motion/react';

interface ShipmentRow {
  id: number;
  name: string;
  email: string;
  guide: string;
  shippingMethod: 'unoexpress' | 'servientrega';
  status: 'idle' | 'sending' | 'success' | 'error';
  errorMessage?: string;
}

export default function App() {
  const [rows, setRows] = useState<ShipmentRow[]>(
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      name: '',
      email: '',
      guide: '',
      shippingMethod: 'unoexpress',
      status: 'idle',
    }))
  );
  const [isGlobalSending, setIsGlobalSending] = useState(false);
  const [configStatus, setConfigStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [configError, setConfigError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<'cubitt' | 'casio' | null>(null);
  const [previewModal, setPreviewModal] = useState<{ url: string; filename: string; row: ShipmentRow } | null>(null);
  const rowsRef = useRef(rows);

  // Keep rowsRef in sync with rows for async access
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (selectedBrand) {
      checkConfig();
    }
  }, [selectedBrand]);

  const checkConfig = async () => {
    if (!selectedBrand) return;
    setConfigStatus('checking');
    setConfigError(null);
    try {
      const res = await fetch(`/api/check-config?brand=${selectedBrand}`);
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (res.ok && data?.status === 'ok') {
        setConfigStatus('ok');
      } else {
        setConfigStatus('error');
        const msg =
          data?.message ||
          (Array.isArray(data?.missing) && data.missing.length > 0
            ? `Faltan variables de entorno: ${data.missing.join(', ')}`
            : 'El servicio de correo no está disponible o no está configurado.');
        setConfigError(msg);
      }
    } catch (e) {
      setConfigStatus('error');
      setConfigError('No se pudo conectar con el servidor de correo.');
    }
  };

  const handleInputChange = (id: number, field: keyof ShipmentRow, value: string) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value, status: 'idle', errorMessage: undefined };
      }
      return row;
    }));
  };

  const resetRow = (id: number) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, status: 'idle', errorMessage: undefined };
      }
      return row;
    }));
  };

  const buildPDFDocument = (row: ShipmentRow): jsPDF => {
    const isCasio = selectedBrand === 'casio';
    const isServientrega = row.shippingMethod === 'servientrega';
    const brandNameHeader = isCasio ? 'CASIO STORE' : 'CUBITT';
    const brandSender = isCasio ? 'Casio Store Panamá' : 'Cubitt Panamá';
    const carrierLabel = isServientrega ? 'Servientrega' : 'Uno Express';
    const trackingUrl = isServientrega
      ? 'https://servientrega.com.pa/'
      : 'https://unoexpresspanama.com/';
    const trackingDomain = isServientrega ? 'servientrega.com.pa' : 'unoexpresspanama.com';

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a6' // 148mm x 105mm
    });

    const width = 148;
    const height = 105;

    // 1. Tinted Soft Canvas Background (mirrors Generador de Notificaciones)
    if (isCasio) {
      doc.setFillColor(232, 232, 235);
    } else {
      doc.setFillColor(236, 243, 253);
    }
    doc.rect(0, 0, width, height, 'F');

    // Subtle decorative corner accent circles (muted so text remains ultra legible)
    if (isCasio) {
      doc.setFillColor(218, 218, 222);
    } else {
      doc.setFillColor(221, 233, 252);
    }
    doc.circle(12, 10, 22, 'F');
    doc.circle(138, 96, 24, 'F');

    // 2. Top Frosted Header Bar (mirrors app <header>)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(isCasio ? 210 : 212, isCasio ? 210 : 224, isCasio ? 214 : 242);
    doc.setLineWidth(0.3);
    doc.roundedRect(5, 4.5, 138, 12.5, 3.5, 3.5, 'FD');

    // Brand Name in Header
    doc.setTextColor(29, 29, 31);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(brandNameHeader, 10, 12.1);

    const brandWidth = doc.getTextWidth(brandNameHeader);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('  |  Despachos', 10 + brandWidth, 12.1);

    // Header Status Pill ("ENVIADO" - mirrors "Sistema Listo" green pill)
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.setLineWidth(0.3);
    doc.roundedRect(114, 7.5, 24.5, 6.5, 3.25, 3.25, 'FD');
    doc.setFillColor(16, 185, 129);
    doc.circle(118, 10.75, 1.1, 'F');
    doc.setTextColor(4, 120, 87);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('ENVIADO', 120.5, 11.7);

    // 3. Main Glassmorphic-style White Card (mirrors rounded-[2rem] card)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(isCasio ? 212 : 214, isCasio ? 212 : 225, isCasio ? 216 : 242);
    doc.setLineWidth(0.35);
    doc.roundedRect(5, 19.5, 138, 80.5, 4, 4, 'FD');

    // Card Title Row
    doc.setTextColor(29, 29, 31);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('NOTIFICACIÓN DE ENVÍO', 11, 27.5);

    // Carrier Indicator Pill in Top-Right of Card
    const carrierPillText = `ENVÍO: ${carrierLabel.toUpperCase()}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const carrierPillTextWidth = doc.getTextWidth(carrierPillText);
    const pillWidth = carrierPillTextWidth + 9;
    const pillX = 137 - pillWidth;

    if (isServientrega) {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(110, 231, 183);
      doc.roundedRect(pillX, 22.8, pillWidth, 6.5, 3.25, 3.25, 'FD');
      doc.setFillColor(5, 150, 105);
      doc.circle(pillX + 3.5, 26.05, 1, 'F');
      doc.setTextColor(6, 95, 70);
    } else if (isCasio) {
      doc.setFillColor(244, 244, 245);
      doc.setDrawColor(212, 212, 216);
      doc.roundedRect(pillX, 22.8, pillWidth, 6.5, 3.25, 3.25, 'FD');
      doc.setFillColor(24, 24, 27);
      doc.circle(pillX + 3.5, 26.05, 1, 'F');
      doc.setTextColor(24, 24, 27);
    } else {
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(pillX, 22.8, pillWidth, 6.5, 3.25, 3.25, 'FD');
      doc.setFillColor(0, 113, 227);
      doc.circle(pillX + 3.5, 26.05, 1, 'F');
      doc.setTextColor(0, 91, 187);
    }
    doc.text(carrierPillText, pillX + 6, 27);

    // Subtle Header Divider inside Card
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.35);
    doc.line(11, 31.5, 137, 31.5);

    // 4. Left Column: Remitente, Destinatario & Empresa de Envío
    // Remitente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('REMITENTE', 11, 38);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(29, 29, 31);
    doc.text(brandSender, 11, 42.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Ciudad de Panamá, Panamá', 11, 46.5);

    // Destinatario
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('DESTINATARIO', 11, 54);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(29, 29, 31);
    const customerName = row.name?.trim() || 'Cliente';
    const nameLines = doc.splitTextToSize(customerName, 55).slice(0, 2);
    doc.text(nameLines, 11, 58.8);

    const emailY = nameLines.length > 1 ? 66.5 : 63.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    const emailLines = doc.splitTextToSize(row.email || '', 55).slice(0, 1);
    if (emailLines[0]) {
      doc.text(emailLines[0], 11, emailY);
    }

    // Empresa de envío (Explicit Spanish indicator)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('EMPRESA DE ENVÍO', 11, 74.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(29, 29, 31);
    doc.text(carrierLabel, 11, 79.5);

    // Vertical Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(70, 35.5, 70, 88);

    // 5. Right Column: Guía + CTA Rastrear Pedido
    const rightX = 74.5;
    const rightW = 62.5;
    const rightCenter = rightX + rightW / 2;

    // Guide Highlight Box
    doc.setFillColor(isCasio ? 244 : 248, isCasio ? 244 : 250, isCasio ? 245 : 252);
    doc.setDrawColor(isCasio ? 228 : 226, isCasio ? 228 : 232, isCasio ? 231 : 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(rightX, 35.5, rightW, 21, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('NÚMERO DE GUÍA', rightCenter, 41, { align: 'center' });

    const guideText = (row.guide?.trim() || 'PENDIENTE').toUpperCase();
    const guideFontSize = guideText.length > 15 ? 10 : guideText.length > 11 ? 12.5 : 15;
    doc.setFont('courier', 'bold');
    doc.setFontSize(guideFontSize);
    doc.setTextColor(29, 29, 31);
    doc.text(guideText, rightCenter, 50.5, { align: 'center' });

    // Helper Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Copia tu guía y consulta tu envío aquí:', rightCenter, 63, { align: 'center' });

    // Pill CTA Button ("RASTREAR PEDIDO" matching app primary button)
    const btnX = rightX + 3.5;
    const btnW = rightW - 7;
    const btnY = 66.5;
    const btnH = 10.5;

    if (isCasio) {
      doc.setFillColor(17, 17, 17);
    } else {
      doc.setFillColor(0, 113, 227);
    }
    doc.roundedRect(btnX, btnY, btnW, btnH, 5.25, 5.25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text('RASTREAR PEDIDO', rightCenter, btnY + 6.7, { align: 'center' });
    doc.link(btnX, btnY, btnW, btnH, { url: trackingUrl });

    // Readable URL hint below button
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(trackingDomain, rightCenter, 82, { align: 'center' });

    // 6. Card Footer
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(11, 90.5, 137, 90.5);

    const formattedDate = new Date().toLocaleDateString('es-PA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado el ${formattedDate}`, 11, 95.5);
    doc.text(`Gracias por elegir ${isCasio ? 'Casio Store' : 'Cubitt'}.`, 137, 95.5, { align: 'right' });

    return doc;
  };

  const generatePDF = (row: ShipmentRow): string => {
    return buildPDFDocument(row).output('datauristring');
  };

  const closePreviewModal = () => {
    if (previewModal?.url) {
      URL.revokeObjectURL(previewModal.url);
    }
    setPreviewModal(null);
  };

  const previewPDF = (row: ShipmentRow) => {
    if (!row.name && !row.guide) return;
    if (previewModal?.url) {
      URL.revokeObjectURL(previewModal.url);
    }
    const doc = buildPDFDocument(row);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const brandTag = selectedBrand === 'casio' ? 'Casio' : 'Cubitt';
    const guideTag = row.guide?.trim() || 'VistaPrevia';
    setPreviewModal({
      url,
      filename: `Guia_${brandTag}_${guideTag}.pdf`,
      row,
    });
  };

  const sendEmail = async (row: ShipmentRow) => {
    if (!row.email || !row.name || !row.guide) return;

    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'sending', errorMessage: undefined } : r));

    try {
      const pdfBase64 = generatePDF(row);
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: row.email,
          name: row.name,
          guide: row.guide,
          pdfBase64,
          brand: selectedBrand,
          shippingMethod: row.shippingMethod,
        })
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('El servidor no devolvió una respuesta válida (verifica /api/send-email)');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar');
      }

      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'success' } : r));
    } catch (error: any) {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'error', errorMessage: error.message } : r));
    }
  };

  const sendAll = async () => {
    setIsGlobalSending(true);
    const validRows = rows.filter(r => r.name && r.email && r.guide && r.status !== 'success');
    
    for (const row of validRows) {
      await sendEmail(row);
    }
    setIsGlobalSending(false);
  };

  if (!selectedBrand) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-100 opacity-70" />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none mix-blend-multiply animate-pulse bg-blue-400/10" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none mix-blend-multiply animate-pulse bg-purple-400/10" />
        
        <div className="relative z-10 max-w-4xl w-full px-6">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6 drop-shadow-sm">¿Desde dónde deseas enviar notificaciones hoy?</h1>
            <p className="text-lg text-slate-500 font-medium">Selecciona el espacio de trabajo para continuar</p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <button
              onClick={() => setSelectedBrand('cubitt')}
              className="group relative bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white/60 hover:border-blue-200 hover:shadow-blue-500/20 transition-all text-center flex flex-col items-center justify-center gap-6 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner relative z-10">
                <Package size={48} strokeWidth={1.5} />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Cubitt</h2>
                <p className="text-slate-500 font-medium">Entorno principal de despachos</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedBrand('casio')}
              className="group relative bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white/60 hover:border-black/20 hover:shadow-black/10 transition-all text-center flex flex-col items-center justify-center gap-6 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-24 h-24 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner relative z-10">
                <Package size={48} strokeWidth={1.5} />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Casio Store</h2>
                <p className="text-slate-500 font-medium">Entorno secundario de despachos</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-[#1D1D1F] relative overflow-hidden">
      {/* Vibrant Mesh Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br opacity-80 transition-colors duration-700 ${selectedBrand === 'casio' ? 'from-neutral-300 via-stone-200 to-zinc-400' : 'from-rose-100 via-sky-100 to-violet-200'}`} />
      
      {/* Ambient Background Blobs */}
      <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none mix-blend-multiply animate-pulse transition-colors duration-700 ${selectedBrand === 'casio' ? 'bg-black/10' : 'bg-blue-400/20'}`} />
      <div className={`absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none mix-blend-multiply animate-pulse transition-colors duration-700 ${selectedBrand === 'casio' ? 'bg-stone-500/10' : 'bg-purple-400/20'}`} />
      <div className={`absolute top-[40%] left-[40%] w-[40%] h-[40%] rounded-full blur-[100px] pointer-events-none mix-blend-multiply transition-colors duration-700 ${selectedBrand === 'casio' ? 'bg-neutral-400/10' : 'bg-pink-300/20'}`} />
      
      {/* Apple-style Header */}
      <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-white/20 shadow-sm supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="text-black/80" size={20} />
            <span className="font-semibold tracking-tight text-black/90">{selectedBrand === 'casio' ? 'Casio Store' : 'Cubitt'} Dispatch</span>
            
            {/* Config Status Indicator */}
            <div
              title={configError || undefined}
              className={`ml-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md ${
                configStatus === 'ok' 
                  ? 'bg-green-50/50 text-green-700 border-green-200/50' 
                  : configStatus === 'error' 
                    ? 'bg-red-50/50 text-red-700 border-red-200/50'
                    : 'bg-slate-50/50 text-slate-600 border-slate-200/50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                configStatus === 'ok' ? 'bg-green-500' : configStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
              }`} />
              {configStatus === 'ok' ? 'Sistema Listo' : configStatus === 'error' ? 'Error Config' : 'Verificando...'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {configStatus === 'error' && configError && (
              <span className="hidden md:inline-block text-xs text-red-600 bg-red-50/80 border border-red-200/60 px-3 py-1 rounded-full">
                {configError}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        
        <div className="bg-white/60 backdrop-blur-2xl rounded-[2rem] shadow-xl p-8 border border-white/40 ring-1 ring-white/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F] uppercase drop-shadow-sm flex-grow">
              Notificaciones de Envío
            </h1>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedBrand(null)}
                className="px-4 py-2.5 rounded-full text-sm font-medium transition-all text-slate-500 hover:text-slate-900 bg-black/5 hover:bg-black/10 border border-transparent whitespace-nowrap"
              >
                Cambiar Entorno
              </button>

              <button 
                onClick={sendAll}
                disabled={isGlobalSending}
                className={`${selectedBrand === 'casio' ? 'bg-black hover:bg-neutral-800 shadow-neutral-500/20' : 'bg-[#0071E3]/90 hover:bg-[#0077ED] shadow-blue-500/20'} text-white text-sm font-medium px-6 py-2.5 rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 backdrop-blur-sm whitespace-nowrap`}
              >
                {isGlobalSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Enviar Todos
              </button>
            </div>
          </div>

          <div className="overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-6 p-4 border-b border-black/5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-3 pl-2">Nombre del Cliente</div>
              <div className="col-span-3">Correo Electrónico</div>
              <div className="col-span-2">Número de Guía</div>
              <div className="col-span-2">Método de Envío</div>
              <div className="col-span-2 text-center">Acciones</div>
            </div>

            {/* Rows */}
            <div id="clientes" className="divide-y divide-black/5">
              {rows.map((row) => (
                <motion.div 
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: row.id * 0.05 }}
                  className="grid grid-cols-12 gap-6 p-6 items-center group hover:bg-white/40 transition-colors rounded-xl"
                >
                  {/* Name Input */}
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Juan Pérez"
                      value={row.name}
                      onChange={(e) => handleInputChange(row.id, 'name', e.target.value)}
                      className="nombre w-full bg-transparent border-b border-transparent focus:border-slate-400/50 p-2 text-[15px] font-medium text-slate-800 placeholder:text-slate-400 focus:ring-0 transition-all"
                    />
                  </div>

                  {/* Email Input */}
                  <div className="col-span-3">
                    <input
                      type="email"
                      placeholder="juan@ejemplo.com"
                      value={row.email}
                      onChange={(e) => handleInputChange(row.id, 'email', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent focus:border-slate-400/50 p-2 text-[15px] text-slate-600 placeholder:text-slate-400 focus:ring-0 transition-all"
                    />
                  </div>

                  {/* Guide Input */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="00XXXXXXX"
                      value={row.guide}
                      onChange={(e) => handleInputChange(row.id, 'guide', e.target.value)}
                      className="guia w-full bg-transparent border-b border-transparent focus:border-slate-400/50 p-2 text-[15px] font-mono text-slate-500 placeholder:text-slate-400 focus:ring-0 transition-all uppercase"
                    />
                  </div>

                  {/* Shipping Method Select */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2 bg-white/50 border border-black/5 rounded-full px-3 py-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          row.shippingMethod === 'servientrega'
                            ? 'bg-emerald-500'
                            : selectedBrand === 'casio'
                              ? 'bg-neutral-900'
                              : 'bg-[#0071E3]'
                        }`}
                      />
                      <select
                        value={row.shippingMethod}
                        onChange={(e) => handleInputChange(row.id, 'shippingMethod', e.target.value as 'unoexpress' | 'servientrega')}
                        className="w-full bg-transparent text-[13px] font-medium text-slate-700 focus:ring-0 outline-none cursor-pointer"
                      >
                        <option value="unoexpress">Uno Express</option>
                        <option value="servientrega">Servientrega</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-center gap-3">
                    {row.status === 'idle' && (
                      <>
                        <button
                          onClick={() => previewPDF(row)}
                          disabled={!row.name || !row.guide}
                          className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-white/60 rounded-full transition-colors disabled:opacity-30 backdrop-blur-sm"
                          title="Ver PDF"
                        >
                          <FileText size={18} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => sendEmail(row)}
                          disabled={!row.email || !row.name || !row.guide}
                          className={`p-2.5 text-slate-500 rounded-full transition-colors disabled:opacity-30 backdrop-blur-sm ${selectedBrand === 'casio' ? 'hover:text-black hover:bg-black/5' : 'hover:text-[#0071E3] hover:bg-blue-50/50'}`}
                          title="Enviar Correo"
                        >
                          <Send size={18} strokeWidth={1.5} />
                        </button>
                      </>
                    )}
                    
                    {row.status === 'sending' && (
                      <Loader2 size={20} className={`${selectedBrand === 'casio' ? 'text-black' : 'text-[#0071E3]'} animate-spin`} />
                    )}
                    
                    {row.status === 'success' && (
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50/60 border border-emerald-100/50 px-3 py-1 rounded-full backdrop-blur-sm">
                        <CheckCircle size={14} />
                        <span className="text-xs font-semibold uppercase tracking-wide">Enviado</span>
                      </div>
                    )}

                    {row.status === 'error' && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <div className="group/error relative">
                            <AlertCircle size={20} className="text-red-500 cursor-help" />
                            <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white/95 backdrop-blur-xl text-red-600 text-xs rounded-xl shadow-xl border border-red-100 opacity-0 group-hover/error:opacity-100 pointer-events-none z-20">
                              {row.errorMessage || 'Error al enviar'}
                            </div>
                          </div>
                          <button
                            onClick={() => resetRow(row.id)}
                            className={`p-2 text-slate-400 rounded-full transition-colors ${selectedBrand === 'casio' ? 'hover:text-black hover:bg-black/5' : 'hover:text-[#0071E3] hover:bg-white/60'}`}
                            title="Reintentar / Editar"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </div>
                        {row.errorMessage && (
                          <span className="text-[11px] text-red-600 text-center max-w-[160px] leading-tight line-clamp-2" title={row.errorMessage}>
                            {row.errorMessage}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase drop-shadow-sm">
            Sistema de Notificaciones {selectedBrand === 'casio' ? 'Casio Store' : 'Cubitt'} Dispatch
          </p>
        </div>
      </main>

      {/* In-App PDF Preview Modal */}
      {previewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={closePreviewModal}
        >
          <div
            className="bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/60 w-full max-w-3xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${selectedBrand === 'casio' ? 'bg-neutral-900 text-white' : 'bg-[#0071E3] text-white'}`}>
                  <Truck size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Vista Previa de Guía — {previewModal.row.name || 'Cliente'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Empresa: {previewModal.row.shippingMethod === 'servientrega' ? 'Servientrega' : 'Uno Express'} · Guía: {previewModal.row.guide || 'PENDIENTE'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewModal.url}
                  download={previewModal.filename}
                  className={`px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 transition-colors ${selectedBrand === 'casio' ? 'bg-black hover:bg-neutral-800' : 'bg-[#0071E3] hover:bg-[#0077ED]'}`}
                >
                  <Download size={14} />
                  Descargar PDF
                </a>
                <button
                  onClick={closePreviewModal}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="bg-slate-100 h-[70vh] w-full">
              <iframe
                src={previewModal.url}
                title="Vista previa del PDF"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

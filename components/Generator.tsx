import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Download, UserPlus, FileSpreadsheet, Upload, Printer, AlertCircle, CheckCircle2, FileText, Loader2, ChevronDown } from 'lucide-react';
import { saveTicket, saveBulkTickets } from '../services/storageService';
import { Student, QRCodeData } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { TicketCard } from './TicketCard';

type Tab = 'single' | 'bulk';
type PdfLayout = 1 | 8 | 16;

export const Generator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('single');
  
  // Single Entry State
  const [formData, setFormData] = useState({
    name: '',
    admissionNumber: '',
    className: ''
  });
  const [generatedTicket, setGeneratedTicket] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Entry State
  const [bulkResults, setBulkResults] = useState<{ added: Student[], failed: { name: string, reason: string }[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // --- Single Entry Logic ---
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.admissionNumber || !formData.className) {
      setError('All fields are required.');
      return;
    }
    
    setIsSaving(true);
    try {
      const student: Student = {
        id: uuidv4(),
        name: formData.name,
        admissionNumber: formData.admissionNumber,
        className: formData.className,
        createdAt: Date.now()
      };
      
      await saveTicket(student);
      setGeneratedTicket(student);
      setFormData({ name: '', admissionNumber: '', className: '' }); 
    } catch (err: any) {
      setError(err.message || 'Failed to save ticket. Check connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40; 
      canvas.height = img.height + 40;
      if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 20, 20);
          const pngFile = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = `ticket-${generatedTicket?.admissionNumber}.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // --- Bulk Entry Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setBulkResults(null);

    // Extract filename for Batch Name
    const batchName = file.name.replace(/\.[^/.]+$/, "") || "Bulk Import";

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any>(worksheet);

      // Validate and Map
      const students: Student[] = [];
      
      json.forEach((row) => {
        // Simple heuristic to find columns
        const name = row['Name'] || row['name'] || row['Student Name'];
        const adm = row['Admission Number'] || row['Admission No'] || row['Adm No'] || row['adm'];
        const cls = row['Class'] || row['class'] || row['Grade'];

        if (name && adm && cls) {
          students.push({
            id: uuidv4(),
            name: String(name),
            admissionNumber: String(adm),
            className: String(cls),
            createdAt: Date.now()
          });
        }
      });

      if (students.length === 0) {
        setError('No valid data found. Ensure headers are: Name, Admission No, Class');
      } else {
        const results = await saveBulkTickets(students, batchName);
        setBulkResults(results);
        setError('');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to parse file or save to database.');
    } finally {
      setIsProcessing(false);
      e.target.value = ''; // Reset input
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ "Name": "John Doe", "Admission No": "A-101", "Class": "10-A" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "student_upload_template.xlsx");
  };

  const printBulk = () => {
    window.print();
  };

  const generatePdf = async (layout: PdfLayout) => {
    setShowLayoutMenu(false);
    if (!bulkResults?.added || bulkResults.added.length === 0) return;
    
    setIsGeneratingPdf(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4'); // A4: 210mm x 297mm
      
      const config = {
        1: { cols: 1, rows: 1, w: 160, h: 0, xStart: 25, yStart: 40, xGap: 0, yGap: 0 },
        8: { cols: 2, rows: 4, w: 90, h: 0, xStart: 10, yStart: 10, xGap: 5, yGap: 5 },
        16: { cols: 4, rows: 4, w: 45, h: 0, xStart: 10, yStart: 10, xGap: 3, yGap: 3 }
      };

      const settings = config[layout];
      const ticketsPerPage = settings.cols * settings.rows;
      
      for (let i = 0; i < bulkResults.added.length; i++) {
        const student = bulkResults.added[i];
        const elementId = `card-container-${student.id}`;
        const element = document.getElementById(elementId);
        
        if (element) {
          const canvas = await html2canvas(element, {
            scale: layout === 16 ? 4 : 2, // Higher scale for smaller images
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true 
          });
          
          const imgData = canvas.toDataURL('image/png');
          
          // Calculate dynamic height based on aspect ratio
          const imgH = (canvas.height * settings.w) / canvas.width;
          
          // Add new page if needed
          if (i > 0 && i % ticketsPerPage === 0) {
            doc.addPage();
          }

          // Position on grid
          const indexOnPage = i % ticketsPerPage;
          const col = indexOnPage % settings.cols;
          const row = Math.floor(indexOnPage / settings.cols);
          
          const x = settings.xStart + (col * (settings.w + settings.xGap));
          const y = settings.yStart + (row * (imgH + settings.yGap));
          
          doc.addImage(imgData, 'PNG', x, y, settings.w, imgH);
          
          // Optional: Add footer on 1-up layout
          if (layout === 1) {
             doc.setFontSize(10);
             doc.setTextColor(150);
             doc.text(`Ticket ${i + 1} of ${bulkResults.added.length}`, 105, 280, { align: 'center' });
          }
        }
      }
      
      doc.save(`tickets-bulk-${layout}up.pdf`);
      
    } catch (err) {
      console.error("PDF Generation Failed:", err);
      setError("Failed to generate PDF bundle.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getQRData = (student: Student): string => {
      const data: QRCodeData = { id: student.id, v: 1 };
      return JSON.stringify(data);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-slate-700 pb-1 no-print">
        <button
          onClick={() => { setActiveTab('single'); setGeneratedTicket(null); setBulkResults(null); }}
          className={`pb-3 px-4 text-sm font-medium transition-all ${activeTab === 'single' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Single Registration
        </button>
        <button
          onClick={() => { setActiveTab('bulk'); setGeneratedTicket(null); setError(''); }}
          className={`pb-3 px-4 text-sm font-medium transition-all ${activeTab === 'bulk' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Bulk Upload (Excel)
        </button>
      </div>

      {activeTab === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
          {/* Form Section */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl h-fit">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-indigo-400" />
              Register Guest
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInput}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Admission No.</label>
                  <input
                    type="text"
                    name="admissionNumber"
                    value={formData.admissionNumber}
                    onChange={handleInput}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    placeholder="e.g. A-1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Class/Grade</label>
                  <input
                    type="text"
                    name="className"
                    value={formData.className}
                    onChange={handleInput}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    placeholder="e.g. 10-B"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {isSaving ? 'Saving...' : 'Generate Pass'}
              </button>
            </form>
          </div>

          {/* Ticket Preview Section */}
          <div className="flex flex-col items-center justify-start">
            {generatedTicket ? (
              <div className="animate-in slide-in-from-right duration-500 w-full max-w-sm">
                <TicketCard student={generatedTicket} qrValue={getQRData(generatedTicket)} id="qr-code-svg" />
                <div className="mt-6 flex gap-4">
                  <button 
                    onClick={downloadQR}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Save Ticket
                  </button>
                  <button 
                    onClick={() => setGeneratedTicket(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-600"
                  >
                    New Entry
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-800/50 w-full">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600">
                  <Download className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-slate-300 font-medium text-lg">No Ticket Generated</h3>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                  Fill out the form to generate a secure entry pass and QR code for the guest.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in zoom-in duration-300">
          
          {/* Upload Area */}
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl text-center no-print">
            <FileSpreadsheet className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Bulk Import Students</h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Upload an Excel (.xlsx, .xls) or CSV file containing <strong>Name</strong>, <strong>Admission No</strong>, and <strong>Class</strong> columns.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
               <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-8 rounded-lg shadow-lg shadow-indigo-500/20 transition-all group">
                 <input 
                   type="file" 
                   accept=".xlsx,.xls,.csv" 
                   onChange={handleFileUpload}
                   className="hidden"
                   disabled={isProcessing}
                 />
                 <span className="flex items-center gap-2">
                   {isProcessing ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />}
                   {isProcessing ? 'Processing...' : 'Select File'}
                 </span>
               </label>
               
               <button 
                 onClick={downloadTemplate}
                 className="text-indigo-400 hover:text-indigo-300 text-sm font-medium underline underline-offset-4"
               >
                 Download Template
               </button>
            </div>

            {error && (
              <div className="mt-6 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm inline-flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
          </div>

          {/* Results Area */}
          {bulkResults && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold text-xl">{bulkResults.added.length}</span>
                      <span className="text-sm text-slate-400">Successfully Generated</span>
                   </div>
                   {bulkResults.failed.length > 0 && (
                     <div className="flex items-center gap-2 text-amber-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-bold text-xl">{bulkResults.failed.length}</span>
                        <span className="text-sm text-slate-400">Duplicates Skipped</span>
                     </div>
                   )}
                </div>
                
                {bulkResults.added.length > 0 && (
                  <div className="flex gap-3 w-full md:w-auto items-center">
                    
                    {/* PDF Dropdown */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                        disabled={isGeneratingPdf}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium disabled:opacity-50 min-w-[160px] justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                        </div>
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {showLayoutMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                          <div className="p-2 text-xs text-slate-500 font-medium uppercase bg-slate-900/50">Select Layout</div>
                          <button onClick={() => generatePdf(1)} className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white text-sm">
                            1 Ticket per Page
                          </button>
                          <button onClick={() => generatePdf(8)} className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white text-sm border-t border-slate-700">
                            8 Tickets per Page (2x4)
                          </button>
                          <button onClick={() => generatePdf(16)} className="w-full text-left px-4 py-3 hover:bg-slate-700 text-white text-sm border-t border-slate-700">
                            16 Tickets per Page (4x4)
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={printBulk}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  </div>
                )}
              </div>

              {/* Printable Grid */}
              {bulkResults.added.length > 0 && (
                <div className="printable-area grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bulkResults.added.map((student) => (
                    <div key={student.id} className="break-inside-avoid">
                      <TicketCard 
                        student={student} 
                        qrValue={getQRData(student)} 
                        small 
                        containerId={`card-container-${student.id}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
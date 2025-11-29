import React, { useEffect, useState } from 'react';
import { getTickets, deleteTicket, getBatches } from '../services/storageService';
import { TicketRecord, QRCodeData, BatchLog } from '../types';
import { TicketCard } from './TicketCard';
import { Search, Trash2, FileText, Loader2, Download, AlertCircle, History, Filter, ArrowRight, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

type ListTab = 'all' | 'batches';
type PdfLayout = 1 | 8 | 16;

export const TicketList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ListTab>('all');
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [batches, setBatches] = useState<BatchLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterBatchId, setFilterBatchId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Sort Ascending (Oldest First)
      const ticketData = await getTickets();
      setTickets(ticketData.sort((a, b) => a.createdAt - b.createdAt));
      
      // Sort Batches Newest First
      const batchData = await getBatches();
      setBatches(batchData.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this ticket? The QR code will no longer work.')) {
      await deleteTicket(id);
      loadData();
    }
  };

  const handleBatchSelect = (batchId: string) => {
    setFilterBatchId(batchId);
    setActiveTab('all');
  };

  const clearFilters = () => {
    setFilterBatchId(null);
    setSearch('');
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.className.toLowerCase().includes(search.toLowerCase());
    
    const matchesBatch = filterBatchId ? t.batchId === filterBatchId : true;

    return matchesSearch && matchesBatch;
  });

  const getQRData = (student: TicketRecord): string => {
    const data: QRCodeData = { id: student.id, v: 1 };
    return JSON.stringify(data);
  };

  const generatePdf = async (layout: PdfLayout) => {
    setShowLayoutMenu(false);
    if (filteredTickets.length === 0) return;
    
    setIsGeneratingPdf(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4'); // Portrait, Millimeters, A4
      
      const config = {
        1: { cols: 1, rows: 1, w: 160, h: 0, xStart: 25, yStart: 40, xGap: 0, yGap: 0 },
        8: { cols: 2, rows: 4, w: 90, h: 0, xStart: 10, yStart: 10, xGap: 5, yGap: 5 },
        16: { cols: 4, rows: 4, w: 45, h: 0, xStart: 10, yStart: 10, xGap: 3, yGap: 3 }
      };

      const settings = config[layout];
      const ticketsPerPage = settings.cols * settings.rows;

      for (let i = 0; i < filteredTickets.length; i++) {
        const student = filteredTickets[i];
        const elementId = `card-container-${student.id}`;
        const element = document.getElementById(elementId);
        
        if (element) {
          // Capture element as high-res canvas
          const canvas = await html2canvas(element, {
            scale: layout === 16 ? 4 : 2, // Higher scale for better quality
            backgroundColor: '#ffffff', // Force white background
            logging: false,
            useCORS: true 
          });
          
          const imgData = canvas.toDataURL('image/png');
          
          const imgH = (canvas.height * settings.w) / canvas.width;
          
          // PDF Page Settings
          if (i > 0 && i % ticketsPerPage === 0) {
            doc.addPage();
          }

          const indexOnPage = i % ticketsPerPage;
          const col = indexOnPage % settings.cols;
          const row = Math.floor(indexOnPage / settings.cols);

          const x = settings.xStart + (col * (settings.w + settings.xGap));
          const y = settings.yStart + (row * (imgH + settings.yGap));
          
          doc.addImage(imgData, 'PNG', x, y, settings.w, imgH);
          
          // Add simple footer text below the image for 1-up layout
          if (layout === 1) {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`Ticket ${i + 1} of ${filteredTickets.length} • SecureEvent Pass`, 105, 280, { align: 'center' });
          }
        }
      }
      
      doc.save(filterBatchId ? 'batch-tickets-export.pdf' : 'event-tickets-export.pdf');
      
    } catch (err) {
      console.error("PDF Generation Failed:", err);
      alert("Failed to generate PDF bundle. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const downloadSingleQR = (ticket: TicketRecord) => {
    const svgId = `qr-${ticket.id}`;
    const svg = document.getElementById(svgId);
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
          downloadLink.download = `ticket-${ticket.admissionNumber}.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p>Loading tickets from database...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      
      {/* Sub Navigation */}
      <div className="flex gap-4 border-b border-slate-700 pb-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-4 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'all' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <FileText className="w-4 h-4" /> All Tickets
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-3 px-4 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'batches' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <History className="w-4 h-4" /> Import History
        </button>
      </div>

      {activeTab === 'batches' ? (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
           <h2 className="text-xl font-bold text-white mb-6">Bulk Import History</h2>
           {batches.length === 0 ? (
             <div className="text-center py-12 text-slate-500">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No bulk imports found.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {batches.map(batch => (
                  <div key={batch.id} className="bg-slate-900 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/50 transition-colors group">
                     <div className="flex justify-between items-start mb-4">
                        <div className="bg-indigo-500/20 p-2 rounded-lg">
                           <FileText className="w-6 h-6 text-indigo-400" />
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(batch.timestamp).toLocaleDateString()}
                        </span>
                     </div>
                     <h3 className="text-white font-semibold text-lg mb-1 truncate" title={batch.name}>{batch.name}</h3>
                     <p className="text-slate-400 text-sm mb-6">{batch.count} Students</p>
                     
                     <button 
                       onClick={() => handleBatchSelect(batch.id)}
                       className="w-full bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 py-2 rounded-lg border border-slate-700 group-hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                     >
                        View & Export <ArrowRight className="w-4 h-4" />
                     </button>
                  </div>
                ))}
             </div>
           )}
        </div>
      ) : (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
               <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                 <FileText className="w-6 h-6 text-indigo-400" />
                 Ticket Manager
               </h2>
               
               {filterBatchId && (
                 <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm border border-indigo-500/30">
                    <Filter className="w-3 h-3" />
                    <span>Filtered by Batch</span>
                    <button onClick={clearFilters} className="hover:text-white ml-1"><Trash2 className="w-3 h-3" /></button>
                 </div>
               )}
            </div>
             
             <div className="flex gap-3 w-full md:w-auto items-center">
               <div className="relative flex-1 md:w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Search name, adm no..." 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                 />
               </div>
               
               <div className="relative">
                 <button 
                  onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                  disabled={isGeneratingPdf || filteredTickets.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                 >
                   {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                   {isGeneratingPdf ? 'Generating...' : filterBatchId ? 'Export Batch PDF' : 'Export PDF'}
                   <ChevronDown className="w-3 h-3 ml-1" />
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
             </div>
          </div>
  
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center">
              <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>No tickets found matching your search.</p>
              {filterBatchId && (
                <button onClick={clearFilters} className="text-indigo-400 mt-2 hover:underline text-sm">Clear Filters</button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTickets.map(ticket => (
                <div key={ticket.id} className="relative group">
                  <TicketCard 
                    student={ticket} 
                    qrValue={getQRData(ticket)} 
                    id={`qr-${ticket.id}`} 
                    containerId={`card-container-${ticket.id}`} 
                    small 
                  />
                  
                  {/* Overlay actions */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button 
                      onClick={() => downloadSingleQR(ticket)}
                      className="p-2 bg-slate-900/80 hover:bg-indigo-600 text-white rounded-full backdrop-blur-sm transition-colors shadow-lg"
                      title="Download QR Image"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(ticket.id)}
                      className="p-2 bg-slate-900/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors shadow-lg"
                      title="Delete Ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
  
                  {/* Status Indicator */}
                  {ticket.isUsed && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/90 text-white font-bold px-4 py-1 rounded border-2 border-white rotate-[-15deg] shadow-xl z-10 backdrop-blur-sm">
                       USED
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
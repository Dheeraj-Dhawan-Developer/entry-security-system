
import React, { useEffect, useState } from 'react';
import { getTickets } from '../services/storageService';
import { TicketRecord } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Users, UserCheck, Clock, FileSpreadsheet, Eye, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export const Stats: React.FC = () => {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    // Simple polling for demo purposes to keep stats fresh
    const load = async () => {
      const data = await getTickets();
      setTickets(data);
    };
    
    load();
    const interval = setInterval(load, 5000); // Poll every 5s for Firestore
    return () => clearInterval(interval);
  }, []);

  const total = tickets.length;
  const entered = tickets.filter(t => t.isUsed).length;
  const pending = total - entered;

  const chartData = [
    { name: 'Entered', value: entered, color: '#10b981' }, // Emerald
    { name: 'Pending', value: pending, color: '#6366f1' }, // Indigo
  ];

  const recentEntries = tickets
    .filter(t => t.isUsed)
    .sort((a, b) => (b.entryTimestamp || 0) - (a.entryTimestamp || 0))
    .slice(0, 5);
  
  const fullEntryLog = tickets
    .filter(t => t.isUsed)
    .sort((a, b) => (a.entryTimestamp || 0) - (b.entryTimestamp || 0));

  const downloadEntryLog = () => {
    if (fullEntryLog.length === 0) {
      alert("No guests have entered yet.");
      return;
    }

    // Map to simple format for Excel
    const exportData = fullEntryLog.map((t, index) => ({
      "Entry Order": index + 1,
      "Name": t.name,
      "Admission No": t.admissionNumber,
      "Class": t.className,
      "Entry Time": new Date(t.entryTimestamp!).toLocaleTimeString(),
      "Entry Date": new Date(t.entryTimestamp!).toLocaleDateString(),
      "Ticket ID": t.id
    }));

    // Create Sheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Log");
    
    // Save File
    const fileName = `Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-1 space-y-8">
      
      {/* Actions Row */}
      <div className="flex justify-end gap-3 no-print">
        <button 
          onClick={() => setShowLogModal(true)}
          disabled={entered === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors border backdrop-blur-sm ${
            entered === 0 
              ? 'bg-slate-800/50 text-slate-500 border-slate-700/50 cursor-not-allowed' 
              : 'bg-slate-800/80 text-indigo-300 border-indigo-500/30 hover:bg-slate-700 hover:text-white hover:border-indigo-500/50'
          }`}
        >
          <Eye className="w-4 h-4" />
          View Live Log
        </button>
        <button 
          onClick={downloadEntryLog}
          disabled={entered === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg ${
            entered === 0 
              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 hover:scale-105'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all"></div>
           <div className="p-4 bg-blue-500/20 rounded-2xl ring-1 ring-blue-500/30">
             <Users className="w-8 h-8 text-blue-400" />
           </div>
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Registered</p>
             <h3 className="text-4xl font-black text-white">{total}</h3>
           </div>
        </div>
        
        <div className="glass-card p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all"></div>
           <div className="p-4 bg-emerald-500/20 rounded-2xl ring-1 ring-emerald-500/30">
             <UserCheck className="w-8 h-8 text-emerald-400" />
           </div>
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Guests Entered</p>
             <h3 className="text-4xl font-black text-white">{entered}</h3>
           </div>
        </div>
        
        <div className="glass-card p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all"></div>
           <div className="p-4 bg-indigo-500/20 rounded-2xl ring-1 ring-indigo-500/30">
             <Clock className="w-8 h-8 text-indigo-400" />
           </div>
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Entry</p>
             <h3 className="text-4xl font-black text-white">{pending}</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="glass-card p-8 rounded-3xl min-h-[350px] flex flex-col">
          <h3 className="text-xl font-bold text-white mb-8">Attendance Overview</h3>
          <div className="flex-1 w-full h-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} tick={{fontSize: 12, fontWeight: 600}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '12px' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)', radius: 4}}
                />
                <Bar dataKey="value" barSize={40} radius={[0, 8, 8, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="glass-card p-8 rounded-3xl flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[350px] custom-scrollbar">
            {recentEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                 <Clock className="w-8 h-8 opacity-20" />
                 <p className="text-sm font-medium">No recent activity</p>
              </div>
            ) : (
              recentEntries.map(t => (
                <div key={t.id} className="bg-slate-900/40 hover:bg-slate-900/60 p-4 rounded-xl flex justify-between items-center border border-slate-700/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">
                        {t.name.charAt(0)}
                    </div>
                    <div>
                        <p className="text-slate-200 font-bold text-sm group-hover:text-white transition-colors">{t.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{t.className} • {t.admissionNumber}</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/10">
                    {t.entryTimestamp ? new Date(t.entryTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-white">Attendance Log</h2>
                <p className="text-slate-400 text-sm mt-1">{fullEntryLog.length} total entries</p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 sticky top-0 z-10 text-xs uppercase text-slate-500 font-bold tracking-wider backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Admission No</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4 text-right">Entry Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {fullEntryLog.map((t, i) => (
                    <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 font-mono">{i + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-200">{t.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-400">{t.admissionNumber}</td>
                      <td className="px-6 py-4"><span className="bg-slate-800 px-2 py-1 rounded text-xs">{t.className}</span></td>
                      <td className="px-6 py-4 font-mono text-emerald-400 text-right">
                        {t.entryTimestamp ? new Date(t.entryTimestamp).toLocaleTimeString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button 
                onClick={downloadEntryLog}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all hover:scale-105 shadow-lg"
              >
                <Download className="w-4 h-4" /> Download Excel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

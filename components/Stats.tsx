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
    { name: 'Entered', value: entered, color: '#22c55e' }, // Green
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
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      
      {/* Actions Row */}
      <div className="flex justify-end gap-3">
        <button 
          onClick={() => setShowLogModal(true)}
          disabled={entered === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
            entered === 0 
              ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' 
              : 'bg-slate-800 text-indigo-400 border-indigo-500/30 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          View Log
        </button>
        <button 
          onClick={downloadEntryLog}
          disabled={entered === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-lg ${
            entered === 0 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center gap-4">
           <div className="p-4 bg-blue-500/20 rounded-xl">
             <Users className="w-8 h-8 text-blue-400" />
           </div>
           <div>
             <p className="text-slate-400 text-sm font-medium">Total Registered</p>
             <h3 className="text-3xl font-bold text-white">{total}</h3>
           </div>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center gap-4">
           <div className="p-4 bg-green-500/20 rounded-xl">
             <UserCheck className="w-8 h-8 text-green-400" />
           </div>
           <div>
             <p className="text-slate-400 text-sm font-medium">Guests Entered</p>
             <h3 className="text-3xl font-bold text-white">{entered}</h3>
           </div>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center gap-4">
           <div className="p-4 bg-indigo-500/20 rounded-xl">
             <Clock className="w-8 h-8 text-indigo-400" />
           </div>
           <div>
             <p className="text-slate-400 text-sm font-medium">Pending Entry</p>
             <h3 className="text-3xl font-bold text-white">{pending}</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg min-h-[300px] flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Attendance Overview</h3>
          <div className="flex-1 w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                  cursor={{fill: 'transparent'}}
                />
                <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Entries</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[300px]">
            {recentEntries.length === 0 ? (
              <p className="text-slate-500 text-sm italic text-center py-10">No entries yet.</p>
            ) : (
              recentEntries.map(t => (
                <div key={t.id} className="bg-slate-900/50 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                  <div>
                    <p className="text-slate-200 font-medium">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.className} • {t.admissionNumber}</p>
                  </div>
                  <span className="text-xs text-green-400 font-mono bg-green-400/10 px-2 py-1 rounded">
                    {t.entryTimestamp ? new Date(t.entryTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">Full Attendance Log</h2>
                <p className="text-slate-400 text-sm">{fullEntryLog.length} entries recorded</p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 sticky top-0 z-10 text-xs uppercase text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Admission No</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {fullEntryLog.map((t, i) => (
                    <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 text-slate-500 font-mono">{i + 1}</td>
                      <td className="px-6 py-4 font-medium text-white">{t.name}</td>
                      <td className="px-6 py-4">{t.admissionNumber}</td>
                      <td className="px-6 py-4">{t.className}</td>
                      <td className="px-6 py-4 font-mono text-green-400">
                        {t.entryTimestamp ? new Date(t.entryTimestamp).toLocaleTimeString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-2xl flex justify-end">
              <button 
                onClick={downloadEntryLog}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium"
              >
                <Download className="w-4 h-4" /> Download Excel List
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
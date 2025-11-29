
import React from 'react';
import QRCode from 'react-qr-code';
import { Student } from '../types';

interface TicketCardProps {
  student: Student;
  qrValue: string;
  small?: boolean;
  id?: string;
  containerId?: string;
}

export const TicketCard: React.FC<TicketCardProps> = ({ student, qrValue, small, id, containerId }) => {
  const formattedDate = new Date(student.createdAt).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div 
      id={containerId} 
      className={`bg-white rounded-3xl overflow-hidden shadow-2xl relative border-2 border-slate-200 ${small ? 'w-full' : 'w-full'} group transition-transform hover:shadow-3xl`}
    >
      {/* Ticket Head */}
      <div className={`${small ? 'p-4' : 'p-6'} bg-gradient-to-r from-indigo-600 to-purple-600 text-center relative overflow-hidden`}>
        {/* CSS Pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle,rgba(255,255,255,0.8)_2px,transparent_2px)] bg-[length:12px_12px]"></div>
        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        <h3 className="text-white font-black text-xl relative z-10 tracking-widest uppercase">SECURE PASS</h3>
      </div>

      {/* Ticket Body */}
      <div className={`${small ? 'p-5' : 'p-8'} flex flex-col items-center bg-white relative`}>
          <div className="bg-white p-2 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] border-2 border-slate-100">
            <QRCode
              id={id}
              value={qrValue}
              size={small ? 120 : 180}
              level="M" 
              fgColor="#1e1b4b"
              bgColor="#ffffff"
            />
          </div>
          
          <div className="mt-5 text-center w-full">
            <h4 className={`${small ? 'text-lg' : 'text-2xl'} font-extrabold text-slate-900 break-words line-clamp-2`}>{student.name}</h4>
            <div className="flex justify-center gap-2 mt-3 text-slate-600 text-sm font-bold">
              <span className="bg-slate-100 px-3 py-1 rounded-md border border-slate-200 text-slate-700">
                {student.className}
              </span>
              <span className="bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 text-indigo-700 font-mono">
                {student.admissionNumber}
              </span>
            </div>
            
            {/* Timestamp Display */}
            <div className="mt-4 text-[10px] text-slate-400 font-mono pt-3 border-t border-slate-100 w-full tracking-wider uppercase">
               Generated: {formattedDate}
            </div>
          </div>
      </div>
      
      {/* Decorative Circles (Ticket Notches) */}
      <div className={`absolute ${small ? 'top-[58px]' : 'top-[74px]'} -left-3 w-6 h-6 bg-slate-900 rounded-full border-r-2 border-slate-600`}></div>
      <div className={`absolute ${small ? 'top-[58px]' : 'top-[74px]'} -right-3 w-6 h-6 bg-slate-900 rounded-full border-l-2 border-slate-600`}></div>
    </div>
  );
};

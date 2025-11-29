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
      className={`bg-white rounded-3xl overflow-hidden shadow-2xl relative border-2 border-slate-200 ${small ? 'w-full' : 'w-full'}`}
    >
      {/* Ticket Head */}
      <div className={`${small ? 'p-4' : 'p-6'} bg-indigo-600 text-center relative overflow-hidden`}>
        {/* CSS Pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[length:8px_8px]"></div>
        <h3 className="text-white font-bold text-xl relative z-10">EVENT PASS</h3>
      </div>

      {/* Ticket Body */}
      <div className={`${small ? 'p-4' : 'p-8'} flex flex-col items-center bg-white`}>
          <div className="bg-white p-2 rounded-xl shadow-inner border border-slate-100">
            <QRCode
              id={id}
              value={qrValue}
              size={small ? 120 : 180}
              level="M" 
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
          
          <div className="mt-4 text-center w-full">
            <h4 className={`${small ? 'text-lg' : 'text-2xl'} font-bold text-slate-800 break-words line-clamp-2`}>{student.name}</h4>
            <div className="flex justify-center gap-2 mt-2 text-slate-500 text-sm font-medium">
              <span className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {student.className}
              </span>
              <span className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {student.admissionNumber}
              </span>
            </div>
            
            {/* Timestamp Display */}
            <div className="mt-3 text-xs text-slate-400 font-mono pt-2 border-t border-slate-100 w-full">
               Generated: {formattedDate}
            </div>
          </div>
      </div>
      
      {/* Decorative Circles */}
      <div className={`absolute ${small ? 'top-[60px]' : 'top-[76px]'} -left-3 w-6 h-6 bg-slate-900 rounded-full`}></div>
      <div className={`absolute ${small ? 'top-[60px]' : 'top-[76px]'} -right-3 w-6 h-6 bg-slate-900 rounded-full`}></div>
    </div>
  );
};
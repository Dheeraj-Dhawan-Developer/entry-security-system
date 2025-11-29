export interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  className: string;
  createdAt: number;
  batchId?: string; // Links student to a specific bulk import
}

export interface TicketStatus {
  isUsed: boolean;
  entryTimestamp?: number;
}

// The full object stored in "Database"
export interface TicketRecord extends Student, TicketStatus {}

// The minimal data stored in the QR Code
export interface QRCodeData {
  id: string;
  v: number; // version check
}

export interface BatchLog {
  id: string;
  name: string;
  timestamp: number;
  count: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  REGISTER = 'REGISTER',
  SCANNER = 'SCANNER',
  TICKETS = 'TICKETS'
}
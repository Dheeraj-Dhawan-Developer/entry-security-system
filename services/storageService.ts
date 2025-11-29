import { TicketRecord, Student, BatchLog } from '../types';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  writeBatch,
  updateDoc,
  deleteDoc,
  orderBy,
  getDoc
} from "firebase/firestore";

const TICKETS_COLLECTION = 'tickets';
const BATCHES_COLLECTION = 'batches';

// Helper to check if DB is ready
const checkDb = () => {
  if (!db) throw new Error("Database not connected. Please complete the setup screen.");
};

export const getTickets = async (): Promise<TicketRecord[]> => {
  checkDb();
  try {
    const q = query(collection(db, TICKETS_COLLECTION));
    const snapshot = await getDocs(q);
    const tickets = snapshot.docs.map(doc => doc.data() as TicketRecord);
    return tickets;
  } catch (e) {
    console.error("Failed to load tickets from Firebase", e);
    return [];
  }
};

export const getBatches = async (): Promise<BatchLog[]> => {
  checkDb();
  try {
    const q = query(collection(db, BATCHES_COLLECTION), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as BatchLog);
  } catch (e) {
    console.error("Failed to load batches", e);
    return [];
  }
};

export const saveTicket = async (student: Student): Promise<TicketRecord> => {
  checkDb();
  const ticketsCollection = collection(db, TICKETS_COLLECTION);
  
  // Check for duplicate admission number
  const q = query(ticketsCollection, where("admissionNumber", "==", student.admissionNumber));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    throw new Error(`Student with Admission No. ${student.admissionNumber} already exists.`);
  }

  const newTicket: TicketRecord = {
    ...student,
    isUsed: false
  };

  await setDoc(doc(db, TICKETS_COLLECTION, student.id), newTicket);
  return newTicket;
};

export const saveBulkTickets = async (students: Student[], batchName: string): Promise<{ added: Student[], failed: { name: string, reason: string }[] }> => {
  checkDb();
  
  const added: Student[] = [];
  const failed: { name: string, reason: string }[] = [];
  
  // 1. Fetch all existing admission numbers to check duplicates efficiently
  const allTicketsSnapshot = await getDocs(collection(db, TICKETS_COLLECTION));
  const existingAdmNumbers = new Set(allTicketsSnapshot.docs.map(d => d.data().admissionNumber));
  const currentBatchAdmNumbers = new Set<string>();

  // Create Batch ID
  const batchId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
  const batch = writeBatch(db);
  
  const BATCH_SIZE_LIMIT = 400;
  let operationCount = 0;
  const batchesToCommit: any[] = [batch];

  let currentBatch = batch;

  students.forEach(s => {
    if (existingAdmNumbers.has(s.admissionNumber)) {
        failed.push({ name: s.name, reason: `Already registered (${s.admissionNumber})` });
    } else if (currentBatchAdmNumbers.has(s.admissionNumber)) {
        failed.push({ name: s.name, reason: `Duplicate in file (${s.admissionNumber})` });
    } else {
        const ticket: TicketRecord = { 
          ...s, 
          isUsed: false,
          batchId: batchId 
        };
        
        const ref = doc(db, TICKETS_COLLECTION, s.id);
        currentBatch.set(ref, ticket);
        
        added.push({ ...s, batchId });
        currentBatchAdmNumbers.add(s.admissionNumber);
        operationCount++;

        if (operationCount >= BATCH_SIZE_LIMIT) {
            const newBatch = writeBatch(db);
            batchesToCommit.push(newBatch);
            currentBatch = newBatch;
            operationCount = 0;
        }
    }
  });

  if (added.length > 0) {
    const newBatchLog: BatchLog = {
      id: batchId,
      name: batchName,
      timestamp: Date.now(),
      count: added.length
    };
    
    const batchLogRef = doc(db, BATCHES_COLLECTION, batchId);
    currentBatch.set(batchLogRef, newBatchLog);

    for (const b of batchesToCommit) {
        await b.commit();
    }
  }
  
  return { added, failed };
};

export const deleteTicket = async (id: string): Promise<void> => {
  checkDb();
  await deleteDoc(doc(db, TICKETS_COLLECTION, id));
};

export const validateAndEnter = async (ticketId: string): Promise<{ success: boolean; message: string; record?: TicketRecord }> => {
  checkDb();
  
  const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
  
  const docSnap = await getDoc(ticketRef);

  if (!docSnap.exists()) {
    return { success: false, message: 'Invalid Ticket ID. Access Denied.' };
  }

  const record = docSnap.data() as TicketRecord;

  if (record.isUsed) {
    return { 
      success: false, 
      message: `ALREADY USED at ${new Date(record.entryTimestamp || 0).toLocaleTimeString()}`,
      record 
    };
  }

  const entryTimestamp = Date.now();
  await updateDoc(ticketRef, {
      isUsed: true,
      entryTimestamp: entryTimestamp
  });

  return { success: true, message: 'Access Granted.', record: { ...record, isUsed: true, entryTimestamp } };
};

export const clearDatabase = async () => {
  console.warn("Clear database not supported in Firestore mode via app.");
};
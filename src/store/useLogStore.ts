import { create } from 'zustand';
import { AgentLog } from '@/types';

interface LogStore {
  agentLogs: AgentLog[];
  addAgentLog: (logData: Omit<AgentLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  agentLogs: [],
  addAgentLog: (logData) => set((state) => {
    const newLog: AgentLog = {
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date(),
      ...logData
    };
    return { agentLogs: [newLog, ...state.agentLogs].slice(0, 50) };
  }),
  clearLogs: () => set({ agentLogs: [] }),
}));

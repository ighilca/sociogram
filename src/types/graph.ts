export interface TeamMember {
  id: string;
  label: string;
  role: string;
  department: string;
  x?: number;
  y?: number;
}

export interface CollaborationEdge {
  source: string;
  target: string;
  score: number;  // 0-4 scale
  direction: 'outgoing' | 'incoming';
  timestamp: string;
}

export interface GraphData {
  nodes: TeamMember[];
  edges: CollaborationEdge[];
}

export interface CollaborationScore {
  from: string;
  to: string;
  score: number;
  timestamp: string;
}

export const COLLABORATION_COLORS = {
  0: '#DF7373', // rouge - aucune collaboration
  1: '#FA9500', // orange - collaboration minimale
  2: '#5FA8D3', // bleu - collaboration modérée
  3: '#415D43', // hunter-green - bonne collaboration
  4: '#111D13', // eerie-black - collaboration optimale
}; 
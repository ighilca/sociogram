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
  0: '#d32f2f', // rouge foncé - aucune collaboration
  1: '#f57c00', // orange foncé - collaboration minimale
  2: '#fbc02d', // jaune foncé - collaboration modérée
  3: '#388e3c', // vert moyen - bonne collaboration
  4: '#1b5e20', // vert foncé - collaboration optimale
}; 
import { useEffect, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { EdgeCurvedArrowProgram } from "@sigma/edge-curve";
import { TeamMember, CollaborationEdge } from '../types/graph';
import { COLLABORATION_COLORS } from '../types/graph';
import { Box, Typography } from '@mui/material';
import saveAsPNG from '../utils/saveAsPNG';

interface GraphViewerProps {
  data: {
    nodes: TeamMember[];
    edges: CollaborationEdge[];
  };
  nodeSize: number;
  onEvaluate: (nodeId: string) => void;
  nameFilter: string;
  departmentFilter: string;
}

const calculateAverageScore = (nodeId: string, edges: CollaborationEdge[]): number => {
  const receivedEdges = edges.filter(edge => edge.target === nodeId);
  return receivedEdges.length > 0
    ? receivedEdges.reduce((sum, edge) => sum + edge.score, 0) / receivedEdges.length
    : 0;
};

const calculateNodeSize = (nodeId: string, edges: CollaborationEdge[], baseSize: number): number => {
  const avgScore = calculateAverageScore(nodeId, edges);
  return baseSize * (1 + (avgScore * 0.5));
};

const calculateNodeColor = (nodeId: string, edges: CollaborationEdge[]): string => {
  const avgScore = calculateAverageScore(nodeId, edges);
  const roundedScore = Math.ceil(avgScore) as keyof typeof COLLABORATION_COLORS;
  return COLLABORATION_COLORS[roundedScore] || COLLABORATION_COLORS[0];
};

const GraphLegend = () => {
  const colorNames = {
    '#DF7373': 'Rouge',
    '#FA9500': 'Orange',
    '#5FA8D3': 'Bleu',
    '#415D43': 'Vert',
    '#111D13': 'Noir',
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      gap: 2, 
      mt: 1,
      py: 1,
      px: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
      overflowX: 'auto',
      '&::-webkit-scrollbar': {
        display: 'none'
      },
      msOverflowStyle: 'none',  /* IE and Edge */
      scrollbarWidth: 'none',  /* Firefox */
    }}>
      {Object.entries(COLLABORATION_COLORS).map(([score, color]) => (
        <Box key={score} sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          minWidth: 'fit-content',
          position: 'relative',
          '&:hover .color-name': {
            display: 'block',
          }
        }}>
          <Box sx={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            backgroundColor: color,
            border: '1px solid #000',
            flexShrink: 0,
            cursor: 'help',
          }} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {score === '0' ? 'Aucune' : 
             score === '1' ? 'Minimale' :
             score === '2' ? 'Modérée' :
             score === '3' ? 'Bonne' :
             'Optimale'}
          </Typography>
          <Box className="color-name" sx={{
            display: 'none',
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            mb: 1,
          }}>
            {colorNames[color]}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default function GraphViewer({ data, nodeSize, onEvaluate, nameFilter, departmentFilter }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const draggedNodeRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDownload = async () => {
    if (!sigmaRef.current) return;
    await saveAsPNG(sigmaRef.current);
  };

  // Initialize graph only once
  useEffect(() => {
    if (!containerRef.current) return;

    // Create a new graph instance
    const graph = new Graph();
    graphRef.current = graph;

    // Initialize sigma
    sigmaRef.current = new Sigma(graph, containerRef.current, {
      minCameraRatio: 0.1,
      maxCameraRatio: 5,
      labelRenderedSizeThreshold: 0,
      labelFont: "monospace",
      defaultNodeColor: '#4169E1',
      defaultEdgeColor: '#000000',
      renderLabels: true,
      renderEdgeLabels: false,
      labelSize: 14,
      labelWeight: 'bold',
      labelColor: { color: '#000000' },
      edgeProgramClasses: {
        curvedArrow: EdgeCurvedArrowProgram,
      },
    });

    // Add drag events
    sigmaRef.current.on('downNode', (e) => {
      setIsDragging(true);
      draggedNodeRef.current = e.node;
      sigmaRef.current?.getCamera().disable();
    });

    sigmaRef.current.getMouseCaptor().on('mousemove', (e) => {
      if (!draggedNodeRef.current || !graphRef.current || !sigmaRef.current) return;

      // Get new position of node
      const pos = sigmaRef.current.viewportToGraph(e);

      graphRef.current.setNodeAttribute(draggedNodeRef.current, 'x', pos.x);
      graphRef.current.setNodeAttribute(draggedNodeRef.current, 'y', pos.y);
    });

    sigmaRef.current.getMouseCaptor().on('mouseup', () => {
      draggedNodeRef.current = null;
      setIsDragging(false);
      sigmaRef.current?.getCamera().enable();
    });

    // Add click event listener
    sigmaRef.current.on('clickNode', (event) => {
      if (!isDragging) {
        const node = event.node;
        onEvaluate(node);
      }
    });

    // Expose zoom methods on the container
    if (containerRef.current) {
      (containerRef.current as any).zoomIn = () => {
        if (sigmaRef.current) {
          const camera = sigmaRef.current.getCamera();
          camera.animatedZoom({ duration: 600 });
        }
      };

      (containerRef.current as any).zoomOut = () => {
        if (sigmaRef.current) {
          const camera = sigmaRef.current.getCamera();
          camera.animatedUnzoom({ duration: 600 });
        }
      };

      (containerRef.current as any).center = () => {
        if (sigmaRef.current) {
          const camera = sigmaRef.current.getCamera();
          camera.animatedReset({ duration: 600 });
        }
      };
    }

    return () => {
      if (sigmaRef.current) {
        sigmaRef.current.kill();
      }
    };
  }, []); // Empty dependency array means this only runs once

  // Update graph data when props change
  useEffect(() => {
    if (!graphRef.current || !sigmaRef.current) return;

    const graph = graphRef.current;

    // Clear all existing nodes and edges
    graph.clear();

    // Filtrer les nœuds en fonction des critères
    let filteredNodes = data.nodes;
    let filteredEdges = data.edges;

    // Si un filtre par nom est actif
    if (nameFilter) {
      // Trouver d'abord les nœuds qui correspondent au nom
      const directlyFilteredNodes = data.nodes.filter(node =>
        node.label.toLowerCase().includes(nameFilter.toLowerCase())
      );

      // Trouver toutes les connexions directes de ces nœuds
      const connectedNodeIds = new Set<string>();
      directlyFilteredNodes.forEach(node => {
        // Ajouter le nœud filtré
        connectedNodeIds.add(node.id);
        
        // Trouver toutes les connexions directes
        data.edges.forEach(edge => {
          if (edge.source === node.id) {
            connectedNodeIds.add(edge.target);
          }
          if (edge.target === node.id) {
            connectedNodeIds.add(edge.source);
          }
        });
      });

      // Filtrer les nœuds et les arêtes
      filteredNodes = data.nodes.filter(node => connectedNodeIds.has(node.id));
      filteredEdges = data.edges.filter(edge =>
        // Ne garder que les arêtes qui ont au moins une extrémité dans les nœuds filtrés directement
        directlyFilteredNodes.some(n => n.id === edge.source || n.id === edge.target)
      );
    }

    // Si un filtre par département est actif
    if (departmentFilter) {
      // Filtrer les nœuds par département
      const departmentNodes = filteredNodes.filter(node =>
        node.department === departmentFilter
      );
      
      // Garder uniquement les arêtes entre les membres du même département
      filteredEdges = filteredEdges.filter(edge =>
        departmentNodes.some(n => n.id === edge.source) &&
        departmentNodes.some(n => n.id === edge.target)
      );
      
      filteredNodes = departmentNodes;
    }

    // Ajouter les nœuds filtrés
    filteredNodes.forEach((node) => {
      graph.addNode(node.id, {
        ...node,
        x: Math.random() * 10 - 5,
        y: Math.random() * 10 - 5,
        size: calculateNodeSize(node.id, data.edges, nodeSize),
        color: calculateNodeColor(node.id, data.edges),
        label: node.label || '',
      });
    });

    // Ajouter les arêtes filtrées
    filteredEdges.forEach((edge) => {
      try {
        graph.addEdge(edge.source, edge.target, {
          size: 3,
          label: edge.score.toString(),
          color: COLLABORATION_COLORS[edge.score as keyof typeof COLLABORATION_COLORS] || '#000000',
          type: 'curvedArrow',
          forceLabel: true,
          labelSize: 12,
          labelColor: '#000000',
          curvature: 0.3,
        });
      } catch (err) {
        console.warn(`Impossible d'ajouter l'arête ${edge.source}->${edge.target}:`, err);
      }
    });

    // Force a refresh of the graph
    sigmaRef.current.refresh();

  }, [data, nodeSize, nameFilter, departmentFilter]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2, 
      height: '100%',
      width: '100%',
      position: 'relative',
    }}>
      <div 
        ref={containerRef} 
        className="sigma-container"
        style={{
          height: '100%',
          width: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
          backgroundColor: '#fff',
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      <GraphLegend />
      <Box 
        onClick={handleDownload}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          backgroundColor: '#000',
          color: '#fff',
          padding: '8px 16px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          border: '2px solid #000',
          '&:hover': {
            backgroundColor: '#fff',
            color: '#000',
          }
        }}
      >
        TÉLÉCHARGER LE GRAPHE
      </Box>
    </Box>
  );
} 
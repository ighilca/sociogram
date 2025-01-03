import { useEffect, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { EdgeCurvedArrowProgram } from "@sigma/edge-curve";
import { TeamMember, CollaborationEdge } from '../types/graph';
import { COLLABORATION_COLORS } from '../types/graph';
import { Box, Typography } from '@mui/material';

interface GraphViewerProps {
  data: {
    nodes: TeamMember[];
    edges: CollaborationEdge[];
  };
  nodeSize: number;
  onEvaluate: (memberId: string) => void;
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

const GraphLegend = () => (
  <Box sx={{ 
    display: 'flex', 
    justifyContent: 'center', 
    gap: 3, 
    mt: 2,
    flexWrap: 'wrap',
    padding: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid #ccc',
    borderRadius: '4px',
  }}>
    {Object.entries(COLLABORATION_COLORS).map(([score, color]) => (
      <Box key={score} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ 
          width: 20, 
          height: 20, 
          borderRadius: '50%', 
          backgroundColor: color,
          border: '1px solid #000'
        }} />
        <Typography variant="body2">
          Score {score} {score === '0' ? '(aucune collaboration)' : 
                       score === '1' ? '(collaboration minimale)' :
                       score === '2' ? '(collaboration modérée)' :
                       score === '3' ? '(bonne collaboration)' :
                       '(collaboration optimale)'}
        </Typography>
      </Box>
    ))}
  </Box>
);

export default function GraphViewer({ data, nodeSize, onEvaluate }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const draggedNodeRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    if (!graphRef.current) return;

    const graph = graphRef.current;

    // Update nodes
    const existingNodes = new Set(graph.nodes());
    
    // Remove nodes that no longer exist
    existingNodes.forEach(nodeId => {
      if (!data.nodes.find(n => n.id === nodeId)) {
        graph.dropNode(nodeId);
      }
    });

    // Add or update nodes
    data.nodes.forEach((node) => {
      if (graph.hasNode(node.id)) {
        // Update existing node
        graph.setNodeAttribute(node.id, 'label', node.label);
        graph.setNodeAttribute(node.id, 'size', calculateNodeSize(node.id, data.edges, nodeSize));
        graph.setNodeAttribute(node.id, 'color', calculateNodeColor(node.id, data.edges));
        // Don't update x,y to preserve position
      } else {
        // Add new node
        graph.addNode(node.id, {
          ...node,
          x: Math.random() * 10 - 5,
          y: Math.random() * 10 - 5,
          size: calculateNodeSize(node.id, data.edges, nodeSize),
          color: calculateNodeColor(node.id, data.edges),
          label: node.label,
        });
      }
    });

    // Update edges
    graph.clearEdges();
    data.edges.forEach((edge) => {
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
  }, [data, nodeSize]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      <div 
        ref={containerRef} 
        className="sigma-container"
        style={{ 
          height: '600px',
          width: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff'
        }} 
      />
      <GraphLegend />
    </Box>
  );
} 
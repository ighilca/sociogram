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
  nameFilter: string;
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
  }}>
    {Object.entries(COLLABORATION_COLORS).map(([score, color]) => (
      <Box key={score} sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.5,
        minWidth: 'fit-content',
      }}>
        <Box sx={{ 
          width: 12, 
          height: 12, 
          borderRadius: '50%', 
          backgroundColor: color,
          border: '1px solid #000',
          flexShrink: 0,
        }} />
        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          {score === '0' ? 'Aucune' : 
           score === '1' ? 'Minimale' :
           score === '2' ? 'Modérée' :
           score === '3' ? 'Bonne' :
           'Optimale'}
        </Typography>
      </Box>
    ))}
  </Box>
);

export default function GraphViewer({ data, nodeSize, onEvaluate, nameFilter }: GraphViewerProps) {
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

    // Clear all existing nodes and edges
    graph.clear();

    if (!nameFilter) {
      // If no filter, show all nodes and edges
      data.nodes.forEach((node) => {
        graph.addNode(node.id, {
          ...node,
          x: Math.random() * 10 - 5,
          y: Math.random() * 10 - 5,
          size: calculateNodeSize(node.id, data.edges, nodeSize),
          color: calculateNodeColor(node.id, data.edges),
          label: node.label || '',
        });
      });

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
    } else {
      // Find nodes that match the filter
      const filteredNodes = data.nodes.filter(node => 
        node.label?.toLowerCase().includes(nameFilter.toLowerCase())
      );

      // Keep track of added nodes to avoid duplicates
      const addedNodes = new Set<string>();

      // For each filtered node, add it and its direct connections
      filteredNodes.forEach(filteredNode => {
        // Add the filtered node if not already added
        if (!addedNodes.has(filteredNode.id)) {
          graph.addNode(filteredNode.id, {
            ...filteredNode,
            x: 0, // Place filtered node at center
            y: 0,
            size: calculateNodeSize(filteredNode.id, data.edges, nodeSize),
            color: calculateNodeColor(filteredNode.id, data.edges),
            label: filteredNode.label || '',
          });
          addedNodes.add(filteredNode.id);
        }

        // Find all edges connected to this node
        const connectedEdges = data.edges.filter(edge => 
          edge.source === filteredNode.id || edge.target === filteredNode.id
        );

        // Add connected nodes and edges
        connectedEdges.forEach((edge, index) => {
          const connectedNodeId = edge.source === filteredNode.id ? edge.target : edge.source;
          const connectedNode = data.nodes.find(n => n.id === connectedNodeId);

          if (connectedNode && !addedNodes.has(connectedNode.id)) {
            // Add connected node in a circle around the filtered node
            const angle = (2 * Math.PI * index) / connectedEdges.length;
            graph.addNode(connectedNode.id, {
              ...connectedNode,
              x: Math.cos(angle) * 5, // Arrange in a circle
              y: Math.sin(angle) * 5,
              size: calculateNodeSize(connectedNode.id, data.edges, nodeSize),
              color: calculateNodeColor(connectedNode.id, data.edges),
              label: connectedNode.label || '',
            });
            addedNodes.add(connectedNode.id);
          }

          // Add the edge if both nodes exist
          if (addedNodes.has(edge.source) && addedNodes.has(edge.target)) {
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
          }
        });
      });
    }

    // Force a refresh of the graph
    sigmaRef.current?.refresh();

  }, [data, nodeSize, nameFilter]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2, 
      height: '100%',
      width: '100%',
    }}>
      <div 
        ref={containerRef} 
        className="sigma-container"
        style={{ 
          height: '100%',
          width: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
          border: '2px solid black',
          borderRadius: '4px',
          backgroundColor: '#fff'
        }} 
      />
      <GraphLegend />
    </Box>
  );
} 
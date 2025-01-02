import { useEffect, useRef, useCallback, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { TeamMember, CollaborationEdge } from '../types/graph';
import { COLLABORATION_COLORS } from '../types/graph';

interface GraphViewerProps {
  data: {
    nodes: TeamMember[];
    edges: CollaborationEdge[];
  };
  nodeSize: number;
  onEvaluate: (memberId: string) => void;
}

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

    // Initialize sigma with updated settings
    sigmaRef.current = new Sigma(graph, containerRef.current, {
      minCameraRatio: 0.1,
      maxCameraRatio: 5,
      labelRenderedSizeThreshold: 0,
      labelFont: "monospace",
      defaultNodeColor: '#4169E1',
      defaultEdgeColor: '#000000',
      renderLabels: true,
      renderEdgeLabels: true,
      labelSize: 14,
      labelWeight: 'bold',
      labelColor: { color: '#000000' },
      edgeLabelSize: 12,
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
        graph.setNodeAttribute(node.id, 'size', nodeSize);
        // Don't update x,y to preserve position
      } else {
        // Add new node
        graph.addNode(node.id, {
          ...node,
          x: Math.random() * 10 - 5,
          y: Math.random() * 10 - 5,
          size: nodeSize,
          color: '#4169E1',
          label: node.label,
        });
      }
    });

    // Clear existing edges
    graph.clearEdges();

    // Process edges and create a map of bidirectional relationships
    const edgeMap = new Map();

    data.edges.forEach((edge) => {
      const key = [edge.source, edge.target].sort().join('-');
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { forward: null, backward: null });
      }
      const entry = edgeMap.get(key);
      
      if (edge.source < edge.target) {
        entry.forward = edge;
      } else {
        entry.backward = edge;
      }
    });

    // Add edges to the graph with offset control points
    edgeMap.forEach(({ forward, backward }, key) => {
      if (forward && backward) {
        // Calculate control points for curved edges
        const sourceNode = graph.getNodeAttributes(forward.source);
        const targetNode = graph.getNodeAttributes(forward.target);
        
        // Calculate midpoint and perpendicular offset
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const offset = len * 0.2;

        // Create control points for both curves
        const cp1 = {
          x: midX + (dy / len) * offset,
          y: midY - (dx / len) * offset
        };
        const cp2 = {
          x: midX - (dy / len) * offset,
          y: midY + (dx / len) * offset
        };

        // Add forward edge with control point
        graph.addEdgeWithKey(`${key}-1`, forward.source, forward.target, {
          size: 2,
          label: forward.score.toString(),
          color: COLLABORATION_COLORS[forward.score as keyof typeof COLLABORATION_COLORS] || '#000000',
          controlPoints: [cp1],
        });

        // Add backward edge with control point
        graph.addEdgeWithKey(`${key}-2`, backward.source, backward.target, {
          size: 2,
          label: backward.score.toString(),
          color: COLLABORATION_COLORS[backward.score as keyof typeof COLLABORATION_COLORS] || '#000000',
          controlPoints: [cp2],
        });
      } else {
        // Unidirectional edge
        const edge = forward || backward;
        if (edge) {
          graph.addEdgeWithKey(key, edge.source, edge.target, {
            size: 2,
            label: edge.score.toString(),
            color: COLLABORATION_COLORS[edge.score as keyof typeof COLLABORATION_COLORS] || '#000000',
          });
        }
      }
    });

  }, [data, nodeSize]);

  return (
    <div 
      ref={containerRef} 
      className="sigma-container"
      style={{ 
        height: '100%',
        width: '100%',
        cursor: isDragging ? 'grabbing' : 'grab'
      }} 
    />
  );
} 
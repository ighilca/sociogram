import { useState } from 'react';
import { Container, Box } from '@mui/material';
import GraphViewer from './components/Graph';

export default function App() {
  return <AppContent />;
}

function AppContent() {
  const [graphData] = useState({
    nodes: [],
    edges: []
  });

  const [nameFilter] = useState('');
  const [departmentFilter] = useState('');

  return (
    <Container maxWidth={false}>
      <Box sx={{ width: '100%', typography: 'body1' }}>
        <Box sx={{ height: '100%', width: '100%' }}>
          <GraphViewer
            data={graphData}
            nodeSize={10}
            onEvaluate={() => {}}
            nameFilter={nameFilter}
            departmentFilter={departmentFilter}
          />
        </Box>
      </Box>
    </Container>
  );
}


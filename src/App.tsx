import { useState } from 'react';
import { Container, Box } from '@mui/material';
import Tab from '@mui/material/Tab';
import { useAuth } from './contexts/AuthContext';
import GraphViewer from './components/Graph';

export default function App() {
  return <AppContent />;
}

function AppContent() {
  const { session } = useAuth();
  const [selectedTab, setSelectedTab] = useState('1');
  const [nameFilter, setNameFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [graphData, setGraphData] = useState({
    nodes: [],
    edges: []
  });

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
  };

  const handleEvaluate = () => {
    // Fonction vide pour le moment
  };

  // Toujours afficher le contenu principal
  return (
    <Container maxWidth={false}>
      <Box sx={{ width: '100%', typography: 'body1' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Graphe" value="1" />
          <Tab label="Évaluation" value="2" />
        </Box>
        <Box>
          <Box sx={{ height: '100%', width: '100%' }}>
            <GraphViewer
              data={graphData}
              nodeSize={10}
              onEvaluate={handleEvaluate}
              nameFilter={nameFilter}
              departmentFilter={departmentFilter}
            />
          </Box>
        </Box>
      </Box>
    </Container>
  );
}


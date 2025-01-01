import { useState, useEffect, useRef } from 'react'
import { Container, Typography, Box, CircularProgress, Button, Alert, Snackbar, Tab, Tabs } from '@mui/material'
import GraphViewer from './components/Graph'
import Toolbar from './components/Toolbar'
import CollaborationForm from './components/CollaborationForm'
import AnalysisPanel from './components/AnalysisPanel'
import TeamManagement from './components/TeamManagement'
import { supabase } from './lib/supabase'
import { TeamMember, CollaborationEdge } from './types/graph'
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { createTheme, ThemeProvider } from '@mui/material/styles';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Brutalist theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#000000',
    },
    secondary: {
      main: '#ff0000',
    },
    background: {
      default: '#ffffff',
      paper: '#f0f0f0',
    },
  },
  typography: {
    fontFamily: 'monospace',
    h4: {
      fontWeight: 900,
      letterSpacing: '-1px',
      textTransform: 'uppercase',
    },
    button: {
      fontWeight: 700,
      letterSpacing: '1px',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          textTransform: 'uppercase',
          padding: '12px 24px',
          border: '2px solid black',
          '&:hover': {
            backgroundColor: '#000',
            color: '#fff',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: '2px solid black',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '1rem',
          textTransform: 'uppercase',
          '&.Mui-selected': {
            backgroundColor: '#000',
            color: '#fff',
          },
        },
      },
    },
  },
});

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodeSize, setNodeSize] = useState(10);
  const sigmaRef = useRef<any>(null);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [selectedMemberForEvaluation, setSelectedMemberForEvaluation] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [isAdmin] = useState(true); // In a real app, this would come from authentication
  
  const [graphData, setGraphData] = useState<{
    nodes: TeamMember[];
    edges: CollaborationEdge[];
  }>({
    nodes: [],
    edges: []
  });

  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          throw new Error('Configuration Supabase manquante. Vérifiez votre fichier .env.');
        }

        // Fetch data from Supabase
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('*');

        if (membersError) throw membersError;

        const { data: collaborations, error: collabsError } = await supabase
          .from('collaborations')
          .select('*');

        if (collabsError) throw collabsError;

        if (!members || !collaborations) {
          throw new Error('Aucune donnée trouvée');
        }

        // Set current user to first member for demo purposes
        if (members.length > 0 && !currentUser) {
          setCurrentUser(members[0].id);
        }

        // Filter out any potential duplicate nodes by ID
        const uniqueMembers = members.reduce((acc: any[], member: any) => {
          if (!acc.find((m: any) => m.id === member.id)) {
            acc.push(member);
          }
          return acc;
        }, []);

        setGraphData({
          nodes: uniqueMembers.map((member: any) => ({
            ...member,
            x: Math.random() * 10 - 5,
            y: Math.random() * 10 - 5,
          })),
          edges: collaborations,
        });

        setNotification({ message: 'Données chargées avec succès', type: 'success' });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
        setError(errorMessage);
        setNotification({ message: errorMessage, type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  const handleAddMember = async (member: Omit<TeamMember, 'id'>) => {
    try {
      // Check if a member with the same label already exists
      const { data: existingMembers } = await supabase
        .from('team_members')
        .select('label')
        .eq('label', member.label);

      if (existingMembers && existingMembers.length > 0) {
        throw new Error('Un membre avec ce nom existe déjà');
      }

      const { data, error } = await supabase
        .from('team_members')
        .insert([member])
        .select()
        .single();

      if (error) throw error;

      setGraphData(prev => ({
        ...prev,
        nodes: [...prev.nodes, { ...data, x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 }],
      }));

      setNotification({ message: 'Membre ajouté avec succès', type: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout du membre";
      setNotification({ message: errorMessage, type: 'error' });
    }
  };

  const handleUpdateMember = async (id: string, member: Partial<TeamMember>) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update(member)
        .eq('id', id);

      if (error) throw error;

      setGraphData(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => 
          node.id === id ? { ...node, ...member } : node
        ),
      }));

      setNotification({ message: 'Membre mis à jour avec succès', type: 'success' });
    } catch (err) {
      setNotification({ message: 'Erreur lors de la mise à jour du membre', type: 'error' });
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      setLoading(true);
      
      // Delete collaborations where member is source
      const { error: sourceError } = await supabase
        .from('collaborations')
        .delete()
        .eq('source', id);

      if (sourceError) throw sourceError;

      // Delete collaborations where member is target
      const { error: targetError } = await supabase
        .from('collaborations')
        .delete()
        .eq('target', id);

      if (targetError) throw targetError;

      // Then delete the member
      const { error: memberError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (memberError) throw memberError;

      // Update local state
      setGraphData(prev => ({
        nodes: prev.nodes.filter(node => node.id !== id),
        edges: prev.edges.filter(edge => edge.source !== id && edge.target !== id),
      }));

      setNotification({ message: 'Membre supprimé avec succès', type: 'success' });
    } catch (err) {
      console.error('Error deleting member:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression du membre';
      setNotification({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImportGraph = async (file: File) => {
    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.nodes || !data.edges) {
        throw new Error('Format de fichier invalide');
      }

      // Validate node structure
      const isValidNode = (node: any): node is TeamMember => {
        return typeof node.id === 'string' &&
               typeof node.label === 'string' &&
               typeof node.role === 'string' &&
               typeof node.department === 'string';
      };

      if (!data.nodes.every(isValidNode)) {
        throw new Error('Structure des nœuds invalide');
      }

      const nodes = data.nodes.map((node: TeamMember) => ({
        ...node,
        x: node.x ?? Math.random() * 10 - 5,
        y: node.y ?? Math.random() * 10 - 5,
      }));
      
      setGraphData({ nodes, edges: data.edges });
      setNotification({ message: 'Graphe importé avec succès', type: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Échec de l'importation du fichier";
      setError(errorMessage);
      setNotification({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const generateRandomGraph = async () => {
    try {
      setLoading(true);
      const departments = ['Engineering', 'Design', 'Management', 'Marketing', 'Sales'];
      const roles = ['Developer', 'Designer', 'Manager', 'Lead', 'Specialist'];
      
      const nodes: TeamMember[] = [];
      const nodeCount = 5; // Reduced for better manageability

      // Generate and insert random nodes
      for (let i = 0; i < nodeCount; i++) {
        const newMember = {
          label: `Member ${i + 1}`,
          role: roles[Math.floor(Math.random() * roles.length)],
          department: departments[Math.floor(Math.random() * departments.length)],
        };

        const { data: insertedMember, error: memberError } = await supabase
          .from('team_members')
          .insert([newMember])
          .select()
          .single();

        if (memberError) throw memberError;
        if (insertedMember) {
          nodes.push({
            ...insertedMember,
            x: Math.random() * 10 - 5,
            y: Math.random() * 10 - 5,
          });
        }
      }

      // Generate and insert random collaborations
      const edges: CollaborationEdge[] = [];
      const edgeCount = 8; // Reduced for better manageability

      for (let i = 0; i < edgeCount; i++) {
        const source = nodes[Math.floor(Math.random() * nodes.length)].id;
        const target = nodes[Math.floor(Math.random() * nodes.length)].id;
        
        if (source !== target) {
          const newCollaboration = {
            source,
            target,
            score: Math.floor(Math.random() * 4) + 1, // Score between 1 and 4
            direction: 'outgoing' as const,
            timestamp: new Date().toISOString(),
          };

          const { data: insertedEdge, error: edgeError } = await supabase
            .from('collaborations')
            .insert([newCollaboration])
            .select()
            .single();

          if (edgeError) throw edgeError;
          if (insertedEdge) {
            edges.push(insertedEdge);
          }
        }
      }

      setGraphData({ nodes, edges });
      setNotification({ message: 'Graphe aléatoire généré avec succès', type: 'success' });
    } catch (err) {
      console.error('Error generating random graph:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la génération du graphe aléatoire';
      setNotification({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluationSubmit = async (data: { from: string; to: string; score: number }) => {
    try {
      setLoading(true);
      
      if (!data.from || !data.to || typeof data.score !== 'number') {
        throw new Error('Données d\'évaluation invalides');
      }

      const collaboration = {
        source: data.from,
        target: data.to,
        score: data.score,
        direction: 'outgoing',
        timestamp: new Date().toISOString()
      };

      // Delete any existing collaboration first
      await supabase
        .from('collaborations')
        .delete()
        .match({ source: data.from, target: data.to });

      // Insert new collaboration
      const { data: insertedEdge, error: insertError } = await supabase
        .from('collaborations')
        .insert([collaboration])
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Erreur lors de l\'enregistrement de l\'évaluation');
      }

      if (!insertedEdge) {
        throw new Error('Aucune donnée retournée après l\'insertion');
      }

      // Update local state
      setGraphData(prev => ({
        ...prev,
        edges: [
          ...prev.edges.filter(edge => !(edge.source === data.from && edge.target === data.to)),
          insertedEdge
        ],
      }));

      setNotification({ 
        message: 'Évaluation enregistrée avec succès', 
        type: 'success' 
      });
      
      setShowEvaluationForm(false);
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      const errorMessage = err instanceof Error ? err.message : "Échec de l'enregistrement de l'évaluation";
      setNotification({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateClick = (memberId: string) => {
    setSelectedMemberForEvaluation(memberId);
    setShowEvaluationForm(true);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <Container 
        disableGutters 
        sx={{ 
          backgroundColor: '#fff',
          minHeight: '100vh',
          width: '100vw',
          maxWidth: '100vw !important',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          pt: 4,
          pb: 4,
          px: 1,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ 
          border: '4px solid black',
          p: { xs: 2, sm: 3, md: 4 },
          backgroundColor: '#f0f0f0',
          width: '95%',
          minWidth: 'auto',
          maxWidth: '95%',
          overflow: 'auto',
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 4,
            borderBottom: '4px solid black',
            pb: 2,
            flexWrap: 'wrap',
            gap: 2,
          }}>
            <Typography variant="h4" component="h1" sx={{
              fontWeight: 900,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
              textTransform: 'uppercase',
              letterSpacing: '-1px',
            }}>
              Sociogramme
              <Typography component="sup" sx={{
                fontSize: '0.5em',
                verticalAlign: 'super',
                ml: 1,
                fontWeight: 400,
                textTransform: 'lowercase',
              }}>
                version alpha
              </Typography>
            </Typography>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setShowEvaluationForm(true)}
              sx={{
                backgroundColor: '#fff',
                color: '#000',
                '&:hover': {
                  backgroundColor: '#000',
                  color: '#fff',
                },
                whiteSpace: 'nowrap',
              }}
            >
              Nouvelle Évaluation
            </Button>
          </Box>
          
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                borderRadius: 0,
                border: '2px solid #ff0000',
                backgroundColor: '#fff',
                '& .MuiAlert-icon': {
                  color: '#ff0000',
                },
              }} 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Box sx={{ 
            borderBottom: '4px solid black',
            mb: 4,
          }}>
            <Tabs 
              value={currentTab} 
              onChange={(_, newValue) => setCurrentTab(newValue)}
              sx={{
                '& .MuiTabs-indicator': {
                  height: 4,
                  backgroundColor: '#000',
                },
                mb: 2,
              }}
            >
              <Tab label="Visualisation" />
              <Tab label="Analyse" />
              {isAdmin && <Tab label="Administration" />}
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}>
              <Box sx={{ 
                border: '2px solid black',
                p: { xs: 2, sm: 3 },
                mb: 4,
                backgroundColor: '#fff',
                width: '100%',
                maxWidth: '800px',
                overflow: 'auto',
              }}>
                <Toolbar
                  onZoomIn={() => {
                    const container = document.querySelector('.sigma-container');
                    if (container) {
                      (container as any).zoomIn?.();
                    }
                  }}
                  onZoomOut={() => {
                    const container = document.querySelector('.sigma-container');
                    if (container) {
                      (container as any).zoomOut?.();
                    }
                  }}
                  onCenter={() => {
                    const container = document.querySelector('.sigma-container');
                    if (container) {
                      (container as any).center?.();
                    }
                  }}
                  nodeSize={nodeSize}
                  onNodeSizeChange={setNodeSize}
                />
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="600px" width="100%" maxWidth="800px">
                  <CircularProgress sx={{ color: '#000' }} />
                </Box>
              ) : (
                <Box sx={{ 
                  border: '2px solid black',
                  backgroundColor: '#fff',
                  height: '70vh',
                  overflow: 'hidden',
                  width: '100%',
                  maxWidth: '800px',
                  mb: 4,
                }}>
                  <GraphViewer 
                    data={graphData}
                    nodeSize={nodeSize}
                    onEvaluate={handleEvaluateClick}
                  />
                </Box>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
            }}>
              <Box sx={{ 
                border: '2px solid black',
                p: { xs: 3, sm: 4 },
                backgroundColor: '#fff',
                width: '100%',
                maxWidth: '800px',
                overflow: 'auto',
                mb: 4,
              }}>
                <AnalysisPanel
                  data={graphData}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                />
              </Box>
            </Box>
          </TabPanel>

          {isAdmin && (
            <TabPanel value={currentTab} index={2}>
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}>
                <Box sx={{ 
                  border: '2px solid black',
                  p: { xs: 3, sm: 4 },
                  backgroundColor: '#fff',
                  width: '100%',
                  maxWidth: '800px',
                  overflow: 'auto',
                  mb: 4,
                }}>
                  <TeamManagement
                    members={graphData.nodes}
                    onAddMember={handleAddMember}
                    onUpdateMember={handleUpdateMember}
                    onDeleteMember={handleDeleteMember}
                  />
                </Box>
              </Box>
            </TabPanel>
          )}

          <CollaborationForm
            open={showEvaluationForm}
            onClose={() => {
              setShowEvaluationForm(false);
              setSelectedMemberForEvaluation(null);
            }}
            onSubmit={handleEvaluationSubmit}
            members={graphData.nodes}
            currentUser={currentUser}
          />

          <Snackbar
            open={!!notification}
            autoHideDuration={6000}
            onClose={handleCloseNotification}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={handleCloseNotification}
              severity={notification?.type || 'info'}
              sx={{ 
                width: '100%',
                borderRadius: 0,
                border: '2px solid',
                borderColor: notification?.type === 'success' ? '#4caf50' : '#ff0000',
                backgroundColor: '#fff',
              }}
            >
              {notification?.message || ''}
            </Alert>
          </Snackbar>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App


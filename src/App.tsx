import { useState, useEffect } from 'react'
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

        // Fetch data from Supabase with joins
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select(`
            *,
            roles (name),
            departments (name)
          `);

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

        // Transform members data to match our frontend model
        const transformedMembers = members.map((member: any) => ({
          id: member.id,
          label: member.label,
          role: member.roles.name,
          department: member.departments.name,
          x: Math.random() * 10 - 5,
          y: Math.random() * 10 - 5,
        }));

        setGraphData({
          nodes: transformedMembers,
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
      // Vérifier que les données sont valides
      if (!member.label || !member.role || !member.department) {
        throw new Error('Tous les champs sont obligatoires');
      }

      // 1. Obtenir le role_id
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', member.role)
        .single();

      if (roleError) {
        console.error('Error getting role:', roleError);
        throw new Error('Erreur lors de la récupération du rôle');
      }

      // 2. Obtenir le department_id
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('name', member.department)
        .single();

      if (deptError) {
        console.error('Error getting department:', deptError);
        throw new Error('Erreur lors de la récupération du département');
      }

      // Formater les données pour Supabase
      const memberData = {
        label: member.label.trim(),
        role_id: roleData.id,
        department_id: deptData.id
      };

      // Check if a member with the same label already exists
      const { data: existingMembers, error: checkError } = await supabase
        .from('team_members')
        .select('label')
        .eq('label', memberData.label);

      if (checkError) {
        console.error('Error checking existing members:', checkError);
        throw new Error('Erreur lors de la vérification des membres existants');
      }

      if (existingMembers && existingMembers.length > 0) {
        throw new Error('Un membre avec ce nom existe déjà');
      }

      // Insert new member
      const { data, error: insertError } = await supabase
        .from('team_members')
        .insert(memberData)
        .select(`
          *,
          roles (name),
          departments (name)
        `)
        .single();

      if (insertError) {
        console.error('Error inserting member:', insertError);
        if (insertError.code === '23505') {
          throw new Error('Un membre avec ce nom existe déjà');
        }
        throw new Error('Erreur lors de l\'ajout du membre: ' + insertError.message);
      }

      if (!data) {
        throw new Error('Aucune donnée retournée après l\'insertion');
      }

      // Update local state with the correct format
      const newNode = {
        id: data.id,
        label: data.label,
        role: data.roles.name,
        department: data.departments.name,
        x: Math.random() * 10 - 5,
        y: Math.random() * 10 - 5
      };

      setGraphData(prev => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
      }));

      setNotification({ message: 'Membre ajouté avec succès', type: 'success' });
    } catch (err) {
      console.error('Error in handleAddMember:', err);
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout du membre";
      setNotification({ message: errorMessage, type: 'error' });
      throw err;
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
      console.log('Début de la suppression du membre:', id);
      
      // Delete collaborations where member is source
      const { error: sourceError } = await supabase
        .from('collaborations')
        .delete()
        .eq('source', id);

      if (sourceError) {
        console.error('Erreur lors de la suppression des collaborations source:', sourceError);
        throw sourceError;
      }
      console.log('Collaborations source supprimées');

      // Delete collaborations where member is target
      const { error: targetError } = await supabase
        .from('collaborations')
        .delete()
        .eq('target', id);

      if (targetError) {
        console.error('Erreur lors de la suppression des collaborations target:', targetError);
        throw targetError;
      }
      console.log('Collaborations target supprimées');

      // Then delete the member
      const { error: memberError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (memberError) {
        console.error('Erreur lors de la suppression du membre:', memberError);
        throw memberError;
      }
      console.log('Membre supprimé avec succès');

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

  const handleChangeEvaluator = async (newEvaluatorId: string) => {
    try {
      console.log('Changement d\'évaluateur:', newEvaluatorId);
      
      // Vérifier que le membre existe
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select()
        .eq('id', newEvaluatorId)
        .single();

      if (memberError) {
        console.error('Erreur lors de la vérification du membre:', memberError);
        throw memberError;
      }

      if (!member) {
        throw new Error('Membre non trouvé');
      }

      setCurrentUser(newEvaluatorId);
      setNotification({ message: 'Évaluateur changé avec succès', type: 'success' });
    } catch (err) {
      console.error('Erreur lors du changement d\'évaluateur:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du changement d\'évaluateur';
      setNotification({ message: errorMessage, type: 'error' });
    }
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
            onChangeEvaluator={handleChangeEvaluator}
            selectedMember={selectedMemberForEvaluation}
            onSelectMember={setSelectedMemberForEvaluation}
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


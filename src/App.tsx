import { useState, useEffect } from 'react'
import { Container, Typography, Box, CircularProgress, Alert, Snackbar, Tab, Tabs, IconButton, Drawer, List, ListItem, ListItemText, ListItemButton } from '@mui/material'
import GraphViewer from './components/Graph'
import Toolbar from './components/Toolbar'
import CollaborationForm from './components/CollaborationForm'
import AnalysisPanel from './components/AnalysisPanel'
import TeamManagement from './components/TeamManagement'
import { supabase } from './lib/supabase'
import { TeamMember, CollaborationEdge } from './types/graph'
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Footer from './components/Footer';
import MenuIcon from '@mui/icons-material/Menu';

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
        <Box sx={{ 
          py: 3,
          px: 0,
          width: '100%',
        }}>
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
    fontFamily: 'Roboto, sans-serif',
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
  const [nameFilter, setNameFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [isAdmin] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
        .select(`
          *,
          roles (name),
          departments (name)
        `)
        .eq('label', memberData.label);

      if (checkError) {
        console.error('Error checking existing members:', checkError);
        throw new Error('Erreur lors de la vérification des membres existants');
      }

      if (existingMembers && existingMembers.length > 0) {
        // Vérifier si un membre avec le même nom existe déjà dans le même rôle ou département
        const existingMember = existingMembers.find(
          (existing) => 
            existing.roles.name === member.role && 
            existing.departments.name === member.department
        );

        if (existingMember) {
          throw new Error(`${existingMember.label} existe déjà en tant que ${existingMember.roles.name} dans le département ${existingMember.departments.name}`);
        }

        // Si le membre existe avec un rôle ou département différent, ajouter une distinction
        memberData.label = `${memberData.label} (${member.role}, ${member.department})`;
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

  const handleEvaluationSubmit = async (evaluation: { evaluator: string; evaluated: string; score: number }) => {
    try {
      // Vérifier si une évaluation existe déjà
      const { data: existingEvals, error: checkError } = await supabase
        .from('collaborations')
        .select('*')
        .eq('source', evaluation.evaluator)
        .eq('target', evaluation.evaluated);

      if (checkError) throw checkError;

      const existingEval = existingEvals?.[0];

      const collaboration = {
        source: evaluation.evaluator,
        target: evaluation.evaluated,
        score: evaluation.score,
        direction: 'outgoing' as const,
        timestamp: new Date().toISOString()
      };

      let result;
      if (existingEval) {
        // Mettre à jour l'évaluation existante
        result = await supabase
          .from('collaborations')
          .update(collaboration)
          .eq('source', evaluation.evaluator)
          .eq('target', evaluation.evaluated);
      } else {
        // Créer une nouvelle évaluation
        result = await supabase
          .from('collaborations')
          .insert(collaboration);
      }

      if (result.error) throw result.error;

      // Update local state
      setGraphData(prev => ({
        ...prev,
        edges: existingEval
          ? prev.edges.map(edge => 
              edge.source === evaluation.evaluator && edge.target === evaluation.evaluated
                ? collaboration
                : edge
            )
          : [...prev.edges, collaboration],
      }));

      setNotification({ message: 'Évaluation ajoutée avec succès', type: 'success' });
      return true;
    } catch (err) {
      console.error('Error in handleEvaluationSubmit:', err);
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout de l'évaluation";
      setNotification({ message: errorMessage, type: 'error' });
      throw err;
    }
  };

  const handleEvaluateClick = (_memberId: string) => {
    // Ne rien faire pour l'instant
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

  const handleMobileMenuClick = (newValue: number) => {
    setCurrentTab(newValue);
    setMobileMenuOpen(false);
  };

  const mobileMenu = (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      PaperProps={{
        sx: {
          width: '80%',
          maxWidth: '300px',
          border: 'none',
          '& .MuiDrawer-paper': {
            backgroundColor: '#fff',
          },
        },
      }}
    >
      <List sx={{ pt: 0 }}>
        <ListItem sx={{
          backgroundColor: '#000',
          color: '#fff',
          py: 2,
        }}>
          <ListItemText 
            primary="MENU" 
            sx={{ 
              '& .MuiListItemText-primary': {
                fontWeight: 'bold',
                fontSize: '1.2rem',
              }
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemButton
            onClick={() => handleMobileMenuClick(0)}
            selected={currentTab === 0}
            sx={{
              '&.Mui-selected': {
                backgroundColor: '#000',
                color: '#fff',
              },
            }}
          >
            <ListItemText primary="Nouvelle évaluation" />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton
            onClick={() => handleMobileMenuClick(1)}
            selected={currentTab === 1}
            sx={{
              '&.Mui-selected': {
                backgroundColor: '#000',
                color: '#fff',
              },
            }}
          >
            <ListItemText primary="Visualisation" />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton
            onClick={() => handleMobileMenuClick(2)}
            selected={currentTab === 2}
            sx={{
              '&.Mui-selected': {
                backgroundColor: '#000',
                color: '#fff',
              },
            }}
          >
            <ListItemText primary="Analyse" />
          </ListItemButton>
        </ListItem>
        {isAdmin && (
          <ListItem>
            <ListItemButton
              onClick={() => handleMobileMenuClick(3)}
              selected={currentTab === 3}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: '#000',
                  color: '#fff',
                },
              }}
            >
              <ListItemText primary="Administration" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Drawer>
  );

  return (
    <ThemeProvider theme={theme}>
      {mobileMenu}
      <Container 
        disableGutters 
        sx={{ 
          backgroundColor: '#fff',
          minHeight: '100vh',
          width: '100%',
          maxWidth: '100% !important',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: 2,
          pb: 2,
          m: 0,
          p: 0,
        }}
      >
        <Box sx={{ 
          border: '4px solid black',
          p: { xs: 1, sm: 2 },
          backgroundColor: '#f0f0f0',
          width: '80%',
          minWidth: '80%',
          maxWidth: '80%',
          overflow: 'auto',
          mb: 2,
          mx: 'auto',
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
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <IconButton
                onClick={() => setMobileMenuOpen(true)}
                sx={{
                  border: '2px solid black',
                  borderRadius: 0,
                  p: 1,
                  '&:hover': {
                    backgroundColor: '#000',
                    color: '#fff',
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
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
            display: { xs: 'none', md: 'block' },
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
              <Tab label="Nouvelle évaluation" />
              <Tab label="Visualisation" />
              <Tab label="Analyse" />
              {isAdmin && <Tab label="Administration" />}
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              px: 0,
            }}>
              <Box sx={{ 
                border: '2px solid black',
                p: { xs: 2, sm: 3 },
                backgroundColor: '#fff',
                width: '90%',
                overflow: 'auto',
                mb: 2,
              }}>
                <CollaborationForm
                  open={true}
                  onClose={() => setCurrentTab(1)}
                  onSubmit={handleEvaluationSubmit}
                  members={graphData.nodes}
                  currentUser={currentUser}
                  onChangeEvaluator={handleChangeEvaluator}
                  embedded={true}
                  setCurrentTab={setCurrentTab}
                  setNotification={setNotification}
                />
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}>
              <Box sx={{ 
                border: '2px solid black',
                p: { xs: 2, sm: 3 },
                mb: 2,
                backgroundColor: '#fff',
                width: '100%',
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
                  nameFilter={nameFilter}
                  onNameFilterChange={(value: string) => setNameFilter(value)}
                  departments={Array.from(new Set(graphData.nodes.map(node => node.department)))}
                  departmentFilter={departmentFilter}
                  onDepartmentFilterChange={(value: string) => setDepartmentFilter(value)}
                />
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="600px" width="100%">
                  <CircularProgress sx={{ color: '#000' }} />
                </Box>
              ) : (
                <Box sx={{ 
                  border: '2px solid black',
                  backgroundColor: '#fff',
                  height: '80vh',
                  width: '100%',
                  overflow: 'hidden',
                }}>
                  <GraphViewer 
                    data={graphData}
                    nodeSize={nodeSize}
                    onEvaluate={handleEvaluateClick}
                    nameFilter={nameFilter}
                    departmentFilter={departmentFilter}
                  />
                </Box>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
            }}>
              <Box sx={{ 
                border: '2px solid black',
                p: { xs: 2, sm: 3 },
                backgroundColor: '#fff',
                width: '100%',
                overflow: 'auto',
                mb: 2,
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
            <TabPanel value={currentTab} index={3}>
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}>
                <Box sx={{ 
                  border: '2px solid black',
                  p: { xs: 2, sm: 3 },
                  backgroundColor: '#fff',
                  width: '100%',
                  overflow: 'auto',
                  mb: 2,
                }}>
                  <TeamManagement
                    members={graphData.nodes}
                    onAddMember={handleAddMember}
                    onUpdateMember={handleUpdateMember}
                    onDeleteMember={handleDeleteMember}
                    setNotification={setNotification}
                  />
                </Box>
              </Box>
            </TabPanel>
          )}

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
        <Box sx={{ width: { xs: '95%', md: '80%' } }}>
          <Footer />
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App


import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
} from '@mui/material';
import { TeamMember, CollaborationEdge } from '../types/graph';
import DownloadIcon from '@mui/icons-material/Download';
import { COLLABORATION_COLORS } from '../types/graph';

interface AnalysisPanelProps {
  data: {
    nodes: TeamMember[];
    edges: CollaborationEdge[];
  };
  currentUser: string | null;
  isAdmin?: boolean;
}

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
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function AnalysisPanel({ data, currentUser, isAdmin = false }: AnalysisPanelProps) {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const calculateMemberStats = (memberId: string) => {
    const outgoingEdges = data.edges.filter(edge => edge.source === memberId);
    const incomingEdges = data.edges.filter(edge => edge.target === memberId);
    
    const avgOutgoing = outgoingEdges.reduce((acc, edge) => acc + edge.score, 0) / (outgoingEdges.length || 1);
    const avgIncoming = incomingEdges.reduce((acc, edge) => acc + edge.score, 0) / (incomingEdges.length || 1);
    
    return {
      avgOutgoing,
      avgIncoming,
      perceptionGap: Math.abs(avgOutgoing - avgIncoming),
      totalCollaborations: outgoingEdges.length + incomingEdges.length
    };
  };

  const getRecommendation = (stats: ReturnType<typeof calculateMemberStats>) => {
    if (stats.perceptionGap > 1.5) {
      return { text: 'Échanger sur les perceptions', severity: 'warning' };
    }
    if (stats.avgIncoming < 2) {
      return { text: 'Intensifier la collaboration', severity: 'error' };
    }
    if (stats.avgIncoming >= 3) {
      return { text: 'Maintenir', severity: 'success' };
    }
    return { text: 'Améliorer progressivement', severity: 'info' };
  };

  const getScoreColor = (score: number) => {
    return COLLABORATION_COLORS[Math.floor(score) as keyof typeof COLLABORATION_COLORS];
  };

  const exportData = () => {
    const csvContent = [
      ['Membre', 'Rôle', 'Département', 'Score Moyen Donné', 'Score Moyen Reçu', 'Écart de Perception'],
      ...data.nodes.map(member => {
        const stats = calculateMemberStats(member.id);
        return [
          member.label,
          member.role,
          member.department,
          stats.avgOutgoing.toFixed(2),
          stats.avgIncoming.toFixed(2),
          stats.perceptionGap.toFixed(2)
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'collaboration_analysis.csv';
    link.click();
  };

  return (
    <Paper sx={{ mt: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Vue d'ensemble" />
          <Tab label="Analyse détaillée" />
          {isAdmin && <Tab label="Comparaison" />}
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Statistiques globales</Typography>
          {isAdmin && (
            <Button
              startIcon={<DownloadIcon />}
              onClick={exportData}
              variant="outlined"
            >
              Exporter
            </Button>
          )}
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Membre</TableCell>
                <TableCell>Score moyen donné</TableCell>
                <TableCell>Score moyen reçu</TableCell>
                <TableCell>Écart de perception</TableCell>
                <TableCell>Recommandation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.nodes
                .filter(member => isAdmin || member.id === currentUser)
                .map(member => {
                  const stats = calculateMemberStats(member.id);
                  const recommendation = getRecommendation(stats);
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1">{member.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.role} • {member.department}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography style={{ color: getScoreColor(stats.avgOutgoing) }}>
                          {stats.avgOutgoing.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography style={{ color: getScoreColor(stats.avgIncoming) }}>
                          {stats.avgIncoming.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>{stats.perceptionGap.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          label={recommendation.text}
                          color={recommendation.severity as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Analyse des relations
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>De</TableCell>
                <TableCell>Vers</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.edges
                .filter(edge => isAdmin || edge.source === currentUser || edge.target === currentUser)
                .map((edge, index) => {
                  const sourceMember = data.nodes.find(n => n.id === edge.source);
                  const targetMember = data.nodes.find(n => n.id === edge.target);
                  return (
                    <TableRow key={index}>
                      <TableCell>{sourceMember?.label}</TableCell>
                      <TableCell>{targetMember?.label}</TableCell>
                      <TableCell>
                        <Typography style={{ color: getScoreColor(edge.score) }}>
                          {edge.score}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(edge.timestamp).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {isAdmin && (
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Comparaison temporelle
          </Typography>
          <Typography color="text.secondary">
            Fonctionnalité à venir : Comparaison des sociogrammes dans le temps
          </Typography>
        </TabPanel>
      )}
    </Paper>
  );
} 
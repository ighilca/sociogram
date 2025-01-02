import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { TeamMember, CollaborationEdge } from '../types/graph';

interface AnalysisPanelProps {
  data: {
    nodes: TeamMember[];
    edges: CollaborationEdge[];
  };
  currentUser: string | null;
  isAdmin: boolean;
}

export default function AnalysisPanel({ data, currentUser, isAdmin }: AnalysisPanelProps) {
  // Calculer les statistiques globales
  const calculateGlobalStats = () => {
    const totalEvaluations = data.edges.length;
    const avgScore = data.edges.reduce((sum, edge) => sum + edge.score, 0) / totalEvaluations;
    const maxScore = Math.max(...data.edges.map(edge => edge.score));
    const minScore = Math.min(...data.edges.map(edge => edge.score));

    return {
      totalEvaluations,
      avgScore: avgScore.toFixed(2),
      maxScore,
      minScore,
    };
  };

  // Créer la matrice d'évaluations croisées
  const createCrossEvaluationMatrix = () => {
    const matrix: { [key: string]: { [key: string]: number | null } } = {};
    
    // Initialiser la matrice avec des valeurs nulles
    data.nodes.forEach(source => {
      matrix[source.id] = {};
      data.nodes.forEach(target => {
        matrix[source.id][target.id] = null;
      });
    });

    // Remplir la matrice avec les évaluations existantes
    data.edges.forEach(edge => {
      matrix[edge.source][edge.target] = edge.score;
    });

    return matrix;
  };

  const globalStats = calculateGlobalStats();
  const matrix = createCrossEvaluationMatrix();

  return (
    <Box>
      <Typography variant="h5" sx={{ 
        mb: 4,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        borderBottom: '2px solid black',
        pb: 2
      }}>
        Vue d'Ensemble des Collaborations
      </Typography>

      {/* Statistiques globales */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Statistiques Globales
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 2,
          mb: 3
        }}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center',
            border: '2px solid black',
            borderRadius: 0,
          }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {globalStats.totalEvaluations}
            </Typography>
            <Typography variant="body2">
              Évaluations Totales
            </Typography>
          </Paper>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center',
            border: '2px solid black',
            borderRadius: 0,
          }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {globalStats.avgScore}
            </Typography>
            <Typography variant="body2">
              Score Moyen
            </Typography>
          </Paper>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center',
            border: '2px solid black',
            borderRadius: 0,
          }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {globalStats.maxScore}
            </Typography>
            <Typography variant="body2">
              Score Maximum
            </Typography>
          </Paper>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center',
            border: '2px solid black',
            borderRadius: 0,
          }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {globalStats.minScore}
            </Typography>
            <Typography variant="body2">
              Score Minimum
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Matrice d'évaluations croisées */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Matrice des Évaluations Croisées
        </Typography>
        <TableContainer component={Paper} sx={{ 
          border: '2px solid black',
          borderRadius: 0,
        }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', borderBottom: '2px solid black' }}>
                  Évaluateur ↓ / Évalué →
                </TableCell>
                {data.nodes.map(node => (
                  <TableCell 
                    key={node.id} 
                    align="center"
                    sx={{ 
                      fontWeight: 'bold',
                      borderBottom: '2px solid black',
                      borderLeft: '1px solid #ddd',
                    }}
                  >
                    {node.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.nodes.map(source => (
                <TableRow key={source.id}>
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    borderRight: '2px solid black',
                  }}>
                    {source.label}
                  </TableCell>
                  {data.nodes.map(target => (
                    <TableCell 
                      key={target.id} 
                      align="center"
                      sx={{
                        backgroundColor: source.id === target.id ? '#f0f0f0' : 'inherit',
                        borderLeft: '1px solid #ddd',
                        fontWeight: matrix[source.id][target.id] !== null ? 'bold' : 'normal',
                      }}
                    >
                      {source.id === target.id ? '-' : (matrix[source.id][target.id] ?? '×')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
          × = Pas encore évalué | - = Non applicable
        </Typography>
      </Box>

      {/* Légende des scores */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Légende des Scores
        </Typography>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 2
        }}>
          {[0, 1, 2, 3, 4].map(score => (
            <Paper key={score} sx={{ 
              p: 2,
              border: '2px solid black',
              borderRadius: 0,
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                {score}
              </Typography>
              <Typography variant="body2">
                {score === 0 ? 'Aucune collaboration' :
                 score === 1 ? 'Collaboration rare' :
                 score === 2 ? 'Collaboration occasionnelle' :
                 score === 3 ? 'Collaboration régulière' :
                 'Collaboration très forte'}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
} 
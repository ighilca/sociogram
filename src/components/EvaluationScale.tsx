import { Box, Typography, Paper, List, ListItem } from '@mui/material';

interface ScaleLevel {
  level: number;
  title: string;
  description: string;
  example: string;
}

const scaleLevels: ScaleLevel[] = [
  {
    level: 0,
    title: "Inexistante ou non nécessaire",
    description: "La collaboration n'existe pas ou n'est pas requise.",
    example: "Aucune interaction ou effort conjoint n'est observé."
  },
  {
    level: 1,
    title: "Faible",
    description: "La collaboration est rare et uniquement ponctuelle.",
    example: "Les membres coopèrent uniquement lorsqu'une situation particulière l'exige."
  },
  {
    level: 2,
    title: "Modérée",
    description: "Les efforts sont coordonnés de manière périodique.",
    example: "Les membres collaborent de temps en temps, par exemple pour la planification d'actions."
  },
  {
    level: 3,
    title: "Bonne",
    description: "La collaboration est soutenue, avec une entraide régulière.",
    example: "Les interactions sont fréquentes (hebdomadaires ou quotidiennes) et axées sur l'exécution d'actions spécifiques."
  },
  {
    level: 4,
    title: "Optimale",
    description: "Les membres travaillent en parfaite collégialité pour atteindre des objectifs communs.",
    example: "Les rôles sont complémentaires, les objectifs partagés, et les résultats concrets sont atteints grâce à une collaboration fluide et équilibrée."
  }
];

export function EvaluationScale() {
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Échelle d'Évaluation de la Collaboration
      </Typography>
      <List>
        {scaleLevels.map((level) => (
          <ListItem key={level.level} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" color="primary">
              {level.title} ({level.level})
            </Typography>
            <Box sx={{ ml: 2 }}>
              <Typography variant="body1">
                {level.description}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Exemple :</strong> {level.example}
              </Typography>
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
} 
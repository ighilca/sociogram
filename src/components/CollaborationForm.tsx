import { Dialog, DialogTitle, DialogContent, Button, Select, MenuItem, FormControl, Box, Typography, List, ListItem } from '@mui/material';
import { TeamMember } from '../types/graph';
import { useState } from 'react';
import { SelectChangeEvent } from '@mui/material/Select';

export interface CollaborationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (evaluation: { evaluator: string; evaluated: string; score: number }) => Promise<boolean>;
  members: TeamMember[];
  currentUser: string | null;
  onChangeEvaluator: (id: string) => void;
  embedded?: boolean;
  setCurrentTab: (tab: number) => void;
  setNotification: (notification: { message: string; type: 'success' | 'error' }) => void;
}

export default function CollaborationForm({ 
  open, 
  onClose, 
  onSubmit, 
  members, 
  currentUser,
  onChangeEvaluator,
  embedded = false,
  setCurrentTab,
  setNotification
}: CollaborationFormProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculer le nombre de membres à évaluer (tous sauf l'évaluateur actuel)
  const membersToEvaluate = members.filter(member => member.id !== currentUser);
  const allMembersEvaluated = membersToEvaluate.length === Object.keys(scores).length;

  const handleSubmit = (memberId: string, score: number) => {
    if (!currentUser) return;
    
    // Si le score est le même que celui déjà sélectionné, on le retire
    if (scores[memberId] === score) {
      const newScores = { ...scores };
      delete newScores[memberId];
      setScores(newScores);
    } else {
      // Sinon on met à jour le score
      setScores(prev => ({
        ...prev,
        [memberId]: score
      }));
    }
  };

  const handleBulkSubmit = async () => {
    // Vérifier que tous les membres ont été évalués
    if (!allMembersEvaluated) {
      setNotification?.({ 
        message: 'Vous devez évaluer tous les membres de l\'équipe', 
        type: 'error' 
      });
      return;
    }
    
    setIsSubmitting(true);
    let success = true;
    
    try {
      // Attendre que toutes les évaluations soient envoyées
      const results = await Promise.all(
        Object.entries(scores).map(([memberId, score]) => 
          onSubmit({
            evaluator: currentUser!,
            evaluated: memberId,
            score
          }).catch(() => false)
        )
      );

      // Vérifier si toutes les évaluations ont réussi
      success = results.every(result => result === true);

      // Réinitialiser le formulaire
      setScores({});
      
      // Changer d'onglet seulement si toutes les évaluations ont réussi
      if (success) {
        setCurrentTab(1);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi des évaluations:', error);
      success = false;
    } finally {
      setIsSubmitting(false);
    }

    return success;
  };

  const handleClose = () => {
    setScores({});
    onClose();
  };

  const handleMemberChange = (event: SelectChangeEvent<string>) => {
    const memberId = event.target.value;
    onChangeEvaluator(memberId);
  };

  const formContent = (
    <Box>
      <FormControl fullWidth sx={{ mb: 4 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          ÉVALUATEUR
        </Typography>
        <Select
          value={currentUser || ''}
          onChange={handleMemberChange}
          displayEmpty
          sx={{
            borderRadius: 0,
            border: '2px solid black',
            '&:hover': {
              border: '2px solid black',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
          }}
        >
          <MenuItem value="" disabled>
            Sélectionner l'évaluateur
          </MenuItem>
          {members.map(member => (
            <MenuItem key={member.id} value={member.id}>
              {member.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {members
          .filter(member => member.id !== currentUser)
          .map(member => (
            <ListItem
              key={member.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2,
                borderBottom: '1px solid #eee',
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {member.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {member.role}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[0, 1, 2, 3, 4].map((value) => (
                  <Button
                    key={value}
                    onClick={() => handleSubmit(member.id, value)}
                    variant={scores[member.id] === value ? 'contained' : 'outlined'}
                    disabled={!currentUser}
                    sx={{
                      minWidth: '36px',
                      height: '36px',
                      p: 0,
                      borderRadius: 0,
                      border: '1px solid black',
                      backgroundColor: scores[member.id] === value ? '#000' : '#fff',
                      color: scores[member.id] === value ? '#fff' : '#000',
                      '&:hover': {
                        backgroundColor: scores[member.id] === value ? '#000' : '#f0f0f0',
                        border: '1px solid black',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: '#f5f5f5',
                        color: '#ccc',
                        border: '1px solid #ccc',
                      },
                    }}
                  >
                    {value}
                  </Button>
                ))}
              </Box>
            </ListItem>
          ))}
      </List>

      <Box sx={{ 
        display: 'flex',
        justifyContent: 'center',
        mt: 3,
        pt: 3,
        borderTop: '1px solid #eee',
      }}>
        <Button
          variant="contained"
          fullWidth
          onClick={handleBulkSubmit}
          disabled={isSubmitting || !allMembersEvaluated}
          sx={{
            borderRadius: 0,
            backgroundColor: '#ccc',
            color: '#000',
            border: '1px solid #ccc',
            '&:hover': {
              backgroundColor: '#999',
              border: '1px solid #999',
            },
            '&.Mui-disabled': {
              backgroundColor: '#f5f5f5',
              color: '#ccc',
              border: '1px solid #ccc',
            },
          }}
        >
          {isSubmitting 
            ? 'ENVOI EN COURS...' 
            : allMembersEvaluated 
              ? 'ENREGISTRER TOUTES LES ÉVALUATIONS'
              : `ÉVALUER TOUS LES MEMBRES (${Object.keys(scores).length}/${membersToEvaluate.length})`
          }
        </Button>
      </Box>
    </Box>
  );

  if (embedded) {
    return (
      <Box>
        <Typography variant="h6" sx={{ 
          mb: 4,
          fontWeight: 'bold',
          textTransform: 'uppercase' as const
        }}>
          ÉVALUER LES COLLABORATIONS
        </Typography>
        {formContent}
      </Box>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: 0,
          border: '2px solid black',
          backgroundColor: '#fff',
        }
      }}
    >
      <DialogTitle sx={{
        borderBottom: '2px solid black',
        backgroundColor: '#000',
        color: '#fff',
        fontWeight: 'bold',
      }}>
        ÉVALUER LA COLLABORATION
      </DialogTitle>
      <DialogContent>
        {formContent}
      </DialogContent>
    </Dialog>
  );
} 
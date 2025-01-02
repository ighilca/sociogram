import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, MenuItem, FormControl, Box, Typography } from '@mui/material';
import { TeamMember } from '../types/graph';
import { useState } from 'react';
import { SelectChangeEvent } from '@mui/material/Select';

export interface CollaborationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { from: string; to: string; score: number }) => Promise<void>;
  members: TeamMember[];
  currentUser: string | null;
  onChangeEvaluator: (newEvaluatorId: string) => Promise<void>;
  selectedMember: string | null;
  onSelectMember: (memberId: string) => void;
}

export default function CollaborationForm({ 
  open, 
  onClose, 
  onSubmit, 
  members, 
  currentUser,
  onChangeEvaluator,
  selectedMember,
  onSelectMember
}: CollaborationFormProps) {
  const [score, setScore] = useState<number>(0);

  const handleSubmit = () => {
    if (!currentUser || !selectedMember) return;
    
    onSubmit({
      from: currentUser,
      to: selectedMember,
      score
    });
    
    setScore(0);
  };

  const handleClose = () => {
    setScore(0);
    onClose();
  };

  const handleMemberChange = (event: SelectChangeEvent<string>) => {
    const memberId = event.target.value;
    onChangeEvaluator(memberId);
  };

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
      <DialogContent sx={{ mt: 2 }}>
        <FormControl fullWidth sx={{ mb: 3 }}>
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
                {member.label} ({member.role})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            COLLABORATEUR À ÉVALUER
          </Typography>
          <Select
            value={selectedMember || ''}
            onChange={(e) => onSelectMember(e.target.value as string)}
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
              Sélectionner un collaborateur
            </MenuItem>
            {members
              .filter(member => member.id !== currentUser)
              .map(member => (
                <MenuItem key={member.id} value={member.id}>
                  {member.label} ({member.role})
                </MenuItem>
              ))
            }
          </Select>
        </FormControl>

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ 
            mb: 2,
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            NIVEAU DE COLLABORATION
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            mb: 1
          }}>
            {[0, 1, 2, 3, 4].map((value) => (
              <Button
                key={value}
                onClick={() => setScore(value)}
                variant={score === value ? 'contained' : 'outlined'}
                sx={{
                  minWidth: '48px',
                  height: '48px',
                  borderRadius: 0,
                  border: '2px solid black',
                  backgroundColor: score === value ? '#000' : '#fff',
                  color: score === value ? '#fff' : '#000',
                  '&:hover': {
                    backgroundColor: score === value ? '#000' : '#f0f0f0',
                    border: '2px solid black',
                  },
                }}
              >
                {value}
              </Button>
            ))}
          </Box>
          <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
            0 = Aucune collaboration, 4 = Collaboration très forte
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        p: 2,
        borderTop: '2px solid black',
        gap: 1
      }}>
        <Button 
          onClick={handleClose}
          variant="outlined"
          sx={{
            borderRadius: 0,
            border: '2px solid black',
            color: '#000',
            '&:hover': {
              backgroundColor: '#f0f0f0',
              border: '2px solid black',
            },
          }}
        >
          ANNULER
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!currentUser || !selectedMember}
          sx={{
            borderRadius: 0,
            backgroundColor: '#000',
            color: '#fff',
            border: '2px solid black',
            '&:hover': {
              backgroundColor: '#333',
              border: '2px solid black',
            },
          }}
        >
          ÉVALUER
        </Button>
      </DialogActions>
    </Dialog>
  );
} 
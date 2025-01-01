import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Rating,
  SelectChangeEvent,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { TeamMember } from '../types/graph';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 0,
    border: '4px solid black',
    backgroundColor: '#f0f0f0',
  },
  '& .MuiDialogTitle-root': {
    backgroundColor: '#000',
    color: '#fff',
    textTransform: 'uppercase',
    fontWeight: 900,
    letterSpacing: '1px',
    padding: theme.spacing(3),
  },
  '& .MuiDialogContent-root': {
    padding: theme.spacing(4),
    backgroundColor: '#fff',
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(3),
    borderTop: '2px solid black',
  },
}));

const StyledRating = styled(Rating)(({ theme }) => ({
  '& .MuiRating-icon': {
    border: '2px solid black',
    borderRadius: 0,
    padding: theme.spacing(1),
    margin: theme.spacing(0.5),
  },
  '& .MuiRating-iconFilled': {
    backgroundColor: '#000',
    color: '#fff',
  },
  '& .MuiRating-iconHover': {
    backgroundColor: '#666',
    color: '#fff',
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 0,
    border: '2px solid black',
    '&:hover': {
      borderColor: '#000',
    },
    '&.Mui-focused': {
      borderColor: '#000',
      borderWidth: 2,
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 700,
    '&.Mui-focused': {
      color: '#000',
    },
  },
}));

interface CollaborationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { from: string; to: string; score: number }) => Promise<void>;
  members: TeamMember[];
  currentUser: string | null;
}

export default function CollaborationForm({
  open,
  onClose,
  onSubmit,
  members,
  currentUser,
}: CollaborationFormProps) {
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [score, setScore] = useState<number>(0);

  const handleSubmit = async () => {
    if (!currentUser || !selectedMember) return;
    await onSubmit({
      from: currentUser,
      to: selectedMember,
      score,
    });
    handleClose();
  };

  const handleClose = () => {
    setSelectedMember('');
    setScore(0);
    onClose();
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Évaluer la Collaboration</DialogTitle>
      <DialogContent>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 4,
          mt: 2,
        }}>
          <StyledFormControl fullWidth>
            <InputLabel>Collaborateur</InputLabel>
            <Select
              value={selectedMember}
              label="Collaborateur"
              onChange={(e: SelectChangeEvent) => setSelectedMember(e.target.value)}
            >
              {members
                .filter(member => member.id !== currentUser)
                .map(member => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.label} ({member.role})
                  </MenuItem>
                ))}
            </Select>
          </StyledFormControl>

          <Box sx={{ 
            border: '2px solid black',
            p: 3,
            backgroundColor: '#f8f8f8',
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Niveau de Collaboration
            </Typography>
            <StyledRating
              name="collaboration-score"
              value={score}
              onChange={(_, newValue) => setScore(newValue || 0)}
              max={4}
              size="large"
            />
            <Typography 
              variant="body2" 
              sx={{ 
                mt: 1,
                fontStyle: 'italic',
              }}
            >
              0 = Aucune collaboration, 4 = Collaboration très forte
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose}
          sx={{
            color: '#000',
            '&:hover': {
              backgroundColor: '#f0f0f0',
            },
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedMember || score === 0}
          sx={{
            backgroundColor: '#000',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#333',
            },
            '&.Mui-disabled': {
              backgroundColor: '#ccc',
              color: '#666',
            },
          }}
        >
          Évaluer
        </Button>
      </DialogActions>
    </StyledDialog>
  );
} 
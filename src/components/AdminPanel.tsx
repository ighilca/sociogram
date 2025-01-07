import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_active: boolean;
  user_role: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_users')
        .select('*');
      
      if (error) throw error;

      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Erreur lors de la récupération des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setError(null);
      
      if (!newUserEmail) {
        setError('Veuillez entrer une adresse email');
        return;
      }

      const { error } = await supabase.rpc('invite_user', {
        user_email: newUserEmail
      });

      if (error) throw error;

      setSuccessMessage('Un email d\'invitation a été envoyé à l\'utilisateur');
      setOpenDialog(false);
      setNewUserEmail('');
      
      // Rafraîchir la liste après un court délai
      setTimeout(fetchUsers, 1000);
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Erreur lors de la création de l\'utilisateur');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase.rpc('delete_user', {
        user_id: userId
      });
      
      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== userId));
      setSuccessMessage('Utilisateur supprimé avec succès');
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.rpc('toggle_user_status', {
        user_id: userId,
        is_active: !currentStatus
      });
      
      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      ));
      
      setSuccessMessage(`Utilisateur ${currentStatus ? 'désactivé' : 'activé'} avec succès`);
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError('Erreur lors de la modification du statut de l\'utilisateur');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
          Gestion des Utilisateurs
        </Typography>
        <Button
          variant="contained"
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: '#000',
            '&:hover': { bgcolor: '#333' },
          }}
        >
          Inviter un utilisateur
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ border: '2px solid black' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Date de création</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Dernière connexion</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Rôle</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  {user.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR')
                    : 'Jamais connecté'}
                </TableCell>
                <TableCell>
                  {user.is_active ? (
                    <Typography color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon fontSize="small" />
                      Actif
                    </Typography>
                  ) : (
                    <Typography color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BlockIcon fontSize="small" />
                      Inactif
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{user.user_role || 'authenticated'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={user.is_active ? "Désactiver" : "Activer"}>
                      <IconButton 
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                        color={user.is_active ? "error" : "success"}
                      >
                        {user.is_active ? <BlockIcon /> : <CheckCircleIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton 
                        onClick={() => handleDeleteUser(user.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Inviter un nouvel utilisateur</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Adresse email"
            type="email"
            fullWidth
            variant="outlined"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#000' },
                '&:hover fieldset': { borderColor: '#000' },
                '&.Mui-focused fieldset': { borderColor: '#000' },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            sx={{ 
              color: '#000',
              '&:hover': { bgcolor: '#f5f5f5' },
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleCreateUser}
            variant="contained"
            sx={{
              bgcolor: '#000',
              '&:hover': { bgcolor: '#333' },
            }}
          >
            Inviter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 
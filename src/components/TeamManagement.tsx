import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  ListItemIcon,
  Checkbox,
  Alert
} from '@mui/material';
import { TeamMember } from '../types/graph';
import { supabase } from '../lib/supabase';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FileUploadIcon from '@mui/icons-material/FileUpload';

interface TeamManagementProps {
  members: TeamMember[];
  onAddMember: (member: Omit<TeamMember, 'id'>) => Promise<void>;
  onUpdateMember: (id: string, member: Partial<TeamMember>) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

interface MemberFormData {
  label: string;
  role: string;
  department: string;
}

interface Role {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

export default function TeamManagement({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}: TeamManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [bulkAddText, setBulkAddText] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState<MemberFormData>({
    label: '',
    role: '',
    department: '',
  });

  // Charger les rôles et départements au montage du composant
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger les rôles
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('*')
          .order('name');
        
        if (rolesError) throw rolesError;
        setRoles(rolesData || []);

        // Charger les départements
        const { data: deptsData, error: deptsError } = await supabase
          .from('departments')
          .select('*')
          .order('name');
        
        if (deptsError) throw deptsError;
        setDepartments(deptsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) 
        ? prev.filter(memberId => memberId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(m => m.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedMembers.length} membres ?`)) {
      try {
        for (const id of selectedMembers) {
          await onDeleteMember(id);
        }
        setSelectedMembers([]);
      } catch (error) {
        console.error('Error during bulk delete:', error);
      }
    }
  };

  const handleBulkAddSubmit = async () => {
    try {
      const lines = bulkAddText.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const [label, role, department] = line.split(',').map(s => s.trim());
        if (label && role && department) {
          await onAddMember({
            label,
            role: defaultRoles.includes(role) ? role : defaultRoles[0],
            department: defaultDepartments.includes(department) ? department : defaultDepartments[0],
          });
        }
      }
      
      setShowBulkAddDialog(false);
      setBulkAddText('');
    } catch (error) {
      console.error('Error during bulk add:', error);
    }
  };

  const handleTextChange = (field: keyof MemberFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSelectChange = (field: keyof MemberFormData) => (
    event: SelectChangeEvent<string>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (editingMember) {
        await onUpdateMember(editingMember.id, formData);
      } else {
        await onAddMember(formData);
      }
      handleClose();
    } catch (error) {
      console.error('Error saving member:', error);
      // Ne pas fermer le dialogue en cas d'erreur
      // L'erreur sera affichée via la notification dans App.tsx
    }
  };

  const handleClose = () => {
    setShowAddDialog(false);
    setEditingMember(null);
    setFormData({
      label: '',
      role: '',
      department: '',
    });
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      label: member.label,
      role: member.role,
      department: member.department,
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      try {
        await onDeleteMember(id);
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        width: '100%',
        mb: 2,
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Typography variant="h6" sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Gestion des Membres
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<FileUploadIcon />}
            variant="contained"
            onClick={() => setShowBulkAddDialog(true)}
            sx={{
              backgroundColor: '#000',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#333',
              },
            }}
          >
            Import CSV
          </Button>
          <Button
            startIcon={<PersonAddIcon />}
            variant="contained"
            onClick={() => setShowAddDialog(true)}
            sx={{
              backgroundColor: '#000',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#333',
              },
            }}
          >
            Ajouter
          </Button>
        </Box>
      </Box>

      {selectedMembers.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          border: '2px solid black',
          backgroundColor: '#f8f8f8',
        }}>
          <Typography>
            {selectedMembers.length} membre{selectedMembers.length > 1 ? 's' : ''} sélectionné{selectedMembers.length > 1 ? 's' : ''}
          </Typography>
          <Button
            startIcon={<DeleteIcon />}
            onClick={handleBulkDelete}
            sx={{
              color: '#ff0000',
              borderColor: '#ff0000',
              '&:hover': {
                backgroundColor: '#ff0000',
                color: '#fff',
              },
            }}
          >
            Supprimer la sélection
          </Button>
        </Box>
      )}

      <List sx={{ width: '100%' }}>
        <ListItem
          sx={{
            border: '2px solid black',
            mb: 2,
            backgroundColor: '#f0f0f0',
          }}
        >
          <ListItemIcon>
            <Checkbox
              checked={selectedMembers.length === members.length}
              indeterminate={selectedMembers.length > 0 && selectedMembers.length < members.length}
              onChange={handleSelectAll}
              sx={{
                '&.Mui-checked': {
                  color: '#000',
                },
              }}
            />
          </ListItemIcon>
          <ListItemText 
            primary={
              <Typography sx={{ fontWeight: 700 }}>
                Tout sélectionner
              </Typography>
            }
          />
        </ListItem>

        {members.map((member) => (
          <ListItem
            key={member.id}
            sx={{
              border: '2px solid black',
              mb: 2,
              backgroundColor: '#fff',
              '&:hover': {
                backgroundColor: '#f8f8f8',
              },
            }}
          >
            <ListItemIcon>
              <Checkbox
                checked={selectedMembers.includes(member.id)}
                onChange={() => handleToggleSelect(member.id)}
                sx={{
                  '&.Mui-checked': {
                    color: '#000',
                  },
                }}
              />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography sx={{ fontWeight: 700 }}>
                  {member.label}
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {member.role} • {member.department}
                </Typography>
              }
            />
            <ListItemSecondaryAction>
              <IconButton 
                edge="end" 
                onClick={() => handleEdit(member)} 
                sx={{ 
                  mr: 1,
                  border: '1px solid black',
                  '&:hover': {
                    backgroundColor: '#000',
                    color: '#fff',
                  },
                }}
              >
                <EditIcon />
              </IconButton>
              <IconButton 
                edge="end" 
                onClick={() => handleDelete(member.id)}
                sx={{ 
                  border: '1px solid black',
                  '&:hover': {
                    backgroundColor: '#ff0000',
                    color: '#fff',
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog 
        open={showAddDialog} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: '2px solid black',
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#000',
          color: '#fff',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          {editingMember ? 'Modifier un membre' : 'Ajouter un membre'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 3,
            p: 2,
          }}>
            <TextField
              label="Nom"
              value={formData.label}
              onChange={handleTextChange('label')}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0,
                  border: '2px solid black',
                  '&:hover': {
                    borderColor: '#000',
                  },
                  '&.Mui-focused': {
                    borderColor: '#000',
                  },
                },
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Rôle</InputLabel>
              <Select
                value={formData.role}
                label="Rôle"
                onChange={handleSelectChange('role')}
                sx={{
                  borderRadius: 0,
                  border: '2px solid black',
                  '&:hover': {
                    borderColor: '#000',
                  },
                  '&.Mui-focused': {
                    borderColor: '#000',
                  },
                }}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.name}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Département</InputLabel>
              <Select
                value={formData.department}
                label="Département"
                onChange={handleSelectChange('department')}
                sx={{
                  borderRadius: 0,
                  border: '2px solid black',
                  '&:hover': {
                    borderColor: '#000',
                  },
                  '&.Mui-focused': {
                    borderColor: '#000',
                  },
                }}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          borderTop: '2px solid black',
        }}>
          <Button 
            onClick={handleClose}
            sx={{
              color: '#000',
              border: '2px solid black',
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
            disabled={!formData.label || !formData.role || !formData.department}
            sx={{
              backgroundColor: '#000',
              color: '#fff',
              border: '2px solid black',
              '&:hover': {
                backgroundColor: '#333',
              },
              '&.Mui-disabled': {
                backgroundColor: '#ccc',
                color: '#666',
                border: '2px solid #ccc',
              },
            }}
          >
            {editingMember ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={showBulkAddDialog} 
        onClose={() => setShowBulkAddDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: '2px solid black',
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#000',
          color: '#fff',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          Import CSV
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 0 }}>
            Format: Nom, Rôle, Département (un par ligne)
          </Alert>
          <TextField
            multiline
            rows={10}
            value={bulkAddText}
            onChange={(e) => setBulkAddText(e.target.value)}
            placeholder="John Doe, Developer, Engineering
Jane Smith, Designer, Design
..."
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                border: '2px solid black',
                fontFamily: 'monospace',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '2px solid black' }}>
          <Button 
            onClick={() => setShowBulkAddDialog(false)}
            sx={{
              color: '#000',
              border: '2px solid black',
              '&:hover': {
                backgroundColor: '#f0f0f0',
              },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleBulkAddSubmit}
            variant="contained"
            disabled={!bulkAddText.trim()}
            sx={{
              backgroundColor: '#000',
              color: '#fff',
              border: '2px solid black',
              '&:hover': {
                backgroundColor: '#333',
              },
              '&.Mui-disabled': {
                backgroundColor: '#ccc',
                color: '#666',
                border: '2px solid #ccc',
              },
            }}
          >
            Importer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 
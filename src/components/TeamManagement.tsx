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
  Checkbox
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
  setNotification?: (notification: { message: string; type: 'success' | 'error' }) => void;
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
  setNotification,
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
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [membersToDelete, setMembersToDelete] = useState<string[]>([]);

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
    setMembersToDelete(selectedMembers);
    setShowDeleteConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      for (const id of membersToDelete) {
        await onDeleteMember(id);
      }
      setSelectedMembers([]);
      setShowDeleteConfirmDialog(false);
    } catch (error) {
      console.error('Error during bulk delete:', error);
    }
  };

  const handleBulkAddSubmit = async () => {
    try {
      const lines = bulkAddText.split('\n').filter(line => line.trim());
      const results: string[] = [];
      const errors: string[] = [];
      
      // Collecter tous les rôles et départements uniques
      const uniqueRoles = new Set<string>();
      const uniqueDepts = new Set<string>();
      
      lines.forEach(line => {
        const [_, roleName, deptName] = line.split(',').map(s => s.trim());
        if (roleName && deptName) {
          uniqueRoles.add(roleName);
          uniqueDepts.add(deptName);
        }
      });

      // Créer les rôles manquants
      for (const roleName of uniqueRoles) {
        if (!roles.find(r => r.name === roleName)) {
          const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .insert({ name: roleName })
            .select()
            .single();

          if (roleError) {
            console.error('Erreur lors de la création du rôle:', roleError);
            continue;
          }
          
          if (roleData) {
            roles.push(roleData);
          }
        }
      }

      // Créer les départements manquants
      for (const deptName of uniqueDepts) {
        if (!departments.find(d => d.name === deptName)) {
          const { data: deptData, error: deptError } = await supabase
            .from('departments')
            .insert({ name: deptName })
            .select()
            .single();

          if (deptError) {
            console.error('Erreur lors de la création du département:', deptError);
            continue;
          }
          
          if (deptData) {
            departments.push(deptData);
          }
        }
      }

      // Maintenant ajouter les membres
      for (const line of lines) {
        const [label, roleName, deptName] = line.split(',').map(s => s.trim());
        if (label && roleName && deptName) {
          try {
            // Vérifier si le rôle existe maintenant
            const role = roles.find(r => r.name === roleName);
            // Vérifier si le département existe maintenant
            const dept = departments.find(d => d.name === deptName);
            
            if (!role || !dept) {
              errors.push(`Impossible de créer le rôle "${roleName}" ou le département "${deptName}" pour ${label}`);
              continue;
            }
            
            await onAddMember({
              label,
              role: role.name,
              department: dept.name,
            });
            
            results.push(`${label} ajouté avec succès`);
          } catch (error) {
            if (error instanceof Error) {
              errors.push(error.message);
            }
          }
        }
      }
      
      // Afficher un résumé des opérations
      if (results.length > 0) {
        setNotification?.({
          message: `${results.length} membre(s) ajouté(s) avec succès${errors.length > 0 ? '. ' + errors.join('. ') : ''}`,
          type: errors.length > 0 ? 'error' : 'success'
        });
      } else if (errors.length > 0) {
        setNotification?.({
          message: errors.join('. '),
          type: 'error'
        });
      }
      
      if (results.length > 0) {
        setShowBulkAddDialog(false);
        setBulkAddText('');
      }
    } catch (error) {
      console.error('Error during bulk add:', error);
      throw error;
    }
  };

  const handleTextChange = (field: keyof MemberFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSelectChange = (field: keyof MemberFormData) => (
    event: SelectChangeEvent<string>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    try {
      if (editingMember) {
        await onUpdateMember(editingMember.id, formData);
      } else {
        await onAddMember(formData);
      }
      handleClose();
    } catch (err) {
      console.error('Error saving member:', err);
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
    setMembersToDelete([id]);
    setShowDeleteConfirmDialog(true);
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

      <List sx={{ width: '100%' }}>
        <ListItem>
          <ListItemIcon>
            <Checkbox
              edge="start"
              checked={selectedMembers.length === members.length}
              indeterminate={selectedMembers.length > 0 && selectedMembers.length < members.length}
              onChange={handleSelectAll}
            />
          </ListItemIcon>
          <ListItemText 
            primary="Tout sélectionner" 
            sx={{ 
              '& .MuiTypography-root': {
                fontWeight: 500,
              },
            }}
          />
          {selectedMembers.length > 0 && (
            <Button
              color="error"
              onClick={handleBulkDelete}
              sx={{
                borderRadius: 0,
                border: '2px solid #d32f2f',
                '&:hover': {
                  backgroundColor: '#ffebee',
                },
              }}
            >
              Supprimer ({selectedMembers.length})
            </Button>
          )}
        </ListItem>
        {members.map((member) => (
          <ListItem 
            key={member.id}
            sx={{
              borderBottom: '1px solid #eee',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={selectedMembers.includes(member.id)}
                onChange={() => handleToggleSelect(member.id)}
              />
            </ListItemIcon>
            <ListItemText
              primary={member.label}
              secondary={`${member.role} • ${member.department}`}
              sx={{
                '& .MuiTypography-root': {
                  fontWeight: member.label === 'Vous' ? 700 : 400,
                },
              }}
            />
            <ListItemSecondaryAction>
              <IconButton 
                edge="end" 
                onClick={() => handleEdit(member)}
                sx={{ mr: 1 }}
              >
                <EditIcon />
              </IconButton>
              <IconButton 
                edge="end" 
                onClick={() => handleDelete(member.id)}
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
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 3,
            p: 2,
          }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Format: nom,rôle,département (un par ligne)
            </Typography>
            <TextField
              multiline
              rows={4}
              value={bulkAddText}
              onChange={(e) => setBulkAddText(e.target.value)}
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
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          borderTop: '2px solid black',
        }}>
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

      <Dialog
        open={showDeleteConfirmDialog}
        onClose={() => setShowDeleteConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: '4px solid #000',
            backgroundColor: '#000',
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#000',
          color: '#fff',
          textTransform: 'uppercase',
          fontWeight: 700,
          fontSize: '1.5rem',
          textAlign: 'center',
          py: 2,
          borderBottom: '2px solid #fff'
        }}>
          ⚠️ ATTENTION ⚠️
        </DialogTitle>
        <DialogContent sx={{ mt: 2, p: 4, backgroundColor: '#000' }}>
          <Typography variant="h6" sx={{ 
            textAlign: 'center',
            fontWeight: 700,
            mb: 3,
            textTransform: 'uppercase',
            color: '#fff'
          }}>
            Êtes-vous sûr de vouloir supprimer {membersToDelete.length} membre{membersToDelete.length > 1 ? 's' : ''} ?
          </Typography>
          <Typography sx={{ 
            textAlign: 'center',
            color: '#999',
            mb: 2,
          }}>
            Cette action est irréversible.
          </Typography>
          <Box sx={{ 
            mt: 4,
            display: 'flex',
            gap: 2,
            justifyContent: 'center'
          }}>
            <Button
              onClick={() => setShowDeleteConfirmDialog(false)}
              sx={{
                backgroundColor: '#000',
                color: '#fff',
                border: '2px solid #fff',
                px: 4,
                py: 1,
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#fff',
                  color: '#000',
                  border: '2px solid #fff',
                },
              }}
            >
              ANNULER
            </Button>
            <Button
              onClick={handleConfirmDelete}
              sx={{
                backgroundColor: '#fff',
                color: '#000',
                border: '2px solid #fff',
                px: 4,
                py: 1,
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#000',
                  color: '#fff',
                  border: '2px solid #fff',
                },
              }}
            >
              SUPPRIMER
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
} 
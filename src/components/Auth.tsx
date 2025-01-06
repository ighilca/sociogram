import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Box, TextField, Button, Typography, Alert, Container, Paper, List, ListItem, ListItemIcon, ListItemText, AlertTitle, Snackbar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface PasswordCriteria {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  passwordsMatch: boolean;
}

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false,
  });
  const [notification, setNotification] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info';
    open: boolean;
  } | null>(null);

  const validatePassword = (pass: string, confirm: string) => {
    setPasswordCriteria({
      minLength: pass.length >= 8,
      hasUpperCase: /[A-Z]/.test(pass),
      hasLowerCase: /[a-z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
      passwordsMatch: pass === confirm && pass.length > 0,
    });
  };

  useEffect(() => {
    validatePassword(password, confirmPassword);
  }, [password, confirmPassword]);

  const isPasswordValid = () => {
    return Object.values(passwordCriteria).every(criteria => criteria);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setNotification({
      message,
      severity,
      open: true,
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!isPasswordValid()) {
          throw new Error('Le mot de passe ne respecte pas les critères de sécurité');
        }
        if (password !== confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }

        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/sociogram/#/`,
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('Cette adresse email est déjà utilisée');
          }
          throw error;
        }

        if (data?.user?.identities?.length === 0) {
          setSuccess('confirmation_needed');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            const { error: resendError } = await supabase.auth.resend({
              type: 'signup',
              email,
            });
            if (resendError) throw resendError;
            showNotification('Un nouvel email de confirmation vous a été envoyé.', 'info');
          } else if (error.message.includes('Invalid login credentials')) {
            throw new Error('Email ou mot de passe incorrect');
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 4
      }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            width: '100%',
            border: '2px solid black',
            borderRadius: 0,
            bgcolor: '#ffffff'
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            align="center" 
            sx={{ 
              mb: 4,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            {mode === 'login' ? 'Connexion' : 'Inscription'}
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                borderRadius: 0,
                bgcolor: '#ff000015',
                border: '1px solid #ff0000',
                '& .MuiAlert-icon': {
                  color: '#ff0000'
                }
              }}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 2,
                borderRadius: 0,
                bgcolor: '#00ff0015',
                border: '1px solid #00aa00',
                '& .MuiAlert-message': {
                  width: '100%'
                },
                '& .MuiAlert-icon': {
                  color: '#00aa00'
                }
              }}
            >
              <AlertTitle sx={{ fontWeight: 'bold' }}>Inscription réussie !</AlertTitle>
              <Typography variant="body2" paragraph>
                Un email de confirmation a été envoyé à <strong>{email}</strong>.
              </Typography>
              <Typography variant="body2">
                Veuillez vérifier votre boîte de réception et cliquer sur le lien de confirmation pour activer votre compte.
                Si vous ne trouvez pas l'email, pensez à vérifier vos spams.
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => setMode('login')}
                  sx={{
                    borderRadius: 0,
                    borderColor: '#000000',
                    color: '#000000',
                    '&:hover': {
                      borderColor: '#000000',
                      bgcolor: '#00000010'
                    }
                  }}
                >
                  Aller à la page de connexion
                </Button>
              </Box>
            </Alert>
          )}

          <Box component="form" onSubmit={handleAuth} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0,
                  '& fieldset': {
                    borderColor: '#000000',
                  },
                  '&:hover fieldset': {
                    borderColor: '#000000',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#000000',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#000000',
                },
              }}
            />
            <TextField
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              error={mode === 'signup' && password.length > 0 && !isPasswordValid()}
              helperText={mode === 'signup' && password.length > 0 && !isPasswordValid() ? 
                "Le mot de passe doit respecter tous les critères ci-dessous" : ""}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0,
                  '& fieldset': {
                    borderColor: '#000000',
                  },
                  '&:hover fieldset': {
                    borderColor: '#000000',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#000000',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#000000',
                },
              }}
            />

            {mode === 'signup' && (
              <TextField
                label="Confirmer le mot de passe"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                fullWidth
                error={confirmPassword.length > 0 && !passwordCriteria.passwordsMatch}
                helperText={confirmPassword.length > 0 && !passwordCriteria.passwordsMatch ? 
                  "Les mots de passe ne correspondent pas" : ""}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0,
                    '& fieldset': {
                      borderColor: '#000000',
                    },
                    '&:hover fieldset': {
                      borderColor: '#000000',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#000000',
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#000000',
                  },
                }}
              />
            )}

            {mode === 'signup' && (
              <List dense sx={{ 
                bgcolor: '#f5f5f5', 
                mt: 1,
                border: '1px solid #000000',
                p: 2
              }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 'bold', 
                  mb: 1,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5
                }}>
                  Critères du mot de passe :
                </Typography>
                <ListItem>
                  <ListItemIcon>
                    {passwordCriteria.minLength ? 
                      <CheckCircleIcon color="success" /> : 
                      <CancelIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText primary="Au moins 8 caractères" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {passwordCriteria.hasUpperCase ? 
                      <CheckCircleIcon color="success" /> : 
                      <CancelIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText primary="Au moins une majuscule" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {passwordCriteria.hasLowerCase ? 
                      <CheckCircleIcon color="success" /> : 
                      <CancelIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText primary="Au moins une minuscule" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {passwordCriteria.hasNumber ? 
                      <CheckCircleIcon color="success" /> : 
                      <CancelIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText primary="Au moins un chiffre" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {passwordCriteria.hasSpecialChar ? 
                      <CheckCircleIcon color="success" /> : 
                      <CancelIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText primary="Au moins un caractère spécial (!@#$%^&*)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {passwordCriteria.passwordsMatch ? 
                      <CheckCircleIcon color="success" /> : 
                      <CancelIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText primary="Les mots de passe correspondent" />
                </ListItem>
              </List>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={loading || (mode === 'signup' && !isPasswordValid())}
              fullWidth
              sx={{ 
                mt: 2,
                bgcolor: '#000000',
                color: '#ffffff',
                borderRadius: 0,
                textTransform: 'uppercase',
                letterSpacing: 1,
                '&:hover': {
                  bgcolor: '#333333'
                },
                '&:disabled': {
                  bgcolor: '#cccccc',
                  color: '#666666'
                }
              }}
            >
              {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              onClick={resetForm}
              sx={{ 
                textTransform: 'none',
                color: '#000000',
                textDecoration: 'underline',
                '&:hover': {
                  bgcolor: 'transparent',
                  textDecoration: 'none'
                }
              }}
            >
              {mode === 'login' 
                ? "Pas encore de compte ? S'inscrire" 
                : 'Déjà un compte ? Se connecter'}
            </Button>
          </Box>
        </Paper>
      </Box>
      <Snackbar
        open={notification?.open ?? false}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification?.severity ?? 'info'}
          sx={{ 
            width: '100%',
            borderRadius: 0,
            border: '1px solid',
            borderColor: notification?.severity === 'error' ? '#ff0000' : 
                        notification?.severity === 'success' ? '#00aa00' : '#0000ff'
          }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 
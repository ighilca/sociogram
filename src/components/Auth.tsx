import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Box, TextField, Button, Typography, Alert, Container, Paper, List, ListItem, ListItemIcon, ListItemText, AlertTitle, Snackbar, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import coefLogo from '../assets/coef.png';

interface PasswordCriteria {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  passwordsMatch: boolean;
}

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [lastResetAttempt, setLastResetAttempt] = useState<number>(0);

  useEffect(() => {
    // Vérifier si nous sommes dans un contexte de réinitialisation de mot de passe
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setMode('reset');
      // Récupérer le token de réinitialisation en gérant le double #
      const hashParts = hash.split('#');
      const lastPart = hashParts[hashParts.length - 1];
      
      // Extraire le token directement de la chaîne
      const tokenMatch = lastPart.match(/access_token=([^&]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;
      
      if (token) {
        console.log('Token trouvé');
        setAccessToken(token);
      } else {
        console.log('Hash reçu:', hash);
        console.log('Dernière partie:', lastPart);
      }
    }
  }, []);

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

  const handleResetPassword = async () => {
    try {
      setError(null);
      setSuccess(null);
      setResetLoading(true);

      if (!email) {
        setError('Veuillez entrer votre adresse email');
        return;
      }

      // Vérifier le délai depuis la dernière tentative
      const now = Date.now();
      const timeSinceLastAttempt = now - lastResetAttempt;
      if (timeSinceLastAttempt < 30000) { // 30 secondes
        const remainingSeconds = Math.ceil((30000 - timeSinceLastAttempt) / 1000);
        setError(`Pour des raisons de sécurité, veuillez attendre ${remainingSeconds} secondes avant de réessayer.`);
        return;
      }

      console.log('Tentative de réinitialisation pour:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        console.error('Détails complets de l\'erreur:', {
          message: error.message,
          status: error.status,
          name: error.name,
          details: error,
          stack: error.stack
        });
        
        if (error.message.includes('rate limit')) {
          throw new Error('Trop de tentatives. Veuillez réessayer plus tard.');
        } else if (error.message.includes('Email not found')) {
          throw new Error('Cette adresse email n\'est pas enregistrée dans notre système.');
        } else if (error.status === 500) {
          throw new Error('Le service de réinitialisation est temporairement indisponible. Veuillez réessayer plus tard.');
        } else {
          throw new Error(`Impossible d'envoyer l'email de réinitialisation : ${error.message}`);
        }
      }

      setLastResetAttempt(now);
      setSuccess('Un email de réinitialisation de mot de passe vous a été envoyé. Veuillez vérifier votre boîte de réception.');
      setPassword('');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setResetLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setLoading(true);

      if (!isPasswordValid()) {
        setError('Le mot de passe ne respecte pas les critères de sécurité');
        return;
      }

      if (!accessToken) {
        throw new Error('Token de réinitialisation manquant. Veuillez recommencer le processus.');
      }

      // Extraire l'email du token JWT
      const tokenParts = accessToken.split('.');
      if (tokenParts.length !== 3) throw new Error('Token invalide');
      
      const tokenPayload = JSON.parse(atob(tokenParts[1]));
      const email = tokenPayload.email;

      if (!email) throw new Error('Email non trouvé dans le token');

      // Mettre à jour le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess('Votre mot de passe a été mis à jour avec succès. Vous allez être redirigé vers la page de connexion.');
      setPassword('');
      setConfirmPassword('');
      
      // Rediriger vers la page de connexion après 2 secondes
      setTimeout(() => {
        setMode('login');
        window.location.hash = '';
      }, 2000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
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
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: 4 
          }}>
            <img 
              src={coefLogo} 
              alt="COEF Logo" 
              style={{ 
                height: '80px',
                width: 'auto',
                marginBottom: '1rem'
              }} 
            />
          </Box>

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
            {mode === 'login' ? 'Connexion' : 
             mode === 'signup' ? 'Inscription' : 
             'Réinitialisation du mot de passe'}
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
              <AlertTitle sx={{ fontWeight: 'bold' }}>
                {mode === 'signup' ? 'Inscription réussie !' : 
                 mode === 'reset' ? 'Mot de passe mis à jour !' :
                 'Email envoyé !'}
              </AlertTitle>
              {success}
            </Alert>
          )}

          <Box 
            component="form" 
            onSubmit={mode === 'reset' ? handleUpdatePassword : handleAuth} 
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {mode !== 'reset' && (
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
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <TextField
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            )}

            {(mode === 'signup' || mode === 'reset') && (
              <TextField
                label="Confirmer le mot de passe"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            )}

            {(mode === 'signup' || mode === 'reset') && (
              <List dense sx={{ bgcolor: '#f5f5f5', p: 2 }}>
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
                  <ListItemText primary="Au moins un caractère spécial" />
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
              disabled={loading || ((mode === 'signup' || mode === 'reset') && !isPasswordValid())}
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
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : mode === 'login' ? (
                'Se connecter'
              ) : mode === 'signup' ? (
                "S'inscrire"
              ) : (
                'Mettre à jour le mot de passe'
              )}
            </Button>

            {mode === 'login' && (
              <Button
                fullWidth
                variant="outlined"
                disabled={resetLoading}
                onClick={handleResetPassword}
                sx={{
                  color: '#000',
                  borderColor: '#000',
                  '&:hover': { 
                    bgcolor: '#f5f5f5',
                    borderColor: '#000'
                  },
                  height: '48px',
                  borderRadius: 0,
                }}
              >
                {resetLoading ? (
                  <CircularProgress size={24} sx={{ color: 'black' }} />
                ) : (
                  'Mot de passe oublié ?'
                )}
              </Button>
            )}

            {mode !== 'reset' && (
              <Button
                fullWidth
                variant="text"
                onClick={resetForm}
                sx={{
                  color: '#666',
                  '&:hover': { bgcolor: '#f5f5f5' },
                }}
              >
                {mode === 'login' ? 'Créer un compte' : 'Déjà un compte ?'}
              </Button>
            )}
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
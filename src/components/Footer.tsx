import { Box, Typography } from '@mui/material';
import coefLogo from '../assets/coef.png';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 2,
      py: 4,
      borderTop: '2px solid black',
      backgroundColor: '#fff',
      width: '100%',
    }}>
      <img 
        src={coefLogo}
        alt="Coefficience" 
        style={{ 
          height: '80px',
          width: 'auto',
        }} 
      />
      <Typography 
        variant="caption" 
        sx={{ 
          fontFamily: 'Roboto, sans-serif',
          opacity: 0.7,
        }}
      >
        © {currentYear} Coefficience. Tous droits réservés.
      </Typography>
    </Box>
  );
} 
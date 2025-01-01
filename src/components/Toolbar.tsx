import { Box, IconButton, Slider, Typography } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';

interface ToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  nodeSize: number;
  onNodeSizeChange: (size: number) => void;
}

export default function Toolbar({
  onZoomIn,
  onZoomOut,
  onCenter,
  nodeSize,
  onNodeSizeChange,
}: ToolbarProps) {
  return (
    <Box sx={{ 
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      flexWrap: 'wrap',
    }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton 
          onClick={onZoomIn}
          sx={{ 
            border: '2px solid black',
            borderRadius: 0,
            '&:hover': {
              backgroundColor: '#000',
              color: '#fff',
            },
          }}
        >
          <ZoomInIcon />
        </IconButton>
        <IconButton 
          onClick={onZoomOut}
          sx={{ 
            border: '2px solid black',
            borderRadius: 0,
            '&:hover': {
              backgroundColor: '#000',
              color: '#fff',
            },
          }}
        >
          <ZoomOutIcon />
        </IconButton>
        <IconButton 
          onClick={onCenter}
          sx={{ 
            border: '2px solid black',
            borderRadius: 0,
            '&:hover': {
              backgroundColor: '#000',
              color: '#fff',
            },
          }}
        >
          <CenterFocusStrongIcon />
        </IconButton>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        flexGrow: 1,
        maxWidth: 300,
      }}>
        <Typography 
          variant="body2" 
          sx={{ 
            whiteSpace: 'nowrap',
            fontWeight: 700,
          }}
        >
          Taille des nœuds:
        </Typography>
        <Slider
          value={nodeSize}
          onChange={(_, value) => onNodeSizeChange(value as number)}
          min={5}
          max={20}
          step={1}
          sx={{
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
              backgroundColor: '#fff',
              border: '2px solid black',
              borderRadius: 0,
              '&:hover, &.Mui-active': {
                boxShadow: 'none',
                backgroundColor: '#000',
              },
            },
            '& .MuiSlider-track': {
              backgroundColor: '#000',
              border: 'none',
              height: 4,
            },
            '& .MuiSlider-rail': {
              backgroundColor: '#ccc',
              height: 4,
            },
          }}
        />
      </Box>
    </Box>
  );
} 
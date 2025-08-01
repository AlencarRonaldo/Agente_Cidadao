import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  CheckCircle,
  Warning,
  Error,
  Info,
  Brightness4
} from '@mui/icons-material';
import { useCustomTheme } from '../contexts/ThemeContext';
import { useOptimizedColors } from '../hooks/useOptimizedColors';
import ThemeToggle from './ThemeToggle';

/**
 * Componente de demonstração das melhorias do tema dark
 * Mostra todos os componentes com contraste otimizado
 */
const ThemeDemo = () => {
  const { isDark, theme } = useCustomTheme();
  const colors = useOptimizedColors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');
  const [switchChecked, setSwitchChecked] = useState(false);

  // Dados de exemplo para demonstração
  const demoData = [
    { id: 1, status: 'APROVADA_ADMIN', title: 'Buraco na rua', bairro: 'Centro' },
    { id: 2, status: 'PENDENTE_MODERACAO', title: 'Iluminação pública', bairro: 'Vila Nova' },
    { id: 3, status: 'REJEITADA_BOT', title: 'Lixo acumulado', bairro: 'Jardim das Flores' },
    { id: 4, status: 'PUBLICADA', title: 'Semáforo quebrado', bairro: 'Centro' },
    { id: 5, status: 'ERRO', title: 'Calçada danificada', bairro: 'Bela Vista' }
  ];

  const statusLabels = {
    'APROVADA_ADMIN': 'Aprovada',
    'PENDENTE_MODERACAO': 'Pendente',
    'REJEITADA_BOT': 'Rejeitada',
    'PUBLICADA': 'Publicada',
    'ERRO': 'Erro'
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      {/* Header com toggle do tema */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ color: colors.textColors.header }}>
          Demonstração do Tema Dark Otimizado
        </Typography>
        <ThemeToggle variant="contained" size="large" />
      </Box>

      {/* Informações do tema atual */}
      <Card sx={{ mb: 4, backgroundColor: colors.backgroundColors.elevated }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ color: colors.textColors.primary }}>
            🎨 Tema Atual: {isDark ? 'Dark Mode' : 'Light Mode'}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.textColors.secondary, mb: 2 }}>
            Ratio de contraste: {colors.getContrastRatio()} | 
            Conformidade WCAG: {isDark ? 'AAA (7:1)' : 'AA (4.5:1)'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label="Alto Contraste" 
              color="primary" 
              icon={<CheckCircle />}
            />
            <Chip 
              label="Legibilidade Profissional" 
              color="success" 
              icon={<Visibility />}
            />
            <Chip 
              label="Acessibilidade WCAG" 
              color="info" 
              icon={<Info />}
            />
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Seção de Tipografia */}
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: colors.backgroundColors.card }}>
            <CardContent>
              <Typography variant="h4" gutterBottom sx={{ color: colors.textColors.header }}>
                📝 Tipografia Otimizada
              </Typography>
              <Typography variant="h5" sx={{ color: colors.textColors.primary, mb: 1 }}>
                Heading 5 - Peso 600
              </Typography>
              <Typography variant="h6" sx={{ color: colors.textColors.primary, mb: 2 }}>
                Heading 6 - Peso 600
              </Typography>
              <Typography variant="body1" sx={{ color: colors.textColors.body, mb: 1 }}>
                Body 1 - Texto principal com contraste otimizado para leitura prolongada.
                Line height 1.6 para melhor legibilidade.
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textColors.secondary, mb: 1 }}>
                Body 2 - Texto secundário com peso 400 e letter-spacing ajustado.
              </Typography>
              <Typography variant="caption" sx={{ color: colors.textColors.caption }}>
                Caption - Texto pequeno com peso 500 para melhor definição.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Seção de Status e Chips */}
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: colors.backgroundColors.card }}>
            <CardContent>
              <Typography variant="h4" gutterBottom sx={{ color: colors.textColors.header }}>
                🏷️ Status e Chips
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip label="Sucesso" color="success" />
                <Chip label="Erro" color="error" />
                <Chip label="Aviso" color="warning" />
                <Chip label="Info" color="info" />
              </Box>
              <Typography variant="h6" sx={{ color: colors.textColors.primary, mb: 1 }}>
                Status das Denúncias:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(statusLabels).map(([status, label]) => (
                  <Chip
                    key={status}
                    label={label}
                    sx={{
                      backgroundColor: colors.getStatusColor(status, 'background'),
                      color: colors.getStatusColor(status, 'text'),
                      border: `1px solid ${colors.getStatusColor(status, 'border')}`,
                      fontWeight: 600
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Seção de Formulários */}
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: colors.backgroundColors.card }}>
            <CardContent>
              <Typography variant="h4" gutterBottom sx={{ color: colors.textColors.header }}>
                📋 Formulários Otimizados
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nome Completo"
                  placeholder="Digite seu nome"
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  label="Email"
                  placeholder="seu@email.com"
                  type="email"
                  fullWidth
                  variant="outlined"
                />
                <FormControl fullWidth>
                  <InputLabel>Selecione uma opção</InputLabel>
                  <Select
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(e.target.value)}
                    label="Selecione uma opção"
                  >
                    <MenuItem value="opcao1">Opção 1</MenuItem>
                    <MenuItem value="opcao2">Opção 2</MenuItem>
                    <MenuItem value="opcao3">Opção 3</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={switchChecked}
                      onChange={(e) => setSwitchChecked(e.target.checked)}
                    />
                  }
                  label="Notificações ativadas"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Seção de Botões */}
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: colors.backgroundColors.card }}>
            <CardContent>
              <Typography variant="h4" gutterBottom sx={{ color: colors.textColors.header }}>
                🔘 Botões e Ações
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="contained" color="primary">
                    Primário
                  </Button>
                  <Button variant="contained" color="secondary">
                    Secundário
                  </Button>
                  <Button variant="outlined" color="primary">
                    Outlined
                  </Button>
                  <Button variant="text" color="primary">
                    Text
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Visualizar">
                    <IconButton color="primary">
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton color="secondary">
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton color="error">
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Button
                  variant="contained"
                  onClick={() => setDialogOpen(true)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Abrir Modal
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Seção de Alerts */}
        <Grid item xs={12}>
          <Card sx={{ backgroundColor: colors.backgroundColors.card }}>
            <CardContent>
              <Typography variant="h4" gutterBottom sx={{ color: colors.textColors.header }}>
                ⚠️ Alertas e Notificações
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="success" icon={<CheckCircle />}>
                  Operação realizada com sucesso! Contraste otimizado para fácil leitura.
                </Alert>
                <Alert severity="error" icon={<Error />}>
                  Erro ao processar a solicitação. Texto claramente visível no tema dark.
                </Alert>
                <Alert severity="warning" icon={<Warning />}>
                  Atenção: Verifique os dados antes de continuar.
                </Alert>
                <Alert severity="info" icon={<Info />}>
                  Informação: Sistema atualizado com melhorias de acessibilidade.
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Seção de Tabela */}
        <Grid item xs={12}>
          <Card sx={{ backgroundColor: colors.backgroundColors.card }}>
            <CardContent>
              <Typography variant="h4" gutterBottom sx={{ color: colors.textColors.header }}>
                📊 Tabela com Contraste Otimizado
              </Typography>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Título</TableCell>
                      <TableCell>Bairro</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {demoData.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.title}</TableCell>
                        <TableCell>{row.bairro}</TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[row.status]}
                            sx={{
                              backgroundColor: colors.getStatusColor(row.status, 'background'),
                              color: colors.getStatusColor(row.status, 'text'),
                              border: `1px solid ${colors.getStatusColor(row.status, 'border')}`,
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Visualizar">
                              <IconButton size="small" color="primary">
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton size="small" color="secondary">
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modal de Demonstração */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: colors.backgroundColors.modal.paper
          }
        }}
      >
        <DialogTitle sx={{ color: colors.textColors.primary }}>
          🌙 Modal com Tema Dark Otimizado
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: colors.textColors.body, mb: 2 }}>
            Este modal demonstra o backdrop melhorado e o contraste otimizado para
            o tema dark. Todos os elementos mantêm alta legibilidade.
          </Typography>
          <Typography variant="body2" sx={{ color: colors.textColors.secondary }}>
            O backdrop possui blur e a opacidade é ajustada para não cansar a vista,
            mantendo o foco no conteúdo do modal.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="secondary">
            Cancelar
          </Button>
          <Button onClick={() => setDialogOpen(false)} variant="contained" color="primary">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThemeDemo;
import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Chip,
  Alert,
  Button,
  Divider
} from '@mui/material';
import {
  Notifications,
  CheckCircle,
  Warning,
  Error,
  Info,
  Close,
  Schedule
} from '@mui/icons-material';

const SmartNotifications = ({ notifications = [] }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [localNotifications, setLocalNotifications] = useState([]);

  // Usar useMemo ou useState com inicialização única para evitar re-criação de timestamps
  const [defaultNotifications] = useState(() => [
    {
      id: 1,
      type: 'success',
      title: 'Publicação Concluída',
      message: 'Denúncia #DEN-123 foi publicada com sucesso no Instagram',
      timestamp: new Date().toISOString(),
      read: false,
      actions: ['Ver Post']
    },
    {
      id: 2,
      type: 'warning',
      title: 'Limite Diário Próximo',
      message: 'Você tem apenas 1 publicação restante para hoje',
      timestamp: new Date().toISOString(),
      read: false,
      actions: ['Ver Limites']
    }
  ]);

  useEffect(() => {
    // Só atualizar se notifications mudou de fato
    if (notifications.length > 0) {
      setLocalNotifications(notifications);
    } else if (localNotifications.length === 0) {
      // Só definir defaultNotifications se ainda não há notificações locais
      setLocalNotifications(defaultNotifications);
    }
  }, [notifications, defaultNotifications, localNotifications.length]);

  useEffect(() => {
    const unread = localNotifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [localNotifications]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = (id) => {
    setLocalNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setLocalNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      case 'info':
      default:
        return <Info color="info" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // diferença em segundos

    if (diff < 60) return 'agora mesmo';
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return `${Math.floor(diff / 86400)}d atrás`;
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleClick} color="inherit">
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            overflow: 'auto'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notificações</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
        </Box>
        
        <Divider />

        {localNotifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Nenhuma notificação
            </Typography>
          </Box>
        ) : (
          localNotifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              sx={{
                opacity: notification.read ? 0.7 : 1,
                backgroundColor: notification.read ? 'transparent' : 'action.hover',
                '&:hover': {
                  backgroundColor: 'action.selected'
                },
                display: 'block',
                py: 2
              }}
            >
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ mt: 0.5 }}>
                  {getIcon(notification.type)}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {notification.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {notification.message}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Schedule fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {getTimeAgo(notification.timestamp)}
                    </Typography>
                    {notification.actions && notification.actions.map((action, idx) => (
                      <Chip
                        key={idx}
                        label={action}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log(`Action clicked: ${action}`);
                        }}
                        sx={{ ml: 1 }}
                      />
                    ))}
                  </Box>
                </Box>
                {!notification.read && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      alignSelf: 'center'
                    }}
                  />
                )}
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};

export default SmartNotifications;
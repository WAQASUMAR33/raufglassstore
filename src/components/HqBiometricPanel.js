'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Backspace as BackspaceIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { Shield } from 'lucide-react';
import { branchFetch } from '@/lib/branch-client';

export default function HqBiometricPanel({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'info' });

  const [pinUserId, setPinUserId] = useState(null);
  const [pinDigits, setPinDigits] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState('enter');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const fetchAccounts = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setRefreshing(true);
    try {
      const res = await branchFetch(user, '/api/hq/biometrics');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load HQ accounts');
      setAccounts(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setMessage({ text: err.message || 'Failed to load accounts', severity: 'error' });
      setAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccounts(false);
  }, [fetchAccounts]);

  const pinUserObj = accounts.find((u) => u.user_id === pinUserId);
  const activePin = pinStep === 'enter' ? pinDigits : pinConfirm;

  function cancelPinSetup() {
    setPinUserId(null);
    setPinDigits('');
    setPinConfirm('');
    setPinStep('enter');
    setPinError('');
  }

  function handlePinDigit(digit) {
    if (pinStep === 'enter' && pinDigits.length < 6) setPinDigits((p) => p + digit);
    else if (pinStep === 'confirm' && pinConfirm.length < 6) setPinConfirm((p) => p + digit);
  }

  function handlePinBack() {
    if (pinStep === 'enter') setPinDigits((p) => p.slice(0, -1));
    else setPinConfirm((p) => p.slice(0, -1));
  }

  async function handlePinNext() {
    if (pinStep === 'enter') {
      if (pinDigits.length !== 6) {
        setPinError('Enter all 6 digits.');
        return;
      }
      setPinError('');
      setPinConfirm('');
      setPinStep('confirm');
      return;
    }

    if (pinConfirm.length !== 6) {
      setPinError('Confirm all 6 digits.');
      return;
    }

    if (pinDigits !== pinConfirm) {
      setPinError('PINs do not match. Try again.');
      setPinDigits('');
      setPinConfirm('');
      setPinStep('enter');
      return;
    }

    setPinLoading(true);
    setPinError('');
    try {
      const res = await branchFetch(user, '/api/hq/biometrics/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pinUserId, pin: pinDigits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set PIN');
      setMessage({ text: 'HQ PIN saved successfully.', severity: 'success' });
      await fetchAccounts(true);
      cancelPinSetup();
    } catch (err) {
      setPinError(err.message || 'Failed to set PIN');
    } finally {
      setPinLoading(false);
    }
  }

  async function removePin(userId) {
    if (!confirm('Remove PIN for this HQ account?')) return;
    try {
      const res = await branchFetch(user, '/api/hq/biometrics/pin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove PIN');
      }
      setMessage({ text: 'PIN removed.', severity: 'success' });
      await fetchAccounts(true);
    } catch (err) {
      setMessage({ text: err.message || 'Failed to remove PIN', severity: 'error' });
    }
  }

  const withPin = accounts.filter((a) => a.has_pin).length;

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 3,
          borderColor: '#e2e8f0',
          bgcolor: 'white',
          boxShadow: '0 2px 12px rgba(15,23,42,0.03)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#f5f3ff',
                color: '#6d28d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={20} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                HQ Security & PIN Management
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configure 6-digit authorization PINs for Head Office administrators
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon className={refreshing ? 'spin' : ''} />}
            onClick={() => fetchAccounts(false)}
            disabled={refreshing}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>

        {message.text && (
          <Alert severity={message.severity} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setMessage({ text: '', severity: 'info' })}>
            {message.text}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Chip icon={<Shield size={14} />} label={`${accounts.length} HQ account${accounts.length === 1 ? '' : 's'}`} sx={{ fontWeight: 700 }} />
          <Chip icon={<VpnKeyIcon fontSize="small" />} label={`${withPin} with PIN configured`} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>HQ Account</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>PIN Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#64748b', pr: 2 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5, color: '#64748b' }}>
                    No HQ accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((u) => (
                  <TableRow key={u.user_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#4338ca', width: 38, height: 38, fontWeight: 800 }}>
                          {u.full_name?.charAt(0)?.toUpperCase() || 'H'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>{u.full_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u.role?.replace(/_/g, ' ')} sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={u.has_pin ? <CheckCircleIcon /> : <LockIcon />}
                        label={u.has_pin ? 'Configured' : 'Not set'}
                        variant="outlined"
                        color={u.has_pin ? 'success' : 'default'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                        <Button size="small" variant="outlined" startIcon={<VpnKeyIcon />} onClick={() => { setPinUserId(u.user_id); setPinStep('enter'); setPinDigits(''); setPinConfirm(''); setPinError(''); }}>
                          {u.has_pin ? 'Change PIN' : 'Set PIN'}
                        </Button>
                        {u.has_pin && (
                          <Tooltip title="Remove PIN">
                            <IconButton size="small" color="error" onClick={() => removePin(u.user_id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* PIN dialog */}
      <Dialog open={!!pinUserId} onClose={cancelPinSetup} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle component="div" sx={{ textAlign: 'center', pt: 3 }}>
          <Typography variant="h6" component="div" fontWeight={800}>
            {pinStep === 'enter' ? 'Set 6-Digit PIN' : 'Confirm PIN'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pinUserObj?.full_name}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', my: 2 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 40,
                  height: 48,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: i < activePin.length ? '#4338ca' : '#cbd5e1',
                  bgcolor: i < activePin.length ? '#eef2ff' : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4338ca',
                  fontWeight: 800,
                }}
              >
                {i < activePin.length ? '●' : ''}
              </Box>
            ))}
          </Box>
          {pinError && <Alert severity="error" sx={{ mb: 1 }}>{pinError}</Alert>}
          <Grid container spacing={1}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Grid item xs={4} key={num}>
                <Button fullWidth variant="outlined" onClick={() => handlePinDigit(String(num))} sx={{ py: 1.2, fontWeight: 800 }}>
                  {num}
                </Button>
              </Grid>
            ))}
            <Grid item xs={4}>
              <Button fullWidth variant="outlined" onClick={handlePinBack} sx={{ py: 1.2 }}><BackspaceIcon /></Button>
            </Grid>
            <Grid item xs={4}>
              <Button fullWidth variant="outlined" onClick={() => handlePinDigit('0')} sx={{ py: 1.2, fontWeight: 800 }}>0</Button>
            </Grid>
            <Grid item xs={4}>
              <Button fullWidth variant="outlined" onClick={() => (pinStep === 'enter' ? setPinDigits('') : setPinConfirm(''))} sx={{ py: 1.2, fontSize: '0.75rem' }}>Clear</Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={cancelPinSetup}>Cancel</Button>
          <Button variant="contained" onClick={handlePinNext} disabled={pinLoading} sx={{ bgcolor: '#4338ca' }}>
            {pinLoading ? <CircularProgress size={20} color="inherit" /> : pinStep === 'enter' ? 'Next' : 'Save PIN'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Avatar, Switch, FormControlLabel, CircularProgress, IconButton, InputAdornment
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';

const API_URL = process.env.REACT_APP_API_URL;
const Personal: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: '', joinDate: '', profilePic: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');
  const [twoFA, setTwoFA] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const navigate = useNavigate();

  useEffect(() => {
  const fetchProfile = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      setProfile(data);
      setForm({
        name: data.name || '',
        email: data.email || '',
        role: data.role || '',
        joinDate: data.joinDate ? data.joinDate.slice(0,10) : '',
        profilePic: data.profilePic || ''
      });
      setTwoFA(!!data.twoFAEnabled);
    } catch {
      setProfile(null);
    }
    setLoading(false);
  };
  fetchProfile();
}, []);

  const handleEdit = (): void => setEditMode(true);
  const handleCancel = (): void => { setEditMode(false); setForm(profile); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setForm({ ...form, [e.target.name]: e.target.value });
};
  const handleSave = async () => {
  setSaving(true);
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  try {
    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setEditMode(false);
      setProfile({ ...profile, ...form });
    }
  } finally {
    setSaving(false);
  }
};
  const handlePasswordChange = async () => {
    setPasswordMsg('');
    if (passwords.new !== passwords.confirm) {
      setPasswordMsg('Passwords do not match');
      return;
    }
    // ...rest of your password change logic
  };

  // --- MAIN RENDER LOGIC ---
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><CircularProgress /></Box>;
  if (!profile) return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography color="error">Failed to load profile.</Typography>
      <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate(-1)}>Go Back</Button>
    </Box>
  );
  return (
    <Box sx={{ minHeight: '100vh', background: '#181a29', py: 6, position: 'relative' }}>

      <DashboardLayout>
        <Box maxWidth={480} mx="auto" mt={4} bgcolor="#23263a" borderRadius={4} p={4} boxShadow={6} sx={{ position: 'relative' }}>
          <IconButton
            aria-label="cancel"
            onClick={() => navigate(-1)}
            sx={{ position: 'absolute', top: 16, right: 16, color: '#b0b8d1', zIndex: 2 }}
          >
            <CloseIcon />
          </IconButton>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Avatar src={form.profilePic ? (form.profilePic.startsWith('http') ? form.profilePic : `${API_URL}${form.profilePic}`) : undefined} sx={{ width: 100, height: 100, mb: 2, fontSize: 44, border: '3px solid #7c3aed', boxShadow: 3 }}>
              {form.name ? form.name[0].toUpperCase() : '?'}
            </Avatar>
            {editMode ? (
              <>
                <Button
                  variant="outlined"
                  component="label"
                  sx={{ mb: 2, borderColor: '#7c3aed', color: '#7c3aed', fontWeight: 600, '&:hover': { borderColor: '#a78bfa', background: '#23263a' } }}
                >
                  Upload Profile Picture
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const token = localStorage.getItem('token');
                      const userId = localStorage.getItem('userId');
                      const formData = new FormData();
                      formData.append('profilePic', file);
                      try {
                        const res = await fetch(`${API_URL}/api/users/${userId}/profile-pic`, {
                          method: 'POST',
                          headers: { Authorization: token ? `Bearer ${token}` : '' },
                          body: formData,
                        });
                        const data = await res.json();
                        if (res.ok && data.profilePic) {
                          setForm(f => ({ ...f, profilePic: data.profilePic }));
                          localStorage.setItem('profilePic', data.profilePic);
                        } else {
                          setError(data.error || 'Upload failed');
                        }
                      } catch {
                        setError('Upload failed');
                      }
                    }}
                  />
                </Button>
                {form.profilePic && (
                  <Typography variant="body2" sx={{ color: '#b0b8d1', mb: 1 }}>
                    Uploaded!
                  </Typography>
                )}
              </>
            ) : null}
            <Typography variant="h4" fontWeight={700} sx={{ color: '#fff', mb: 1 }}>{form.name}</Typography>
            <Typography variant="subtitle1" sx={{ color: '#b0b8d1', fontSize: 18 }}>{form.email}</Typography>
            <Typography variant="body2" sx={{ color: '#7c3aed', mt: 1, fontWeight: 600 }}>{form.role}</Typography>
            <Typography variant="body2" sx={{ color: '#b0b8d1', mt: 1 }}>Joined: {form.joinDate}</Typography>
          </Box>
          <Box sx={{ borderBottom: '1px solid #31344d', mb: 3 }} />
        {editMode ? (
          <TextField label="Name" name="name" value={form.name} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
        ) : null}
        {error && <Box sx={{ color: 'red', mb: 2 }}>{error}</Box>}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
            <FormControlLabel
              control={<Switch checked={twoFA} onChange={() => setTwoFA(v => !v)} />}
              label={<span style={{ color: '#b0b8d1', fontWeight: 500 }}>2FA Enabled</span>}
              sx={{ mx: 0 }}
            />
          </Box>
        <Box sx={{ my: 3 }}>
          <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1 }}>Change Password</Typography>
          <TextField
            label="Current Password"
            type={showPwd.current ? 'text' : 'password'}
            name="current"
            value={passwords.current}
            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
            fullWidth sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPwd.current ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPwd(p => ({ ...p, current: !p.current }))}
                    edge="end"
                  >
                    {showPwd.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField
            label="New Password"
            type={showPwd.new ? 'text' : 'password'}
            name="new"
            value={passwords.new}
            onChange={e => setPasswords({ ...passwords, new: e.target.value })}
            fullWidth sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPwd.new ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPwd(p => ({ ...p, new: !p.new }))}
                    edge="end"
                  >
                    {showPwd.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField
            label="Confirm New Password"
            type={showPwd.confirm ? 'text' : 'password'}
            name="confirm"
            value={passwords.confirm}
            onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
            fullWidth sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPwd.confirm ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPwd(p => ({ ...p, confirm: !p.confirm }))}
                    edge="end"
                  >
                    {showPwd.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          {passwordMsg && <Typography sx={{ color: passwordMsg.includes('success') ? '#16ff7c' : '#ff1744' }}>{passwordMsg}</Typography>}
          <Button variant="contained" color="secondary" sx={{ mt: 1 }} disabled={saving || !passwords.current || !passwords.new || passwords.new !== passwords.confirm}
            onClick={async () => {
              setPasswordMsg('');
              setSaving(true);
              const token = localStorage.getItem('token');
              const userId = localStorage.getItem('userId');
              try {
                const res = await fetch(`${API_URL}/api/users/${userId}/password`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
                  body: JSON.stringify(passwords)
                });
                const data = await res.json();
                if (res.ok) setPasswordMsg('Password changed successfully!');
                else setPasswordMsg(data.message || 'Failed to change password');
              } catch {
                setPasswordMsg('Failed to change password');
              }
              setSaving(false);
            }}
          >Change Password</Button>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          {editMode ? (
            <>
              <Button variant="outlined" color="inherit" onClick={handleCancel}>Cancel</Button>
              <Button variant="contained" color="primary" disabled={saving} onClick={handleSave}>Save</Button>
            </>
          ) : (
            <Button variant="contained" color="primary" onClick={handleEdit}>Edit Profile</Button>
          )}
        </Box>
      </Box>
    </DashboardLayout>
    </Box>
  );
};

export default Personal;

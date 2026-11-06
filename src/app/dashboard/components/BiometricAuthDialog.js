'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function BiometricAuthDialog({ open, onSuccess, onClose, embedded = false, side = 'center' }) {
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPin('');
    setPinError('');
    setPinLoading(false);
  }, [open]);

  function addDigit(digit) {
    if (pin.length < 6) setPin((prev) => prev + digit);
  }

  function backspace() {
    setPin((prev) => prev.slice(0, -1));
  }

  async function submitPin() {
    if (pin.length !== 6) {
      setPinError('Enter all 6 digits.');
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setPinError('Session expired.');
      return;
    }

    setPinLoading(true);
    setPinError('');

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.user_id, pin }),
      });
      const data = await res.json();

      if (data.valid) {
        onSuccess();
      } else {
        setPinError(data.error || 'Incorrect PIN. Try again.');
        setPin('');
      }
    } catch {
      setPinError('Network error. Try again.');
      setPin('');
    } finally {
      setPinLoading(false);
    }
  }

  if (!open) return null;

  const card = (
    <div
      style={{
        background: 'white',
        borderRadius: embedded ? '16px' : '20px',
        padding: embedded ? '18px' : '28px',
        width: embedded ? '100%' : '380px',
        maxWidth: embedded ? '100%' : '95vw',
        boxShadow: embedded ? 'none' : '0 24px 64px rgba(0,0,0,0.35)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        height: embedded ? '100%' : 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>Confirm Identity</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
            Enter your 6-digit PIN to continue.
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            fontSize: '1rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              width: '42px',
              height: '48px',
              borderRadius: '10px',
              border: `2px solid ${i < pin.length ? '#1d4ed8' : '#e2e8f0'}`,
              background: i < pin.length ? '#eff6ff' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              color: '#1d4ed8',
            }}
          >
            {i < pin.length ? '●' : ''}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => addDigit(String(n))}
            style={{
              padding: '13px',
              fontSize: '1.15rem',
              fontWeight: '700',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              background: '#f8fafc',
              cursor: 'pointer',
              color: '#1e293b',
              transition: 'background 0.1s',
            }}
            onMouseDown={(e) => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseUp={(e) => (e.currentTarget.style.background = '#f8fafc')}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setPin('')}
          style={{
            padding: '13px',
            fontSize: '0.8rem',
            fontWeight: '700',
            border: '1.5px solid #fecaca',
            borderRadius: '10px',
            background: '#fff5f5',
            color: '#dc2626',
            cursor: 'pointer',
          }}
        >
          CLEAR
        </button>
        <button
          onClick={() => addDigit('0')}
          style={{
            padding: '13px',
            fontSize: '1.15rem',
            fontWeight: '700',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            background: '#f8fafc',
            cursor: 'pointer',
            color: '#1e293b',
          }}
          onMouseDown={(e) => (e.currentTarget.style.background = '#e2e8f0')}
          onMouseUp={(e) => (e.currentTarget.style.background = '#f8fafc')}
        >
          0
        </button>
        <button
          onClick={backspace}
          style={{
            padding: '13px',
            fontSize: '1rem',
            fontWeight: '700',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            background: '#f8fafc',
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          ⌫
        </button>
      </div>

      {pinError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '12px',
            fontSize: '0.82rem',
            color: '#dc2626',
          }}
        >
          ⚠️ {pinError}
        </div>
      )}

      <button
        onClick={submitPin}
        disabled={pinLoading || pin.length !== 6}
        style={{
          width: '100%',
          padding: '12px',
          background: pin.length !== 6 || pinLoading ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '0.875rem',
          cursor: pin.length !== 6 || pinLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {pinLoading ? 'Verifying...' : '🔓 Confirm with PIN'}
      </button>
    </div>
  );

  if (embedded) return card;

  const isSide = side === 'left' || side === 'right';

  const overlay = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        background: isSide ? 'transparent' : 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: isSide ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          ...(side === 'right'
            ? {
                position: 'absolute',
                left: 'calc(50% + 8px)',
                top: '50%',
                transform: 'translateY(-50%)',
              }
            : side === 'left'
              ? {
                  position: 'absolute',
                  right: 'calc(50% + 8px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }
              : {}),
        }}
      >
        {card}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return overlay;
  return createPortal(overlay, document.body);
}

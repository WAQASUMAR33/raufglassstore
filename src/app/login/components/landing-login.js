'use client';

import { useEffect, useState } from 'react';
import { MapPin, Phone, Store } from 'lucide-react';
import { LoginFormFields } from './login-shell';
import { useAuthLogin, useSessionGuard } from './use-login';
import { COMPANY, POWERED_BY } from '@/lib/brand-theme';

export default function LandingLogin() {
  useSessionGuard();
  const branchAuth = useAuthLogin('branch');

  useEffect(() => {
    branchAuth.setBranchCode('MAIN');
  }, []);

  return (
    <div className="landing-root">
      {/* Brand panel — modern glass manufacturer hero */}
      <div className="landing-brand">
        <div className="brand-scene" aria-hidden="true">
          <div className="brand-photo-bg" />
          <div className="brand-photo-overlay" />
          <div className="brand-vignette" />
        </div>

        <div className="brand-content">
          <div className="brand-logo">
            <Store size={44} color="white" strokeWidth={1.75} />
          </div>

          <h1 className="brand-title">
            {COMPANY.name}
          </h1>
          <p className="brand-title-ur">{COMPANY.nameUr}</p>
          <p className="brand-tagline">{COMPANY.tagline}</p>
          <div className="brand-divider" />

          <span className="brand-badge">
            <span className="badge-dot" style={{ background: '#0DCAF0' }} />
            Main Branch
          </span>

          <p className="brand-desc">
            Sign in to Zain Traders POS — sales, stock, and accounts.
          </p>
          <p className="brand-sub">Main Branch · POS &amp; ERP</p>

          <div className="brand-contact">
            <span><MapPin size={14} /> {COMPANY.address}</span>
            <span><Phone size={14} /> {COMPANY.phones.join(' · ')}</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="landing-form-panel">
        <div className="landing-form-center">
          <div className="form-wrap">
            <div className="form-header">
              <h2>Sign In</h2>
              <p>Your store POS system</p>
            </div>

            <div className="form-body">
              <LoginFormFields
                email={branchAuth.email}
                setEmail={branchAuth.setEmail}
                password={branchAuth.password}
                setPassword={branchAuth.setPassword}
                branchCode="MAIN"
                setBranchCode={branchAuth.setBranchCode}
                showBranchCode={false}
                showPassword={branchAuth.showPassword}
                setShowPassword={branchAuth.setShowPassword}
                error={branchAuth.error}
                loading={branchAuth.loading}
                submitLabel="Sign In"
                accent="#1A55E3"
                accentDark="#1347c4"
                onSubmit={branchAuth.handleSubmit}
              />
            </div>
          </div>
          </div>

          <footer className="landing-form-footer">
            <div className="landing-footer-card">
              <p className="landing-footer-copy">
                © {new Date().getFullYear()} {COMPANY.name}
              </p>
              <div className="landing-footer-rule" aria-hidden="true" />
              <div className="landing-footer-powered">
                <span className="landing-footer-powered-label">{POWERED_BY.label}</span>
                <span className="landing-footer-powered-name">{POWERED_BY.name}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        .landing-root {
          display: flex;
          min-height: 100vh;
          width: 100%;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .landing-brand {
          flex: 1 1 52%;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
          background: #0f172a;
          perspective: 1100px;
        }

        .brand-scene {
          position: absolute;
          inset: -6%;
          transform-style: preserve-3d;
          animation: sceneTilt 22s ease-in-out infinite alternate;
          will-change: transform;
        }

        @keyframes sceneTilt {
          0% {
            transform: rotateX(1.8deg) rotateY(-2.2deg);
          }
          100% {
            transform: rotateX(-1.2deg) rotateY(2.2deg);
          }
        }

        .brand-photo-bg {
          position: absolute;
          inset: 0;
          background: url('/landing-brand-bg.jpg') center center / cover no-repeat;
          animation: imageDrift 28s ease-in-out infinite alternate;
          will-change: transform;
        }

        @keyframes imageDrift {
          0% {
            transform: scale(1.06) translate(0.5%, 0.3%);
          }
          100% {
            transform: scale(1.13) translate(-1.8%, -1.2%);
          }
        }

        .brand-photo-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            160deg,
            rgba(15, 23, 42, 0.78) 0%,
            rgba(26, 85, 227, 0.45) 45%,
            rgba(15, 23, 42, 0.82) 100%
          );
          pointer-events: none;
        }

        .brand-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 85% 75% at 50% 45%, transparent 30%, rgba(0, 0, 0, 0.5) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, transparent 35%, rgba(0, 0, 0, 0.3) 100%);
          pointer-events: none;
        }

        .brand-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 400px;
        }

        .brand-logo {
          width: 88px;
          height: 88px;
          margin: 0 auto 22px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-title {
          color: white;
          font-size: clamp(1.65rem, 3.5vw, 2rem);
          font-weight: 800;
          line-height: 1.2;
          margin: 0 0 8px;
          text-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
        }

        .brand-title-ur {
          color: rgba(255, 255, 255, 0.92);
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0 0 10px;
          direction: rtl;
          text-shadow: 0 1px 12px rgba(0, 0, 0, 0.45);
        }

        .brand-tagline {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin: 0 0 20px;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.4);
        }

        .brand-divider {
          width: 48px;
          height: 3px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 2px;
          margin: 0 auto 20px;
        }

        .brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 20px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.28);
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: 18px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .brand-desc {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.92rem;
          line-height: 1.55;
          margin: 0 0 8px;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.45);
        }

        .brand-sub {
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.82rem;
          margin: 0 0 28px;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.4);
        }

        .brand-contact {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .brand-contact span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 0.82rem;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45);
        }

        .landing-form-panel {
          flex: 1 1 48%;
          position: relative;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 40px 36px;
        }

        .landing-form-center {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .form-wrap {
          width: 100%;
        }

        .tab-switch {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #f1f5f9;
          border-radius: 14px;
          padding: 4px;
          margin-bottom: 28px;
          border: 1px solid #e8ecf3;
        }

        .tab-btn {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border: none;
          background: transparent;
          border-radius: 11px;
          font-size: 0.9rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: color 0.25s ease;
        }

        .tab-btn.tab-active {
          color: white;
        }

        .tab-indicator {
          position: absolute;
          top: 4px;
          left: 4px;
          width: calc(50% - 4px);
          height: calc(100% - 8px);
          border-radius: 11px;
          background: linear-gradient(135deg, #0284c7, #0ea5e9);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .form-header {
          margin-bottom: 22px;
        }

        .form-header h2 {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px;
        }

        .form-header p {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
        }

        .form-body {
          animation: tabContentIn 0.35s ease;
        }

        .hq-form-slot {
          height: 340px;
          position: relative;
          overflow: hidden;
        }

        @keyframes tabContentIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        :global(.hq-auth-modes) {
          display: flex;
          justify-content: center;
          gap: 4px;
          margin-bottom: 8px;
          padding: 0;
          background: transparent;
          border: none;
        }

        :global(.hq-auth-modes.bio-mode) {
          margin-bottom: 0;
        }

        :global(.hq-auth-mode-btn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 16px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        :global(.hq-auth-mode-btn.bio-tab) {
          padding: 8px 14px;
          font-size: 0.78rem;
          color: rgba(15, 23, 42, 0.45);
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(8px);
        }

        :global(.hq-auth-mode-btn.bio-tab.active) {
          color: white;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 8px 24px rgba(79, 70, 229, 0.35);
        }

        :global(.hq-auth-mode-btn.active) {
          color: white;
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
        }

        :global(.hq-auth-modes:not(.bio-mode)) {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 20px;
          padding: 5px;
          background: #f1f5f9;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
        }

        :global(.hq-auth-modes:not(.bio-mode) .hq-auth-mode-btn) {
          border: 1px solid transparent;
          border-radius: 10px;
          padding: 12px 10px;
        }

        .landing-form-footer {
          width: 100%;
          margin: 0;
          padding: 0;
        }

        .landing-footer-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 0;
          border: none;
          background: transparent;
          box-shadow: none;
        }

        .landing-footer-copy {
          margin: 0;
          color: #94a3b8;
          font-size: 0.6875rem;
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .landing-footer-rule {
          width: 100%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #e2e8f0 20%,
            #e2e8f0 80%,
            transparent 100%
          );
        }

        .landing-footer-powered {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .landing-footer-powered-label {
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .landing-footer-powered-name {
          font-size: 0.8125rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #166534;
        }

        @media (max-width: 900px) {
          .landing-root {
            flex-direction: column;
          }
          .landing-brand {
            flex: none;
            min-height: 48vh;
            padding: 36px 20px;
          }
          .landing-form-panel {
            flex: 1;
            padding: 32px 24px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .brand-scene,
          .brand-photo-bg {
            animation: none !important;
          }
          .brand-scene {
            inset: 0;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

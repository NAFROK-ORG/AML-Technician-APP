import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useForm } from "react-hook-form";
import Navbar from "../components/Navbar";
import ProfileSetupModal from "../components/ProfileSetupModal";
import EntryForm from "../components/EntryForm";
import EntryTable from "../components/EntryTable";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";
import TechnicianTypeModal from "../components/TechnicianTypeModal";
import { CATEGORIES } from "../utils/constants";
import { normalizeVehicleNo } from "../utils/vehicleUtils"; // ← NEW

// ─── Stable month reference (page-load time) ─────────────────────────────────
const NOW = new Date();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtMoney = (n) => {
  if (n === 0) return "₹0";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const toDateInputValue = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 10); }
  catch { return ""; }
};

const TODAY_LABEL = NOW.toLocaleDateString("en-IN", {
  weekday: "short", day: "numeric", month: "short", year: "numeric",
}).toUpperCase();

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── FIX Bug 4: SLABS constant removed — now uses data.nextSlab from API ──────
// The backend returns nextSlab (the next slab object to reach, or null if at max).
// Using data.nextSlab is always correct for any tier (mechanic or helper).

// ─── Injected styles ──────────────────────────────────────────────────────────
const DASHBOARD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  @keyframes tdFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes attPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

  /* ── Edit Modal — shared with EntryForm keyframe ── */
  @keyframes emSlideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes emSpinnerRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes emProgressFill {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }

  /* Kill number spinners in edit modal */
  .em-input[type=number]::-webkit-inner-spin-button,
  .em-input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .em-input[type=number] { -moz-appearance: textfield; }

  .td-page {
    min-height: 100dvh;
    background: #EEF2F7;
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .td-a1 { animation: tdFadeUp 0.32s ease both 0.00s; }
  .td-a2 { animation: tdFadeUp 0.32s ease both 0.06s; }
  .td-a3 { animation: tdFadeUp 0.32s ease both 0.10s; }
  .td-a4 { animation: tdFadeUp 0.32s ease both 0.14s; }
  .td-a5 { animation: tdFadeUp 0.32s ease both 0.18s; }

  /* ── Page header ── */
  .td-page-header {
    padding: 24px 20px 20px;
    background: #FFFFFF;
    border-bottom: 1px solid #DDE3EE;
  }
  .td-eyebrow {
    font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #1E3A8A; margin-bottom: 6px;
  }
  .td-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 36px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.02em; text-transform: uppercase;
    line-height: 1; margin-bottom: 8px;
  }
  .td-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .td-tech-id {
    font-family: 'IBM Plex Mono', monospace; font-size: 11px;
    color: #1E3A8A; font-weight: 600; letter-spacing: 0.06em;
    background: #EEF2F7; padding: 3px 8px; border: 1px solid #DDE3EE;
  }
  .td-branch-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: #6B7A99; background: #F8FAFC;
    padding: 3px 8px; border: 1px solid #DDE3EE;
  }

  /* ── Attendance Card ── */
  .td-att-wrap { border-left: 1px solid #DDE3EE; border-right: 1px solid #DDE3EE; border-bottom: 1px solid #DDE3EE; background: #FFFFFF; overflow: hidden; }
  .td-att-card {
    padding: 20px 20px 18px; display: flex; align-items: center;
    justify-content: space-between; gap: 16px;
    border-left: 4px solid #CBD5E1;
    transition: border-left-color 0.3s ease, background 0.3s ease;
  }
  .td-att-card.att-present  { border-left-color: #16A34A; background: #F0FDF4; }
  .td-att-card.att-loading  { border-left-color: #E2E8F0; }
  .td-att-left { flex: 1; min-width: 0; }
  .td-att-eyebrow {
    font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #6B7A99; margin-bottom: 5px;
  }
  .td-att-today {
    font-family: 'Barlow Condensed', sans-serif; font-size: 20px;
    font-weight: 700; color: #0A1628; letter-spacing: 0.04em;
    text-transform: uppercase; line-height: 1.1; margin-bottom: 5px;
  }
  .td-att-status-text { font-size: 11px; font-weight: 500; color: #94A3B8; letter-spacing: 0.02em; }
  .td-att-status-text.present { color: #16A34A; font-weight: 600; }

  .td-toggle-btn {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    flex-shrink: 0; background: none; border: none; cursor: pointer; padding: 4px 0;
    -webkit-tap-highlight-color: transparent;
  }
  .td-toggle-btn:disabled { cursor: not-allowed; }
  .td-toggle-track {
    width: 64px; height: 34px; border-radius: 17px;
    background: #E2E8F0; border: 2px solid #CBD5E1;
    position: relative; transition: background 0.2s ease, border-color 0.2s ease;
    will-change: background, border-color;
  }
  .td-toggle-track.on { background: #16A34A; border-color: #15803D; }
  .td-toggle-track.on.loading { opacity: 0.82; }
  .td-toggle-track.loading:not(.on) { opacity: 0.55; }
  .td-toggle-knob {
    position: absolute; top: 3px; left: 3px; width: 24px; height: 24px;
    border-radius: 50%; background: #FFFFFF;
    box-shadow: 0 2px 6px rgba(0,0,0,0.22);
    transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }
  .td-toggle-track.on .td-toggle-knob { transform: translateX(30px); }
  .td-toggle-label { font-size: 8px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #94A3B8; transition: color 0.2s ease; }
  .td-toggle-label.on { color: #16A34A; }

  .td-att-prompt { background: #EEF2F7; border-top: 1px solid #E2E8F0; padding: 9px 20px; display: flex; align-items: center; gap: 8px; }
  .td-att-prompt-dot { width: 5px; height: 5px; border-radius: 50%; background: #1E3A8A; flex-shrink: 0; animation: attPulse 1.6s ease-in-out infinite; }
  .td-att-prompt-text { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #1E3A8A; }

  /* ── Gate overlay ── */
  .td-gate-wrap { position: relative; }
  .td-gate-overlay { position: absolute; inset: 0; background: rgba(238,242,247,0.80); z-index: 50; pointer-events: all; backdrop-filter: grayscale(0.4); -webkit-backdrop-filter: grayscale(0.4); }

  /* ── Stat grid ── */
  .td-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #DDE3EE; border-left: 1px solid #DDE3EE; border-right: 1px solid #DDE3EE; }
  .td-stat-card { background: #FFFFFF; padding: 18px 16px 16px; display: flex; flex-direction: column; }
  .td-stat-card-accent { background: #FFFFFF; border-left: 3px solid #1E3A8A; }
  .td-stat-label { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #6B7A99; margin-bottom: 10px; }
  .td-stat-value { font-family: 'Barlow Condensed', sans-serif; font-size: 36px; font-weight: 700; color: #0A1628; line-height: 1; letter-spacing: 0.01em; margin-bottom: 4px; }
  .td-stat-unit { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #94A3B8; }

  /* ── Month context banner ── */
  .td-month-banner { background: #F8FAFC; border-left: 1px solid #DDE3EE; border-right: 1px solid #DDE3EE; border-bottom: 1px solid #EEF2F7; padding: 7px 16px; display: flex; align-items: center; gap: 8px; }
  .td-month-banner-dot { width: 5px; height: 5px; border-radius: 50%; background: #1E3A8A; flex-shrink: 0; }
  .td-month-banner-text { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #6B7A99; }
  .td-month-banner-value { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600; color: #1E3A8A; letter-spacing: 0.06em; }

  /* ── New Entry button ── */
  .td-new-entry-btn {
    width: 100%; height: 60px; background: #1E3A8A; border: none;
    border-top: 1px solid #DDE3EE; color: #FFFFFF;
    font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; font-weight: 700;
    letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    transition: background 0.15s ease; border-radius: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .td-new-entry-btn:hover  { background: #1E40AF; }
  .td-new-entry-btn:active { background: #1E3A8A; }
  .td-new-entry-btn:disabled { background: #94A3B8; cursor: not-allowed; }

  /* ── Section wrapper ── */
  .td-section { margin: 16px 0 0; border: 1px solid #DDE3EE; background: #FFFFFF; overflow: hidden; }
  .td-section-header { padding: 14px 20px; border-bottom: 1px solid #EEF2F7; display: flex; justify-content: space-between; align-items: center; }
  .td-section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #6B7A99; }
  .td-section-count { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #94A3B8; }

  /* ── Incentive card ── */
  .td-incentive-toggle { width: 100%; padding: 18px 20px; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 12px; -webkit-tap-highlight-color: transparent; }
  .td-incentive-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #1E3A8A; margin-bottom: 3px; text-align: left; }
  .td-incentive-sub { font-size: 11px; color: #6B7A99; font-weight: 400; text-align: left; }
  .td-chevron { width: 32px; height: 32px; border: 1.5px solid #DDE3EE; display: flex; align-items: center; justify-content: center; color: #374151; font-size: 20px; flex-shrink: 0; transition: transform 0.22s ease, border-color 0.15s; line-height: 1; }
  .td-chevron.open { transform: rotate(180deg); border-color: #1E3A8A; color: #1E3A8A; }

  /* ── Month nav ── */
  .td-month-strip { padding: 10px 20px; border-top: 1px solid #EEF2F7; border-bottom: 1px solid #EEF2F7; background: #F8FAFC; display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
  .td-month-nav { background: none; border: 1.5px solid #DDE3EE; width: 32px; height: 32px; cursor: pointer; color: #374151; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 0; transition: border-color 0.15s, color 0.15s; -webkit-tap-highlight-color: transparent; }
  .td-month-nav:hover:not(:disabled) { border-color: #1E3A8A; color: #1E3A8A; }
  .td-month-nav:disabled { color: #CBD5E1; cursor: not-allowed; border-color: #EEF2F7; }
  .td-month-now-pill { background: none; border: 1.5px solid #1E3A8A; padding: 4px 10px; cursor: pointer; color: #1E3A8A; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-family: 'IBM Plex Sans', sans-serif; border-radius: 0; transition: background 0.15s, color 0.15s; -webkit-tap-highlight-color: transparent; }
  .td-month-now-pill:hover { background: #1E3A8A; color: #FFFFFF; }
  .td-month-label { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; color: #0A1628; min-width: 72px; text-align: center; }

  /* ── Incentive body ── */
  .td-incentive-body { padding: 20px; }
  .td-totals-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: #DDE3EE; border: 1px solid #DDE3EE; margin-bottom: 20px; }
  .td-total-cell { background: #F8FAFC; padding: 12px 8px; text-align: center; }
  .td-total-cell-label { font-size: 8px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #94A3B8; margin-bottom: 5px; }
  .td-total-cell-value { font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 700; }

  .td-threshold-block { margin-bottom: 16px; }
  .td-threshold-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
  .td-threshold-label { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6B7A99; }
  .td-threshold-vals { display: flex; align-items: center; gap: 6px; }
  .td-threshold-current { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700; color: #0A1628; }
  .td-threshold-sep { font-size: 10px; color: #CBD5E1; }
  .td-threshold-target { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #94A3B8; }
  .td-threshold-badge { font-size: 9px; font-weight: 700; padding: 2px 7px; letter-spacing: 0.04em; }
  .td-threshold-badge.met   { color: #16A34A; background: #DCFCE7; border: 1px solid #BBF7D0; }
  .td-threshold-badge.unmet { color: #DC2626; background: #FEF2F2; border: 1px solid #FECACA; }
  .td-progress-track { height: 5px; background: #E2E8F0; overflow: hidden; }
  .td-progress-fill  { height: 100%; transition: width 0.5s cubic-bezier(0.22,1,0.36,1); }
  .td-both-warning { background: #FEF2F2; border: 1px solid #FECACA; border-left: 3px solid #DC2626; padding: 10px 12px; margin-top: 4px; font-size: 11px; font-weight: 500; color: #991B1B; font-family: 'IBM Plex Sans', sans-serif; }

  .td-slab-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .td-slab-badge { padding: 6px 16px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'IBM Plex Sans', sans-serif; border: 1.5px solid; }
  .td-slab-badge.achieved { color: #16A34A; border-color: #86EFAC; background: #F0FDF4; }
  .td-slab-badge.none     { color: #94A3B8; border-color: #E2E8F0; background: #F8FAFC; }

  .td-breakdown { background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 3px solid #1E3A8A; }
  .td-breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 11px 14px; border-bottom: 1px solid #EEF2F7; }
  .td-breakdown-row:last-child { border-bottom: none; }
  .td-breakdown-label { font-size: 11px; color: #6B7A99; font-weight: 500; font-family: 'IBM Plex Sans', sans-serif; }
  .td-breakdown-value { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; color: #374151; }
  .td-breakdown-row.dimmed .td-breakdown-label,
  .td-breakdown-row.dimmed .td-breakdown-value { color: #CBD5E1; }

  .td-final-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 14px 12px; background: #FFFFFF; border: 1px solid #DDE3EE; border-top: none; }
  .td-final-label { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-family: 'IBM Plex Sans', sans-serif; }
  .td-final-amount { font-family: 'Barlow Condensed', sans-serif; font-size: 32px; font-weight: 700; letter-spacing: 0.02em; }
  .td-entry-note { font-size: 10px; color: #94A3B8; text-align: right; padding: 8px 20px 16px; font-weight: 500; letter-spacing: 0.02em; }

  /* ── FAB ── */
  .td-fab {
    position: fixed; bottom: 24px; right: 20px;
    width: 56px; height: 56px; border-radius: 50%;
    background: #1E3A8A; color: #FFFFFF; border: none; cursor: pointer;
    font-size: 26px; font-weight: 300; display: flex;
    align-items: center; justify-content: center;
    box-shadow: 0 4px 20px rgba(30,58,138,0.35);
    transition: background 0.15s, transform 0.15s, opacity 0.15s;
    z-index: 100; -webkit-tap-highlight-color: transparent;
  }
  .td-fab:hover  { background: #1E40AF; transform: scale(1.06); }
  .td-fab:active { background: #1E3A8A; transform: scale(0.97); }
  .td-fab:disabled { background: #94A3B8; cursor: not-allowed; transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.15); opacity: 0.6; }

  /* States */
  .td-empty { padding: 40px 20px; text-align: center; }
  .td-empty-icon { font-size: 28px; margin-bottom: 10px; }
  .td-empty-text { font-size: 12px; color: #94A3B8; font-weight: 500; letter-spacing: 0.06em; }
  .td-loading { padding: 40px 20px; text-align: center; font-size: 12px; color: #94A3B8; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; }
  .td-incent-placeholder { padding: 32px 20px; text-align: center; }
  .td-incent-placeholder-text { font-size: 12px; color: #94A3B8; font-weight: 500; letter-spacing: 0.06em; }

  /* ─────────────────────────────────────────────────────────────────────────
     Edit Entry Modal — bottom sheet
  ───────────────────────────────────────────────────────────────────────── */

  .em-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(10, 22, 40, 0.72);
    display: flex; align-items: flex-end; justify-content: center;
  }

  .em-sheet {
    background: #FFFFFF;
    border-radius: 16px 16px 0 0;
    width: 100%; max-width: 520px;
    max-height: 92dvh;
    overflow-y: auto; overflow-x: hidden;
    padding-bottom: env(safe-area-inset-bottom, 24px);
    -webkit-overflow-scrolling: touch;
    animation: emSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
    position: relative;
  }
  .em-sheet::-webkit-scrollbar { width: 4px; }
  .em-sheet::-webkit-scrollbar-track { background: #F8FAFC; }
  .em-sheet::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }

  .em-progress {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: #DDE3EE; border-radius: 16px 16px 0 0; overflow: hidden;
  }
  .em-progress-fill {
    position: absolute; inset: 0; background: #1E3A8A;
    animation: emProgressFill 1.8s ease-in-out infinite alternate;
  }

  .em-header {
    position: sticky; top: 0; z-index: 10;
    background: #FFFFFF;
    border-bottom: 1.5px solid #E2E8F0;
    padding: 14px 20px;
  }
  .em-drag-handle {
    width: 40px; height: 4px; background: #CBD5E1;
    border-radius: 2px; margin: 0 auto 14px;
  }
  .em-header-row { display: flex; justify-content: space-between; align-items: center; }
  .em-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px; font-weight: 700; color: #0A1628;
    letter-spacing: 0.04em; text-transform: uppercase;
    margin: 0; line-height: 1;
  }
  .em-subtitle {
    font-size: 11px; font-weight: 600; color: #6B7A99;
    margin-top: 4px; letter-spacing: 0.1em; text-transform: uppercase;
    font-family: 'IBM Plex Sans', sans-serif;
    transition: color 0.2s;
  }
  .em-close {
    background: #F8FAFC; border: 1.5px solid #DDE3EE; border-radius: 0;
    width: 44px; height: 44px; color: #374151; font-size: 22px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; line-height: 1;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, border-color 0.15s;
  }
  .em-close:hover:not(:disabled) { background: #F1F5F9; border-color: #94A3B8; }
  .em-close:disabled { opacity: 0.4; cursor: not-allowed; }

  .em-body {
    display: flex; flex-direction: column; gap: 22px;
    padding: 24px 20px 36px;
  }

  .em-error-banner {
    background: #FEF2F2; border: 1.5px solid #FCA5A5;
    border-left: 4px solid #DC2626; padding: 14px 16px;
  }
  .em-error-text {
    margin: 0; font-size: 13px; font-weight: 600; color: #991B1B;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  .em-label {
    display: block; font-size: 10px; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase; color: #374151;
    margin-bottom: 8px; font-family: 'IBM Plex Sans', sans-serif;
  }
  .em-required { color: #1E3A8A; margin-left: 3px; }

  .em-input {
    width: 100%; box-sizing: border-box;
    height: 56px; padding: 0 14px;
    background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 0;
    color: #0A1628; font-size: 16px; font-weight: 700;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none; appearance: none; -webkit-appearance: none;
    transition: border-color 0.15s, background 0.15s;
  }
  .em-input:focus   { border-color: #1E3A8A !important; background: #FFFFFF !important; outline: none; }
  .em-input--err    { border-color: #DC2626 !important; background: #FEF2F2 !important; }
  .em-input[type="date"] { color-scheme: light; font-size: 15px; }

  .em-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%231E3A8A' d='M7 9.5L2 4.5h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 14px center;
    padding-right: 40px; cursor: pointer;
  }

  .em-field-err {
    margin: 6px 0 0; font-size: 11px; font-weight: 600;
    color: #DC2626; letter-spacing: 0.02em;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  .em-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  .em-prefix {
    position: absolute; left: 0; top: 0; bottom: 0; width: 48px;
    display: flex; align-items: center; justify-content: center;
    color: #FFFFFF; font-weight: 700; font-family: 'IBM Plex Sans', sans-serif;
    pointer-events: none; user-select: none; z-index: 1;
  }
  .em-prefix--primary { background: #1E3A8A; font-size: 18px; }
  .em-prefix--hrs     { background: #1E3A8A; font-size: 13px; letter-spacing: 0.04em; }
  .em-prefix--lve     { background: #64748B; font-size: 11px; letter-spacing: 0.04em; }

  .em-divider { display: flex; align-items: center; gap: 12px; margin: 4px 0 0; }
  .em-divider-line  { flex: 1; height: 1px; background: #E2E8F0; }
  .em-divider-label { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #94A3B8; white-space: nowrap; }

  .em-submit {
    width: 100%; height: 60px; background: #1E3A8A; border: none; border-radius: 0;
    color: #FFFFFF; font-size: 13px; font-weight: 700; letter-spacing: 0.16em;
    text-transform: uppercase; cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif; margin-top: 6px;
    transition: background 0.15s; -webkit-tap-highlight-color: transparent;
    display: flex; align-items: center; justify-content: center;
  }
  .em-submit:hover:not(:disabled) { background: #1E40AF; }
  .em-submit:active:not(:disabled) { background: #1E3A8A; transform: scale(0.99); }
  .em-submit:disabled { background: #93C5FD; cursor: not-allowed; }

  .em-cancel {
    background: none; border: none; color: #94A3B8; cursor: pointer;
    font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    font-family: 'IBM Plex Sans', sans-serif; padding: 4px;
    margin-top: -10px; align-self: center;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.15s;
  }
  .em-cancel:hover:not(:disabled) { color: #374151; }
  .em-cancel:disabled { opacity: 0.4; cursor: not-allowed; }

  .em-spinner {
    display: inline-block; width: 18px; height: 18px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: #FFFFFF; border-radius: 50%;
    animation: emSpinnerRotate 0.65s linear infinite;
    margin-right: 10px; flex-shrink: 0;
  }

  /* Normalization preview inside edit modal */
  .em-norm-preview {
    margin: 5px 0 0;
    font-size: 10px; font-weight: 600;
    color: #1E3A8A; letter-spacing: 0.06em;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  @media (max-width: 480px) {
    .em-row { grid-template-columns: 1fr; }
  }
`;

// ─── Module-level style injection ─────────────────────────────────────────────
if (typeof document !== "undefined") {
  const _styleId = "td-dashboard-styles";
  if (!document.getElementById(_styleId)) {
    const _el = document.createElement("style");
    _el.id = _styleId;
    _el.textContent = DASHBOARD_STYLES;
    document.head.appendChild(_el);
  } else {
    document.getElementById(_styleId).textContent = DASHBOARD_STYLES;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = memo(function StatCard({ label, value, unit, accent, accentCard }) {
  return (
    <div className={`td-stat-card${accentCard ? " td-stat-card-accent" : ""}`}>
      <div className="td-stat-label">{label}</div>
      <div className="td-stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {unit && <div className="td-stat-unit">{unit}</div>}
    </div>
  );
});

const ThresholdBar = memo(function ThresholdBar({ label, current, target, met, formatValue }) {
  const pct = Math.min((current / (target + 1)) * 100, 100);
  return (
    <div className="td-threshold-block">
      <div className="td-threshold-meta">
        <span className="td-threshold-label">{label}</span>
        <div className="td-threshold-vals">
          <span className="td-threshold-current">{formatValue(current)}</span>
          <span className="td-threshold-sep">/</span>
          <span className="td-threshold-target">{formatValue(target)}</span>
          <span className={`td-threshold-badge ${met ? "met" : "unmet"}`}>
            {met ? "✓" : "✗"}
          </span>
        </div>
      </div>
      <div className="td-progress-track">
        <div
          className="td-progress-fill"
          style={{ width: `${pct}%`, background: met ? "#16A34A" : "#1E3A8A" }}
        />
      </div>
    </div>
  );
});

// ─── Attendance Card ──────────────────────────────────────────────────────────
const AttendanceCard = memo(function AttendanceCard({ attStatus, attMarking, onMark }) {
  const isMarked  = attStatus?.marked === true;
  const isLoading = attStatus === null;

  return (
    <div className="td-att-wrap td-a1">
      <div className={`td-att-card${isMarked ? " att-present" : isLoading ? " att-loading" : ""}`}>
        <div className="td-att-left">
          <div className="td-att-eyebrow">Today's Attendance</div>
          <div className="td-att-today">{TODAY_LABEL}</div>
          <div className={`td-att-status-text${isMarked ? " present" : ""}`}>
            {attStatus === null
              ? "Checking status…"
              : isMarked
              ? `✓ Present · Marked at ${fmtTime(attStatus.markedAt)}`
              : "Toggle to mark yourself present"}
          </div>
        </div>

        <button
          className="td-toggle-btn"
          onClick={onMark}
          disabled={isMarked || isLoading}
          aria-label={isMarked ? "Attendance marked" : "Mark attendance"}
        >
          <div className={[
            "td-toggle-track",
            isMarked   ? "on"      : "",
            attMarking ? "loading" : "",
          ].filter(Boolean).join(" ")}>
            <div className="td-toggle-knob" />
          </div>
          <span className={`td-toggle-label${isMarked ? " on" : ""}`}>
            {isMarked ? "Present" : isLoading ? "…" : "Off"}
          </span>
        </button>
      </div>

      {!isMarked && attStatus !== null && (
        <div className="td-att-prompt">
          <div className="td-att-prompt-dot" />
          <span className="td-att-prompt-text">
            Mark attendance to unlock dashboard &amp; job card entry
          </span>
        </div>
      )}
    </div>
  );
});

// ─── Incentive Dropdown ───────────────────────────────────────────────────────
const IncentiveDropdown = memo(function IncentiveDropdown() {
  const [open,       setOpen]       = useState(false);
  const [year,       setYear]       = useState(NOW.getFullYear());
  const [month,      setMonth]      = useState(NOW.getMonth() + 1);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState("");

  const isCurrentMonth =
    year  === NOW.getFullYear() &&
    month === NOW.getMonth() + 1;

  const fetchIncentive = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await api.get(`/api/entries/my/incentive?year=${year}&month=${month}`);
      setData(res.data);
    } catch (err) {
      console.error("Incentive fetch error:", err);
      setFetchError("Failed to load incentive data");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (open) fetchIncentive();
  }, [open, fetchIncentive]);

  const goBack = useCallback(() => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }, [month]);

  const goForward = useCallback(() => {
    if (isCurrentMonth) return;
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }, [isCurrentMonth, month]);

  const resetToCurrent = useCallback(() => {
    setYear(NOW.getFullYear());
    setMonth(NOW.getMonth() + 1);
  }, []);

  const toggleOpen = useCallback(() => setOpen((o) => !o), []);

  // ── FIX Bug 4: use data.nextSlab from API instead of local SLABS constant ──
  // progressTarget is null when at max slab — drives conditional rendering below.
  const currentSlabNum = data?.slabNumber ?? 0;
  const progressTarget = data?.nextSlab ?? null;  // null = at max slab

  // ── FIX Bug 4: hoursMet/labourMet for totals cell coloring ───────────────
  // Green when in any slab (slabNumber > 0 means both thresholds were met).
  // Old code hardcoded Mechanic Slab 1 thresholds (100h / ₹47500) — wrong for helpers.
  const hoursMet  = data ? data.slabNumber > 0 : false;
  const labourMet = data ? data.slabNumber > 0 : false;
  const bothMet   = data ? data.slabNumber > 0 : false;

  // ── FIX Bug 4: separate "next threshold" vars for the progress warning ────
  // The warning shows when ONE next-threshold is met but not the other.
  const nextHoursMet  = progressTarget ? data.totalHours  > progressTarget.minHours  : false;
  const nextLabourMet = progressTarget ? data.totalLabour > progressTarget.minLabour : false;

  return (
    <div className="td-section" style={{ marginTop: 16 }}>
      <button className="td-incentive-toggle" onClick={toggleOpen}>
        <div>
          <div className="td-incentive-eyebrow">Monthly Incentive</div>
          <div className="td-incentive-sub">Payout on every month</div>
        </div>
        <div className={`td-chevron${open ? " open" : ""}`}>›</div>
      </button>

      {open && (
        <>
          <div className="td-month-strip">
            {!isCurrentMonth && (
              <button className="td-month-now-pill" onClick={resetToCurrent}>Now</button>
            )}
            <button className="td-month-nav" onClick={goBack} aria-label="Previous month">‹</button>
            <span className="td-month-label">{MONTH_NAMES[month - 1].slice(0, 3)} {year}</span>
            <button className="td-month-nav" onClick={goForward} disabled={isCurrentMonth} aria-label="Next month">›</button>
          </div>

          {loading ? (
            <div className="td-incent-placeholder">
              <p className="td-incent-placeholder-text">Loading…</p>
            </div>
          ) : fetchError ? (
            <div className="td-incent-placeholder">
              <p style={{ color: "#DC2626", fontSize: "12px", fontWeight: "600" }}>{fetchError}</p>
            </div>
          ) : data?.entryCount === 0 ? (
            <div className="td-incent-placeholder">
              <p className="td-incent-placeholder-text">
                No entries for {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
          ) : data && (
            <div className="td-incentive-body">
              <div className="td-totals-grid">
                {[
                  { label: "Hours",  value: `${data.totalHours}h`,     color: hoursMet  ? "#16A34A" : "#0A1628" },
                  { label: "Labour", value: fmtMoney(data.totalLabour), color: labourMet ? "#16A34A" : "#0A1628" },
                  { label: "Leave",  value: `${data.totalLeave}d`,      color: "#0A1628" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="td-total-cell">
                    <div className="td-total-cell-label">{label}</div>
                    <div className="td-total-cell-value" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* ── FIX Bug 4: progress section — uses progressTarget (null = max slab) ── */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{
                  fontSize: "9px", fontWeight: "700", letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "#94A3B8", marginBottom: "14px",
                }}>
                  {/* FIX: was `currentSlabNum === 3` — broke at Slab 4 */}
                  {progressTarget === null
                    ? "Max slab achieved"
                    : `Progress toward Slab ${progressTarget.slab}`}
                </div>

                {/* FIX Bug 4: ThresholdBars only render when there IS a next target */}
                {progressTarget !== null && (
                  <>
                    <ThresholdBar
                      label="Hours"
                      current={data.totalHours}
                      target={progressTarget.minHours}
                      met={data.totalHours > progressTarget.minHours}
                      formatValue={(v) => `${v} hrs`}
                    />
                    <ThresholdBar
                      label="Labour"
                      current={data.totalLabour}
                      target={progressTarget.minLabour}
                      met={data.totalLabour > progressTarget.minLabour}
                      formatValue={(v) => fmtMoney(v)}
                    />
                    {/* FIX Bug 4: warning uses nextHoursMet/nextLabourMet, not the slab-coloring booleans */}
                    {(nextHoursMet !== nextLabourMet) && (
                      <div className="td-both-warning">
                        Both hours and labour must exceed their threshold for a slab to apply.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="td-slab-row">
                <div className={`td-slab-badge ${bothMet && currentSlabNum > 0 ? "achieved" : "none"}`}>
                  {currentSlabNum > 0 ? `Slab ${currentSlabNum}` : "No Slab"}
                </div>
                <div className="td-slab-desc">
                  {currentSlabNum > 0
                    ? `₹${data.baseIncentive.toLocaleString()} base incentive`
                    : "Thresholds not yet met"}
                </div>
              </div>

              <div className="td-breakdown">
                {[
                  {
                    // FIX Bug 4: show slab4Bonus inline when present
                    label: `Base Incentive${data.slab4Bonus > 0
                      ? ` (incl. ₹${data.slab4Bonus.toLocaleString()} variable)`
                      : ""}`,
                    value: data.baseIncentive > 0
                      ? `₹${data.baseIncentive.toLocaleString()}`
                      : "₹0",
                    dimmed: data.baseIncentive === 0,
                  },
                  {
                    label: `Leave Multiplier (${data.leaveTier ?? "—"})`,
                    value: `${Math.round(data.leaveMultiplier * 100)}%`,
                    dimmed: data.leaveMultiplier === 0,
                  },
                  {
                    label: "No-Leave Bonus",
                    value: data.noLeaveBonus > 0 ? `+₹${data.noLeaveBonus.toLocaleString()}` : "—",
                    dimmed: data.noLeaveBonus === 0,
                  },
                  // FIX Bug 5: was hardcoded "₹10,000 max" — wrong for helper tier (cap = ₹7,000)
                  ...(data.isCapped ? [{
                    label: "Cap Applied",
                    value: `₹${(data.maxIncentive ?? 10000).toLocaleString()} max`,
                    dimmed: false,
                  }] : []),
                ].map(({ label, value, dimmed }) => (
                  <div key={label} className={`td-breakdown-row${dimmed ? " dimmed" : ""}`}>
                    <span className="td-breakdown-label">{label}</span>
                    <span className="td-breakdown-value">{value}</span>
                  </div>
                ))}
              </div>

              <div className="td-final-row">
                <span className="td-final-label" style={{ color: data.finalIncentive > 0 ? "#1E3A8A" : "#94A3B8" }}>
                  {isCurrentMonth ? "Projected Incentive" : "Final Incentive"}
                </span>
                <span className="td-final-amount" style={{ color: data.finalIncentive > 0 ? "#0A1628" : "#CBD5E1" }}>
                  {data.finalIncentive > 0 ? `₹${data.finalIncentive.toLocaleString()}` : "₹0"}
                </span>
              </div>

              {isCurrentMonth && data.entryCount > 0 && (
                <p className="td-entry-note">
                  Based on {data.entryCount} {data.entryCount === 1 ? "entry" : "entries"} this month · updates as you log
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

// ─── Edit Entry Modal ─────────────────────────────────────────────────────────
function EditEntryModal({ entry, onSave, onClose, saving, error }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  // Live vehicle number value — drives the normalization preview
  const vehicleNoValue = watch("vehicleNo", "");

  useEffect(() => {
    if (entry) {
      reset({
        date:         toDateInputValue(entry.date),
        category:     entry.category     || "",
        vehicleNo:    entry.vehicleNo    || "",
        jcNo:         entry.jcNo         || "",
        hoursWorked:  entry.hoursWorked  ?? "",
        labourAmount: entry.labourAmount ?? "",
        leaveDays:    entry.leaveDays    ?? 0,
      });
    }
  }, [entry, reset]);

  if (!entry) return null;

  return (
    <div
      className="em-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="em-sheet" onClick={(e) => e.stopPropagation()}>

        {saving && (
          <div className="em-progress">
            <div className="em-progress-fill" />
          </div>
        )}

        {/* ── Sticky header ── */}
        <div className="em-header">
          <div className="em-drag-handle" />
          <div className="em-header-row">
            <div>
              <h2 className="em-title">Edit Entry</h2>
              <p className="em-subtitle" style={{ color: saving ? "#93C5FD" : "#6B7A99" }}>
                {saving ? "Saving…" : "Update job card"}
              </p>
            </div>
            <button
              type="button"
              className="em-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Form body ── */}
        <form onSubmit={handleSubmit(onSave)} noValidate className="em-body">

          {error && (
            <div className="em-error-banner">
              <p className="em-error-text">{error}</p>
            </div>
          )}

          {/* ── Date + Category ── */}
          <div className="em-row">
            <div>
              <label className="em-label">
                Date <span className="em-required">*</span>
              </label>
              <input
                type="date"
                className={`em-input${errors.date ? " em-input--err" : ""}`}
                {...register("date", { required: "Date is required" })}
              />
              {errors.date && <p className="em-field-err">{errors.date.message}</p>}
            </div>
            <div>
              <label className="em-label">
                Category <span className="em-required">*</span>
              </label>
              <select
                className={`em-input em-select${errors.category ? " em-input--err" : ""}`}
                {...register("category", { required: "Category is required" })}
              >
                <option value="">Select…</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="em-field-err">{errors.category.message}</p>}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="em-divider">
            <div className="em-divider-line" />
            <span className="em-divider-label">Job Details</span>
            <div className="em-divider-line" />
          </div>

          {/* ── Vehicle No + JC No ── */}
          <div className="em-row">

            {/* ── Vehicle No — REQUIRED ── */}
            <div>
              <label className="em-label">
                Vehicle No <span className="em-required">*</span>
              </label>
              <input
                type="text"
                placeholder="KA01AB1234"
                className={`em-input${errors.vehicleNo ? " em-input--err" : ""}`}
                style={{ letterSpacing: "0.06em", fontSize: "14px" }}
                autoComplete="off"
                spellCheck={false}
                maxLength={20}
                {...register("vehicleNo", {
                  required: "Vehicle number is required",
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
              {errors.vehicleNo && <p className="em-field-err">{errors.vehicleNo.message}</p>}
              {vehicleNoValue && !errors.vehicleNo && (
                <p className="em-norm-preview">
                  Stored as: {normalizeVehicleNo(vehicleNoValue)}
                </p>
              )}
            </div>

            <div>
              <label className="em-label">
                JC No <span className="em-required">*</span>
              </label>
              <input
                type="text"
                className={`em-input${errors.jcNo ? " em-input--err" : ""}`}
                {...register("jcNo", { required: "JC No cannot be empty" })}
              />
              {errors.jcNo && <p className="em-field-err">{errors.jcNo.message}</p>}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="em-divider">
            <div className="em-divider-line" />
            <span className="em-divider-label">Financials &amp; Hours</span>
            <div className="em-divider-line" />
          </div>

          {/* ── Labour Amount ── */}
          <div>
            <label className="em-label">
              Labour Amount <span className="em-required">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--primary">₹</div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className={`em-input${errors.labourAmount ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("labourAmount", {
                  required: "Required",
                  min:      { value: 0,      message: "Min ₹0" },
                  max:      { value: 100000, message: "Max ₹1,00,000" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.labourAmount && <p className="em-field-err">{errors.labourAmount.message}</p>}
          </div>

          {/* ── Hours Worked ── */}
          <div>
            <label className="em-label">
              Hours Worked <span className="em-required">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--hrs">HRS</div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className={`em-input${errors.hoursWorked ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("hoursWorked", {
                  required: "Required",
                  min:      { value: 0,  message: "Min 0" },
                  max:      { value: 24, message: "Max 24 hrs" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.hoursWorked && <p className="em-field-err">{errors.hoursWorked.message}</p>}
          </div>

          {/* ── Leave Days ── */}
          <div>
            <label className="em-label">Leave Days</label>
            <div style={{ position: "relative" }}>
              <div className="em-prefix em-prefix--lve">LVE</div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className={`em-input${errors.leaveDays ? " em-input--err" : ""}`}
                style={{ paddingLeft: "62px" }}
                {...register("leaveDays", {
                  required: "Required",
                  min:      { value: 0,  message: "Min 0" },
                  max:      { value: 31, message: "Max 31 days" },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.leaveDays && <p className="em-field-err">{errors.leaveDays.message}</p>}
          </div>

          {/* ── Save ── */}
          <button type="submit" className="em-submit" disabled={saving}>
            {saving
              ? <><span className="em-spinner" />Saving…</>
              : "Save Changes"}
          </button>

          <button
            type="button"
            className="em-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function TechnicianDashboard() {
  const { user } = useAuthStore();

  const [entries,          setEntries]          = useState([]);
  // FIX Bug 1+2: track real server total separately from loaded entries array
  const [entriesTotal,     setEntriesTotal]     = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [showForm,         setShowForm]         = useState(false);
  const [currentIncentive, setCurrentIncentive] = useState(null);

  const [attStatus,  setAttStatus]  = useState(null);
  const [attMarking, setAttMarking] = useState(false);

  const [editingEntry, setEditingEntry] = useState(null);
  const [editSaving,   setEditSaving]   = useState(false);
  const [editError,    setEditError]    = useState("");

  // FIX Bug 1: was `setEntries(res.data)` — backend returns { entries, total, page, pages }
  // not a plain array. That caused entries.filter() to throw TypeError immediately.
  // FIX Bug 2: was no pagination params — backend defaulted to page=1, limit=20.
  // Now requests limit=100 (max the backend allows) so all entries are loaded.
const fetchEntries = useCallback(async () => {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  try {
    const res = await api.get(`/api/entries/my?year=${year}&month=${month}`);
    setEntries(res.data.entries || []);
    setEntriesTotal(res.data.total || 0);
  } catch (err) {
    console.error("Entries fetch error:", err);
  } finally {
    setLoading(false);
  }
}, []);

  const fetchCurrentIncentive = useCallback(async () => {
    try {
      const res = await api.get(
        `/api/entries/my/incentive?year=${NOW.getFullYear()}&month=${NOW.getMonth() + 1}`
      );
      setCurrentIncentive(res.data?.finalIncentive ?? 0);
    } catch (err) {
      console.error("Incentive stat fetch error:", err);
    }
  }, []);

  const fetchAttStatus = useCallback(async () => {
    try {
      const res = await api.get("/api/attendance/today");
      setAttStatus(res.data);
    } catch (err) {
      console.error("Attendance status fetch error:", err);
      setAttStatus({ marked: false, markedAt: null });
    }
  }, []);

  const handleMarkAttendance = useCallback(async () => {
    if (attMarking || attStatus?.marked) return;
    setAttMarking(true);
    setAttStatus({ marked: true, markedAt: new Date().toISOString() });
    try {
      const res = await api.post("/api/attendance/mark");
      const att = res.data.attendance;
      setAttStatus({ marked: true, markedAt: att.markedAt });
    } catch (err) {
      console.error("Mark attendance error:", err);
      setAttStatus({ marked: false, markedAt: null });
    } finally {
      setAttMarking(false);
    }
  }, [attMarking, attStatus?.marked]);

  useEffect(() => {
    fetchEntries();
    fetchCurrentIncentive();
  }, [fetchEntries, fetchCurrentIncentive]);

  useEffect(() => {
    if (user?.profileComplete) fetchAttStatus();
  }, [user?.profileComplete, fetchAttStatus]);

  const handleSaved = useCallback(() => {
    fetchEntries();
    fetchCurrentIncentive();
  }, [fetchEntries, fetchCurrentIncentive]);

  const handleOpenForm  = useCallback(() => setShowForm(true),  []);
  const handleCloseForm = useCallback(() => setShowForm(false), []);

  const handleOpenEdit = useCallback((entry) => {
    setEditError("");
    setEditingEntry(entry);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingEntry(null);
    setEditError("");
  }, []);

  const handleSaveEdit = useCallback(async (formData) => {
    if (editSaving || !editingEntry) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await api.put(`/api/entries/${editingEntry._id}`, {
        date:         formData.date,
        category:     formData.category,
        vehicleNo:    formData.vehicleNo,
        jcNo:         formData.jcNo,
        hoursWorked:  Number(formData.hoursWorked),
        labourAmount: Number(formData.labourAmount),
        leaveDays:    Number(formData.leaveDays),
      });
      setEntries((prev) =>
        prev.map((e) => (e._id === editingEntry._id ? res.data.entry : e))
      );
      fetchCurrentIncentive();
      setEditingEntry(null);
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to update. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }, [editSaving, editingEntry, fetchCurrentIncentive]);


 const totalHours    = useMemo(() => entries.reduce((s, e) => s + (e.hoursWorked  || 0), 0), [entries]);
const totalLabour   = useMemo(() => entries.reduce((s, e) => s + (e.labourAmount || 0), 0), [entries]);
const totalLeave    = useMemo(() => entries.reduce((s, e) => s + (e.leaveDays    || 0), 0), [entries]);
const totalVehicles = useMemo(() => new Set(entries.map((e) => e.vehicleNo).filter(Boolean)).size, [entries]);
  const incentiveDisplay = useMemo(() => {
    if (currentIncentive === null) return "—";
    if (currentIncentive === 0)    return "₹0";
    return fmtMoney(currentIncentive);
  }, [currentIncentive]);

  const needsProfile = user?.role === "technician" && !user?.profileComplete;
  const needsType    = user?.role === "technician" && user?.profileComplete && !user?.technicianType;
  const entryAllowed = attStatus?.marked === true && !needsType;
  const isGated      = user?.profileComplete && attStatus?.marked !== true;

  const currentMonthLabel = `${MONTH_NAMES[NOW.getMonth()]} ${NOW.getFullYear()}`;

  return (
    <div className="td-page">
      {needsProfile && <ProfileSetupModal />}
      {needsType    && <TechnicianTypeModal />}
      <Navbar />

      {/* ── Page header ── */}
      <div className="td-page-header td-a1">
        <div className="td-eyebrow">Technician Dashboard</div>
        <h1 className="td-name">{user?.name?.split(" ")[0]}</h1>
        <div className="td-meta">
          {user?.technicianId && (
            <span className="td-tech-id">{user.technicianId}</span>
          )}
          {user?.branch && (
            <span className="td-branch-badge">{user.branch}</span>
          )}
          {user?.technicianType && (
            <span className="td-branch-badge" style={{ color: "#1E3A8A", borderColor: "#1E3A8A" }}>
              {user.technicianType}
            </span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "0 0 100px", maxWidth: "600px", margin: "0 auto" }}>

        {!needsProfile && (
          <AttendanceCard
            attStatus={attStatus}
            attMarking={attMarking}
            onMark={handleMarkAttendance}
          />
        )}

        <div className="td-gate-wrap">
          {isGated && <div className="td-gate-overlay" />}

          {/* ── Stats grid ── */}
        <div className="td-stat-grid td-a2">
  <StatCard label="Entries"         value={loading ? "—" : entries.length} />
  <StatCard label="Hours Worked"    value={loading ? "—" : totalHours}     unit={loading ? "" : "hrs"} />
  <StatCard label="Labour Earned"   value={loading ? "—" : fmtMoney(totalLabour)} />
  <StatCard label="Leave Days"      value={loading ? "—" : totalLeave}     unit={loading ? "" : "days"} />
  <StatCard label="Vehicles Served" value={loading ? "—" : totalVehicles}  unit={loading ? "" : "unique"} />
  <StatCard
    label="Projected Incentive"
    value={incentiveDisplay}
    unit="this month"
    accent={currentIncentive > 0 ? "#16A34A" : undefined}
    accentCard={currentIncentive > 0}
  />
</div>

          {/* ── Month context banner ── */}
          <div className="td-month-banner td-a2">
            <div className="td-month-banner-dot" />
            <span className="td-month-banner-text">Showing stats for</span>
            <span className="td-month-banner-value">{currentMonthLabel}</span>
          </div>

          {/* ── New Entry button ── */}
          <button
            className="td-new-entry-btn td-a3"
            onClick={() => entryAllowed && handleOpenForm()}
            disabled={!entryAllowed}
          >
            <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
            New Entry
          </button>

          {/* ── Monthly Incentive dropdown ── */}
          <div className="td-a4">
            <IncentiveDropdown />
          </div>

          {/* ── Work entries section ── */}
          <div className="td-section td-a5">
            <div className="td-section-header">
              <span className="td-section-label">All Work Entries</span>
              {/* FIX Bug 2: was entries.length — only showed loaded count (≤20/100).
                  entriesTotal comes from res.data.total — real DB count. */}
              <span className="td-section-count">{entriesTotal} total</span>
            </div>
            {loading ? (
              <div className="td-loading">Loading…</div>
            ) : (
              <EntryTable
                entries={entries}
              
                onEdit={handleOpenEdit}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        className="td-fab"
        onClick={() => entryAllowed && handleOpenForm()}
        disabled={!entryAllowed}
        aria-label="New Entry"
      >
        +
      </button>

      {/* ── New entry form modal ── */}
      {showForm && (
        <EntryForm onClose={handleCloseForm} onSaved={handleSaved} />
      )}

      {/* ── Edit entry modal ── */}
      <EditEntryModal
        entry={editingEntry}
        onSave={handleSaveEdit}
        onClose={handleCloseEdit}
        saving={editSaving}
        error={editError}
      />
    </div>
  );
}
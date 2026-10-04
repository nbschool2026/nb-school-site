import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MaterialIcon from './MaterialIcon.jsx';
import { fetchSingleLocalized } from '../lib/api.js';
import { useLocale } from '../lib/locale.jsx';

const links = [
  { to: '/', label: 'Головна' },
  { to: '/about', label: 'Про нас' },
  { to: '/events', label: 'Події' },
  { to: '/public-info', label: 'Публічна інформація' },
  { to: '/distance-learning', label: 'Дистанційне навчання' },
];

export default function AppLayout() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    setProfileStatus('loading');
    fetchSingleLocalized('/school-profile', 'populate=*', locale).then((data) => {
      if (active) { setProfile(data); setProfileStatus('ready'); }
    }).catch(() => { if (active) setProfileStatus('error'); });
    return () => { active = false; };
  }, [locale]);

  const schoolName = profile?.schoolName || t('Новобілоуський ліцей');

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-icon"><MaterialIcon name="school" /></span>
            <span>{schoolName}</span>
          </NavLink>

          <nav className="desktop-nav">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {t(link.label)}
              </NavLink>
            ))}
          </nav>

          <div className="language-switch desktop-lang" aria-label={t('Мова')}>
            <button type="button" className={locale === 'uk' ? 'selected' : ''} onClick={() => setLocale('uk')} aria-pressed={locale === 'uk'}>UA</button>
            <button type="button" className={locale === 'en' ? 'selected' : ''} onClick={() => setLocale('en')} aria-pressed={locale === 'en'}>EN</button>
          </div>

          <button className="menu-button" type="button" aria-label={t(open ? 'Закрити меню' : 'Відкрити меню')} onClick={() => setOpen((value) => !value)}>
            <MaterialIcon name={open ? 'close' : 'menu'} />
          </button>
        </div>

        {open && (
          <nav className="mobile-nav">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
                {t(link.label)}
              </NavLink>
            ))}
            <div className="language-switch">
              <button type="button" className={locale === 'uk' ? 'selected' : ''} onClick={() => { setLocale('uk'); setOpen(false); }} aria-pressed={locale === 'uk'}>UA</button>
              <button type="button" className={locale === 'en' ? 'selected' : ''} onClick={() => { setLocale('en'); setOpen(false); }} aria-pressed={locale === 'en'}>EN</button>
            </div>
          </nav>
        )}
      </header>

      <Outlet context={{ profile, profileStatus }} />

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <MaterialIcon name="school" />
            <span>{schoolName}</span>
          </div>
          <p>© {new Date().getFullYear()} {schoolName}. {t('Всі права захищені.')}</p>
          <div className="footer-social">
            {profile?.email && <a href={`mailto:${profile.email}`} aria-label="Email"><MaterialIcon name="mail" /></a>}
            {profile?.mapUrl && <a href={profile.mapUrl} aria-label="Map"><MaterialIcon name="public" /></a>}
          </div>
        </div>
      </footer>
    </div>
  );
}

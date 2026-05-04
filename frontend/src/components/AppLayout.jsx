import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import MaterialIcon from './MaterialIcon.jsx';

const links = [
  { to: '/', label: 'Головна' },
  { to: '/about', label: 'Про нас' },
  { to: '/events', label: 'Події' },
  { to: '/public-info', label: 'Публічна інформація' },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-icon"><MaterialIcon name="school" /></span>
            <span>Новобілоуський ліцей</span>
          </NavLink>

          <nav className="desktop-nav">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="language-switch desktop-lang" aria-label="Мова">
            <button type="button" className="selected">UA</button>
            <button type="button">EN</button>
          </div>

          <button className="menu-button" type="button" aria-label="Відкрити меню" onClick={() => setOpen((value) => !value)}>
            <MaterialIcon name={open ? 'close' : 'menu'} />
          </button>
        </div>

        {open && (
          <nav className="mobile-nav">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
                {link.label}
              </NavLink>
            ))}
            <div className="language-switch">
              <button type="button" className="selected">UA</button>
              <button type="button">EN</button>
            </div>
          </nav>
        )}
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <MaterialIcon name="school" />
            <span>Новобілоуський ліцей</span>
          </div>
          <p>© 2026 Новобілоуський ліцей. Всі права захищені.</p>
          <div className="footer-social">
            <a href="mailto:bilousnew@ukr.net" aria-label="Email"><MaterialIcon name="mail" /></a>
            <a href="https://maps.app.goo.gl/eh5ZCAyBr3FVmDbz8" aria-label="Map"><MaterialIcon name="public" /></a>
            <a href="/" aria-label="Share"><MaterialIcon name="share" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'macro',       label: 'MACRO PANEL',  icon: '▣', available: true  },
  { id: 'mercados',    label: 'MERCADOS',      icon: '◈', available: false },
  { id: 'bonos',       label: 'BONOS / FCI',  icon: '◇', available: false },
  { id: 'portafolio',  label: 'PORTAFOLIO',   icon: '▦', available: false },
  { id: 'commodities', label: 'COMMODITIES',  icon: '◆', available: false },
  { id: 'crypto',      label: 'CRIPTO',        icon: '◉', available: false },
];

export default function Sidebar({ activePanel, setActivePanel }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-r">R</span>
        <span className="sidebar-logo-ft">FT</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={[
              'nav-item',
              activePanel === item.id ? 'active' : '',
              !item.available ? 'disabled' : '',
            ].join(' ')}
            onClick={() => item.available && setActivePanel(item.id)}
            title={!item.available ? 'Próximamente' : item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {!item.available && <span className="nav-badge">PRONTO</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-line">FASE 1 — PANEL MACRO</div>
        <div className="footer-line dim">v1.0.0 — 2026</div>
      </div>
    </aside>
  );
}

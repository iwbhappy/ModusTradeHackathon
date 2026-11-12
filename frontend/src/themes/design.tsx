import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Palette } from 'lucide-react';

type Design = 'classic' | 'md3';
const key = 'signal.design';
const valid = (value: string | null): value is Design => value === 'classic' || value === 'md3';

function applyDesign(design: Design, persist = true) {
  document.documentElement.dataset.design = design;
  if (persist) {
    try {
      localStorage.setItem(key, design);
    } catch {
      /* Storage can be unavailable. */
    }
  }
}

/** Called before React renders; no changes to application data or API adapters. */
export function initializeDesign() {
  const requested = new URLSearchParams(window.location.search).get('design');
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(key);
  } catch {
    /* Classic is the default. */
  }
  applyDesign(valid(requested) ? requested : valid(stored) ? stored : 'classic', valid(requested));
}

export function DesignToggle() {
  const location = useLocation();
  const navigate = useNavigate();
  const [design, setDesign] = useState<Design>(() =>
    document.documentElement.dataset.design === 'md3' ? 'md3' : 'classic',
  );
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('design');
    if (valid(requested)) {
      applyDesign(requested);
      setDesign(requested);
    }
  }, [location.search]);
  const label = `Дизайн: ${design === 'md3' ? 'Material 3' : 'Классический'}`;
  return (
    <button
      type="button"
      className="icon-button design-toggle"
      aria-label={label}
      title={label}
      aria-pressed={design === 'md3'}
      onClick={() => {
        const next = design === 'classic' ? 'md3' : 'classic';
        applyDesign(next);
        setDesign(next);
        const params = new URLSearchParams(location.search);
        if (params.has('design')) {
          params.set('design', next);
          navigate(
            { pathname: location.pathname, search: `?${params}`, hash: location.hash },
            { replace: true, state: location.state },
          );
        }
      }}
    >
      <Palette size={18} />
    </button>
  );
}

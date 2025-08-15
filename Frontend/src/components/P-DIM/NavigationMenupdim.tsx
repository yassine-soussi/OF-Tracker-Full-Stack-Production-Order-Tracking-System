import { Link, useLocation } from '@tanstack/react-router';
import NotificationBoxpdim  from '../P-DIM/NotificationBoxpdim'
import { LogOut } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
// Tableau des liens du menu principal
const links = [
  { to: '/UAPS/P-DIM/importer', label: 'Importer un planning' },
  { to: '/UAPS/P-DIM/modifier', label: 'Modifier le planning' },
  { to: '/UAPS/P-DIM/suivre', label: 'Suivre le planning' },
  { to: '/UAPS/P-DIM/journalier', label: 'Rapport journalier' },
  { to: '/UAPS/P-DIM/hebdomadaire', label: 'Rapport hebdomadaire' },
  { to: '/UAPS/P-DIM/historique', label: 'Historique' }
];

// Composant principal du menu de navigation
export default function NavigationMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { firstName } = useUser();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('redirectPath');
    navigate({ to: '/' });
  };

  return (
    <div className="w-full bg-gradient-to-r from-[#ef8f0e] to-[#d47e0d] text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] border-b border-white/20 py-4 px-6 flex items-center justify-between gap-6">
      {/* Lien vers la page d'accueil */}
      <Link
        to="/UAPS/P-DIM/P-DIM"
        className={`text-2xl font-['Raleway'] text-white [1px_1px_3px_rgba(0,0,0,0.3)] relative inline-block group rounded px-2 py-1 transition-colors duration-200 ${location.pathname === '/UAPS/P-DIM' ? 'bg-white/10' : 'hover:bg-white/10'}`}
      >
        <span className="relative z-10">Bienvenue {firstName}</span>
        <span className={`absolute bottom-[-6px] left-1/2 h-1 bg-white transition-all duration-300 ease-in-out transform -translate-x-1/2 ${location.pathname === '/UAPS/P-DIM' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
      </Link>

      {/* Liens du menu */}
      <nav className="flex justify-center space-x-10 flex-grow" aria-label="Menu principal">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`text-[16px] text-white relative inline-block group rounded px-2 py-1 transition-colors duration-200 ${location.pathname === to ? 'bg-white/10' : 'hover:bg-white/10'}`}
          >
            <span className="relative z-10">{label}</span>
            <span className={`absolute bottom-[-6px] left-1/2 h-1 bg-white transition-all duration-300 ease-in-out transform -translate-x-1/2 ${location.pathname === to ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
          </Link>
        ))}
      </nav>

      {/* Zone de droite : notifications + recherche */}
     
        <div className="flex items-center gap-6">
          <NotificationBoxpdim />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 p-1 text-white hover:bg-white/10 rounded transition-colors duration-200"
    >
            <LogOut className="w-4 h-4" />
           
          </button>
        
        </div>
      </div>
    
   
  );
}

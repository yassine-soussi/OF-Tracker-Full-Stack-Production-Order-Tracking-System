import { Link } from '@tanstack/react-router';
import NotificationBoxpdim  from '../P-DIM/NotificationBoxpdim'

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


  return (
    <div className="w-full bg-white shadow-md py-4 px-6 flex items-center justify-between gap-6">
      {/* Lien vers la page d'accueil */}
      <Link 
        to="/UAPS/P-DIM/P-DIM" 
        className="text-2xl font-[Lobster] text-[#FF7F50] drop-shadow-[1px_1px_3px_rgba(0,0,0,0.3)] hover:underline"
        aria-label="Page principale"
      >
        Bienvenue Ali
      </Link>

      {/* Liens du menu */}
      <nav className="flex justify-center space-x-10 flex-grow" aria-label="Menu principal">
        {links.map(({ to, label }) => (
          <Link 
            key={to} 
            to={to} 
            className="text-[16px] text-[#FF7F50] hover:underline font-semibold"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Zone de droite : notifications + recherche */}
    
        <NotificationBoxpdim  />
  
      </div>
   
  );
}

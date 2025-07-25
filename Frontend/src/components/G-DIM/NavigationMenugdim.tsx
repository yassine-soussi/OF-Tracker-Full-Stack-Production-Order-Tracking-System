import { Link } from '@tanstack/react-router';

import  NotificationBoxgdim  from '../G-DIM/NotificationBoxgdim'


// Tableau des liens du menu principal
const links = [
  { to: '/UAPS/G-DIM/importer', label: 'Importer un planning' },
  { to: '/UAPS/G-DIM/modifier', label: 'Modifier le planning' },
  { to: '/UAPS/G-DIM/suivre', label: 'Suivre le planning' },
  { to: '/UAPS/G-DIM/journalier', label: 'Rapport journalier' },
  { to: '/UAPS/G-DIM/hebdomadaire', label: 'Rapport hebdomadaire' },
  { to: '/UAPS/G-DIM/historique', label: 'Historique' }
];

// Composant principal du menu de navigation
export default function NavigationMenu() {


  return (
    <div className="w-full bg-white shadow-md py-4 px-6 flex items-center justify-between gap-6">
      {/* Lien vers la page d'accueil */}
      <Link 
        to="/UAPS/G-DIM/G-DIM" 
        className="text-2xl font-[Lobster] text-[#FF7F50] drop-shadow-[1px_1px_3px_rgba(0,0,0,0.3)] hover:underline"
        aria-label="Page principale"
      >
        Bienvenue Abbasi 
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

      
        <NotificationBoxgdim />
  
      </div>
   
  );
}

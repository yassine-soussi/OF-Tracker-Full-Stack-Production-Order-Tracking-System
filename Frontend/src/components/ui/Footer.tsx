// import React from 'react'; // facultatif avec React 17+

const Footer: React.FC = () => {
  return (
    <footer className="bg-white text-gray-700 py-2 w-full" style={{ width: '100%', margin: 0, padding: '8px 0' }}>
      <div className="w-full px-4 flex flex-col md:flex-row justify-between items-center">
        <div className="mb-0 md:mb-0">
          <img
            src="/Figeac-logo.jpg"
            alt="FiGEAC AERO"
            className="h-17"
          />
        </div>
        <div className="text-center md:text-right text-sm">
          <p>© {new Date().getFullYear()} FIGEAC AERO</p>
          <p className="text-gray-400 mt-1">Tous droits réservés</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

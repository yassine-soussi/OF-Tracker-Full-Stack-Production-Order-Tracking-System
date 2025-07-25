import React from 'react';

const Header: React.FC = () => {
  return (
    <div>
      {/* Bande blanche EN HAUT DE LA PAGE */}
      <div className="w-full bg-white shadow-md py-4 text-center z-10">
        <h1 className="text-[30px] font-[Lobster] text-[#FF7F50] m-0 drop-shadow-[1px_1px_3px_rgba(0,0,0,0.3)]">
          OF Tracker
        </h1>
      </div>

      {/* 🔹 Image en dessous */}
      <header
        className="min-w-[500px] h-[180px] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(\"/header.jpg\")' }}
      />
    </div>
  );
};

export default Header;


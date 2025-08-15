import React from 'react';

const LoginHeader: React.FC = () => {
  return (
    <header className="w-full bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="w-full flex items-center justify-between">
        
        
        {/* "OF TRACKER" text on the right */}
        <div className="text-2xl font text-[#ef8f0e] Orbitron, sans-serif">
          OF TRACKER
        </div>
      </div>
    </header>
  );
};

export default LoginHeader;
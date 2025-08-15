import React, { useState, useEffect } from 'react';

const Header: React.FC = () => {
  // Array of image paths - use relative paths from public folder
  const images = [
    "/istock_4493915_large_0_0.jpg",
    "/figeac-aero-usinage_1.jpg",
    "/figeac-aero-assemblage-5_1.jpg",
    "/figeac-aero-assemblage-2_0_0.jpg",
    "/figeac-aero-assemblage-1.jpg",
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-advance the slideshow every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  const goToNext = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const goToPrevious = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  return (
    <div>
      {/* Modified header with logo and centered text */}
      <div
        style={{
          height: '70px',
          backgroundColor: '#ffffff', // Changed to white
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center', // Center content horizontally
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Figeac logo on the left */}
        <img 
          src="/Figeac-logo.jpg" 
          alt="Figeac Logo"
          style={{
            height: '60px',
            position: 'absolute',
            left: '20px',
          }}
        />
        
        {/* Centered "OF TRACKER" text */}
        
      </div>

      {/* Slideshow container (unchanged) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '300px',
          overflow: 'hidden',
        }}
      >
        {/* Slideshow images with fade transition */}
        {images.map((image, index) => (
          <div
            key={image}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: index === currentImageIndex ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
            }}
          />
        ))}

        {/* Overlay for OF TRACKER text */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '140px',
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // 50% transparent black
            zIndex: 2, // Behind text but above images
            width: '450px', // Adjust width as needed
            height: '300px', // Adjust height as needed
            
          }}
        />

        {/* OF TRACKER text overlay */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '150px',
            transform: 'translateY(-50%)',
            color: 'white',
            fontSize: '90px',
            fontFamily: 'Raleway',
            
            lineHeight: '0.9', // Reduced line spacing
            zIndex: 3, // Above overlay
          }}
        >
          OF<br />TRACKER
        </div>

        {/* Navigation arrows */}
        <button
          onClick={goToPrevious}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'transparent',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          &lt;
        </button>

        <button
          onClick={goToNext}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'transparent',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          &gt;
        </button>

        {/* Optional: Indicator dots */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            zIndex: 3,
          }}
        >
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentImageIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Header; 
import { useState, useEffect } from 'react';

interface UserData {
  fullName: string;
  firstName: string;
  email: string;
}

export const useUser = (): UserData => {
  const [userData, setUserData] = useState<UserData>({
    fullName: '',
    firstName: '',
    email: ''
  });

  useEffect(() => {
    const fullName = localStorage.getItem('userName') || '';
    const email = localStorage.getItem('userEmail') || '';
    
    // Extract first name from full name
    const firstName = fullName.split(' ')[0] || '';

    setUserData({
      fullName,
      firstName,
      email
    });
  }, []);

  return userData;
};

// Utility function to get user first name directly
export const getUserFirstName = (): string => {
  const fullName = localStorage.getItem('userName') || '';
  return fullName.split(' ')[0] || '';
};
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const error = url.searchParams.get('error');
    if (token) {
      localStorage.setItem('token', token);
      window.location.replace('/');
      return;
    }
    if (error) {
      navigate('/login', { replace: true });
      return;
    }
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
};

export default AuthCallback;


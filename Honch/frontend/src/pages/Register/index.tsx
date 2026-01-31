import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { API_BASE } from "../../utils/config";

const Register = () => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    const success = await toast.promise(
      async () => {
        const response = await register(email, password, name);
        if (!response) throw new Error('Registration failed');
        return response;
      },
    {
      loading: 'Registering...',
      success: 'Registered successfully',
      error: 'Registration failed',
    });

    if (success) {
      navigate('/');
    }
  };
  
  return (
    <div className='flex flex-col justify-center bg-gradient-to-tr from-background to-background/50 w-full items-center h-screen p-4 gap-4'>
        <NavLink to='/' className={'absolute top-5 left-5 text-sm flex items-center gap-2 rounded-full px-5 py-1.5 text-copy-light bg-foreground/10 border border-border hover:bg-foreground hover:text-copy transition duration-200'}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Home</span>
        </NavLink>

        <div className='relative h-full flex flex-col justify-center w-full max-w-md'>
            <p className='font-extrabold text-6xl'>honch<span className="text-copy-lighter">.</span></p>
            <p className='text-copy-light font-light text-sm mb-5'>Already have an account? <a href="/login" className='underline underline-offset-2 text-copy hover:text-copy/80 duration-200 transition'>Login to your account</a></p>

            <input value={name} onChange={(e) => setName(e.target.value)}
                className='autofill-style mt-3 bg-foreground rounded-md px-4 py-3 outline-none border border-border focus:border-primary duration-200 transition-all text-sm' placeholder='Enter your preferred name'
                type="text"/>
            <input value={email} onChange={(e) => setEmail(e.target.value)}
                className='autofill-style mt-3 bg-foreground rounded-md px-4 py-3 outline-none border border-border focus:border-primary duration-200 transition-all text-sm' placeholder='Enter your email address'
                type="email"/>
            <input value={password} onChange={(e) => setPassword(e.target.value)}
                className='autofill-style mt-3 bg-foreground rounded-md px-4 py-3 outline-none border border-border focus:border-primary duration-200 transition-all text-sm' placeholder='Create a password'
                type="password"/>

            <button onClick={() => handleSubmit()} className="active:scale-105 rounded-md w-full bg-primary hover:bg-primary/80 text-primary-content hover:text-primary-content/80 mt-5 py-2 font-bold hover:cursor-pointer duration-200 transition-all">
                Register Now
                <FontAwesomeIcon icon={faArrowRight} className="ml-2"/>
            </button>

            <div className="my-3 py-3 flex items-center text-xs text-copy-light uppercase before:flex-1 before:border-t before:border-border before:me-6 after:flex-1 after:border-t after:border-border after:ms-6">Or</div>
            
            <button
              onClick={() => {
                const redirect = `${window.location.origin}/auth/callback`;
                window.location.href = `${API_BASE}/api/auth/github?redirect=${encodeURIComponent(redirect)}`;
              }}
              className="active:scale-105 flex items-center justify-center gap-2 rounded-md w-full bg-foreground hover:bg-border/80 text-copy border border-border py-2 font-bold hover:cursor-pointer duration-200 transition-all"
            >
              <FontAwesomeIcon icon={faGithub} />
              <span>Register with GitHub</span>
            </button>

            <p className="text-copy-lighter text-xs font-light mt-5">By continuing, you agree to our <a href="/terms" className="text-copy">Terms of Service</a> and <a href="/privacy" className="text-copy">Privacy Policy</a></p>
        </div>
    </div>
  );
};

export default Register;
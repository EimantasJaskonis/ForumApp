import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import Button from '../components/atoms/Button';
import PasswordField from '../components/molecules/PasswordField';
import styled from 'styled-components';
import api from '../services/api';

const RegisterContainer = styled.div`
  max-width: 400px;
  margin: 6rem auto;
  padding: 20px;
  background-color: #000;
  border: 1px solid #00ff00;
  border-radius: 4px;
`;

const Title = styled.h2`
  color: #00ff00;
  text-align: center;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  color: #00ff00;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  background-color: #111;
  border: 1px solid #00ff00;
  color: #00ff00;
  border-radius: 4px;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin: 15px 0;
`;

const Checkbox = styled.input`
  margin-right: 10px;
`;

const Error = styled.div`
  color: #666666;
  margin-top: 5px;
`;

const Success = styled.div`
  color: #00ff00;
  margin-top: 5px;
`;

const Register = () => {
  const { login } = useUser();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  const validatePassword = (pwd) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    return regex.test(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!name.trim()) newErrors.name = 'Name is required';
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number and special character';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!agreed) {
      newErrors.agreed = 'You must agree to keep secrets';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
    const response = await api.post('/register', { name, email, password });
    
    if (response.data.token) {
      login(response.data.token, response.data.user);  // Automatinis prisijungimas
      setSuccess('Registration successful!');
      setTimeout(() => navigate('/'), 2000);
    }
      } catch (err) {
      if (err.response?.data?.message === 'User already exists') {
        setErrors({ email: 'Email already registered' });
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    }
  };

  return (
    <RegisterContainer>
      <Title>Create Account</Title>
      
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Name</Label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
          {errors.name && <Error>{errors.name}</Error>}
        </FormGroup>
        
        <FormGroup>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
          {errors.email && <Error>{errors.email}</Error>}
        </FormGroup>
        
        <FormGroup>
          <Label>Password</Label>
          <PasswordField 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            placeholder="Enter password"
          />
          {errors.password && <Error>{errors.password}</Error>}
        </FormGroup>
        
        <FormGroup>
          <Label>Confirm Password</Label>
          <PasswordField 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            placeholder="Confirm password"
          />
          {errors.confirmPassword && <Error>{errors.confirmPassword}</Error>}
        </FormGroup>
        
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            id="agree"
          />
          <Label htmlFor="agree">I agree to keep all secrets</Label>
        </CheckboxContainer>
        {errors.agreed && <Error>{errors.agreed}</Error>}
        
        {success && <Success>{success}</Success>}
        {errors.general && <Error>{errors.general}</Error>}
        
        <Button type="submit" size="large" style={{ width: '100%' }}>
          Sign Up
        </Button>
      </form>
      
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <span style={{ color: '#00ff00' }}>Already have an account? </span>
        <Button variant="link" onClick={() => navigate('/login')}>
          Log In
        </Button>
      </div>
    </RegisterContainer>
  );
};

export default Register;

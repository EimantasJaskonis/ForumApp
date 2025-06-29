import styled from 'styled-components';

const Input = styled.input`
  width: 100%;
  padding: 10px;
  background-color: #000;
  border: 1px solid ${({ $error }) => $error ? '#666666' : '#00ff00'};
  color: #00ff00;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  transition: border-color 0.3s;
  
  &:focus {
    outline: none;
    border-color: #00ff00;
    box-shadow: 0 0 5px rgba(0, 255, 119, 0.5);
    background-color: #111;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    border-color: #00ff00;
    background-color: #000;
  }
`;

export default Input;

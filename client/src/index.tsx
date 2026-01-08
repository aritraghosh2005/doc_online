import { Buffer } from 'buffer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

window.Buffer = window.Buffer || Buffer;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
    <App />
);

reportWebVitals();
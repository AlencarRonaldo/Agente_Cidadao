import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders admin panel title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Painel Administrativo/i);
  expect(titleElement).toBeInTheDocument();
});

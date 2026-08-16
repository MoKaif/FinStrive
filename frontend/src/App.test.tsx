import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

jest.mock('axios', () => ({
  isAxiosError: jest.fn(),
  post: jest.fn(),
}));

test('renders the app', () => {
  const { container } = render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  expect(container).toBeInTheDocument();
});

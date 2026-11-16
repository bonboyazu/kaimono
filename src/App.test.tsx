import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App.tsx';

test('「買い物リスト」と出る', () => {
  render(<App />);
  expect(screen.getByText('買い物リスト')).toBeInTheDocument();
});

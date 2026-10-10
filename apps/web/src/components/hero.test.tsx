import { render, screen } from '@testing-library/react';
import { Hero } from './hero';

describe('Hero', () => {
  it('renders the page heading', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dealer Inventory');
  });
});

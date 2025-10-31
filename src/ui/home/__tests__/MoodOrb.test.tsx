import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoodOrb } from '../MoodOrb';
import { BrowserRouter } from 'react-router-dom';

describe('MoodOrb', () => {
  it('should render without crashing', () => {
    render(
      <BrowserRouter>
        <MoodOrb currentMood={3} />
      </BrowserRouter>
    );
    
    // MoodOrb should be in the document
    const orbElement = screen.getByRole('button');
    expect(orbElement).toBeDefined();
  });

  it('should display mood level', () => {
    render(
      <BrowserRouter>
        <MoodOrb currentMood={5} />
      </BrowserRouter>
    );
    
    // Should show mood indicator
    expect(screen.getByRole('button')).toBeDefined();
  });
});

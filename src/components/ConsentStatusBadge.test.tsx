import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConsentStatusBadge } from './ConsentStatusBadge';

describe('ConsentStatusBadge', () => {
  it('renders granted status correctly', () => {
    render(<ConsentStatusBadge consentStatus="granted" />);
    expect(screen.getByText('Consent Granted')).toBeInTheDocument();
  });

  it('renders pending status correctly', () => {
    render(<ConsentStatusBadge consentStatus="pending" />);
    expect(screen.getByText('Pending Consent')).toBeInTheDocument();
  });

  it('renders denied status correctly', () => {
    render(<ConsentStatusBadge consentStatus="denied" />);
    expect(screen.getByText('Consent Denied')).toBeInTheDocument();
  });

  it('renders revoked status correctly', () => {
    render(<ConsentStatusBadge consentStatus="revoked" />);
    expect(screen.getByText('Consent Revoked')).toBeInTheDocument();
  });

  it('shows consent level details when showDetails is true and status is granted', () => {
    const consentLevel = {
      share_mood_timeline: true,
      share_program_engagement: false,
      share_checkin_streak: true,
    };
    
    render(
      <ConsentStatusBadge 
        consentStatus="granted" 
        consentLevel={consentLevel}
        showDetails={true}
      />
    );
    
    expect(screen.getByText('Consent Granted')).toBeInTheDocument();
    expect(screen.getByText('Mood Timeline')).toBeInTheDocument();
    expect(screen.getByText('Program Engagement')).toBeInTheDocument();
    expect(screen.getByText('Check-in Streak')).toBeInTheDocument();
  });

  it('does not show consent level details when showDetails is false', () => {
    const consentLevel = {
      share_mood_timeline: true,
    };
    
    render(
      <ConsentStatusBadge 
        consentStatus="granted" 
        consentLevel={consentLevel}
        showDetails={false}
      />
    );
    
    expect(screen.getByText('Consent Granted')).toBeInTheDocument();
    expect(screen.queryByText('Mood Timeline')).not.toBeInTheDocument();
  });

  it('does not show consent level details for non-granted status', () => {
    const consentLevel = {
      share_mood_timeline: true,
    };
    
    render(
      <ConsentStatusBadge 
        consentStatus="pending" 
        consentLevel={consentLevel}
        showDetails={true}
      />
    );
    
    expect(screen.getByText('Pending Consent')).toBeInTheDocument();
    expect(screen.queryByText('Mood Timeline')).not.toBeInTheDocument();
  });

  it('renders without consent level when not provided', () => {
    render(<ConsentStatusBadge consentStatus="granted" showDetails={true} />);
    expect(screen.getByText('Consent Granted')).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSync = vi.fn();
let mockIsOnline = true;
let mockItemCount = 0;

vi.mock('@/lib/queue', () => ({
  useQueue: () => ({
    itemCount: mockItemCount,
    isOnline: mockIsOnline,
    sync: mockSync,
  }),
}));

import OfflineSyncIndicator from './OfflineSyncIndicator';

describe('OfflineSyncIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnline = true;
    mockItemCount = 0;
  });

  it('renders nothing when online with no pending items', () => {
    mockIsOnline = true;
    mockItemCount = 0;
    const { container } = render(<OfflineSyncIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('shows offline indicator when not online', () => {
    mockIsOnline = false;
    mockItemCount = 0;
    render(<OfflineSyncIndicator />);
    expect(screen.getByText("You're offline")).toBeInTheDocument();
  });

  it('shows pending count when offline with pending items', () => {
    mockIsOnline = false;
    mockItemCount = 3;
    render(<OfflineSyncIndicator />);
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText('3 pending')).toBeInTheDocument();
  });

  it('shows syncing indicator when online with pending items', () => {
    mockIsOnline = true;
    mockItemCount = 2;
    render(<OfflineSyncIndicator />);
    expect(screen.getByText(/Syncing 2 items/)).toBeInTheDocument();
  });

  it('shows singular item text for single pending item', () => {
    mockIsOnline = true;
    mockItemCount = 1;
    render(<OfflineSyncIndicator />);
    expect(screen.getByText(/Syncing 1 item\.\.\./)).toBeInTheDocument();
  });

  it('calls sync when Retry button is clicked', () => {
    mockIsOnline = true;
    mockItemCount = 1;
    render(<OfflineSyncIndicator />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }));
    expect(mockSync).toHaveBeenCalled();
  });

  it('has accessible status role for screen readers', () => {
    mockIsOnline = false;
    mockItemCount = 0;
    render(<OfflineSyncIndicator />);
    
    const statusElement = screen.getByRole('status');
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CrisisDetectionModal from './CrisisDetectionModal';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderModal = (props: { isOpen: boolean; onClose: () => void; message?: string }) => {
  return render(
    <MemoryRouter>
      <CrisisDetectionModal {...props} />
    </MemoryRouter>
  );
};

describe('CrisisDetectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false, onClose: vi.fn() });
    expect(container.firstChild).toBeNull();
  });

  it('renders modal content when isOpen is true', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });
    expect(screen.getByText("You're Not Alone")).toBeInTheDocument();
    expect(screen.getByText('Help is available right now')).toBeInTheDocument();
  });

  it('displays custom message when provided', () => {
    const message = 'We noticed you might be going through a difficult time.';
    renderModal({ isOpen: true, onClose: vi.fn(), message });
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('displays emergency notice', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });
    expect(screen.getByText("If you're in immediate danger")).toBeInTheDocument();
    expect(screen.getByText('Call 911 or go to your nearest emergency room')).toBeInTheDocument();
  });

  it('displays Kids Help Phone contact', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });
    expect(screen.getByText('Kids Help Phone')).toBeInTheDocument();
    expect(screen.getByText('1-800-668-6868 (24/7)')).toBeInTheDocument();
  });

  it('displays text support option', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });
    expect(screen.getByText('Text CONNECT to 686868')).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ isOpen: true, onClose });
    
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates to safety resources when View All button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ isOpen: true, onClose });
    
    fireEvent.click(screen.getByText('View All Crisis Support Resources'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/safety-resources');
  });

  it('displays supportive footer message', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });
    expect(screen.getByText(/You deserve support/)).toBeInTheDocument();
  });

  it('has phone link with correct href', () => {
    renderModal({ isOpen: true, onClose: vi.fn() });
    const phoneLink = screen.getByRole('link', { name: /Kids Help Phone/i });
    expect(phoneLink).toHaveAttribute('href', 'tel:1-800-668-6868');
  });
});

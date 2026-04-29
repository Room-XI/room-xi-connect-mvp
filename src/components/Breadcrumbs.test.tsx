import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';

const renderWithRouter = (initialEntries: string[]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Breadcrumbs />
    </MemoryRouter>
  );
};

describe('Breadcrumbs', () => {
  it('renders nothing for root path', () => {
    const { container } = renderWithRouter(['/']);
    expect(container.querySelector('nav')).toBeNull();
  });

  it('renders portal label for single segment path', () => {
    renderWithRouter(['/admin']);
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
  });

  it('renders portal and section labels for multi-segment path', () => {
    renderWithRouter(['/admin/audit-logs']);
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
  });

  it('renders org portal correctly', () => {
    renderWithRouter(['/org/dashboard']);
    expect(screen.getByText('Org Portal')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders youth worker portal correctly', () => {
    renderWithRouter(['/worker/dashboard']);
    expect(screen.getByText('Youth Worker Portal')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders parent portal correctly', () => {
    renderWithRouter(['/parent']);
    expect(screen.getByText('Parent Portal')).toBeInTheDocument();
  });

  it('capitalizes unknown sections correctly', () => {
    renderWithRouter(['/admin/some-unknown-section']);
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    expect(screen.getByText('Some Unknown Section')).toBeInTheDocument();
  });

  it('has correct ARIA navigation landmark', () => {
    renderWithRouter(['/admin/users']);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
  });

  it('renders last item without a link', () => {
    renderWithRouter(['/admin/audit-logs']);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('Admin Portal');
    expect(screen.getByText('Audit Logs').closest('a')).toBeNull();
  });

  it('renders links for intermediate breadcrumbs', () => {
    renderWithRouter(['/admin/organizations']);
    const portalLink = screen.getByRole('link', { name: 'Admin Portal' });
    expect(portalLink).toHaveAttribute('href', '/admin');
  });
});

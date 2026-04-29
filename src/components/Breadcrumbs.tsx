import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const portalLabels: Record<string, string> = {
  admin: 'Admin Portal',
  org: 'Org Portal',
  parent: 'Parent Portal',
  worker: 'Youth Worker Portal',
  'youth-worker': 'Youth Worker Portal',
};

const sectionLabels: Record<string, string> = {
  overview: 'Overview',
  organizations: 'Organizations',
  users: 'Users',
  'audit-logs': 'Audit Logs',
  compliance: 'Breach/Compliance',
  'feature-flags': 'Feature Flags',
  incidents: 'Incidents',
  'system-status': 'System Status',
  dashboard: 'Dashboard',
  'program-management': 'Program Management',
  referrals: 'Referrals',
  'support-inbox': 'Support Inbox',
  reports: 'Reports',
  'staff-management': 'Staff Management',
  'consent-requests': 'Consent Requests',
  'case-notes': 'Case Notes',
  attendance: 'Attendance',
  settings: 'Settings',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return null;
  }

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    currentPath += `/${segment}`;

    // First segment is the portal
    if (i === 0) {
      const portalLabel = portalLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({
        label: portalLabel,
        path: currentPath,
      });
    }
    // Subsequent segments are sections
    else {
      const sectionLabel = sectionLabels[segment] || segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      breadcrumbs.push({
        label: sectionLabel,
        path: currentPath,
      });
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center flex-wrap gap-2">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-2">
            {index === breadcrumbs.length - 1 ? (
              <span className="text-textPrimaryLight font-medium">{crumb.label}</span>
            ) : (
              <>
                <Link
                  to={crumb.path}
                  className="text-teal hover:text-teal/80 font-medium transition-colors hover:underline"
                >
                  {crumb.label}
                </Link>
                <ChevronRight className="w-4 h-4 text-textSecondaryLight flex-shrink-0" />
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;

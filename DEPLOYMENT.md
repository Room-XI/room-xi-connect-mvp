# Room XI Connect - Deployment Guide

This guide provides step-by-step instructions for deploying Room XI Connect to production.

## Prerequisites

Before deploying, ensure you have:

- **Supabase Account**: Create a project at [supabase.com](https://supabase.com)
- **Vercel Account**: For frontend hosting (recommended)
- **Domain Name**: Optional but recommended for production
- **SSL Certificate**: Automatically handled by Vercel

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your users
3. Set a strong database password
4. Wait for the project to be provisioned

### 2. Configure Database Schema

Execute the SQL files in order through the Supabase SQL Editor:

```sql
-- 1. Run supabase/schema.sql
-- This creates all tables, functions, and triggers

-- 2. Run supabase/policies.sql  
-- This sets up Row Level Security policies

-- 3. Run supabase/seeds/seed_programs.sql (optional)
-- This adds sample program data

-- 4. Run supabase/seeds/seed_crisis_supports.sql (optional)
-- This adds sample crisis support data
```

### 3. Deploy Edge Functions

Install the Supabase CLI and deploy the edge functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy edge functions
supabase functions deploy xid-create
supabase functions deploy user-delete
```

### 4. Configure Authentication

In your Supabase dashboard:

1. Go to **Authentication > Settings**
2. Configure **Site URL**: `https://your-domain.com`
3. Add **Redirect URLs**: 
   - `https://your-domain.com/auth/login`
   - `https://your-domain.com/auth/update-password`
4. Enable **Email confirmations**
5. Configure **SMTP settings** for email delivery

## Frontend Deployment (Vercel)

### 1. Prepare Environment Variables

Create a `.env.production` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
VITE_APP_NAME="Room XI Connect"
VITE_APP_VERSION="1.0.0"
VITE_APP_ENVIRONMENT="production"

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PWA=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_XIMI_AI=true

# Security Configuration
VITE_ENABLE_CSP=true
VITE_ENABLE_HTTPS_ONLY=true
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
# ... add all other environment variables
```

#### Option B: GitHub Integration

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### 3. Configure Custom Domain

In Vercel dashboard:

1. Go to **Settings > Domains**
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate will be automatically provisioned

## Security Configuration

### 1. Content Security Policy

The app includes a comprehensive CSP in `index.html`. Review and adjust based on your needs:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https:;
  connect-src 'self' https: wss:;
  media-src 'self' blob:;
  worker-src 'self';
  child-src 'self';
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
" />
```

### 2. Supabase Security

In Supabase dashboard:

1. **Database > Settings**: Enable SSL enforcement
2. **API > Settings**: Configure CORS origins
3. **Auth > Settings**: Set up proper redirect URLs
4. **Storage**: Configure bucket policies if using file uploads

### 3. Environment Security

- Never commit `.env` files to version control
- Use different Supabase projects for staging/production
- Regularly rotate API keys and passwords
- Enable database backups
- Set up monitoring and alerts

## Performance Optimization

### 1. Build Optimization

```bash
# Analyze bundle size
npm run build
npm run preview

# Check for unused dependencies
npx depcheck

# Optimize images
# Use WebP format for better compression
# Implement lazy loading for images
```

### 2. Caching Strategy

The app includes:

- **Service Worker**: Caches app shell and assets
- **Browser Caching**: Long-term caching for static assets
- **CDN Caching**: Vercel's global CDN
- **Database Caching**: Supabase built-in caching

### 3. Monitoring

Set up monitoring for:

- **Application Performance**: Core Web Vitals
- **Error Tracking**: JavaScript errors and crashes
- **Database Performance**: Query performance and usage
- **User Analytics**: Privacy-compliant usage tracking

## Health Checks

After deployment, verify:

### 1. Application Health

- [ ] App loads correctly
- [ ] Authentication works
- [ ] Database connections are successful
- [ ] Offline mode functions properly
- [ ] PWA installation works

### 2. Security Checks

- [ ] HTTPS is enforced
- [ ] CSP headers are present
- [ ] No sensitive data in client-side code
- [ ] API endpoints are properly secured
- [ ] RLS policies are working

### 3. Performance Checks

- [ ] Page load times < 3 seconds
- [ ] Core Web Vitals are in green
- [ ] Images are optimized
- [ ] Service worker is functioning
- [ ] Caching is working properly

## Maintenance

### Regular Tasks

1. **Weekly**: Review error logs and performance metrics
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and update security policies
4. **Annually**: Conduct security audit and penetration testing

### Backup Strategy

1. **Database**: Automated daily backups via Supabase
2. **Code**: Version control with Git
3. **Environment**: Document all configuration
4. **Monitoring**: Set up alerts for critical issues

### Scaling Considerations

As your user base grows:

1. **Database**: Consider read replicas and connection pooling
2. **CDN**: Implement additional caching layers
3. **Monitoring**: Add more detailed performance tracking
4. **Infrastructure**: Consider multi-region deployment

## Troubleshooting

### Common Issues

1. **Build Failures**: Check environment variables and dependencies
2. **Authentication Issues**: Verify Supabase configuration and URLs
3. **Database Errors**: Check RLS policies and permissions
4. **Performance Issues**: Review bundle size and caching
5. **PWA Issues**: Verify service worker and manifest configuration

### Support Resources

- **Supabase Documentation**: [docs.supabase.com](https://docs.supabase.com)
- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **React Documentation**: [react.dev](https://react.dev)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)

## Security Compliance

Room XI Connect is designed to meet:

- **GDPR**: European data protection regulations
- **PHIPA**: Ontario health information privacy
- **WCAG 2.1 AA**: Web accessibility standards
- **OWASP**: Web application security standards

Ensure your deployment maintains these compliance standards through proper configuration and regular audits.

---

**Need Help?** Contact the development team or refer to the main README.md for additional information.

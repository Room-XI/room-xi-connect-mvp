import { Link } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
              <p className="text-gray-600">Last updated: November 8, 2025</p>
            </div>
          </div>

          <div className="prose prose-blue max-w-none">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Youth-Friendly Summary</p>
                  <p>By using Room XI Connect, you agree to treat yourself and others with respect, protect your privacy, and use this platform to support your mental health journey. We're here to help, not to judge or surveil.</p>
                </div>
              </div>
            </div>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Room XI Connect ("the Service"), you agree to be bound by these Terms of Service. 
              If you are under 18, you should review these terms with a parent or guardian. If you are under 16, 
              we require guardian verification as part of our commitment to your safety.
            </p>

            <h2>2. Who Can Use Room XI Connect</h2>
            <p>
              Room XI Connect is designed for youth aged 13-25. You must:
            </p>
            <ul>
              <li>Be between 13 and 25 years old</li>
              <li>Provide accurate information during registration</li>
              <li>Complete guardian verification if you are under 16 years old</li>
              <li>Reside in Canada (specifically Alberta for full program access)</li>
            </ul>

            <h2>3. Your Privacy Matters</h2>
            <p>
              We are committed to protecting your privacy:
            </p>
            <ul>
              <li><strong>Privacy by design:</strong> We collect only what's necessary and encrypt sensitive data</li>
              <li><strong>Your control:</strong> You can review and change your consent settings anytime in the Privacy Center</li>
              <li><strong>Transparency:</strong> We'll never sell your data or use it for advertising</li>
              <li><strong>Read more:</strong> See our <Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link> for details</li>
            </ul>

            <h2>4. How to Use the Service Responsibly</h2>
            <p>You agree to:</p>
            <ul>
              <li><strong>Be honest:</strong> Provide accurate information, especially in health-related check-ins</li>
              <li><strong>Be kind:</strong> Treat staff, volunteers, and other youth with respect</li>
              <li><strong>Stay safe:</strong> Don't share personal contact information publicly</li>
              <li><strong>Respect others:</strong> Don't bully, harass, or threaten anyone</li>
              <li><strong>Follow the law:</strong> Don't use the service for illegal activities</li>
            </ul>

            <p>You agree NOT to:</p>
            <ul>
              <li>Share your account credentials with others</li>
              <li>Attempt to access other users' data</li>
              <li>Upload malicious code or attempt to disrupt the service</li>
              <li>Impersonate staff, organizations, or other users</li>
              <li>Use automated tools to scrape or harvest data</li>
            </ul>

            <h2>5. Ximi AI Companion</h2>
            <p>
              Ximi is an AI-powered companion designed to support you, but:
            </p>
            <ul>
              <li><strong>Not a therapist:</strong> Ximi cannot diagnose mental health conditions or replace professional care</li>
              <li><strong>Crisis detection:</strong> If Ximi detects crisis keywords, you'll be routed to real crisis support resources</li>
              <li><strong>Human oversight:</strong> You can flag any Ximi response for human review within 24 hours</li>
              <li><strong>Opt-in only:</strong> You must consent to use Ximi, and you can withdraw consent anytime</li>
            </ul>

            <h2>6. Mood Check-Ins and Health Data</h2>
            <ul>
              <li><strong>Daily limit:</strong> One check-in per day to prevent compulsive use</li>
              <li><strong>Optional sharing:</strong> You choose whether to share your check-in data with program staff</li>
              <li><strong>Encryption:</strong> Your mood notes and wellness ratings are encrypted</li>
              <li><strong>Not medical records:</strong> Check-ins are for personal reflection, not clinical diagnosis</li>
            </ul>

            <h2>7. Program Discovery and Attendance</h2>
            <ul>
              <li><strong>Browse freely:</strong> You can explore programs without creating an account</li>
              <li><strong>QR attendance:</strong> When you check in to a program via QR code, that attendance is recorded</li>
              <li><strong>Attendance sharing:</strong> Attendance data may be shared with program staff and funders (aggregated, not individually identifiable without consent)</li>
            </ul>

            <h2>8. Guardian Rights (For Youth Under 18)</h2>
            <p>
              If you're under 18, your parent or legal guardian has the right to:
            </p>
            <ul>
              <li>Review your consent settings (with your permission)</li>
              <li>Request data deletion on your behalf</li>
              <li>Access emergency contact information you've provided</li>
            </ul>
            <p>
              However, we believe in youth autonomy. If you're 14-17, you have the right to manage your own mental health 
              data under Alberta law, and we respect that.
            </p>

            <h2>9. Data Retention and Deletion</h2>
            <ul>
              <li><strong>Active accounts:</strong> Your data is retained as long as your account is active</li>
              <li><strong>Inactive accounts:</strong> If you don't log in for 2 years, we'll send a reminder before archiving your account</li>
              <li><strong>Deletion requests:</strong> You can request full data deletion anytime via Settings → Privacy Center</li>
              <li><strong>Legal holds:</strong> In rare cases (legal investigations, child safety concerns), we may retain data longer</li>
            </ul>

            <h2>10. Limitations of Liability</h2>
            <p>
              Room XI Connect is provided "as is" without warranties. We do our best to keep the service available and secure, but:
            </p>
            <ul>
              <li>We cannot guarantee 24/7 uptime or uninterrupted access</li>
              <li>We are not liable for decisions you make based on Ximi's suggestions</li>
              <li>We are not responsible for external resources linked from our platform</li>
              <li>In an emergency, always call 911 or go to your nearest emergency room</li>
            </ul>

            <h2>11. Changes to These Terms</h2>
            <p>
              We may update these Terms of Service. When we do:
            </p>
            <ul>
              <li>You'll see a notification when you log in</li>
              <li>Major changes require you to re-accept the terms</li>
              <li>You can review the full history in our transparency dashboard</li>
            </ul>

            <h2>12. Termination</h2>
            <p>
              You can stop using Room XI Connect anytime. We may suspend or terminate your account if:
            </p>
            <ul>
              <li>You violate these terms (e.g., harassment, illegal activity)</li>
              <li>You provide false information about your age or identity</li>
              <li>You attempt to compromise the security of the platform</li>
            </ul>
            <p>
              We'll notify you before termination unless it's for urgent safety or legal reasons.
            </p>

            <h2>13. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Alberta, Canada. Any disputes will be resolved in Alberta courts, 
              or through alternative dispute resolution if both parties agree.
            </p>

            <h2>14. Contact Us</h2>
            <p>
              If you have questions about these Terms:
            </p>
            <ul>
              <li><strong>Email:</strong> privacy@roomxi.ca</li>
              <li><strong>Mail:</strong> Room XI Connect, Edmonton, AB (full address available on request)</li>
              <li><strong>In-App:</strong> Settings → Help & Support</li>
            </ul>

            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200 p-6 mt-8">
              <h3 className="font-semibold text-gray-900 mb-3">Youth Mental Health Resources</h3>
              <p className="text-gray-700 mb-3">
                If you're struggling right now, please reach out for support. You're not alone.
              </p>
              <Link 
                to="/safety-resources" 
                className="inline-block bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors font-semibold"
              >
                View Crisis Support Resources
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Link to="/home" className="text-blue-600 hover:underline font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

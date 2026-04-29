import { Link } from 'react-router-dom';
import { Lock, AlertCircle, Eye } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
              <p className="text-gray-600">Last updated: November 8, 2025</p>
            </div>
          </div>

          <div className="prose prose-purple max-w-none">
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900">
                  <p className="font-semibold mb-1">Privacy Promise</p>
                  <p>Your data is yours. We collect only what's necessary, encrypt what's sensitive, and give you full control. We'll never sell your data or use it for advertising. Period.</p>
                </div>
              </div>
            </div>

            <h2>1. Who We Are</h2>
            <p>
              Room XI Connect is operated by Room XI, a youth-safe platform based in Edmonton, Alberta that helps young people check in, find relevant programs, attend them, and access support safely. 
              We are committed to privacy-by-design and trauma-informed care.
            </p>
            <p>
              <strong>Legal Framework:</strong> We comply with:
            </p>
            <ul>
              <li>Alberta's Personal Information Protection Act (PIPA)</li>
              <li>Health Information Act (HIA) for health-related data</li>
              <li>Canada's Personal Information Protection and Electronic Documents Act (PIPEDA)</li>
              <li>UNICEF's AI for Children framework</li>
            </ul>

            <h2>2. What Information We Collect</h2>
            
            <h3>2.1 Account Creation (Required)</h3>
            <ul>
              <li><strong>Name:</strong> First name and last initial (or full legal name for Safety Profile)</li>
              <li><strong>Age:</strong> Must be 13-25 years old</li>
              <li><strong>City:</strong> To connect you with local programs</li>
              <li><strong>Email and password:</strong> For authentication and guardian verification</li>
            </ul>

            <h3>2.2 Safety Profile (Optional but Recommended)</h3>
            <ul>
              <li><strong>Legal name:</strong> For emergency situations</li>
              <li><strong>Emergency contact:</strong> Name and phone number</li>
              <li><strong>Health information:</strong> Allergies, medications, conditions (only if you consent)</li>
              <li><strong>Photo/media consent:</strong> Permission to take photos at programs</li>
              <li><strong>Indigenous self-identification:</strong> Optional, for culturally responsive support</li>
            </ul>

            <h3>2.3 Daily Check-Ins</h3>
            <ul>
              <li><strong>Mood:</strong> One of 6 weather-based moods (Cold, Stormy, Foggy, Clear, Breezy, Aurora)</li>
              <li><strong>Wellness dimensions:</strong> Ratings across 8 SAMHSA wellness dimensions</li>
              <li><strong>Optional note:</strong> Your personal notes (encrypted end-to-end)</li>
              <li><strong>Timestamp:</strong> When you completed the check-in</li>
            </ul>

            <h3>2.4 Program Engagement</h3>
            <ul>
              <li><strong>Programs viewed:</strong> Which programs you browsed</li>
              <li><strong>Programs saved:</strong> Programs you bookmarked</li>
              <li><strong>Attendance:</strong> QR code check-ins at programs</li>
            </ul>

            <h3>2.5 Ximi AI Program Finder (If You Consent)</h3>
            <ul>
              <li><strong>Chat messages:</strong> Your program search queries and Ximi's responses</li>
              <li><strong>Mood context:</strong> Recent check-in data to improve program recommendations</li>
              <li><strong>Crisis flags:</strong> Automatic detection of crisis keywords</li>
            </ul>

            <h3>2.6 Technical Data</h3>
            <ul>
              <li><strong>Device info:</strong> Browser type, operating system (for compatibility)</li>
              <li><strong>Session data:</strong> Login times, IP addresses (for security)</li>
              <li><strong>Error logs:</strong> Crash reports (anonymized)</li>
            </ul>

            <h2>3. How We Protect Your Data</h2>
            
            <h3>3.1 Encryption</h3>
            <ul>
              <li><strong>In transit:</strong> All data uses TLS 1.3 encryption</li>
              <li><strong>At rest:</strong> Database encryption with AES-256</li>
              <li><strong>Sensitive fields:</strong> Check-in notes, health data, and Ximi conversations use end-to-end encryption</li>
            </ul>

            <h3>3.2 Access Controls</h3>
            <ul>
              <li><strong>Role-based access:</strong> Staff only see what they need (with your consent)</li>
              <li><strong>Audit logs:</strong> Every data access is logged and reviewable</li>
              <li><strong>Password security:</strong> Argon2 hashing with 90-day rotation for staff accounts</li>
            </ul>

            <h3>3.3 Privacy-Preserving Analytics</h3>
            <ul>
              <li><strong>Differential privacy:</strong> Mood map data uses H3 geo-buckets + Laplace noise</li>
              <li><strong>K-anonymity:</strong> Group data only shown when N ≥ 7 participants</li>
              <li><strong>No individual tracking:</strong> Organization dashboards show aggregate trends only</li>
            </ul>

            <h2>4. How We Use Your Information</h2>
            
            <h3>4.1 To Provide the Service</h3>
            <ul>
              <li>Authenticate your account and maintain sessions</li>
              <li>Display your check-in history and mood orb visualizations</li>
              <li>Connect you with local programs and resources</li>
              <li>Enable Ximi AI Program Finder (if you consent)</li>
              <li>Send guardian verification emails (if under 16)</li>
            </ul>

            <h3>4.2 To Keep You Safe</h3>
            <ul>
              <li>Detect crisis keywords and route you to safety resources</li>
              <li>Share emergency contact info with first responders (only in life-threatening situations)</li>
              <li>Investigate reported safety concerns (e.g., harassment, threats)</li>
            </ul>

            <h3>4.3 To Improve Programs (With Your Consent)</h3>
            <ul>
              <li>Show anonymous mood trends to program staff (aggregate only)</li>
              <li>Track program attendance for funder reporting</li>
              <li>Analyze which resources youth find helpful</li>
            </ul>

            <h3>4.4 To Improve the Platform</h3>
            <ul>
              <li>Fix bugs and performance issues</li>
              <li>Understand which features are used most</li>
              <li>Test new features with volunteer youth (opt-in only)</li>
            </ul>

            <h2>5. Who We Share Data With</h2>
            
            <h3>5.1 With Your Consent</h3>
            <ul>
              <li><strong>Program staff:</strong> Attendance and check-in data (if you opt in)</li>
              <li><strong>Guardians:</strong> Emergency contact and consent status (if you're under 18)</li>
              <li><strong>Research partners:</strong> Anonymized, aggregated data only (opt-in required)</li>
            </ul>

            <h3>5.2 Service Providers</h3>
            <ul>
              <li><strong>Neon (PostgreSQL):</strong> Database hosting (Canada-only servers)</li>
              <li><strong>Replit:</strong> Platform hosting and AI services</li>
              <li><strong>Gmail (SMTP):</strong> Guardian verification emails</li>
            </ul>
            <p>All service providers sign Data Processing Agreements (DPAs) committing to privacy protection.</p>

            <h3>5.3 Legal Requirements</h3>
            <p>We may disclose data when legally required:</p>
            <ul>
              <li><strong>Child safety:</strong> If we believe a child is at imminent risk of harm</li>
              <li><strong>Court orders:</strong> Subpoenas or warrants from Canadian courts</li>
              <li><strong>Law enforcement:</strong> Only with valid legal process</li>
            </ul>
            <p>We will notify you unless prohibited by law.</p>

            <h3>5.4 We NEVER Share Data With</h3>
            <ul>
              <li>Advertisers or marketing companies</li>
              <li>Data brokers</li>
              <li>Social media platforms</li>
              <li>Third-party analytics (we use our own privacy-preserving analytics)</li>
            </ul>

            <h2>6. Your Privacy Rights</h2>
            
            <h3>6.1 Access and Portability</h3>
            <ul>
              <li><strong>View your data:</strong> Settings → Privacy Center → Download My Data</li>
              <li><strong>Export format:</strong> JSON file with all your check-ins, attendance, and settings</li>
              <li><strong>Timeframe:</strong> Within 30 days of request</li>
            </ul>

            <h3>6.2 Correction</h3>
            <ul>
              <li>Update your profile, emergency contact, or consent settings anytime</li>
              <li>Request correction of inaccurate data via Settings → Help & Support</li>
            </ul>

            <h3>6.3 Deletion</h3>
            <ul>
              <li><strong>Right to be forgotten:</strong> Request full data deletion anytime</li>
              <li><strong>What gets deleted:</strong> All personal data, check-ins, conversations</li>
              <li><strong>What's retained:</strong> Anonymized aggregate statistics, audit logs (legal requirement)</li>
              <li><strong>Timeframe:</strong> Deletion within 30 days; backups purged within 90 days</li>
            </ul>

            <h3>6.4 Consent Management</h3>
            <ul>
              <li><strong>Granular control:</strong> Toggle each consent independently</li>
              <li><strong>Withdraw anytime:</strong> No penalties or service degradation</li>
              <li><strong>Audit trail:</strong> View all consent changes in your history</li>
            </ul>

            <h2>7. Guardian Rights (For Youth Under 18)</h2>
            <p>
              If you're under 18, your parent or legal guardian can:
            </p>
            <ul>
              <li>Request access to your consent settings</li>
              <li>Request data deletion on your behalf</li>
              <li>View emergency contact information</li>
              <li>Receive breach notifications</li>
            </ul>
            <p>
              <strong>Youth autonomy:</strong> Under Alberta's Health Information Act, youth aged 14-17 can consent to mental health services 
              independently. We respect this autonomy while balancing guardian oversight for safety.
            </p>

            <h2>8. Data Retention</h2>
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Data Type</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Retention Period</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Account data</td>
                  <td className="border border-gray-300 px-4 py-2">Until account deletion or 2 years of inactivity</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Check-in data</td>
                  <td className="border border-gray-300 px-4 py-2">Until account deletion</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Ximi conversations</td>
                  <td className="border border-gray-300 px-4 py-2">90 days or until account deletion</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Attendance records</td>
                  <td className="border border-gray-300 px-4 py-2">3 years (funder reporting requirement)</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Audit logs</td>
                  <td className="border border-gray-300 px-4 py-2">7 years (legal requirement)</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Anonymized analytics</td>
                  <td className="border border-gray-300 px-4 py-2">Indefinitely (no personal identifiers)</td>
                </tr>
              </tbody>
            </table>

            <h2>9. Children's Privacy</h2>
            <p>
              We take extra care with data from youth under 16:
            </p>
            <ul>
              <li><strong>Guardian verification:</strong> Required for all users under 16</li>
              <li><strong>Minimal collection:</strong> We collect only what's necessary for the service</li>
              <li><strong>No profiling:</strong> We don't build behavioral profiles or target ads</li>
              <li><strong>Educational purpose:</strong> Data is used to support mental health, not commercial gain</li>
            </ul>

            <h2>10. Breach Notification</h2>
            <p>
              In the unlikely event of a data breach:
            </p>
            <ul>
              <li><strong>Detection:</strong> Automated monitoring and manual audits</li>
              <li><strong>Notification:</strong> Affected users notified within 72 hours</li>
              <li><strong>Transparency:</strong> Public disclosure in Transparency Dashboard</li>
              <li><strong>Remediation:</strong> Immediate containment and security audit</li>
              <li><strong>OIPC reporting:</strong> Office of the Information and Privacy Commissioner notified as required</li>
            </ul>

            <h2>11. International Data Transfers</h2>
            <p>
              Your data stays in Canada:
            </p>
            <ul>
              <li><strong>Primary storage:</strong> Neon PostgreSQL (Canada servers)</li>
              <li><strong>Backups:</strong> Canada-only regions</li>
              <li><strong>AI services:</strong> OpenAI (may process in US for Ximi Program Finder)</li>
            </ul>
            <p>
              We do not transfer data outside Canada except for real-time AI processing, which is ephemeral (not stored).
            </p>

            <h2>12. Changes to This Privacy Policy</h2>
            <p>
              We may update this policy to reflect new features or legal requirements:
            </p>
            <ul>
              <li><strong>Notification:</strong> Email and in-app banner for material changes</li>
              <li><strong>Re-consent:</strong> Major changes require you to re-accept the policy</li>
              <li><strong>Version history:</strong> Available in Transparency Dashboard</li>
            </ul>

            <h2>13. Contact Us</h2>
            <p>
              For privacy questions or to exercise your rights:
            </p>
            <ul>
              <li><strong>Privacy Officer:</strong> privacy@roomxi.ca</li>
              <li><strong>Data deletion:</strong> Settings → Privacy Center → Delete My Account</li>
              <li><strong>Complaints:</strong> Office of the Information and Privacy Commissioner of Alberta (oipc.ab.ca)</li>
            </ul>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 mt-8">
              <div className="flex items-center gap-3 mb-3">
                <Eye className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Transparency Commitment</h3>
              </div>
              <p className="text-gray-700 mb-3">
                We publish quarterly transparency reports showing consent rates, data deletion requests, 
                breach events (if any), and AI oversight flags. Your privacy is not a secret.
              </p>
              <Link 
                to="/transparency" 
                className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                View Transparency Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Link to="/home" className="text-purple-600 hover:underline font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

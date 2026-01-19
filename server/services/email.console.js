import logger from '../logger.ts';

export async function sendGuardianVerificationEmail({ 
  to, 
  verificationUrl, 
  youthName, 
  linkExpiresIn = '24 hours' 
}) {
  logger.info({
    context: 'console-email',
    to,
    subject: `Room XI Connect - Verify Guardian Access for ${youthName}`,
    verificationUrl,
  }, 'CONSOLE EMAIL - Guardian Verification (for development/pilot)');
  
  console.log('\n' + '='.repeat(60));
  console.log('📧 CONSOLE EMAIL (NO EMAIL PROVIDER CONFIGURED)');
  console.log('='.repeat(60));
  console.log(`To: ${to}`);
  console.log(`Subject: Room XI Connect - Verify Guardian Access for ${youthName}`);
  console.log(`\nVerification Link (expires in ${linkExpiresIn}):`);
  console.log(`  ${verificationUrl}`);
  console.log('='.repeat(60) + '\n');
  
  return { success: true, provider: 'console' };
}

export async function verifyEmailConfig() {
  logger.warn({ context: 'console-email' }, 'Using console email provider - emails will be logged to server console');
  return true;
}

// reCAPTCHA verification utility
const RECAPTCHA_SECRET_KEY = '6LfaMcQrAAAAAId0OynPnr53TPRo7OPbomwg0IGw';

export async function verifyRecaptcha(recaptchaResponse, userIP) {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: recaptchaResponse,
        remoteip: userIP || '127.0.0.1'
      })
    });

    const data = await response.json();
    return {
      success: data.success,
      score: data.score,
      challenge_ts: data.challenge_ts,
      hostname: data.hostname,
      'error-codes': data['error-codes']
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return {
      success: false,
      error: 'Verification failed'
    };
  }
}

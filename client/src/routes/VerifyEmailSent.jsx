export default function VerifyEmailSent() {
  return (
    <div>
      <h1>Verify your email</h1>
      <p>We sent a verification link to your email address. Please check your inbox and spam folder.</p>
      <div>
        <a href="/login">Go to login</a>
        <span> | </span>
        <a href="https://mail.google.com/" target="_blank" rel="noopener noreferrer">Open Gmail</a>
      </div>
    </div>
  );
}

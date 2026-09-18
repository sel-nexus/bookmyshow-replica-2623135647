import { LoginForm } from '../../components/LoginForm';

/** Render the mobile-number login entry point for the booking journey. */
export default function LoginPage() {
  return (
    <main>
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand">BookMyShow</div>
        <h1 id="login-title">Find your next show.</h1>
        <p>Enter your 10-digit mobile number to receive a demo one-time passcode.</p>
        <LoginForm />
      </section>
    </main>
  );
}

import { OtpForm } from '../../components/OtpForm';

/** Render the OTP verification step after a mobile number is accepted. */
export default function OtpPage() {
  return (
    <main>
      <section className="auth-card" aria-labelledby="otp-title">
        <div className="brand">BookMyShow</div>
        <h1 id="otp-title">Verify your number.</h1>
        <p>Enter the one-time passcode sent to your mobile number.</p>
        <OtpForm />
      </section>
    </main>
  );
}

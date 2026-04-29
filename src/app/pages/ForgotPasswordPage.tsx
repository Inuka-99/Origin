import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2, ArrowLeft } from 'lucide-react';
// TODO: restore image import once asset is available
// import originLogo from 'figma:asset/966bedd3383407a6804dcd0980785a3c1cd7d32b.png';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-10">
            <div className="inline-block mb-6">
              <div className="h-16 flex items-center justify-center text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>ORIGIN</div>
            </div>
            <h1 
              className="text-3xl mb-2 font-semibold" 
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
            >
              Check your email
            </h1>
            <p className="text-sm text-text-secondary font-normal">
              We've sent a password reset link to {email}
            </p>
          </div>

          {/* Success Card */}
          <div className="bg-surface rounded-lg shadow-sm border border-divider p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-text-secondary mb-6">
                Click the link in the email to reset your password. If you don't see the email, check your spam folder.
              </p>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-accent text-white py-2.5 rounded-lg hover:bg-accent-hover transition-colors font-medium text-sm"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <div className="inline-block mb-6">
            <img 
              src={originLogo} 
              alt="ORIGIN" 
              className="h-16 w-auto"
            />
          </div>
          <h1 
            className="text-3xl mb-2 font-semibold" 
            style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
          >
            Forgot password?
          </h1>
          <p className="text-sm text-text-secondary font-normal">
            No worries, we'll send you reset instructions
          </p>
        </div>

        {/* Forgot Password Card */}
        <div className="bg-surface rounded-lg shadow-sm border border-divider p-8">
          <form onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="mb-8">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border-subtle focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="sarah@company.com"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-text-secondary mt-2">
                Enter the email address associated with your account
              </p>
            </div>

            {/* Send Reset Link Button */}
            <button
              type="submit"
              className="w-full bg-accent text-white py-2.5 rounded-lg hover:bg-accent-hover transition-colors font-medium text-sm mb-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {/* Back to Sign In */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors font-medium"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
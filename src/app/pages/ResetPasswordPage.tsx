import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
// TODO: restore image import once asset is available
// import originLogo from 'figma:asset/966bedd3383407a6804dcd0980785a3c1cd7d32b.png';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      navigate('/');
    }, 1500);
  };

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
            Reset password
          </h1>
          <p className="text-sm text-text-secondary font-normal">
            Enter your new password below
          </p>
        </div>

        {/* Reset Password Card */}
        <div className="bg-surface rounded-lg shadow-sm border border-divider p-8">
          <form onSubmit={handleSubmit}>
            {/* New Password Input */}
            <div className="mb-6">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-subtle focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all text-sm pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter new password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="mb-8">
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-subtle focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all text-sm pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Re-enter new password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Must be at least 8 characters with a mix of letters and numbers
              </p>
            </div>

            {/* Reset Password Button */}
            <button
              type="submit"
              className="w-full bg-accent text-white py-2.5 rounded-lg hover:bg-accent-hover transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>

        {/* Back to Sign In Link */}
        <p className="text-center text-sm text-text-secondary mt-6">
          Remember your password?{' '}
          <button
            onClick={() => navigate('/')}
            className="text-accent hover:text-[#1a3d8a] font-medium transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
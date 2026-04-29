import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
// TODO: restore image import once asset is available
// import originLogo from 'figma:asset/966bedd3383407a6804dcd0980785a3c1cd7d32b.png';

export function MFAVerificationPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();

    // Resend timer
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    
    // Focus last filled input or next empty one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.some(digit => !digit)) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 1500);
  };

  const handleResend = () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(60);
    // Simulate resend
    console.log('Resending code...');
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
            Two-factor authentication
          </h1>
          <p className="text-sm text-text-secondary font-normal">
            Enter the 6-digit code sent to your device
          </p>
        </div>

        {/* MFA Card */}
        <div className="bg-surface rounded-lg shadow-sm border border-divider p-8">
          <form onSubmit={handleSubmit}>
            {/* Code Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-text-secondary mb-4 text-center">
                Verification Code
              </label>
              <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-semibold rounded-lg border border-border-subtle focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  />
                ))}
              </div>
              <p className="text-xs text-text-secondary mt-4 text-center">
                The code expires in 10 minutes
              </p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              className="w-full bg-accent text-white py-2.5 rounded-lg hover:bg-accent-hover transition-colors font-medium text-sm mb-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || code.some(digit => !digit)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </button>

            {/* Resend Code */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                className={`text-sm font-medium transition-colors ${
                  canResend
                    ? 'text-accent hover:text-[#1a3d8a] cursor-pointer'
                    : 'text-text-tertiary cursor-not-allowed'
                }`}
                disabled={!canResend}
              >
                {canResend ? (
                  'Resend code'
                ) : (
                  `Resend code in ${resendTimer}s`
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Back to Sign In Link */}
        <p className="text-center text-sm text-text-secondary mt-6">
          Having trouble?{' '}
          <button
            onClick={() => navigate('/')}
            className="text-accent hover:text-[#1a3d8a] font-medium transition-colors"
          >
            Back to Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
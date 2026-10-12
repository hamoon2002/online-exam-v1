import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import GoogleAccess from '../GoogleAccess/GoogleAccess';
import AuthBack from '../AuthBack/AuthBack';
import Button from '../Button/Button';
import StepIndicator from '../StepIndicator/StepIndicator';

import IdentityStep from './IdentityStep';
import OtpStep from './OtpStep';
import RoleStep from './RoleStep';

import {
  WIZARD_LABELS,
  WIZARD_ORDER,
  type AccountRole,
  type SignupStep,
} from './signup.types';

import { register, requestOtp, verifyOtp } from '../../api/authApi';

import { OTP_CODE_LENGTH } from '../../constants/otp';
import { useOtpCaptcha } from '../../hooks/useOtpCaptcha';
import { detectIdentifierType, normalizeIdentifier } from '../../utils/identifier';
import Captcha from '../Captcha/Captcha';

// مرحله‌ای که ثبت‌نام (و ارسال کد) از آن انجام شد؛ «بازگشت» از مرحله‌ی کد به همان برمی‌گردد
type SubmitOrigin = 'role' | 'identity';

function SignupForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialIdentifier = typeof location.state?.identifier === 'string' ? location.state.identifier : '';

  // شماره‌ی موبایلی که از مرحله‌ی ورود آمده: فقط نوع حساب + کد تأیید لازم است
  // (نه نام، نه رمز، نه صفحه‌ی اطلاعات). ایمیل رمز می‌خواهد و از مرحله‌ی «اطلاعات» می‌گذرد.
  const entryPhone =
    Boolean(location.state?.fromEntry) &&
    detectIdentifierType(initialIdentifier) === 'PHONE';

  const requesting = useRef(false);
  const [googleActive, setGoogleActive] = useState(false);

  const [step, setStep] = useState<SignupStep>('role');
  const [role, setRole] = useState<AccountRole | null>(null);
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpOrigin, setOtpOrigin] = useState<SubmitOrigin>('identity');

  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const otpCaptcha = useOtpCaptcha();

  // هر بار که تغییر کنه، شمارنده‌ی «ارسال مجدد» داخل OtpStep از اول شروع می‌شه
  const [resendSignal, setResendSignal] = useState(0);

  function exitSignup() {
    navigate('/login', { state: { identifier } });
  }

  function goToWizardStep(target: 'role' | 'identity') {
    setError('');
    setStep(target);
  }

  function handleRoleChange(nextRole: AccountRole) {
    setError('');

    // اگه نقش عوض شد، اطلاعاتی که قبلاً برای نقش قبلی پر شده بود پاک می‌شه
    // (کلیک دوباره روی همون نقش چیزی رو پاک نمی‌کنه)
    if (role !== null && nextRole !== role) {
      setIdentifier(initialIdentifier);
      setPassword('');
      setConfirmPassword('');
      setCode('');
    }

    setRole(nextRole);
  }

  function handleRoleNext() {
    if (!role) {
      setError('نوع حساب را انتخاب کنید');
      return;
    }

    if (entryPhone) {
      void submitRegistration('role', normalizeIdentifier(initialIdentifier, 'PHONE'));
      return;
    }

    goToWizardStep('identity');
  }

  // ثبت‌نام + ارسال کد تأیید. رمز فقط برای ایمیل فرستاده می‌شود؛ نام لازم نیست.
  async function submitRegistration(origin: SubmitOrigin, normalizedIdentifier: string) {
    if (requesting.current) return;

    if (!role) {
      setError('نوع حساب مشخص نشده است');
      return;
    }

    if (!otpCaptcha.ready) {
      setError('کد تصویر امنیتی را وارد کنید');
      return;
    }

    setError('');
    requesting.current = true;
    setLoading(true);

    try {
      const result = await register({
        identifier: normalizedIdentifier,
        password: detectIdentifierType(normalizedIdentifier) === 'EMAIL' ? password : undefined,
        role,
        captcha: otpCaptcha.captcha ?? undefined,
      });

      otpCaptcha.afterRequest(result);

      if (result.status === 'otp_sent') {
        setIdentifier(normalizedIdentifier);
        setCode('');
        setOtpOrigin(origin);
        setResendSignal((current) => current + 1);
        setStep('otp');
        return;
      }

      setError(result.message);
    } finally {
      requesting.current = false;
      setLoading(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent) {
    event.preventDefault();
    if (requesting.current) return;

    if (code.length !== OTP_CODE_LENGTH) {
      setError('کد ۶ رقمی را کامل وارد کنید');
      return;
    }

    setError('');
    requesting.current = true;
    setLoading(true);

    try {
      const result = await verifyOtp(identifier.trim(), 'REGISTER', code, true);

      if (result.status === 'success') {
        navigate(
          result.user.onboardingCompleted ? '/dashboard' : '/onboarding'
        );
        return;
      }

      if (result.status === 'pending_approval') {
        setPendingMessage(result.message);
        return;
      }

      setError(result.message);
    } finally {
      requesting.current = false;
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (requesting.current) {
      return;
    }

    if (!otpCaptcha.ready) {
      setError('کد تصویر امنیتی را وارد کنید');
      return;
    }

    setError('');
    requesting.current = true;
    setResending(true);

    try {
      const result = await requestOtp(
        identifier.trim(),
        'REGISTER',
        otpCaptcha.captcha ?? undefined
      );

      otpCaptcha.afterRequest(result);

      if (result.status === 'sent') {
        setCode('');
        setResendSignal((current) => current + 1);
        return;
      }

      setError(result.message);
    } finally {
      requesting.current = false;
      setResending(false);
    }
  }

  function handleOtpBack() {
    setError('');
    setCode('');
    setStep(otpOrigin);
  }

  // فقط وقتی سرور کپچا خواسته نمایش داده می‌شود
  const captchaBlock = otpCaptcha.required ? (
    <Captcha
      onChange={otpCaptcha.setCaptcha}
      resetSignal={otpCaptcha.resetSignal}
    />
  ) : null;

  if (pendingMessage) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <AuthBack onClick={exitSignup} />
        <p className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-3 text-sm text-gray-700 dark:border-brand-900 dark:bg-brand-950/30 dark:text-gray-200">
          {pendingMessage}
        </p>

        <Button type="button" onClick={() => navigate('/login')}>
          رفتن به صفحه ورود
        </Button>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <>
        <AuthBack onClick={handleOtpBack} disabled={loading || resending} />
        <OtpStep
          identifier={identifier}
          code={code}
          error={error}
          loading={loading}
          resending={resending}
          resendSignal={resendSignal}
          captchaSlot={captchaBlock}
          onCodeChange={setCode}
          onBack={handleOtpBack}
          onResend={() => void handleResendCode()}
          onSubmit={handleOtpSubmit}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AuthBack
        disabled={loading}
        onClick={() => {
          if (step === 'role') exitSignup();
          else goToWizardStep('role');
        }}
      />

      {!entryPhone && (
        <StepIndicator
          steps={WIZARD_LABELS}
          currentIndex={WIZARD_ORDER.indexOf(step)}
        />
      )}

      {error && (
        <div className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400">
          {error}
        </div>
      )}

      {step === 'role' && !location.state?.fromEntry && <GoogleAccess onFlowChange={setGoogleActive} onSuccess={(completed) => navigate(completed ? '/dashboard' : '/onboarding')} />}
      {step === 'role' && !googleActive && (
        <RoleStep
          role={role}
          onRoleChange={handleRoleChange}
          onNext={handleRoleNext}
          nextLabel={entryPhone ? 'ارسال کد تأیید' : 'بعدی'}
          loading={entryPhone && loading}
        >
          {entryPhone ? captchaBlock : null}
        </RoleStep>
      )}

      {step === 'identity' && (
        <IdentityStep
          identifier={identifier}
          password={password}
          confirmPassword={confirmPassword}
          loading={loading}
          onIdentifierChange={setIdentifier}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onBack={() => goToWizardStep('role')}
          onNext={(normalizedIdentifier) =>
            void submitRegistration('identity', normalizedIdentifier)
          }
        >
          {captchaBlock}
        </IdentityStep>
      )}
    </div>
  );
}

export default SignupForm;

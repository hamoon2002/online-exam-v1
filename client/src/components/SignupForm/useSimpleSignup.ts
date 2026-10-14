import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, requestOtp, verifyOtp } from '../../api/authApi';
import { useOtpCaptcha } from '../../hooks/useOtpCaptcha';
import { detectIdentifierType } from '../../utils/identifier';
import { validateIdentityField } from './signup.validation';
import type { AccountRole } from './signup.types';

export default function useSimpleSignup(identifier: string) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'role' | 'password' | 'otp'>('role');
  const [role, setRole] = useState<AccountRole | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendSignal, setResendSignal] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const lock = useRef(false);
  const issued = useRef('');
  const captcha = useOtpCaptcha();
  const email = detectIdentifierType(identifier) === 'EMAIL';
  function back() {
    if (lock.current) return;
    setError('');
    setCode('');
    if (step === 'otp') setStep(email ? 'password' : 'role');
    else if (step === 'password') setStep('role');
    else navigate('/login', { state: { identifier } });
  }
  async function send() {
    if (lock.current) return;
    if (!role) {
      setError('نوع حساب را انتخاب کنید');
      return;
    }
    const key = JSON.stringify([role, identifier, email ? password : '']);
    if (issued.current === key) {
      setStep('otp');
      return;
    }
    if (email) {
      const invalid = validateIdentityField('password', {
        identifier,
        password,
        confirmPassword: password,
      });
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    if (!captcha.ready) {
      setError('کد تصویر امنیتی را وارد کنید');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await register({
        identifier,
        role,
        ...(email ? { password } : {}),
        captcha: captcha.captcha ?? undefined,
      });
      captcha.afterRequest(result);
      if (result.status === 'otp_sent') {
        issued.current = key;
        setCode('');
        setResendSignal((x) => x + 1);
        setResendAvailableAt(Date.now() + 90_000);
        setStep('otp');
      } else setError(result.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function next() {
    if (!role) {
      setError('نوع حساب را انتخاب کنید');
      return;
    }
    setError('');
    if (email) setStep('password');
    else void send();
  }
  async function verify(value: string) {
    if (lock.current || value.length !== 6) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await verifyOtp(identifier, 'REGISTER', value, true);
      if (result.status === 'success')
        navigate('/dashboard', { replace: true });
      else if (result.status === 'pending_approval')
        setPendingMessage(result.message);
      else {
        setError(result.message);
        setCode('');
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function resend() {
    if (lock.current) return;
    if (!captcha.ready) {
      setError('کد تصویر امنیتی را وارد کنید');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await requestOtp(
        identifier,
        'REGISTER',
        captcha.captcha ?? undefined,
      );
      captcha.afterRequest(result);
      if (result.status === 'sent') {
        setCode('');
        setResendSignal((x) => x + 1);
        setResendAvailableAt(Date.now() + 90_000);
      } else setError(result.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    step,
    role,
    setRole,
    password,
    setPassword,
    code,
    setCode,
    error,
    pendingMessage,
    busy,
    resendSignal,
    resendAvailableAt,
    captcha,
    back,
    next,
    send,
    verify,
    resend,
  };
}

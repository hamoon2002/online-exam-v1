import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthBack from '../AuthBack/AuthBack';
import Captcha from '../Captcha/Captcha';
import Button from '../Button/Button';
import PasswordField from '../PasswordField/PasswordField';
import IdentifierSummary from '../LoginForm/IdentifierSummary';
import RoleStep from './RoleStep';
import OtpStep from './OtpStep';
import useSimpleSignup from './useSimpleSignup';
import {
  detectIdentifierType,
  normalizeIdentifier,
} from '../../utils/identifier';

export default function SignupForm() {
  const location = useLocation();
  const identifier =
    typeof location.state?.identifier === 'string'
      ? location.state.identifier
      : '';
  const type = detectIdentifierType(identifier);
  return type ? (
    <SimpleSignup
      key={identifier}
      identifier={normalizeIdentifier(identifier, type)}
    />
  ) : (
    <Navigate to="/login" replace />
  );
}
function SimpleSignup({ identifier }: { identifier: string }) {
  const navigate = useNavigate();
  const form = useSimpleSignup(identifier);
  const captcha = form.captcha.required ? (
    <Captcha
      onChange={form.captcha.setCaptcha}
      resetSignal={form.captcha.resetSignal}
    />
  ) : null;
  if (form.pendingMessage)
    return (
      <div className="space-y-4">
        <p role="status">{form.pendingMessage}</p>
        <Button type="button" onClick={() => navigate('/login')}>
          بازگشت به ورود
        </Button>
      </div>
    );
  return (
    <div className="space-y-4">
      <AuthBack onClick={form.back} disabled={form.busy} />
      {form.step !== 'otp' && (
        <IdentifierSummary
          identifier={identifier}
          disabled={form.busy}
          onEdit={() => navigate('/login', { state: { identifier } })}
        />
      )}
      {form.error && form.step !== 'otp' && (
        <p
          role="alert"
          className="text-sm text-danger-600 dark:text-danger-400"
        >
          {form.error}
        </p>
      )}
      {form.step === 'role' && (
        <fieldset disabled={form.busy} className="space-y-4">
          {captcha}
          <RoleStep
            role={form.role}
            onRoleChange={form.setRole}
            onNext={form.next}
            loading={form.busy}
          />
        </fieldset>
      )}
      {form.step === 'password' && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.send();
          }}
        >
          <PasswordField
            floatingLabel
            id="signup-password"
            label="رمز عبور"
            placeholder="رمز عبور"
            value={form.password}
            onChange={(event) => form.setPassword(event.target.value)}
            autoComplete="new-password"
            showRequirements
            showStrength
            disabled={form.busy}
          />
          {captcha}
          <Button type="submit" disabled={form.busy}>
            {form.busy ? 'در حال ارسال…' : 'دریافت کد تأیید ایمیل'}
          </Button>
        </form>
      )}
      {form.step === 'otp' && (
        <OtpStep
          identifier={identifier}
          code={form.code}
          error={form.error}
          loading={form.busy}
          resending={false}
          resendSignal={form.resendSignal}
          resendAvailableAt={form.resendAvailableAt}
          captchaSlot={captcha}
          onCodeChange={(value) => {
            form.setCode(value);
            if (value.length === 6 && !form.captcha.required) {
              void form.verify(value);
            }
          }}
          onBack={form.back}
          onResend={() => void form.resend()}
          onSubmit={(event) => {
            event.preventDefault();
            void form.verify(form.code);
          }}
        />
      )}
    </div>
  );
}
import Button from '../../Button/Button';
import TextBox from '../../TextBox/TextBox';
import Captcha from '../../Captcha/Captcha';
import type { CaptchaAnswer } from '../../../api/authApi';

type Props = {
  identifier: string;
  onIdentifierChange: (value: string) => void;
  captcha: CaptchaAnswer | null;
  captchaRequired: boolean;
  onCaptchaChange: (value: CaptchaAnswer | null) => void;
  captchaResetSignal: number;
  loading: boolean;
  onSubmit: (event: React.FormEvent) => void;
};

function IdentifierStep({
  identifier,
  onIdentifierChange,
  captcha,
  captchaRequired,
  onCaptchaChange,
  captchaResetSignal,
  loading,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset disabled={loading} className="contents">
      <div className="flex flex-col gap-1">
        <TextBox
          type="text"
          id="forgot-identifier"
          name="username"
          autoComplete="username"
          ltrInput
          placeholder="شماره تماس یا پست الکترونیکی بازیابی"
          floatingLabel="شماره تماس یا پست الکترونیکی"
          value={identifier}
          onChange={(e) => onIdentifierChange(e.target.value)}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          همان ایمیل یا شماره‌ای که هنگام ثبت‌نام وارد کرده‌اید
        </p>
      </div>

      {captchaRequired && <Captcha onChange={onCaptchaChange} resetSignal={captchaResetSignal} />}

      <Button type="submit" disabled={loading || (captchaRequired && !captcha)}>
        {loading ? 'در حال ارسال کد...' : 'ارسال کد تایید'}
      </Button>
      </fieldset>
    </form>
  );
}

export default IdentifierStep;
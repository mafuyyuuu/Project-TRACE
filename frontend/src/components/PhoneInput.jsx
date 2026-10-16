import { INPUT_LIMITS } from '@/utils/inputLimits';
import { PHONE_REQUIREMENTS } from '@/utils/phoneNumber';

export default function PhoneInput({ value, onChange, ...props }) {
  return <input {...props} type="tel" inputMode="tel" autoComplete="tel"
    maxLength={INPUT_LIMITS.phone} pattern="(09[0-9]{9}|\+639[0-9]{9})"
    title={PHONE_REQUIREMENTS} placeholder="09123456789" value={value}
    onChange={event => {
      const next = event.target.value;
      const limit = next.startsWith('+') ? 13 : 11;
      if (/^\+?\d*$/.test(next) && next.length <= limit) onChange?.(event);
    }} />;
}

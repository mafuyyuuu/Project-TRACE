import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import PhoneInput from '@/components/PhoneInput';
import NumberInput from '@/components/NumberInput';
import { NUMBER_LIMITS } from '@/utils/inputLimits';
import { normalizePhoneNumber } from '@/utils/phoneNumber';

function Draft({ Component, ...props }) {
  const [value, setValue] = useState('');
  return <Component aria-label="Draft" value={value} onChange={event => setValue(event.target.value)} {...props} />;
}

it('stops hundreds of phone digits and accepts both Philippine formats', async () => {
  const user = userEvent.setup();
  render(<Draft Component={PhoneInput} required />);
  const input = screen.getByLabelText('Draft');
  await user.type(input, '09123456789' + '1'.repeat(25));
  expect(input.value).toBe('09123456789');
  expect(input.checkValidity()).toBe(true);
  await user.clear(input);
  await user.type(input, '+639123456789');
  expect(input.checkValidity()).toBe(true);
  expect(normalizePhoneNumber(input.value)).toBe('09123456789');
  fireEvent.change(input, { target: { value: '9'.repeat(500) } });
  expect(input.value).toBe('+639123456789');
  fireEvent.change(input, { target: { value: '+12025550123' } });
  expect(input.checkValidity()).toBe(false);
});

it('bounds integer drafts and rejects exponent, decimal and oversized input without clamping', async () => {
  const user = userEvent.setup();
  render(<Draft Component={NumberInput} min={1} />);
  const input = screen.getByLabelText('Draft');
  fireEvent.change(input, { target: { value: String(NUMBER_LIMITS.quantity) } });
  expect(input.value).toBe('2147483647');
  for (const value of ['2147483648', '1'.repeat(100), '1e3', '1.5']) {
    fireEvent.change(input, { target: { value } });
    expect(input.value).toBe('2147483647');
  }
  await user.clear(input);
  await user.type(input, '12e+3.4');
  expect(input.value).toBe('1234');
  fireEvent.change(input, { target: { value: '0' } });
  expect(input.checkValidity()).toBe(false);
});

it('keeps exact centavos and bounded negative calibration offsets', () => {
  const { rerender } = render(<Draft Component={NumberInput} max={NUMBER_LIMITS.money} step="0.01" />);
  let input = screen.getByLabelText('Draft');
  fireEvent.change(input, { target: { value: '99999999.99' } });
  expect(input.value).toBe('99999999.99');
  fireEvent.change(input, { target: { value: '99999999.999' } });
  expect(input.value).toBe('99999999.99');
  rerender(<Draft key="offset" Component={NumberInput} min={-30} max={30} step="0.1" />);
  input = screen.getByLabelText('Draft');
  fireEvent.change(input, { target: { value: '-12.5' } });
  expect(input.value).toBe('-12.5');
  fireEvent.change(input, { target: { value: '-31' } });
  expect(input.value).toBe('-12.5');
});

it('also protects uncontrolled form fields and retains their submitted value', () => {
  const changed = vi.fn();
  render(<NumberInput aria-label="Copies" name="copies" defaultValue="1" min={1} onChange={changed} />);
  const input = screen.getByLabelText('Copies');
  fireEvent.change(input, { target: { value: '4' } });
  fireEvent.change(input, { target: { value: '9'.repeat(50) } });
  expect(input.value).toBe('4');
  expect(changed).toHaveBeenCalledOnce();
});

it('allows typing a fee with centavo precision without changing its value', async () => {
  const user = userEvent.setup();
  render(<Draft Component={NumberInput} max={NUMBER_LIMITS.money} step="0.01" />);
  const input = screen.getByLabelText('Draft');
  await user.type(input, '12.34');
  expect(input.value).toBe('12.34');
  await user.type(input, '5');
  expect(input.value).toBe('12.34');
});

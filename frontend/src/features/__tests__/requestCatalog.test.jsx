import { createRequire } from 'node:module';
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import NewRequestModal from '@/features/student/components/NewRequestModal';
import PricingModal from '@/features/secretary/components/PricingModal';
import { calculateBreakdown } from '@/utils/pricing';
const require = createRequire(import.meta.url);
const { REQUEST_CATALOG } = require('../../../../backend/src/utils/requestCatalog');
const serverPricing = require('../../../../backend/src/utils/pricing');
const user = { role: 'student', user_type: 'alumni', full_name: 'Synthetic Student', student_id: 'TEST-1', year_started: 2020, graduation_year: 2024 };
const types = REQUEST_CATALOG.map((row, id) => ({ ...row, id, unavailable_reason: null }));
function RequestForm() {
  const [selections, setSelections] = useState({});
  return <NewRequestModal user={user} setActiveModal={vi.fn()} documentTypes={types} documentTypesLoading={false}
    selections={selections} toggleDocumentType={name => setSelections(previous => previous[name] ? {} : { ...previous, [name]: { copies: 1, purpose: '', requestingSchool: '' } })}
    updateSelection={vi.fn()} handleStudentSubmitRequest={vi.fn()} actionLoading={false} />;
}
it('shows the complete active catalog and each included per-page fee without the deactivated Nursing rows', () => {
  render(<RequestForm />);
  expect(screen.getByRole('checkbox', { name: /For Second Course/ })).toBeEnabled();
  expect(screen.getByRole('checkbox', { name: /Second Copy of Certificate of Registration/ })).toBeEnabled();
  expect(screen.getByRole('checkbox', { name: /Certificate of Underload/ })).toBeEnabled();
  expect(screen.getByRole('checkbox', { name: /Certificate of Underload/ }).closest('label')).not.toHaveTextContent('₱0.00');
  expect(screen.queryByRole('checkbox', { name: /BSN|Nursing Hours/ })).not.toBeInTheDocument();
  expect(screen.getByText('CTC Attachment: ₱100.00 per printed page per copy')).toBeInTheDocument();
  expect(screen.getByText('Copy of Grade: ₱50.00 per printed page per copy')).toBeInTheDocument();
});
it('allows only one dismissal set and collects the saved study year and requesting university', () => {
  render(<RequestForm />);
  fireEvent.click(screen.getByRole('checkbox', { name: /For Masters/ }));
  expect(screen.getByRole('checkbox', { name: /For Graduate School/ })).toBeDisabled();
  expect(screen.getByRole('spinbutton', { name: 'Copies' })).toHaveAttribute('max', '1');
  expect(screen.getByRole('textbox', { name: 'Year Started' })).toHaveValue('2020');
  expect(screen.getByRole('textbox', { name: 'Requesting School / Company' })).toBeRequired();
});
it('collects separate Copy of Grade and Transcript page counts in Secretary pricing', () => {
  const type = REQUEST_CATALOG.find(row => row.name === 'Transfer Credentials');
  const change = vi.fn();
  render(<PricingModal selectedDoc={{ id: 1, document_type: type.name, pricing_schedule: type }} setActiveModal={vi.fn()}
    handlePriceDocument={vi.fn()} actionLoading={false} priceAmount="500.00" priceBreakdown={calculateBreakdown(type, { fee_page_counts: { 'Copy of Grade': 2, 'Transcript of Records': 3 } }, true)}
    priceNotes="" setPriceNotes={vi.fn()} confirmCurrentRates={false} setConfirmCurrentRates={vi.fn()}
    pricePageCount="" setPricePageCount={vi.fn()} priceFeePageCounts={{ 'Copy of Grade': 2, 'Transcript of Records': 3 }} setPriceFeePageCounts={change} siblingsUnpriced={0} />);
  expect(screen.getByRole('spinbutton', { name: 'Copy of Grade: Pages printed per copy' })).toHaveValue(2);
  const transcript = screen.getByRole('spinbutton', { name: 'Transcript of Records: Pages printed per copy' });
  expect(transcript).toHaveValue(3);
  fireEvent.change(transcript, { target: { value: '4' } });
  expect(change.mock.calls[0][0]({ 'Copy of Grade': 2, 'Transcript of Records': 3 })).toEqual({ 'Copy of Grade': 2, 'Transcript of Records': '4' });
  expect(within(screen.getByRole('region', { name: 'Fee calculation' })).getByText('Total: ₱500.00')).toBeInTheDocument();
});
it.each(REQUEST_CATALOG.filter(type => !type.fee_pending))('keeps frontend and backend final calculations equal for $name', type => {
  const selection = { copies: 1, page_count: 3, fee_page_counts: Object.fromEntries((type.fee_items || []).map(item => [item.label, 2])) };
  expect(calculateBreakdown(type, selection, true)).toEqual(serverPricing.calculateBreakdown(type, selection, true));
});

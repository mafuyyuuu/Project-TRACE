export const sameDayWalkInTypes = ['CTC', '2nd Copy of COR', '2nd Copy of OGR', 'CAV'];
const normalized = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
export const isHonorableDismissal = name => normalized(name) === 'honorable dismissal';
export const isSameDayWalkInType = name => sameDayWalkInTypes.some(type => normalized(type) === normalized(name));

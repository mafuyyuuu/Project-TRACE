import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import AnalyticsPanel from '@/features/admin/components/AnalyticsPanel';
import useReports from '@/features/admin/useReports';
vi.mock('@/features/admin/useReports',()=>({default:vi.fn(()=>({loading:true}))}));
vi.mock('@/components/SupportAnalytics',()=>({default:()=> <label>Support date draft<input defaultValue="2026-10-01"/></label>}));
it('opens support independently of document loading and retains its date draft across views',()=>{
 render(<MemoryRouter initialEntries={['/dashboard?tab=admin-analytics']}><AnalyticsPanel user={{role:'admin'}} currentTab="admin-analytics"/></MemoryRouter>);
 fireEvent.click(screen.getByRole('tab',{name:'Support Analytics'}));
 const draft=screen.getByLabelText('Support date draft');fireEvent.change(draft,{target:{value:'2026-10-05'}});
 fireEvent.click(screen.getByRole('tab',{name:'Document Efficiency'}));fireEvent.click(screen.getByRole('tab',{name:'Support Analytics'}));
 expect(screen.getByLabelText('Support date draft')).toBe(draft);expect(draft).toHaveValue('2026-10-05');
});
it('loads support deep links without mounting document reports',()=>{
 useReports.mockClear();render(<MemoryRouter initialEntries={['/dashboard?tab=admin-analytics&analytics=support']}><AnalyticsPanel user={{role:'admin'}} currentTab="admin-analytics"/></MemoryRouter>);
 expect(useReports).not.toHaveBeenCalled();expect(screen.getByLabelText('Support date draft')).toBeVisible();
});

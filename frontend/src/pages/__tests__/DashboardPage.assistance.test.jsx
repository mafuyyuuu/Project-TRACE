import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import DashboardPage from '@/pages/DashboardPage';
import InternalAssistanceWorkspace from '@/components/InternalAssistanceWorkspace';
const auth = vi.hoisted(() => ({user:null}));
vi.mock('@/hooks/useAuth',() => ({default:() => auth}));
vi.mock('@/components/InternalAssistanceWorkspace',() => ({default:vi.fn(() => <p>Internal workspace</p>)}));
vi.mock('@/features/student/StudentDashboard',() => ({default:() => <p>Student dashboard</p>}));
vi.mock('@/features/finance/FinanceDashboard',() => ({default:() => <p>Finance dashboard</p>}));
vi.mock('@/features/secretary/SecretaryDashboard',() => ({default:() => <p>Secretary dashboard</p>}));
vi.mock('@/features/window1/Window1Dashboard',() => ({default:() => <p>Window dashboard</p>}));
vi.mock('@/features/admin/AdminDashboard',() => ({default:() => <p>Admin dashboard</p>}));
vi.mock('@/features/graduate/GraduateApplication',() => ({default:() => <p>Graduate application</p>}));
vi.mock('@/components/ForcePasswordChange',() => ({default:() => <p>Change temporary password</p>}));
vi.mock('@/components/ImageViewerModal',() => ({default:() => null}));
vi.mock('@/pages/HelpPage',() => ({default:() => null}));
const mount = () => render(<MemoryRouter initialEntries={['/dashboard?tab=internal-assistance']}><DashboardPage /></MemoryRouter>);
beforeEach(() => vi.clearAllMocks());
it.each(['Window 1','Receiving Desk','Secretary','Finance'])('routes authorized %s staff to assistance',desk_assignment => {
  auth.user={id:4,role:'clerk',desk_assignment};mount();expect(screen.getByText('Internal workspace')).toBeInTheDocument();
});
it('routes Admin to assistance',() => {auth.user={id:9,role:'admin'};mount();expect(screen.getByText('Internal workspace')).toBeInTheDocument();});
it('passes notification ticket queries to the mounted workspace',() => {
  auth.user={id:9,role:'admin'};
  render(<MemoryRouter initialEntries={['/dashboard?tab=internal-assistance&internalTicket=29']}><DashboardPage /></MemoryRouter>);
  expect(InternalAssistanceWorkspace).toHaveBeenCalledWith(expect.objectContaining({requestedTicket:'29'}),undefined);
});
it.each([{id:3,role:'student'},{id:4,role:'clerk',desk_assignment:'Other'}])('does not mount assistance for a forced unauthorized URL',user => {
  auth.user=user;mount();expect(InternalAssistanceWorkspace).not.toHaveBeenCalled();
});
it('retains the temporary-password gate before staff assistance',() => {
  auth.user={id:9,role:'admin',must_change_password:true};mount();expect(screen.getByText('Change temporary password')).toBeInTheDocument();expect(InternalAssistanceWorkspace).not.toHaveBeenCalled();
});

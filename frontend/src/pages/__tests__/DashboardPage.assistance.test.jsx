import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import DashboardPage from '@/pages/DashboardPage';
import InternalAssistanceWorkspace from '@/components/InternalAssistanceWorkspace';
import MessagingWorkspace from '@/components/MessagingWorkspace';
const auth = vi.hoisted(() => ({user:null}));
vi.mock('@/hooks/useAuth',() => ({default:() => auth}));
vi.mock('@/components/InternalAssistanceWorkspace',() => ({default:vi.fn(() => <p>Internal workspace</p>)}));
vi.mock('@/components/MessagingWorkspace',()=>({default:vi.fn(()=> <p>Messaging categories</p>)}));
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
it('renders the normal Window 1 workspace for Receiving Desk accounts',()=>{
  auth.user={id:4,role:'clerk',desk_assignment:'Receiving Desk'};
  render(<MemoryRouter initialEntries={['/dashboard']}><DashboardPage/></MemoryRouter>);
  expect(screen.getByText('Window dashboard')).toBeInTheDocument();
  expect(MessagingWorkspace).not.toHaveBeenCalled();
});
beforeEach(() => vi.clearAllMocks());
it.each(['Window 1','Receiving Desk','Secretary','Finance'])('routes authorized %s staff to assistance',desk_assignment => {
  auth.user={id:4,role:'clerk',desk_assignment};mount();expect(screen.getByText('Internal workspace')).toBeInTheDocument();
});
it('routes legacy Admin assistance links to the internal Support category',() => {auth.user={id:9,role:'admin'};mount();expect(MessagingWorkspace).toHaveBeenCalledWith(expect.objectContaining({initialCategory:'internal'}),undefined);expect(InternalAssistanceWorkspace).not.toHaveBeenCalled();});
it('passes notification ticket queries to the mounted workspace',() => {
  auth.user={id:9,role:'admin'};
  render(<MemoryRouter initialEntries={['/dashboard?tab=internal-assistance&internalTicket=29']}><DashboardPage /></MemoryRouter>);
  expect(MessagingWorkspace).toHaveBeenCalledWith(expect.objectContaining({initialCategory:'internal'}),undefined);
});
it.each([{id:3,role:'student'},{id:4,role:'clerk',desk_assignment:'Other'}])('does not mount assistance for a forced unauthorized URL',user => {
  auth.user=user;mount();expect(InternalAssistanceWorkspace).not.toHaveBeenCalled();
});
it('retains the temporary-password gate before staff assistance',() => {
  auth.user={id:9,role:'admin',must_change_password:true};mount();expect(screen.getByText('Change temporary password')).toBeInTheDocument();expect(InternalAssistanceWorkspace).not.toHaveBeenCalled();
});
it.each(['Window 1','Receiving Desk','Secretary','Finance','Admin'])('routes %s to the categorized messaging workspace',desk=>{
  auth.user=desk==='Admin'?{id:9,role:'admin'}:{id:4,role:'clerk',desk_assignment:desk};
  render(<MemoryRouter initialEntries={['/dashboard?tab=messages&category=staff&conversation=21']}><DashboardPage/></MemoryRouter>);
  expect(screen.getByText('Messaging categories')).toBeInTheDocument();
});
it.each([{id:3,role:'student'},{id:4,role:'clerk',desk_assignment:'Other'},{id:9,role:'admin',must_change_password:true}])('does not mount staff messaging for an unauthorized or gated account',user=>{
  auth.user=user;render(<MemoryRouter initialEntries={['/dashboard?tab=messages&category=staff']}><DashboardPage/></MemoryRouter>);
  expect(MessagingWorkspace).not.toHaveBeenCalled();
});

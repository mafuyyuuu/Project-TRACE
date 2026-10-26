import {fireEvent,render,screen} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import UserAvatar from '@/components/UserAvatar';
import useAuthedFile from '@/hooks/useAuthedFile';
vi.mock('@/hooks/useAuthedFile',()=>({default:vi.fn()}));
beforeEach(()=>{vi.clearAllMocks();useAuthedFile.mockReturnValue({url:null});});
it.each(['student','admin','Window 1','Secretary','Finance'])('renders local initials without a remote default for %s',role=>{
 render(<UserAvatar user={{role,full_name:'  Juan  Dela Cruz '}} className="h-10 w-10 rounded-full"/>);
 expect(screen.getByRole('img',{name:'User'})).toHaveTextContent('JD');
 expect(useAuthedFile).toHaveBeenCalledWith(null);
 expect(document.querySelector('img')).toBeNull();
});
it('uses protected uploads and falls back when the resulting image fails, then accepts a replacement',()=>{
 useAuthedFile.mockReturnValue({url:'blob:photo'});
 const {rerender}=render(<UserAvatar user={{full_name:'Juan Cruz',profile_picture:'/uploads/photo.jpg'}}/>);
 expect(useAuthedFile).toHaveBeenCalledWith('/uploads/photo.jpg');
 fireEvent.error(screen.getByRole('img'));
 expect(screen.getByRole('img')).toHaveTextContent('JC');
 useAuthedFile.mockReturnValue({url:'blob:replacement'});
 rerender(<UserAvatar user={{full_name:'Juan Cruz'}} overridePath="replacement.jpg"/>);
 expect(screen.getByRole('img')).toHaveAttribute('src','blob:replacement');
});
it('shows a clean fallback for missing names and failed authenticated loads',()=>{
 useAuthedFile.mockReturnValue({url:null,error:'Forbidden'});
 render(<UserAvatar user={{profile_picture:'private.jpg'}} alt="Profile picture"/>);
 expect(screen.getByRole('img',{name:'Profile picture'})).toHaveTextContent('T');
});

import { expect, it, vi } from 'vitest';
import api from '@/services/api';
import { checkRegistrationId } from '@/services/registrationService';
vi.mock('@/services/api',()=>({default:{post:vi.fn()}}));
it('fails closed on a malformed availability response',async()=>{
 api.post.mockResolvedValue({data:{user:{id:1}}});
 await expect(checkRegistrationId('SYN-1')).rejects.toThrow('Invalid ID check response');
});

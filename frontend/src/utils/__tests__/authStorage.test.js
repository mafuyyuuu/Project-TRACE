import {afterEach,beforeEach,expect,it} from 'vitest';
import {authStorage,readCachedUser} from '@/utils/authStorage';
const original=Object.getOwnPropertyDescriptor(window,'sessionStorage');
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}};
beforeEach(()=>{localStorage.clear();sessionStorage.clear()});
afterEach(()=>{Object.defineProperty(window,'sessionStorage',original);localStorage.clear();sessionStorage.clear()});
it('keeps two tabs separate through legacy adoption, a second login and logout',()=>{
 const a=storage(),b=storage();let active=a;Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>active});
 localStorage.setItem('trace_token','existing-a');localStorage.setItem('trace_user',JSON.stringify({id:1}));
 expect(authStorage.getItem('trace_token')).toBe('existing-a');expect(readCachedUser()).toEqual({id:1});
 active=b;authStorage.setItem('trace_token','signed-in-b');authStorage.setItem('trace_user',JSON.stringify({id:2}));
 expect(localStorage.getItem('trace_token')).toBe('existing-a');expect(readCachedUser()).toEqual({id:2});
 active=a;expect(authStorage.getItem('trace_token')).toBe('existing-a');expect(readCachedUser()).toEqual({id:1});
 authStorage.removeItem('trace_token');authStorage.removeItem('trace_user');
 expect(authStorage.getItem('trace_token')).toBeNull();expect(localStorage.getItem('trace_token')).toBeNull();
 active=b;expect(authStorage.getItem('trace_token')).toBe('signed-in-b');expect(readCachedUser()).toEqual({id:2});
});
it('does not re-adopt shared credentials after an explicit logout',()=>{
 authStorage.setItem('trace_token','a');authStorage.removeItem('trace_token');
 localStorage.setItem('trace_token','legacy-b');
 expect(authStorage.getItem('trace_token')).toBeNull();
});
it('ignores malformed user caches and keeps preferences out of session credentials',()=>{
 authStorage.setItem('trace_token','a');authStorage.setItem('trace_user','{broken');
 expect(readCachedUser()).toBeNull();expect(authStorage.getItem('trace_token')).toBe('a');
 localStorage.setItem('trace_theme','dark');authStorage.setItem('trace_theme','light');
 expect(localStorage.getItem('trace_theme')).toBe('dark');expect(authStorage.getItem('trace_theme')).toBeNull();
});

import {useLayoutEffect,useState} from 'react';
function measure() {
  const view=window.visualViewport;
  return {top:view?.offsetTop || 0,left:view?.offsetLeft || 0,width:view?.width || innerWidth,height:view?.height || innerHeight};
}
export default function useModalViewport(open) {
  const [viewport,setViewport]=useState(measure);
  useLayoutEffect(()=>{
    if(!open)return undefined;
    const update=()=>setViewport(previous=>{const next=measure();return Object.keys(next).every(key=>next[key]===previous[key]) ? previous : next;});
    update();window.addEventListener('resize',update);const view=window.visualViewport;
    view?.addEventListener('resize',update);view?.addEventListener('scroll',update);
    return()=>{window.removeEventListener('resize',update);view?.removeEventListener('resize',update);view?.removeEventListener('scroll',update);};
  },[open]);
  return {...viewport,right:'auto',bottom:'auto','--trace-viewport-height':`${viewport.height}px`};
}

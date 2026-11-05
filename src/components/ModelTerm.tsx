import React, {useEffect,useId,useRef,useState} from "react";
import {modelTerm,type ModelTermId} from "../lib/narrative-model";

/** One definition for hover, keyboard focus and a tap. Escape dismisses it. */
export function ModelTerm({term,children}:{term:ModelTermId;children?:React.ReactNode}) {
 const value=modelTerm(term),id=useId(),root=useRef<HTMLSpanElement>(null),button=useRef<HTMLButtonElement>(null),closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const[open,setOpen]=useState(false),[pinned,setPinned]=useState(false),[position,setPosition]=useState({left:16,top:0,width:280});
 useEffect(()=>{
  if(!open)return;
  const place=()=>{const rect=button.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(280,innerWidth-32),height=root.current?.querySelector('[role="tooltip"]')?.getBoundingClientRect().height||200;setPosition({width,left:Math.max(16,Math.min(rect.left,innerWidth-width-16)),top:rect.bottom+height+8<=innerHeight-16?rect.bottom+8:Math.max(16,rect.top-height-8)});};place();
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)){setOpen(false);setPinned(false);}};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);setPinned(false);}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open]);
 useEffect(()=>()=>{if(closeTimer.current)clearTimeout(closeTimer.current);},[]);
 return <span className="model-term" ref={root} onMouseEnter={()=>{if(closeTimer.current)clearTimeout(closeTimer.current);setOpen(true);}} onMouseLeave={()=>{closeTimer.current=setTimeout(()=>{if(!pinned&&document.activeElement!==button.current)setOpen(false);},150);}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node)){setOpen(false);setPinned(false);}}}>
  <button ref={button} type="button" className="model-term-button" aria-describedby={open?id:undefined} aria-expanded={open} onFocus={()=>setOpen(true)} onClick={()=>{setPinned(!pinned);setOpen(!pinned);}}>{children||value.name}</button>
  {open&&<span id={id} className="model-definition" role="tooltip" style={position}><strong>{value.name}</strong><span>{value.definition}</span><small>{value.limit}</small></span>}
 </span>;
}

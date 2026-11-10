"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export default function SearchableFilter({label,value,values,onChange}: {label:string;value:string;values:string[];onChange:(value:string)=>void}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open,setOpen] = useState(false);
  const [query,setQuery] = useState('');
  const options = ['', ...Array.from(new Set(values)).filter(Boolean).sort((a,b)=>a.localeCompare(b,'zh-CN'))];
  const visible = options.filter(v => (v || '全部').normalize('NFKC').toLocaleLowerCase().includes(query.trim().normalize('NFKC').toLocaleLowerCase()));
  useEffect(() => {
    if (!open) return;
    input.current?.focus({preventScroll:true});
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function close() { setOpen(false); trigger.current?.focus({preventScroll:true}); }
  return <div ref={root} className={`asset-search-filter${open ? ' is-open' : ''}`} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}} onKeyDown={e=>{
    if(e.key==='Escape'){e.preventDefault();close();}
    if(open && (e.key==='ArrowDown'||e.key==='ArrowUp')){
      e.preventDefault();
      const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || []);
      const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next=current<0 ? (e.key==='ArrowDown'?0:buttons.length-1) : (current+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
      buttons[next]?.focus({preventScroll:true});
      buttons[next]?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    }
  }}>
    <span id={`${id}-label`}>{label}</span>
    <div className="asset-filter-anchor">
      <button ref={trigger} className="asset-filter-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} aria-labelledby={`${id}-label ${id}-value`} onClick={()=>{setQuery('');setOpen(v=>!v);}}><span id={`${id}-value`}>{value || '全部'}</span><ChevronDown size={15}/></button>
      {open && <div className="asset-filter-popover">
        <div className="asset-filter-search"><Search size={15}/><input ref={input} aria-label={`搜索${label}`} placeholder={`搜索${label}`} value={query} onChange={e=>setQuery(e.target.value)} /></div>
        <div id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`} className="asset-filter-options">
          {visible.map(v=><button key={v} type="button" role="option" aria-selected={value===v} onClick={()=>{onChange(v);close();}}><span>{v || '全部'}</span>{value===v&&<Check size={14}/>}</button>)}
          {!visible.length&&<p role="status">没有匹配选项</p>}
        </div>
      </div>}
    </div>
  </div>;
}

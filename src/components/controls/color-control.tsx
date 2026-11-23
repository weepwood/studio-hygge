
import { useEffect, useState } from "react"
import { HexColorPicker } from "react-colorful"
import { useI18n } from "@/lib/i18n"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
interface ColorControlProps {label:string; value:string; onChange:(value:string)=>void}
const validHex = /^#[0-9a-fA-F]{6}$/
export function ColorControl({label,value,onChange}:ColorControlProps) {
  const {t,isChinese} = useI18n()
  const [draft,setDraft] = useState(value)
  useEffect(()=>setDraft(value),[value])
  function commit() {
    if (validHex.test(draft)) onChange(draft)
    else setDraft(value)
  }
  return <div className="flex items-center justify-between">
    <span className="text-xs text-text-secondary">{t(label)}</span>
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={isChinese ? `选择${t(label)}颜色` : `Pick ${label} color`}
          className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-border-control focus-visible:outline-2 focus-visible:outline-hygge-rust"
          style={{backgroundColor:value}} />
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col gap-2">
        <HexColorPicker color={value} onChange={onChange} />
        <input type="text" aria-label={isChinese?`${t(label)}十六进制颜色值`:`${label} hex color`}
          value={draft} onChange={e=>{if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setDraft(e.target.value)}}
          onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape')setDraft(value)}}
          className="h-7 w-full rounded-md border border-border-control bg-control-bg px-2 font-mono text-xs text-text-primary focus-visible:outline-2 focus-visible:outline-hygge-rust" />
      </PopoverContent>
    </Popover>
  </div>
}

import { useId } from "react"
import { Switch } from "@/components/ui/switch"
import { useI18n } from "@/lib/i18n"

interface SwitchControlProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SwitchControl({
  label,
  checked,
  onChange,
}: SwitchControlProps) {
  const id = useId()
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-xs text-text-secondary">{t(label)}</label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

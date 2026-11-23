import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"

interface SelectControlProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

export function SelectControl({
  label,
  value,
  options,
  onChange,
}: SelectControlProps) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">{t(label)}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

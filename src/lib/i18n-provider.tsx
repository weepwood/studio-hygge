import { getStoredValue, setStoredValue } from "@/lib/safe-storage"
import { useEffect, useMemo, useState } from "react"
import { I18nContext, type I18nValue, type Language, zh } from "@/lib/i18n"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    getStoredValue("studio:language") === "zh" ? "zh" : "en",
  )

  const setLanguage = (next: Language) => {
    setStoredValue("studio:language", next)
    setLanguageState(next)
  }

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en"
  }, [language])

  const value = useMemo<I18nValue>(() => ({
    language,
    setLanguage,
    isChinese: language === "zh",
    t: (text) => language === "zh" ? zh[text] ?? text : text,
  }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

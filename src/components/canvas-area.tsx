import { forwardRef } from "react"

const CanvasArea = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={`warm-stage flex flex-1 items-center justify-center order-1 overflow-hidden px-5 py-6 md:order-none md:px-8 md:py-10 [&_canvas]:!max-w-full [&_canvas]:!max-h-full [&_canvas]:!w-auto [&_canvas]:!h-auto ${className ?? ''}`}
      {...props}
    >
      {children}
    </div>
  )
)
CanvasArea.displayName = "CanvasArea"

export { CanvasArea }

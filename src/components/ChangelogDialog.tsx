import { Dialog } from "radix-ui"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { changelog } from "@/lib/changelog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangelogDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-4 shadow-lg outline-none">
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">
              What's new
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Close changelog"
              >
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          <ScrollArea className="overflow-hidden rounded-lg border [&>[data-slot=scroll-area-viewport]]:max-h-[55dvh]">
            <div className="space-y-5 p-3">
              {changelog.map((entry, i) => (
                <section key={entry.version}>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      v{entry.version}
                    </span>
                    {i === 0 && (
                      <span className="text-xs text-muted-foreground">
                        latest
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground marker:text-border">
                    {entry.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </ScrollArea>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

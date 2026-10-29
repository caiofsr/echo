import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import { useRef } from "react";

// shadcn/ui Base UI dialog, adapted to Echo's existing controls and icons.
function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogContent({ className, ...props }: DialogPrimitive.Popup.Props) {
  const container = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={container} />
      <DialogPrimitive.Portal container={container} keepMounted>
        <DialogPrimitive.Backdrop
          data-slot="dialog-overlay"
          className="settings-dialog-overlay"
        />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn("settings-dialog", className)}
          {...props}
        />
      </DialogPrimitive.Portal>
    </>
  );
}

function DialogTitle(props: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" {...props} />;
}

function DialogDescription(props: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description data-slot="dialog-description" {...props} />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogTitle };

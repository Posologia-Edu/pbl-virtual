import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (decoded: string) => void;
}

export default function QrScannerDialog({ open, onOpenChange, onScan }: QrScannerDialogProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-scanner-region";

  useEffect(() => {
    if (!open) return;
    let stopped = false;

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (stopped) return;
            stopped = true;
            onScan(decodedText);
            scanner.stop().then(() => scanner.clear()).catch(() => {});
            onOpenChange(false);
          },
          () => {}
        );
      } catch (err: any) {
        toast({
          title: "Não foi possível acessar a câmera",
          description: err?.message || "Verifique as permissões do navegador.",
          variant: "destructive",
        });
        onOpenChange(false);
      }
    };

    start();

    return () => {
      stopped = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear QR Code</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR Code exibido pelo professor.
          </DialogDescription>
        </DialogHeader>
        <div id={containerId} className="w-full overflow-hidden rounded-lg bg-black/5" />
      </DialogContent>
    </Dialog>
  );
}

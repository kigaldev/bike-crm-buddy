import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FeedbackForm } from './FeedbackForm';
import { MessageSquarePlus } from 'lucide-react';

interface FeedbackButtonProps {
  appCodigo?: string;
  className?: string;
}

export function FeedbackButton({ appCodigo, className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Enviar Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
        </DialogHeader>
        <FeedbackForm 
          appInicial={appCodigo}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
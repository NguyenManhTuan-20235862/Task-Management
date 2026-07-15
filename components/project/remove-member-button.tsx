"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { removeProjectMember } from "@/lib/actions/project";

export function RemoveMemberButton({
  projectId,
  memberUserId,
  memberName,
}: {
  projectId: string;
  memberUserId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function confirm() {
    setError(null);
    setIsPending(true);
    const result = await removeProjectMember({ projectId, memberUserId });
    setIsPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Xoá ${memberName} khỏi project`}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xoá thành viên</DialogTitle>
          <DialogDescription>
            Xoá {memberName} khỏi project? Dev còn task trong project sẽ không
            xoá được — cần giao lại task trước.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Huỷ
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={confirm}>
            {isPending ? "Đang xoá..." : "Xoá khỏi project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

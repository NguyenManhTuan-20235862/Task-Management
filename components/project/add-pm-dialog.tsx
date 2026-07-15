"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addProjectMember } from "@/lib/actions/project";
import {
  addProjectMemberSchema,
  type AddProjectMemberInput,
} from "@/lib/validation/project";

type PmOption = { id: string; name: string; projectCount: number };

export function AddPmDialog({
  projectId,
  pmOptions,
}: {
  projectId: string;
  pmOptions: PmOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddProjectMemberInput>({
    resolver: zodResolver(addProjectMemberSchema),
    defaultValues: { projectId, pmUserId: "" },
  });

  const pmUserId = useWatch({ control, name: "pmUserId" });

  async function onSubmit(values: AddProjectMemberInput) {
    setRootError(null);
    const result = await addProjectMember(values);
    if (!result.ok) {
      setRootError(result.error);
      return;
    }
    reset({ projectId, pmUserId: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset({ projectId, pmUserId: "" });
          setRootError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UserPlus data-icon="inline-start" aria-hidden />
            Thêm PM
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm PM vào project</DialogTitle>
          <DialogDescription>
            Một PM có thể quản lý nhiều project cùng lúc.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {rootError && (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="pmUserId">PM</Label>
            <Select
              value={pmUserId || null}
              onValueChange={(value) =>
                setValue("pmUserId", value ?? "", { shouldValidate: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="pmUserId"
                className="w-full"
                aria-invalid={!!errors.pmUserId}
              >
                <SelectValue placeholder="Chọn PM" />
              </SelectTrigger>
              <SelectContent>
                {pmOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Không còn PM nào để thêm
                  </div>
                ) : (
                  pmOptions.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name} (đang quản lý {pm.projectCount} project)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.pmUserId && (
              <p className="text-sm text-destructive">{errors.pmUserId.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || pmOptions.length === 0}>
              {isSubmitting ? "Đang thêm..." : "Thêm PM"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { addDevToProject } from "@/lib/actions/project";
import {
  addDevToProjectSchema,
  type AddDevToProjectInput,
} from "@/lib/validation/project";

type DevOption = { id: string; name: string };

export function AddDevDialog({
  projectId,
  devOptions,
}: {
  projectId: string;
  devOptions: DevOption[];
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
  } = useForm<AddDevToProjectInput>({
    resolver: zodResolver(addDevToProjectSchema),
    defaultValues: { projectId, devUserId: "" },
  });

  const devUserId = useWatch({ control, name: "devUserId" });

  // Base UI Select.Value chỉ tự hiển thị label khi Select.Root có prop `items`
  // (value -> label) — thiếu prop này thì trigger hiện raw id dù chọn qua UI.
  const selectItems = Object.fromEntries(devOptions.map((dev) => [dev.id, dev.name]));

  async function onSubmit(values: AddDevToProjectInput) {
    setRootError(null);
    const result = await addDevToProject(values);
    if (!result.ok) {
      setRootError(result.error);
      return;
    }
    reset({ projectId, devUserId: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset({ projectId, devUserId: "" });
          setRootError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UserPlus data-icon="inline-start" aria-hidden />
            Thêm Dev
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm Dev vào project</DialogTitle>
          <DialogDescription>
            Dev phải là thành viên project trước khi được giao task.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {rootError && (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="devUserId">Dev</Label>
            <Select
              items={selectItems}
              value={devUserId || null}
              onValueChange={(value) =>
                setValue("devUserId", value ?? "", { shouldValidate: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="devUserId"
                className="w-full"
                aria-invalid={!!errors.devUserId}
              >
                <SelectValue placeholder="Chọn Dev" />
              </SelectTrigger>
              <SelectContent>
                {devOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Không còn Dev nào để thêm
                  </div>
                ) : (
                  devOptions.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id}>
                      {dev.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.devUserId && (
              <p className="text-sm text-destructive">{errors.devUserId.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || devOptions.length === 0}>
              {isSubmitting ? "Đang thêm..." : "Thêm Dev"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

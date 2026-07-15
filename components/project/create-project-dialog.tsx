"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject } from "@/lib/actions/project";
import { createProjectSchema, type CreateProjectInput } from "@/lib/validation/project";

type PmOption = { id: string; name: string; projectCount: number };

export function CreateProjectDialog({
  pmOptions,
  trigger,
}: {
  pmOptions: PmOption[];
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", pmUserId: "", startDate: "", dueDate: "" },
  });

  const pmUserId = useWatch({ control, name: "pmUserId" });

  async function onSubmit(values: CreateProjectInput) {
    setRootError(null);
    const result = await createProject(values);
    if (!result.ok) {
      setRootError(result.error);
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
          setRootError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus data-icon="inline-start" aria-hidden />
              Tạo project
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo project mới</DialogTitle>
          <DialogDescription>
            Chỉ định PM quản lý ngay khi tạo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {rootError && (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Tên project</Label>
            <Input
              id="name"
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pmUserId">PM quản lý</Label>
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
                {pmOptions.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.name} (đang quản lý {pm.projectCount} project)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pmUserId && (
              <p className="text-sm text-destructive">{errors.pmUserId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Ngày bắt đầu</Label>
              <Input
                id="startDate"
                type="date"
                disabled={isSubmitting}
                aria-invalid={!!errors.startDate}
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Ngày kết thúc</Label>
              <Input
                id="dueDate"
                type="date"
                disabled={isSubmitting}
                aria-invalid={!!errors.dueDate}
                {...register("dueDate")}
              />
              {errors.dueDate && (
                <p className="text-sm text-destructive">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo..." : "Tạo project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { createTask, updateTask } from "@/lib/actions/task";
import { DEV_OVERLOAD_TASK_THRESHOLD } from "@/lib/constants";

type DevOption = { id: string; name: string };

// Form dùng chung cho tạo và sửa — phần khác nhau (projectId/taskId) gắn ở submit.
const formSchema = z
  .object({
    title: z.string().trim().min(1, "Vui lòng nhập tên task").max(200, "Tên quá dài"),
    description: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập mô tả")
      .max(5000, "Mô tả quá dài"),
    assigneeId: z.string().min(1, "Vui lòng chọn Dev thực hiện"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.dueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Hạn chót phải từ ngày bắt đầu trở đi",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const emptyValues: FormValues = {
  title: "",
  description: "",
  assigneeId: "",
  startDate: "",
  dueDate: "",
};

export function TaskDialog({
  mode,
  projectId,
  taskId,
  devOptions,
  devWorkload,
  initialValues,
  trigger,
}: {
  mode: "create" | "edit";
  projectId?: string;
  taskId?: string;
  devOptions: DevOption[];
  // Số task chưa DONE của mỗi Dev trong project này — dùng để cảnh báo mềm,
  // không chặn PM giao task.
  devWorkload?: Record<string, number>;
  initialValues?: FormValues;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const defaults = initialValues ?? emptyValues;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  const assigneeId = useWatch({ control, name: "assigneeId" });

  // Base UI Select.Value chỉ tự hiển thị label khi Select.Root có prop `items`
  // (value -> label) — thiếu prop này thì trigger hiện raw id dù chọn qua UI.
  const selectItems = Object.fromEntries(devOptions.map((dev) => [dev.id, dev.name]));
  const currentWorkload = assigneeId ? (devWorkload?.[assigneeId] ?? 0) : 0;

  async function onSubmit(values: FormValues) {
    setRootError(null);
    const result =
      mode === "create"
        ? await createTask({ projectId, ...values })
        : await updateTask({ taskId, ...values });
    if (!result.ok) {
      setRootError(result.error);
      return;
    }
    reset(mode === "create" ? emptyValues : values);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset(defaults);
          setRootError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <Plus data-icon="inline-start" aria-hidden />
              Tạo task
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tạo task mới" : "Sửa task"}
          </DialogTitle>
          <DialogDescription>
            Task được giao cho đúng 1 Dev là thành viên của project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {rootError && (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="task-title">Tên task</Label>
            <Input
              id="task-title"
              disabled={isSubmitting}
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-description">Mô tả</Label>
            <Textarea
              id="task-description"
              rows={3}
              disabled={isSubmitting}
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-assignee">Dev thực hiện</Label>
            <Select
              items={selectItems}
              value={assigneeId || null}
              onValueChange={(value) =>
                setValue("assigneeId", value ?? "", { shouldValidate: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="task-assignee"
                className="w-full"
                aria-invalid={!!errors.assigneeId}
              >
                <SelectValue placeholder="Chọn Dev" />
              </SelectTrigger>
              <SelectContent>
                {devOptions.map((dev) => (
                  <SelectItem key={dev.id} value={dev.id}>
                    {dev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assigneeId && (
              <p className="text-sm text-destructive">
                {errors.assigneeId.message}
              </p>
            )}
            {!errors.assigneeId && currentWorkload >= DEV_OVERLOAD_TASK_THRESHOLD && (
              <p className="flex items-center gap-1.5 text-xs text-[oklch(0.5_0.15_85)] dark:text-[oklch(0.75_0.15_85)]">
                <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                Dev này đang có {currentWorkload} task chưa hoàn thành trong
                project này — vẫn giao được nếu cần.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="task-start">Ngày bắt đầu</Label>
              <Input
                id="task-start"
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
              <Label htmlFor="task-due">Hạn chót</Label>
              <Input
                id="task-due"
                type="date"
                disabled={isSubmitting}
                aria-invalid={!!errors.dueDate}
                {...register("dueDate")}
              />
              {errors.dueDate && (
                <p className="text-sm text-destructive">
                  {errors.dueDate.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Đang lưu..."
                : mode === "create"
                  ? "Tạo task"
                  : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

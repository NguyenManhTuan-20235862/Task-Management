"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, UserPlus } from "lucide-react";
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
import { createMember } from "@/lib/actions/member";
import { createMemberSchema, type CreateMemberInput } from "@/lib/validation/member";

export function CreateMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateMemberInput>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: { name: "", email: "", password: "", role: "DEV" },
  });

  const role = useWatch({ control, name: "role" });

  async function onSubmit(values: CreateMemberInput) {
    setRootError(null);
    const result = await createMember(values);
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
          <Button>
            <UserPlus data-icon="inline-start" aria-hidden />
            Thêm thành viên
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm thành viên mới</DialogTitle>
          <DialogDescription>
            Hệ thống không có đăng ký — tài khoản tạo ở đây dùng được ngay với
            mật khẩu bạn đặt bên dưới.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {rootError && (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Họ tên</Label>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Mật khẩu ban đầu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                className="pr-9"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Vai trò</Label>
            <Select
              value={role}
              onValueChange={(value) =>
                setValue("role", value as "PM" | "DEV", { shouldValidate: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PM">PM — Quản lý dự án</SelectItem>
                <SelectItem value="DEV">Dev — Lập trình viên</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo..." : "Thêm thành viên"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

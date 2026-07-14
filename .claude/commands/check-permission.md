---
description: Rà soát logic phân quyền Admin/PM/Dev và các invariant nghiệp vụ trước khi merge
allowed-tools: Read, Grep, Glob, Bash(npm run typecheck), Bash(npm run lint), Bash(npm test:*)
---

Rà soát phân quyền của dự án này. Đối chiếu code với ma trận quyền và ràng buộc nghiệp vụ ở §2 của [CLAUDE.md](../../CLAUDE.md).

Phạm vi: các file đã thay đổi trên nhánh hiện tại (`git diff main...HEAD`). Nếu người dùng chỉ định phạm vi khác trong `$ARGUMENTS`, dùng phạm vi đó.

## Cần kiểm tra

1. **Mọi Server Action và Route Handler đều mở đầu bằng guard.** Tìm các export `async function` trong `lib/actions/**` và `app/api/**` không gọi `requireUser` / `requireProjectRole` / `requireTaskAssignee`. Một action mutation không có guard là lỗi nghiêm trọng, kể cả khi UI đã ẩn nút.

2. **Không tin dữ liệu từ client.** Tìm chỗ đọc `role`, `userId`, `projectId` từ form data / request body rồi dùng để quyết định quyền, thay vì lấy từ session. Tìm cả các `if` phân quyền chỉ tồn tại trong component `"use client"`.

3. **Query luôn bị giới hạn phạm vi.** Mọi truy vấn Prisma trên `Task`, `Comment`, `Attachment`, `Project` phải có `where` ràng buộc theo membership của user đang đăng nhập (`members: { some: { userId } } }`) — không được lấy hết rồi lọc bằng JS. Người ngoài project không được đọc dữ liệu kể cả khi biết id.

4. **Dev chỉ được sửa `progress` của task giao cho chính mình.** Kiểm tra action cập nhật task: Dev không được đổi `title`, `assigneeId`, `startDate`, `dueDate`, `projectId`. Cách an toàn là Dev đi qua một action riêng chỉ nhận `{ taskId, progress }`.

5. **Invariant "PM tối đa 2 project".** Việc thêm PM vào project phải đếm và chèn trong cùng một transaction (`$transaction` + khoá hàng, hoặc unique constraint), nếu không sẽ có race condition tạo ra PM ở 3 project. Check ở UI hoặc check rồi mới insert ngoài transaction đều là sai.

6. **Không có luồng đăng ký.** Không tồn tại route/action nào tạo `User` ngoài seed script và chức năng dành riêng cho Admin.

7. **Input được parse bằng Zod** trước khi chạm tới Prisma. `progress` phải là số nguyên 0–100; `startDate <= dueDate`.

8. **File đính kèm.** Download phải đi qua route kiểm quyền theo membership của task chứa file; không serve thẳng thư mục `uploads`. Kiểm tra giới hạn mime type và dung lượng 10MB.

## Cách báo cáo

Với mỗi vấn đề: nêu file:line, mô tả cụ thể **ai khai thác được và khai thác thế nào** (ví dụ: "Dev ở project A gọi thẳng action này với taskId của project B thì sửa được"), rồi đề xuất cách sửa. Xếp lỗi nghiêm trọng lên trước. Nếu không tìm thấy vấn đề nào, nói rõ đã kiểm tra những action/route nào thay vì chỉ báo "không có lỗi".

Không tự ý sửa code trừ khi người dùng yêu cầu.

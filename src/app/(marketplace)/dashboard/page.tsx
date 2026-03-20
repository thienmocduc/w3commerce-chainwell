export default function DashboardPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">Bảng điều khiển</h1>
        <p className="mt-3 text-muted-foreground">
          Quản lý tài khoản, theo dõi đơn hàng, hoa hồng và hiệu suất hoạt động của bạn trên nền tảng WellKOC.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          Đang phát triển
        </div>
      </div>
    </div>
  );
}

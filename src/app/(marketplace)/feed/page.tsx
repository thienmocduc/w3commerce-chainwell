export default function FeedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">Bảng tin KOC</h1>
        <p className="mt-3 text-muted-foreground">
          Theo dõi nội dung mới nhất từ các KOC hàng đầu, review sản phẩm verified và xu hướng mua sắm cộng đồng.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          Đang phát triển
        </div>
      </div>
    </div>
  );
}

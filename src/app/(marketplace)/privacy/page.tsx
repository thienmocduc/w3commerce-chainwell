import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách Bảo mật | WellKOC',
  description: 'Chính sách bảo mật của nền tảng WellKOC - wellkoc.com',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Chính sách Bảo mật</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Cập nhật lần cuối: 20 tháng 3, 2026
      </p>

      <div className="space-y-10 text-muted-foreground leading-relaxed">
        {/* Giới thiệu */}
        <section>
          <p>
            Chào mừng bạn đến với WellKOC (&quot;wellkoc.com&quot;, &quot;Nền tảng&quot;,
            &quot;chúng tôi&quot;). Chính sách Bảo mật này giải thích cách chúng tôi thu thập,
            sử dụng, lưu trữ và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng nền tảng
            thương mại điện tử kết hợp Web3 của chúng tôi. Bằng việc truy cập và sử dụng
            WellKOC, bạn đồng ý với các điều khoản trong chính sách này.
          </p>
        </section>

        {/* 1. Thu thập thông tin */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            1. Thu thập Thông tin
          </h2>
          <p className="mb-3">
            Chúng tôi thu thập các loại thông tin sau khi bạn sử dụng WellKOC:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Thông tin cá nhân:</strong> Họ tên, địa chỉ
              email, số điện thoại, địa chỉ giao hàng khi bạn đăng ký tài khoản hoặc đặt hàng.
            </li>
            <li>
              <strong className="text-foreground">Thông tin tài khoản:</strong> Tên đăng nhập,
              mật khẩu được mã hóa, vai trò trên nền tảng (Buyer, Vendor, KOC).
            </li>
            <li>
              <strong className="text-foreground">Thông tin giao dịch:</strong> Lịch sử đơn
              hàng, phương thức thanh toán, số tiền giao dịch.
            </li>
            <li>
              <strong className="text-foreground">Thông tin kỹ thuật:</strong> Địa chỉ IP, loại
              trình duyệt, hệ điều hành, thời gian truy cập và các trang đã xem.
            </li>
            <li>
              <strong className="text-foreground">Dữ liệu Web3:</strong> Địa chỉ ví công khai
              (public wallet address) khi bạn kết nối ví với nền tảng.
            </li>
          </ul>
        </section>

        {/* 2. Sử dụng thông tin */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            2. Sử dụng Thông tin
          </h2>
          <p className="mb-3">Chúng tôi sử dụng thông tin thu thập được để:</p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Cung cấp, vận hành và cải thiện dịch vụ của WellKOC.</li>
            <li>Xử lý đơn hàng, thanh toán và giao hàng.</li>
            <li>
              Tính toán và phân phối hoa hồng cho KOC (Key Opinion Consumer) thông qua hệ
              thống affiliate.
            </li>
            <li>Gửi thông báo về đơn hàng, cập nhật sản phẩm và chương trình khuyến mãi.</li>
            <li>Phát hiện và ngăn chặn gian lận, bảo vệ an toàn nền tảng.</li>
            <li>
              Phân tích hành vi người dùng để cá nhân hóa trải nghiệm mua sắm và đề xuất sản
              phẩm phù hợp.
            </li>
            <li>Tuân thủ các nghĩa vụ pháp lý và yêu cầu của cơ quan chức năng.</li>
          </ul>
        </section>

        {/* 3. Bảo vệ dữ liệu */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            3. Bảo vệ Dữ liệu
          </h2>
          <p className="mb-3">
            Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ thông tin
            cá nhân của bạn:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Mã hóa dữ liệu truyền tải bằng giao thức SSL/TLS.</li>
            <li>Lưu trữ mật khẩu dưới dạng băm (hashed) với thuật toán bảo mật cao.</li>
            <li>Kiểm soát quyền truy cập nội bộ theo nguyên tắc tối thiểu (least privilege).</li>
            <li>Giám sát hệ thống liên tục và kiểm tra bảo mật định kỳ.</li>
            <li>Sao lưu dữ liệu thường xuyên và có kế hoạch khắc phục sự cố.</li>
          </ul>
          <p className="mt-3">
            Mặc dù chúng tôi nỗ lực tối đa để bảo vệ dữ liệu, không có hệ thống nào đảm bảo
            an toàn tuyệt đối 100%. Chúng tôi khuyến khích bạn sử dụng mật khẩu mạnh và bảo
            vệ thông tin đăng nhập của mình.
          </p>
        </section>

        {/* 4. Cookie và công nghệ theo dõi */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            4. Cookie và Công nghệ Theo dõi
          </h2>
          <p className="mb-3">WellKOC sử dụng cookie và các công nghệ tương tự để:</p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Cookie thiết yếu:</strong> Duy trì phiên đăng
              nhập và hoạt động cơ bản của nền tảng.
            </li>
            <li>
              <strong className="text-foreground">Cookie phân tích:</strong> Thu thập dữ liệu
              về cách bạn sử dụng nền tảng để cải thiện dịch vụ.
            </li>
            <li>
              <strong className="text-foreground">Cookie tiếp thị:</strong> Theo dõi liên kết
              affiliate của KOC để tính hoa hồng chính xác.
            </li>
          </ul>
          <p className="mt-3">
            Bạn có thể quản lý cài đặt cookie thông qua trình duyệt. Tuy nhiên, việc tắt một
            số cookie có thể ảnh hưởng đến trải nghiệm sử dụng nền tảng.
          </p>
        </section>

        {/* 5. Quyền của người dùng */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            5. Quyền của Người dùng
          </h2>
          <p className="mb-3">Bạn có các quyền sau đối với dữ liệu cá nhân của mình:</p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Quyền truy cập:</strong> Yêu cầu xem thông
              tin cá nhân mà chúng tôi lưu trữ về bạn.
            </li>
            <li>
              <strong className="text-foreground">Quyền chỉnh sửa:</strong> Yêu cầu cập nhật
              hoặc sửa đổi thông tin không chính xác.
            </li>
            <li>
              <strong className="text-foreground">Quyền xóa:</strong> Yêu cầu xóa tài khoản và
              dữ liệu cá nhân, trừ những thông tin chúng tôi có nghĩa vụ pháp lý phải lưu giữ.
            </li>
            <li>
              <strong className="text-foreground">Quyền hạn chế xử lý:</strong> Yêu cầu giới
              hạn cách chúng tôi sử dụng dữ liệu của bạn.
            </li>
            <li>
              <strong className="text-foreground">Quyền phản đối:</strong> Từ chối việc sử dụng
              dữ liệu cho mục đích tiếp thị trực tiếp.
            </li>
            <li>
              <strong className="text-foreground">Quyền di chuyển dữ liệu:</strong> Nhận bản
              sao dữ liệu cá nhân ở định dạng có cấu trúc, phổ biến.
            </li>
          </ul>
          <p className="mt-3">
            Để thực hiện các quyền trên, vui lòng liên hệ chúng tôi qua thông tin ở cuối trang.
          </p>
        </section>

        {/* 6. Dữ liệu Blockchain & Web3 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            6. Dữ liệu Blockchain &amp; Web3
          </h2>
          <p className="mb-3">
            WellKOC tích hợp công nghệ Web3. Khi sử dụng các tính năng blockchain, bạn cần lưu
            ý:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Địa chỉ ví công khai:</strong> Khi bạn kết
              nối ví (ví dụ: MetaMask, WalletConnect), địa chỉ ví công khai của bạn sẽ được
              liên kết với tài khoản WellKOC.
            </li>
            <li>
              <strong className="text-foreground">Giao dịch on-chain:</strong> Các giao dịch
              trên blockchain là công khai và không thể thay đổi (immutable). Chúng tôi không
              kiểm soát hoặc xóa được dữ liệu đã ghi trên blockchain.
            </li>
            <li>
              <strong className="text-foreground">Smart Contract:</strong> Khi tương tác với
              smart contract, dữ liệu giao dịch sẽ được ghi lại vĩnh viễn trên blockchain
              tương ứng.
            </li>
            <li>
              <strong className="text-foreground">Trách nhiệm người dùng:</strong> Bạn chịu
              trách nhiệm bảo quản khóa riêng (private key) và cụm từ khôi phục (seed phrase).
              WellKOC không bao giờ yêu cầu bạn cung cấp khóa riêng.
            </li>
          </ul>
        </section>

        {/* 7. Chia sẻ thông tin với bên thứ ba */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            7. Chia sẻ Thông tin với Bên thứ ba
          </h2>
          <p className="mb-3">
            Chúng tôi có thể chia sẻ thông tin của bạn với:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Đối tác vận chuyển:</strong> Để thực hiện
              giao hàng đơn hàng của bạn.
            </li>
            <li>
              <strong className="text-foreground">Cổng thanh toán:</strong> Để xử lý giao dịch
              thanh toán an toàn.
            </li>
            <li>
              <strong className="text-foreground">Nhà cung cấp dịch vụ:</strong> Các bên hỗ trợ
              vận hành nền tảng (lưu trữ đám mây, phân tích dữ liệu).
            </li>
            <li>
              <strong className="text-foreground">Cơ quan chức năng:</strong> Khi được yêu cầu
              theo quy định pháp luật.
            </li>
          </ul>
          <p className="mt-3">
            Chúng tôi không bán thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào.
          </p>
        </section>

        {/* 8. Lưu trữ dữ liệu */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            8. Lưu trữ Dữ liệu
          </h2>
          <p>
            Chúng tôi lưu trữ thông tin cá nhân của bạn trong thời gian cần thiết để cung cấp
            dịch vụ hoặc theo yêu cầu pháp luật. Khi bạn yêu cầu xóa tài khoản, chúng tôi sẽ
            xóa hoặc ẩn danh hóa dữ liệu trong vòng 30 ngày, trừ những thông tin phải lưu giữ
            theo quy định (ví dụ: hồ sơ giao dịch tài chính). Dữ liệu on-chain không thể xóa
            do tính chất của blockchain.
          </p>
        </section>

        {/* 9. Thay đổi chính sách */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            9. Thay đổi Chính sách
          </h2>
          <p>
            Chúng tôi có thể cập nhật Chính sách Bảo mật này theo thời gian. Mọi thay đổi quan
            trọng sẽ được thông báo qua email hoặc thông báo trên nền tảng. Việc bạn tiếp tục
            sử dụng WellKOC sau khi chính sách được cập nhật đồng nghĩa với việc bạn chấp nhận
            các thay đổi đó.
          </p>
        </section>

        {/* 10. Liên hệ */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            10. Liên hệ
          </h2>
          <p className="mb-3">
            Nếu bạn có bất kỳ câu hỏi nào về Chính sách Bảo mật này, vui lòng liên hệ:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Nền tảng:</strong> WellKOC
            </li>
            <li>
              <strong className="text-foreground">Website:</strong>{' '}
              <a
                href="https://wellkoc.com"
                className="text-primary underline hover:text-primary/80"
              >
                wellkoc.com
              </a>
            </li>
            <li>
              <strong className="text-foreground">Email:</strong>{' '}
              <a
                href="mailto:support@wellkoc.com"
                className="text-primary underline hover:text-primary/80"
              >
                support@wellkoc.com
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

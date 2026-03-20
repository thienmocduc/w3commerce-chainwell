import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Điều khoản Dịch vụ | WellKOC',
  description: 'Điều khoản dịch vụ của nền tảng WellKOC - wellkoc.com',
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Điều khoản Dịch vụ</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Cập nhật lần cuối: 20 tháng 3, 2026
      </p>

      <div className="space-y-10 text-muted-foreground leading-relaxed">
        {/* Giới thiệu */}
        <section>
          <p>
            Chào mừng bạn đến với WellKOC (&quot;wellkoc.com&quot;, &quot;Nền tảng&quot;,
            &quot;chúng tôi&quot;). Bằng việc truy cập và sử dụng nền tảng, bạn đồng ý tuân
            thủ các Điều khoản Dịch vụ dưới đây. Nếu bạn không đồng ý với bất kỳ điều khoản
            nào, vui lòng ngừng sử dụng nền tảng.
          </p>
        </section>

        {/* 1. Điều kiện sử dụng */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            1. Điều kiện Sử dụng
          </h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Bạn phải từ đủ 18 tuổi hoặc có sự đồng ý của người giám hộ hợp pháp để sử dụng
              WellKOC.
            </li>
            <li>
              Bạn đồng ý cung cấp thông tin chính xác, đầy đủ và cập nhật khi đăng ký và sử
              dụng nền tảng.
            </li>
            <li>
              Bạn không được sử dụng nền tảng cho bất kỳ mục đích bất hợp pháp hoặc vi phạm
              pháp luật Việt Nam và quốc tế.
            </li>
            <li>
              Chúng tôi có quyền từ chối cung cấp dịch vụ, đình chỉ hoặc chấm dứt tài khoản
              nếu phát hiện vi phạm điều khoản.
            </li>
          </ul>
        </section>

        {/* 2. Tài khoản người dùng */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            2. Tài khoản Người dùng
          </h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Bạn chịu trách nhiệm bảo mật thông tin đăng nhập (tên tài khoản, mật khẩu) và
              mọi hoạt động diễn ra dưới tài khoản của mình.
            </li>
            <li>
              Mỗi cá nhân chỉ được phép sở hữu một tài khoản trên WellKOC, trừ khi được sự
              chấp thuận bằng văn bản.
            </li>
            <li>
              Bạn phải thông báo ngay cho chúng tôi nếu phát hiện bất kỳ truy cập trái phép
              nào vào tài khoản.
            </li>
            <li>
              Chúng tôi có quyền đình chỉ hoặc xóa tài khoản vi phạm điều khoản mà không cần
              thông báo trước.
            </li>
          </ul>
        </section>

        {/* 3. Vai trò trên nền tảng */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            3. Vai trò trên Nền tảng
          </h2>
          <p className="mb-3">
            WellKOC hoạt động với ba vai trò chính:
          </p>

          <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">
            3.1. Người mua (Buyer)
          </h3>
          <ul className="ml-6 list-disc space-y-2">
            <li>Có quyền duyệt, tìm kiếm và mua sản phẩm trên nền tảng.</li>
            <li>Phải cung cấp thông tin giao hàng chính xác khi đặt hàng.</li>
            <li>
              Có trách nhiệm kiểm tra sản phẩm khi nhận hàng và phản hồi trong thời gian quy
              định.
            </li>
          </ul>

          <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">
            3.2. Nhà bán hàng (Vendor)
          </h3>
          <ul className="ml-6 list-disc space-y-2">
            <li>Có trách nhiệm đảm bảo chất lượng sản phẩm và mô tả chính xác.</li>
            <li>Phải tuân thủ quy định về giá cả, thuế và giao hàng.</li>
            <li>
              Chịu trách nhiệm về tính hợp pháp của sản phẩm đăng bán và mọi khiếu nại liên
              quan.
            </li>
            <li>Phải xử lý đơn hàng và giao hàng trong thời gian cam kết.</li>
          </ul>

          <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">
            3.3. KOC (Key Opinion Consumer)
          </h3>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              KOC là người dùng tham gia chương trình affiliate, giới thiệu sản phẩm và nhận
              hoa hồng.
            </li>
            <li>
              KOC phải cung cấp đánh giá trung thực, khách quan và tuân thủ quy tắc đạo đức
              của nền tảng.
            </li>
            <li>
              Nghiêm cấm KOC sử dụng thông tin sai lệch, spam hoặc các hình thức gian lận để
              tăng hoa hồng.
            </li>
            <li>
              WellKOC có quyền thu hồi hoa hồng và đình chỉ tài khoản KOC vi phạm.
            </li>
          </ul>
        </section>

        {/* 4. Thanh toán & Hoàn tiền */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            4. Thanh toán &amp; Hoàn tiền
          </h2>

          <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">4.1. Thanh toán</h3>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              WellKOC hỗ trợ nhiều phương thức thanh toán bao gồm chuyển khoản ngân hàng, ví
              điện tử và thanh toán qua tiền mã hóa (cryptocurrency).
            </li>
            <li>
              Giá sản phẩm được hiển thị bằng VND. Đối với giao dịch crypto, tỷ giá quy đổi sẽ
              được áp dụng tại thời điểm giao dịch.
            </li>
            <li>
              Mọi giao dịch thanh toán phải được thực hiện thông qua các kênh chính thức trên
              nền tảng.
            </li>
          </ul>

          <h3 className="mb-2 mt-4 text-lg font-medium text-foreground">4.2. Hoàn tiền</h3>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Yêu cầu hoàn tiền phải được gửi trong vòng 7 ngày kể từ ngày nhận hàng.
            </li>
            <li>
              Sản phẩm hoàn trả phải còn nguyên trạng, chưa sử dụng và đầy đủ bao bì.
            </li>
            <li>
              Thời gian xử lý hoàn tiền từ 5-15 ngày làm việc tùy theo phương thức thanh toán.
            </li>
            <li>
              Đối với giao dịch crypto đã hoàn tất trên blockchain, việc hoàn tiền sẽ được xử
              lý theo chính sách riêng và có thể chịu phí gas.
            </li>
          </ul>
        </section>

        {/* 5. Hoa hồng KOC */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            5. Hoa hồng KOC
          </h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Hoa hồng được tính dựa trên doanh thu thực tế từ các đơn hàng hoàn thành thông
              qua liên kết affiliate của KOC.
            </li>
            <li>
              Tỷ lệ hoa hồng được quy định riêng cho từng danh mục sản phẩm và có thể thay
              đổi theo chương trình khuyến mãi.
            </li>
            <li>
              Hoa hồng sẽ được thanh toán sau khi đơn hàng hoàn tất và hết thời gian hoàn trả
              (thường là 7-14 ngày).
            </li>
            <li>
              KOC có thể rút hoa hồng khi đạt mức tối thiểu quy định, qua chuyển khoản ngân
              hàng hoặc ví crypto.
            </li>
            <li>
              Hoa hồng từ đơn hàng bị hoàn trả hoặc hủy sẽ bị trừ lại trong kỳ thanh toán
              tiếp theo.
            </li>
            <li>
              WellKOC có quyền điều chỉnh tỷ lệ hoa hồng với thông báo trước ít nhất 7 ngày.
            </li>
          </ul>
        </section>

        {/* 6. Sở hữu trí tuệ */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            6. Sở hữu Trí tuệ
          </h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Toàn bộ nội dung trên WellKOC bao gồm logo, thiết kế, mã nguồn, văn bản và hình
              ảnh là tài sản trí tuệ của WellKOC hoặc các bên cấp phép.
            </li>
            <li>
              Vendor giữ quyền sở hữu trí tuệ đối với sản phẩm và nội dung do họ đăng tải,
              đồng thời cấp cho WellKOC quyền sử dụng để hiển thị và quảng bá trên nền tảng.
            </li>
            <li>
              Nội dung đánh giá, hình ảnh và video do KOC tạo ra thuộc quyền sở hữu của KOC,
              nhưng WellKOC được cấp quyền sử dụng không độc quyền trên nền tảng.
            </li>
            <li>
              Nghiêm cấm sao chép, phân phối hoặc sử dụng nội dung trên WellKOC mà không có sự
              đồng ý bằng văn bản.
            </li>
          </ul>
        </section>

        {/* 7. Web3 & Smart Contract */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            7. Web3 &amp; Smart Contract
          </h2>
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
            <p className="mb-3 font-medium text-foreground">
              Tuyên bố miễn trừ trách nhiệm (Disclaimer)
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                WellKOC có thể tích hợp các tính năng Web3 bao gồm kết nối ví, thanh toán bằng
                tiền mã hóa và tương tác với smart contract.
              </li>
              <li>
                Các giao dịch trên blockchain là không thể đảo ngược (irreversible). Bạn hoàn
                toàn chịu trách nhiệm về các giao dịch on-chain mà bạn thực hiện.
              </li>
              <li>
                Smart contract hoạt động theo mã lập trình được triển khai trên blockchain.
                WellKOC không đảm bảo rằng smart contract không có lỗi hoặc lỗ hổng bảo mật.
              </li>
              <li>
                WellKOC không chịu trách nhiệm về bất kỳ tổn thất nào phát sinh từ biến động
                giá tiền mã hóa, lỗi smart contract, hoặc sự cố mạng blockchain.
              </li>
              <li>
                Phí gas (gas fees) cho các giao dịch blockchain do người dùng chi trả và không
                được hoàn lại.
              </li>
              <li>
                Bạn có trách nhiệm bảo quản khóa riêng (private key) và cụm từ khôi phục (seed
                phrase). WellKOC không thể khôi phục quyền truy cập ví nếu bạn mất khóa riêng.
              </li>
            </ul>
          </div>
        </section>

        {/* 8. Sản phẩm cấm */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            8. Sản phẩm và Hành vi Bị cấm
          </h2>
          <p className="mb-3">
            Các sản phẩm và hành vi sau đây bị nghiêm cấm trên WellKOC:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Sản phẩm giả, nhái, vi phạm quyền sở hữu trí tuệ.</li>
            <li>Chất cấm, vũ khí, và các hàng hóa bị pháp luật cấm.</li>
            <li>Thông tin sai lệch, lừa đảo hoặc gây nhầm lẫn cho người mua.</li>
            <li>
              Thao túng hệ thống đánh giá, tạo đơn hàng giả để nhận hoa hồng KOC.
            </li>
            <li>Tấn công, phá hoại hoặc can thiệp vào hệ thống kỹ thuật của nền tảng.</li>
          </ul>
        </section>

        {/* 9. Giới hạn trách nhiệm */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            9. Giới hạn Trách nhiệm
          </h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              WellKOC cung cấp nền tảng kết nối Buyer, Vendor và KOC. Chúng tôi không phải là
              bên bán hàng trực tiếp và không chịu trách nhiệm về chất lượng sản phẩm do
              Vendor cung cấp.
            </li>
            <li>
              Dịch vụ được cung cấp trên cơ sở &quot;nguyên trạng&quot; (as is). Chúng tôi
              không đảm bảo nền tảng hoạt động liên tục, không có lỗi hoặc hoàn toàn an toàn.
            </li>
            <li>
              Trong mọi trường hợp, tổng trách nhiệm bồi thường của WellKOC không vượt quá số
              tiền bạn đã thanh toán cho giao dịch liên quan trong 12 tháng gần nhất.
            </li>
            <li>
              WellKOC không chịu trách nhiệm về các thiệt hại gián tiếp, ngẫu nhiên, đặc biệt
              hoặc mang tính trừng phạt.
            </li>
            <li>
              Đối với các giao dịch crypto và tương tác smart contract, rủi ro hoàn toàn thuộc
              về người dùng theo quy định tại Mục 7.
            </li>
          </ul>
        </section>

        {/* 10. Luật áp dụng */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            10. Luật Áp dụng và Giải quyết Tranh chấp
          </h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Điều khoản Dịch vụ này được điều chỉnh theo pháp luật nước Cộng hòa Xã hội Chủ
              nghĩa Việt Nam.
            </li>
            <li>
              Mọi tranh chấp phát sinh sẽ được giải quyết trước tiên thông qua thương lượng
              thiện chí giữa các bên.
            </li>
            <li>
              Nếu không đạt được thỏa thuận, tranh chấp sẽ được giải quyết tại tòa án có thẩm
              quyền tại Việt Nam.
            </li>
          </ul>
        </section>

        {/* 11. Thay đổi điều khoản */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            11. Thay đổi Điều khoản
          </h2>
          <p>
            WellKOC có quyền sửa đổi Điều khoản Dịch vụ bất kỳ lúc nào. Các thay đổi quan
            trọng sẽ được thông báo trước ít nhất 7 ngày qua email hoặc thông báo trên nền
            tảng. Việc bạn tiếp tục sử dụng WellKOC sau khi điều khoản được cập nhật đồng
            nghĩa với việc bạn chấp nhận các thay đổi.
          </p>
        </section>

        {/* 12. Liên hệ */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            12. Liên hệ
          </h2>
          <p className="mb-3">
            Nếu bạn có bất kỳ câu hỏi nào về Điều khoản Dịch vụ này, vui lòng liên hệ:
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

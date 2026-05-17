# Product Proposal & Adoption Management System
## System Specification (Draft)

**Version:** 0.1  
**Language:** Vietnamese  
**Purpose:** Mô tả đặc tả hệ thống web quản lý đề xuất sản phẩm, tạo proposal, quản lý採用 (adoption), xuất dữ liệu website, và quản lý đặt hàng với supplier.

---

## 1. Tổng quan

Hệ thống này được xây dựng cho một **công ty thương mại / công ty trung gian** để quản lý toàn bộ vòng đời sản phẩm từ lúc supplier đề xuất hàng hóa đến lúc sản phẩm được khách hàng doanh nghiệp chấp nhận, xuất bản lên website và phát sinh yêu cầu đặt hàng.

Hiện trạng nghiệp vụ đang được quản lý bằng email và Excel, dẫn đến dữ liệu phân tán, khó tái sử dụng, khó kiểm soát lịch sử thay đổi và tốn thời gian tạo proposal / báo giá / dữ liệu web.

Hệ thống sẽ là một **web application** có cổng đăng nhập cho supplier và khu vực nội bộ cho nhân viên công ty.

---

## 2. Mục tiêu hệ thống

1. Tập trung hóa dữ liệu sản phẩm do supplier gửi lên.
2. Cho phép nhân viên nội bộ chọn sản phẩm để tạo proposal cho khách hàng.
3. Quản lý trạng thái sản phẩm được khách hàng chấp nhận (採用).
4. Xuất dữ liệu phục vụ website bán hàng / website listing.
5. Quản lý yêu cầu đặt hàng và lịch sử đặt hàng cho supplier.
6. Kiểm soát các thay đổi nhạy cảm bằng quy trình phê duyệt.
7. Giảm phụ thuộc vào email, Excel và thao tác thủ công.

---

## 3. Phạm vi nghiệp vụ

### 3.1 In scope
- Supplier đăng ký và cập nhật thông tin sản phẩm.
- Upload hình ảnh, proposal materials, JAN code.
- Nhân viên công ty tìm kiếm, chọn và tổng hợp sản phẩm thành proposal.
- Xuất proposal ra PowerPoint.
- Tính toán P/L theo từng dự án /案件.
- Quản lý sản phẩm được採用.
- Xuất dữ liệu web listing và internal master ra CSV / Excel.
- Gửi yêu cầu đặt hàng cho supplier.
- Phê duyệt thay đổi giá vốn hoặc hủy đề xuất.
- Lưu lịch sử thay đổi và lịch sử thao tác.

### 3.2 Out of scope
- Quản lý tồn kho chi tiết (nhập kho / xuất kho / kiểm kê) là **không thuộc phạm vi**.
- Thanh toán công nợ / kế toán tài chính không nằm trong phạm vi tài liệu này.
- Quản lý bán lẻ end-to-end cho khách cuối không phải mục tiêu chính.

---

## 4. Đối tượng sử dụng và vai trò

### 4.1 Supplier
Supplier là đơn vị cung cấp sản phẩm và có quyền đăng nhập vào hệ thống để:
- tạo mới sản phẩm,
- cập nhật thông tin sản phẩm,
- upload hình ảnh,
- upload proposal materials,
- xem trạng thái採用,
- xem yêu cầu đặt hàng liên quan đến sản phẩm của mình,
- gửi yêu cầu sửa đổi một số thông tin nhạy cảm.

### 4.2 Nhân viên sản phẩm / Product Staff
Là người của công ty vận hành hệ thống, chịu trách nhiệm:
- duyệt và quản lý dữ liệu sản phẩm,
- tạo proposal,
- quản lý採用,
- xuất master data,
- hỗ trợ xử lý yêu cầu từ supplier.

### 4.3 Sales
Là người của công ty vận hành hệ thống, chịu trách nhiệm:
- tạo và chỉnh sửa proposal cho khách hàng,
- phối hợp với product staff để chọn sản phẩm phù hợp,
- dùng dữ liệu hệ thống cho hoạt động kinh doanh.

### 4.4 Admin
Chịu trách nhiệm:
- quản lý người dùng,
- phân quyền,
- cấu hình master data,
- xử lý phê duyệt,
- giám sát audit log.

### 4.5 Khách hàng doanh nghiệp
Không phải người dùng trực tiếp của hệ thống theo mô tả hiện tại. Họ là đối tượng nhận proposal và đưa ra quyết định採用 qua quy trình kinh doanh bên ngoài.

---

## 5. Khái niệm nghiệp vụ chính

### 5.1 Supplier Proposal
Bản đề xuất sản phẩm do supplier đăng lên hệ thống, chứa mô tả sản phẩm, hình ảnh, phân loại, giá tham khảo, lead time và các thông tin liên quan.

### 5.2 Adoption / 採用
Trạng thái cho biết sản phẩm đã được khách hàng chấp nhận trong một案件 cụ thể.

### 5.3 Company Product Code
Mã sản phẩm nội bộ do công ty vận hành hệ thống tự gán sau khi sản phẩm được採用.

### 5.4 Project / 案件
Một cơ hội kinh doanh hoặc một đơn hàng / proposal cụ thể. Một sản phẩm có thể được採用 trong một hoặc nhiều案件.

### 5.5 Product Type
- **Direct shipment (直送):** supplier giao trực tiếp đến end user hoặc địa điểm指定.
- **Warehouse delivery (倉庫納品):** supplier giao vào kho do công ty chỉ định.

---

## 6. Quy trình nghiệp vụ tổng thể

### 6.1 Tiếp nhận sản phẩm từ supplier
1. Supplier đăng nhập.
2. Supplier tạo mới sản phẩm.
3. Supplier nhập thông tin sản phẩm và upload tài liệu.
4. Hệ thống lưu sản phẩm ở trạng thái draft hoặc submitted.
5. Nhân viên công ty kiểm tra và sử dụng dữ liệu này cho proposal.

### 6.2 Tạo proposal cho khách hàng
1. Nhân viên nội bộ tìm kiếm sản phẩm.
2. Chọn một hoặc nhiều sản phẩm phù hợp.
3. Nhập comment / notes cho proposal.
4. Hệ thống tạo file PowerPoint chứa nội dung proposal.
5. Sau khi xuất file, sales có thể bổ sung giá bán / price thủ công nếu cần.

### 6.3 Tính P/L theo案件
1. Chọn案件.
2. Lấy dữ liệu nguyên giá từ sản phẩm.
3. Nhập giá bán, số lượng, chi phí vận chuyển, chi phí gia công, các phí khác.
4. Hệ thống tính doanh thu, gross profit, gross margin.
5. Xuất file Excel phục vụ phân tích lợi nhuận.

### 6.4 Quản lý採用
1. Khi khách hàng chấp nhận sản phẩm, nhân viên nội bộ đánh dấu採用.
2. Gán案件, client name, adoption date.
3. Tạo hoặc nhập company product code.
4. Gửi thông báo採用 cho supplier qua email.

### 6.5 Xuất dữ liệu web / internal master
1. Chọn các sản phẩm đã採用.
2. Hệ thống xuất CSV / Excel theo định dạng web listing hoặc internal master.
3. Hệ thống hỗ trợ export hình ảnh hàng loạt và tổ chức file.

### 6.6 Tạo yêu cầu đặt hàng
1. Chọn sản phẩm採用 cần đặt.
2. Nhập số lượng, ngày mong muốn, điểm giao hàng, loại đơn.
3. Hệ thống tạo purchase request.
4. Supplier nhận và xem yêu cầu.
5. Trạng thái đơn hàng được theo dõi trong hệ thống.

### 6.7 Thay đổi thông tin sản phẩm
1. Supplier gửi yêu cầu thay đổi.
2. Nếu là thay đổi bình thường, cập nhật theo quyền cho phép.
3. Nếu là thay đổi nhạy cảm như hủy đề xuất hoặc đổi giá vốn, hệ thống chuyển trạng thái chờ duyệt.
4. Admin / internal approver phê duyệt hoặc từ chối.
5. Hệ thống lưu lịch sử thay đổi.

---

## 7. Chức năng chi tiết

## 7.1 Quản lý tài khoản và phân quyền

### Chức năng
- Đăng nhập / đăng xuất.
- Quản lý user nội bộ.
- Quản lý user supplier.
- Phân quyền theo vai trò.
- Giới hạn dữ liệu theo supplier.

### Quy tắc
- Supplier chỉ xem / sửa dữ liệu của chính supplier đó.
- Internal users có thể xem toàn bộ dữ liệu theo quyền.
- Các thao tác nhạy cảm phải ghi log.

---

## 7.2 Quản lý sản phẩm do supplier đăng

### 7.2.1 Thông tin sản phẩm cần quản lý
- Product name
- Product description
- Product image(s)
- Product category
- JAN code
- Product type (Direct shipment / Warehouse delivery)
- Cost price / supplier cost
- Reference retail price
- Minimum lot
- Lead time
- Supplier information
- Proposal document / attachments
- Remarks

### 7.2.2 Hành vi
- Create product
- Edit product
- Upload / delete image
- Upload / replace attachment
- View product list
- Search / filter products
- Duplicate product (nếu cần)

### 7.2.3 Quy tắc dữ liệu
- Mỗi product phải thuộc một supplier.
- Một product có thể có nhiều ảnh.
- Một product có thể có nhiều proposal documents.
- Một số field có thể chỉnh sửa bởi supplier, một số field chỉ internal chỉnh sửa.

---

## 7.3 Quản lý sản phẩm採用

### 7.3.1 Thông tin cần lưu
- Company product code
- Client name
- Project /案件 name
- Adopted product
- Adoption date
- Supplier
- Adoption status
- Notes

### 7.3.2 Chức năng
- Ghi nhận sản phẩm đã được採用.
- Nhập mã nội bộ thủ công.
- Import mã nội bộ bằng CSV.
- Tìm kiếm theo client /案件 / product code / supplier.
- Lưu lịch sử採用.

### 7.3.3 Quy tắc
- Một product có thể được採用 trong nhiều案件 khác nhau nếu nghiệp vụ cho phép.
- Company product code là mã nội bộ, không phải mã supplier.
- Sau khi採用, hệ thống có thể đẩy dữ liệu sang module web export.

---

## 7.4 Tạo proposal cho khách hàng

### 7.4.1 Mục đích
Tạo tài liệu proposal để sales gửi cho khách hàng doanh nghiệp.

### 7.4.2 Nội dung proposal
- Product image
- Product name
- Product description
- Comment / notes
- Tùy chọn sắp xếp theo thứ tự

### 7.4.3 Output
- PowerPoint format (.pptx)

### 7.4.4 Quy tắc
- Giá bán không bắt buộc nằm trong file xuất, vì có thể được bổ sung sau.
- Supplier cost không hiển thị trong proposal.
- Proposal là tài liệu nội bộ / tài liệu gửi khách theo nghiệp vụ công ty, không cho supplier xem.

---

## 7.5 Tính P/L theo案件

### 7.5.1 Dữ liệu đầu vào
- Product cost
- Sales price
- Quantity
- Shipping fee
- Processing fee
- Other costs

### 7.5.2 Dữ liệu đầu ra
- Revenue
- Gross profit
- Gross margin
- Chi tiết theo từng dòng sản phẩm
- Tổng hợp theo案件

### 7.5.3 Output
- Excel format (.xlsx)

### 7.5.4 Công thức tham khảo
- Revenue = Sales price × Quantity
- Gross profit = Revenue - Product cost - Shipping fee - Processing fee - Other costs
- Gross margin = Gross profit / Revenue

> Lưu ý: công thức cuối cùng có thể được điều chỉnh theo quyết định nghiệp vụ trong giai đoạn yêu cầu chi tiết.

---

## 7.6 Xuất dữ liệu web / internal master

### 7.6.1 Web listing export
Thông tin xuất ra:
- Product master data
- Image data
- Company product code
- JAN code
- Product description
- Listing price
- Category information
- Product type

### 7.6.2 Internal master export
Thông tin xuất ra:
- Company product code
- Product name
- Product description
- JAN code
- Product category
- Product type
- Supplier name
- Cost price
- Reference retail price
- Minimum lot
- Lead time
- Adopted案件 info
- Adoption date
- Whether allowed to publish
- Whether allowed to order

### 7.6.3 Output format
- CSV
- Excel
- Image batch download

### 7.6.4 Quy tắc
- Có thể cần chuẩn hóa file name của image khi export.
- Các field xuất cho web và field xuất cho nội bộ có thể khác nhau.
- Một số sản phẩm có thể chưa được phép public hoặc chưa được phép order.

---

## 7.7 Quản lý yêu cầu đặt hàng

### 7.7.1 Thông tin cần quản lý
- New order / additional order
- Order quantity
- Desired delivery date
- Delivery warehouse / destination
- Order history
- Order status

### 7.7.2 Chức năng
- Tạo purchase request.
- Theo dõi trạng thái yêu cầu.
- Xem lịch sử theo product /案件 / supplier.
- Cập nhật trạng thái xử lý.

### 7.7.3 Quy tắc
- Hệ thống không quản lý tồn kho chi tiết.
- Đơn hàng phải gắn với product đã採用.
- Với direct shipment, địa chỉ giao có thể là end user hoặc指定先.
- Với warehouse delivery, địa chỉ giao là kho do công ty chỉ định.

---

## 7.8 Quy trình phê duyệt và lịch sử thay đổi

### 7.8.1 Các thay đổi cần duyệt
- Cancel proposal / proposal withdrawal
- Change cost price

### 7.8.2 Chức năng
- Supplier gửi request thay đổi.
- Internal approver duyệt / từ chối.
- Ghi lại người duyệt, thời gian duyệt và nội dung thay đổi.
- Lưu audit trail đầy đủ.

### 7.8.3 Quy tắc
- Không cho phép update trực tiếp các trường nhạy cảm nếu chưa duyệt.
- Mọi phiên bản thay đổi phải có lịch sử.

---

## 8. Màn hình dự kiến

### 8.1 Supplier portal
- Login
- Product list
- Product create / edit
- Product detail
- Image / attachment upload
- Adoption status
- Order request list
- Change request form
- Change request history

### 8.2 Internal portal
- Dashboard
- Product search / list
- Product detail
- Proposal builder
- Proposal export screen
- P/L calculator screen
- Adoption management screen
- Web export screen
- Internal master export screen
- Order request management screen
- Approval queue
- User / role management
- Audit log screen

---

## 9. Trạng thái nghiệp vụ đề xuất

## 9.1 Trạng thái sản phẩm
- Draft
- Submitted
- Under review
- Active
- Adopted
- Inactive
- Cancel requested
- Cancelled

## 9.2 Trạng thái thay đổi
- Pending approval
- Approved
- Rejected
- Applied

## 9.3 Trạng thái đặt hàng
- Requested
- Confirmed
- In progress
- Completed
- Cancelled

> Lưu ý: tên trạng thái có thể được chuẩn hóa lại trong phase requirement chi tiết.

---

## 10. Dữ liệu chính (data entities)

### 10.1 Supplier
- supplier_id
- supplier_name
- contact info
- login account
- status

### 10.2 Product
- product_id
- supplier_id
- product_name
- description
- category
- JAN code
- product_type
- cost_price
- reference_price
- minimum_lot
- lead_time
- status
- remarks

### 10.3 Product Image
- image_id
- product_id
- file_path
- file_name
- sort order

### 10.4 Proposal Document
- document_id
- product_id
- file_path
- uploaded_by
- uploaded_at

### 10.5 Adoption Record
- adoption_id
- product_id
- company_product_code
- client_name
- project_name
- adoption_date
- status

### 10.6 P/L Record
- pl_id
- project_name
- product_id
- sales_price
- quantity
- revenue
- costs
- gross_profit
- gross_margin

### 10.7 Order Request
- order_request_id
- product_id
- order_type
- quantity
- requested_delivery_date
- destination
- status

### 10.8 Change Request
- change_request_id
- product_id
- change_type
- requested_by
- requested_at
- approved_by
- approved_at
- old_value
- new_value
- status

### 10.9 Audit Log
- log_id
- actor
- action
- target_type
- target_id
- before_value
- after_value
- timestamp

---

## 11. Phân quyền đề xuất

| Chức năng | Supplier | Product Staff | Sales | Admin |
|---|---:|---:|---:|---:|
| Xem sản phẩm của mình | Yes | Yes | Yes | Yes |
| Tạo / sửa sản phẩm | Yes | No / Limited | No | Yes |
| Upload ảnh / tài liệu | Yes | No / Limited | No | Yes |
| Tạo proposal | No | Yes | Yes | Yes |
| Xuất PowerPoint | No | Yes | Yes | Yes |
| Tính P/L | No | Yes | Yes | Yes |
| Ghi nhận採用 | No | Yes | Yes | Yes |
| Xuất web data | No | Yes | No / Limited | Yes |
| Tạo order request | No | Yes | No / Limited | Yes |
| Phê duyệt thay đổi | No | No | No | Yes |
| Xem audit log | No | Limited | Limited | Yes |

---

## 12. Yêu cầu phi chức năng

### 12.1 Bảo mật
- Đăng nhập bằng tài khoản riêng cho supplier và internal users.
- Phân quyền theo role và theo supplier ownership.
- Không cho supplier xem dữ liệu nội bộ như proposal cost, internal P/L.
- Ghi audit log cho thao tác quan trọng.

### 12.2 Hiệu năng
- Hỗ trợ tìm kiếm và lọc nhanh theo product name, category, supplier, status.
- Export CSV / Excel / PowerPoint cần xử lý ổn định với dữ liệu lớn.

### 12.3 Tính mở rộng
- Có thể mở rộng số lượng supplier và số lượng product lớn.
- Có thể bổ sung thêm output format hoặc rule export trong tương lai.

### 12.4 Khả dụng
- Hệ thống web truy cập bằng trình duyệt.
- Upload/download file ổn định.

### 12.5 Khả năng truy vết
- Mọi thay đổi quan trọng phải có lịch sử.
- Có thể tra lại ai thay đổi, thay đổi gì, khi nào.

---

## 13. Tích hợp và đầu ra file

### 13.1 PowerPoint
- Dùng để tạo proposal cho khách hàng.
- Có thể cần template cố định.

### 13.2 Excel
- Dùng cho P/L statement.
- Dùng cho export master data.

### 13.3 CSV
- Dùng cho import / export dữ liệu sản phẩm.

### 13.4 Hình ảnh
- Dùng cho proposal và web listing.
- Cần hỗ trợ batch download và chuẩn hóa tên file.

### 13.5 Email
- Gửi thông báo採用 cho supplier.
- Gửi thông báo phê duyệt hoặc từ chối thay đổi.

---

## 14. Các giả định hiện tại

1. Supplier có thể tự đăng nhập và quản lý dữ liệu sản phẩm của riêng mình.
2. Công ty vận hành hệ thống là bên kiểm soát proposal, adoption và ordering.
3. Proposal và P/L là tài liệu nội bộ.
4. Không quản lý tồn kho chi tiết.
5. File output là một phần quan trọng của hệ thống.
6. Các trường dữ liệu cuối cùng sẽ được tinh chỉnh trong phase requirement definition.

---

## 15. Các điểm cần chốt ở phase requirement chi tiết

1. Danh sách field chính xác cho product master.
2. Rule nào supplier được sửa và rule nào cần approve.
3. Cấu trúc案件 và cách gắn product vào案件.
4. Công thức P/L chính thức.
5. Template PowerPoint chuẩn.
6. Template Excel chuẩn.
7. Quy tắc đặt tên file ảnh khi export.
8. Trạng thái nghiệp vụ chính thức cho product / adoption / order / change request.
9. Ai là người phê duyệt từng loại thay đổi.
10. Có cần supplier xem được order history hay không.

---

## 16. Kết luận

Hệ thống này là một nền tảng web quản lý toàn bộ quy trình từ supplier submission đến internal proposal, adoption, export và ordering. Bản chất là một **supplier collaboration system + internal sales support system + order management workflow** dành cho một công ty thương mại đóng vai trò trung tâm giữa supplier và khách hàng doanh nghiệp.

---

## 17. Tài liệu tham chiếu

Nguồn nghiệp vụ được tóm tắt từ tài liệu cấu trúc yêu cầu do khách hàng cung cấp. 


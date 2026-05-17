# Product Proposal & Adoption Management System
## UAT Test Cases

**Version:** 0.1  
**Date:** 2026-05-14  
**Source spec:** `req/system_spec_product_proposal_procurement.md`  
**Language:** Vietnamese  
**Purpose:** Bộ testcase UAT dùng để nghiệm thu nghiệp vụ hệ thống quản lý đề xuất sản phẩm, proposal, 採用, export dữ liệu và order request.

---

## 1. Nguyên tắc UAT

### 1.1 Phạm vi kiểm thử

Bộ testcase này bao phủ toàn bộ nghiệp vụ trong spec ban đầu:

- Đăng nhập, đăng xuất, phân quyền.
- Supplier quản lý sản phẩm, hình ảnh, tài liệu.
- Internal user quản lý master data.
- Tạo proposal cho khách hàng.
- Tính P/L theo案件.
- Ghi nhận sản phẩm được採用.
- Export dữ liệu website / internal master.
- Tạo và theo dõi order request.
- Approval cho thay đổi giá vốn / hủy đề xuất.
- Audit log và truy vết.

### 1.2 Phase kiểm thử

| Phase | Ý nghĩa |
|---|---|
| Core MVP | Nên kiểm thử ngay với bản MVP hiện tại hoặc bản local full-stack gần nhất. |
| Full Scope | Kiểm thử khi module theo spec đầy đủ đã được implement. |
| Future | Tính năng có trong spec nhưng có thể nằm ngoài MVP, dùng để nghiệm thu phase sau. |

### 1.3 Điều kiện pass chung

- User thực hiện được đúng workflow theo quyền.
- Dữ liệu lưu vào hệ thống và vẫn tồn tại sau khi refresh / login lại.
- Các field bắt buộc được validate.
- Không role nào xem / sửa được dữ liệu ngoài quyền.
- Các thao tác nhạy cảm có audit log.
- File export / upload mở được và đúng format.
- Lỗi nghiệp vụ hiển thị rõ ràng, không mất dữ liệu đang nhập.

---

## 2. Test Data Chuẩn

### 2.1 Users

| Role | Email mẫu | Mục đích |
|---|---|---|
| Admin | `admin@example.com` | Quản trị, approve, audit, full access. |
| Product Staff | `product.staff@example.com` | Quản lý product, adoption, export, order. |
| Sales | `sales@example.com` | Tạo proposal, project, P/L. |
| Supplier A | `supplier.a@example.com` | Tạo / sửa sản phẩm của Supplier A. |
| Supplier B | `supplier.b@example.com` | Kiểm tra data isolation giữa supplier. |

### 2.2 Master Data

| Entity | Data mẫu |
|---|---|
| Supplier A | ABC Manufacturing, contact `佐藤`, email `sato@abc.example.com` |
| Supplier B | Global Trade, contact `田中`, email `tanaka@global.example.com` |
| Client 1 | Mitsui Real Estate |
| Client 2 | Mori Building |
| Category | Kitchen Goods, Gadget, Bag |

### 2.3 Products

| Product | Supplier | Type | Cost | Reference price | JAN |
|---|---|---|---:|---:|---|
| Bamboo Cutlery Set | Supplier A | Warehouse delivery | 350 | 1200 | 4901234567890 |
| Wireless Earphones V2 | Supplier B | Direct shipment | 4500 | 15800 | 4901112223334 |

### 2.4 Project / 案件

| Project | Client | Products |
|---|---|---|
| 2026 Summer Novelty Proposal | Mitsui Real Estate | Bamboo Cutlery Set, Wireless Earphones V2 |

---

## 3. UAT Test Cases

### 3.1 Auth, Role, Access Control

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-AUTH-001 | Core MVP | Đăng nhập thành công bằng user hợp lệ | Admin | Admin user tồn tại | 1. Mở login page. 2. Nhập email/password đúng. 3. Click login. | User vào dashboard. Access token/session được tạo. Core data được load. |
| UAT-AUTH-002 | Core MVP | Đăng nhập thất bại với password sai | Admin | Admin user tồn tại | 1. Mở login page. 2. Nhập email đúng/password sai. 3. Click login. | Hiển thị lỗi đăng nhập. User không vào được hệ thống. |
| UAT-AUTH-003 | Core MVP | User chưa login bị chặn vào internal pages | Anonymous | Chưa login | 1. Mở trực tiếp `/projects` hoặc `/catalog`. | Hệ thống redirect về login page. |
| UAT-AUTH-004 | Core MVP | Đăng xuất | Admin | Đã login | 1. Click logout. 2. Mở lại `/projects`. | Session bị xóa. User quay về login page. |
| UAT-AUTH-005 | Full Scope | Supplier chỉ thấy sản phẩm của mình | Supplier A | Supplier A/B đều có product | 1. Login Supplier A. 2. Mở product list. | Chỉ thấy product thuộc Supplier A, không thấy Supplier B. |
| UAT-AUTH-006 | Full Scope | Supplier không xem dữ liệu P/L nội bộ | Supplier | Có project và P/L | 1. Login Supplier. 2. Thử mở P/L/project internal endpoint/screen. | Bị chặn quyền hoặc không thấy menu/dữ liệu P/L. |
| UAT-AUTH-007 | Full Scope | Sales không được approve thay đổi nhạy cảm | Sales | Có change request pending | 1. Login Sales. 2. Mở approval queue. 3. Thử approve cost change. | Không có quyền approve hoặc thao tác bị từ chối. |
| UAT-AUTH-008 | Full Scope | Admin xem audit log | Admin | Có ít nhất một thao tác đã phát sinh | 1. Login Admin. 2. Mở audit log. | Thấy danh sách log gồm actor, action, target, timestamp. |

### 3.2 Supplier / Client Master

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-MST-001 | Core MVP | Tạo supplier mới | Admin | Đã login Admin | 1. Mở Supplier Master. 2. Click new. 3. Nhập name/contact/email/phone/address. 4. Save. | Supplier mới hiển thị trong list và vẫn tồn tại sau refresh. |
| UAT-MST-002 | Core MVP | Validate email supplier | Admin | Đã login Admin | 1. Tạo supplier với email không hợp lệ. 2. Save. | Hệ thống báo lỗi validation, không tạo supplier. |
| UAT-MST-003 | Core MVP | Sửa supplier | Admin | Có supplier tồn tại | 1. Mở supplier. 2. Sửa contact/phone. 3. Save. | Dữ liệu mới hiển thị và persist sau refresh. |
| UAT-MST-004 | Core MVP | Xóa supplier | Admin | Supplier không còn cần dùng | 1. Click delete supplier. 2. Confirm. | Supplier biến khỏi list. Dữ liệu lịch sử liên quan không bị hard break. |
| UAT-MST-005 | Core MVP | Tạo client mới | Admin/Product Staff | Đã login | 1. Mở Client Master. 2. Click new. 3. Nhập name/contact/email. 4. Save. | Client mới hiển thị trong list và dùng được khi tạo project. |
| UAT-MST-006 | Core MVP | Sửa client | Admin/Product Staff | Có client tồn tại | 1. Mở client. 2. Sửa contact/email. 3. Save. | Client được cập nhật đúng. |
| UAT-MST-007 | Core MVP | Xóa client | Admin/Product Staff | Có client tồn tại | 1. Click delete client. 2. Confirm. | Client biến khỏi list. Existing project không bị lỗi hiển thị. |

### 3.3 Product Management

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-PRD-001 | Core MVP | Tạo product với thông tin bắt buộc | Admin/Product Staff | Có supplier | 1. Mở Product Catalog. 2. Click new. 3. Nhập product name, description, category, JAN, type, cost, price, min lot, lead time, supplier. 4. Save. | Product được tạo, status Active hoặc Submitted theo rule. Product xuất hiện trong catalog. |
| UAT-PRD-002 | Core MVP | Validate product required fields | Admin/Product Staff | Đã login | 1. Tạo product thiếu name hoặc supplier. 2. Save. | Hệ thống báo lỗi, không tạo product. |
| UAT-PRD-003 | Core MVP | Product category tự tạo / upsert | Admin/Product Staff | Category mới chưa tồn tại | 1. Tạo product với category mới. 2. Save. | Product lưu category mới. Lần sau dùng cùng category không tạo trùng không cần thiết. |
| UAT-PRD-004 | Core MVP | Search product theo tên | Internal user | Có nhiều product | 1. Mở catalog. 2. Nhập keyword product name. | List chỉ còn product phù hợp. |
| UAT-PRD-005 | Core MVP | Search product theo supplier | Internal user | Có nhiều supplier | 1. Mở catalog. 2. Nhập supplier name. | Product thuộc supplier đó được hiển thị. |
| UAT-PRD-006 | Core MVP | Edit product tạo pending approval | Admin/Product Staff | Có product Active | 1. Mở product. 2. Sửa cost/list price/description. 3. Save. | Product chuyển Pending Approval. Version mới được tạo trong history. Giá chính chỉ áp dụng sau approve. |
| UAT-PRD-007 | Core MVP | Approve product change | Admin/Product Staff | Có product Pending Approval | 1. Mở Approval Queue. 2. Click approve. | Product trở lại Active. Cost/list price/description được cập nhật theo version mới. |
| UAT-PRD-008 | Core MVP | Reject product change | Admin/Product Staff | Có product Pending Approval | 1. Mở Approval Queue. 2. Click reject. | Product trở lại Active. Thay đổi pending không được áp dụng vào giá chính. |
| UAT-PRD-009 | Core MVP | Soft delete product | Admin/Product Staff | Có product test | 1. Click delete product. 2. Confirm. | Product không còn trong catalog. Project cũ liên quan không crash. |
| UAT-PRD-010 | Full Scope | Supplier tạo product draft/submitted | Supplier | Supplier đã login | 1. Supplier mở portal. 2. Tạo product. 3. Save draft/submit. | Product chỉ gắn với supplier đó. Internal user có thể xem. |
| UAT-PRD-011 | Full Scope | Supplier upload hình ảnh product | Supplier | Product tồn tại | 1. Mở product edit. 2. Upload image hợp lệ. 3. Save. | Image hiển thị trong detail/list/proposal. File lưu trong storage. |
| UAT-PRD-012 | Full Scope | Supplier upload proposal document | Supplier | Product tồn tại | 1. Upload PDF/PPTX material. 2. Save. | Attachment hiển thị trong product detail. Download được. |
| UAT-PRD-013 | Full Scope | Reject unsupported file type | Supplier | Product tồn tại | 1. Upload file không hợp lệ. | Hệ thống báo lỗi, không lưu file. |
| UAT-PRD-014 | Full Scope | Duplicate product | Supplier/Admin | Có product nguồn | 1. Click duplicate. 2. Sửa field cần thiết. 3. Save. | Product mới được tạo, không ghi đè product gốc. |

### 3.4 Proposal Creation

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-PROP-001 | Full Scope | Tạo proposal từ nhiều product | Sales/Product Staff | Có product Active | 1. Mở proposal builder. 2. Search product. 3. Chọn nhiều product. 4. Nhập comment cho từng product. 5. Save proposal. | Proposal được tạo với đúng product/comment/order. |
| UAT-PROP-002 | Full Scope | Export proposal PowerPoint | Sales/Product Staff | Có proposal đã tạo | 1. Click export PPTX. 2. Download file. | File `.pptx` tải xuống, mở được, có image/name/description/comment. |
| UAT-PROP-003 | Full Scope | Supplier cost không xuất hiện trong proposal | Sales/Product Staff | Proposal có product với cost | 1. Export PPTX. 2. Kiểm tra nội dung file. | Supplier cost không xuất hiện trong file proposal. |
| UAT-PROP-004 | Full Scope | Sắp xếp thứ tự sản phẩm trong proposal | Sales/Product Staff | Proposal có nhiều product | 1. Reorder product. 2. Export PPTX. | Thứ tự trong PPTX đúng với thứ tự đã chọn. |
| UAT-PROP-005 | Full Scope | Sales có thể bổ sung giá bán sau export | Sales | Proposal đã export | 1. Mở proposal/project. 2. Nhập manual selling price. | Giá bán được lưu ở project/P&L, không bắt buộc nằm trong PPTX. |

### 3.5 Project / 案件 and P/L

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-PROJ-001 | Core MVP | Tạo project với client và product | Sales/Product Staff/Admin | Có client và product | 1. Mở Projects. 2. New project. 3. Chọn client. 4. Chọn product. 5. Nhập selling price/quantity. 6. Save. | Project được tạo, hiển thị trong list, persist sau refresh. |
| UAT-PROJ-002 | Core MVP | Tính total revenue/profit project | Sales/Product Staff/Admin | Có project với product | 1. Nhập selling price 1,000 và quantity 10, cost 600. 2. Save. | Revenue = 10,000. Profit = 4,000 nếu không có phí khác trong MVP. |
| UAT-PROJ-003 | Core MVP | Sửa project | Sales/Product Staff/Admin | Có project | 1. Mở project detail. 2. Sửa title/status/product condition. 3. Save. | Project cập nhật đúng và persist sau refresh. |
| UAT-PROJ-004 | Core MVP | Xóa project | Admin/Product Staff | Có project test | 1. Click delete. 2. Confirm. | Project không còn trong list. |
| UAT-PL-001 | Full Scope | Tính P/L có shipping/processing/other fee | Sales/Product Staff | Có project | 1. Nhập cost, sales price, quantity, shipping fee, processing fee, other fee. | Revenue, gross profit, gross margin tính đúng theo công thức được chốt. |
| UAT-PL-002 | Full Scope | Export P/L Excel | Sales/Product Staff | Có P/L | 1. Click export Excel. 2. Mở file. | File `.xlsx` mở được, có chi tiết dòng sản phẩm và tổng hợp project. |
| UAT-PL-003 | Full Scope | Gross margin khi revenue = 0 | Sales/Product Staff | Có dòng product quantity/price bằng 0 | 1. Tính P/L. | Hệ thống không crash, hiển thị margin an toàn theo rule nghiệp vụ. |

### 3.6 Adoption / 採用

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-ADP-001 | Full Scope | Ghi nhận product được採用 trong project | Product Staff/Sales/Admin | Project có product proposed | 1. Mở project. 2. Chọn product. 3. Mark adopted. 4. Nhập adoption date/client/project. | Adoption record được tạo, product/project hiển thị trạng thái adopted. |
| UAT-ADP-002 | Full Scope | Gán company product code thủ công | Product Staff/Admin | Product đã adopted | 1. Mở adoption record. 2. Nhập company product code. 3. Save. | Code được lưu và tìm kiếm được. |
| UAT-ADP-003 | Full Scope | Import company product code bằng CSV | Product Staff/Admin | Có file CSV hợp lệ | 1. Upload CSV. 2. Confirm import. | Code được cập nhật đúng cho adoption records. Lỗi dòng invalid được báo rõ. |
| UAT-ADP-004 | Full Scope | Một product adopted ở nhiều project | Product Staff/Admin | Product Active | 1. Adopt product trong Project A. 2. Adopt cùng product trong Project B. | Hệ thống tạo 2 adoption records riêng nếu rule nghiệp vụ cho phép. |
| UAT-ADP-005 | Future | Gửi email thông báo採用 cho supplier | Product Staff/Admin | Product adopted có supplier email | 1. Mark adopted. 2. Trigger notification. | Supplier nhận email hoặc hệ thống ghi trạng thái gửi email thành công. |

### 3.7 Export Web / Internal Master

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-EXP-001 | Full Scope | Export web listing CSV | Product Staff/Admin | Có product adopted/publicable | 1. Mở Web Export. 2. Chọn product. 3. Export CSV. | CSV có đúng field web listing, encoding mở được, không có field nội bộ nhạy cảm nếu không cần. |
| UAT-EXP-002 | Full Scope | Export internal master Excel | Product Staff/Admin | Có product adopted | 1. Mở Internal Master Export. 2. Export Excel. | Excel có company code, supplier, cost, price, lead time, adoption info. |
| UAT-EXP-003 | Full Scope | Export image batch | Product Staff/Admin | Product có image | 1. Chọn product. 2. Export/download images. | File ảnh tải được, tên file theo rule chuẩn hóa. |
| UAT-EXP-004 | Full Scope | Không export product chưa được phép public | Product Staff/Admin | Có product adopted nhưng not publicable | 1. Export web listing. | Product không được xuất hoặc được đánh dấu rõ theo rule. |
| UAT-EXP-005 | Full Scope | Sales bị giới hạn export web/internal master | Sales | Sales đã login | 1. Mở export screen. | Không thấy chức năng bị cấm hoặc thao tác bị từ chối. |

### 3.8 Order Request

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-ORD-001 | Full Scope | Tạo new order request cho adopted product | Product Staff/Admin | Product đã adopted | 1. Mở adopted product/project. 2. Create order request. 3. Nhập quantity, desired date, destination, order type New. 4. Save. | Order request được tạo với status Requested. |
| UAT-ORD-002 | Full Scope | Tạo additional order request | Product Staff/Admin | Đã có order trước | 1. Create order type Additional. 2. Save. | Order được tạo và phân biệt với New order. |
| UAT-ORD-003 | Full Scope | Supplier xem order request của mình | Supplier | Có order thuộc supplier | 1. Login Supplier. 2. Mở order list. | Supplier thấy order liên quan sản phẩm của mình. |
| UAT-ORD-004 | Full Scope | Supplier không xem order của supplier khác | Supplier A | Có order của Supplier B | 1. Login Supplier A. 2. Mở order list/search. | Không thấy order của Supplier B. |
| UAT-ORD-005 | Full Scope | Cập nhật trạng thái order | Product Staff/Admin/Supplier theo quyền | Có order Requested | 1. Chuyển status Confirmed/In Progress/Completed. | Status cập nhật đúng, history được lưu. |
| UAT-ORD-006 | Full Scope | Direct shipment destination | Product Staff/Admin | Product type Direct shipment | 1. Tạo order. 2. Nhập end user/designated address. | Destination được lưu đúng, không bắt buộc warehouse. |
| UAT-ORD-007 | Full Scope | Warehouse delivery destination | Product Staff/Admin | Product type Warehouse delivery | 1. Tạo order. 2. Chọn warehouse destination. | Warehouse destination được lưu đúng. |
| UAT-ORD-008 | Full Scope | Không tạo order cho product chưa adopted | Product Staff/Admin | Product chưa adopted | 1. Thử tạo order request. | Hệ thống từ chối và báo product phải adopted trước. |

### 3.9 Approval and Change Request

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-APR-001 | Core MVP | Product edit chuyển sang pending approval | Product Staff/Admin | Product Active | 1. Sửa cost/price/description. 2. Save. | Product Pending Approval, version mới nằm trong history. |
| UAT-APR-002 | Core MVP | Approve pending product version | Admin/Product Staff | Có pending product | 1. Mở approval queue. 2. Approve. | Version pending được áp dụng, product Active. |
| UAT-APR-003 | Core MVP | Reject pending product version | Admin/Product Staff | Có pending product | 1. Mở approval queue. 2. Reject. | Product Active, thay đổi pending không áp dụng. |
| UAT-APR-004 | Full Scope | Supplier request change cost price | Supplier | Product thuộc supplier | 1. Supplier gửi request đổi cost. | Change request Pending Approval được tạo. Product cost chưa đổi. |
| UAT-APR-005 | Full Scope | Admin approve cost change | Admin | Có cost change pending | 1. Mở approval queue. 2. Approve. | Cost mới được áp dụng. Change request Approved/Applied. Audit log được ghi. |
| UAT-APR-006 | Full Scope | Admin reject cost change | Admin | Có cost change pending | 1. Reject request. 2. Nhập reason nếu có. | Cost cũ giữ nguyên. Request Rejected. |
| UAT-APR-007 | Full Scope | Supplier request cancel proposal | Supplier | Product đã submitted/proposed | 1. Gửi request cancel. | Product không bị cancel ngay, request Pending Approval. |
| UAT-APR-008 | Full Scope | Không cho update trực tiếp field nhạy cảm | Supplier | Product thuộc supplier | 1. Thử sửa cost trực tiếp bypass approval. | Hệ thống từ chối hoặc tạo approval request thay vì update trực tiếp. |

### 3.10 Audit Log and History

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-AUD-001 | Core MVP | Audit log cho login | Admin | Audit log enabled | 1. Login thành công. 2. Admin mở audit log hoặc kiểm tra DB/log. | Có log `AUTH_LOGIN` với actor và timestamp. |
| UAT-AUD-002 | Core MVP | Audit log cho create/update/delete master | Admin | Có thao tác supplier/client/product/project | 1. Tạo/sửa/xóa dữ liệu. | Có audit log cho action tương ứng. |
| UAT-AUD-003 | Full Scope | Audit log lưu before/after change nhạy cảm | Admin | Có cost change request | 1. Approve/reject request. | Log thể hiện old value, new value, approver, approved time. |
| UAT-AUD-004 | Full Scope | Product version history hiển thị đúng | Admin/Product Staff | Product có nhiều version | 1. Mở product history. | Thấy version, cost, list price, description, updated by/time. |
| UAT-AUD-005 | Full Scope | Order history hiển thị đúng | Supplier/Internal | Có order thay đổi nhiều status | 1. Mở order detail. | Thấy timeline/status history đầy đủ. |

### 3.11 Non-functional UAT

| ID | Phase | Scenario | Role | Preconditions | Steps | Expected Result |
|---|---|---|---|---|---|---|
| UAT-NFR-001 | Core MVP | Dữ liệu persist sau refresh | Any logged-in | Có dữ liệu mới tạo | 1. Tạo supplier/client/product/project. 2. Refresh browser. | Dữ liệu vẫn hiển thị từ DB. |
| UAT-NFR-002 | Core MVP | API error hiển thị dễ hiểu | Any logged-in | Tắt backend hoặc gửi payload invalid | 1. Thực hiện thao tác lỗi. | UI báo lỗi rõ, không mất toàn bộ app. |
| UAT-NFR-003 | Full Scope | Search/filter nhanh với nhiều product | Internal user | Có dữ liệu lớn | 1. Search theo name/category/supplier/status. | Response chấp nhận được, kết quả đúng. |
| UAT-NFR-004 | Full Scope | Upload/download file ổn định | Supplier/Internal | Storage sẵn sàng | 1. Upload image/material. 2. Download/open file. | File không lỗi, metadata đúng. |
| UAT-NFR-005 | Full Scope | Export dữ liệu lớn không timeout bất thường | Product Staff/Admin | Có nhiều product/adoption records | 1. Export CSV/Excel/PPTX. | Export hoàn thành, file mở được. |
| UAT-NFR-006 | Full Scope | Không lộ thông tin nhạy cảm trong proposal supplier-facing | Supplier/Internal | Có proposal/P&L | 1. Kiểm tra màn supplier và file proposal. | Supplier không thấy cost/P&L/proposal nội bộ trái quyền. |

---

## 4. UAT Smoke Test Cho Core MVP Hiện Tại

Danh sách này dùng để kiểm nhanh bản local full-stack hiện tại trước khi demo:

| ID | Steps | Expected Result |
|---|---|---|
| SMOKE-001 | Start Docker, migrate, seed, backend, frontend. | Backend `/api/health` trả `ok`, frontend mở được login page. |
| SMOKE-002 | Login bằng admin seeded. | Vào dashboard thành công. |
| SMOKE-003 | Mở Supplier Master, tạo supplier mới, refresh. | Supplier mới vẫn tồn tại. |
| SMOKE-004 | Mở Client Master, tạo client mới, refresh. | Client mới vẫn tồn tại. |
| SMOKE-005 | Mở Product Catalog, tạo product mới với supplier mới. | Product hiển thị trong catalog sau save/refresh. |
| SMOKE-006 | Edit product cost/list price/description. | Product chuyển Pending Approval. |
| SMOKE-007 | Mở Approval Queue, approve product. | Product Active, giá mới được áp dụng. |
| SMOKE-008 | Tạo project chọn client/product, nhập price/quantity. | Project lưu thành công, total revenue/profit đúng. |
| SMOKE-009 | Logout rồi login lại. | Dữ liệu vẫn được load từ DB. |

---

## 5. Ghi Chú Nghiệm Thu

- Các testcase `Core MVP` là tiêu chí nghiệm thu tối thiểu cho bản hiện tại.
- Các testcase `Full Scope` và `Future` dùng để nghiệm thu phase tiếp theo theo đúng spec ban đầu.
- Một số rule cần chốt thêm trước khi final UAT:
  - Field nào supplier được sửa trực tiếp.
  - Field nào bắt buộc approval.
  - Công thức P/L chính thức có tính shipping/processing/other fee theo dòng hay theo project.
  - Template PowerPoint/Excel chuẩn.
  - Quy tắc public/order allowed khi export web/internal master.
  - Quy tắc gửi email thật hay chỉ ghi notification log.


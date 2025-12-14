chức năng chính
- Xác thực người dùng
  + Đăng ký / Đăng nhập
  + JWT bảo vệ API
- Quản lý thời gian
  + Thêm thói quen
  + Xóa thói uen
  + Đánh dấu hoàn thành theo ngày
- Nhật ký và lich
+ Lịch theo tháng
+ Tíck hoàn thành từng ngày
+ Heatmap 30 ngày gần nhất
- Thống kê và tiến độ
+ Tổng số thói quen
+ số thói uen hoàn thành hôm nay
+ Streak hiện tại
+ Biểu đồ hoàn thành theo tuần
+ Tiến độ tháng (%)
+ Hiển thị câu nói tạo động lực trong ngày 
  Chức năng nâng cao
- Notifications ( nhắc nhở )
+ Suwrr dụng Web Notifications API
+ Tự động nhắc khi thói quen chưa hoàn thành trong ngày
- Social Sharing
+ Chia sẻ steak và thành tích qua

  Kết nối backend với frontend
  Frontend giao tiếp với backend thông qua REST API:
- /auth/login
- /auth/register
- /habits/
- /logs/
- /progress/month

Xác thực sử dụng JWT Bearer Token gửi kèm trong header:

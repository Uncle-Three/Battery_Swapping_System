# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: c-staff-swap.spec.ts >> staff checks in and follows server-driven swap steps without manual swap id
- Location: e2e\c-staff-swap.spec.ts:5:1

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "BatterySwap Chăm sóc pin xe điện" [ref=e7] [cursor=pointer]:
        - /url: /
        - img [ref=e9]
        - generic [ref=e13]:
          - strong [ref=e14]: BatterySwap
          - generic [ref=e15]: Chăm sóc pin xe điện
      - navigation [ref=e16]:
        - link "Trang chủ" [ref=e17] [cursor=pointer]:
          - /url: /
        - link "Quy trình" [ref=e18] [cursor=pointer]:
          - /url: /#workflow
        - link "Trạm dịch vụ" [ref=e19] [cursor=pointer]:
          - /url: /login
      - generic [ref=e20]:
        - button "Bật giao diện tối" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
        - link "Đăng nhập" [ref=e24] [cursor=pointer]:
          - /url: /login
        - link "Bắt đầu" [ref=e25] [cursor=pointer]:
          - /url: /register
  - generic [ref=e26]:
    - main [ref=e27]:
      - generic [ref=e29]:
        - generic [ref=e30]:
          - img [ref=e31]
          - heading "Dang nhap BatterySwap" [level=1] [ref=e35]
          - paragraph [ref=e36]: Quan ly quy trinh thay pin o to dien
        - paragraph [ref=e38]: Chua cau hinh VITE_GOOGLE_CLIENT_ID.
        - generic [ref=e41]: Hoac
        - form "Dang nhap" [ref=e43]:
          - generic [ref=e44]:
            - generic [ref=e45]: Email
            - textbox "Email" [active] [ref=e46]: member@batteryswap.local
          - generic [ref=e47]:
            - generic [ref=e48]: Mat khau
            - textbox "Mat khau" [ref=e49]
          - button "Dang nhap" [ref=e50] [cursor=pointer]
        - paragraph [ref=e51]:
          - text: Chua co tai khoan?
          - link "Dang ky" [ref=e52] [cursor=pointer]:
            - /url: /register
    - contentinfo [ref=e53]:
      - generic [ref=e54]:
        - paragraph [ref=e55]: © 2026 BatterySwap · Hệ thống quản lý thay pin xe điện
        - generic [ref=e56]:
          - link "Hỗ trợ" [ref=e57] [cursor=pointer]:
            - /url: "#support"
          - link "Quyền riêng tư" [ref=e58] [cursor=pointer]:
            - /url: "#privacy"
          - link "Trạng thái hệ thống" [ref=e59] [cursor=pointer]:
            - /url: "#status"
```
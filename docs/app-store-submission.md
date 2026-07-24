# PrayerRoom — App Store Submission Metadata

Everything below is ready to paste into App Store Connect. Enter English under
the **English (Canada)** localization and Korean under a **Korean** localization
(add it via the language dropdown, top-right of the App Store page).

---

## App name (max 30 chars)
- **English:** `PrayerRoom`
- **Korean:** `기도제목`

## Subtitle (max 30 chars)
- **English:** `Prayer & community, together`
- **Korean:** `기도와 교제를 한 곳에서`

## Category
- **Primary:** Lifestyle
- **Secondary:** Social Networking

---

## Description (max 4,000 chars)

### English
```
PrayerRoom is a simple, easy-to-use app for churches to share prayer and stay connected as a community.

Write and share your prayer requests, see what your cell group is praying for, and pray together — all in one clean, welcoming place. Getting started takes seconds: just verify your phone number and you're in.

FEATURES
• Share prayer requests with your community
• See and pray for your cell group's requests (when your church enables sharing)
• Edit or remove your own prayer requests anytime
• Manage members, cell groups, and attendance (for leaders and pastors)
• Sign in quickly and securely with Face ID or Touch ID
• Available in English and Korean

Simple onboarding, thoughtful design, and everything a church community needs to pray together — nothing it doesn't.
```

### Korean
```
기도제목은 교회 공동체가 기도를 나누고 서로 연결될 수 있도록 돕는 간단하고 쉬운 앱입니다.

나의 기도제목을 나누고, 우리 셀의 기도제목을 함께 확인하며, 함께 기도하세요. 전화번호 인증만으로 몇 초 안에 시작할 수 있습니다.

주요 기능
• 공동체와 기도제목 나누기
• 우리 셀의 기도제목 확인 및 함께 기도하기 (교회가 공유를 허용한 경우)
• 내 기도제목 언제든지 수정 및 삭제
• 성도, 셀, 출석 관리 (리더 및 목회자용)
• Face ID / Touch ID로 빠르고 안전한 로그인
• 한국어와 영어 지원

간편한 시작, 깔끔한 디자인. 교회 공동체가 함께 기도하는 데 필요한 모든 것을 담았습니다.
```

---

## Keywords (max 100 chars, comma-separated, no spaces after commas)

### English
```
prayer,church,community,cell group,faith,worship,christian,prayer request,fellowship,bible
```

### Korean
```
기도,교회,기도제목,셀,공동체,교제,신앙,예배,크리스천,성경
```

---

## Promotional text (max 170 chars, optional — can change without a new build)
- **English:** `Share prayer requests, pray for your cell group, and stay connected as a community. No passwords — just sign in with your phone.`
- **Korean:** `기도제목을 나누고, 우리 셀을 위해 기도하며, 공동체로 연결되세요. 비밀번호 없이 전화번호로 간편하게 로그인하세요.`

---

## URLs
- **Support URL:** `https://vanchurch.vercel.app` (or a support page). Support email: `support@vanchurch.app`
- **Marketing URL (optional):** `https://vanchurch.vercel.app`
- **Privacy Policy URL:** `https://vanchurch.vercel.app/privacy.html`  ← deploy `public/privacy.html` first (see note below)

## Copyright
```
2026 PrayerRoom
```

---

## App Review Information

- **Sign-in required:** Yes (phone OTP)
- **Sign-In Information fields:** put the phone number in the username field, `000000` in password, AND repeat it clearly in Notes:

### Notes (paste this)
```
This app signs in with a phone number + SMS one-time code (OTP). No password.

For review, use this test account (a fixed code is pre-configured, no real SMS is sent):
  Phone: +1 778-555-0168
  Code:  000000

This account is a regular member. To review the leader/admin experience, use:
  Phone: +1 778-555-0142
  Code:  000000

Enter the phone number on the first screen, tap "Get verification code", then enter 000000.
```

---

## Screenshots
- **Required size:** 6.9" display — **1320 × 2868** (iPhone 17 Pro Max). Apple auto-scales this down for smaller devices, so one set is enough.
- Upload 3–10 under the **6.9" Display** tab.

---

## App Privacy (Trust & Safety → App Privacy)
Answer the data-collection questionnaire as:
- **Contact Info → Phone Number:** Collected. Used for **App Functionality** (authentication). Linked to identity. Not used for tracking.
- **User Content → Other (prayer requests) + Name:** Collected. Used for **App Functionality**. Linked to identity. Not used for tracking.
- **No** advertising, **no** third-party tracking, data **not sold**.

---

## Pre-submission checklist
- [ ] Deploy `public/privacy.html` so the Privacy URL resolves (redeploy web to Vercel, or host anywhere)
- [ ] Confirm `support@vanchurch.app` forwards to your inbox (or swap the Support URL/email)
- [ ] New EAS production build uploaded (`eas build -p ios --profile production`)
- [ ] Screenshots at 1320×2868 uploaded
- [ ] Metadata above entered for both English and Korean
- [ ] App Review notes with test numbers entered
- [ ] Supabase captcha stays OFF (native has no captcha in v1)
- [ ] Submit: `eas submit -p ios --profile production`
```

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'ko' | 'en';

const strings = {
  ko: {
    // Nav
    home: '홈',
    prayerRequests: '기도제목',
    members: '멤버',
    cells: '셀',
    attendance: '출석',
    profile: '프로필',
    // Auth
    welcome: '반갑습니다',
    email: '이메일',
    password: '비밀번호',
    signIn: '로그인',
    logout: '로그아웃',
    leave: '나가기',
    leaveCommunity: '공동체 나가기',
    leaveConfirmTitle: '공동체를 나가시겠어요?',
    leaveConfirmMsg: '내 기도제목과 셀 정보에 더 이상 접근할 수 없게 됩니다. 다시 참여하려면 새로 신청해야 해요.',
    // Community setup
    enterChurchName: '공동체 이름을 입력하세요',
    churchNamePlaceholder: '밴쿠버 한인 공동체...',
    getStarted: '시작하기',
    // Prayer
    noRequests: '기도제목이 없습니다',
    sharePrayer: '기도제목을 나눠주세요',
    prayerSubtitle: '셀 리더와 목사님이 기도해드립니다.',
    submit: '제출',
    sent: '✓ 전송되었습니다',
    // Members
    noMembers: '멤버가 없습니다',
    noCell: '셀 없음',
    roles: '역할',
    cell: '셀',
    save: '저장',
    cancel: '취소',
    edit: '편집',
    // Cells
    noCells: '셀이 없습니다',
    addCell: '+ 셀 추가',
    editCell: '셀 편집',
    cellName: '셀 이름',
    cellLeader: '셀 리더',
    none: '없음',
    add: '추가',
    delete: '삭제',
    deleteCell: '셀 삭제',
    deleteConfirm: '정말 삭제하시겠습니까?',
    editFailed: '수정에 실패했습니다. 다시 시도해주세요',
    deleteFailed: '삭제에 실패했습니다. 다시 시도해주세요',
    subCellLeader: '부셀리더',
    cellNamePlaceholder: '1셀, 청년부 1셀...',
    // Attendance
    attendanceSummary: '명 출석',
    saving: '저장 중...',
    saveBtn: '저장하기',
    saved: '저장됨 ✓',
    // Admin home
    quickMenu: '빠른 메뉴',
    thisWeekPrayers: '이번 주 %건',
    totalMembers: '총 %명',
    cellsRunning: '%개 셀 운영 중',
    memberManagement: '성도 관리',
    cellManagement: '셀 관리',
    sortByName: '이름순',
    sortByCell: '셀순',
    sortByRole: '권한순',
    // Member home
    greeting: '안녕하세요',
    greetingSuffix: '님 👋',
    recentPrayers: '최근 내 기도제목',
    noPrayersYet: '아직 기도제목이 없어요 🙏',
    prayedCount: '명이 기도했어요',
    // Prayer actions
    prayTogether: '함께 기도',
    prayed: '기도했어요',
    sending: '전송 중...',
    share: '나누기',
    sharePrayerTitle: '기도제목 나누기',
    noPrayersThisWeek: '이번 주 기도제목이 없습니다',
    noPrayersAll: '기도제목이 없습니다',
    // Profile
    myProfile: '내 프로필',
    language: '언어',
    korean: '한국어',
    english: 'English',
    phoneNumber: '전화번호',
    // Join requests & invite
    pendingApprovals: '가입 요청',
    approve: '승인',
    reject: '거절',
    inviteMembers: '멤버 초대',
    copyLink: '링크 복사',
    copied: '복사됨 ✓',
    prayerFor: '기도제목 대상',
    addMember: '멤버 추가',
    addMemberHint: '이 번호로 로그인하면 공동체 가입이 자동으로 완료됩니다',
    // Feedback
    feedback: '피드백',
    feedbackPlaceholder: '의견이나 건의사항을 남겨주세요...',
    feedbackSent: '피드백이 전송되었습니다 🙏',
    myFeedback: '내가 보낸 피드백',
    noFeedback: '아직 피드백이 없습니다',
    allFeedback: '전체 피드백',
    name: '이름',
    myRoles: '내 역할',
    myCell: '내 셀',
    churchName: '공동체',
    phoneRequired: '전화번호를 입력해주세요',
    otpRequired: '6자리 코드를 입력해주세요',
    otpInvalid: '잘못된 코드입니다. 다시 확인해주세요',
    brandName: '기도제목',
    tagline: '기도와 교제, 한 곳에서',
    phoneLabel: '핸드폰 번호',
    getOtp: '인증번호 받기',
    otpSixDigit: '인증번호 6자리',
    otpHint: '문자로 받은 코드를 입력해주세요',
    confirm: '확인',
    resendCode: '코드 재전송',
    faceIdLogin: '🔒 Face ID로 로그인',
    captchaWaiting: '보안 확인을 기다리는 중입니다. 잠시 후 다시 시도해주세요',
    signInError: '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요',
    tooManyRequests: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
    pendingTitle: '가입 요청을 보냈어요',
    pendingSub: '관리자가 승인하면\n바로 입장할 수 있어요',
    pendingHint: '승인을 기다리는 중입니다...',
    namePlaceholder: '홍길동',
    nameOptional: '이름 (선택)',
    cellPrayerSharing: '셀 기도제목 공유',
    cellPrayerSharingDesc: '셀 멤버들이 서로의 기도제목을 볼 수 있습니다',
    cellPrayersSection: '우리 셀 기도제목',
    myPrayersSection: '내 기도제목',
    destroyCommunity: '공동체 삭제',
    destroyCommunityTitle: '공동체를 삭제하시겠어요?',
    destroyCommunityMsg: '모든 셀, 가입 요청, 출석 기록이 영구적으로 삭제됩니다. 멤버들의 계정은 유지되지만 이 공동체에서 자동으로 나가게 됩니다. 이 작업은 되돌릴 수 없습니다.',
    lastAdminTitle: '마지막 관리자예요',
    lastAdminMsg: '이 공동체에 다른 관리자가 없어요. 나가기 전에 먼저 다른 멤버에게 관리자 권한을 부여해주세요.',
    lastAdminPastorMsg: '이 공동체에 다른 관리자가 없어요. 계속 진행하면 공동체가 삭제됩니다.',
    lastAdminSoloMsg: '이 공동체에 다른 멤버가 없어요. 나가는 대신 공동체를 삭제하시겠어요?',
  },
  en: {
    // Nav
    home: 'Home',
    prayerRequests: 'Prayer Requests',
    members: 'Members',
    cells: 'Cells',
    attendance: 'Attendance',
    profile: 'Profile',
    // Auth
    welcome: 'Welcome back',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    logout: 'Logout',
    leave: 'Leave',
    leaveCommunity: 'Leave community',
    leaveConfirmTitle: 'Leave this community?',
    leaveConfirmMsg: "You'll lose access to your prayer requests and cell info here. You'll need to request to join again to come back.",
    // Community setup
    enterChurchName: 'Enter your community name',
    churchNamePlaceholder: 'Vancouver Korean Community...',
    getStarted: 'Get started',
    // Prayer
    noRequests: 'No requests yet',
    sharePrayer: 'Share your prayer request...',
    prayerSubtitle: 'Your cell leader and pastor will pray for you.',
    submit: 'Submit',
    sent: '✓ Sent!',
    // Members
    noMembers: 'No members yet',
    noCell: 'No cell',
    roles: 'Roles',
    cell: 'Cell',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    // Cells
    noCells: 'No cells yet',
    addCell: '+ Add cell',
    editCell: 'Edit cell',
    cellName: 'Cell name',
    cellLeader: 'Cell leader',
    none: 'None',
    add: 'Add',
    delete: 'Delete',
    deleteCell: 'Delete cell',
    deleteConfirm: 'Are you sure?',
    editFailed: 'Failed to update. Please try again',
    deleteFailed: 'Failed to delete. Please try again',
    subCellLeader: 'Sub-leader',
    cellNamePlaceholder: '1st Cell, Youth Cell...',
    // Attendance
    attendanceSummary: ' present',
    saving: 'Saving...',
    saveBtn: 'Save',
    saved: 'Saved ✓',
    // Admin home
    quickMenu: 'Quick Menu',
    thisWeekPrayers: '% this week',
    totalMembers: '% members',
    cellsRunning: '% cells active',
    memberManagement: 'Members',
    cellManagement: 'Cells',
    sortByName: 'Name',
    sortByCell: 'Cell',
    sortByRole: 'Role',
    // Member home
    greeting: 'Hello',
    greetingSuffix: '! 👋',
    recentPrayers: 'My Recent Prayers',
    noPrayersYet: 'No prayer requests yet 🙏',
    prayedCount: ' prayed',
    // Prayer actions
    prayTogether: 'Pray Together',
    prayed: 'Prayed',
    sending: 'Sending...',
    share: 'Share',
    sharePrayerTitle: 'Share Prayer Request',
    noPrayersThisWeek: 'No prayers this week',
    noPrayersAll: 'No prayer requests',
    // Profile
    myProfile: 'My Profile',
    language: 'Language',
    korean: '한국어',
    english: 'English',
    phoneNumber: 'Phone number',
    // Join requests & invite
    pendingApprovals: 'Join requests',
    approve: 'Approve',
    reject: 'Reject',
    inviteMembers: 'Invite members',
    copyLink: 'Copy link',
    copied: 'Copied ✓',
    prayerFor: 'Prayer for',
    addMember: 'Add member',
    addMemberHint: 'When they log in with this number, they\'ll be added to your community automatically',
    // Feedback
    feedback: 'Feedback',
    feedbackPlaceholder: 'Share your thoughts or suggestions...',
    feedbackSent: 'Feedback sent 🙏',
    myFeedback: 'My feedback',
    noFeedback: 'No feedback yet',
    allFeedback: 'All feedback',
    name: 'Name',
    myRoles: 'My Roles',
    myCell: 'My Cell',
    churchName: 'Community',
    phoneRequired: 'Please enter your phone number',
    otpRequired: 'Please enter the 6-digit code',
    otpInvalid: 'Invalid code. Please try again',
    brandName: 'PrayerRoom',
    tagline: 'Prayer and fellowship, all in one place',
    phoneLabel: 'Phone number',
    getOtp: 'Get verification code',
    otpSixDigit: '6-digit code',
    otpHint: 'Enter the code sent to you via text',
    confirm: 'Confirm',
    resendCode: 'Resend code',
    faceIdLogin: '🔒 Sign in with Face ID',
    captchaWaiting: 'Waiting for security verification. Please try again shortly',
    signInError: 'Something went wrong signing in. Please try again in a moment.',
    tooManyRequests: 'Too many requests. Please wait a moment and try again.',
    pendingTitle: 'Request sent!',
    pendingSub: 'Once approved by an admin\nyou\'ll be able to join right away',
    pendingHint: 'Waiting for approval...',
    namePlaceholder: 'John Doe',
    nameOptional: 'Name (optional)',
    cellPrayerSharing: 'Cell prayer sharing',
    cellPrayerSharingDesc: 'Cell members can see each other\'s prayer requests',
    cellPrayersSection: 'Cell prayer requests',
    myPrayersSection: 'My prayer requests',
    destroyCommunity: 'Delete community',
    destroyCommunityTitle: 'Delete this community?',
    destroyCommunityMsg: "All cells, join requests, and attendance records will be permanently deleted. Members' accounts will stay intact but they'll be automatically removed from this community. This cannot be undone.",
    lastAdminTitle: "You're the last admin",
    lastAdminMsg: "There's no other admin in this community. Please grant admin to another member before leaving.",
    lastAdminPastorMsg: "There's no other admin in this community. Continuing will delete the community.",
    lastAdminSoloMsg: "There's no one else in this community. Would you like to delete it instead of leaving?",
  },
};

export type StringKey = keyof typeof strings.ko;

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey) => string;
};

const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  t: key => strings.en[key],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem('lang').then(v => { if (v === 'ko' || v === 'en') setLangState(v); });
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    AsyncStorage.setItem('lang', l);
  }

  function t(key: StringKey): string {
    return strings[lang][key];
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useTranslation() {
  return useContext(LangContext);
}

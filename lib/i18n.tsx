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
    // Church setup
    enterChurchName: '교회 이름을 입력하세요',
    churchNamePlaceholder: '밴쿠버 한인 교회...',
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
    subCellLeader: '부셀리더',
    cellNamePlaceholder: '1셀, 청년부 1셀...',
    // Attendance
    attendanceSummary: '명 출석',
    saving: '저장 중...',
    saveBtn: '저장하기',
    // Admin home
    quickMenu: '빠른 메뉴',
    attendance: '출석',
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
    add: '추가',
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
    churchName: '교회',
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
    // Church setup
    enterChurchName: 'Enter your church name',
    churchNamePlaceholder: 'Vancouver Korean Church...',
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
    subCellLeader: 'Sub-leader',
    cellNamePlaceholder: '1st Cell, Youth Cell...',
    // Attendance
    attendanceSummary: ' present',
    saving: 'Saving...',
    saveBtn: 'Save',
    // Admin home
    quickMenu: 'Quick Menu',
    attendance: 'Attendance',
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
    add: 'Add',
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
    churchName: 'Church',
  },
};

export type StringKey = keyof typeof strings.ko;

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey) => string;
};

const LangContext = createContext<LangContextType>({
  lang: 'ko',
  setLang: () => {},
  t: key => strings.ko[key],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko');

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

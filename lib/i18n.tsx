import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'ko' | 'en';

const strings = {
  ko: {
    // Nav
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
    cellNamePlaceholder: '1셀, 청년부 1셀...',
    // Profile
    myProfile: '내 프로필',
    language: '언어',
    korean: '한국어',
    english: 'English',
    name: '이름',
    myRoles: '내 역할',
    myCell: '내 셀',
    churchName: '교회',
  },
  en: {
    // Nav
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
    cellNamePlaceholder: '1st Cell, Youth Cell...',
    // Profile
    myProfile: 'My Profile',
    language: 'Language',
    korean: '한국어',
    english: 'English',
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

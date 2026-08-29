// Supabase/Postgrest errors surface raw SQL/constraint text (e.g. "duplicate key value
// violates unique constraint..."). Never show that directly — map known patterns to a
// friendly message and fall back to a generic one for anything unrecognized.
export function friendlyError(error: { message?: string } | null | undefined): string {
  const msg = error?.message ?? '';

  if (msg.includes('duplicate key') || msg.includes('already exists') || msg.includes('unique constraint')) {
    return '이미 등록된 정보예요';
  }
  if (msg.includes('row-level security') || msg.includes('permission denied') || msg.includes('not authorized') || msg.includes('Forbidden')) {
    return '권한이 없어요';
  }
  if (msg.includes('Network request failed') || msg.includes('fetch failed') || msg.includes('timeout')) {
    return '네트워크 연결을 확인해주세요';
  }
  if (msg.includes('violates foreign key') || msg.includes('violates not-null') || msg.includes('violates check constraint')) {
    return '입력값을 확인해주세요';
  }
  return '문제가 발생했어요. 잠시 후 다시 시도해주세요';
}

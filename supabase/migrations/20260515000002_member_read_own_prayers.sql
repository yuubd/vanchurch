create policy "members can read own requests"
  on prayer_requests for select
  using (user_id = auth.uid());

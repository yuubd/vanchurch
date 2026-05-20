alter table prayer_requests add column pray_count integer not null default 0;

create policy "leaders and pastors can update pray count"
  on prayer_requests for update
  using ('cell_leader' = ANY(current_user_roles()) or 'pastor' = ANY(current_user_roles()) or 'admin' = ANY(current_user_roles()))
  with check ('cell_leader' = ANY(current_user_roles()) or 'pastor' = ANY(current_user_roles()) or 'admin' = ANY(current_user_roles()));

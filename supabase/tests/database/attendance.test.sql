begin;
select plan(4);

create temporary table test_fixtures (key text primary key, value uuid);
-- 이 파일은 fixture 생성 후 authenticate_as로 역할을 바꾼 다음에도 test_fixtures에
-- insert(예약 id 캡처)해야 하므로, postgres(테이블 소유자) 상태에서 미리 권한을 준다.
grant select, insert on test_fixtures to authenticated, anon;

insert into public.studios (id, name) values ('dddddddd-0000-0000-0000-000000000000', 'Studio G');
insert into test_fixtures values ('studio_g', 'dddddddd-0000-0000-0000-000000000000');
insert into test_fixtures (key, value)
  select 'instructor_g', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'instructor', 'Instructor G');
insert into test_fixtures (key, value)
  select 'other_instructor', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'instructor', 'Other Instructor');
insert into test_fixtures (key, value)
  select 'member_g', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'member', 'Member G');

insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('eeeeeeee-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_g'), 'Class', (select value from test_fixtures where key = 'instructor_g'), 1, '09:00', 60, 10);

insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('ffffffff-0000-0000-0000-000000000000', 'eeeeeeee-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_g'), current_date + 7, (select value from test_fixtures where key = 'instructor_g'), 10);

select tests.authenticate_as((select value from test_fixtures where key = 'member_g'));
insert into test_fixtures (key, value)
  select 'booking_g', id from public.book_session('ffffffff-0000-0000-0000-000000000000');

-- 1) 담당 강사는 출석을 attended로 표시할 수 있다
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_g'));
select is(
  (select status from public.mark_attendance((select value from test_fixtures where key = 'booking_g'), 'attended')),
  'attended',
  'assigned instructor can mark a booking as attended'
);

-- 2) 다른 강사는 이 세션의 출석을 표시할 수 없다 (booking_g를 booked로 되돌려 재사용)
-- bookings에는 authenticated용 update 정책이 없으므로(전부 RPC 전용), 픽스처를 직접
-- 되돌릴 때는 bypass_rls()로 RLS를 우회한다 (clear_authentication()은 anon 전환일 뿐 우회가 아니다).
select tests.bypass_rls();
update public.bookings set status = 'booked' where id = (select value from test_fixtures where key = 'booking_g');
select tests.authenticate_as((select value from test_fixtures where key = 'other_instructor'));
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'booking_g'), 'attended'),
  'not_permitted',
  'a different instructor cannot mark attendance for someone else''s class'
);

-- 3) 잘못된 상태값은 거부된다
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_g'));
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'booking_g'), 'late'),
  'invalid_status',
  'an invalid attendance status is rejected'
);

-- 4) waitlisted 상태인 예약은 출석 처리할 수 없다
select tests.bypass_rls();
update public.bookings set status = 'waitlisted' where id = (select value from test_fixtures where key = 'booking_g');
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_g'));
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'booking_g'), 'attended'),
  'booking_not_confirmed',
  'a waitlisted (not booked) booking cannot be marked as attended'
);

select tests.clear_authentication();
select finish();
rollback;

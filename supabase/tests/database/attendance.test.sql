begin;
select plan(8);

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
-- owner_g: 6번(오너 권한 분기)과 7번(스튜디오 간 격리) 단언의 호출자로 쓰인다.
-- tests.create_test_profile은 postgres 상태에서만 호출 가능하므로(첫 authenticate_as
-- 이전), 다른 fixture들과 함께 여기서 미리 만들어 둔다.
insert into test_fixtures (key, value)
  select 'owner_g', tests.create_test_profile((select value from test_fixtures where key = 'studio_g'), 'owner', 'Owner G');

insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('eeeeeeee-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_g'), 'Class', (select value from test_fixtures where key = 'instructor_g'), 1, '09:00', 60, 10);

-- date = current_date (오늘), current_date + 7이 아님: mark_attendance는 이제 세션이
-- 아직 시작하지 않은 미래 날짜면 session_not_started를 던진다 (QA 전수검사
-- 2026-08-08, 항목 2) -- 1~7번 단언은 출석 확정이 "성공"하는 경로를 검증하므로
-- 오늘 날짜 세션이어야 한다. 미래 날짜 차단 자체는 8번 단언에서 별도 세션으로 검증한다.
insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('ffffffff-0000-0000-0000-000000000000', 'eeeeeeee-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_g'), current_date, (select value from test_fixtures where key = 'instructor_g'), 10);

-- 8번 단언 전용: 아직 열리지 않은 미래 세션
insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('ffffffff-2222-0000-0000-000000000000', 'eeeeeeee-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_g'), current_date + 7, (select value from test_fixtures where key = 'instructor_g'), 10);

-- Studio H: 6번 단언(스튜디오 간/멀티테넌트 격리)을 위한 두 번째 스튜디오. 자체
-- 강사/세션/예약을 갖춰야 studio_g 쪽 호출자가 정말로 "다른 테넌트"의 예약을
-- 건드리는 상황이 된다.
insert into public.studios (id, name) values ('11111111-0000-0000-0000-000000000000', 'Studio H');
insert into test_fixtures values ('studio_h', '11111111-0000-0000-0000-000000000000');
insert into test_fixtures (key, value)
  select 'instructor_h', tests.create_test_profile((select value from test_fixtures where key = 'studio_h'), 'instructor', 'Instructor H');
insert into test_fixtures (key, value)
  select 'member_h', tests.create_test_profile((select value from test_fixtures where key = 'studio_h'), 'member', 'Member H');

insert into public.class_templates (id, studio_id, title, instructor_id, day_of_week, start_time, duration_min, capacity)
values ('22222222-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_h'), 'Class H', (select value from test_fixtures where key = 'instructor_h'), 2, '10:00', 60, 10);

insert into public.class_sessions (id, template_id, studio_id, date, instructor_id, capacity)
values ('33333333-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', (select value from test_fixtures where key = 'studio_h'), current_date + 7, (select value from test_fixtures where key = 'instructor_h'), 10);

-- book_session이 이제 member_registrations 존재/미만료/비일시정지/수강 클래스를
-- 검증하므로 (QA 전수검사 2026-08-08, 항목 1), 아래 book_session 호출들이 성공하려면
-- member_g/member_h 둘 다 유효한 등록이 있어야 한다. classes는 빈 배열(전체 허용).
insert into public.member_registrations (studio_id, profile_id, full_name, phone, email, plan, term_months, start_date, classes, total_price, agreements, signature_name, created_by)
values
  ((select value from test_fixtures where key = 'studio_g'), (select value from test_fixtures where key = 'member_g'), 'Member G', '010-0000-0007', 'memberg@test.local', 'w3', 12, current_date - 30, '{}', 0, '{}'::jsonb, 'Member G', (select value from test_fixtures where key = 'owner_g')),
  ((select value from test_fixtures where key = 'studio_h'), (select value from test_fixtures where key = 'member_h'), 'Member H', '010-0000-0008', 'memberh@test.local', 'w3', 12, current_date - 30, '{}', 0, '{}'::jsonb, 'Member H', (select value from test_fixtures where key = 'instructor_h'));

select tests.authenticate_as((select value from test_fixtures where key = 'member_g'));
insert into test_fixtures (key, value)
  select 'booking_g', id from public.book_session('ffffffff-0000-0000-0000-000000000000');

select tests.authenticate_as((select value from test_fixtures where key = 'member_h'));
insert into test_fixtures (key, value)
  select 'booking_h', id from public.book_session('33333333-0000-0000-0000-000000000000');

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

-- 4) NULL 상태값도 거부된다 (최종 리뷰, Task 6 원 리뷰에서 이월된 항목). 이전에는
-- `p_status not in ('attended', 'no_show')`가 p_status가 NULL이면 NULL로 평가되고
-- PL/pgSQL의 `if <NULL> then`은 false로 취급되어, invalid_status 가드를 조용히
-- 우회했다 -- CLAUDE.md가 문서화한 `<>`의 NULL 전파 버그와 같은 부류지만 신원 비교가
-- 아니라 입력 검증에서 발생한 것. booking_g는 바로 위 3번 단언이 예외를 던지기 전에
-- 끝나 아직 'booked' 상태이고, instructor_g로 인증된 상태도 그대로이므로 별도
-- bypass_rls() 없이 이어서 검증한다.
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'booking_g'), null),
  'invalid_status',
  'a NULL attendance status is rejected, not silently skipped via NULL propagation through the IN check'
);

-- 5) waitlisted 상태인 예약은 출석 처리할 수 없다
select tests.bypass_rls();
update public.bookings set status = 'waitlisted' where id = (select value from test_fixtures where key = 'booking_g');
select tests.authenticate_as((select value from test_fixtures where key = 'instructor_g'));
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'booking_g'), 'attended'),
  'booking_not_confirmed',
  'a waitlisted (not booked) booking cannot be marked as attended'
);

-- 6) 담당 강사가 아니어도 studio owner라면 출석을 표시할 수 있다 (booking_g를
-- booked로 되돌려 재사용). mark_attendance의 두 번째 검사는
-- `v_session.instructor_id is distinct from auth.uid() and public.current_role()
-- is distinct from 'owner'`이므로, owner_g는 instructor_g가 아니지만
-- current_role() = 'owner'라 AND의 두 번째 항이 false가 되어 전체 조건이
-- false -- 예외가 발생하지 않는다.
select tests.bypass_rls();
update public.bookings set status = 'booked' where id = (select value from test_fixtures where key = 'booking_g');
select tests.authenticate_as((select value from test_fixtures where key = 'owner_g'));
select is(
  (select status from public.mark_attendance((select value from test_fixtures where key = 'booking_g'), 'no_show')),
  'no_show',
  'studio owner can mark attendance for a booking even when not the assigned instructor'
);

-- 7) 다른 스튜디오(Studio H)의 예약은 studio_g의 owner라도 건드릴 수 없다.
-- 호출자로 owner_g를 쓰는 것이 핵심이다: owner_g의 current_role()은 'owner'이므로
-- studio_id만 일치했다면 두 번째 검사(담당 강사-또는-오너)는 그냥 통과했을
-- 사람이다. 따라서 이 호출이 실패한다면 그 원인은 오직 첫 번째 검사
-- (`v_session.studio_id is distinct from public.current_studio_id()`), 즉
-- 테넌트 격리 검사일 수밖에 없다 -- 강사/오너 권한 검사를 다른 각도에서
-- 다시 증명하는 게 아니라 진짜로 스튜디오 격리 자체를 증명한다.
select tests.authenticate_as((select value from test_fixtures where key = 'owner_g'));
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'booking_h'), 'attended'),
  'not_permitted',
  'a studio owner cannot mark attendance for another studio''s booking (cross-studio isolation)'
);

-- 8) 아직 열리지 않은(미래) 세션의 출석은 확정할 수 없다 (QA 전수검사 2026-08-08,
-- 항목 2 -- 실증된 버그: 강사 화면에서 이틀 뒤 수업도 출석 버튼이 눌려 즉시
-- attended로 저장됨).
select tests.authenticate_as((select value from test_fixtures where key = 'member_g'));
insert into test_fixtures (key, value)
  select 'future_booking_g', id from public.book_session('ffffffff-2222-0000-0000-000000000000');

select tests.authenticate_as((select value from test_fixtures where key = 'instructor_g'));
select throws_ok(
  format('select public.mark_attendance(%L, %L)', (select value from test_fixtures where key = 'future_booking_g'), 'attended'),
  'session_not_started',
  'attendance cannot be marked for a session that has not happened yet'
);

select tests.clear_authentication();
select finish();
rollback;

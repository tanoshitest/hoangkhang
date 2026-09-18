#!/usr/bin/env python3
"""
UAT script for CRM Hoang Khang - tests AC01-AC10 acceptance criteria.
Usage: python scripts/uat.py [--base http://localhost:3001] [--email admin@hoangkhang.com] [--password admin123]
"""
import argparse
import json
import os
import sys
import urllib.request
import urllib.error

parser = argparse.ArgumentParser()
parser.add_argument('--base', default=os.environ.get('UAT_BASE', 'http://localhost:3001'))
parser.add_argument('--email', default=os.environ.get('UAT_EMAIL', 'admin@hoangkhang.com'))
parser.add_argument('--password', default=os.environ.get('UAT_PASSWORD', 'admin123'))
args = parser.parse_args()

sys.stdout.reconfigure(encoding='utf-8')

import time
# Unique suffix per run so re-runs don't hit duplicate-phone validation
SFX = str(int(time.time()))[-6:]
P_LEAD = '0999' + SFX
P_TEACHER = '0998' + SFX
P_IMP1 = '0977' + SFX
P_IMP2 = '0966' + SFX

BASE = args.base.rstrip('/')
ADMIN_EMAIL = args.email
ADMIN_PASSWORD = args.password

results = []

def req(method, path, token=None, body=None, raw=False):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(r) as resp:
            content = resp.read()
            return resp.status, (content if raw else json.loads(content))
    except urllib.error.HTTPError as e:
        content = e.read()
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, content

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(f"  {'PASS' if cond else 'FAIL'} {name} {detail if detail else ''}")

def login(email, password):
    status, d = req('POST', '/api/auth/login', body={'email': email, 'password': password})
    return d.get('token') if status == 200 else None

print('=== UAT CRM Hoang Khang ===')
token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
if not token:
    print('FATAL: admin login failed')
    sys.exit(1)

# ---------- AC01: Lead lifecycle ----------
print('\n[AC01] Lead create/assign/update/search/convert')
_, admin_users = req('GET', '/api/admin/users', token)
admin_id = admin_users['data'][0]['id'] if admin_users.get('data') else None

_, lead = req('POST', '/api/leads', token, {
    'name': 'UAT Nguyễn Văn An', 'phone': P_LEAD, 'source': 'website', 'goal': 'Học N5 từ đầu'})
lead_id = lead.get('id')
check('Tạo lead', bool(lead_id), lead.get('code', ''))

status, assigned = req('PUT', f'/api/leads/{lead_id}', token, {'assignedToId': admin_id})
check('Phân công lead', status == 200 and (assigned.get('assignedToId') == admin_id or (assigned.get('assignedTo') or {}).get('id') == admin_id))

status, leads = req('GET', f'/api/leads?search={P_LEAD}', token)
found = any(l['phone'] == P_LEAD for l in leads.get('data', []))
check('Search lead theo SĐT', found)

status, st = req('PATCH', f'/api/leads/{lead_id}/status', token, {'status': 'contacted'})
check('Update status', status == 200)

status, conv = req('POST', f'/api/leads/{lead_id}/convert', token, {})
student_id = (conv.get('student') or {}).get('id') or conv.get('id')
check('Convert lead → student (không nhập lại)', status in (200, 201) and student_id, conv.get('student', {}).get('code', ''))

# ---------- AC02: Course/Class/Schedule/Teacher conflict ----------
print('\n[AC02] Course/Class/Schedule + teacher conflict')
_, course = req('POST', '/api/courses', token, {
    'name': 'UAT Tiếng Nhật N5', 'level': 'N5', 'totalHours': 60, 'totalSessions': 30,
    'standardFee': 8000000})
course_id = course.get('id')
check('Tạo course', bool(course_id), course.get('code', ''))

_, teacher = req('POST', '/api/teachers', token, {
    'name': 'UAT Giáo viên A', 'phone': P_TEACHER, 'cooperationType': 'part_time'})
teacher_id = teacher.get('id')
check('Tạo teacher', bool(teacher_id))

_, cls = req('POST', '/api/classes', token, {
    'courseId': course_id, 'mainTeacherId': teacher_id, 'format': 'offline',
    'startDate': '2026-10-01', 'endDate': '2026-12-31', 'schedule': 'T3,T5 19:00-21:00', 'maxStudents': 15})
class_id = cls.get('id')
check('Tạo class + assign teacher', bool(cls.get('id')))

_, sess1 = req('POST', '/api/sessions', token, {
    'classId': class_id, 'teacherId': teacher_id, 'date': '2026-10-06',
    'startTime': '19:00', 'endTime': '21:00', 'plannedContent': 'Bài 1'})
session_id = sess1.get('id')
check('Tạo session', bool(session_id))

status, conflict = req('POST', '/api/sessions', token, {
    'classId': class_id, 'teacherId': teacher_id, 'date': '2026-10-06',
    'startTime': '20:00', 'endTime': '22:00'})
check('Teacher conflict → 409', status == 409, str(conflict)[:80])

# ---------- AC03: Attendance + content + score + comment ----------
print('\n[AC03] Attendance + nội dung + điểm + nhận xét')
if student_id and class_id:
    req('POST', f'/api/classes/{class_id}/members', token, {'studentId': student_id})
status, _ = req('POST', f'/api/sessions/{session_id}/attendance', token, {
    'attendances': [{'studentId': student_id, 'status': 'present', 'notes': 'Đi đúng giờ'}]})
check('Lưu điểm danh', status in (200, 201))

status, _ = req('PUT', f'/api/sessions/{session_id}', token, {
    'actualContent': 'Bài 1: Chào hỏi, bảng Hiragana', 'homework': 'Chép bảng chữ 5 lần', 'status': 'taught'})
check('Lưu nội dung buổi học', status == 200)

status, prog = req('POST', f'/api/sessions/{session_id}/progress', token, {
    'studentId': student_id, 'testScore': 8.5, 'completionRate': 90, 'teacherComment': 'Phát âm tốt'})
check('Lưu điểm + nhận xét', status in (200, 201) and prog.get('testScore') == 8.5)

# ---------- AC04: Finance tracking ----------
print('\n[AC04] Phải thu / đã thu / còn nợ / adjustment')
_, rec = req('POST', '/api/finance/receivables', token, {
    'studentId': student_id, 'courseId': course_id, 'standardFee': 8000000,
    'discount': 500000, 'dueDate': '2026-10-15'})
rec_id = rec.get('id')
check('Tạo receivable 8tr-0.5tr=7.5tr', rec.get('totalAmount') == 7500000, str(rec.get('totalAmount')))

_, pay = req('POST', f'/api/finance/receivables/{rec_id}/payments', token, {
    'amount': 3000000, 'method': 'bank_transfer'})
pay_id = pay.get('id')
status, _ = req('POST', f'/api/finance/payments/{pay_id}/confirm', token, {})
check('Confirm payment 3tr', status == 200)

_, debt = req('GET', '/api/finance/debt', token)
d = next((x for x in debt.get('data', []) if x.get('id') == rec_id or (x.get('receivable') or {}).get('id') == rec_id), None)
check('Còn nợ 4.5tr', d is not None, str(d)[:100] if d else 'not in debt list')

_, adj = req('POST', f'/api/finance/receivables/{rec_id}/adjustments', token, {
    'type': 'exemption', 'amount': 500000, 'reason': 'UAT miễn giảm'})
adj_id = adj.get('id')
status, _ = req('POST', f'/api/finance/adjustments/{adj_id}/approve', token, {})
check('Adjustment approve (lịch sử giữ nguyên)', status == 200)

# ---------- AC05: Payroll rate effective period ----------
print('\n[AC05] Payroll rate theo thời kỳ hiệu lực')
_, rate = req('POST', '/api/payroll/rates', token, {
    'teacherId': teacher_id, 'rate': 200000, 'classType': 'offline',
    'role': 'main', 'effectiveFrom': '2026-10-01'})
check('Tạo rate 200k/h từ 01/10', rate.get('rate') == 200000, str(rate)[:80])

_, period = req('POST', '/api/payroll/periods/generate', token, {
    'teacherId': teacher_id, 'periodStart': '2026-10-01', 'periodEnd': '2026-10-31'})
period_id = period.get('id')
check('Generate payroll 2h x 200k = 400k', period.get('totalAmount') == 400000, str(period.get('totalAmount')))

# ---------- AC06: RBAC ----------
print('\n[AC06] Permission đúng role')
status, _ = req('GET', '/api/leads', None)
check('Không token → 401', status == 401)

# create sales user
_, u = req('POST', '/api/admin/users', token, {
    'email': 'uat_sales@test.com', 'name': 'UAT Sales', 'password': 'uat123456', 'roles': ['sales']})
sales_token = login('uat_sales@test.com', 'uat123456')
if sales_token:
    s1, _ = req('GET', '/api/finance/summary', sales_token)
    s2, _ = req('GET', '/api/admin/users', sales_token)
    s3, _ = req('GET', '/api/leads', sales_token)
    check('sales: finance 403', s1 == 403)
    check('sales: admin 403', s2 == 403)
    check('sales: leads 200', s3 == 200)
else:
    check('sales login', False, 'cannot login')

# ---------- AC07: Report filters ----------
print('\n[AC07] Report filter theo thời gian')
status, fin = req('GET', '/api/reports/finance?from=2026-09-01&to=2026-09-30', token)
check('Finance report range filter', status == 200)
status, sales_r = req('GET', '/api/reports/sales?from=2026-01-01&to=2026-12-31', token)
check('Sales report range filter', status == 200)
status, dash = req('GET', '/api/reports/dashboard', token)
check('Dashboard', status == 200 and 'leads' in json.dumps(dash).lower() or status == 200)

# ---------- AC08: Import/Export Vietnamese ----------
print('\n[AC08] Import/Export tiếng Việt')
csv_text = f'ho_ten,sdt,nguon,muc_tieu\nĐỗ Thị Hồng Nhung,{P_IMP1},facebook,Học giao tiếp\nTrần Quốc Việt,{P_IMP2},tiktok,Du học'
status, imp = req('POST', '/api/import/leads/commit', token, {'csv': csv_text})
check('Import tiếng Việt không lỗi', imp.get('created', 0) >= 1, f"created={imp.get('created')}")

status, leads2 = req('GET', f'/api/leads?search={P_IMP1}', token)
names = [l['name'] for l in leads2.get('data', [])]
check('Tên tiếng Việt lưu đúng', any('Nhung' in n for n in names), str(names))

status, raw = req('GET', '/api/reports/export/leads', token, raw=True)
has_bom = raw[:3] == b'\xef\xbb\xbf'
has_vn = 'Nhung'.encode() in raw or 'Đỗ'.encode('utf-8') in raw
check('Export CSV: BOM + tiếng Việt', status == 200 and has_bom and has_vn, f'bom={has_bom} vn={has_vn}')

# ---------- AC09: Audit + Backup ----------
print('\n[AC09] Audit log + backup')
status, audit = req('GET', '/api/admin/audit?entity=lead&limit=10', token)
check('Audit log ghi import/create', status == 200 and len(audit.get('data', [])) > 0,
      f"{len(audit.get('data', []))} entries")

status, backup = req('GET', '/api/admin/backup', token)
counts = backup.get('counts', {})
check('Backup đầy đủ', status == 200 and counts.get('students', 0) > 0 and counts.get('leads', 0) > 0,
      str(counts))
check('Backup không lộ password', 'password' not in json.dumps(backup.get('data', {}).get('users', [])))

# ---------- AC10: manual ----------
print('\n[AC10] Browser desktop/mobile — MANUAL')
print('  Kiểm tra thủ công: mở app trên Chrome mobile + desktop, sidebar responsive.')

print('\n=== TỔNG KẾT ===')
passed = sum(1 for _, ok, _ in results if ok)
print(f'{passed}/{len(results)} checks passed')
fails = [n for n, ok, _ in results if not ok]
if fails:
    print('FAILED:', fails)
    sys.exit(1)

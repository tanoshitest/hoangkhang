import { getNum } from './settings';
import { runReminderScan } from './reminders';

let timer: NodeJS.Timeout | null = null;

/**
 * Scheduler nhắc việc: chạy 1 lần 60s sau boot, rồi định kỳ mỗi
 * `reminder_scan_minutes` phút (THAM_SO, mặc định 60).
 * Không dùng node-cron — đủ cho quy mô 1 instance, tránh thêm dependency.
 */
export function startScheduler() {
  if (timer) return;

  const tick = async () => {
    try {
      const enabled = await getNum('reminder_enabled', 1);
      if (!enabled) return;
      const result = await runReminderScan();
      if (result.created > 0) {
        console.log(`⏰ Reminder scan: tạo ${result.created} thông báo`);
      }
    } catch (err) {
      console.error('⏰ Reminder scan error:', err);
    }
  };

  setTimeout(tick, 60_000); // sau boot 60s, đợi db push/seed xong
  timer = setInterval(tick, 60 * 60 * 1000); // mỗi giờ
  console.log('⏰ Reminder scheduler started (mỗi 60 phút)');
}

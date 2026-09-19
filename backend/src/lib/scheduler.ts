import { getNum } from './settings';
import { runReminderScan } from './reminders';
import { rollingGenerateAll } from './scheduleGen';

let timer: NodeJS.Timeout | null = null;
let lastGenDate = '';

/**
 * Scheduler nhắc việc: chạy 1 lần 60s sau boot, rồi định kỳ mỗi giờ
 * (bật/tắt bằng THAM_SO reminder_enabled).
 * Ngoài scan nhắc việc, mỗi ngày 1 lần duy trì sessions 'planned' rolling
 * 10 tuần cho các lớp có scheduleSlots.
 * Không dùng node-cron — đủ cho quy mô 1 instance, tránh thêm dependency.
 */
export function startScheduler() {
  if (timer) return;

  const tick = async () => {
    try {
      const enabled = await getNum('reminder_enabled', 1);
      if (enabled) {
        const result = await runReminderScan();
        if (result.created > 0) {
          console.log(`⏰ Reminder scan: tạo ${result.created} thông báo`);
        }
      }

      // Rolling session generation — 1 lần/ngày
      const today = new Date().toISOString().slice(0, 10);
      if (lastGenDate !== today) {
        lastGenDate = today;
        await rollingGenerateAll();
      }
    } catch (err) {
      console.error('⏰ Scheduler tick error:', err);
    }
  };

  setTimeout(tick, 60_000); // sau boot 60s, đợi db push/seed xong
  timer = setInterval(tick, 60 * 60 * 1000); // mỗi giờ
  console.log('⏰ Scheduler started (nhắc việc mỗi 60 phút + sinh lịch mỗi ngày)');
}

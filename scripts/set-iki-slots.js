// Set scheduleSlots (lịch tuần có cấu trúc) cho 9 lớp IKI — để auto-sinh sessions rolling.
// Chạy trong backend container: docker cp set-iki-slots.js <backend>:/app/ && docker exec <backend> node /app/set-iki-slots.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TIET = {
  '1': ['08:00', '09:00'], '1A': ['09:30', '10:30'], '2A': ['10:30', '11:30'],
  '4': ['13:00', '14:00'], '5': ['14:00', '15:00'], '5-6': ['14:00', '16:00'],
  '6': ['15:00', '16:00'], '7': ['18:00', '19:00'], '7B': ['18:30', '19:30'],
  '8': ['19:00', '20:00'], '9': ['20:00', '21:00'],
};
const DOW = { T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6, CN: 0 };

const CLASSES = [
  { code: 'IKI02-GO-N5S2', slots: {} }, // chặng 7 hết 18/09 — chờ chặng mới
  { code: 'IKI02-GO-N4T1', slots: { T2: ['8', 'GV02'], T4: ['8', 'GV06'], T6: ['8', 'GV04'] } },
  { code: 'IKI03-GO-N3S',  slots: { T3: ['1', 'GV04'], T6: ['1', 'GV02'] } },
  { code: 'IKI03-GO-N3T',  slots: { T2: ['9', 'GV02'], T3: ['9', 'GV03'], T4: ['9', 'GV10'], T5: ['9', 'GV09'], T6: ['9', 'GV02'], T7: ['9', 'GV08'] } },
  { code: 'IKI05-GO-N5T',  slots: { T2: ['9', 'GV05'], T6: ['9', 'GV05'] } },
  { code: 'IKI06-GO-NM',   slots: { T4: ['7B', 'GV05'], T6: ['7B', 'GV05'] } },
  { code: 'IKI07-GO-NM-T2', slots: { T2: ['8', 'GV02'], T3: ['7', 'GV02'], T7: ['7', 'GV03'] } },
  { code: 'IKI08-GO-N4C',  slots: { T2: ['5-6', 'GV09'], T6: ['5-6', 'GV08'] } },
  { code: 'IKI08-GO-N3P',  slots: { T3: ['7', 'GV06'], T6: ['7', 'GV10'] } },
];

(async () => {
  const teachers = await prisma.teacher.findMany({ select: { id: true, code: true } });
  const tid = Object.fromEntries(teachers.map((t) => [t.code, t.id]));

  for (const c of CLASSES) {
    const cls = await prisma.class.findFirst({ where: { code: c.code } });
    if (!cls) { console.log(`! ${c.code} not found`); continue; }

    const slots = Object.entries(c.slots).map(([d, [tiet, gv]]) => ({
      day: DOW[d],
      startTime: TIET[tiet][0],
      endTime: TIET[tiet][1],
      teacherId: tid[gv],
    }));
    const schedule = slots.length
      ? slots.sort((a, b) => a.day - b.day)
          .map((s) => `${Object.keys(DOW).find((k) => DOW[k] === s.day)} ${s.startTime}-${s.endTime}`)
          .join('; ')
      : cls.schedule;

    await prisma.class.update({
      where: { id: cls.id },
      data: { scheduleSlots: slots.length ? slots : null, schedule },
    });
    console.log(`✓ ${c.code}: ${slots.length} slots/tuần`);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

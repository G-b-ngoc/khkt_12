import { prisma } from "@/lib/prisma";

export type ClassReportContent = {
  classCode: string;
  totalStudents: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  studentsNoActivity: { code: string; name: string }[];
  stillCheckedInAtWeekEnd: { code: string; name: string }[];
  teacherComments: { studentName: string; content: string; author: string }[];
  summary: string;
};

export type SchoolReportContent = {
  totalClasses: number;
  totalStudents: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  perClass: { classCode: string; checkIns: number; checkOuts: number; noActivity: number }[];
  summary: string;
};

/** Tạo (hoặc lấy lại nếu đã tồn tại) bản dự thảo báo cáo cho 1 tuần: mỗi lớp + 1 bản toàn trường. */
export async function generateWeeklyDrafts(weekStart: Date, weekEnd: Date) {
  const classes = await prisma.class.findMany();
  const createdIds: string[] = [];

  let schoolTotalCheckIns = 0;
  let schoolTotalCheckOuts = 0;
  let schoolTotalStudents = 0;
  const perClass: SchoolReportContent["perClass"] = [];

  for (const cls of classes) {
    const students = await prisma.student.findMany({ where: { classId: cls.id, status: "ACTIVE" } });
    const txns = await prisma.phoneTransaction.findMany({
      where: { classId: cls.id, createdAt: { gte: weekStart, lt: weekEnd } },
      include: { student: true },
    });
    const comments = await prisma.teacherComment.findMany({
      where: { classId: cls.id, createdAt: { gte: weekStart, lt: weekEnd } },
      include: { student: true, author: true },
    });

    const checkIns = txns.filter((t) => t.type === "CHECK_IN").length;
    const checkOuts = txns.filter((t) => t.type === "CHECK_OUT").length;

    const activeStudentIds = new Set(txns.map((t) => t.studentId));
    const studentsNoActivity = students
      .filter((s) => !activeStudentIds.has(s.id))
      .map((s) => ({ code: s.studentCode, name: s.fullName }));

    // Học sinh có giao dịch cuối cùng trong tuần là CHECK_IN -> cuối tuần vẫn đang giữ tại trạm.
    const lastTxnByStudent = new Map<string, (typeof txns)[number]>();
    for (const t of txns.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
      lastTxnByStudent.set(t.studentId, t);
    }
    const stillCheckedInAtWeekEnd = [...lastTxnByStudent.values()]
      .filter((t) => t.type === "CHECK_IN")
      .map((t) => ({ code: t.student.studentCode, name: t.student.fullName }));

    const dataIssues: string[] = [];
    if (studentsNoActivity.length > 0) {
      dataIssues.push(`${studentsNoActivity.length} học sinh không có giao dịch nào trong tuần.`);
    }
    if (stillCheckedInAtWeekEnd.length > 0) {
      dataIssues.push(`${stillCheckedInAtWeekEnd.length} học sinh còn đang giữ điện thoại tại trạm tới cuối tuần (giao dịch chưa hoàn tất).`);
    }

    const content: ClassReportContent = {
      classCode: cls.code,
      totalStudents: students.length,
      totalCheckIns: checkIns,
      totalCheckOuts: checkOuts,
      studentsNoActivity,
      stillCheckedInAtWeekEnd,
      teacherComments: comments.map((c) => ({
        studentName: c.student.fullName,
        content: c.content,
        author: c.author.fullName,
      })),
      summary: "",
    };

    const report = await prisma.weeklyReport.upsert({
      where: { scope_classId_weekStart: { scope: "CLASS", classId: cls.id, weekStart } },
      update: {},
      create: {
        scope: "CLASS",
        classId: cls.id,
        weekStart,
        weekEnd,
        status: "DRAFT",
        contentJson: JSON.stringify(content),
        dataIssues: dataIssues.length ? JSON.stringify(dataIssues) : null,
      },
    });
    createdIds.push(report.id);

    schoolTotalCheckIns += checkIns;
    schoolTotalCheckOuts += checkOuts;
    schoolTotalStudents += students.length;
    perClass.push({ classCode: cls.code, checkIns, checkOuts, noActivity: studentsNoActivity.length });
  }

  const schoolContent: SchoolReportContent = {
    totalClasses: classes.length,
    totalStudents: schoolTotalStudents,
    totalCheckIns: schoolTotalCheckIns,
    totalCheckOuts: schoolTotalCheckOuts,
    perClass,
    summary: "",
  };
  const schoolIssues: string[] = [];
  const noActivityClasses = perClass.filter((p) => p.checkIns === 0 && p.checkOuts === 0);
  if (noActivityClasses.length > 0) {
    schoolIssues.push(`${noActivityClasses.length} lớp không có giao dịch nào trong tuần.`);
  }

  // classId là null cho báo cáo toàn trường — SQLite coi NULL != NULL trong unique index,
  // nên tự tìm bản ghi cũ bằng findFirst thay vì dùng upsert theo khóa compound có null.
  const existingSchoolReport = await prisma.weeklyReport.findFirst({
    where: { scope: "SCHOOL", classId: null, weekStart },
  });
  const schoolReport = existingSchoolReport
    ? existingSchoolReport
    : await prisma.weeklyReport.create({
        data: {
          scope: "SCHOOL",
          classId: null,
          weekStart,
          weekEnd,
          status: "DRAFT",
          contentJson: JSON.stringify(schoolContent),
          dataIssues: schoolIssues.length ? JSON.stringify(schoolIssues) : null,
        },
      });
  createdIds.push(schoolReport.id);

  return createdIds;
}

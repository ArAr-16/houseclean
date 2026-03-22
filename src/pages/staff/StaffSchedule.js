import React from "react";
import Staff from "./Staff";
import { STAFF_SCHEDULE_SECTIONS } from "./staffVisibleSections";

function StaffSchedule() {
  return (
    <Staff
      visibleSections={STAFF_SCHEDULE_SECTIONS}
      renderScheduleSection={(ctx) => <StaffScheduleContent ctx={ctx} />}
    />
  );
}

function StaffScheduleContent({ ctx }) {
  return (
    <section className="panel card calendar-card" id="schedule">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Attendance</p>
          <h4>Staff attendance</h4>
        </div>
        <div className="calendar-nav">
          <button
            className="btn pill ghost"
            type="button"
            onClick={() =>
              ctx.setAttendanceMonth((prev) => {
                const next = new Date(prev.year, prev.month - 1, 1);
                return { year: next.getFullYear(), month: next.getMonth() };
              })
            }
          >
            Prev
          </button>
          <span className="pill soft">{ctx.attendanceCalendar.monthLabel}</span>
          <button
            className="btn pill ghost"
            type="button"
            onClick={() =>
              ctx.setAttendanceMonth((prev) => {
                const next = new Date(prev.year, prev.month + 1, 1);
                return { year: next.getFullYear(), month: next.getMonth() };
              })
            }
          >
            Next
          </button>
        </div>
      </div>
      {ctx.attendanceLoading ? (
        <div className="mini-calendar">Loading attendance...</div>
      ) : (
        <>
          <div className="attendance-calendar">
            <div className="calendar-head">
              {ctx.attendanceCalendar.weekLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {ctx.attendanceCalendar.calendarCells.map((cell) =>
                cell.empty ? (
                  <div key={cell.key} className="calendar-cell empty" />
                ) : (
                  <button
                    key={cell.key}
                    type="button"
                    className={`calendar-cell ${cell.hasAttendance ? "has-attendance" : ""} ${
                      cell.isToday ? "is-today" : ""
                    } ${ctx.attendanceSelectedKey === cell.key ? "is-selected" : ""}`}
                    onClick={() => ctx.setAttendanceSelectedKey(cell.key)}
                  >
                    <span className="day-number">{cell.day}</span>
                    {cell.hasAttendance && <span className="attendance-dot" />}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="attendance-list">
            {ctx.attendanceCalendar.attendanceList.filter((entry) =>
              ctx.attendanceSelectedKey ? entry.dateKey === ctx.attendanceSelectedKey : true
            ).length === 0 ? (
              <div className="mini-calendar">No attendance yet.</div>
            ) : (
              ctx.attendanceCalendar.attendanceList
                .filter((entry) =>
                  ctx.attendanceSelectedKey ? entry.dateKey === ctx.attendanceSelectedKey : true
                )
                .map((entry) => (
                  <div key={entry.id} className="attendance-row">
                    <div>
                      <span className="attendance-date">{entry.date}</span>
                      <div className="tiny muted">{entry.service}</div>
                    </div>
                    <span>{entry.time}</span>
                  </div>
                ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default StaffSchedule;

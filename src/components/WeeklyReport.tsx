"use client";

import React, { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface WeeklyReportProps {
  codingHours: number;
  skills: string[];
  projects: string[];
  githubCommits: number;
  streak: number;
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({
  codingHours,
  skills,
  projects,
  githubCommits,
  streak,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current);

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const width = 210;

    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, height);

    pdf.save("weekly-report.pdf");
  };

  const exportImage = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current);

    const link = document.createElement("a");

    link.download = "weekly-report.png";

    link.href = canvas.toDataURL();

    link.click();
  };

  return (
    <div className="p-6">
      <div
        ref={reportRef}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 border"
      >
        <h1 className="text-3xl font-bold mb-6">
          Weekly Progress Report
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="p-4 rounded-xl border">
            <h2 className="font-semibold text-lg">
              Coding Hours
            </h2>

            <p className="text-2xl mt-2">
              {codingHours} hrs
            </p>
          </div>

          <div className="p-4 rounded-xl border">
            <h2 className="font-semibold text-lg">
              GitHub Commits
            </h2>

            <p className="text-2xl mt-2">
              {githubCommits}
            </p>
          </div>

          <div className="p-4 rounded-xl border">
            <h2 className="font-semibold text-lg">
              Productivity Streak
            </h2>

            <p className="text-2xl mt-2">
              {streak} days
            </p>
          </div>

          <div className="p-4 rounded-xl border">
            <h2 className="font-semibold text-lg">
              Skills Practiced
            </h2>

            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-black text-white rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl border">
          <h2 className="font-semibold text-lg mb-3">
            Projects Worked On
          </h2>

          <ul className="list-disc ml-6">
            {projects.map((project) => (
              <li key={project}>
                {project}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={exportPDF}
          className="px-5 py-2 rounded-xl bg-black text-white"
        >
          Export PDF
        </button>

        <button
          onClick={exportImage}
          className="px-5 py-2 rounded-xl border"
        >
          Export Image
        </button>
      </div>
    </div>
  );
};

export default WeeklyReport;
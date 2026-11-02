import { post, uploadFile } from "./api";
import type { Project } from "@sendfold/shared/types";
export async function createSampleProject() {
  const project = await post<Project>("/projects", {
    name: "Website launch",
    client: "Example client",
    description:
      "A sample project to explore previews, spreadsheet editing, questions, and password-protected sharing.",
    color: "violet",
  });
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head><body><header>ACME / WEBSITE CONCEPT</header><main><p>A fresh start.</p><h1>A better home<br>for big ideas.</h1><p>Here is the first direction for your new website. Use the feedback panel to share your thoughts.</p><button onclick="this.textContent=\'Thanks for exploring!\'">Explore the concept →</button></main><footer>Concept 01 · Prepared for review</footer></body></html>';
  const css =
    "body{margin:0;background:#f4f5f7;color:#17212e;font:16px system-ui}header,footer{padding:30px;font-size:12px;letter-spacing:2px}main{padding:65px 40px;max-width:650px}h1{font-size:68px;line-height:1.05;letter-spacing:-4px;margin:24px 0}p{line-height:1.7}button{border:0;border-radius:8px;background:#17212e;color:white;padding:16px 24px;cursor:pointer}";
  await uploadFile(
    project.id,
    new File([html], "index.html", { type: "text/html" }),
    "Website/index.html",
  );
  await uploadFile(
    project.id,
    new File([css], "style.css", { type: "text/css" }),
    "Website/style.css",
  );
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Scope");
  sheet.columns = [
    { header: "Deliverable", key: "item", width: 34 },
    { header: "Selected", key: "selected", width: 16 },
    { header: "Notes", key: "notes", width: 44 },
  ];
  sheet.addRows([
    {
      item: "Homepage design",
      selected: "Yes",
      notes: "Please share your preferred direction.",
    },
    { item: "About page", selected: "Yes", notes: "" },
    {
      item: "Contact form",
      selected: "Optional",
      notes: "Confirm required fields.",
    },
  ]);
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  await uploadFile(
    project.id,
    new File([new Uint8Array(buffer)], "Project scope.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "Project scope.xlsx",
  );
  await post(`/projects/${project.id}/questions`, {
    prompt: "Which website sections should we include?",
    type: "multiple",
    options: ["Homepage", "About us", "Services", "Contact", "Journal"],
  });
  await post(`/projects/${project.id}/questions`, {
    prompt: "Do you approve the initial direction?",
    type: "approval",
    options: [],
  });
  return project;
}

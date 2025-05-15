import path from "path";
import ejs from "ejs";

// Ejs Render Email Template
export default async function RenderEmailTemplate(data: any, template: string) {
  const templatePath = path.join("views", "emails", template);
  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, data, {}, (err: Error | null, str: string) => {
      if (err) reject(err);
      resolve(str);
    });
  });
}

import { MentionUser } from "types/post";

export default function ParseContentToHtml(text: string, mentions: MentionUser[]): string {
    if (!text) return "";

    const location = process.env.APP_URL || "http://localhost:3009";

    // Convert line breaks to <br/>
    let htmlContent = text.replace(/\n/g, "<br/>");

    // Convert URLs into clickable links
    const urlRegex =
        /\b((https?:\/\/)?((www\.)?[\w-]+\.[a-z]{2,})(:\d+)?(\/[^\s<]*)?(\?[^\s<]*)?(#[^\s<]*)?)(?![^<]*>|[^<>]*<\/)/gi;

    htmlContent = htmlContent.replace(urlRegex, (_, url) => {
        const hyperlink = url.startsWith("http") ? url : `https://${url}`;
        return `<a href="${hyperlink}" class="text-primary-dark-pink" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    // Replace mention text with mention links
    mentions.forEach((m) => {
        const mentionRegex = new RegExp(`${String(m.username).trim()}(?![A-Za-z0-9_-])`, "g");
        htmlContent = htmlContent.replace(
            mentionRegex,
            `<a href="${location}/${m.username}" class="text-primary-dark-pink" rel="noopener noreferrer">${m.username}</a>`
        );
    });

    return htmlContent;
}
// Who sees the Admin page (the list of accounts).
const ADMIN_EMAILS = new Set(["gyoxel@gmail.com"]);

export const isAdmin = (email: string | null | undefined) => !!email && ADMIN_EMAILS.has(email.toLowerCase());

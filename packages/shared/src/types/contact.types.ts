export type Contact = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: "active" | "inactive";
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

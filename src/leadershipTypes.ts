export type LeadershipSection = "board" | "management" | "support";
export type GovernancePlacement = "board" | "governance";
export type ProfileStatus = "draft" | "pending_approval" | "published" | "archived";

export type LeadershipProfile = {
  id: string;
  section: LeadershipSection;
  placement: GovernancePlacement;
  name: string;
  title: string;
  biography: string;
  background: string;
  qualifications: string;
  responsibilities: string;
  photo_url: string;
  is_vacant: boolean;
  status: ProfileStatus;
  sort_order: number;
  updated_at: string;
};

export type ProfileInput = Omit<LeadershipProfile, "id" | "updated_at">;

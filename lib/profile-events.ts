export const profileUpdatedEvent = "twoofus:profile-updated";

export type ProfileUpdatedDetail = {
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
};

export function emitProfileUpdated(detail: ProfileUpdatedDetail) {
  window.dispatchEvent(new CustomEvent<ProfileUpdatedDetail>(profileUpdatedEvent, { detail }));
}

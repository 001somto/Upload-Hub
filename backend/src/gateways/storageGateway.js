// gateways/storageGateway.js
// WHAT THIS FILE IS: the doorway to file storage, used here only for profile photos.
// WHAT IT DOES: profile photos live in S3, which is the backend teammate's part. Until a real
// gateway is plugged in, no photo links exist (the website shows initials) and photo upload
// answers "not implemented".
// The teammate provides: photoUrl(key) -> a viewing link or null, and
// createPhotoUpload({ userId, contentType, size }) -> { uploadUrl, photoKey, headers }.
// Photo keys must start with "profile-photos/<userId>/" (the backend checks this).

export function createNoStorageGateway() {
  return {
    photoUrl: () => null,
    createPhotoUpload: null,
  };
}

// services/userShape.js
// WHAT THIS FILE IS: decides what part of an account is safe to send to the browser.
// WHAT IT DOES: removes the password hash, token version and other private fields. This is
// the ONLY place accounts are turned into website-friendly objects, so nothing private leaks.

export function toPublicUser(user, storage) {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    departmentId: user.departmentId || null,
    membershipState: user.membershipState,
    profilePhotoUrl: user.profilePhotoKey && storage ? storage.photoUrl(user.profilePhotoKey) || null : null,
    notificationPreferences: user.notificationPreferences,
  };
}

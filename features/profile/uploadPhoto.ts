import { ApiError } from '../../lib/api/client';
import { MOCK_API } from '../../lib/api/devMock';
import { patchProfile, requestPhotoUpload } from './api';

const MAX_BYTES = 5_242_880;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Uploads a local image to the bucket with the presigned URL, then saves the
// public URL on the rider profile. Returns the updated rider.
export async function uploadProfilePhoto(localUri: string, mimeType: string | undefined) {
  const file = await (await fetch(localUri)).blob();
  const contentType = mimeType ?? file.type;

  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new ApiError(0, 'UNSUPPORTED_IMAGE', 'Use a JPEG, PNG or WebP photo.');
  }
  if (file.size < 1 || file.size > MAX_BYTES) {
    throw new ApiError(0, 'IMAGE_TOO_LARGE', 'The photo must be smaller than 5 MB.');
  }

  const ticket = await requestPhotoUpload(contentType, file.size);

  // The dev mock issues a fake uploadUrl with nothing listening on the other
  // end, so skip the actual PUT and pretend it succeeded.
  if (!MOCK_API) {
    const upload = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: file });
    if (!upload.ok) {
      throw new ApiError(upload.status, 'UPLOAD_FAILED', 'The photo upload failed. Please try again.');
    }
  }

  const { rider } = await patchProfile({ photoUrl: ticket.photoUrl });
  return rider;
}

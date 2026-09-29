const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

const createRawDownloadUrl = (secureUrl) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary environment variables not configured in .env');
  }

  const url = new URL(secureUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  if (url.hostname !== 'res.cloudinary.com' || parts[0] !== process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Project file is not hosted in the configured Cloudinary account');
  }

  const resourceType = parts[1];
  const deliveryType = parts[2];
  const versionIndex = parts.findIndex((part, index) =>
    index > 2 && part.startsWith('v') && part.length > 1 && !Number.isNaN(Number(part.slice(1)))
  );
  if (resourceType !== 'raw' || !['upload', 'private', 'authenticated'].includes(deliveryType) || versionIndex < 0) {
    throw new Error('Cloudinary project URL format is invalid');
  }

  const publicId = parts.slice(versionIndex + 1).join('/');
  const extension = publicId.split('.').pop();
  if (!publicId || !extension || extension === publicId) {
    throw new Error('Cloudinary raw file extension is missing');
  }

  return cloudinary.utils.private_download_url(publicId, extension, {
    resource_type: resourceType,
    type: deliveryType,
    expires_at: Math.floor(Date.now() / 1000) + 300,
    attachment: true
  });
};

/**
 * Uploads a file buffer or file path to Cloudinary as a raw file (for ZIPs, PDFs, etc.) or auto file.
 */
const uploadToCloudinary = (fileBuffer, originalName, folder = 'aarohan_projects') => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error('Cloudinary environment variables not configured in .env'));
    }

    const extension = originalName.split('.').pop();
    const publicId = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: publicId,
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
};

module.exports = { cloudinary, isCloudinaryConfigured, uploadToCloudinary, createRawDownloadUrl };

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

module.exports = { cloudinary, isCloudinaryConfigured, uploadToCloudinary };

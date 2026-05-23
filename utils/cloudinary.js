const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: String(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: String(process.env.CLOUDINARY_API_KEY),
  api_secret: String(process.env.CLOUDINARY_API_SECRET),
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'itms_uploads',
    resource_type: 'auto', // This allows uploading non-image files like PDFs, Excel, etc.
    public_id: (req, file) => {
      const fileName = file.originalname.split('.')[0].replace(/\s+/g, '_').replace(/[^\w]/g, '');
      return `${Date.now()}-${fileName}`;
    },
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
